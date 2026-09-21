import { describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { useBoardSource } from '../app/composables/useBoardSource'

const asyncData = vi.hoisted(() => ({
  data: undefined as any,
  status: undefined as any,
  error: undefined as any,
  refresh: vi.fn(),
}))

vi.mock('#app/composables/asyncData', () => ({ useAsyncData: () => asyncData }))

describe('useBoardSource refresh state', () => {
  it('keeps the last successful payload after a failed refresh, then clears it for another source', async () => {
    const activeKey = ref('rss:https://example.org/news.xml')
    asyncData.data = ref(undefined)
    asyncData.status = ref('pending')
    asyncData.error = ref(undefined)

    let source: ReturnType<typeof useBoardSource<string[]>> | undefined
    const Probe = defineComponent({
      setup() {
        source = useBoardSource(activeKey, async () => ['unused fetcher result'])
        return () => h('div')
      },
    })
    const app = createApp(Probe)
    app.mount(document.createElement('div'))

    asyncData.data.value = { key: activeKey.value, payload: ['last good article'] }
    asyncData.status.value = 'success'
    await nextTick()
    expect(source?.value.value).toEqual(['last good article'])

    asyncData.data.value = undefined
    asyncData.error.value = new Error('upstream unavailable')
    asyncData.status.value = 'error'
    await nextTick()
    expect(source?.error.value).toBeInstanceOf(Error)
    expect(source?.value.value).toEqual(['last good article'])

    activeKey.value = 'rss:https://example.org/other.xml'
    await nextTick()
    expect(source?.value.value).toBeUndefined()
    app.unmount()
  })
})
