import { z } from 'zod';
import type { AIProvider } from '../../../shared/types';
import { ProviderError, responseFailure } from './provider-error';
export { ProviderError, classifyProviderFailure } from './provider-error';

export interface ModelInfo {
  id: string;
  displayName?: string;
  free?: boolean;
}
const urls: Record<AIProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  openrouter: 'https://openrouter.ai/api/v1/models',
  groq: 'https://api.groq.com/openai/v1/models',
};

function headers(provider: AIProvider, key: string): Record<string, string> {
  return provider === 'gemini'
    ? { 'Content-Type': 'application/json', 'x-goog-api-key': key }
    : { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
}

export const DISCOVERY_TIMEOUT_MS = 30_000;
/** Resume and job parsing on Gemma can take well over 30 seconds. */
export const GENERATION_TIMEOUT_MS = 120_000;

async function request(url: string, init: RequestInit, provider: AIProvider, timeoutMs = DISCOVERY_TIMEOUT_MS) {
  const seconds = Math.round(timeoutMs / 1000);
  // A slow generation is model-specific: try the next model instead of benching the key.
  const timeoutKind = timeoutMs > DISCOVERY_TIMEOUT_MS ? 'other' : 'cooldown';
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new ProviderError(provider, undefined, undefined, `request timed out after ${seconds} seconds`, timeoutKind),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal });
        return { response, text: await response.text() };
      })(),
      expired,
    ]);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(
      provider,
      undefined,
      undefined,
      controller.signal.aborted ? `request timed out after ${seconds} seconds` : 'network request failed',
      controller.signal.aborted ? timeoutKind : 'cooldown',
    );
  } finally {
    clearTimeout(timer);
  }
}

const geminiPage = z.object({
  models: z
    .array(
      z.object({
        name: z.string(),
        displayName: z.string().optional(),
        supportedGenerationMethods: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  nextPageToken: z.string().optional(),
});
const otherPage = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        pricing: z.object({ prompt: z.string(), completion: z.string() }).optional(),
      }),
    )
    .optional(),
});

/** Public API schema: ListModels pageToken/pageSize; no price or remaining-quota fields. */
export async function discoverModelCatalog(provider: AIProvider, key: string): Promise<ModelInfo[]> {
  const modelsById = new Map<string, ModelInfo>();
  const seen = new Set<string>();
  let token: string | undefined;
  for (let page = 0; page < (provider === 'gemini' ? 10 : 1); page += 1) {
    const url =
      provider === 'gemini'
        ? `${urls.gemini}?pageSize=1000${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`
        : urls[provider];
    const { response, text } = await request(url, { headers: headers(provider, key) }, provider);
    if (!response.ok) throw responseFailure(provider, response, text, key);
    if (provider === 'gemini') {
      const body = geminiPage.parse(JSON.parse(text));
      for (const model of body.models ?? []) {
        if (!model.supportedGenerationMethods?.includes('generateContent')) continue;
        const modelId = model.name.replace(/^models\//, '');
        modelsById.set(modelId, { id: modelId, displayName: model.displayName });
      }
      token = body.nextPageToken;
      if (!token) return [...modelsById.values()];
      if (seen.has(token)) throw new Error('gemini: model discovery repeated a page. Try Load models again.');
      seen.add(token);
    } else {
      for (const model of otherPage.parse(JSON.parse(text)).data ?? []) {
        const free =
          provider === 'openrouter' &&
          model.id.endsWith(':free') &&
          model.pricing !== undefined &&
          model.pricing.prompt.trim() !== '' &&
          model.pricing.completion.trim() !== '' &&
          Number(model.pricing.prompt) === 0 &&
          Number(model.pricing.completion) === 0;
        modelsById.set(model.id, { id: model.id, displayName: model.name, ...(free ? { free: true } : {}) });
      }
      return [...modelsById.values()];
    }
  }
  throw new Error('gemini: model discovery exceeded its page limit. No incomplete list was saved.');
}

export async function discoverModels(provider: AIProvider, key: string): Promise<string[]> {
  return (await discoverModelCatalog(provider, key)).map((model) => model.id);
}

const replySchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) })
          .optional(),
      }),
    )
    .optional(),
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).optional(),
});

export async function complete(
  provider: AIProvider,
  key: string,
  model: string,
  prompt: string,
  timeoutMs = GENERATION_TIMEOUT_MS,
): Promise<string> {
  const gemini = provider === 'gemini';
  const url = gemini
    ? `${urls.gemini}/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent`
    : `${provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1'}/chat/completions`;
  // Gemma accepts instructions in the user prompt, without systemInstruction/JSON mode.
  // Gemini models get JSON mode: every JobFill task replies in JSON, so this avoids repair calls.
  const jsonMode = gemini && !/^(models\/)?gemma/i.test(model);
  const body = gemini
    ? {
        contents: [{ parts: [{ text: prompt }] }],
        ...(jsonMode ? { generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } } : {}),
      }
    : { model, messages: [{ role: 'user', content: prompt }] };
  const { response, text } = await request(
    url,
    { method: 'POST', headers: headers(provider, key), body: JSON.stringify(body) },
    provider,
    timeoutMs,
  );
  if (!response.ok) throw responseFailure(provider, response, text, key, model);
  const reply = replySchema.parse(JSON.parse(text));
  return gemini
    ? (reply.candidates?.[0]?.content?.parts
        .filter((part) => !part.thought)
        .map((part) => part.text ?? '')
        .join('') ?? '')
    : (reply.choices?.[0]?.message.content ?? '');
}
