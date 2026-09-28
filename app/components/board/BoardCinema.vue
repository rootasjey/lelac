<script setup lang="ts">
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import { useBoardSource } from '~/composables/useBoardSource'
import { CINEMA_SEARCH_RADIUS_KM, groupCinemaShowings, type CinemaFilmSchedule, type CinemaLocation, type CinemaScheduleResult } from '~~/shared/utils/cinema'

const props = withDefaults(defineProps<{ location: CinemaLocation; expanded?: boolean }>(), { expanded: false })
const body = ref<HTMLElement>()
const measurement = ref<HTMLOListElement>()
const filmLoadSentinel = ref<HTMLLIElement>()
const bodyWidth = ref(0)
const firstRowCapacity = ref(1)
const activeSlide = ref(0)
const expandedBatchSize = 24
const expandedVisibleCount = ref(expandedBatchSize)
const expanded = computed(() => props.expanded)
const { capacity, measure } = useBoardVisibleItemCount(body, measurement, expanded)
const { value, loading, error, refresh } = useBoardSource<CinemaScheduleResult>(
  () => `cinema:v4:${props.location.inseeCode}:${props.location.lat.toFixed(4)}:${props.location.lon.toFixed(4)}`,
  () => $fetch('/api/sources/cinema', { query: props.location }),
  { skipNuxtCache: true },
)

const films = computed(() => groupCinemaShowings(value.value?.showings ?? []))
const expandedFilms = computed(() => films.value.slice(0, expandedVisibleCount.value))
const carousel = computed(() => !expanded.value && bodyWidth.value > 0 && bodyWidth.value < 490)
const horizontalGrid = computed(() => !expanded.value && bodyWidth.value >= 490 && bodyWidth.value < 900)
const posterGrid = computed(() => !expanded.value && bodyWidth.value >= 900)
const visible = computed(() => expanded.value || carousel.value
  ? films.value
  : films.value.slice(0, Math.max(1, capacity.value, firstRowCapacity.value)))
const locationName = computed(() => props.location.name)

let bodyResizeObserver: ResizeObserver | undefined
let filmLoadObserver: IntersectionObserver | undefined
let scrollFrame = 0

onMounted(() => {
  if (!body.value) return
  bodyWidth.value = body.value.clientWidth
  bodyResizeObserver = new ResizeObserver(([entry]) => {
    bodyWidth.value = entry?.contentRect.width ?? body.value?.clientWidth ?? 0
  })
  bodyResizeObserver.observe(body.value)
  if (expanded.value && typeof IntersectionObserver !== 'undefined') {
    filmLoadObserver = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || expandedVisibleCount.value >= films.value.length) return
      filmLoadObserver?.unobserve(entry.target)
      expandedVisibleCount.value = Math.min(expandedVisibleCount.value + expandedBatchSize, films.value.length)
      void nextTick(observeFilmSentinel)
    }, {
      root: body.value.closest('.widget-detail-scroll'),
      rootMargin: '700px 0px',
    })
    observeFilmSentinel()
  }
  void nextTick(measureGridCapacity)
})

onBeforeUnmount(() => {
  bodyResizeObserver?.disconnect()
  filmLoadObserver?.disconnect()
  cancelAnimationFrame(scrollFrame)
})

watch([() => films.value.length, expandedVisibleCount], () => nextTick(observeFilmSentinel), { flush: 'post' })

watch(() => films.value.length, (length) => {
  activeSlide.value = Math.min(activeSlide.value, Math.max(0, length - 1))
})

watch(carousel, (isCarousel) => {
  activeSlide.value = 0
  if (isCarousel) nextTick(() => body.value?.scrollTo({ left: 0 }))
})

watch([bodyWidth, horizontalGrid, posterGrid, () => films.value.length], () => {
  void nextTick(() => {
    measure()
    measureGridCapacity()
  })
}, { flush: 'post' })

function measureGridCapacity() {
  const cards = Array.from(measurement.value?.children ?? [])
  if ((!horizontalGrid.value && !posterGrid.value) || !cards.length) {
    firstRowCapacity.value = 1
    return
  }

  const firstRowTop = cards[0]?.getBoundingClientRect().top
  if (firstRowTop === undefined) return
  firstRowCapacity.value = cards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstRowTop) <= 1).length
}

function observeFilmSentinel() {
  const sentinel = filmLoadSentinel.value
  if (!expanded.value || !sentinel || expandedVisibleCount.value >= films.value.length) return
  filmLoadObserver?.observe(sentinel)
}

function dayLabel(value: string) {
  const date = new Date(value)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(date, today)) return 'Aujourd’hui'
  if (sameDay(date, tomorrow)) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function bookingUrl(film: CinemaFilmSchedule) {
  return film.showings.find(showing => showing.bookingUrl)?.bookingUrl
}

function showingSummary(film: CinemaFilmSchedule) {
  const venueLabel = `${film.venues.length} ${film.venues.length > 1 ? 'cinémas' : 'cinéma'}`
  const showingLabel = `${film.showings.length} ${film.showings.length > 1 ? 'séances' : 'séance'}`
  return `${venueLabel} · ${showingLabel}`
}

function goToSlide(index: number) {
  const clampedIndex = Math.max(0, Math.min(index, films.value.length - 1))
  activeSlide.value = clampedIndex
  const element = body.value
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  element?.scrollTo({ left: clampedIndex * (element.clientWidth || 0), behavior })
}

function syncActiveSlide() {
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    const element = body.value
    if (!element || !element.clientWidth) return
    activeSlide.value = Math.max(0, Math.min(Math.round(element.scrollLeft / element.clientWidth), films.value.length - 1))
  })
}
</script>

<template>
  <div class="cinema" :class="{ expanded, 'cinema-carousel': carousel, 'cinema-grid-horizontal': horizontalGrid, 'cinema-poster-grid': posterGrid }" :aria-busy="loading">
    <div ref="body" class="cinema-body" @scroll.passive="carousel && syncActiveSlide()">
      <p v-if="loading && !films.length" class="cinema-state" role="status">Chargement des séances…</p>
      <p v-else-if="error && !films.length" class="cinema-state" role="alert">
        Programmation indisponible. <button type="button" @click="refresh()">Réessayer</button>
      </p>
      <p v-else-if="!loading && !films.length" class="cinema-state">Aucune séance à venir trouvée dans un rayon de {{ CINEMA_SEARCH_RADIUS_KM }} km autour de {{ locationName }}.</p>
      <ol v-else class="cinema-list">
        <li v-for="(film, filmIndex) in expanded ? expandedFilms : visible" :key="film.key" class="film-card" :class="{ 'film-card-expanded': expanded }" :style="{ '--reveal-index': Math.min(filmIndex, 12) }">
          <a v-if="film.poster && bookingUrl(film)" class="poster-link" :href="bookingUrl(film)" target="_blank" rel="noopener noreferrer" :aria-label="`Réserver ${film.filmTitle}`">
            <img :src="film.poster" :alt="`Affiche de ${film.filmTitle}`" loading="lazy">
            <span class="poster-arrow" aria-hidden="true"><span class="poster-arrow-icon i-ph-arrow-up-right-bold" /></span>
          </a>
          <div v-else class="poster-placeholder" aria-hidden="true">
            <img v-if="film.poster" :src="film.poster" alt="" loading="lazy">
            <span v-else class="i-ph-film-reel-bold" />
          </div>

          <div class="film-copy">
            <h3>
              <a v-if="bookingUrl(film)" class="board-link-underline" :href="bookingUrl(film)" target="_blank" rel="noopener noreferrer">{{ film.filmTitle }}</a>
              <span v-else>{{ film.filmTitle }}</span>
            </h3>
            <p class="film-kicker">{{ film.genre || 'À l’affiche' }}<span v-if="film.durationMinutes"> · {{ film.durationMinutes }} min</span></p>

            <template v-if="expanded">
              <p v-if="film.director" class="film-director">{{ film.director }}</p>
              <details class="showings-details">
                <summary>{{ showingSummary(film) }} <span class="showings-toggle">Voir les séances</span></summary>
                <div class="venue-list">
                  <section v-for="venue in film.venues" :key="`${venue.cinema}:${venue.city}`" class="venue-schedule">
                    <div class="venue-heading">
                      <span>{{ venue.cinema }}</span>
                      <small>{{ venue.city }}</small>
                    </div>
                    <div class="session-list">
                      <template v-for="showing in venue.showings" :key="showing.id">
                        <a v-if="showing.bookingUrl" class="session-time" :href="showing.bookingUrl" target="_blank" rel="noopener noreferrer" :aria-label="`${film.filmTitle} à ${venue.cinema}, ${dayLabel(showing.startsAt)} à ${timeLabel(showing.startsAt)} — réserver`">
                          <time :datetime="showing.startsAt">{{ dayLabel(showing.startsAt) }} <span aria-hidden="true">·</span> {{ timeLabel(showing.startsAt) }}</time>
                        </a>
                        <span v-else class="session-time session-time-static">
                          <time :datetime="showing.startsAt">{{ dayLabel(showing.startsAt) }} <span aria-hidden="true">·</span> {{ timeLabel(showing.startsAt) }}</time>
                        </span>
                      </template>
                    </div>
                  </section>
                </div>
              </details>
            </template>

            <template v-else>
              <div v-if="film.showings[0]" class="next-showing">
                <span class="next-time"><time :datetime="film.showings[0].startsAt">{{ dayLabel(film.showings[0].startsAt) }} · {{ timeLabel(film.showings[0].startsAt) }}</time></span>
                <span class="next-venue">{{ film.showings[0].cinema }} · {{ film.showings[0].city }}</span>
              </div>
            </template>
          </div>
        </li>
        <li v-if="expanded && expandedVisibleCount < films.length" ref="filmLoadSentinel" class="cinema-load-sentinel" aria-hidden="true" />
      </ol>

      <ol v-if="!expanded" ref="measurement" class="cinema-measure" aria-hidden="true" inert>
        <li v-for="film in films" :key="film.key" class="film-card">
          <div class="poster-placeholder" />
          <div class="film-copy">
            <h3>{{ film.filmTitle }}</h3>
            <p class="film-kicker">{{ film.genre || 'À l’affiche' }}<span v-if="film.durationMinutes"> · {{ film.durationMinutes }} min</span></p>
            <div class="next-showing">
              <span class="next-time">{{ film.showings[0] ? `${dayLabel(film.showings[0].startsAt)} · ${timeLabel(film.showings[0].startsAt)}` : '' }}</span>
              <span class="next-venue">{{ film.showings[0] ? `${film.showings[0].cinema} · ${film.showings[0].city}` : '' }}</span>
            </div>
          </div>
        </li>
      </ol>
    </div>

    <nav v-if="carousel && films.length > 1" class="cinema-carousel-controls" aria-label="Navigation des films">
      <button type="button" aria-label="Film précédent" :disabled="activeSlide === 0" @click="goToSlide(activeSlide - 1)">
        <span class="i-ph-arrow-left" aria-hidden="true" />
      </button>
      <span class="carousel-position" aria-live="polite">{{ activeSlide + 1 }} <span aria-hidden="true">/</span> {{ films.length }}</span>
      <button type="button" aria-label="Film suivant" :disabled="activeSlide >= films.length - 1" @click="goToSlide(activeSlide + 1)">
        <span class="i-ph-arrow-right" aria-hidden="true" />
      </button>
    </nav>

    <p v-if="error && films.length" class="cinema-stale" role="status">Actualisation impossible · programmation précédente conservée.</p>
    <footer v-if="!expanded">
      <span class="source-label">Programmation SCARE · {{ locationName }}</span>
    </footer>
  </div>
</template>

<style scoped>
.cinema { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.cinema-body { position: relative; flex: 1; min-height: 0; overflow: hidden; container-type: inline-size; }
.cinema-list, .cinema-measure { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); align-content: start; gap: 20px clamp(16px, 2cqi, 30px); list-style: none; margin: 0; padding: 18px 4px; }
.film-card { --poster-width: clamp(64px, 8cqi, 110px); min-width: 0; display: grid; grid-template-columns: var(--poster-width) minmax(0, 1fr); align-items: start; gap: clamp(12px, 1.5cqi, 20px); padding: 9px; border-radius: 8px; background: linear-gradient(135deg, #211f27 0%, #1a191f 78%); transition: transform 180ms ease; }
.film-card:hover, .film-card:focus-within { transform: translateY(-2px); }
.poster-link, .poster-placeholder { position: relative; display: grid; flex: 0 0 var(--poster-width); width: var(--poster-width); height: auto; aspect-ratio: 2 / 3; align-self: flex-start; place-items: center; overflow: hidden; border: 0; border-radius: 7px; background: #25242b; color: #85838d; font-size: 20px; }
.poster-link:focus-visible { outline: 2px solid #d8c58f; outline-offset: 3px; }
.poster-link img, .poster-placeholder img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; transition: transform 240ms ease; }
.poster-link:hover img { transform: scale(1.025); }
.poster-arrow { position: absolute; right: 3px; bottom: 3px; box-sizing: border-box; width: 20px; height: 20px; display: grid; place-items: center; padding: 0; border-radius: 50%; background: #141418d9; color: #e8d69f; line-height: 1; opacity: 0; transition: opacity 140ms ease; }
.poster-arrow-icon { display: block; width: 11px; height: 11px; font-size: 11px; }
.poster-link:hover .poster-arrow, .poster-link:focus-visible .poster-arrow { opacity: 1; }
.film-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: flex-start; }
.film-kicker { width: 100%; overflow: hidden; margin: 5px 0 0; color: #85838d; font-size: 8px; line-height: 1.3; letter-spacing: .06em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
h3 { display: -webkit-box; overflow: hidden; margin: 0; color: #e8d69f; font-family: ui-serif, Georgia, 'Times New Roman', serif; font-size: clamp(17px, 1.45cqi, 22px); font-weight: 500; line-height: 1.2; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.film-director { overflow: hidden; width: 100%; margin: 3px 0 0; color: #85838d; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.next-showing { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; margin-top: 8px; }
.next-time { color: #e8d69f; font-size: 11px; font-weight: 500; font-variant-numeric: tabular-nums; }
.next-venue { overflow: hidden; width: 100%; color: #aaa7b2; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.showtime-static { color: #d8c58f; }
.cinema-state { margin: 0; padding: 24px 8px; color: #aaa7b2; font-size: 12px; }
.cinema-state button { min-height: 32px; border: 0; background: transparent; color: #d8c58f; font: inherit; cursor: pointer; }
.cinema-stale { margin: 0; padding: 4px 0; color: #d8c58f; font-size: 10px; }
footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex: 0 0 40px; margin-top: 8px; }
.source-label { overflow: hidden; color: #85838d; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.cinema-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.cinema-load-sentinel { grid-column: 1 / -1; height: 1px; list-style: none; }
.cinema-measure .film-card { background: transparent; }
.cinema-carousel .cinema-body { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; }
.cinema-carousel .cinema-body::-webkit-scrollbar { display: none; }
.cinema-carousel .cinema-list { display: flex; align-items: stretch; gap: 0; width: 100%; height: 100%; padding: 12px 0; }
.cinema-carousel .film-card { flex: 0 0 100%; display: grid; grid-template-columns: minmax(0, 36%) minmax(0, 1fr); align-items: center; gap: clamp(16px, 2.5cqi, 28px); min-height: 0; padding: 12px clamp(12px, 3cqi, 32px); background: transparent; scroll-snap-align: start; scroll-snap-stop: always; }
.cinema-carousel .poster-link, .cinema-carousel .poster-placeholder { flex: none; width: 100%; height: min(54vh, 440px); max-width: 100%; max-height: 100%; aspect-ratio: 2 / 3; justify-self: center; border-radius: 12px; }
.cinema-carousel .poster-link img, .cinema-carousel .poster-placeholder img { object-fit: cover; }
.cinema-carousel .film-copy { width: 100%; padding: 12px clamp(12px, 2cqi, 24px); }
.cinema-carousel h3 { font-size: clamp(20px, 2.4cqi, 30px); -webkit-line-clamp: 2; }
.cinema-carousel .film-kicker { margin-top: 7px; font-size: 9px; }
.cinema-carousel .next-showing { margin-top: 10px; }
.cinema-carousel .next-time { font-size: 14px; }
.cinema-carousel .next-venue { font-size: 10px; }
.cinema-carousel-controls { flex: 0 0 44px; display: flex; align-items: center; justify-content: center; gap: 18px; }
.cinema-carousel-controls button { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid #3a3841; border-radius: 50%; background: #211f27; color: #e8d69f; cursor: pointer; transition: background-color 140ms ease, color 140ms ease, opacity 140ms ease; }
.cinema-carousel-controls button:hover:not(:disabled) { background: #d8c58f; color: #17161b; }
.cinema-carousel-controls button:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.cinema-carousel-controls button:disabled { opacity: .35; cursor: default; }
.cinema-carousel-controls button span { font-size: 16px; }
.carousel-position { min-width: 48px; color: #aaa7b2; font-size: 11px; font-variant-numeric: tabular-nums; text-align: center; }
.cinema-grid-horizontal .cinema-list, .cinema-grid-horizontal .cinema-measure,
.cinema-poster-grid .cinema-list, .cinema-poster-grid .cinema-measure { align-items: start; gap: 18px clamp(14px, 1.8cqi, 24px); padding: 18px 10px; }
.cinema-grid-horizontal .cinema-list, .cinema-grid-horizontal .cinema-measure { grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr)); }
.cinema-poster-grid .cinema-list, .cinema-poster-grid .cinema-measure { grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); }
.cinema-grid-horizontal .film-card { display: grid; grid-template-columns: minmax(64px, 28%) minmax(0, 1fr); align-items: center; gap: clamp(10px, 1.5cqi, 16px); padding: 8px; background: transparent; }
.cinema-grid-horizontal .poster-link, .cinema-grid-horizontal .poster-placeholder { grid-column: 1; grid-row: 1; flex: none; width: 100%; height: auto; max-height: none; aspect-ratio: 2 / 3; border-radius: 8px; }
.cinema-grid-horizontal .film-copy { grid-column: 2; grid-row: 1; align-self: center; width: 100%; }
.cinema-grid-horizontal h3 { font-size: clamp(16px, 1.5cqi, 20px); -webkit-line-clamp: 2; }
.cinema-grid-horizontal .film-kicker { margin-top: 4px; font-size: 8px; }
.cinema-grid-horizontal .next-showing { margin-top: 7px; }
.cinema-grid-horizontal .next-time { font-size: 10px; }
.cinema-grid-horizontal .next-venue { white-space: normal; }
.cinema-poster-grid .film-card { display: flex; flex-direction: column; gap: 10px; padding: 0 0 8px; background: transparent; }
.cinema-poster-grid .poster-link, .cinema-poster-grid .poster-placeholder { flex: none; width: auto; height: min(40cqi, 45vh, 420px); max-width: 100%; aspect-ratio: 2 / 3; justify-self: center; border-radius: 9px; }
.cinema-poster-grid .poster-link img, .cinema-poster-grid .poster-placeholder img { object-fit: cover; }
.cinema-poster-grid .film-copy { width: 100%; }
.cinema-poster-grid h3 { font-size: clamp(17px, 1.65cqi, 22px); -webkit-line-clamp: 2; }
.cinema-poster-grid .film-kicker { margin-top: 6px; font-size: 8px; }
.cinema-poster-grid .next-showing { margin-top: 8px; }
.expanded { height: auto; }
.expanded .cinema-body { overflow: visible; }
.expanded .cinema-list { grid-template-columns: repeat(auto-fill, minmax(min(100%, 205px), 1fr)); align-items: start; gap: 30px clamp(18px, 2.2cqi, 34px); padding: 10px 4px 36px; }
.expanded .film-card { display: flex; flex-direction: column; gap: 14px; padding: 0 0 12px; animation: cinema-film-reveal 420ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(var(--reveal-index, 0) * 38ms); }
.expanded .poster-link, .expanded .poster-placeholder { flex: none; width: 100%; max-height: 350px; aspect-ratio: 2 / 3; border-radius: 9px; }
.expanded .poster-link img, .expanded .poster-placeholder img { object-fit: cover; }
.expanded .film-copy { width: 100%; }
.expanded h3 { font-size: clamp(18px, 1.45cqi, 22px); line-height: 1.16; }
.expanded .film-kicker { margin-top: 7px; font-size: 9px; }
.expanded .film-director { margin-top: 5px; font-size: 11px; }
.venue-list { display: grid; gap: 9px; width: 100%; margin-top: 10px; }
.venue-schedule { min-width: 0; padding-top: 8px; }
.venue-heading { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; color: #d8d5dc; font-size: 11px; }
.venue-heading small { overflow: hidden; color: #85838d; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.session-list { display: flex; flex-wrap: wrap; gap: 5px; }
.session-time { display: inline-flex; align-items: center; min-height: 26px; padding: 3px 7px; border: 0; border-radius: 3px; color: #aaa7b2; font-size: 10px; font-variant-numeric: tabular-nums; text-decoration: none; white-space: nowrap; transition: color 140ms ease, background-color 140ms ease; }
.session-time:hover, .session-time:focus-visible { background: #bca96f12; color: #e8d69f; }
.session-time:focus-visible { outline: 1px solid #bca96f; outline-offset: 2px; }
.session-time-static { color: #77747f; }
.showings-details { width: 100%; margin-top: 10px; }
.showings-details > summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #aaa7b2; font-size: 10px; cursor: pointer; list-style: none; }
.showings-details > summary::-webkit-details-marker { display: none; }
.showings-toggle { flex: none; color: #d8c58f; font-size: 9px; }
.showings-details[open] > summary { margin-bottom: 8px; }
.showings-details[open] .showings-toggle { font-size: 0; }
.showings-details[open] .showings-toggle::after { content: 'Masquer'; font-size: 9px; }
.showings-details:focus-within > summary { color: #e8d69f; }
@container (max-width: 600px) {
  .cinema-carousel .cinema-list { align-items: center; }
  .cinema-carousel .film-card { display: flex; flex-direction: column; align-items: stretch; align-self: center; height: max-content; padding: 8px 4px; }
  .cinema-carousel .poster-link, .cinema-carousel .poster-placeholder { flex: none; width: min(100%, calc(min(54vh, 440px) * 2 / 3)); height: min(54vh, 440px); max-height: 56%; aspect-ratio: 2 / 3; align-self: center; margin-bottom: 14px; border-radius: 12px; background: transparent; }
  .cinema-carousel .film-copy { flex: none; padding: 0 16px 4px; background: transparent; }
  .cinema-carousel h3 { font-size: clamp(19px, 5cqi, 25px); }
}
@container (min-width: 1200px) { .cinema-poster-grid .poster-link, .cinema-poster-grid .poster-placeholder { height: min(34cqi, 45vh, 420px); } }
@keyframes cinema-film-reveal { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) { .film-card, .poster-arrow, .poster-link img, .session-time, .cinema-carousel-controls button { transition: none; } .expanded .film-card { animation: none; } .film-card:hover, .film-card:focus-within { transform: none; } .cinema-carousel .cinema-body { scroll-behavior: auto; } }
</style>
