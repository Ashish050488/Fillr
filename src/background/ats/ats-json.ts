const REQUEST_TIMEOUT_MILLISECONDS = 8000;

/** GET a public ATS endpoint; any failure (network, status, bad JSON, timeout) is undefined. */
export async function fetchAtsJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MILLISECONDS);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/** A trimmed string from untyped JSON, or "" for anything else. */
export function readText(jsonField: unknown): string {
  return typeof jsonField === 'string' ? jsonField.trim() : '';
}

/** "acme-labs" → "Acme Labs": the best company name when an API only gives a URL slug. */
export function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
