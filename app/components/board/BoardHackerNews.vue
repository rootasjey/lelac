<template>
  <div class="hacker-news" :class="{ expanded }" :aria-busy="loading">
    <div class="hacker-news-body">
      <p v-if="loading && !stories.length" class="feed-state" role="status">Chargement de Hacker News…</p>
      <p v-else-if="error && !stories.length" class="feed-state" role="alert">
        Hacker News indisponible. <button type="button" @click="retry">Réessayer</button>
      </p>
      <p v-else-if="!loading && !stories.length" class="feed-state">Aucune actualité à afficher.</p>
      <ol v-else class="story-list">
        <li v-for="(story, index) in visibleStories" :key="story.id">
          <span class="story-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="story-copy">
            <h3><a :href="story.url || `https://news.ycombinator.com/item?id=${story.id}`" target="_blank" rel="noopener noreferrer">{{ story.title }}</a></h3>
            <p class="story-meta">{{ relativeDate(story.publishedAt) }} · {{ story.points }} points · {{ story.comments }} commentaires · {{ story.source }}</p>
          </div>
        </li>
      </ol>
    </div>
    <p v-if="error && stories.length" class="stale" role="status">Actualisation impossible · dernières actualités conservées.</p>
    <footer v-if="!expanded">
      <button class="more-button" type="button" :disabled="loading || !stories.length || visibleStories.length === stories.length" @click="emit('more')">
        {{ stories.length > visibleStories.length ? `Voir les ${stories.length - visibleStories.length} autres` : 'Tout est affiché' }}
        <span class="more-arrow" aria-hidden="true">↗</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { HackerNewsResult } from '~~/shared/utils/hackerNews'
import { useBoardSource } from '~/composables/useBoardSource'

const props = withDefaults(defineProps<{ expanded?: boolean }>(), { expanded: false })
const emit = defineEmits<{ more: [] }>()
const { value, loading, error, refresh } = useBoardSource<HackerNewsResult>('hacker-news', () => $fetch<HackerNewsResult>('/api/sources/hacker-news'))
const stories = computed(() => value.value?.stories ?? [])
const visibleStories = computed(() => props.expanded ? stories.value : stories.value.slice(0, 5))

function relativeDate(value: string) {
  if (!value) return 'date inconnue'
  const date = new Date(value)
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000))
  if (minutes < 60) return `il y a ${minutes || 1} min`
  if (minutes < 1_440) return `il y a ${Math.floor(minutes / 60)} h`
  if (minutes < 10_080) return `il y a ${Math.floor(minutes / 1_440)} j`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function retry() { void refresh() }
</script>

<style scoped>
.hacker-news { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.hacker-news-body { flex: 1; min-height: 0; overflow: hidden; }
.story-list { list-style: none; margin: 0; padding: 0; }
.story-list li { display: flex; align-items: stretch; gap: 14px; min-width: 0; padding: 12px 0; border-bottom: 1px solid #29292e; }
.story-list li:last-child { border-bottom: 0; }
.story-index { display: flex; flex: 0 0 32px; align-items: center; color: #aaa7b2; font-size: 18px; font-weight: 500; letter-spacing: .04em; line-height: 1; }
.story-copy { min-width: 0; overflow: hidden; }
h3 { display: -webkit-box; overflow: hidden; margin: 0; color: #d8c58f; font-size: 14px; font-weight: 500; line-height: 20px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
h3 a { color: inherit; text-decoration: none; }
h3 a:hover { text-decoration: underline; }
h3 a:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.story-meta { overflow: hidden; margin: 4px 0 0; color: #85838d; font-size: 10px; line-height: 14px; text-overflow: ellipsis; white-space: nowrap; }
.feed-state { margin: 0; padding: 18px 0; color: #aaa7b2; font-size: 11px; line-height: 1.6; }
.feed-state[role='alert'] { color: #e6a19c; }
.feed-state button { min-height: 40px; margin-left: 4px; border: 0; background: none; color: #d8c58f; font: inherit; cursor: pointer; }
.stale { flex: 0 0 auto; margin: 0; padding: 4px 0; color: #d8c58f; font-size: 10px; }
footer { display: flex; flex: 0 0 44px; align-items: center; justify-content: space-between; border-top: 1px solid #29292e; }
.more-button { min-height: 40px; border: 0; background: none; color: #aaa7b2; cursor: pointer; font: inherit; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
.more-button:hover:not(:disabled) { color: #d8c58f; }
.more-button:disabled { color: #96939c; cursor: default; }
.more-button:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.more-arrow { margin-left: 4px; color: #d8c58f; }
.expanded { height: auto; }
.expanded .hacker-news-body { overflow: visible; }
.expanded footer { display: none; }
</style>
