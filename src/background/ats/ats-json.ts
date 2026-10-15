const REQUEST_TIMEOUT_MILLISECONDS = 8000;

/** GET a public endpoint; any failure (network, status, timeout) is undefined. */
async function fetchPublic<Body>(url: string, accept: string, readBody: (response: Response) => Promise<Body>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MILLISECONDS);
  try {
    const response = await fetch(url, { headers: { Accept: accept }, signal: controller.signal });
    if (!response.ok) return undefined;
    return await readBody(response);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/** GET a public ATS endpoint; any failure (network, status, bad JSON, timeout) is undefined. */
export function fetchAtsJson(url: string): Promise<unknown> {
  return fetchPublic(url, 'application/json', (response) => response.json());
}

/** GET a public page's HTML, e.g. when the posting is embedded in the page itself. */
export function fetchAtsHtml(url: string): Promise<string | undefined> {
  return fetchPublic(url, 'text/html', (response) => response.text());
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
