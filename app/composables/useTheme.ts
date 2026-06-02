import { ref, watch, onMounted } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const isDark = ref(false)
const preference = ref<Theme>('system')

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  function setTheme(theme: Theme) {
    preference.value = theme
    localStorage.setItem('vitrine-theme', theme)
    applyTheme(theme)
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  onMounted(() => {
    const saved = localStorage.getItem('vitrine-theme') as Theme | null
    preference.value = saved || 'system'
    applyTheme(preference.value)

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (preference.value === 'system') {
        applyTheme('system')
      }
    })
  })

  return {
    isDark,
    preference,
    setTheme,
    toggleTheme,
  }
}
