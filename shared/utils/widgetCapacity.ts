export function countFittingItems(containerBottom: number, itemBottoms: readonly number[], tolerance = 1): number {
  if (!Number.isFinite(containerBottom) || !Number.isFinite(tolerance) || tolerance < 0) return 0
  return itemBottoms.filter(bottom => Number.isFinite(bottom) && bottom <= containerBottom + tolerance).length
}
