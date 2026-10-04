const accountHandlePattern = /^[a-z0-9](?:[a-z0-9-]{1,34}[a-z0-9])?$/

export function normalizeAccountHandle(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const handle = value.trim().toLocaleLowerCase('en')
  if (handle.length < 3 || handle.length > 36 || !accountHandlePattern.test(handle)) return null
  return handle
}

export function accountHomePath(handle: string) {
  return `/@${encodeURIComponent(handle)}`
}

export function accountDashboardPath(handle: string, dashboardId: string, defaultDashboardId: string) {
  const home = accountHomePath(handle)
  return dashboardId === defaultDashboardId
    ? home
    : `${home}/board/${encodeURIComponent(dashboardId)}`
}
