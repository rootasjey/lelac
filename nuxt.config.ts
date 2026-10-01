// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-21',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@unocss/nuxt', '@una-ui/nuxt'],
  nitro: { preset: 'cloudflare-module' },
  runtimeConfig: {
    youtubeApiKey: '',
    openrouterApiKey: '',
    public: {
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION ?? 'dev',
    },
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
    storageKey: 'trame-color-mode',
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  css: ['~/assets/css/main.css'],
  
  app: {
    head: {
      title: 'Trame',
      meta: [
        { name: 'description', content: 'Composez votre quotidien en réunissant actualités, vidéos et informations dans des tableaux personnalisés.' },
      ],
    },
  },
})
