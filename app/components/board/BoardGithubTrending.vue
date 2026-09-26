<template>
  <div class="github-trending" :class="{ expanded }" :aria-busy="loading">
    <div ref="body" class="github-trending-body">
      <p v-if="loading && !repositories.length" class="feed-state" role="status">Chargement des tendances GitHub…</p>
      <p v-else-if="error && !repositories.length" class="feed-state" role="alert">
        Tendances GitHub indisponibles. <button type="button" @click="retry">Réessayer</button>
      </p>
      <p v-else-if="!loading && !repositories.length" class="feed-state">Aucun dépôt tendance à afficher.</p>
      <ol v-else class="repository-list">
        <li v-for="(repository, index) in visibleRepositories" :key="repository.fullName">
          <span class="repository-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="repository-copy">
            <h3><a class="board-link-underline" :href="repository.url" target="_blank" rel="noopener noreferrer">{{ repository.fullName }}</a></h3>
            <p v-if="repository.description" class="repository-description">{{ repository.description }}</p>
            <p class="repository-meta">
              <span v-if="repository.language">{{ repository.language }}</span>
              <span v-if="repository.language" aria-hidden="true">·</span>
              <span>{{ compactNumber(repository.stars) }} ★</span>
              <span aria-hidden="true">·</span>
              <span>+{{ compactNumber(repository.starsPeriod) }} {{ periodLabel }}</span>
            </p>
          </div>
        </li>
      </ol>
      <ol v-if="!expanded && repositories.length" ref="measurement" class="repository-list repository-measure" aria-hidden="true" inert>
        <li v-for="(repository, index) in repositories" :key="repository.fullName">
          <span class="repository-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="repository-copy">
            <h3>{{ repository.fullName }}</h3>
            <p v-if="repository.description" class="repository-description">{{ repository.description }}</p>
            <p class="repository-meta">
              <span v-if="repository.language">{{ repository.language }} ·</span>
              <span>{{ compactNumber(repository.stars) }} ★ · +{{ compactNumber(repository.starsPeriod) }} {{ periodLabel }}</span>
            </p>
          </div>
        </li>
      </ol>
    </div>
    <p v-if="error && repositories.length" class="stale" role="status">Actualisation impossible · dernières tendances conservées.</p>
    <footer v-if="!expanded">
      <button class="more-button" type="button" :disabled="loading || !repositories.length || visibleRepositories.length === repositories.length" @click="emit('more')">
        {{ repositories.length > visibleRepositories.length ? `Voir les ${repositories.length - visibleRepositories.length} autres` : 'Tout est affiché' }}
        <span class="more-arrow" aria-hidden="true">↗</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { GitHubTrendingPeriod, GitHubTrendingResult } from '~~/shared/utils/githubTrending'
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import { useBoardSource } from '~/composables/useBoardSource'

const props = withDefaults(defineProps<{
  period?: GitHubTrendingPeriod
  language?: string
  expanded?: boolean
}>(), { period: 'daily', language: '', expanded: false })

const emit = defineEmits<{ more: [] }>()
const body = ref<HTMLElement>()
const measurement = ref<HTMLOListElement>()
const expanded = computed(() => props.expanded ?? false)
const { capacity } = useBoardVisibleItemCount(body, measurement, expanded)
const sourceKey = computed(() => `github-trending:${props.period}:${props.language}`)
const { value, loading, error, refresh } = useBoardSource<GitHubTrendingResult>(
  sourceKey,
  () => $fetch<GitHubTrendingResult>('/api/sources/github-trending', { query: { period: props.period, language: props.language || undefined } }),
)
const repositories = computed(() => value.value?.repositories ?? [])
const visibleRepositories = computed(() => props.expanded ? repositories.value : repositories.value.slice(0, capacity.value))
const periodLabel = computed(() => ({ daily: 'aujourd’hui', weekly: 'cette semaine', monthly: 'ce mois-ci' })[props.period])

function compactNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function retry() {
  void refresh()
}
</script>

<style scoped>
.github-trending { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.github-trending-body { position: relative; flex: 1; min-height: 0; overflow: hidden; container-type: inline-size; }
.repository-list { list-style: none; margin: 0; padding: 0; }
.repository-list li { display: flex; align-items: stretch; gap: 14px; min-width: 0; padding: 12px 0; border-bottom: 1px solid #29292e; }
.repository-list li:last-child { border-bottom: 0; }
.repository-index { display: flex; flex: 0 0 32px; align-items: center; justify-content: flex-start; color: #aaa7b2; font-size: 18px; font-weight: 500; letter-spacing: .04em; line-height: 1; }
.repository-copy { min-width: 0; overflow: hidden; }
h3 { overflow: hidden; margin: 0; color: #d8c58f; font-size: 14px; font-weight: 500; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
h3 a { color: inherit; }
h3 a:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.repository-description { display: -webkit-box; overflow: hidden; margin: 3px 0 0; color: #aaa7b2; font-size: 11px; line-height: 16px; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.repository-meta { display: flex; min-width: 0; gap: 5px; overflow: hidden; margin: 4px 0 0; color: #85838d; font-size: 10px; line-height: 14px; white-space: nowrap; }
.repository-measure { position: absolute; inset: 0 auto auto 0; width: 100%; visibility: hidden; pointer-events: none; }
.feed-state { margin: 0; padding: 18px 0; color: #aaa7b2; font-size: 11px; line-height: 1.6; }
.feed-state[role='alert'] { color: #e6a19c; }
.feed-state button { min-height: 40px; margin-left: 4px; border: 0; background: none; color: #d8c58f; font: inherit; cursor: pointer; }
.stale { flex: 0 0 auto; margin: 0; padding: 4px 0; color: #d8c58f; font-size: 10px; }
footer { display: flex; flex: 0 0 44px; align-items: center; justify-content: space-between; border-top: 1px solid #29292e; }
.more-button { min-height: 40px; border: 0; background: none; color: #aaa7b2; cursor: pointer; font: inherit; font-size: 10px; letter-spacing: .08em; text-align: left; text-transform: uppercase; }
.more-button:hover:not(:disabled) { color: #d8c58f; }
.more-button:disabled { color: #96939c; cursor: default; }
.more-button:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.more-arrow { margin-left: 4px; color: #d8c58f; }
.expanded { height: auto; }
.expanded .github-trending-body { overflow: visible; }
.expanded h3 { white-space: normal; }
.expanded .repository-description { display: block; overflow: visible; -webkit-line-clamp: unset; }
.expanded .repository-measure { display: none; }
.expanded footer { display: none; }
@container (min-width: 840px) {
  .repository-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); align-content: start; column-gap: 28px; }
  .repository-list li { display: block; min-width: 0; padding: 20px 0; border-bottom: 0; }
  .repository-index { display: block; margin-bottom: 12px; color: #85838d; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(40px, 5cqw, 76px); font-weight: 600; letter-spacing: -.04em; line-height: .85; }
  h3 { display: -webkit-box; overflow: hidden; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(17px, 1.6cqw, 22px); font-weight: 600; line-height: 1.25; text-overflow: initial; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
  .repository-description { margin-top: 8px; -webkit-line-clamp: 3; }
  .repository-meta { flex-wrap: wrap; margin-top: 10px; }
}
</style>
