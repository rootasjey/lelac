<script setup lang="ts">
const route = useRoute()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
</script>
<template><AuthPanel mode="reset" :token="token" /></template>
