<script setup lang="ts">
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
    // Use demo data if no URL provided
    items.value = [
      { title: 'Self-Host Weekly (29 May 2026)', link: '#', pubDate: '3d', source: 'selfh.st' },
      { title: 'CSS vs. JavaScript', link: '#', pubDate: '6d', source: 'Josh Comeau' },
      { title: 'Self-Host Weekly (22 May 2026)', link: '#', pubDate: '10d', source: 'selfh.st' },
    ]
    loading.value = false
    return
  }
  
  try {
    loading.value = true
    error.value = null
    
    // Use a CORS proxy for RSS feeds
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(props.feedUrl)}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch feed')
    }
    
    const data = await response.json()
    
    items.value = data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      pubDate: formatTimeAgo(new Date(item.pubDate)),
      source: new URL(item.link).hostname.replace('www.', ''),
    }))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch feed'
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

onMounted(() => {
  fetchFeed()
})
</script>

<template>
  <WidgetCard title="RSS Feed">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="text-muted text-sm">Loading...</div>
    </div>
    
    <div v-else-if="error" class="flex items-center justify-center py-8">
      <div class="text-red-400 text-sm">{{ error }}</div>
    </div>
    
    <div v-else class="space-y-3">
      <a
        v-for="(item, index) in displayItems"
        :key="index"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        class="block group"
      >
        <div class="text-sm font-medium text-link group-hover:text-link-hover transition-colors">
          {{ item.title }}
        </div>
        <div class="text-xs text-muted mt-0.5">
          {{ item.pubDate }} · {{ item.source }}
        </div>
      </a>

      <button
        v-if="items.length > 3"
        class="text-xs text-muted hover:text-secondary transition-colors uppercase tracking-wider"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Show Less' : 'Show More' }} ▾
      </button>
    </div>
  </WidgetCard>
</template>
