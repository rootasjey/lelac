<template>
  <component
    :is="component"
    v-if="component"
    v-bind="{ ...widget, title: widget.title || fallbackTitle }"
  />
  <WidgetCard v-else :title="widget.title || widget.type">
    <div class="unknown-widget">
      Unknown widget type: <code>{{ widget.type }}</code>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import type { WidgetConfig } from '~/types/config'

const props = defineProps<{
  widget: WidgetConfig
}>()

const componentMap: Record<string, Component> = {
  calendar: defineAsyncComponent(() => import('~/components/widgets/WidgetCalendar.vue')),
  weather: defineAsyncComponent(() => import('~/components/widgets/WidgetWeather.vue')),
  clock: defineAsyncComponent(() => import('~/components/widgets/WidgetClock.vue')),
  rss: defineAsyncComponent(() => import('~/components/widgets/WidgetRss.vue')),
  links: defineAsyncComponent(() => import('~/components/widgets/WidgetLinks.vue')),
  hn: defineAsyncComponent(() => import('~/components/widgets/WidgetHn.vue')),
  reddit: defineAsyncComponent(() => import('~/components/widgets/WidgetReddit.vue')),
  twitch: defineAsyncComponent(() => import('~/components/widgets/WidgetTwitch.vue')),
  videos: defineAsyncComponent(() => import('~/components/widgets/WidgetVideos.vue')),
  markets: defineAsyncComponent(() => import('~/components/widgets/WidgetMarkets.vue')),
  releases: defineAsyncComponent(() => import('~/components/widgets/WidgetReleases.vue')),
}

const component = computed(() => componentMap[props.widget.type])

const fallbackTitle = computed(() => {
  const labels: Record<string, string> = {
    calendar: 'Calendar',
    weather: 'Weather',
    clock: 'Clock',
    rss: 'RSS Feed',
    links: 'Quick Links',
    hn: 'Hacker News',
    reddit: 'Reddit',
    twitch: 'Twitch Channels',
    videos: 'Videos',
    markets: 'Markets',
    releases: 'Releases',
  }
  return labels[props.widget.type] ?? props.widget.type
})
</script>

<style scoped>
.unknown-widget {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1.5rem 0;
}

.unknown-widget code {
  color: var(--negative);
}
</style>
