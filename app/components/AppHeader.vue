<template>
  <header class="border-b border-primary bg-secondary">
    <div class="mx-auto max-w-7xl px-3 md:px-4">
      <div class="flex items-center gap-4 md:gap-8">
        <NuxtLink to="/" class="text-base md:text-lg font-bold text-primary py-2.5 md:py-3">
          V
        </NuxtLink>

        <nav class="flex gap-4 md:gap-6">
          <NuxtLink
            to="/"
            class="text-xs md:text-sm font-medium text-muted hover:text-primary py-2.5 md:py-3 border-b-2 border-accent transition-colors"
          >
            {{ store.title }}
          </NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-1 md:gap-2">
          <button
            class="px-2 py-1.5 md:px-3 md:py-1.5 rounded text-xs font-medium transition-colors"
            :class="editor.isEditing ? 'bg-accent text-accent-text' : 'text-muted hover:text-primary hover:bg-tertiary'"
            @click="editor.toggleEdit()"
            title="Toggle edit mode"
          >
            {{ editor.isEditing ? 'Editing' : 'Edit' }}
          </button>
          <button
            class="p-1.5 md:p-2 rounded transition-colors hover:bg-tertiary text-muted hover:text-primary text-xs"
            title="Import YAML config"
            @click="emit('import')"
          >
            <svg class="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span class="hidden md:inline">Import</span>
          </button>
          <button
            class="p-1.5 md:p-2 rounded transition-colors hover:bg-tertiary text-muted hover:text-primary text-xs"
            title="Export YAML config"
            @click="emit('export')"
          >
            <svg class="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 4v11" />
            </svg>
            <span class="hidden md:inline">Export</span>
          </button>
          <button
            class="p-1.5 md:p-2 rounded transition-colors hover:bg-tertiary text-muted hover:text-primary"
            @click="toggleTheme"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!isDark" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()
const store = useDashboardStore()
const editor = useEditorStore()

const emit = defineEmits<{
  import: []
  export: []
}>()
</script>
