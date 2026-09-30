<template>
  <div class="youtube-feed" :class="{ expanded }" :aria-busy="loading">
    <div ref="body" class="youtube-body">
      <p v-if="loading && !videos.length" class="feed-state" role="status">Chargement des vidéos…</p>
      <p v-else-if="error && !videos.length" class="feed-state" role="alert">
        {{ errorMessage }} <button @click="refresh()">Réessayer</button>
      </p>
      <p v-else-if="!loading && !videos.length" class="feed-state">Aucune vidéo récente à afficher.</p>
      <div
        v-else
        class="video-rail"
        role="region"
        :aria-label="expanded ? 'Liste complète des vidéos de la chaîne' : 'Vidéos récentes de la chaîne'"
      >
        <ul class="video-list" :class="{ 'video-list-expanded': expanded }">
          <li v-for="video in visibleVideos" :key="video.videoId">
            <a class="video-thumb" :href="video.link" target="_blank" rel="noopener noreferrer" :aria-label="`Regarder ${video.title}`">
              <img
                v-if="!unavailableThumbnails.has(video.videoId)"
                :src="thumbnailUrl(video.videoId)"
                alt=""
                loading="lazy"
                :class="{ 'video-thumb-grayscale': grayscale }"
                @error="advanceThumbnail(video.videoId)"
              />
            </a>
            <div class="video-copy">
              <h3><a class="board-link-underline" :href="video.link" target="_blank" rel="noopener noreferrer">{{ video.title }}</a></h3>
              <p class="video-meta"><span v-if="video.date">{{ dateLabel(video.date) }}</span><span v-if="video.date && video.source" aria-hidden="true">·</span><span v-if="video.source" class="video-source">{{ video.source }}</span></p>
            </div>
          </li>
        </ul>
      </div>
      <ul v-if="!expanded && videos.length" ref="measurement" class="video-list video-measure" aria-hidden="true" inert>
        <li v-for="video in videos" :key="video.videoId">
          <span class="video-thumb video-thumb-placeholder" />
          <div class="video-copy">
            <h3>{{ video.title }}</h3>
            <p class="video-meta"><span v-if="video.date">{{ dateLabel(video.date) }}</span><span v-if="video.date && video.source" aria-hidden="true">·</span><span v-if="video.source" class="video-source">{{ video.source }}</span></p>
          </div>
        </li>
      </ul>
    </div>
    <p v-if="error && videos.length" class="stale" role="status">Actualisation impossible · les dernières vidéos sont conservées.</p>
  </div>
</template>

<script setup lang="ts">
import type { FeedResult } from '~~/shared/utils/feed'
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import { youtubePublishedDateLabel, youtubeThumbnailCandidates, youtubeVideoIdFromUrl } from '~~/shared/utils/youtubeFeed'

const props = defineProps<{ channelId: string; expanded?: boolean; grayscale?: boolean }>()
const emit = defineEmits<{ availability: [hasVideos: boolean] }>()
const body = ref<HTMLElement>()
const measurement = ref<HTMLUListElement>()
const expanded = computed(() => props.expanded ?? false)
const { capacity } = useBoardVisibleItemCount(body, measurement, expanded)
const thumbnailAttempts = ref<Record<string, number>>({})
const unavailableThumbnails = ref(new Set<string>())

const sourceKey = computed(() => `youtube:${props.channelId}`)
const { value, loading, error, refresh } = useBoardSource<FeedResult>(
  sourceKey,
  () => $fetch<FeedResult>('/api/sources/youtube-feed', { query: { channelId: props.channelId } }),
)
const errorMessage = computed(() => {
  const requestError = error.value as { data?: { statusMessage?: string } } | undefined
  const detail = requestError?.data?.statusMessage
  return detail ? `Flux YouTube indisponible. ${detail}` : 'Impossible de charger le flux YouTube.'
})
const videos = computed(() => (value.value?.articles ?? []).flatMap(article => {
  const videoId = youtubeVideoIdFromUrl(article.link)
  return videoId ? [{ ...article, videoId }] : []
}))
const visibleVideos = computed(() => expanded.value ? videos.value : videos.value.slice(0, capacity.value))
watch(() => videos.value.length > 0, hasVideos => emit('availability', hasVideos), { immediate: true })
watch(() => props.channelId, () => {
  thumbnailAttempts.value = {}
  unavailableThumbnails.value = new Set()
})

function dateLabel(date: string) {
  return youtubePublishedDateLabel(date)
}

function thumbnailUrl(videoId: string) {
  return youtubeThumbnailCandidates(videoId)[thumbnailAttempts.value[videoId] ?? 0]
}

function advanceThumbnail(videoId: string) {
  const candidates = youtubeThumbnailCandidates(videoId)
  const nextAttempt = (thumbnailAttempts.value[videoId] ?? 0) + 1
  if (nextAttempt < candidates.length) {
    thumbnailAttempts.value = { ...thumbnailAttempts.value, [videoId]: nextAttempt }
    return
  }
  unavailableThumbnails.value = new Set(unavailableThumbnails.value).add(videoId)
}

onBeforeUnmount(() => emit('availability', false))
</script>

<style scoped>
.youtube-feed { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.youtube-body { position: relative; flex: 1; min-height: 0; overflow: hidden; container-type: inline-size; }
.video-rail { height: 100%; min-width: 0; overflow: visible; }
.video-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); align-content: start; gap: 14px; list-style: none; margin: 0; padding: 0 0 8px; }
.video-list li { display: flex; min-width: 0; flex-direction: column; gap: 8px; scroll-snap-align: start; }
.video-thumb { display: block; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 6px; background: #242329; text-decoration: none; }
.video-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.video-thumb-placeholder { flex: none; }
.video-thumb img.video-thumb-grayscale { filter: grayscale(1); }
.video-thumb:hover img.video-thumb-grayscale, .video-thumb:focus-visible img.video-thumb-grayscale { filter: grayscale(0); }
.video-copy { display: flex; min-width: 0; flex: 0 0 auto; flex-direction: column; }
h3 { display: -webkit-box; overflow: hidden; margin: 0; color: #d8c58f; font-size: 12px; font-weight: 500; line-height: 17px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
h3 a { color: inherit; }
h3 a:focus-visible, .video-thumb:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.video-meta { display: flex; min-width: 0; gap: 5px; overflow: hidden; margin: 4px 0 0; color: #85838d; font-size: 10px; line-height: 14px; white-space: nowrap; }
.video-source { overflow: hidden; text-overflow: ellipsis; }
.video-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.feed-state { margin: 0; padding: 18px 0; color: #aaa7b2; font-size: 11px; line-height: 1.6; }
.feed-state button { min-height: 40px; margin-left: 4px; border: 0; background: none; color: #d8c58f; font: inherit; cursor: pointer; }
.feed-state[role='alert'] { color: #e6a19c; }
.stale { flex: 0 0 auto; margin: 0; padding: 4px 0; color: #d8c58f; font-size: 10px; }
.expanded { height: auto; }
.expanded .youtube-body { overflow: visible; container-type: normal; }
.expanded .video-rail { height: auto; }
.expanded .video-list { grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); gap: 24px 20px; padding: 0 0 8px; }
.expanded .video-list li { display: flex; min-width: 0; flex-direction: column; align-items: stretch; gap: 10px; border: 0; padding: 0; }
.expanded .video-thumb { width: 100%; }
.expanded .video-copy { padding: 0; }
.expanded h3 { font-size: 14px; line-height: 20px; -webkit-line-clamp: 3; }
.expanded .video-meta { margin-top: 5px; font-size: 11px; line-height: 16px; }
@container (max-width: 520px) {
  .video-list { display: flex; flex-direction: column; gap: 12px; }
  .video-list li { display: grid; grid-template-columns: minmax(100px, 32%) minmax(0, 1fr); align-items: center; gap: 12px; }
  .video-thumb { width: 100%; }
  .expanded .video-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 12px; }
}
@media (max-width: 560px) {
  .expanded .video-list { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: no-preference) {
  .video-thumb img { transition: filter 180ms ease, transform 180ms ease; }
  .video-list li:hover .video-thumb img { transform: scale(1.03); }
}
</style>
