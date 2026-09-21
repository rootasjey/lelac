<template>
  <div class="youtube-feed" :class="{ expanded }" :aria-busy="loading">
    <div class="youtube-body">
      <p v-if="loading && !videos.length" class="feed-state" role="status">Chargement des vidéos…</p>
      <p v-else-if="error && !videos.length" class="feed-state" role="alert">
        {{ errorMessage }} <button @click="refresh()">Réessayer</button>
      </p>
      <p v-else-if="!loading && !videos.length" class="feed-state">Aucune vidéo récente à afficher.</p>
      <div
        v-else
        class="video-rail"
        role="region"
        :tabindex="expanded ? undefined : 0"
        :aria-label="expanded ? 'Liste complète des vidéos de la chaîne' : 'Vidéos récentes, faites défiler horizontalement pour en voir davantage'"
      >
        <ul class="video-list" :class="{ 'video-list-expanded': expanded }">
          <li v-for="video in videos" :key="video.videoId">
            <a class="video-thumb" :href="video.link" target="_blank" rel="noopener noreferrer" :aria-label="`Regarder ${video.title}`">
              <img
                v-if="!failedThumbnails.has(video.videoId)"
                :src="youtubeThumbnailUrl(video.videoId)"
                alt=""
                width="230"
                height="130"
                loading="lazy"
                :class="{ 'video-thumb-grayscale': grayscale }"
                @error="markThumbnailFailed(video.videoId)"
              />
            </a>
            <div class="video-copy">
              <h3><a :href="video.link" target="_blank" rel="noopener noreferrer">{{ video.title }}</a></h3>
              <p class="video-meta"><span v-if="video.date">{{ dateLabel(video.date) }}</span><span v-if="video.date && video.source" aria-hidden="true">·</span><span v-if="video.source" class="video-source">{{ video.source }}</span></p>
            </div>
          </li>
        </ul>
      </div>
    </div>
    <p v-if="error && videos.length" class="stale" role="status">Actualisation impossible · les dernières vidéos sont conservées.</p>
  </div>
</template>

<script setup lang="ts">
import type { FeedResult } from '~~/shared/utils/feed'
import { youtubePublishedDateLabel, youtubeThumbnailUrl, youtubeVideoIdFromUrl } from '~~/shared/utils/youtubeFeed'

const props = defineProps<{ channelId: string; expanded?: boolean; grayscale?: boolean }>()
const emit = defineEmits<{ availability: [hasVideos: boolean] }>()
const failedThumbnails = ref(new Set<string>())

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
watch(() => videos.value.length > 0, hasVideos => emit('availability', hasVideos), { immediate: true })

function dateLabel(date: string) {
  return youtubePublishedDateLabel(date)
}

function markThumbnailFailed(videoId: string) {
  failedThumbnails.value = new Set(failedThumbnails.value).add(videoId)
}

onBeforeUnmount(() => emit('availability', false))

</script>

<style scoped>
.youtube-feed { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.youtube-body { flex: 1; min-height: 0; overflow: hidden; }
.video-rail { display: flex; height: 100%; min-width: 0; align-items: stretch; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scroll-snap-type: x proximity; scrollbar-color: #55515c #242329; scrollbar-width: thin; }
.video-rail:focus-visible { outline: 2px solid #d8c58f; outline-offset: -2px; }
.video-list { display: flex; width: max-content; min-width: 100%; height: calc(100% - 8px); align-items: stretch; gap: 12px; list-style: none; margin: 0; padding: 0 0 8px; }
.video-list li { display: flex; flex: 0 0 min(230px, 72vw); min-width: 0; height: 100%; flex-direction: column; gap: 10px; overflow: visible; scroll-snap-align: start; }
.video-thumb { display: block; width: 100%; min-height: 0; flex: 1 1 auto; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid #2f2d35; border-radius: 8px; background: #242329; text-decoration: none; }
.video-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.video-thumb img.video-thumb-grayscale { filter: grayscale(1); }
.video-thumb:hover img.video-thumb-grayscale, .video-thumb:focus-visible img.video-thumb-grayscale { filter: grayscale(0); }
.video-copy { display: flex; min-width: 0; flex: 0 0 auto; flex-direction: column; border-radius: 8px; background: #1a191f; padding: 10px 12px 12px; }
.video-list li:hover .video-thumb { border-color: #514d58; }
h3 { display: -webkit-box; overflow: hidden; margin: 0; color: #d8c58f; font-size: 13px; font-weight: 500; line-height: 18px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
h3 a { color: inherit; text-decoration: none; }
h3 a:hover { text-decoration: underline; }
h3 a:focus-visible, .video-thumb:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.video-meta { display: flex; min-width: 0; gap: 5px; overflow: hidden; margin: 5px 0 0; color: #85838d; font-size: 10px; line-height: 14px; white-space: nowrap; }
.video-source { overflow: hidden; text-overflow: ellipsis; }
.feed-state { margin: 0; padding: 18px 0; color: #aaa7b2; font-size: 11px; line-height: 1.6; }
.feed-state button { min-height: 40px; margin-left: 4px; border: 0; background: none; color: #d8c58f; font: inherit; cursor: pointer; }
.feed-state[role='alert'] { color: #e6a19c; }
.stale { flex: 0 0 auto; margin: 0; padding: 4px 0; color: #d8c58f; font-size: 10px; }
.expanded { height: auto; }
.expanded .youtube-body { overflow: visible; }
.expanded .video-rail { display: block; height: auto; overflow: visible; }
.expanded .video-list { width: 100%; height: auto; flex-direction: column; gap: 16px; padding: 0; }
.expanded .video-list li { display: grid; flex: none; height: auto; grid-template-columns: 120px minmax(0, 1fr); gap: 14px; align-items: center; overflow: visible; border: 0; border-bottom: 1px solid #29292e; border-radius: 0; background: transparent; padding: 0 0 14px; }
.expanded .video-thumb { width: 120px; min-height: auto; flex: none; border: 0; border-radius: 0; }
.expanded .video-copy { border: 0; border-radius: 0; background: transparent; padding: 0; }
.expanded .video-meta { margin-top: 4px; }
@media (prefers-reduced-motion: no-preference) {
  .video-thumb img { transition: filter 180ms ease, transform 180ms ease; }
  .video-list li:hover .video-thumb img { transform: scale(1.03); }
}
@media (max-width: 520px) {
  .expanded .video-list li { grid-template-columns: 104px minmax(0, 1fr); }
  .expanded .video-thumb { width: 104px; }
}
</style>
