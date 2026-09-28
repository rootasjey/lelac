<script setup lang="ts">
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import type { CinemaReleaseResult } from '~~/shared/utils/cinema'

const props = withDefaults(defineProps<{ expanded?: boolean }>(), { expanded: false })
const body = ref<HTMLElement>()
const measurement = ref<HTMLUListElement>()
const expanded = computed(() => props.expanded)
const { value, loading, error, refresh } = useBoardSource<CinemaReleaseResult>(
  () => 'cinema-releases:v1',
  () => $fetch('/api/sources/cinema-releases'),
)
const releases = computed(() => value.value?.releases ?? [])
const { capacity } = useBoardVisibleItemCount(body, measurement, expanded, 52)
const previewReleases = computed(() => releases.value.slice(0, Math.min(6, Math.max(1, capacity.value))))
const dateLabel = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(value))
</script>

<template>
  <section ref="body" class="release-widget" :class="{ expanded }" :aria-busy="loading">
    <div class="release-scroll">
      <p v-if="loading && !releases.length" class="release-state" role="status">Chargement des films à venir…</p>
      <p v-else-if="error && !releases.length" class="release-state" role="alert">Programmation indisponible. <button type="button" @click="() => refresh()">Réessayer</button></p>
      <p v-else-if="!releases.length" class="release-state">Aucun film programmé dans le réseau SCARE dans les 90 prochains jours.</p>
      <ul v-else class="release-grid" :class="{ 'all-releases': expanded }">
        <li v-for="(release, index) in expanded ? releases : previewReleases" :key="release.key" class="release-card" :style="{ '--card-index': index }">
          <div class="release-poster">
            <img v-if="release.poster" :src="release.poster" :alt="`Affiche de ${release.title}`" loading="lazy">
            <span v-else class="release-poster-fallback i-ph-film-strip" aria-hidden="true" />
          </div>
          <div class="release-copy">
            <p class="release-date"><span class="i-ph-calendar-dots" aria-hidden="true" />{{ dateLabel(release.firstScreeningAt) }}</p>
            <h3>{{ release.title }}</h3>
            <p class="release-meta">{{ [release.genre, release.durationMinutes ? `${release.durationMinutes} min` : ''].filter(Boolean).join(' · ') || 'Séance à venir' }}</p>
          </div>
        </li>
      </ul>
      <ul v-if="!expanded && releases.length" ref="measurement" class="release-grid release-measure" aria-hidden="true" inert>
        <li v-for="release in releases" :key="release.key" class="release-card">
          <div class="release-poster" />
          <div class="release-copy">
            <p class="release-date">{{ dateLabel(release.firstScreeningAt) }}</p>
            <h3>{{ release.title }}</h3>
            <p class="release-meta">{{ [release.genre, release.durationMinutes ? `${release.durationMinutes} min` : ''].filter(Boolean).join(' · ') || 'Séance à venir' }}</p>
          </div>
        </li>
      </ul>
    </div>
    <footer class="release-footer">Prochaine séance repérée · Réseau SCARE</footer>
  </section>
</template>

<style scoped>
.release-widget { position: relative; display: flex; height: 100%; min-height: 0; flex-direction: column; color: #e3e0e7; }
.release-scroll { position: relative; min-height: 0; flex: 1; overflow: hidden; container-type: inline-size; }
.release-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 118px), 1fr)); align-content: start; gap: 18px 14px; list-style: none; margin: 0; padding: 12px 4px 18px; }
.release-card { min-width: 0; animation: release-enter 320ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(min(var(--card-index), 8) * 35ms); }
.release-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.release-poster { position: relative; overflow: hidden; width: 100%; aspect-ratio: 2 / 3; border-radius: 9px; background: #27252d; }
.release-poster img { display: block; width: 100%; height: 100%; object-fit: cover; }
.release-poster-fallback { display: grid; position: absolute; inset: 0; place-items: center; color: #898592; font-size: 26px; }
.release-copy { padding: 9px 2px 0; }
.release-date { display: flex; align-items: center; gap: 5px; margin: 0 0 5px; color: #e4ce8b; font-size: 10px; font-variant-numeric: tabular-nums; text-transform: uppercase; letter-spacing: .04em; }
.release-card h3 { display: -webkit-box; overflow: hidden; margin: 0; color: #e3d3a0; font: 500 14px/1.25 Georgia, serif; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.release-meta { overflow: hidden; margin: 5px 0 0; color: #92909a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.release-footer { flex: 0 0 auto; padding: 12px 12px 14px; color: #898691; font-size: 10px; }
.release-state { margin: 0; padding: 24px 8px; color: #aaa7b2; font-size: 12px; }
.release-state button { border: 0; background: transparent; color: #e4ce8b; font: inherit; cursor: pointer; }
.expanded .release-grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); gap: 24px 20px; padding: 4px; }
.expanded { height: auto; min-height: 0; flex: 0 0 auto; }
.expanded .release-scroll { min-height: 0; flex: 0 0 auto; overflow: visible; }
.expanded .release-copy { padding-top: 11px; }
.expanded .release-card h3 { font-size: 18px; }
.expanded .release-meta { font-size: 11px; }
.expanded .release-date { font-size: 11px; }
@keyframes release-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .release-card { animation: none; } }
</style>
