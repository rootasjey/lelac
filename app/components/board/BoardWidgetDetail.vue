<template>
  <div class="widget-detail" :class="{ 'openrouter-detail': widget.type === 'openrouter-models' }">
    <header class="widget-detail-header">
      <div class="widget-detail-heading">
        <p class="widget-detail-eyebrow">{{ eyebrow }}</p>
        <NDialogTitle class="widget-detail-title" tabindex="-1">{{ widget.title }}</NDialogTitle>
        <a v-if="widget.type === 'openrouter-models'" class="openrouter-catalog-link board-link-underline" href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">Explorer le catalogue OpenRouter ↗</a>
      </div>
      <NTooltip content="Fermer">
        <NButton type="button" btn="ghost" square="10" icon label="i-ph-x-bold" aria-label="Fermer le panneau" @click="emit('close')" />
      </NTooltip>
    </header>
    <div class="widget-detail-scroll" :class="{ 'openrouter-detail-scroll': widget.type === 'openrouter-models' }">
      <BoardFeed v-if="widget.type === 'rss' && widget.feedUrl" :feed-url="widget.feedUrl" expanded />
      <BoardYouTube v-else-if="widget.type === 'youtube' && widget.channelId" :channel-id="widget.channelId" :grayscale="widget.grayscale ?? false" expanded />
      <BoardGithubTrending v-else-if="widget.type === 'github-trending'" :period="widget.githubPeriod" :language="widget.githubLanguage" expanded />
      <BoardGithubDevelopersTrending v-else-if="widget.type === 'github-developers-trending'" :period="widget.githubPeriod" :language="widget.githubLanguage" expanded />
      <BoardHackerNews v-else-if="widget.type === 'hacker-news'" expanded />
      <BoardOpenRouterModels v-else-if="widget.type === 'openrouter-models'" :key="`${dashboardId}:${widget.id}:drawer`" :dashboard-id="dashboardId" :widget-id="widget.id" sort-scope="drawer" expanded />
      <BoardCinema v-else-if="widget.type === 'cinema' && widget.cinemaLocation" :location="widget.cinemaLocation" expanded />
      <BoardCinemaReleases v-else-if="widget.type === 'cinema-releases'" expanded />
      <BoardNetflixReleases v-else-if="widget.type === 'netflix-releases'" expanded />
      <BoardAppleTvReleases v-else-if="widget.type === 'apple-tv-releases'" expanded />
      <BoardPrimeVideoReleases v-else-if="widget.type === 'prime-video-releases'" expanded />
      <BoardDisneyPlusAnnouncements v-else-if="widget.type === 'disney-plus-announcements'" expanded />
    </div>
  </div>
</template>

<script setup lang="ts">
import BoardYouTube from './BoardYouTube.vue'
import BoardCinema from './BoardCinema.vue'
import type { BoardWidget, DashboardId } from '~/utils/boardConfig'

const props = defineProps<{ widget: BoardWidget; dashboardId: DashboardId }>()
const emit = defineEmits<{ close: [] }>()
const eyebrow = computed(() => {
  switch (props.widget.type) {
    case 'youtube': return 'VIDÉOS RÉCENTES'
    case 'github-trending': return 'DÉPÔTS TENDANCE'
    case 'github-developers-trending': return 'DÉVELOPPEURS TENDANCE'
    case 'hacker-news': return 'LIENS TECHNIQUES'
    case 'openrouter-models': return 'OPENROUTER'
    case 'cinema':
    case 'cinema-releases': return 'CINÉMA · SCARE'
    case 'netflix-releases': return 'STREAMING · NETFLIX FRANCE'
    case 'apple-tv-releases': return 'STREAMING · APPLE ORIGINALS'
    case 'prime-video-releases': return 'STREAMING · PRIME VIDEO FRANCE'
    case 'disney-plus-announcements': return 'STREAMING · DISNEY+ FRANCE'
    default: return 'TOUS LES ARTICLES'
  }
})
</script>

<style scoped>
.widget-detail { display: flex; width: 100%; height: 100%; min-height: 0; flex-direction: column; color: var(--board-text); }
.widget-detail-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 30px; border-bottom: 1px solid var(--board-border); }
.widget-detail-heading { min-width: 0; }
.widget-detail-eyebrow { margin: 0 0 8px; color: #b0a5a0; font: 10px/1.3 system-ui, sans-serif; letter-spacing: 1.3px; }
.widget-detail-title { display: block; margin: 0; color: var(--board-text); font: 26px/1.2 system-ui, sans-serif; letter-spacing: -.03em; }
.widget-detail-scroll { min-height: 0; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 22px 30px 32px; }
.openrouter-detail .widget-detail-header { padding-bottom: 16px; border-bottom: 0; }
.openrouter-detail-scroll { padding-top: 0; }
.openrouter-catalog-link { display: inline-block; margin-top: 8px; color: var(--board-accent); font: 12px/1.4 system-ui, sans-serif; }
@media (max-width: 767px) { .widget-detail-header { gap: 12px; padding: 18px 18px; } .widget-detail-title { font-size: 22px; } .widget-detail-scroll { padding: 18px 18px 24px; } }
</style>
