<script setup lang="ts">
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import type { DisneyPlusAnnouncementsResult, DisneyPlusAnnouncement } from '~~/shared/utils/disneyPlusAnnouncements'

const props = withDefaults(defineProps<{ expanded?: boolean }>(), { expanded: false })
const body = ref<HTMLElement>()
const measurement = ref<HTMLUListElement>()
const expanded = computed(() => props.expanded)
const failedArtwork = ref(new Set<string>())
const { value, loading, error, refresh } = useBoardSource<DisneyPlusAnnouncementsResult>(
  () => 'disney-plus-announcements:fr:v2',
  () => $fetch('/api/sources/disney-plus-announcements', { cache: 'no-store' }),
)
const announcements = computed(() => value.value?.announcements ?? [])
const { capacity } = useBoardVisibleItemCount(body, measurement, expanded, 44)
const previewAnnouncements = computed(() => announcements.value.slice(0, Math.min(12, Math.max(1, capacity.value))))

function markArtworkFailed(key: string) {
  failedArtwork.value = new Set(failedArtwork.value).add(key)
}

function hasArtwork(announcement: DisneyPlusAnnouncement) {
  return Boolean(announcement.imageUrl && !failedArtwork.value.has(announcement.key))
}

function initials(title: string) {
  return title.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('fr')
}
</script>

<template>
  <section ref="body" class="disney-news-widget" :class="{ expanded }" :aria-busy="loading">
    <div class="disney-news-scroll">
      <p v-if="loading && !announcements.length" class="disney-news-state" role="status">Chargement des annonces Disney+…</p>
      <p v-else-if="error && !announcements.length" class="disney-news-state" role="alert">Les annonces Disney+ sont indisponibles. <button type="button" @click="() => refresh()">Réessayer</button></p>
      <p v-else-if="!announcements.length" class="disney-news-state">Aucune sortie à venir avec une date annoncée dans les actualités Disney+.</p>
      <ul v-else class="disney-news-grid">
        <li v-for="(announcement, index) in expanded ? announcements : previewAnnouncements" :key="announcement.key" class="disney-news-card" :style="{ '--card-index': index }">
          <a :href="announcement.url" target="_blank" rel="noopener noreferrer" class="disney-news-link" :aria-label="`${announcement.title}, sortie annoncée le ${announcement.dateLabel} — lire l’annonce Disney+`">
            <span class="disney-news-artwork" :class="{ 'artwork-fallback': !hasArtwork(announcement) }">
              <img
                v-if="hasArtwork(announcement)"
                :src="announcement.imageUrl"
                :alt="`Visuel de ${announcement.title}`"
                loading="lazy"
                decoding="async"
                @error="markArtworkFailed(announcement.key)"
              >
              <span v-else class="disney-news-fallback" aria-hidden="true">{{ initials(announcement.title) }}</span>
              <span class="disney-news-kind">{{ announcement.kind }}</span>
              <span class="disney-news-arrow i-ph-arrow-up-right-bold" aria-hidden="true" />
            </span>
            <span class="disney-news-date"><span class="i-ph-calendar-dots" aria-hidden="true" />Sortie annoncée · {{ announcement.dateLabel }}</span>
            <span class="disney-news-title">{{ announcement.title }}</span>
            <span v-if="announcement.description" class="disney-news-description">{{ announcement.description }}</span>
            <span v-else class="disney-news-description disney-news-description-empty">Lire l’annonce officielle et ses détails sur le site Disney France.</span>
          </a>
        </li>
      </ul>
      <ul v-if="!expanded && announcements.length" ref="measurement" class="disney-news-grid disney-news-measure" aria-hidden="true" inert>
        <li v-for="announcement in announcements" :key="announcement.key" class="disney-news-card">
          <span class="disney-news-artwork" />
          <span class="disney-news-date">Sortie annoncée · {{ announcement.dateLabel }}</span>
          <span class="disney-news-title">{{ announcement.title }}</span>
          <span class="disney-news-description">{{ announcement.description || 'Lire l’annonce officielle sur le site Disney France.' }}</span>
        </li>
      </ul>
    </div>
    <footer class="disney-news-footer">
      <span>Annonces de sorties · Disney+ France</span>
      <a :href="value?.sourceUrl ?? 'https://newsroom.disney.fr/disney+.html'" target="_blank" rel="noopener noreferrer">Source ↗</a>
    </footer>
  </section>
</template>

<style scoped>
.disney-news-widget { display: flex; height: 100%; min-height: 0; flex-direction: column; color: var(--board-text); }
.disney-news-scroll { position: relative; min-height: 0; flex: 1; overflow: hidden; container-type: inline-size; }
.disney-news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr)); align-content: start; gap: 22px 17px; list-style: none; margin: 0; padding: 16px 14px 20px; }
.disney-news-card { min-width: 0; animation: disney-news-card-enter 340ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(min(var(--card-index), 10) * 35ms); }
.disney-news-link { display: grid; min-width: 0; grid-template-rows: auto auto auto 1fr; gap: 8px; color: inherit; text-decoration: none; }
.disney-news-artwork { position: relative; display: grid; overflow: hidden; max-height: 42vh; aspect-ratio: 16 / 9; align-items: center; justify-items: center; border-radius: 9px; background: linear-gradient(145deg, #172d53, #1e1b27 75%); box-shadow: 0 5px 16px rgb(0 0 0 / 22%); isolation: isolate; }
.disney-news-artwork::after { position: absolute; z-index: 0; inset: 40% 0 0; background: linear-gradient(transparent, rgb(7 10 20 / 55%)); content: ''; pointer-events: none; }
.disney-news-artwork img { width: 100%; height: 100%; object-fit: cover; transition: transform 450ms cubic-bezier(.2,.75,.25,1), filter 300ms ease; }
.disney-news-link:hover .disney-news-artwork img, .disney-news-link:focus-visible .disney-news-artwork img { transform: scale(1.035); }
.disney-news-artwork.artwork-fallback { background: radial-gradient(ellipse at 50% 36%, #244f91, #201c2b 72%); }
.disney-news-fallback { color: rgb(166 204 255 / 82%); font: 500 clamp(42px, 6vw, 88px)/1 Georgia, serif; letter-spacing: -.06em; }
.disney-news-kind { position: absolute; z-index: 1; top: 9px; left: 9px; max-width: calc(100% - 18px); overflow: hidden; padding: 5px 7px; border-radius: 3px; background: rgb(11 17 30 / 78%); color: #c4ddff; font: 9px/1.2 system-ui, sans-serif; letter-spacing: .07em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.disney-news-arrow { position: absolute; z-index: 1; right: 9px; bottom: 9px; display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: #91bfff; color: #101a2c; font-size: 13px; opacity: 0; transform: translateY(3px); transition: opacity 160ms ease, transform 160ms ease; }
.disney-news-link:hover .disney-news-arrow, .disney-news-link:focus-visible .disney-news-arrow { opacity: 1; transform: translateY(0); }
.disney-news-date { display: flex; min-width: 0; align-items: center; gap: 6px; color: #abcaf1; font: 10px/1.35 system-ui, sans-serif; letter-spacing: .035em; }
.disney-news-date > span { flex: 0 0 auto; color: #91bfff; font-size: 12px; }
.disney-news-title { display: -webkit-box; overflow: hidden; color: var(--board-accent-soft); font: 500 17px/1.2 Georgia, serif; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.disney-news-link:hover .disney-news-title { color: var(--board-accent-soft); }
.disney-news-description { display: -webkit-box; overflow: hidden; color: var(--board-text-muted); font: 12px/1.45 system-ui, sans-serif; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.disney-news-description-empty { color: var(--board-text-dim); }
.disney-news-link:focus-visible { border-radius: 9px; outline: 2px solid #91bfff; outline-offset: 4px; }
.disney-news-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.disney-news-state { margin: 0; padding: 24px 14px; color: var(--board-text-muted); font-size: 12px; }
.disney-news-state button { border: 0; background: transparent; color: #c1d9fb; font: inherit; cursor: pointer; }
.disney-news-footer { display: flex; flex: 0 0 auto; justify-content: space-between; gap: 12px; padding: 10px 14px 12px; color: var(--board-text-dim); font-size: 10px; }
.disney-news-footer a { color: var(--board-text-muted); text-decoration: none; }
.disney-news-footer a:hover { color: #a9cbfb; }
.expanded { height: auto; min-height: 0; flex: 0 0 auto; }
.expanded .disney-news-scroll { min-height: 0; flex: 0 0 auto; overflow: visible; }
.expanded .disney-news-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); gap: 28px 22px; padding: 8px 4px 24px; }
.expanded .disney-news-artwork { max-height: none; }
.expanded .disney-news-date { font-size: 11px; }
.expanded .disney-news-title { font-size: 19px; }
.expanded .disney-news-description { font-size: 13px; }
@container (min-width: 860px) { .disney-news-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@container (min-width: 1500px) { .disney-news-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@container (max-width: 520px) {
  .disney-news-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px 11px; padding: 12px 9px 16px; }
  .disney-news-link { gap: 7px; }
  .disney-news-kind { top: 7px; left: 7px; padding: 4px 5px; font-size: 8px; }
  .disney-news-date { gap: 5px; font-size: 9px; }
  .disney-news-title { font-size: 15px; }
  .disney-news-description { font-size: 11px; }
  .disney-news-arrow { right: 7px; bottom: 7px; width: 26px; height: 26px; }
}
@container (max-width: 260px) { .disney-news-grid { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) {
  .disney-news-card { animation: none; }
  .disney-news-artwork img, .disney-news-arrow { transition: none; }
}
@keyframes disney-news-card-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
