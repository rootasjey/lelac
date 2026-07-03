import yaml from 'js-yaml'
import type { DashboardConfig } from '~/types/config'

const STORAGE_KEY = 'distill-config'

export function useYamlConfig() {
  const store = useDashboardStore()
  const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    toast.value = { message, type }
    setTimeout(() => { toast.value = null }, 3000)
  }

  function exportYaml(): string {
    return yaml.dump(store.config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    })
  }

  function downloadYaml(filename = 'distill-config.yaml') {
    const blob = new Blob([exportYaml()], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function validateConfig(data: unknown): data is DashboardConfig {
    if (!data || typeof data !== 'object') return false
    const cfg = data as Record<string, unknown>
    if (!Array.isArray(cfg.pages) || cfg.pages.length === 0) return false
    for (const page of cfg.pages) {
      if (!page || typeof page !== 'object') return false
      const p = page as Record<string, unknown>
      if (typeof p.name !== 'string') return false
      if (!Array.isArray(p.columns) || p.columns.length === 0) return false
      for (const col of p.columns) {
        if (!col || typeof col !== 'object') return false
        const c = col as Record<string, unknown>
        if (!['small', 'medium', 'large'].includes(c.size as string)) return false
        if (!Array.isArray(c.widgets)) return false
        for (const w of c.widgets) {
          if (!w || typeof w !== 'object') return false
          const widget = w as Record<string, unknown>
          if (typeof widget.type !== 'string') return false
          if (typeof widget.title !== 'string') return false
        }
      }
    }
    return true
  }

  function importYaml(yamlString: string): boolean {
    try {
      const data = yaml.load(yamlString)
      if (validateConfig(data)) {
        store.setConfig(data)
        showToast('Configuration imported successfully', 'success')
        return true
      }
      showToast('Invalid configuration format', 'error')
      return false
    } catch (e) {
      showToast(`Failed to parse YAML: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error')
      return false
    }
  }

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      importYaml(content)
    }
    reader.readAsText(file)
    input.value = ''
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.config))
    } catch {
      // Ignore storage errors
    }
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (validateConfig(data)) {
          store.setConfig(data)
          return true
        }
      }
    } catch {
      // Ignore storage errors
    }
    return false
  }

  return {
    toast,
    exportYaml,
    downloadYaml,
    importYaml,
    handleFileUpload,
    saveToStorage,
    loadFromStorage,
  }
}
