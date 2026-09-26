<template>
  <BoardFeed v-if="widget.type === 'rss'" :feed-url="widget.feedUrl!" @more="$emit('more')" />
  <BoardWeather v-else-if="widget.type === 'weather'" :location="widget.location!" />
  <BoardYouTube v-else-if="widget.type === 'youtube'" :channel-id="widget.channelId!" :grayscale="widget.grayscale ?? false" @availability="$emit('availability', $event)" />
  <BoardGithubTrending v-else-if="widget.type === 'github-trending'" :period="widget.githubPeriod" :language="widget.githubLanguage" @more="$emit('more')" />
  <BoardGithubDevelopersTrending v-else-if="widget.type === 'github-developers-trending'" :period="widget.githubPeriod" :language="widget.githubLanguage" @more="$emit('more')" />
  <BoardHackerNews v-else-if="widget.type === 'hacker-news'" @more="$emit('more')" />
  <BoardOpenRouterModels v-else-if="widget.type === 'openrouter-models'" :dashboard-id="dashboardId" :widget-id="widget.id" />
  <BoardCinema v-else-if="widget.type === 'cinema' && widget.cinemaLocation" :location="widget.cinemaLocation" />
  <BoardClock v-else :cities="widget.cities!" />
</template>
<script setup lang="ts">
import BoardYouTube from './BoardYouTube.vue'
import BoardCinema from './BoardCinema.vue'
import type { BoardWidget, DashboardId } from '~/utils/boardConfig'
defineProps<{ widget: BoardWidget; dashboardId: DashboardId }>()
defineEmits<{ more: []; availability: [hasVideos: boolean] }>()
</script>
