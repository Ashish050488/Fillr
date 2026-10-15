const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '-',
  mdash: '-',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  hellip: '...',
  bull: '*',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, entityName: string) => {
    if (entityName[0] === '#') {
      const isHex = entityName[1].toLowerCase() === 'x';
      const codePoint = isHex ? parseInt(entityName.slice(2), 16) : Number(entityName.slice(1));
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return HTML_ENTITIES[entityName.toLowerCase()] ?? entity;
  });
}

/** HTML to readable plain text without a DOM (the service worker has none). */
export function htmlToText(html: string | undefined | null): string {
  if (!html) return '';
  // Greenhouse double-encodes its HTML (&lt;p&gt;), so decode before stripping tags.
  const markup = /&lt;\/?[a-z]/i.test(html) ? decodeEntities(html) : html;
  return decodeEntities(
    markup
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<li[^>]*>/gi, '\n* ')
      .replace(/<\/(p|div|h[1-6]|ul|ol|li|tr|section)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
