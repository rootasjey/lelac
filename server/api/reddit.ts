const demoPosts: Record<string, Array<{ title: string; permalink: string; points: number; comments: number; time: string; domain: string }>> = {
  selfhosted: [
    { title: 'Immich v1.120 released with major performance improvements', permalink: '/r/selfhosted/comments/1abc/immich/', points: 847, comments: 123, time: '3h', domain: 'github.com' },
    { title: 'What self-hosted app changed your life in 2024?', permalink: '/r/selfhosted/comments/2def/what_app/', points: 1256, comments: 342, time: '6h', domain: 'reddit.com' },
    { title: 'I built a simple dashboard inspired by Glance', permalink: '/r/selfhosted/comments/3ghi/glance_dashboard/', points: 523, comments: 89, time: '12h', domain: 'github.com' },
    { title: 'Is anyone else tired of subscription-based software?', permalink: '/r/selfhosted/comments/4jkl/subscriptions/', points: 2341, comments: 567, time: '1d', domain: 'reddit.com' },
    { title: 'Traefik vs Nginx Proxy Manager for beginners', permalink: '/r/selfhosted/comments/5mno/traefik_vs_npm/', points: 312, comments: 156, time: '1d', domain: 'reddit.com' },
    { title: 'Uptime Kuma - best monitoring tool I have ever used', permalink: '/r/selfhosted/comments/6pqr/uptime_kuma/', points: 789, comments: 201, time: '2d', domain: 'github.com' },
    { title: 'Home Assistant 2024.12 released', permalink: '/r/selfhosted/comments/7stu/ha_release/', points: 445, comments: 98, time: '2d', domain: 'home-assistant.io' },
    { title: 'Pi-hole vs AdGuard Home - which one do you prefer?', permalink: '/r/selfhosted/comments/8vwx/pihole_vs_adguard/', points: 667, comments: 234, time: '3d', domain: 'reddit.com' },
    { title: 'Self-hosting my own email server - 2 years later', permalink: '/r/selfhosted/comments/9yza/email_server/', points: 1023, comments: 345, time: '3d', domain: 'reddit.com' },
    { title: 'I replaced all Google services with self-hosted alternatives', permalink: '/r/selfhosted/comments/10abc/replace_google/', points: 1876, comments: 432, time: '4d', domain: 'reddit.com' },
  ],
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const subreddit = (query.subreddit as string) || 'selfhosted'
  const limit = (query.limit as string) || '10'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(
      `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=10`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Trame/1.0 (dashboard app)',
          'Accept': 'application/json',
        },
      }
    )

    clearTimeout(timeout)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()

    if (!data?.data?.children) throw new Error('Unexpected format')

    const now = Math.floor(Date.now() / 1000)

    const posts = data.data.children
      .filter((child: any) => !child.data?.stickied)
      .slice(0, 10)
      .map((child: any) => {
        const createdAt = child.data.created_utc || 0
        const diff = now - createdAt
        const hours = Math.floor(diff / 3600)
        const time = hours < 1 ? `${Math.floor(diff / 60)}m` : hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`

        return {
          id: child.data.id,
          title: child.data.title || 'Untitled',
          permalink: child.data.permalink || '/',
          points: child.data.score || 0,
          comments: child.data.num_comments || 0,
          time,
          domain: (child.data.domain || subreddit).replace(/^self\./, ''),
        }
      })

    return { posts }
  } catch (e: any) {
    clearTimeout(timeout)
    const demo = demoPosts[subreddit]
    if (demo) {
      return {
        posts: demo.slice(0, parseInt(limit)),
        _note: 'Using demo data (Reddit API unavailable)',
      }
    }
    throw createError({
      statusCode: 502,
      statusMessage: `Reddit: ${e?.message || e}`,
    })
  }
})
