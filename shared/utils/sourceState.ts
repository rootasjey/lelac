export interface BoardSourceResponse<T> {
  key: string
  payload: T
}

export function resolveBoardSourceValue<T>(
  activeKey: string,
  current?: BoardSourceResponse<T>,
  previous?: BoardSourceResponse<T>,
): T | undefined {
  const candidate = current ?? previous
  return candidate?.key === activeKey ? candidate.payload : undefined
}
