export const useEditorStore = defineStore('editor', () => {
  const isEditing = ref(false)

  function toggleEdit() {
    isEditing.value = !isEditing.value
  }

  function exitEdit() {
    isEditing.value = false
  }

  return {
    isEditing,
    toggleEdit,
    exitEdit,
  }
})
