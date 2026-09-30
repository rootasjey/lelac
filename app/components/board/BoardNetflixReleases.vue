<script setup lang="ts">
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import type { NetflixReleasesResult, NetflixRelease } from '~~/shared/utils/netflixReleases'

const props = withDefaults(defineProps<{ expanded?: boolean }>(), { expanded: false })
const body = ref<HTMLElement>()
const measurement = ref<HTMLUListElement>()
const expanded = computed(() => props.expanded)
const failedArtwork = ref(new Set<string>())
const { value, loading, error, refresh } = useBoardSource<NetflixReleasesResult>(
  () => 'netflix-releases:fr:v2',
  () => $fetch('/api/sources/netflix-releases'),
)
const releases = computed(() => value.value?.releases ?? [])
const { capacity } = useBoardVisibleItemCount(body, measurement, expanded, 44)
const previewReleases = computed(() => releases.value.slice(0, Math.min(16, Math.max(1, capacity.value))))

function markArtworkFailed(key: string) {
  failedArtwork.value = new Set(failedArtwork.value).add(key)
}

function hasArtwork(release: NetflixRelease) {
  return Boolean(release.imageUrl && !failedArtwork.value.has(release.key))
}

function initials(title: string) {
  return title.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('fr')
}
</script>

<template>
  <section ref="body" class="netflix-widget" :class="{ expanded }" :aria-busy="loading">
    <div class="netflix-scroll">
      <p v-if="loading && !releases.length" class="netflix-state" role="status">Chargement du calendrier Netflix…</p>
      <p v-else-if="error && !releases.length" class="netflix-state" role="alert">Calendrier indisponible. <button type="button" @click="() => refresh()">Réessayer</button></p>
      <p v-else-if="!releases.length" class="netflix-state">Aucune sortie datée à venir dans le calendrier officiel.</p>
      <ul v-else class="netflix-grid" :class="{ 'all-releases': expanded }">
        <li v-for="(release, index) in expanded ? releases : previewReleases" :key="release.key" class="netflix-card" :style="{ '--card-index': index }">
          <a :href="release.url" target="_blank" rel="noopener noreferrer" class="netflix-card-link" :aria-label="`${release.title}, ${release.kind}, ${release.dateLabel} — ouvrir sur Netflix`">
            <span class="netflix-artwork" :class="{ 'artwork-fallback': !hasArtwork(release) }">
              <img
                v-if="hasArtwork(release)"
                :src="release.imageUrl"
                :alt="`Visuel de ${release.title}`"
                loading="lazy"
                decoding="async"
                @error="markArtworkFailed(release.key)"
              >
              <span v-else class="netflix-fallback-mark" aria-hidden="true">{{ initials(release.title) }}</span>
              <span class="netflix-kind-badge">{{ release.kind }}</span>
              <span class="netflix-artwork-arrow i-ph-arrow-up-right-bold" aria-hidden="true" />
            </span>
            <span class="netflix-date"><span class="i-ph-calendar-dots" aria-hidden="true" />{{ release.dateLabel }}</span>
            <span class="netflix-title">{{ release.title }}</span>
          </a>
        </li>
      </ul>
      <ul v-if="!expanded && releases.length" ref="measurement" class="netflix-grid netflix-measure" aria-hidden="true" inert>
        <li v-for="release in releases" :key="release.key" class="netflix-card">
          <span class="netflix-artwork" />
          <span class="netflix-date"><span class="i-ph-calendar-dots" aria-hidden="true" />{{ release.dateLabel }}</span>
          <span class="netflix-title">{{ release.title }}</span>
        </li>
      </ul>
    </div>
    <footer class="netflix-footer">
      <span>Sorties annoncées · Netflix France</span>
      <a :href="value?.sourceUrl ?? 'https://about.netflix.com/fr/news/calendrier-de-sorties-originals-france'" target="_blank" rel="noopener noreferrer">Source ↗</a>
    </footer>
  </section>
</template>

<style scoped>
.netflix-widget { display: flex; height: 100%; min-height: 0; flex-direction: column; color: #e3e0e7; }
.netflix-scroll { position: relative; min-height: 0; flex: 1; overflow: hidden; container-type: inline-size; }
.netflix-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); align-content: start; gap: 20px 16px; list-style: none; margin: 0; padding: 16px 14px 20px; }
.netflix-card { min-width: 0; animation: netflix-card-enter 340ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(min(var(--card-index), 10) * 35ms); }
.netflix-card-link { display: grid; min-width: 0; grid-template-rows: auto auto 1fr; gap: 9px; color: inherit; text-decoration: none; }
.netflix-artwork { position: relative; display: grid; overflow: hidden; max-height: 42vh; aspect-ratio: 4 / 5; align-items: center; justify-items: center; border-radius: 9px; background: linear-gradient(145deg, #40282b, #211e27 68%); box-shadow: 0 5px 16px rgb(0 0 0 / 22%); isolation: isolate; }
.netflix-artwork::after { position: absolute; z-index: 0; inset: 35% 0 0; background: linear-gradient(transparent, rgb(12 10 13 / 64%)); content: ''; pointer-events: none; }
.netflix-artwork img { width: 100%; height: 100%; object-fit: cover; transition: transform 450ms cubic-bezier(.2,.75,.25,1), filter 300ms ease; }
.netflix-card-link:hover .netflix-artwork img, .netflix-card-link:focus-visible .netflix-artwork img { transform: scale(1.035); }
.netflix-artwork.artwork-fallback { background: radial-gradient(ellipse at 50% 36%, #58333a, #29232d 70%); }
.netflix-fallback-mark { color: rgb(239 113 120 / 78%); font: 500 clamp(42px, 6vw, 88px)/1 Georgia, serif; letter-spacing: -.06em; }
.netflix-kind-badge { position: absolute; z-index: 1; top: 10px; left: 10px; max-width: calc(100% - 20px); overflow: hidden; padding: 5px 7px; border-radius: 3px; background: rgb(20 17 21 / 76%); color: #f0c7c9; font: 9px/1.2 system-ui, sans-serif; letter-spacing: .07em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.netflix-artwork-arrow { position: absolute; z-index: 1; right: 10px; bottom: 10px; display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: #ef7178; color: #201a1d; font-size: 14px; opacity: 0; transform: translateY(3px); transition: opacity 160ms ease, transform 160ms ease; }
.netflix-card-link:hover .netflix-artwork-arrow, .netflix-card-link:focus-visible .netflix-artwork-arrow { opacity: 1; transform: translateY(0); }
.netflix-date { display: flex; min-width: 0; align-items: center; gap: 7px; color: #efb9bb; font: 10px/1.35 system-ui, sans-serif; letter-spacing: .055em; text-transform: uppercase; }
.netflix-date > span { flex: 0 0 auto; color: #ef7178; font-size: 12px; }
.netflix-title { display: -webkit-box; overflow: hidden; color: #e3d3a0; font: 500 17px/1.2 Georgia, serif; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.netflix-card-link:hover .netflix-title { color: #f1e0a9; }
.netflix-card-link:focus-visible { border-radius: 9px; outline: 2px solid #e6cd84; outline-offset: 4px; }
.netflix-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.netflix-state { margin: 0; padding: 24px 14px; color: #aaa7b2; font-size: 12px; }
.netflix-state button { border: 0; background: transparent; color: #e4ce8b; font: inherit; cursor: pointer; }
.netflix-footer { display: flex; flex: 0 0 auto; justify-content: space-between; gap: 12px; padding: 10px 14px 12px; color: #898691; font-size: 10px; }
.netflix-footer a { color: #aaa7b2; text-decoration: none; }
.netflix-footer a:hover { color: #ef9fa2; }
.expanded { height: auto; min-height: 0; flex: 0 0 auto; }
.expanded .netflix-scroll { min-height: 0; flex: 0 0 auto; overflow: visible; }
.expanded .netflix-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 205px), 1fr)); gap: 28px 22px; padding: 8px 4px 24px; }
.expanded .netflix-artwork { max-height: none; aspect-ratio: 2 / 3; }
.expanded .netflix-date { font-size: 11px; }
.expanded .netflix-title { font-size: 19px; }
@container (min-width: 860px) { .netflix-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@container (min-width: 1500px) { .netflix-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
@container (max-width: 520px) {
  .netflix-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px 11px; padding: 12px 9px 16px; }
  .netflix-card-link { gap: 7px; }
  .netflix-kind-badge { top: 7px; left: 7px; padding: 4px 5px; font-size: 8px; }
  .netflix-date { gap: 5px; font-size: 9px; }
  .netflix-title { font-size: 15px; }
  .netflix-artwork-arrow { right: 7px; bottom: 7px; width: 26px; height: 26px; }
}
@container (max-width: 260px) { .netflix-grid { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .netflix-card { animation: none; }
  .netflix-artwork img, .netflix-artwork-arrow { transition: none; }
}
@keyframes netflix-card-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
