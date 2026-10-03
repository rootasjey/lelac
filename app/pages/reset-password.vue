<template><AuthPanel mode="reset" :token="token" /></template>

<script setup lang="ts">
const route = useRoute()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')

definePageMeta({
  pageTransition: { name: 'auth-route', mode: 'out-in', appear: true },
})
</script>
