// Share each source across the widget and its full-reading dialog. Tag responses
// so a reactive source change cannot display the old city's/feed's data.
import { resolveBoardSourceValue, type BoardSourceResponse } from '~~/shared/utils/sourceState'

export function useBoardSource<T>(key: MaybeRefOrGetter<string>, fetcher: () => Promise<T>) {
  const sourceKey = computed(() => toValue(key))
  const { data, status, error, refresh } = useAsyncData<BoardSourceResponse<T>>(sourceKey, async () => {
    const requestedKey = sourceKey.value
    return { key: requestedKey, payload: await fetcher() }
  }, { server: false, deep: false, dedupe: 'defer' })
  const previous = shallowRef<BoardSourceResponse<T>>()
  watch(sourceKey, () => { previous.value = undefined }, { flush: 'sync' })
  watch(data, response => { if (response?.key === sourceKey.value) previous.value = response as BoardSourceResponse<T> }, { immediate: true })
  const value = computed(() => resolveBoardSourceValue(sourceKey.value, data.value, previous.value))
  let timer: ReturnType<typeof setInterval>
  onMounted(() => { timer = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 600_000) })
  onBeforeUnmount(() => clearInterval(timer))
  return { value, loading: computed(() => status.value === 'pending'), error, refresh }
}
