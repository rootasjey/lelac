<script setup lang="ts">
type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

const props = defineProps<{ mode: AuthMode; token?: string }>()
const route = useRoute()
const session = useUserSession()
const email = ref('')
const password = ref('')
const passwordRepeat = ref('')
const pending = ref(false)
const errorMessage = ref('')
const statusMessage = ref('')
const completed = ref(false)
const showCompletionScreen = computed(() => completed.value && (props.mode === 'register' || props.mode === 'forgot' || props.mode === 'reset'))

if (props.mode === 'login' && route.query['account-deleted'] === '1') {
  statusMessage.value = 'Votre compte et ses tableaux ont été supprimés.'
}

const copy = computed(() => ({
  login: { title: 'Connexion', intro: 'Retrouvez vos tableaux dans Le Lac.', submit: 'Se connecter' },
  register: { title: 'Créer un compte', intro: 'Créez un compte pour retrouver vos tableaux partout.', submit: 'Créer mon compte' },
  forgot: { title: 'Mot de passe oublié', intro: 'Nous vous enverrons un lien pour en choisir un nouveau.', submit: 'Envoyer le lien' },
  reset: { title: 'Nouveau mot de passe', intro: 'Choisissez un nouveau mot de passe pour votre compte.', submit: 'Modifier le mot de passe' },
} as const)[props.mode])

useHead(() => ({ title: `${copy.value.title} — Le Lac` }))

async function submit() {
  errorMessage.value = ''
  statusMessage.value = ''
  if (props.mode === 'register' || props.mode === 'reset') {
    if (password.value.length < 12 || password.value.length > 128) {
      errorMessage.value = 'Le mot de passe doit contenir entre 12 et 128 caractères.'
      return
    }
    if (password.value !== passwordRepeat.value) {
      errorMessage.value = 'Les deux mots de passe ne correspondent pas.'
      return
    }
  }

  pending.value = true
  try {
    if (props.mode === 'login') {
      await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
      await session.fetch()
      const redirect = route.query.redirect
      await navigateTo(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
      return
    }
    if (props.mode === 'register') {
      const result = await $fetch<{ message: string }>('/api/auth/register', { method: 'POST', body: { email: email.value, password: password.value } })
      statusMessage.value = `${result.message} Suivez le lien reçu pour confirmer votre adresse avant de vous connecter.`
      password.value = ''
      passwordRepeat.value = ''
      completed.value = true
      return
    }
    if (props.mode === 'forgot') {
      const result = await $fetch<{ message: string }>('/api/auth/password-reset', { method: 'POST', body: { email: email.value } })
      statusMessage.value = result.message
      completed.value = true
      return
    }
    const result = await $fetch<{ message: string }>('/api/auth/password-reset/complete', { method: 'POST', body: { token: props.token, password: password.value } })
    statusMessage.value = result.message
    password.value = ''
    passwordRepeat.value = ''
    completed.value = true
  } catch (error) {
    const fetchError = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'Une erreur est survenue. Réessayez.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-shell">
      <NuxtLink to="/" class="auth-brand">Le Lac</NuxtLink>
      <section class="auth-card" aria-labelledby="auth-title">
        <p class="auth-kicker">VOTRE ESPACE PERSONNEL</p>
        <Transition name="auth-panel" mode="out-in">
          <div :key="showCompletionScreen ? 'complete' : 'form'" class="auth-panel-view">
            <template v-if="showCompletionScreen">
              <div class="auth-success-mark" aria-hidden="true">✓</div>
              <h1 id="auth-title">{{ mode === 'forgot' || mode === 'register' ? 'Vérifiez votre boîte e-mail' : 'Mot de passe modifié' }}</h1>
              <p class="auth-intro">{{ statusMessage }}</p>
              <NuxtLink to="/login" class="auth-submit auth-success-cta">{{ mode === 'reset' ? 'OK, me reconnecter' : 'Retour à la connexion' }}</NuxtLink>
            </template>
            <template v-else>
              <h1 id="auth-title">{{ copy.title }}</h1>
              <p class="auth-intro">{{ copy.intro }}</p>
              <form class="auth-form" @submit.prevent="submit">
                <label v-if="mode !== 'reset'" class="auth-field">
                  <span>Adresse e-mail</span>
                  <input v-model="email" type="email" autocomplete="email" required maxlength="254" autofocus>
                </label>
                <label v-if="mode === 'login' || mode === 'register' || mode === 'reset'" class="auth-field">
                  <span>Mot de passe</span>
                  <input v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required minlength="12" maxlength="128" :autofocus="mode === 'reset'">
                  <small v-if="mode !== 'login'">12 à 128 caractères.</small>
                </label>
                <label v-if="mode === 'register' || mode === 'reset'" class="auth-field">
                  <span>Confirmer le mot de passe</span>
                  <input v-model="passwordRepeat" type="password" autocomplete="new-password" required minlength="12" maxlength="128">
                </label>
                <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
                <p v-if="statusMessage" class="auth-status" role="status">{{ statusMessage }}</p>
                <button class="auth-submit" type="submit" :disabled="pending">{{ pending ? 'Veuillez patienter…' : copy.submit }}</button>
              </form>
            </template>
            <nav v-if="!showCompletionScreen" class="auth-links" aria-label="Options de compte">
              <NuxtLink v-if="mode === 'login'" to="/register">Créer un compte</NuxtLink>
              <NuxtLink v-if="mode === 'login'" to="/forgot-password">Mot de passe oublié ?</NuxtLink>
              <NuxtLink v-if="mode === 'register' || mode === 'forgot' || mode === 'reset'" to="/login">Retour à la connexion</NuxtLink>
            </nav>
          </div>
        </Transition>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: grid; place-items: center; padding: 28px; background: var(--board-canvas); color: var(--board-text); font: 14px/1.55 system-ui, sans-serif; }
.auth-shell { width: min(100%, 460px); }
.auth-brand { display: inline-flex; align-items: baseline; margin: 0 0 28px 4px; color: var(--board-text); font: 20px/1 'SF Mono', 'Cascadia Code', Consolas, monospace; letter-spacing: -.06em; text-decoration: none; }
.auth-card { padding: 34px; border: 1px solid var(--board-border); border-radius: 14px; background: var(--board-surface); box-shadow: 0 24px 80px #00000018; }
.auth-kicker { margin: 0 0 10px; color: var(--board-text-dim); font: 11px/1.3 'SF Mono', 'Cascadia Code', Consolas, monospace; letter-spacing: .13em; }
.auth-panel-enter-active, .auth-panel-appear-active { transition: opacity 220ms cubic-bezier(.16, 1, .3, 1), transform 220ms cubic-bezier(.16, 1, .3, 1); }
.auth-panel-leave-active { transition: opacity 120ms ease-in, transform 120ms ease-in; }
.auth-panel-enter-from, .auth-panel-appear-from { opacity: 0; transform: translateY(6px); }
.auth-panel-leave-to { opacity: 0; transform: translateY(-3px); }
h1 { margin: 0; color: var(--board-text); font: 500 34px/1.12 Georgia, serif; letter-spacing: -.02em; }
.auth-intro { margin: 10px 0 26px; color: var(--board-text-muted); font-size: 14px; }
.auth-form { display: grid; gap: 18px; }
.auth-field { display: grid; gap: 8px; color: var(--board-text-soft); font-size: 13px; }
.auth-field input { width: 100%; min-height: 44px; padding: 0 12px; border: 1px solid var(--board-border-strong); border-radius: 7px; outline: none; background: var(--board-surface-alt); color: var(--board-text); font: 14px/1.4 system-ui, sans-serif; }
.auth-field input:focus-visible { border-color: var(--board-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--board-accent) 28%, transparent); }
.auth-field small { color: var(--board-text-dim); font-size: 12px; }
.auth-error, .auth-status { margin: 0; font-size: 13px; }
.auth-error { color: #df8f87; }
.auth-status { color: var(--board-text-soft); }
.auth-submit { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; padding: 0 18px; border: 0; border-radius: 7px; background: var(--board-accent); color: var(--board-canvas); font: 600 13px/1 system-ui, sans-serif; cursor: pointer; }
.auth-submit:disabled { cursor: wait; opacity: .7; }
.auth-success-mark { display: grid; width: 42px; height: 42px; place-items: center; margin: 24px 0 16px; border: 1px solid color-mix(in srgb, var(--board-accent) 42%, transparent); border-radius: 50%; color: var(--board-accent); font-size: 20px; }
.auth-success-cta { margin-top: 2px; text-decoration: none; }
.auth-links { display: flex; justify-content: space-between; gap: 16px; margin-top: 20px; }
.auth-links a { color: var(--board-accent); font-size: 12px; text-decoration: none; }
.auth-links a:hover { text-decoration: underline; }
@media (max-width: 520px) { .auth-page { padding: 18px; } .auth-card { padding: 25px 21px; } .auth-links { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) {
  .auth-panel-enter-active, .auth-panel-leave-active, .auth-panel-appear-active { transition-duration: 1ms; }
  .auth-panel-enter-from, .auth-panel-leave-to, .auth-panel-appear-from { transform: none; }
}
</style>
