<template>
  <WidgetCard title="Quick Links">
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <a
        v-for="(link, index) in links"
        :key="index"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex flex-col items-center gap-2 p-3 rounded bg-tertiary hover:bg-secondary transition-colors group"
      >
        <div
          class="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
          :style="{ backgroundColor: link.color + '15', color: link.color }"
        >
          {{ link.title.charAt(0) }}
        </div>
        <span class="text-xs text-secondary group-hover:text-primary transition-colors text-center leading-tight">
          {{ link.title }}
        </span>
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
  { title: 'GitHub', url: 'https://github.com', color: '#f0f6fc' },
  { title: 'Twitter', url: 'https://twitter.com', color: '#1da1f2' },
  { title: 'YouTube', url: 'https://youtube.com', color: '#ff0000' },
  { title: 'Reddit', url: 'https://reddit.com', color: '#ff4500' },
  { title: 'Hacker News', url: 'https://news.ycombinator.com', color: '#ff6600' },
  { title: 'Lobsters', url: 'https://lobste.rs', color: '#ac1309' },
]

const links = computed(() => props.links || defaultLinks)
</script>
