import type { Ref } from 'vue'
import { countFittingItems } from '~~/shared/utils/widgetCapacity'

export function useBoardVisibleItemCount(
  body: Ref<HTMLElement | undefined>,
  measurement: Ref<HTMLElement | undefined>,
  expanded: Ref<boolean>,
  bottomInset = 0,
) {
  const capacity = ref(0)
  let observer: ResizeObserver | undefined

  function measure() {
    if (expanded.value) return
    const bodyElement = body.value
    const measurementElement = measurement.value
    if (!bodyElement || !measurementElement) return

    const bottom = bodyElement.getBoundingClientRect().bottom - bottomInset
    const itemBottoms = Array.from(measurementElement.children, child => child.getBoundingClientRect().bottom)
    capacity.value = countFittingItems(bottom, itemBottoms)
  }

  function observeElements() {
    if (!observer) return
    if (body.value) observer.observe(body.value)
    if (measurement.value) observer.observe(measurement.value)
  }

  onMounted(() => {
    observer = new ResizeObserver(() => measure())
    observeElements()
    void nextTick(measure)
  })

  onUpdated(() => {
    observeElements()
    void nextTick(measure)
  })

  watch([body, measurement, expanded], () => {
    void nextTick(measure)
  }, { flush: 'post' })

  onBeforeUnmount(() => observer?.disconnect())

  return { capacity, measure }
}
