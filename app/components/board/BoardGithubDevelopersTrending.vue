<template>
  <div class="github-developers-trending" :class="{ expanded }" :aria-busy="loading">
    <div ref="body" class="github-developers-body">
      <p v-if="loading && !developers.length" class="feed-state" role="status">Chargement des développeurs tendance…</p>
      <p v-else-if="error && !developers.length" class="feed-state" role="alert">
        Développeurs tendance indisponibles. <button type="button" @click="retry">Réessayer</button>
      </p>
      <p v-else-if="!loading && !developers.length" class="feed-state">Aucun développeur tendance à afficher.</p>
      <ol v-else class="developer-list">
        <li v-for="(developer, index) in visibleDevelopers" :key="developer.username">
          <span class="developer-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <a class="developer-avatar-link" :href="developer.url" target="_blank" rel="noopener noreferrer" :aria-label="`Voir le profil GitHub de ${developer.displayName} (@${developer.username})`">
            <img class="developer-avatar" :src="developer.avatarUrl" alt="" loading="lazy" />
          </a>
          <div class="developer-copy">
            <h3><a class="board-link-underline" :href="developer.url" target="_blank" rel="noopener noreferrer">{{ developer.displayName }}</a></h3>
            <p class="developer-username">@{{ developer.username }}</p>
            <a v-if="developer.popularRepository" class="developer-repository board-link-underline" :href="developer.popularRepositoryUrl" target="_blank" rel="noopener noreferrer">
              <span class="repository-label">Dépôt populaire</span>
              <span class="repository-name">{{ developer.popularRepository }}</span>
              <span v-if="developer.popularRepositoryDescription" class="repository-description">{{ developer.popularRepositoryDescription }}</span>
            </a>
          </div>
        </li>
      </ol>
      <ol v-if="!expanded && developers.length" ref="measurement" class="developer-list developer-measure" aria-hidden="true" inert>
        <li v-for="(developer, index) in developers" :key="developer.username">
          <span class="developer-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="developer-avatar" />
          <div class="developer-copy">
            <h3>{{ developer.displayName }}</h3>
            <p class="developer-username">@{{ developer.username }}</p>
            <div v-if="developer.popularRepository" class="developer-repository">
              <span class="repository-label">Dépôt populaire</span>
              <span class="repository-name">{{ developer.popularRepository }}</span>
              <span v-if="developer.popularRepositoryDescription" class="repository-description">{{ developer.popularRepositoryDescription }}</span>
            </div>
          </div>
        </li>
      </ol>
    </div>
    <p v-if="error && developers.length" class="stale" role="status">Actualisation impossible · dernières tendances conservées.</p>
    <footer v-if="!expanded">
      <button class="more-button" type="button" :disabled="loading || !developers.length || visibleDevelopers.length === developers.length" @click="emit('more')">
        {{ developers.length > visibleDevelopers.length ? `Voir les ${developers.length - visibleDevelopers.length} autres` : 'Tout est affiché' }}
        <span class="more-arrow" aria-hidden="true">↗</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { GitHubTrendingDevelopersResult, GitHubTrendingPeriod } from '~~/shared/utils/githubTrending'
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
const sourceKey = computed(() => `github-trending-developers:${props.period}:${props.language}`)
const { value, loading, error, refresh } = useBoardSource<GitHubTrendingDevelopersResult>(
  sourceKey,
  () => $fetch<GitHubTrendingDevelopersResult>('/api/sources/github-trending-developers', { query: { period: props.period, language: props.language || undefined } }),
)
const developers = computed(() => value.value?.developers ?? [])
const visibleDevelopers = computed(() => props.expanded ? developers.value : developers.value.slice(0, capacity.value))

function retry() {
  void refresh()
}
</script>

<style scoped>
.github-developers-trending { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.github-developers-body { position: relative; box-sizing: border-box; flex: 1; min-height: 0; overflow: hidden; padding: 16px; container-type: inline-size; }
.developer-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px 18px; list-style: none; margin: 0; padding: 0; }
.developer-list li { display: grid; grid-template-columns: 32px 48px minmax(0, 1fr); align-items: center; gap: 10px; min-width: 0; padding: 12px 0; }
.developer-index { display: flex; align-self: stretch; align-items: center; justify-content: flex-start; color: var(--board-text-muted); font-size: 18px; font-weight: 500; letter-spacing: .04em; line-height: 1; }
.developer-avatar-link { display: block; width: 48px; height: 48px; flex: none; border-radius: 50%; }
.developer-avatar-link:focus-visible { outline: 2px solid var(--board-accent); outline-offset: 3px; }
.developer-avatar { display: block; width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: var(--board-hover-strong); }
.developer-avatar-link:hover .developer-avatar { transform: scale(1.04); }
.developer-copy { min-width: 0; overflow: hidden; }
h3 { overflow: hidden; margin: 0; color: var(--board-accent); font-size: 14px; font-weight: 500; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
h3 a, .developer-repository { color: inherit; }
h3 a:focus-visible, .developer-repository:focus-visible { outline: 2px solid var(--board-accent); outline-offset: 2px; }
.developer-username { overflow: hidden; margin: 0; color: var(--board-text-dim); font-size: 10px; line-height: 15px; text-overflow: ellipsis; white-space: nowrap; }
.developer-repository { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 8px; margin-top: 5px; color: var(--board-text-muted); }
.repository-label { grid-column: 1 / -1; color: var(--board-text-dim); font-size: 9px; letter-spacing: .06em; text-transform: uppercase; }
.repository-name { overflow: hidden; color: var(--board-accent); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.repository-description { display: block; overflow: hidden; color: var(--board-text-dim); font-size: 10px; line-height: 14px; text-overflow: ellipsis; white-space: nowrap; }
.developer-measure { position: absolute; top: 16px; right: 16px; left: 16px; width: auto; visibility: hidden; pointer-events: none; }
.feed-state { margin: 0; padding: 18px 0; color: var(--board-text-muted); font-size: 11px; line-height: 1.6; }
.feed-state[role='alert'] { color: #e6a19c; }
.feed-state button { min-height: 40px; margin-left: 4px; border: 0; background: none; color: var(--board-accent); font: inherit; cursor: pointer; }
.stale { flex: 0 0 auto; margin: 0; padding: 4px 0; color: var(--board-accent); font-size: 10px; }
footer { display: flex; flex: 0 0 44px; align-items: center; justify-content: space-between; border-top: 1px solid var(--board-hover-strong); }
.more-button { min-height: 40px; border: 0; background: none; color: var(--board-text-muted); cursor: pointer; font: inherit; font-size: 10px; letter-spacing: .08em; text-align: left; text-transform: uppercase; }
.more-button:hover:not(:disabled) { color: var(--board-accent); }
.more-button:disabled { color: var(--board-text-muted); cursor: default; }
.more-button:focus-visible { outline: 2px solid var(--board-accent); outline-offset: 2px; }
.more-arrow { margin-left: 4px; color: var(--board-accent); }
.expanded { height: auto; }
.expanded .github-developers-body { overflow: visible; padding: 0; }
.expanded .developer-list { display: flex; flex-direction: column; gap: 0; }
.expanded footer { display: none; }
@container (max-width: 520px) {
  .developer-list { display: flex; flex-direction: column; gap: 0; }
  .developer-list li { grid-template-columns: 28px 40px minmax(0, 1fr); align-items: center; padding: 10px 0; }
  .developer-avatar-link { width: 40px; height: 40px; }
  .developer-avatar { width: 40px; height: 40px; }
}
</style>
