// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createConfigurationBundle, parseConfigurationBundle } from '../app/utils/configTransfer'
import { dashboardIds, defaultDashboard, widgetDefaults } from '../app/utils/boardConfig'

describe('configuration transfer', () => {
  it('round trips theme and all dashboard widget settings in a versioned file', () => {
    const dashboards = Object.fromEntries(dashboardIds.map(id => [id, defaultDashboard(id)])) as Record<(typeof dashboardIds)[number], ReturnType<typeof defaultDashboard>>
    dashboards.daily = {
      ...dashboards.daily,
      options: { density: 'comfortable' },
      widgets: [{ ...widgetDefaults('weather', 'home-weather'), location: { name: 'Toulouse, France', lat: 43.6045, lon: 1.444 } }],
    }

    const bundle = createConfigurationBundle('system', dashboards, new Date('2026-10-01T10:00:00.000Z'))
    const imported = parseConfigurationBundle(JSON.parse(JSON.stringify(bundle)))

    expect(imported).toEqual(bundle)
  })

  it('fills newly added dashboards from defaults and rejects unsupported versions or invalid content', () => {
    const base = createConfigurationBundle('dark', Object.fromEntries(dashboardIds.map(id => [id, defaultDashboard(id)])) as never)

    expect(parseConfigurationBundle({ ...base, version: 2 })).toBeNull()
    expect(parseConfigurationBundle({ ...base, appearance: { theme: 'blue' } })).toBeNull()
    expect(parseConfigurationBundle({ ...base, dashboards: { daily: base.dashboards.daily, tech: base.dashboards.tech } })?.dashboards.cinema).toEqual(defaultDashboard('cinema'))
    expect(parseConfigurationBundle({ ...base, dashboards: { ...base.dashboards, tech: { version: 99, widgets: [] } } })).toBeNull()
    expect(parseConfigurationBundle({ ...base, dashboards: { ...base.dashboards, extra: defaultDashboard('daily') } })).toBeNull()
  })
})
