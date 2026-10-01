import { dashboardIds, defaultDashboard, parseBoard } from '~/utils/boardConfig'
import type { BoardConfig, DashboardId } from '~/utils/boardConfig'

export const CONFIG_FILE_FORMAT = 'encascade-configuration'
export const CONFIG_FILE_VERSION = 1

export type ThemePreference = 'system' | 'dark' | 'light'

export interface ConfigurationBundle {
  format: typeof CONFIG_FILE_FORMAT
  version: typeof CONFIG_FILE_VERSION
  exportedAt: string
  appearance: { theme: ThemePreference }
  dashboards: Record<DashboardId, BoardConfig>
}

export function createConfigurationBundle(theme: ThemePreference, dashboards: Record<DashboardId, BoardConfig>, now = new Date()): ConfigurationBundle {
  return {
    format: CONFIG_FILE_FORMAT,
    version: CONFIG_FILE_VERSION,
    exportedAt: now.toISOString(),
    appearance: { theme },
    dashboards,
  }
}

export function parseConfigurationBundle(value: unknown): ConfigurationBundle | null {
  if (!isRecord(value) || value.format !== CONFIG_FILE_FORMAT || value.version !== CONFIG_FILE_VERSION) return null
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) return null
  if (!isRecord(value.appearance) || !isThemePreference(value.appearance.theme)) return null
  if (!isRecord(value.dashboards)) return null

  const dashboards = {} as Record<DashboardId, BoardConfig>
  for (const id of dashboardIds) {
    if (value.dashboards[id] === undefined) {
      dashboards[id] = defaultDashboard(id)
      continue
    }
    const parsed = parseBoard(value.dashboards[id])
    if (!parsed) return null
    dashboards[id] = parsed
  }
  if (Object.keys(value.dashboards).some(id => !dashboardIds.includes(id as DashboardId))) return null

  return {
    format: CONFIG_FILE_FORMAT,
    version: CONFIG_FILE_VERSION,
    exportedAt: value.exportedAt,
    appearance: { theme: value.appearance.theme },
    dashboards,
  }
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
