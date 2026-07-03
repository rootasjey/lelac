<template>
  <WidgetCard :title="`r/${subreddit}`">
    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="reddit-list">
      <a
        v-for="(item, index) in displayItems"
        :key="item.id"
        :href="`https://reddit.com${item.permalink}`"
        target="_blank"
        rel="noopener noreferrer"
        class="reddit-item"
      >
        <div class="reddit-item-title">{{ item.title }}</div>
        <div class="reddit-item-meta">
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
interface RedditPost {
  id: string
  title: string
  permalink: string
  points: number
  comments: number
  time: string
  domain: string
}

const props = withDefaults(defineProps<{
  subreddit?: string
}>(), {
  subreddit: 'selfhosted'
})

const items = ref<RedditPost[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showAll = ref(false)
const editor = useEditorStore()

const displayItems = computed(() => {
  return showAll.value ? items.value : items.value.slice(0, 5)
})

async function fetchReddit() {
  try {
    loading.value = true
    error.value = null

    const response = await fetch(`/api/reddit?subreddit=${props.subreddit}&limit=10`)

    if (!response.ok) {
      let msg = `HTTP ${response.status}`
      try {
        const err = await response.json()
        msg = err.statusMessage || msg
      } catch {}
      throw new Error(msg)
    }

    const data = await response.json()
    items.value = data.posts || []
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch Reddit posts'
    error.value = 'Failed to load'
    editor.logError('reddit', msg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReddit()
})
</script>

<style scoped>
.reddit-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.reddit-item {
  display: block;
  text-decoration: none;
}

.reddit-item:hover {
  text-decoration: none;
}

.reddit-item-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--link-color);
  line-height: 1.4;
  transition: color 0.15s;
}

.reddit-item:hover .reddit-item-title {
  color: var(--link-hover);
  text-decoration: underline;
}

.reddit-item-meta {
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
