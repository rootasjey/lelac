<template>
  <WidgetCard title="Releases">
    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="releases-list">
      <a
        v-for="(release, index) in releases"
        :key="release.repo"
        :href="release.url"
        target="_blank"
        rel="noopener noreferrer"
        class="release-item"
      >
        <div class="release-repo">{{ release.repo }}</div>
        <div class="release-meta">{{ release.time }} · {{ release.version }}</div>
      </a>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
interface Release {
  repo: string
  version: string
  time: string
  url: string
}

const props = withDefaults(defineProps<{
  repos?: string[]
}>(), {
  repos: () => ['glanceapp/glance', 'go-gitea/gitea', 'syncthing/syncthing', 'immich-app/immich']
})

const releases = ref<Release[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

async function fetchReleases() {
  try {
    loading.value = true
    error.value = null

    const promises = props.repos.map(async (repo) => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo}/releases/latest`
        )

        if (!response.ok) {
          throw new Error('Not found')
        }

        const data = await response.json()

        return {
          repo,
          version: data.tag_name,
          time: formatTimeAgo(data.published_at),
          url: data.html_url,
        }
      } catch {
        return {
          repo,
          version: 'N/A',
          time: '',
          url: `https://github.com/${repo}/releases`,
        }
      }
    })

    releases.value = await Promise.all(promises)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch releases'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReleases()
})
</script>

<style scoped>
.releases-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.release-item {
  display: block;
  text-decoration: none;
}

.release-item:hover {
  text-decoration: none;
}

.release-repo {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--link-color);
  transition: color 0.15s;
}

.release-item:hover .release-repo {
  color: var(--link-hover);
  text-decoration: underline;
}

.release-meta {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
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
