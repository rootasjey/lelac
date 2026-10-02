// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createConfigurationBundle, parseConfigurationBundle } from '../app/utils/configTransfer'
import { defaultDashboard, defaultDashboardDefinitions, widgetDefaults } from '../app/utils/boardConfig'

describe('configuration transfer', () => {
  it('round trips theme, dashboard names/order, and widget settings in a versioned file', () => {
    const dashboards = defaultDashboardDefinitions.map(definition => ({ ...definition, config: defaultDashboard(definition.id) }))
    dashboards[0]!.config = {
      ...dashboards[0]!.config,
      options: { density: 'comfortable' },
      widgets: [{ ...widgetDefaults('weather', 'home-weather'), location: { name: 'Toulouse, France', lat: 43.6045, lon: 1.444 } }],
    }
    const bundle = createConfigurationBundle('system', dashboards, new Date('2026-10-01T10:00:00.000Z'))
    expect(bundle.version).toBe(2)
    expect(parseConfigurationBundle(JSON.parse(JSON.stringify(bundle)))).toEqual(bundle)
  })

  it('migrates version-1 fixed dashboards into version 2 and fills missing defaults', () => {
    const legacy = {
      format: 'lelac-configuration',
      version: 1,
      exportedAt: '2026-10-01T10:00:00.000Z',
      appearance: { theme: 'dark' },
      dashboards: { daily: { version: 1, widgets: [] } },
    }
    const parsed = parseConfigurationBundle(legacy)
    expect(parsed?.version).toBe(2)
    expect(parsed?.dashboards.map(item => item.id)).toEqual(['daily', 'tech', 'cinema'])
    expect(parsed?.dashboards[0]?.config).toEqual({ version: 1, widgets: [] })
    expect(parsed?.dashboards[2]?.config).toEqual(defaultDashboard('cinema'))
  })

  it('rejects unsupported versions, duplicate names, malformed boards, and unknown legacy IDs', () => {
    const base = createConfigurationBundle('dark', defaultDashboardDefinitions.map(definition => ({ ...definition, config: defaultDashboard(definition.id) })))
    expect(parseConfigurationBundle({ ...base, version: 3 })).toBeNull()
    expect(parseConfigurationBundle({ ...base, appearance: { theme: 'blue' } })).toBeNull()
    expect(parseConfigurationBundle({ ...base, dashboards: base.dashboards.map(item => ({ ...item, title: 'Même nom' })) })).toBeNull()
    expect(parseConfigurationBundle({ ...base, dashboards: base.dashboards.map((item, index) => index === 0 ? { ...item, config: { version: 99, widgets: [] } } : item) })).toBeNull()
    expect(parseConfigurationBundle({ ...base, version: 1, dashboards: { ...base.dashboards, other: defaultDashboard('daily') } })).toBeNull()
  })
})
