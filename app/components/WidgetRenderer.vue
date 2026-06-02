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
}

const component = computed(() => componentMap[props.widget.type])

const fallbackTitle = computed(() => {
  const labels: Record<string, string> = {
    calendar: 'Calendar',
    weather: 'Weather',
    clock: 'Clock',
    rss: 'RSS Feed',
    links: 'Quick Links',
  }
  return labels[props.widget.type] ?? props.widget.type
})
</script>

<template>
  <component
    :is="component"
    v-if="component"
    :title="widget.title || fallbackTitle"
    v-bind="widget"
  />
  <WidgetCard v-else :title="widget.title || widget.type">
    <div class="text-sm text-muted py-4 text-center">
      Unknown widget type: <code>{{ widget.type }}</code>
    </div>
  </WidgetCard>
</template>
