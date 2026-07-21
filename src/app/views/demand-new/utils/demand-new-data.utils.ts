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

export function filterConvPrevByIntPrevId(
  items: any[],
  intPrevId: number,
): any[] {
  if (!Array.isArray(items) || !intPrevId) {
    return [];
  }

  return items.filter((item: any) => {
    const relatedId =
      item?.intPrev?.id ?? item?.int_prev_id ?? item?.intPrevId ?? null;

    return Number(relatedId) === Number(intPrevId);
  });
}