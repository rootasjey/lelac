// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-21',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@unocss/nuxt', '@una-ui/nuxt'],
  nitro: { preset: 'cloudflare-module' },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
    storageKey: 'encascade-color-mode',
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  css: ['~/assets/css/main.css'],
  
  app: {
    head: {
      title: 'Encascade',
      meta: [
        { name: 'description', content: 'Vos sources, organisées en tableaux personnalisables' },
      ],
    },
  },
})
