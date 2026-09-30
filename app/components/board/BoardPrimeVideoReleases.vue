<script setup lang="ts">
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import type { PrimeVideoReleasesResult, PrimeVideoRelease } from '~~/shared/utils/primeVideoReleases'

const props = withDefaults(defineProps<{ expanded?: boolean }>(), { expanded: false })
const body = ref<HTMLElement>()
const measurement = ref<HTMLUListElement>()
const expanded = computed(() => props.expanded)
const failedArtwork = ref(new Set<string>())
const { value, loading, error, refresh } = useBoardSource<PrimeVideoReleasesResult>(
  () => 'prime-video-releases:fr:v4',
  () => $fetch('/api/sources/prime-video-releases', { cache: 'no-store' }),
)
const releases = computed(() => value.value?.releases ?? [])
const { capacity } = useBoardVisibleItemCount(body, measurement, expanded, 44)
const previewReleases = computed(() => releases.value.slice(0, Math.min(16, Math.max(1, capacity.value))))

function markArtworkFailed(key: string) {
  failedArtwork.value = new Set(failedArtwork.value).add(key)
}

function hasArtwork(release: PrimeVideoRelease) {
  return Boolean(release.imageUrl && !failedArtwork.value.has(release.key))
}

function initials(title: string) {
  return title.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('fr')
}
</script>

<template>
  <section ref="body" class="prime-widget" :class="{ expanded }" :aria-busy="loading">
    <div class="prime-scroll">
      <p v-if="loading && !releases.length" class="prime-state" role="status">Chargement du calendrier Prime Video…</p>
      <p v-else-if="error && !releases.length" class="prime-state" role="alert">Calendrier indisponible. <button type="button" @click="() => refresh()">Réessayer</button></p>
      <p v-else-if="!releases.length" class="prime-state">Aucune sortie française datée à venir dans le calendrier Prime Video.</p>
      <ul v-else class="prime-grid">
        <li v-for="(release, index) in expanded ? releases : previewReleases" :key="release.key" class="prime-card" :style="{ '--card-index': index }">
          <a :href="release.url" target="_blank" rel="noopener noreferrer" class="prime-card-link" :aria-label="`${release.title}, ${release.dateLabel}, ${release.offer} — ouvrir sur Prime Video`">
            <span class="prime-artwork" :class="{ 'artwork-fallback': !hasArtwork(release) }">
              <img
                v-if="hasArtwork(release)"
                :src="release.imageUrl"
                :alt="`Visuel de ${release.title}`"
                loading="lazy"
                decoding="async"
                @error="markArtworkFailed(release.key)"
              >
              <span v-else class="prime-fallback-mark" aria-hidden="true">{{ initials(release.title) }}</span>
              <span class="prime-offer-badge">{{ release.offer }}</span>
              <span class="prime-artwork-arrow i-ph-arrow-up-right-bold" aria-hidden="true" />
            </span>
            <span class="prime-date"><span class="i-ph-calendar-dots" aria-hidden="true" />{{ release.dateLabel }}</span>
            <span class="prime-title">{{ release.title }}</span>
          </a>
        </li>
      </ul>
      <ul v-if="!expanded && releases.length" ref="measurement" class="prime-grid prime-measure" aria-hidden="true" inert>
        <li v-for="release in releases" :key="release.key" class="prime-card">
          <span class="prime-artwork" />
          <span class="prime-date"><span class="i-ph-calendar-dots" aria-hidden="true" />{{ release.dateLabel }}</span>
          <span class="prime-title">{{ release.title }}</span>
        </li>
      </ul>
    </div>
    <footer class="prime-footer">
      <span>Sorties annoncées · Prime Video France</span>
      <a :href="value?.sourceUrl ?? 'https://www.createprimevideo.amazon/fr_fr/releaseCalendar'" target="_blank" rel="noopener noreferrer">Source ↗</a>
    </footer>
  </section>
</template>

<style scoped>
.prime-widget { display: flex; height: 100%; min-height: 0; flex-direction: column; color: #e3e0e7; }
.prime-scroll { position: relative; min-height: 0; flex: 1; overflow: hidden; container-type: inline-size; }
.prime-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); align-content: start; gap: 20px 16px; list-style: none; margin: 0; padding: 16px 14px 20px; }
.prime-card { min-width: 0; animation: prime-card-enter 340ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(min(var(--card-index), 10) * 35ms); }
.prime-card-link { display: grid; min-width: 0; grid-template-rows: auto auto 1fr; gap: 9px; color: inherit; text-decoration: none; }
.prime-artwork { position: relative; display: grid; overflow: hidden; max-height: 42vh; aspect-ratio: 16 / 9; align-items: center; justify-items: center; border-radius: 9px; background: linear-gradient(145deg, #263347, #211e27 68%); box-shadow: 0 5px 16px rgb(0 0 0 / 22%); isolation: isolate; }
.prime-artwork::after { position: absolute; z-index: 0; inset: 35% 0 0; background: linear-gradient(transparent, rgb(12 10 13 / 64%)); content: ''; pointer-events: none; }
.prime-artwork img { width: 100%; height: 100%; object-fit: cover; transition: transform 450ms cubic-bezier(.2,.75,.25,1), filter 300ms ease; }
.prime-card-link:hover .prime-artwork img, .prime-card-link:focus-visible .prime-artwork img { transform: scale(1.035); }
.prime-artwork.artwork-fallback { background: radial-gradient(ellipse at 50% 36%, #34475b, #29232d 70%); }
.prime-fallback-mark { color: rgb(129 192 226 / 82%); font: 500 clamp(42px, 6vw, 88px)/1 Georgia, serif; letter-spacing: -.06em; }
.prime-offer-badge { position: absolute; z-index: 1; top: 10px; left: 10px; max-width: calc(100% - 20px); overflow: hidden; padding: 5px 7px; border-radius: 3px; background: rgb(20 17 21 / 76%); color: #c7dff0; font: 9px/1.2 system-ui, sans-serif; letter-spacing: .055em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.prime-artwork-arrow { position: absolute; z-index: 1; right: 10px; bottom: 10px; display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: #8ec9ef; color: #17222b; font-size: 14px; opacity: 0; transform: translateY(3px); transition: opacity 160ms ease, transform 160ms ease; }
.prime-card-link:hover .prime-artwork-arrow, .prime-card-link:focus-visible .prime-artwork-arrow { opacity: 1; transform: translateY(0); }
.prime-date { display: flex; min-width: 0; align-items: center; gap: 7px; color: #c2c9d3; font: 10px/1.35 system-ui, sans-serif; letter-spacing: .055em; text-transform: uppercase; }
.prime-date > span { flex: 0 0 auto; color: #8ec9ef; font-size: 12px; }
.prime-title { display: -webkit-box; overflow: hidden; color: #e3d3a0; font: 500 17px/1.2 Georgia, serif; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.prime-card-link:hover .prime-title { color: #eee6c6; }
.prime-card-link:focus-visible { border-radius: 9px; outline: 2px solid #e6cd84; outline-offset: 4px; }
.prime-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.prime-state { margin: 0; padding: 24px 14px; color: #aaa7b2; font-size: 12px; }
.prime-state button { border: 0; background: transparent; color: #e4ce8b; font: inherit; cursor: pointer; }
.prime-footer { display: flex; flex: 0 0 auto; justify-content: space-between; gap: 12px; padding: 10px 14px 12px; color: #898691; font-size: 10px; }
.prime-footer a { color: #aaa7b2; text-decoration: none; }
.prime-footer a:hover { color: #8ec9ef; }
.expanded { height: auto; min-height: 0; flex: 0 0 auto; }
.expanded .prime-scroll { min-height: 0; flex: 0 0 auto; overflow: visible; }
.expanded .prime-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 205px), 1fr)); gap: 28px 22px; padding: 8px 4px 24px; }
.expanded .prime-artwork { max-height: none; aspect-ratio: 16 / 9; }
.expanded .prime-date { font-size: 11px; }
.expanded .prime-title { font-size: 19px; }
@container (min-width: 860px) { .prime-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@container (min-width: 1500px) { .prime-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
@container (max-width: 520px) {
  .prime-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px 11px; padding: 12px 9px 16px; }
  .prime-card-link { gap: 7px; }
  .prime-offer-badge { top: 7px; left: 7px; padding: 4px 5px; font-size: 8px; }
  .prime-date { gap: 5px; font-size: 9px; }
  .prime-title { font-size: 15px; }
  .prime-artwork-arrow { right: 7px; bottom: 7px; width: 26px; height: 26px; }
}
@container (max-width: 260px) { .prime-grid { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .prime-card { animation: none; }
  .prime-artwork img, .prime-artwork-arrow { transition: none; }
}
@keyframes prime-card-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
