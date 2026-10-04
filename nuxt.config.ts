// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-21',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@unocss/nuxt', '@una-ui/nuxt', 'nuxt-auth-utils'],
  nitro: { preset: 'cloudflare-module' },
  runtimeConfig: {
    session: {
      name: 'lelac-session',
    },
    youtubeApiKey: '',
    openrouterApiKey: '',
    public: {
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION ?? 'dev',
      appUrl: process.env.NUXT_PUBLIC_APP_URL ?? '',
    },
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
    storageKey: 'lelac-color-mode',
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  css: ['~/assets/css/main.css'],
  
  app: {
    head: {
      title: 'Le Lac',
      meta: [
        { name: 'description', content: 'Composez votre quotidien en réunissant actualités, vidéos et informations dans des tableaux personnalisés.' },
      ],
    },
  },
})
