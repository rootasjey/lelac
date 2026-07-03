<template>
  <WidgetCard title="Hacker News">
    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="hn-list">
      <a
        v-for="(item, index) in displayItems"
        :key="item.id"
        :href="item.url || `https://news.ycombinator.com/item?id=${item.id}`"
        target="_blank"
        rel="noopener noreferrer"
        class="hn-item"
      >
        <div class="hn-item-title">{{ item.title }}</div>
        <div class="hn-item-meta">
          {{ item.time }} · {{ item.points }} points · {{ item.comments }} comments · {{ item.domain }} ↗
        </div>
      </a>

      <button
        v-if="items.length > 5"
        class="show-more"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'SHOW LESS' : 'SHOW MORE' }} ▾
      </button>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
interface HnItem {
  id: number
  title: string
  url: string
  points: number
  comments: number
  time: string
  domain: string
}

const items = ref<HnItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showAll = ref(false)

const displayItems = computed(() => {
  return showAll.value ? items.value : items.value.slice(0, 5)
})

function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp
  const hours = Math.floor(diff / 3600)

  if (hours < 1) return `${Math.floor(diff / 60)}m`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function extractDomain(url: string): string {
  if (!url) return 'news.ycombinator.com'
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'news.ycombinator.com'
  }
}

async function fetchHackerNews() {
  try {
    loading.value = true
    error.value = null

    const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    if (!response.ok) throw new Error('Failed to fetch stories')

    const storyIds = await response.json()
    const topIds = storyIds.slice(0, 10)

    const storyPromises = topIds.map(async (id: number) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      return res.json()
    })

    const stories = await Promise.all(storyPromises)

    items.value = stories.map((story: any) => ({
      id: story.id,
      title: story.title,
      url: story.url || '',
      points: story.score,
      comments: story.descendants || 0,
      time: formatTimeAgo(story.time),
      domain: extractDomain(story.url),
    }))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch Hacker News'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHackerNews()
})
</script>

<style scoped>
.hn-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.hn-item {
  display: block;
  text-decoration: none;
}

.hn-item:hover {
  text-decoration: none;
}

.hn-item-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--link-color);
  line-height: 1.4;
  transition: color 0.15s;
}

.hn-item:hover .hn-item-title {
  color: var(--link-hover);
  text-decoration: underline;
}

.hn-item-meta {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.show-more {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color 0.15s;
}

.show-more:hover {
  color: var(--text-secondary);
}

.loading,
.error {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1.5rem 0;
}

.error {
  color: var(--negative);
}
</style>
