<template>
  <WidgetCard title="Quick Links">
    <div class="links-grid">
      <a
        v-for="(link, index) in links"
        :key="index"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="link-item"
      >
        <div
          class="link-avatar"
          :style="{ backgroundColor: link.color + '20', color: link.color }"
        >
          {{ link.title.charAt(0) }}
        </div>
        <span class="link-title">{{ link.title }}</span>
      </a>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
interface Link {
  title: string
  url: string
  icon?: string
  color?: string
}

const props = defineProps<{
  links?: Link[]
}>()

const defaultLinks: Link[] = [
  { title: 'GitHub', url: 'https://github.com', color: 'var(--board-text)' },
  { title: 'Twitter', url: 'https://twitter.com', color: '#1da1f2' },
  { title: 'YouTube', url: 'https://youtube.com', color: '#ff0000' },
  { title: 'Reddit', url: 'https://reddit.com', color: '#ff4500' },
  { title: 'Hacker News', url: 'https://news.ycombinator.com', color: '#ff6600' },
  { title: 'Lobsters', url: 'https://lobste.rs', color: '#ac1309' },
]

const links = computed(() => props.links || defaultLinks)
</script>

<style scoped>
.links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .links-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;
  border-radius: 6px;
  background: var(--bg-tertiary);
  text-decoration: none;
  transition: background-color 0.15s;
}

.link-item:hover {
  background: var(--bg-secondary);
  text-decoration: none;
}

.link-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  font-weight: 700;
}

.link-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
}

.link-item:hover .link-title {
  color: var(--text-primary);
}
</style>
