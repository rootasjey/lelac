// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@unocss/nuxt', '@una-ui/nuxt'],

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  css: ['~/assets/css/main.css'],
  
  app: {
    head: {
      title: 'Vitrine',
      meta: [
        { name: 'description', content: 'A lightweight, self-hosted dashboard' },
      ],
    },
  },
})
