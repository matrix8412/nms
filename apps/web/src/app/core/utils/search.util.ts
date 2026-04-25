export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesSearchText(value: string | null | undefined, query: string): boolean {
  if (!query) return true;
  const normalizedValue = normalizeSearchText(value ?? '');
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => normalizedValue.includes(token));
}