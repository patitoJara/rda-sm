export function reorderSecondarySubstanceMap(
  map: Record<number, number>,
): Record<number, number> {
  const ordered = Object.entries(map).sort((a, b) => a[1] - b[1]);

  return ordered.reduce<Record<number, number>>(
    (result, [key], index) => {
      result[Number(key)] = index + 1;
      return result;
    },
    {},
  );
}

export function buildSecondarySubstances(
  map: Record<number, number>,
): Array<{ substanceId: number; order: number }> {
  return Object.entries(map).map(([id, order]) => ({
    substanceId: Number(id),
    order,
  }));
}