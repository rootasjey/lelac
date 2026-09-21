<template>
  <WidgetCard title="RSS Feed">
    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="rss-list">
      <a
        v-for="(item, index) in displayItems"
        :key="index"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        class="rss-item"
      >
        <div class="rss-item-title">{{ item.title }}</div>
        <div class="rss-item-meta">{{ item.pubDate }} · {{ item.source }}</div>
      </a>

      <button
        v-if="items.length > 3"
        class="rss-show-more"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'SHOW LESS' : 'SHOW MORE' }} ▾
      </button>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import type { FeedResult } from '~~/shared/utils/feed'

interface FeedItem {
  title: string
  link: string
  pubDate: string
  source: string
}

const props = defineProps<{
  feedUrl?: string
}>()

const items = ref<FeedItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showAll = ref(false)

const displayItems = computed(() => {
  return showAll.value ? items.value : items.value.slice(0, 3)
})

async function fetchFeed() {
  if (!props.feedUrl) {
    items.value = []
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const data = await $fetch<FeedResult>('/api/sources/rss', { query: { url: props.feedUrl } })

    items.value = data.articles.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: formatTimeAgo(new Date(item.date)),
      source: item.source,
    }))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Flux RSS indisponible'
  } finally {
    loading.value = false
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

watch(() => props.feedUrl, fetchFeed, { immediate: true })
</script>

<style scoped>
.rss-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rss-item {
  display: block;
  text-decoration: none;
}

.rss-item:hover {
  text-decoration: none;
}

.rss-item-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--link-color);
  line-height: 1.4;
  transition: color 0.15s;
}

.rss-item:hover .rss-item-title {
  color: var(--link-hover);
  text-decoration: underline;
}

.rss-item-meta {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.rss-show-more {
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

.rss-show-more:hover {
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
