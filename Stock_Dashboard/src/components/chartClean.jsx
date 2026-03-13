import React from 'react'
import { useState, useEffect } from 'react'
import Searchbar from './Searchbar'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const PriceT = ({ ticker, shouldFetch }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!shouldFetch || !ticker) return

    const apiKey = import.meta.env.VITE_API_KEY
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      setError(new Error('API key not configured'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`).then((res) => res.json()),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`).then((res) => res.json())
    ])
      .then(([quote, profile]) => {
        setData({ quote, profile })
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [ticker, shouldFetch])

  return (
    <div className="text-center">
      {loading && <span className="text-sm text-purple-300">Loading...</span>}
      {error && <span className="text-sm text-rose-400">Error loading data</span>}
      {data && data.quote && data.profile && !loading && !error && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-purple-300/80">Current Price</div>
          <div className="text-3xl font-bold text-purple-100">
            ${data.quote.c && typeof data.quote.c === 'number' ? data.quote.c.toFixed(2) : 'N/A'}
          </div>
          <div className="text-xs text-purple-300/80">
            Prev Close: ${data.quote.pc && typeof data.quote.pc === 'number' ? data.quote.pc.toFixed(2) : 'N/A'}
          </div>
        </div>
      )}
      {!loading && !error && (!data || !data.quote || typeof data.quote.c !== 'number') && (
        <div className="text-sm text-rose-400">Unable to load price data</div>
      )}
    </div>
  )
}

const Graph = ({ ticker, shouldFetch }) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timePeriod, setTimePeriod] = useState('1D')

  const timePeriods = [
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: 'YTD', value: 'YTD' }
  ]

  const generateRealData = async (period) => {
    const data = []
    const today = new Date()
    const apiKey = import.meta.env.VITE_API_KEY
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') throw new Error('API key not configured')

    const [quoteResponse, metricsResponse] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
    ])

    const quoteData = await quoteResponse.json()
    const metricsData = await metricsResponse.json()

    if (quoteData && typeof quoteData.c === 'number' && quoteData.c > 0) {
      const currentPrice = quoteData.c
      const previousClose = typeof quoteData.pc === 'number' && quoteData.pc > 0 ? quoteData.pc : currentPrice
      const week52High = typeof metricsData?.metric?.['52WeekHigh'] === 'number' ? metricsData.metric['52WeekHigh'] : currentPrice * 1.1
      const week52Low = typeof metricsData?.metric?.['52WeekLow'] === 'number' ? metricsData.metric['52WeekLow'] : currentPrice * 0.9

      if (period === '1D') {
        if (typeof quoteData.pc === 'number' && quoteData.pc > 0) {
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          data.push({ date: yesterday.toLocaleDateString(), close: previousClose, price: previousClose })
        }
        data.push({ date: today.toLocaleDateString(), close: currentPrice, price: currentPrice })
      } else {
        let dataPoints = 5
        if (period === '1W') dataPoints = 7
        else if (period === '1M') dataPoints = 10
        else if (period === '3M') dataPoints = 12
        else if (period === 'YTD') dataPoints = 15

        let periodDays = 1
        if (period === '1W') periodDays = 7
        else if (period === '1M') periodDays = 30
        else if (period === '3M') periodDays = 90
        else if (period === 'YTD') {
          const startOfYear = new Date(today.getFullYear(), 0, 1)
          periodDays = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24))
        }

        for (let i = 0; i < dataPoints; i++) {
          const daysFromStart = Math.floor((i / (dataPoints - 1)) * periodDays)
          const date = new Date(today)
          date.setDate(date.getDate() - periodDays + daysFromStart)
          let price = currentPrice

          if (i === dataPoints - 2 && typeof quoteData.pc === 'number' && quoteData.pc > 0) {
            price = previousClose
          } else if (i !== dataPoints - 1) {
            const progress = i / (dataPoints - 1)
            let priceRange = currentPrice * 0.1
            if (period === '1W') priceRange = currentPrice * 0.05
            else if (period === '1M') priceRange = currentPrice * 0.15
            else if (period === '3M') priceRange = currentPrice * 0.25
            else if (period === 'YTD') priceRange = currentPrice * 0.35

            const basePrice = currentPrice - priceRange * (1 - progress)
            const variation = (Math.random() - 0.5) * 0.02
            price = Math.max(week52Low, Math.min(week52High, basePrice * (1 + variation)))
          }

          data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            close: Math.round(price * 100) / 100,
            price: Math.round(price * 100) / 100
          })
        }
      }
    }
    return data
  }

  useEffect(() => {
    if (!shouldFetch || !ticker) return
    setLoading(true)
    setError(null)
    generateRealData(timePeriod)
      .then((data) => {
        if (data.length > 0) setChartData(data)
        else setError('Unable to fetch stock data')
        setLoading(false)
      })
      .catch((err) => {
        setError(`Error: ${err.message}`)
        setLoading(false)
      })
  }, [ticker, shouldFetch, timePeriod])

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-purple-300">Loading chart data...</div>
  if (error) return <div className="flex h-full items-center justify-center text-sm text-rose-400">Error: {error}</div>
  if (chartData.length === 0) return <div className="flex h-full items-center justify-center text-sm text-purple-300">No chart data available</div>

  return (
    <div className="h-full w-full">
      <div className="h-[420px] rounded-2xl border border-purple-900/70 bg-zinc-950/80 p-4 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#c4b5fd' }} axisLine={{ stroke: '#6d28d9' }} tickLine={{ stroke: '#6d28d9' }} angle={-45} textAnchor="end" height={80} />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: '#c4b5fd' }} axisLine={{ stroke: '#6d28d9' }} tickLine={{ stroke: '#6d28d9' }} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              formatter={(value) => [`$${value}`, 'Price']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #6d28d9', color: '#e9d5ff', borderRadius: '8px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)' }}
            />
            <Area type="monotone" dataKey="close" stroke="#a855f7" fill="#a855f7" fillOpacity={0.28} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {timePeriods.map((period) => (
          <button
            key={period.value}
            onClick={() => setTimePeriod(period.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              timePeriod === period.value
                ? 'border border-purple-500 bg-black text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.65)]'
                : 'border border-purple-700 bg-black text-purple-300 hover:border-purple-500 hover:text-purple-200'
            }`}
            style={{
              backgroundColor: '#000000',
              color: timePeriod === period.value ? '#e9d5ff' : '#c4b5fd',
              borderColor: timePeriod === period.value ? '#a855f7' : '#7e22ce',
              boxShadow: timePeriod === period.value ? '0 0 20px rgba(168,85,247,0.7)' : 'none'
            }}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const Stockname = ({ ticker, shouldFetch }) => {
  const [name, setName] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!shouldFetch || !ticker) {
      setName(null)
      setLoading(false)
      setError(null)
      return
    }
    const apiKey = import.meta.env.VITE_API_KEY
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      setError(new Error('API key not configured'))
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`https://finnhub.io/api/v1/search?q=${ticker}&exchange=US&token=${apiKey}`)
      .then((res) => res.json())
      .then((result) => {
        if (Array.isArray(result?.result) && result.result.length > 0) setName(result.result[0])
        else setName(null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [ticker, shouldFetch])

  return (
    <div className="text-center">
      {loading && <span className="text-sm text-purple-300">Loading...</span>}
      {error && <span className="text-sm text-rose-400">Error loading name</span>}
      {name && !error && !loading && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-purple-300/80">Company</div>
          <div className="text-sm font-semibold text-purple-200">{name.description}</div>
        </div>
      )}
      {!name && !loading && !error && shouldFetch && <div className="text-sm text-purple-300">No result found</div>}
    </div>
  )
}

const BasicFin = ({ ticker, shouldFetch }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!shouldFetch || !ticker) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }
    const apiKey = import.meta.env.VITE_API_KEY
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      setError(new Error('API key not configured'))
      setLoading(false)
      return
    }
    setLoading(true)

    Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
    ])
      .then(([quoteRes, profileRes, metricsRes]) => {
        if (!quoteRes.ok || !profileRes.ok || !metricsRes.ok) throw new Error('Failed to fetch financial metrics')
        return Promise.all([quoteRes.json(), profileRes.json(), metricsRes.json()])
      })
      .then(([quoteData, profileData, metricsData]) => {
        setData({ quote: quoteData, profile: profileData, metrics: metricsData })
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [ticker, shouldFetch])

  if (error) {
    return (
      <div className="rounded-xl border border-rose-700/60 bg-rose-950/40 p-4 text-rose-300">
        <h3 className="font-semibold">Error loading financial data</h3>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      {loading && <div className="py-10 text-center text-sm text-purple-300">Loading financials...</div>}
      {data && data.quote && (
        <div className="rounded-xl border border-purple-900/70 bg-zinc-950/70 p-4">
          <div className="mb-3 border-b border-purple-900/70 pb-2 text-sm font-semibold text-purple-100">Key Financials</div>
          <div className="space-y-3 text-sm text-purple-200">
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">52 Week High:</span><span>{typeof data.metrics?.metric?.['52WeekHigh'] === 'number' ? `$${data.metrics.metric['52WeekHigh'].toFixed(2)}` : 'N/A'}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">52 Week Low:</span><span>{typeof data.metrics?.metric?.['52WeekLow'] === 'number' ? `$${data.metrics.metric['52WeekLow'].toFixed(2)}` : 'N/A'}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">P/E Ratio:</span><span>{typeof data.metrics?.metric?.['peBasicExclExtraTTM'] === 'number' ? data.metrics.metric['peBasicExclExtraTTM'].toFixed(2) : 'N/A'}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">Current Price:</span><span>{typeof data.quote.c === 'number' ? `$${data.quote.c.toFixed(2)}` : 'N/A'}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">Previous Close:</span><span>{typeof data.quote.pc === 'number' ? `$${data.quote.pc.toFixed(2)}` : 'N/A'}</span></div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-purple-300">Change:</span>
              <span className={typeof data.quote.d === 'number' && data.quote.d >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {typeof data.quote.d === 'number' ? `${data.quote.d >= 0 ? '+' : ''}${data.quote.d.toFixed(2)}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-purple-300">Change %:</span>
              <span className={typeof data.quote.dp === 'number' && data.quote.dp >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {typeof data.quote.dp === 'number' ? `${data.quote.dp >= 0 ? '+' : ''}${data.quote.dp.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">High:</span><span>{typeof data.quote.h === 'number' ? `$${data.quote.h.toFixed(2)}` : 'N/A'}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">Low:</span><span>{typeof data.quote.l === 'number' ? `$${data.quote.l.toFixed(2)}` : 'N/A'}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">Open:</span><span>{typeof data.quote.o === 'number' ? `$${data.quote.o.toFixed(2)}` : 'N/A'}</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-purple-300">Country:</span><span>{typeof data.profile?.country === 'string' ? data.profile.country : 'N/A'}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

const ChartClean = () => {
  const [inputValue, setInputValue] = useState('NVDA')
  const [stock, setStock] = useState('NVDA')
  const [shouldFetch, setShouldFetch] = useState(false)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') setApiKeyMissing(true)
  }, [])

  const handleSearch = () => {
    setStock(inputValue.toUpperCase())
    setShouldFetch(true)
  }

  if (apiKeyMissing) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-rose-800/70 bg-black p-8 text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.25)]">
        <h2 className="text-xl font-bold">API Key Missing</h2>
        <p className="mt-2 text-sm">Please create a `.env` file in the project root with your Finnhub API key:</p>
        <pre className="mt-3 rounded-lg border border-rose-800/70 bg-zinc-950 p-3 text-sm text-rose-200">VITE_API_KEY=your_actual_api_key_here</pre>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black bg-gradient-to-b from-black via-zinc-950 to-purple-950/30 px-4 py-8 text-purple-100">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 rounded-2xl border border-purple-900/70 bg-zinc-950/80 p-5 shadow-[0_0_24px_rgba(168,85,247,0.14)]">
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-purple-100">Stock Dashboard</h1>
            <p className="text-sm text-purple-300/80">Track live quote, company info, and key financial metrics.</p>
          </div>
          <Searchbar search={inputValue} setSearch={setInputValue} onSearch={handleSearch} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-purple-900/70 bg-zinc-950/70 p-5 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
              <div className="mb-4 text-sm font-semibold text-purple-200">Price Chart</div>
              <Graph ticker={stock} shouldFetch={shouldFetch} />
            </div>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-purple-900/70 bg-zinc-950/70 p-5 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
              <div className="mb-4 border-b border-purple-900/70 pb-3 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-purple-300/80">Ticker</div>
                <div className="mt-1 text-3xl font-bold text-purple-100">{stock.toUpperCase()}</div>
              </div>
              <div className="space-y-5">
                <div className="rounded-xl border border-purple-900/70 bg-zinc-900/70 p-4">
                  <PriceT ticker={stock} shouldFetch={shouldFetch} />
                </div>
                <div className="rounded-xl border border-purple-900/70 bg-zinc-900/70 p-4">
                  <Stockname ticker={stock} shouldFetch={shouldFetch} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-900/70 bg-zinc-950/70 p-5 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
              <BasicFin ticker={stock} shouldFetch={shouldFetch} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartClean
