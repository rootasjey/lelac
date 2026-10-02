import { dashboardIds, defaultDashboard, defaultDashboardDefinitions, parseBoard, parseDashboardDefinitions } from '~/utils/boardConfig'
import type { DashboardBackup, DashboardDefinition } from '~/utils/boardConfig'

export const CONFIG_FILE_FORMAT = 'lelac-configuration'
export const CONFIG_FILE_VERSION = 2

export type ThemePreference = 'system' | 'dark' | 'light'

export interface ConfigurationBundle {
  format: typeof CONFIG_FILE_FORMAT
  version: typeof CONFIG_FILE_VERSION
  exportedAt: string
  appearance: { theme: ThemePreference }
  dashboards: DashboardBackup[]
}

export function createConfigurationBundle(theme: ThemePreference, dashboards: DashboardBackup[], now = new Date()): ConfigurationBundle {
  return {
    format: CONFIG_FILE_FORMAT,
    version: CONFIG_FILE_VERSION,
    exportedAt: now.toISOString(),
    appearance: { theme },
    dashboards,
  }
}

export function parseConfigurationBundle(value: unknown): ConfigurationBundle | null {
  if (!isRecord(value) || value.format !== CONFIG_FILE_FORMAT || (value.version !== 1 && value.version !== CONFIG_FILE_VERSION)) return null
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) return null
  if (!isRecord(value.appearance) || !isThemePreference(value.appearance.theme)) return null
  let dashboards: DashboardBackup[]
  if (value.version === 1) {
    const legacyDashboards = value.dashboards
    if (!isRecord(legacyDashboards) || Object.keys(legacyDashboards).some(id => !dashboardIds.includes(id))) return null
    dashboards = defaultDashboardDefinitions.map(definition => {
      const raw = legacyDashboards[definition.id]
      return { ...definition, config: raw === undefined ? defaultDashboard(definition.id) : parseBoard(raw)! }
    })
    if (Object.values(legacyDashboards).some(board => !parseBoard(board))) return null
  } else {
    const exportedDashboards = value.dashboards
    if (!Array.isArray(exportedDashboards)) return null
    const definitions: DashboardDefinition[] = exportedDashboards.map(item => {
      if (!isRecord(item)) return { id: '', title: '', order: -1 }
      return { id: item.id as string, title: item.title as string, order: item.order as number }
    })
    if (!parseDashboardDefinitions(definitions)) return null
    dashboards = []
    for (let index = 0; index < exportedDashboards.length; index++) {
      const item = exportedDashboards[index]
      if (!isRecord(item)) return null
      const parsed = parseBoard(item.config)
      if (!parsed) return null
      dashboards.push({ id: item.id as string, title: item.title as string, order: index, config: parsed })
    }
  }

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
