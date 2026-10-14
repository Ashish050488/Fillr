/** Models sometimes wrap JSON in prose or code fences; keep only the outermost object. */
export function extractJsonReply(modelReply: string): string {
  const unfencedReply = modelReply
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const objectStart = unfencedReply.indexOf('{');
  const objectEnd = unfencedReply.lastIndexOf('}');
  return objectStart >= 0 && objectEnd > objectStart ? unfencedReply.slice(objectStart, objectEnd + 1) : unfencedReply;
}
