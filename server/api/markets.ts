const names: Record<string, string> = {
  'SPY': 'S&P 500', 'BTC-USD': 'Bitcoin', 'NVDA': 'NVIDIA',
  'AAPL': 'Apple', 'MSFT': 'Microsoft', 'GOOGL': 'Google', 'AMD': 'AMD',
}

const demoSparklines: Record<string, string> = {
  'SPY': '0,12 10,10 20,14 30,11 40,13 50,9 60,12',
  'BTC-USD': '0,12 10,16 20,18 30,14 40,20 50,17 60,15',
  'NVDA': '0,12 10,8 20,10 30,6 40,4 50,7 60,5',
  'AAPL': '0,12 10,11 20,13 30,12 40,10 50,11 60,12',
  'MSFT': '0,12 10,10 20,9 30,11 40,8 50,10 60,9',
  'GOOGL': '0,12 10,13 20,11 30,14 40,12 50,15 60,13',
  'AMD': '0,12 10,9 20,7 30,10 40,6 50,8 60,7',
}

const demoPrices: Record<string, { price: number; change: number }> = {
  'SPY': { price: 543.21, change: 0.45 },
  'BTC-USD': { price: 68432, change: 2.15 },
  'NVDA': { price: 1284.37, change: -0.82 },
  'AAPL': { price: 219.86, change: 1.24 },
  'MSFT': { price: 458.19, change: 0.63 },
  'GOOGL': { price: 183.42, change: -0.31 },
  'AMD': { price: 167.94, change: -1.56 },
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const symbols = ((query.symbols as string) || 'SPY,BTC-USD,NVDA,AAPL,MSFT,GOOGL,AMD').split(',')

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        })

        clearTimeout(timeout)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const r = data?.chart?.result?.[0]
        if (!r) throw new Error('No data')

        const quote = r.indicators?.quote?.[0]
        const closes = quote?.close?.filter((v: number | null) => v !== null) || []
        if (closes.length < 2) throw new Error('Not enough data')

        const cur = r.meta?.regularMarketPrice ?? closes[closes.length - 1]
        const prev = r.meta?.chartPreviousClose ?? closes[0]
        const change = ((cur - prev) / prev) * 100
        const min = Math.min(...closes)
        const max = Math.max(...closes)
        const range = max - min || 1
        const sparkline = closes.map((v: number, i: number) => {
          const x = Math.round((i / Math.max(closes.length - 1, 1)) * 60)
          const y = Math.round(24 - ((v - min) / range) * 20)
          return `${x},${Math.max(2, Math.min(22, y))}`
        }).join(' ')

        return { symbol, name: names[symbol] || symbol, price: cur, change, sparkline }
      } catch (e: any) {
        clearTimeout(timeout)
        const demo = demoPrices[symbol]
        if (demo) {
          return {
            symbol,
            name: names[symbol] || symbol,
            price: demo.price,
            change: demo.change,
            sparkline: demoSparklines[symbol] || '0,12 60,12',
          }
        }
        throw new Error(`${symbol}: ${e?.message || e}`)
      }
    })
  )

  const stocks = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(r => r.value)

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message || String(r.reason))

  if (stocks.length === 0) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to fetch any market data',
      data: { errors },
    })
  }

  return { stocks, errors }
})
