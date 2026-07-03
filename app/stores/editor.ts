interface WidgetError {
  widget: string
  message: string
  timestamp: number
  detail?: string
}

export const useEditorStore = defineStore('editor', () => {
  const isEditing = ref(false)
  const debugMode = ref(false)
  const errors = ref<WidgetError[]>([])

  function toggleEdit() {
    isEditing.value = !isEditing.value
  }

  function exitEdit() {
    isEditing.value = false
  }

  function logError(widget: string, message: string, detail?: string) {
    console.error(`[${widget}] ${message}`, detail || '')
    errors.value.push({ widget, message, timestamp: Date.now(), detail })
    if (errors.value.length > 50) {
      errors.value.splice(0, errors.value.length - 50)
    }
  }

  function clearErrors() {
    errors.value = []
  }

  function toggleDebug() {
    debugMode.value = !debugMode.value
  }

  return {
    isEditing,
    debugMode,
    errors,
    toggleEdit,
    exitEdit,
    logError,
    clearErrors,
    toggleDebug,
  }
})
