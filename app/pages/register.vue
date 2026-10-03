<template><AuthPanel mode="register" /></template>

<script setup lang="ts">
definePageMeta({
  pageTransition: { name: 'auth-route', mode: 'out-in', appear: true },
})
</script>
