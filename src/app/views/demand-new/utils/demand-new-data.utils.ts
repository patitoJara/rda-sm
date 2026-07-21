export function extractArray(raw: any): any[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw?.data)) {
    return raw.data;
  }

  if (Array.isArray(raw?.content)) {
    return raw.content;
  }

  if (Array.isArray(raw?.items)) {
    return raw.items;
  }

  if (Array.isArray(raw?.results)) {
    return raw.results;
  }

  return [];
}
