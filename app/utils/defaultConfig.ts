import type { DashboardConfig } from '~/types/config'

export const defaultConfig: DashboardConfig = {
  title: 'Distill',
  theme: 'system',
  pages: [
    {
      name: 'Home',
      columns: [
        {
          size: 'small',
          widgets: [
            { type: 'calendar', title: 'Calendar' },
            { type: 'rss', title: 'RSS Feed' },
          ],
        },
        {
          size: 'large',
          widgets: [
            { type: 'clock', title: 'Clock' },
            { type: 'links', title: 'Quick Links' },
          ],
        },
        {
          size: 'medium',
          widgets: [
            { type: 'weather', title: 'Weather' },
          ],
        },
      ],
    },
  ],
}
