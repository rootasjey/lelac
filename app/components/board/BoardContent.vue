<template>
  <BoardFeed v-if="widget.type === 'rss'" :feed-url="widget.feedUrl!" @more="$emit('more')" />
  <BoardWeather v-else-if="widget.type === 'weather'" :location="widget.location!" />
  <BoardYouTube v-else-if="widget.type === 'youtube'" :channel-id="widget.channelId!" :grayscale="widget.grayscale ?? false" @availability="$emit('availability', $event)" />
  <BoardClock v-else :cities="widget.cities!" />
</template>
<script setup lang="ts">
import BoardYouTube from './BoardYouTube.vue'
import type { BoardWidget } from '~/utils/boardConfig'
defineProps<{ widget: BoardWidget }>()
defineEmits<{ more: []; availability: [hasVideos: boolean] }>()
</script>
