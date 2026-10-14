import { z } from 'zod';
import type { AIProvider } from '../../../shared/types';

export type ProviderFailureKind = 'invalid' | 'cooldown' | 'other';
export class ProviderError extends Error {
  constructor(
    readonly provider: AIProvider,
    readonly status: number | undefined,
    readonly code: string | undefined,
    reason: string,
    readonly kind: ProviderFailureKind,
    readonly modelScoped = false,
    readonly retryAfterMs?: number,
    readonly quotaZero = false,
  ) {
    super(`${provider} ${status === undefined ? 'request' : `HTTP ${status}`}: ${reason}`);
    this.name = 'ProviderError';
  }
}

export function classifyProviderFailure(status: number, code?: string, _reason?: string) {
  const invalidCodes = ['API_KEY_INVALID', 'INVALID_API_KEY', 'INVALID_APIKEY'];
  const kind: ProviderFailureKind =
    status === 401 ||
    status === 403 ||
    (status === 400 && code !== undefined && invalidCodes.includes(code.toUpperCase()))
      ? 'invalid'
      : status === 429 || (status >= 500 && status <= 599)
        ? 'cooldown'
        : 'other';
  return { kind, code };
}

const detailSchema = z
  .object({
    '@type': z.string().optional(),
    reason: z.string().optional(),
    retryDelay: z.string().optional(),
    violations: z
      .array(
        z
          .object({
            quotaDimensions: z.record(z.string()).optional(),
            quotaValue: z.union([z.string(), z.number()]).optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();
const errorSchema = z
  .object({
    code: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    message: z.string().optional(),
    details: z.array(detailSchema).optional(),
  })
  .passthrough();

function boundDelay(value: number): number | undefined {
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 86_400_000) : undefined;
}
function headerDelay(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  return boundDelay(/^\d+(\.\d+)?$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now());
}

export function responseFailure(
  provider: AIProvider,
  response: Response,
  text: string,
  key: string,
  model?: string,
): ProviderError {
  let reason = text.trim() || response.statusText || 'Provider request failed';
  let code: string | undefined;
  let scoped = false;
  let quotaZero = false;
  let retryMilliseconds = headerDelay(response.headers.get('retry-after'));
  try {
    const envelope = z.object({ error: z.unknown().optional() }).passthrough().parse(JSON.parse(text));
    const errorBody = envelope.error ?? envelope;
    const parsedError = errorSchema.safeParse(errorBody);
    if (parsedError.success) {
      const error = parsedError.data;
      const details = error.details ?? [];
      const errorInfo = details.find((detail) => detail['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo');
      code =
        (provider === 'gemini' ? errorInfo?.reason : undefined) ??
        (typeof error.code === 'string' ? error.code : error.status);
      reason = error.message ?? error.status ?? reason;
      if (provider === 'gemini' && model) {
        const violations = details
          .filter((detail) => detail['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure')
          .flatMap((detail) => detail.violations ?? []);
        scoped =
          violations.length > 0 &&
          violations.every(
            (violation) =>
              violation.quotaDimensions?.model?.replace(/^models\//, '') === model.replace(/^models\//, ''),
          );
        quotaZero =
          scoped &&
          violations.some((violation) => violation.quotaValue !== undefined && Number(violation.quotaValue) === 0);
      }
      const retryInfo = details.find((detail) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
      if (retryInfo?.retryDelay && /^\d+(\.\d+)?s$/.test(retryInfo.retryDelay)) {
        retryMilliseconds = Math.max(
          retryMilliseconds ?? 0,
          boundDelay(Number(retryInfo.retryDelay.slice(0, -1)) * 1000) ?? 0,
        );
      }
    } else if (typeof errorBody === 'string') reason = errorBody;
  } catch {
    /* Retain the real HTTP response text when the error is not JSON. */
  }
  const redactedReason = (
    key ? reason.split(key).join('[redacted]').split(encodeURIComponent(key)).join('[redacted]') : reason
  ).slice(0, 1500);
  return new ProviderError(
    provider,
    response.status,
    code,
    redactedReason,
    classifyProviderFailure(response.status, code).kind,
    scoped,
    retryMilliseconds,
    quotaZero,
  );
}
