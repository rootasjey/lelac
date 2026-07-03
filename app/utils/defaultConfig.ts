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
            { type: 'twitch', title: 'Twitch Channels' },
          ],
        },
        {
          size: 'large',
          widgets: [
            { type: 'hn', title: 'Hacker News' },
            { type: 'videos', title: 'Videos' },
            { type: 'reddit', title: 'Reddit' },
          ],
        },
        {
          size: 'medium',
          widgets: [
            { type: 'weather', title: 'Weather' },
            { type: 'markets', title: 'Markets' },
            { type: 'releases', title: 'Releases' },
          ],
        },
      ],
    },
  ],
}
