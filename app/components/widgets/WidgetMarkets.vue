<template>
  <WidgetCard title="Markets">
    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="markets-list">
      <div
        v-for="(stock, index) in stocks"
        :key="stock.symbol"
        class="market-item"
      >
        <div class="market-info">
          <div class="market-symbol">{{ stock.symbol }}</div>
          <div class="market-name">{{ stock.name }}</div>
        </div>
        <div class="market-chart">
          <svg class="market-sparkline" viewBox="0 0 60 24" preserveAspectRatio="none">
            <polyline
              :points="stock.sparkline"
              fill="none"
              :stroke="stock.change >= 0 ? 'var(--positive)' : 'var(--negative)'"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="market-price-info">
          <div
            class="market-change"
            :class="stock.change >= 0 ? 'text-positive' : 'text-negative'"
          >
            {{ stock.change >= 0 ? '+' : '' }}{{ stock.change.toFixed(2) }}%
          </div>
          <div class="market-price">${{ stock.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  sparkline: string
}

const props = withDefaults(defineProps<{
  symbols?: string[]
}>(), {
  symbols: () => ['SPY', 'BTC-USD', 'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMD']
})

const stocks = ref<Stock[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const editor = useEditorStore()

async function fetchMarkets() {
  try {
    loading.value = true
    error.value = null

    const response = await fetch(`/api/markets?symbols=${props.symbols.join(',')}`)

    if (!response.ok) {
      let detail = ''
      try {
        const err = await response.json()
        detail = err.data?.errors?.join('; ') || err.statusMessage || ''
      } catch {}
      throw new Error(detail || `HTTP ${response.status}`)
    }

    const data = await response.json()
    stocks.value = data.stocks || []
    if (data.errors?.length) {
      editor.logError('markets', 'Some symbols failed', data.errors.join(', '))
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch market data'
    error.value = 'Failed to load'
    editor.logError('markets', msg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMarkets()
})
</script>

<style scoped>
.markets-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.market-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.market-info {
  flex: 1;
  min-width: 0;
}

.market-symbol {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.market-name {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  color: var(--text-muted);
}

.market-chart {
  width: 60px;
  height: 24px;
  flex-shrink: 0;
}

.market-sparkline {
  width: 100%;
  height: 100%;
}

.market-price-info {
  text-align: right;
  flex-shrink: 0;
}

.market-change {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  font-weight: 500;
}

.market-price {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.loading,
.error {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1.5rem 0;
}

.error {
  color: var(--negative);
}
</style>
