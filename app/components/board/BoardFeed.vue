<script setup lang="ts">
import type { FeedResult } from '~~/shared/utils/feed'
import { useBoardSource } from '~/composables/useBoardSource'
const props = defineProps<{ feedUrl: string; expanded?: boolean }>()
const emit = defineEmits<{ more: [] }>()
const body = ref<HTMLElement>()
const measurement = ref<HTMLOListElement>()
const capacity = ref(0)
let observer: ResizeObserver | undefined
const { value, loading, error, refresh } = useBoardSource<FeedResult>(() => `rss:${props.feedUrl}`, () => $fetch('/api/sources/rss', { query: { url: props.feedUrl } }))
const articles = computed(() => value.value?.articles ?? [])
function dateLabel(date: string) { return date ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(date)) : '' }
function measure() {
  if (!body.value || !measurement.value || props.expanded) return
  const available = body.value.clientHeight
  let used = 0
  let count = 0
  for (const row of measurement.value.children) {
    used += row.getBoundingClientRect().height
    if (used > available) break
    count++
  }
  capacity.value = count
}
watch(articles, () => nextTick(measure), { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(measure)
  if (body.value) observer.observe(body.value)
  if (measurement.value) observer.observe(measurement.value)
})
onBeforeUnmount(() => { observer?.disconnect() })
const visible = computed(() => props.expanded ? articles.value : articles.value.slice(0, capacity.value))
</script>
<template>
  <div class="feed" :class="{ expanded }" :aria-busy="loading">
    <div ref="body" class="feed-body">
      <p v-if="loading && !articles.length" class="feed-state" role="status">Chargement des actualités…</p>
      <p v-else-if="error && !articles.length" class="feed-state" role="alert">Flux indisponible. Vérifiez son adresse dans les réglages. <button @click="refresh()">Réessayer</button></p>
      <p v-else-if="!loading && !articles.length" class="feed-state">Ce flux ne contient aucun article.</p>
      <ol v-else class="visible-articles">
        <li v-for="(article, index) in visible" :key="article.title">
          <span class="article-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div><h3><a :href="article.link" target="_blank" rel="noopener noreferrer">{{ article.title }}</a></h3><p>{{ article.source }} <span v-if="article.date">· {{ dateLabel(article.date) }}</span></p></div>
        </li>
      </ol>
      <ol v-if="!expanded" ref="measurement" class="feed-measure" aria-hidden="true" inert>
        <li v-for="(article, index) in articles" :key="article.title">
          <span class="article-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div><h3>{{ article.title }}</h3><p>{{ article.source }} <span v-if="article.date">· {{ dateLabel(article.date) }}</span></p></div>
        </li>
      </ol>
    </div>
    <p v-if="error && articles.length" class="stale" role="status">Actualisation impossible · derniers articles conservés.</p>
    <footer v-if="!expanded">
      <button class="more-button" :disabled="loading || !articles.length || visible.length === articles.length" @click="emit('more')">{{ articles.length > visible.length ? `Voir les ${articles.length - visible.length} autres` : 'Tout est affiché' }} <span class="more-arrow" aria-hidden="true">↗</span></button>
    </footer>
  </div>
</template>
<style scoped>
.feed { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.feed-body { position: relative; flex: 1; min-height: 0; overflow: hidden; }
ol { list-style: none; margin: 0; padding: 0; }
li { padding: 12px 0; display: flex; gap: 14px; align-items: center; border-bottom: 1px solid #29292e; box-sizing: border-box; }
li:last-child { border-bottom: 0; }
li > div { min-width: 0; overflow-wrap: anywhere; }
.article-index { font-size: 11px; color: #85838d; align-self: flex-start; padding-top: 2px; }
h3 { margin: 0; font-size: 14px; font-weight: 500; line-height: 20px; color: #d8c58f; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
p { margin: 4px 0 0; font-size: 11px; line-height: 16px; color: #aaa7b2; }
h3 a { color: inherit; text-decoration: none; }
h3 a:hover { text-decoration: underline; }
h3 a:focus-visible { outline: 2px solid #d8c58f; outline-offset: -2px; }
.stale { flex: 0 0 auto; padding: 4px 0; color: #d8c58f; }
p span { color: #85838d; }
footer { display: flex; justify-content: space-between; align-items: center; flex: 0 0 44px; border-top: 1px solid #29292e; }
button { background: none; color: #d8c58f; border: 0; cursor: pointer; min-height: 40px; text-align: left; font: inherit; font-size: 11px; }
button:disabled { color: #96939c; cursor: default; }
button:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.more-button { color: #aaa7b2; text-transform: uppercase; letter-spacing: .08em; font-size: 10px; }
.more-button:hover:not(:disabled) { color: #d8c58f; }
.more-arrow { color: #d8c58f; margin-left: 4px; }
.feed-measure { position: absolute; top: 0; left: 0; width: 100%; visibility: hidden; pointer-events: none; }
.expanded { height: auto; }
.expanded h3 { display: block; overflow: visible; -webkit-line-clamp: unset; }
.expanded .feed-body { overflow: visible; }
.feed-state { padding: 18px 0; }
</style>
