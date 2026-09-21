<script setup lang="ts">
import type { BoardWidget } from '~/utils/boardConfig'
defineProps<{ widget: BoardWidget }>()
defineEmits<{ more: [] }>()
</script>
<template>
  <BoardFeed v-if="widget.type === 'rss'" :feed-url="widget.feedUrl!" @more="$emit('more')" />
  <BoardWeather v-else-if="widget.type === 'weather'" :location="widget.location!" />
  <BoardClock v-else :cities="widget.cities!" />
</template>
