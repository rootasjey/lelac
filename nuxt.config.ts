// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@unocss/nuxt', '@una-ui/nuxt'],
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
