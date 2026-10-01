<script setup lang="ts">
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import type { AppleTvReleasesResult, AppleTvRelease } from '~~/shared/utils/appleTvReleases'

const props = withDefaults(defineProps<{ expanded?: boolean }>(), { expanded: false })
const body = ref<HTMLElement>()
const measurement = ref<HTMLUListElement>()
const expanded = computed(() => props.expanded)
const failedArtwork = ref(new Set<string>())
const { value, loading, error, refresh } = useBoardSource<AppleTvReleasesResult>(
  () => 'apple-tv-releases:fr:v2',
  () => $fetch('/api/sources/apple-tv-releases'),
)
const releases = computed(() => value.value?.releases ?? [])
const { capacity } = useBoardVisibleItemCount(body, measurement, expanded, 44)
const previewReleases = computed(() => releases.value.slice(0, Math.min(16, Math.max(1, capacity.value))))

function markArtworkFailed(key: string) {
  failedArtwork.value = new Set(failedArtwork.value).add(key)
}

function hasArtwork(release: AppleTvRelease) {
  return Boolean(release.imageUrl && !failedArtwork.value.has(release.key))
}

function initials(title: string) {
  return title.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('fr')
}
</script>

<template>
  <section ref="body" class="apple-tv-widget" :class="{ expanded }" :aria-busy="loading">
    <div class="apple-tv-scroll">
      <p v-if="loading && !releases.length" class="apple-tv-state" role="status">Chargement du calendrier Apple TV…</p>
      <p v-else-if="error && !releases.length" class="apple-tv-state" role="alert">Calendrier indisponible. <button type="button" @click="() => refresh()">Réessayer</button></p>
      <p v-else-if="!releases.length" class="apple-tv-state">Aucune sortie datée à venir dans le catalogue Apple Originals.</p>
      <ul v-else class="apple-tv-grid" :class="{ 'all-releases': expanded }">
        <li v-for="(release, index) in expanded ? releases : previewReleases" :key="release.key" class="apple-tv-card" :style="{ '--card-index': index }">
          <a :href="release.url" target="_blank" rel="noopener noreferrer" class="apple-tv-card-link" :aria-label="`${release.title}, ${release.kind}, ${release.dateLabel} — ouvrir la fiche Apple TV Press`">
            <span class="apple-tv-artwork" :class="{ 'artwork-fallback': !hasArtwork(release) }">
              <img
                v-if="hasArtwork(release)"
                :src="release.imageUrl"
                :alt="`Visuel de ${release.title}`"
                loading="lazy"
                decoding="async"
                @error="markArtworkFailed(release.key)"
              >
              <span v-else class="apple-tv-fallback-mark" aria-hidden="true">{{ initials(release.title) }}</span>
              <span class="apple-tv-kind-badge">{{ release.kind }}</span>
              <span class="apple-tv-artwork-arrow i-ph-arrow-up-right-bold" aria-hidden="true" />
            </span>
            <span class="apple-tv-date"><span class="i-ph-calendar-dots" aria-hidden="true" />{{ release.dateLabel }}</span>
            <span class="apple-tv-title">{{ release.title }}</span>
          </a>
        </li>
      </ul>
      <ul v-if="!expanded && releases.length" ref="measurement" class="apple-tv-grid apple-tv-measure" aria-hidden="true" inert>
        <li v-for="release in releases" :key="release.key" class="apple-tv-card">
          <span class="apple-tv-artwork" />
          <span class="apple-tv-date"><span class="i-ph-calendar-dots" aria-hidden="true" />{{ release.dateLabel }}</span>
          <span class="apple-tv-title">{{ release.title }}</span>
        </li>
      </ul>
    </div>
    <footer class="apple-tv-footer">
      <span>Sorties annoncées · Apple TV Press France</span>
      <a :href="value?.sourceUrl ?? 'https://www.apple.com/fr/tv-pr/originals/'" target="_blank" rel="noopener noreferrer">Source ↗</a>
    </footer>
  </section>
</template>

<style scoped>
.apple-tv-widget { display: flex; height: 100%; min-height: 0; flex-direction: column; color: var(--board-text); }
.apple-tv-scroll { position: relative; min-height: 0; flex: 1; overflow: hidden; container-type: inline-size; }
.apple-tv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 205px), 1fr)); align-content: start; gap: 20px 16px; list-style: none; margin: 0; padding: 16px 14px 20px; }
.apple-tv-card { min-width: 0; animation: apple-tv-card-enter 340ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(min(var(--card-index), 10) * 35ms); }
.apple-tv-card-link { display: grid; min-width: 0; grid-template-rows: auto auto 1fr; gap: 9px; color: inherit; text-decoration: none; }
.apple-tv-artwork { position: relative; display: grid; overflow: hidden; max-height: 42vh; aspect-ratio: 16 / 9; align-items: center; justify-items: center; border-radius: 9px; background: linear-gradient(145deg, #303340, #211e27 68%); box-shadow: 0 5px 16px rgb(0 0 0 / 22%); isolation: isolate; }
.apple-tv-artwork::after { position: absolute; z-index: 0; inset: 35% 0 0; background: linear-gradient(transparent, rgb(12 10 13 / 64%)); content: ''; pointer-events: none; }
.apple-tv-artwork img { width: 100%; height: 100%; object-fit: cover; transition: transform 450ms cubic-bezier(.2,.75,.25,1), filter 300ms ease; }
.apple-tv-card-link:hover .apple-tv-artwork img, .apple-tv-card-link:focus-visible .apple-tv-artwork img { transform: scale(1.035); }
.apple-tv-artwork.artwork-fallback { background: radial-gradient(ellipse at 50% 36%, #454255, #29232d 70%); }
.apple-tv-fallback-mark { color: rgb(192 184 222 / 82%); font: 500 clamp(42px, 6vw, 88px)/1 Georgia, serif; letter-spacing: -.06em; }
.apple-tv-kind-badge { position: absolute; z-index: 1; top: 10px; left: 10px; max-width: calc(100% - 20px); overflow: hidden; padding: 5px 7px; border-radius: 3px; background: rgb(20 17 21 / 76%); color: #dedaf0; font: 9px/1.2 system-ui, sans-serif; letter-spacing: .07em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.apple-tv-artwork-arrow { position: absolute; z-index: 1; right: 10px; bottom: 10px; display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: #c4b8ed; color: #211e27; font-size: 14px; opacity: 0; transform: translateY(3px); transition: opacity 160ms ease, transform 160ms ease; }
.apple-tv-card-link:hover .apple-tv-artwork-arrow, .apple-tv-card-link:focus-visible .apple-tv-artwork-arrow { opacity: 1; transform: translateY(0); }
.apple-tv-date { display: flex; min-width: 0; align-items: center; gap: 7px; color: var(--board-text-soft); font: 10px/1.35 system-ui, sans-serif; letter-spacing: .055em; text-transform: uppercase; }
.apple-tv-date > span { flex: 0 0 auto; color: #c4b8ed; font-size: 12px; }
.apple-tv-title { display: -webkit-box; overflow: hidden; color: var(--board-accent-soft); font: 500 17px/1.2 Georgia, serif; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.apple-tv-card-link:hover .apple-tv-title { color: var(--board-accent-soft); }
.apple-tv-card-link:focus-visible { border-radius: 9px; outline: 2px solid var(--board-accent-bright); outline-offset: 4px; }
.apple-tv-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.apple-tv-state { margin: 0; padding: 24px 14px; color: var(--board-text-muted); font-size: 12px; }
.apple-tv-state button { border: 0; background: transparent; color: var(--board-accent); font: inherit; cursor: pointer; }
.apple-tv-footer { display: flex; flex: 0 0 auto; justify-content: space-between; gap: 12px; padding: 10px 14px 12px; color: var(--board-text-dim); font-size: 10px; }
.apple-tv-footer a { color: var(--board-text-muted); text-decoration: none; }
.apple-tv-footer a:hover { color: #c4b8ed; }
.expanded { height: auto; min-height: 0; flex: 0 0 auto; }
.expanded .apple-tv-scroll { min-height: 0; flex: 0 0 auto; overflow: visible; }
.expanded .apple-tv-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); gap: 28px 22px; padding: 8px 4px 24px; }
.expanded .apple-tv-artwork { max-height: none; aspect-ratio: 16 / 9; }
.expanded .apple-tv-date { font-size: 11px; }
.expanded .apple-tv-title { font-size: 19px; }
@container (min-width: 860px) { .apple-tv-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@container (min-width: 1500px) { .apple-tv-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@container (max-width: 520px) {
  .apple-tv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px 11px; padding: 12px 9px 16px; }
  .apple-tv-card-link { gap: 7px; }
  .apple-tv-kind-badge { top: 7px; left: 7px; padding: 4px 5px; font-size: 8px; }
  .apple-tv-date { gap: 5px; font-size: 9px; }
  .apple-tv-title { font-size: 15px; }
  .apple-tv-artwork-arrow { right: 7px; bottom: 7px; width: 26px; height: 26px; }
}
@container (max-width: 260px) { .apple-tv-grid { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .apple-tv-card { animation: none; }
  .apple-tv-artwork img, .apple-tv-artwork-arrow { transition: none; }
}
@keyframes apple-tv-card-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
