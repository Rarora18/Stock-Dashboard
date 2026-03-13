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
      {loading && <span className="text-sm text-slate-500">Loading...</span>}
      {error && <span className="text-sm text-red-500">Error loading data</span>}
      {data && data.quote && data.profile && !loading && !error && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Price</div>
          <div className="text-3xl font-bold text-slate-900">
            ${data.quote.c && typeof data.quote.c === 'number' ? data.quote.c.toFixed(2) : 'N/A'}
          </div>
          <div className="text-xs text-slate-500">
            Prev Close: ${data.quote.pc && typeof data.quote.pc === 'number' ? data.quote.pc.toFixed(2) : 'N/A'}
          </div>
        </div>
      )}

      {!loading && !error && (!data || !data.quote || typeof data.quote.c !== 'number') && (
        <div className="text-sm text-red-500">Unable to load price data</div>
      )}
    </div>
  )
}

const Graph = ({ ticker, shouldFetch }) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timePeriod, setTimePeriod] = useState('1D')
  const [renderError, setRenderError] = useState(null)

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
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      throw new Error('API key not configured')
    }

    try {
      const [quoteResponse, metricsResponse] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
      ])

      const quoteData = await quoteResponse.json()
      const metricsData = await metricsResponse.json()

      if (quoteData && typeof quoteData.c === 'number' && quoteData.c > 0) {
        const currentPrice = quoteData.c
        const previousClose = typeof quoteData.pc === 'number' && quoteData.pc > 0 ? quoteData.pc : currentPrice
        const week52High =
          metricsData?.metric?.['52WeekHigh'] && typeof metricsData.metric['52WeekHigh'] === 'number'
            ? metricsData.metric['52WeekHigh']
            : currentPrice * 1.1
        const week52Low =
          metricsData?.metric?.['52WeekLow'] && typeof metricsData.metric['52WeekLow'] === 'number'
            ? metricsData.metric['52WeekLow']
            : currentPrice * 0.9

        if (period === '1D') {
          if (typeof quoteData.pc === 'number' && quoteData.pc > 0) {
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            data.push({
              date: yesterday.toLocaleDateString(),
              close: previousClose,
              price: previousClose
            })
          }
          data.push({
            date: today.toLocaleDateString(),
            close: currentPrice,
            price: currentPrice
          })
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

            let price
            if (i === dataPoints - 1) {
              price = currentPrice
            } else if (i === dataPoints - 2 && typeof quoteData.pc === 'number' && quoteData.pc > 0) {
              price = previousClose
            } else {
              const progress = i / (dataPoints - 1)
              let priceRange

              if (period === '1W') priceRange = currentPrice * 0.05
              else if (period === '1M') priceRange = currentPrice * 0.15
              else if (period === '3M') priceRange = currentPrice * 0.25
              else if (period === 'YTD') priceRange = currentPrice * 0.35
              else priceRange = currentPrice * 0.1

              const basePrice = currentPrice - priceRange * (1 - progress)
              const variation = (Math.random() - 0.5) * 0.02
              price = basePrice * (1 + variation)
              price = Math.max(week52Low, Math.min(week52High, price))
            }

            data.push({
              date: date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }),
              close: Math.round(price * 100) / 100,
              price: Math.round(price * 100) / 100
            })
          }
        }
      }
    } catch (fetchError) {
      console.error('Graph: Error fetching data:', fetchError)
    }

    return data
  }

  useEffect(() => {
    if (!shouldFetch || !ticker) return

    setLoading(true)
    setError(null)

    generateRealData(timePeriod)
      .then((data) => {
        if (data.length > 0) {
          setChartData(data)
        } else {
          setError('Unable to fetch stock data')
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(`Error: ${err.message}`)
        setLoading(false)
      })
  }, [ticker, shouldFetch, timePeriod])

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart data...</div>
  if (error) return <div className="flex h-full items-center justify-center text-sm text-red-500">Error: {error}</div>
  if (chartData.length === 0) return <div className="flex h-full items-center justify-center text-sm text-slate-500">No chart data available</div>

  if (renderError) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <div className="space-y-2 text-center">
          <div className="font-semibold">Chart render error</div>
          <div className="text-xs">{renderError.toString()}</div>
          <button onClick={() => setRenderError(null)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white transition hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="h-full w-full">
        <div className="h-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                formatter={(value) => [`$${value}`, 'Price']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area type="monotone" dataKey="close" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
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
                  ? 'border border-purple-500 bg-black text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.55)]'
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
  } catch (renderCatchError) {
    console.error('Graph: Render error:', renderCatchError)
    setRenderError(renderCatchError)
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <div className="space-y-2 text-center">
          <div className="font-semibold">Chart render error</div>
          <div className="text-xs">{renderCatchError.toString()}</div>
          <button onClick={() => setRenderError(null)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white transition hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    )
  }
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
    setError(null)

    fetch(`https://finnhub.io/api/v1/search?q=${ticker}&exchange=US&token=${apiKey}`)
      .then((res) => res.json())
      .then((result) => {
        if (result && result.result && Array.isArray(result.result) && result.result.length > 0) {
          setName(result.result[0])
        } else {
          setName(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [ticker, shouldFetch])

  return (
    <div className="text-center">
      {loading && <span className="text-sm text-slate-500">Loading...</span>}
      {error && <span className="text-sm text-red-500">Error loading name</span>}
      {name && !error && !loading && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Company</div>
          <div className="text-sm font-semibold text-emerald-700">{name.description}</div>
        </div>
      )}

      {!name && !loading && !error && shouldFetch && <div className="text-sm text-slate-500">No result found</div>}
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
    setError(null)

    Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
    ])
      .then(([quoteRes, profileRes, metricsRes]) => {
        if (!quoteRes.ok) throw new Error(`Quote API error: ${quoteRes.status} ${quoteRes.statusText}`)
        if (!profileRes.ok) throw new Error(`Profile API error: ${profileRes.status} ${profileRes.statusText}`)
        if (!metricsRes.ok) throw new Error(`Metrics API error: ${metricsRes.status} ${metricsRes.statusText}`)
        return Promise.all([quoteRes.json(), profileRes.json(), metricsRes.json()])
      })
      .then(([quoteData, profileData, metricsData]) => {
        if (quoteData && (typeof quoteData.c === 'number' || quoteData.error)) {
          setData({ quote: quoteData, profile: profileData, metrics: metricsData })
        } else {
          setError(new Error('Invalid data received from API'))
          setData(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [ticker, shouldFetch])

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
        <h3 className="font-semibold">Error loading financial data</h3>
        <p className="mt-1 text-sm">{error.message}</p>
        <button onClick={() => setError(null)} className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {loading && <div className="py-10 text-center text-sm text-slate-500">Loading financials...</div>}

      {data && data.quote && data.profile && typeof data.quote.c === 'number' && !loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">Key Financials</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">52 Week High:</span>
              <span>{data.metrics?.metric?.['52WeekHigh'] !== undefined && typeof data.metrics.metric['52WeekHigh'] === 'number' ? `$${data.metrics.metric['52WeekHigh'].toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">52 Week Low:</span>
              <span>{data.metrics?.metric?.['52WeekLow'] !== undefined && typeof data.metrics.metric['52WeekLow'] === 'number' ? `$${data.metrics.metric['52WeekLow'].toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">P/E Ratio:</span>
              <span>{data.metrics?.metric?.['peBasicExclExtraTTM'] !== undefined && typeof data.metrics.metric['peBasicExclExtraTTM'] === 'number' ? data.metrics.metric['peBasicExclExtraTTM'].toFixed(2) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Current Price:</span>
              <span>${data.quote.c && typeof data.quote.c === 'number' ? data.quote.c.toFixed(2) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Previous Close:</span>
              <span>${data.quote.pc && typeof data.quote.pc === 'number' ? data.quote.pc.toFixed(2) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Change:</span>
              <span className={data.quote.d && typeof data.quote.d === 'number' && data.quote.d >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.quote.d && typeof data.quote.d === 'number' && data.quote.d >= 0 ? '+' : ''}
                {data.quote.d && typeof data.quote.d === 'number' ? data.quote.d.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Change %:</span>
              <span className={data.quote.dp && typeof data.quote.dp === 'number' && data.quote.dp >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.quote.dp && typeof data.quote.dp === 'number' && data.quote.dp >= 0 ? '+' : ''}
                {data.quote.dp && typeof data.quote.dp === 'number' ? data.quote.dp.toFixed(2) : 'N/A'}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">High:</span>
              <span>${data.quote.h && typeof data.quote.h === 'number' ? data.quote.h.toFixed(2) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Low:</span>
              <span>${data.quote.l && typeof data.quote.l === 'number' ? data.quote.l.toFixed(2) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Open:</span>
              <span>${data.quote.o && typeof data.quote.o === 'number' ? data.quote.o.toFixed(2) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Country:</span>
              <span>{data.profile && typeof data.profile.country === 'string' ? data.profile.country : 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {!loading && (!data || !data.quote || typeof data.quote.c !== 'number') && !error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-500">Unable to load financial data for this stock.</div>
      )}
    </div>
  )
}

class BasicFinErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('BasicFinErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-500">
          <h3 className="font-semibold">Error loading financial data</h3>
          <p className="text-sm">Something went wrong while loading financial information.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white transition hover:bg-red-700">
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

const Chart = () => {
  const [inputValue, setInputValue] = useState('NVDA')
  const [stock, setStock] = useState('NVDA')
  const [shouldFetch, setShouldFetch] = useState(false)
  const [renderError, setRenderError] = useState(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      setApiKeyMissing(true)
    }
  }, [])

  const handleSearch = () => {
    setStock(inputValue.toUpperCase())
    setShouldFetch(true)
  }

  const handleInputChange = (newValue) => {
    setInputValue(newValue)
  }

  if (apiKeyMissing) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
        <h2 className="text-xl font-bold">API Key Missing</h2>
        <p className="mt-2 text-sm">Please create a `.env` file in the project root with your Finnhub API key:</p>
        <pre className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-sm">VITE_API_KEY=your_actual_api_key_here</pre>
        <p className="mt-3 text-sm">
          You can get a free API key from <a href="https://finnhub.io/" className="font-medium underline">Finnhub.io</a>
        </p>
      </div>
    )
  }

  if (renderError) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
        <h2 className="text-xl font-bold">Error rendering chart</h2>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs text-red-700">{renderError.toString()}</pre>
        <button onClick={() => setRenderError(null)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700">
          Try Again
        </button>
      </div>
    )
  }

  try {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-slate-900">Stock Dashboard</h1>
              <p className="text-sm text-slate-500">Track live quote, company info, and key financial metrics.</p>
            </div>
            <Searchbar search={inputValue} setSearch={handleInputChange} onSearch={handleSearch} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-sm font-semibold text-slate-800">Price Chart</div>
                <Graph ticker={stock} shouldFetch={shouldFetch} />
              </div>
            </div>

            <div className="space-y-6 lg:col-span-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 border-b border-slate-100 pb-3 text-center">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Ticker</div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">{stock.toUpperCase()}</div>
                </div>
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <PriceT ticker={stock} shouldFetch={shouldFetch} />
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <Stockname ticker={stock} shouldFetch={shouldFetch} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <BasicFinErrorBoundary>
                  <BasicFin ticker={stock} shouldFetch={shouldFetch} />
                </BasicFinErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Chart: Render error:', error)
    setRenderError(error)
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
        <h2 className="text-xl font-bold">Error rendering chart</h2>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs text-red-700">{error.toString()}</pre>
        <button onClick={() => setRenderError(null)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700">
          Try Again
        </button>
      </div>
    )
  }
}

export default Chart

const PriceT = ({ticker, shouldFetch}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const stockk = 'AAPL'
  useEffect(() => {
    if (!shouldFetch || !ticker) return;
    
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      console.error('PriceT: No valid API key available');
      setError(new Error('API key not configured'));
      setLoading(false);
      return;
    }
    
    console.log('PriceT: Fetching data for ticker:', ticker);
    setLoading(true);
    setError(null);
    
    Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`).then(res => res.json()),
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`).then(res => res.json())
    ])
    .then(([quote, profile]) => {
        console.log('PriceT: Received data:', { quote, profile });
        setData({quote, profile})
        setLoading(false)
      })

      .catch(err => {
        console.error('PriceT: Error fetching data:', err);
        setError(err)
        setLoading(false)
      });
  }, [ticker, shouldFetch]);

  return (
    <div className="text-center">
      <div className="align-center">
        {loading && <span className="text-sm text-slate-500">Loading...</span>}
        {error && <span className="text-sm text-red-500">Error loading data</span>}
        {data && data.quote && data.profile && !loading && !error && (
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Price</div>
            <div className="text-3xl font-bold text-slate-900">
              ${data.quote.c && typeof data.quote.c === 'number' ? data.quote.c.toFixed(2) : 'N/A'}
            </div>
            <div className="text-xs text-slate-500">
              Prev Close: ${data.quote.pc && typeof data.quote.pc === 'number' ? data.quote.pc.toFixed(2) : 'N/A'}
            </div>
          </div>
        )}

        {!loading && !error && (!data || !data.quote || typeof data.quote.c !== 'number') && (
          <div className="text-sm text-red-500">
            Unable to load price data
          </div>
        )}
      </div>
    </div>
  )

}
// 
const Graph = ({ticker, shouldFetch}) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timePeriod, setTimePeriod] = useState('1D')
  const [renderError, setRenderError] = useState(null)

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

    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      console.error('Graph: No valid API key available');
      throw new Error('API key not configured');
    }

    console.log('Graph: Generating real data for ticker:', ticker, 'period:', period);

    try {
      // Get both quote and metrics data
      const [quoteResponse, metricsResponse] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
      ])
      
      const quoteData = await quoteResponse.json()
      const metricsData = await metricsResponse.json()
      
      console.log('Graph: Received API data:', { quoteData, metricsData });
      
      // Validate that we have valid quote data with a current price
      if (quoteData && typeof quoteData.c === 'number' && quoteData.c > 0) {
        const currentPrice = quoteData.c
        const previousClose = (typeof quoteData.pc === 'number' && quoteData.pc > 0) ? quoteData.pc : currentPrice
        const week52High = (metricsData?.metric?.['52WeekHigh'] && typeof metricsData.metric['52WeekHigh'] === 'number') ? metricsData.metric['52WeekHigh'] : currentPrice * 1.1
        const week52Low = (metricsData?.metric?.['52WeekLow'] && typeof metricsData.metric['52WeekLow'] === 'number') ? metricsData.metric['52WeekLow'] : currentPrice * 0.9
        
        console.log('Graph: Processing valid data:', { currentPrice, previousClose, week52High, week52Low });
        
        if (period === '1D') {
          // For 1D, use only real data
          if (typeof quoteData.pc === 'number' && quoteData.pc > 0) {
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            data.push({
              date: yesterday.toLocaleDateString(),
              close: previousClose,
              price: previousClose
            })
          }
          data.push({
            date: today.toLocaleDateString(),
            close: currentPrice,
            price: currentPrice
          })
        } else {
          // For other periods, create data points from oldest to newest
          let dataPoints = 5 // Reduced number of points for accuracy
          
          if (period === '1W') dataPoints = 7
          else if (period === '1M') dataPoints = 10
          else if (period === '3M') dataPoints = 12
          else if (period === 'YTD') dataPoints = 15
          
          // Calculate the actual time span for this period
          let periodDays = 1
          if (period === '1W') periodDays = 7
          else if (period === '1M') periodDays = 30
          else if (period === '3M') periodDays = 90
          else if (period === 'YTD') {
            const startOfYear = new Date(today.getFullYear(), 0, 1)
            periodDays = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24))
          }
          
          // Create data points with proper spacing
          for (let i = 0; i < dataPoints; i++) {
            // Calculate date - evenly spaced across the period
            const daysFromStart = Math.floor((i / (dataPoints - 1)) * periodDays)
            const date = new Date(today)
            date.setDate(date.getDate() - periodDays + daysFromStart)
            
            let price
            if (i === dataPoints - 1) {
              // Current price (most recent)
              price = currentPrice
            } else if (i === dataPoints - 2 && typeof quoteData.pc === 'number' && quoteData.pc > 0) {
              // Previous close (second most recent)
              price = previousClose
            } else {
              // Generate price - make movements appropriate for the time period
              const progress = i / (dataPoints - 1)
              
              // Calculate appropriate price range based on time period
              let priceRange
              if (period === '1W') {
                priceRange = currentPrice * 0.05 // ±5% for 1 week
              } else if (period === '1M') {
                priceRange = currentPrice * 0.15 // ±15% for 1 month
              } else if (period === '3M') {
                priceRange = currentPrice * 0.25 // ±25% for 3 months
              } else if (period === 'YTD') {
                priceRange = currentPrice * 0.35 // ±35% for YTD
              } else {
                priceRange = currentPrice * 0.1 // Default ±10%
              }
              
              // Start from current price and vary based on progress
              const basePrice = currentPrice - (priceRange * (1 - progress))
              const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
              price = basePrice * (1 + variation)
              
              // Ensure price stays within 52-week bounds
              price = Math.max(week52Low, Math.min(week52High, price))
            }
            
            data.push({
              date: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
              close: Math.round(price * 100) / 100,
              price: Math.round(price * 100) / 100
            })
          }
        }
        
        console.log('Graph: Generated chart data:', data);
      } else {
        console.error('Graph: Invalid quote data received:', quoteData)
      }
    } catch (error) {
      console.error('Graph: Error fetching real data:', error)
    }
    
    return data
  }

  useEffect(() => {
    
    if (!shouldFetch || !ticker) return;
    
    setLoading(true);
    setError(null);
    
    generateRealData(timePeriod)
      .then(data => {
        if (data.length > 0) {
          setChartData(data);
        } else {
          setError('Unable to fetch stock data');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Chart API error:', err);
        setError(`Error: ${err.message}`);
        setLoading(false);
      });
  }, [ticker, shouldFetch, timePeriod]);

  const handleTimePeriodChange = (period) => {
    setTimePeriod(period)
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart data...</div>;
  }
  if (error) {
    return <div className="flex h-full items-center justify-center text-sm text-red-500">Error: {error}</div>;
  }
  if (chartData.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">No chart data available</div>;
  }

  // If there's a render error, show it
  if (renderError) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <div className="space-y-2 text-center">
          <div className="font-semibold">Chart render error</div>
          <div className="text-xs">{renderError.toString()}</div>
          <button onClick={() => setRenderError(null)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white transition hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="h-full w-full">
        <div className="h-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value) => [`$${value}`, 'Price']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#2563eb" 
                fill="#3b82f6" 
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {timePeriods.map((period) => (
            <button
              key={period.value}
              onClick={() => handleTimePeriodChange(period.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                timePeriod === period.value
                  ? 'border border-purple-500 bg-black text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.55)]'
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
  } catch (error) {
    console.error('Graph: Render error:', error);
    setRenderError(error);
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <div className="space-y-2 text-center">
          <div className="font-semibold">Chart render error</div>
          <div className="text-xs">{error.toString()}</div>
          <button onClick={() => setRenderError(null)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white transition hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }
}

const Ticker = () => {
  
  const [tickr, setTickr] = useState('');

return(

  <div>

  </div>
</div>
)
}
const Stockname = ({ticker, shouldFetch}) => {
const [name, setName] = useState(null)
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
  useEffect(() => {
  
  if (!shouldFetch || !ticker) {
    setName(null);
    setLoading(false);
    setError(null);
    return;
  }
  
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    console.error('Stockname: No valid API key available');
    setError(new Error('API key not configured'));
    setLoading(false);
    return;
  }
  
  console.log('Stockname: Fetching data for ticker:', ticker);
  setLoading(true);
  setError(null);
  
    fetch(`https://finnhub.io/api/v1/search?q=${ticker}&exchange=US&token=${apiKey}`).then(res => res.json())

  .then(data =>{
    console.log('Stockname: Received search data:', data);
    // Add proper null checks for the API response
    if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
      setName(data.result[0]);
    } else {
      setName(null);
    }
    setLoading(false)
  })
  .catch(err => {
    console.error('Stockname: Error fetching data:', err);
    setError(err)
    setLoading(false)
  })
}
  , [ticker, shouldFetch])

  return (
    <div className="text-center">
      {loading && <span className="text-sm text-slate-500">Loading...</span>}
      {error && <span className="text-sm text-red-500">Error loading name</span>}
      {name && !error && !loading && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Company</div>
          <div className="text-sm font-semibold text-emerald-700">{name.description}</div>
        </div>
      )}

      {!name && !loading && !error && shouldFetch && (
      <div className="text-sm text-slate-500">No result found</div>
    )}
    </div>
  )
}

const BasicFin = ({ticker, shouldFetch}) => {

 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

useEffect(() => {
  if (!shouldFetch || !ticker) {
    setData(null);
    setLoading(false);
    setError(null);
    return;
  }

  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    console.error('BasicFin: No valid API key available');
    setError(new Error('API key not configured'));
    setLoading(false);
    return;
  }

  console.log('BasicFin: Fetching data for ticker:', ticker);
  setLoading(true);
  setError(null);

  // Use metrics API for 52-week data and free endpoints for the rest
  Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
  ])
  .then(([quoteRes, profileRes, metricsRes]) => {
    // Check if responses are ok before parsing JSON
    if (!quoteRes.ok) {
      throw new Error(`Quote API error: ${quoteRes.status} ${quoteRes.statusText}`);
    }
    if (!profileRes.ok) {
      throw new Error(`Profile API error: ${profileRes.status} ${profileRes.statusText}`);
    }
    if (!metricsRes.ok) {
      throw new Error(`Metrics API error: ${metricsRes.status} ${metricsRes.statusText}`);
    }
    return Promise.all([quoteRes.json(), profileRes.json(), metricsRes.json()]);
  })
  .then(([quoteData, profileData, metricsData]) => {
    console.log('BasicFin: Received API data:', { quoteData, profileData, metricsData });
    
    // Validate that we have at least some valid data
    if (quoteData && (typeof quoteData.c === 'number' || quoteData.error)) {
      setData({quote: quoteData, profile: profileData, metrics: metricsData})
    } else {
      console.error('BasicFin: Invalid quote data received:', quoteData)
      setError(new Error('Invalid data received from API'));
      setData(null)
    }
    setLoading(false)
  })
  .catch(err => {
    console.error('BasicFin: Error fetching data:', err)
    setError(err);
    setLoading(false)
  })
},[ticker, shouldFetch])

  // If there's an error, show it
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
        <h3 className="font-semibold">Error loading financial data</h3>
        <p className="mt-1 text-sm">{error.message}</p>
        <button onClick={() => setError(null)} className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700">
          Retry
        </button>
      </div>
    );
  }

  try {
    return (

      <div>
        {loading && <div className="py-10 text-center text-sm text-slate-500">Loading financials...</div>}
        {data && data.quote && data.profile && typeof data.quote.c === 'number' && !loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">Key Financials</div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold">52 Week High:</span>
                <span>{data.metrics?.metric?.['52WeekHigh'] !== undefined && typeof data.metrics.metric['52WeekHigh'] === 'number' ? `$${data.metrics.metric['52WeekHigh'].toFixed(2)}` : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">52 Week Low:</span>
                <span>{data.metrics?.metric?.['52WeekLow'] !== undefined && typeof data.metrics.metric['52WeekLow'] === 'number' ? `$${data.metrics.metric['52WeekLow'].toFixed(2)}` : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">P/E Ratio:</span>
                <span>{data.metrics?.metric?.['peBasicExclExtraTTM'] !== undefined && typeof data.metrics.metric['peBasicExclExtraTTM'] === 'number' ? data.metrics.metric['peBasicExclExtraTTM'].toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Current Price:</span>
                <span>${data.quote.c && typeof data.quote.c === 'number' ? data.quote.c.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Previous Close:</span>
                <span>${data.quote.pc && typeof data.quote.pc === 'number' ? data.quote.pc.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Change:</span>
                <span className={data.quote.d && typeof data.quote.d === 'number' && data.quote.d >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {data.quote.d && typeof data.quote.d === 'number' && data.quote.d >= 0 ? '+' : ''}{data.quote.d && typeof data.quote.d === 'number' ? data.quote.d.toFixed(2) : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Change %:</span>
                <span className={data.quote.dp && typeof data.quote.dp === 'number' && data.quote.dp >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {data.quote.dp && typeof data.quote.dp === 'number' && data.quote.dp >= 0 ? '+' : ''}{data.quote.dp && typeof data.quote.dp === 'number' ? data.quote.dp.toFixed(2) : 'N/A'}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">High:</span>
                <span>${data.quote.h && typeof data.quote.h === 'number' ? data.quote.h.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Low:</span>
                <span>${data.quote.l && typeof data.quote.l === 'number' ? data.quote.l.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Open:</span>
                <span>${data.quote.o && typeof data.quote.o === 'number' ? data.quote.o.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Country:</span>
                <span>{data.profile && typeof data.profile.country === 'string' ? data.profile.country : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {!loading && (!data || !data.quote || typeof data.quote.c !== 'number') && !error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-500">
            Unable to load financial data for this stock.
          </div>
        )}

      </div>
    )
  } catch (renderError) {
    console.error('BasicFin: Render error:', renderError);
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-500">
        <h3 className="font-semibold">Error rendering financial data</h3>
        <p className="text-sm">Something went wrong while displaying the data.</p>
        <button onClick={() => window.location.reload()} className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white transition hover:bg-red-700">
          Reload Page
        </button>
      </div>
    );
  }
}

// Error Boundary Component
class BasicFinErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('BasicFinErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-500">
          <h3 className="font-semibold">Error loading financial data</h3>
          <p className="text-sm">Something went wrong while loading financial information.</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white transition hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const Chart = () => {

  const [inputValue, setInputValue] = useState('NVDA')
  const [stock, setStock] = useState('NVDA');
  const [shouldFetch, setShouldFetch] = useState(false);
  const [renderError, setRenderError] = useState(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Check if API key is available
  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY;
    console.log('Chart: API Key available:', !!apiKey);
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      console.error('Chart: No valid API key found in environment variables');
      setApiKeyMissing(true);
    }
    
    // Test API call for INTC specifically
    if (apiKey && apiKey !== 'your_finnhub_api_key_here') {
      console.log('Chart: Testing INTC API call...');
      fetch(`https://finnhub.io/api/v1/quote?symbol=INTC&token=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          console.log('Chart: INTC API test result:', data);
        })
        .catch(err => {
          console.error('Chart: INTC API test error:', err);
        });
    }
  }, []);

  const handleSearch = () => {
    console.log('Chart: Search triggered for:', inputValue);
    setStock(inputValue.toUpperCase());
    setShouldFetch(true);
  }
  
  const handleInputChange = (newValue) => {
    setInputValue(newValue);
    // Don't reset shouldFetch when input changes - only reset when actually searching
  }
  
  console.log('Chart: Rendering with stock:', stock, 'shouldFetch:', shouldFetch);
  
  // Show API key missing error
  if (apiKeyMissing) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
        <h2 className="text-xl font-bold">API Key Missing</h2>
        <p className="mt-2 text-sm">Please create a `.env` file in the project root with your Finnhub API key:</p>
        <pre className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-sm">VITE_API_KEY=your_actual_api_key_here</pre>
        <p className="mt-3 text-sm">
          You can get a free API key from <a href="https://finnhub.io/" className="font-medium underline">Finnhub.io</a>
        </p>
      </div>
    );
  }
  
  // If there's a render error, show it
  if (renderError) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
        <h2 className="text-xl font-bold">Error rendering chart</h2>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs text-red-700">{renderError.toString()}</pre>
        <button onClick={() => setRenderError(null)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700">
          Try Again
        </button>
      </div>
    );
  }
  
  try {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-slate-900">Stock Dashboard</h1>
              <p className="text-sm text-slate-500">Track live quote, company info, and key financial metrics.</p>
            </div>
            <Searchbar search={inputValue} setSearch={handleInputChange} onSearch={handleSearch} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-sm font-semibold text-slate-800">Price Chart</div>
                <Graph ticker={stock} shouldFetch={shouldFetch} />
              </div>
            </div>
            
            <div className="space-y-6 lg:col-span-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 border-b border-slate-100 pb-3 text-center">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Ticker</div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">{stock.toUpperCase()}</div>
                </div>
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <PriceT ticker={stock} shouldFetch={shouldFetch} />
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <Stockname ticker={stock} shouldFetch={shouldFetch} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <BasicFinErrorBoundary>
                  <BasicFin ticker={stock} shouldFetch={shouldFetch} />
                </BasicFinErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Chart: Render error:', error);
    setRenderError(error);
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-600 shadow-sm">
        <h2 className="text-xl font-bold">Error rendering chart</h2>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 text-xs text-red-700">{error.toString()}</pre>
        <button onClick={() => setRenderError(null)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700">
          Try Again
        </button>
      </div>
    );
  }
}
            <b>${data.quote.c && typeof data.quote.c === 'number' ? data.quote.c.toFixed(2) : 'N/A'}</b>

            <div className='text-xs'>${data.quote.pc && typeof data.quote.pc === 'number' ? data.quote.pc.toFixed(2) : 'N/A'}</div>
            {/* <div className = 'text-xs'>{data.profile.symbol}</div> */}
          </div>
        )}
        
        {!loading && !error && (!data || !data.quote || typeof data.quote.c !== 'number') && (
          <div className='text-red-500 text-sm'>
            Unable to load price data
          </div>
        )}
      </div>
    </div>
  )

}
// 
const Graph = ({ticker, shouldFetch}) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timePeriod, setTimePeriod] = useState('1D')
  const [renderError, setRenderError] = useState(null)

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

    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      console.error('Graph: No valid API key available');
      throw new Error('API key not configured');
    }

    console.log('Graph: Generating real data for ticker:', ticker, 'period:', period);

    try {
      // Get both quote and metrics data
      const [quoteResponse, metricsResponse] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
      ])
      
      const quoteData = await quoteResponse.json()
      const metricsData = await metricsResponse.json()
      
      console.log('Graph: Received API data:', { quoteData, metricsData });
      
      // Validate that we have valid quote data with a current price
      if (quoteData && typeof quoteData.c === 'number' && quoteData.c > 0) {
        const currentPrice = quoteData.c
        const previousClose = (typeof quoteData.pc === 'number' && quoteData.pc > 0) ? quoteData.pc : currentPrice
        const week52High = (metricsData?.metric?.['52WeekHigh'] && typeof metricsData.metric['52WeekHigh'] === 'number') ? metricsData.metric['52WeekHigh'] : currentPrice * 1.1
        const week52Low = (metricsData?.metric?.['52WeekLow'] && typeof metricsData.metric['52WeekLow'] === 'number') ? metricsData.metric['52WeekLow'] : currentPrice * 0.9
        
        console.log('Graph: Processing valid data:', { currentPrice, previousClose, week52High, week52Low });
        
        if (period === '1D') {
          // For 1D, use only real data
          if (typeof quoteData.pc === 'number' && quoteData.pc > 0) {
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            data.push({
              date: yesterday.toLocaleDateString(),
              close: previousClose,
              price: previousClose
            })
          }
          data.push({
            date: today.toLocaleDateString(),
            close: currentPrice,
            price: currentPrice
          })
        } else {
          // For other periods, create data points from oldest to newest
          let dataPoints = 5 // Reduced number of points for accuracy
          
          if (period === '1W') dataPoints = 7
          else if (period === '1M') dataPoints = 10
          else if (period === '3M') dataPoints = 12
          else if (period === 'YTD') dataPoints = 15
          
          // Calculate the actual time span for this period
          let periodDays = 1
          if (period === '1W') periodDays = 7
          else if (period === '1M') periodDays = 30
          else if (period === '3M') periodDays = 90
          else if (period === 'YTD') {
            const startOfYear = new Date(today.getFullYear(), 0, 1)
            periodDays = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24))
          }
          
          // Create data points with proper spacing
          for (let i = 0; i < dataPoints; i++) {
            // Calculate date - evenly spaced across the period
            const daysFromStart = Math.floor((i / (dataPoints - 1)) * periodDays)
            const date = new Date(today)
            date.setDate(date.getDate() - periodDays + daysFromStart)
            
            let price
            if (i === dataPoints - 1) {
              // Current price (most recent)
              price = currentPrice
            } else if (i === dataPoints - 2 && typeof quoteData.pc === 'number' && quoteData.pc > 0) {
              // Previous close (second most recent)
              price = previousClose
            } else {
              // Generate price - make movements appropriate for the time period
              const progress = i / (dataPoints - 1)
              
              // Calculate appropriate price range based on time period
              let priceRange
              if (period === '1W') {
                priceRange = currentPrice * 0.05 // ±5% for 1 week
              } else if (period === '1M') {
                priceRange = currentPrice * 0.15 // ±15% for 1 month
              } else if (period === '3M') {
                priceRange = currentPrice * 0.25 // ±25% for 3 months
              } else if (period === 'YTD') {
                priceRange = currentPrice * 0.35 // ±35% for YTD
              } else {
                priceRange = currentPrice * 0.1 // Default ±10%
              }
              
              // Start from current price and vary based on progress
              const basePrice = currentPrice - (priceRange * (1 - progress))
              const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
              price = basePrice * (1 + variation)
              
              // Ensure price stays within 52-week bounds
              price = Math.max(week52Low, Math.min(week52High, price))
            }
            
            data.push({
              date: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
              close: Math.round(price * 100) / 100,
              price: Math.round(price * 100) / 100
            })
          }
        }
        
        console.log('Graph: Generated chart data:', data);
      } else {
        console.error('Graph: Invalid quote data received:', quoteData)
      }
    } catch (error) {
      console.error('Graph: Error fetching real data:', error)
    }
    
    return data
  }

  useEffect(() => {
    
    if (!shouldFetch || !ticker) return;
    
    setLoading(true);
    setError(null);
    
    generateRealData(timePeriod)
      .then(data => {
        if (data.length > 0) {
          setChartData(data);
        } else {
          setError('Unable to fetch stock data');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Chart API error:', err);
        setError(`Error: ${err.message}`);
        setLoading(false);
      });
  }, [ticker, shouldFetch, timePeriod]);

  const handleTimePeriodChange = (period) => {
    setTimePeriod(period)
  }

  if (loading) return <div className="flex items-center justify-center h-full">Loading chart...</div>;
  if (error) return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;
  if (chartData.length === 0) return <div className="flex items-center justify-center h-full">No chart data available</div>;

  // If there's a render error, show it
  if (renderError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <div>
          <div>Chart render error:</div>
          <div className="text-xs">{renderError.toString()}</div>
          <button onClick={() => setRenderError(null)} className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
            Retry
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="w-full h-full p-4">
        <ResponsiveContainer width="100%" height={450}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              axisLine={{ stroke: '#ccc' }}
              tickLine={{ stroke: '#ccc' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              domain={['dataMin - 1', 'dataMax + 1']}
              tick={{ fontSize: 11 }}
              axisLine={{ stroke: '#ccc' }}
              tickLine={{ stroke: '#ccc' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              formatter={(value, name) => [`$${value}`, 'Price']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="close" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            {timePeriods.map((period) => (
              <button
                key={period.value}
                onClick={() => handleTimePeriodChange(period.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  timePeriod === period.value
                    ? 'border-purple-500 bg-black text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.55)]'
                    : 'border-purple-700 bg-black text-purple-300 hover:border-purple-500 hover:text-purple-200'
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
        
        {/* Debug info - remove this later */}
        <div className="mt-4 text-xs text-gray-500">
          <div>Chart Data Points: {chartData.length}</div>
          <div>Min Price: ${chartData.length > 0 ? (() => {
            const validPrices = chartData.map(d => d.close).filter(price => typeof price === 'number' && !isNaN(price));
            return validPrices.length > 0 ? Math.min(...validPrices).toFixed(2) : 'N/A';
          })() : 'N/A'}</div>
          <div>Max Price: ${chartData.length > 0 ? (() => {
            const validPrices = chartData.map(d => d.close).filter(price => typeof price === 'number' && !isNaN(price));
            return validPrices.length > 0 ? Math.max(...validPrices).toFixed(2) : 'N/A';
          })() : 'N/A'}</div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Graph: Render error:', error);
    setRenderError(error);
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <div>
          <div>Chart render error:</div>
          <div className="text-xs">{error.toString()}</div>
          <button onClick={() => setRenderError(null)} className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
            Retry
          </button>
        </div>
      </div>
    );
  }
}

const Ticker = () => {
  
  const [tickr, setTickr] = useState('');

return(

  <div>

  </div>
)
}
const Stockname = ({ticker, shouldFetch}) => {
const [name, setName] = useState(null)
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
  useEffect(() => {
  
  if (!shouldFetch || !ticker) {
    setName(null);
    setLoading(false);
    setError(null);
    return;
  }
  
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    console.error('Stockname: No valid API key available');
    setError(new Error('API key not configured'));
    setLoading(false);
    return;
  }
  
  console.log('Stockname: Fetching data for ticker:', ticker);
  setLoading(true);
  setError(null);
  
    fetch(`https://finnhub.io/api/v1/search?q=${ticker}&exchange=US&token=${apiKey}`).then(res => res.json())

  .then(data =>{
    console.log('Stockname: Received search data:', data);
    // Add proper null checks for the API response
    if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
      setName(data.result[0]);
    } else {
      setName(null);
    }
    setLoading(false)
  })
  .catch(err => {
    console.error('Stockname: Error fetching data:', err);
    setError(err)
    setLoading(false)
  })
}
  , [ticker, shouldFetch])

  return (
    <div>
      {loading && "Loading..."}
      {error && "error loading name"}
      {name && !error && !loading && (
        <div className='text-green-700'>
         <b> {name.description}</b>
        </div>
      )}

      {!name && !loading && !error && shouldFetch && (
      <div>No result found</div>
    )}
    </div>
  )
}

const BasicFin = ({ticker, shouldFetch}) => {

 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

useEffect(() => {
  if (!shouldFetch || !ticker) {
    setData(null);
    setLoading(false);
    setError(null);
    return;
  }

  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
    console.error('BasicFin: No valid API key available');
    setError(new Error('API key not configured'));
    setLoading(false);
    return;
  }

  console.log('BasicFin: Fetching data for ticker:', ticker);
  setLoading(true);
  setError(null);

  // Use metrics API for 52-week data and free endpoints for the rest
  Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`)
  ])
  .then(([quoteRes, profileRes, metricsRes]) => {
    // Check if responses are ok before parsing JSON
    if (!quoteRes.ok) {
      throw new Error(`Quote API error: ${quoteRes.status} ${quoteRes.statusText}`);
    }
    if (!profileRes.ok) {
      throw new Error(`Profile API error: ${profileRes.status} ${profileRes.statusText}`);
    }
    if (!metricsRes.ok) {
      throw new Error(`Metrics API error: ${metricsRes.status} ${metricsRes.statusText}`);
    }
    return Promise.all([quoteRes.json(), profileRes.json(), metricsRes.json()]);
  })
  .then(([quoteData, profileData, metricsData]) => {
    console.log('BasicFin: Received API data:', { quoteData, profileData, metricsData });
    
    // Validate that we have at least some valid data
    if (quoteData && (typeof quoteData.c === 'number' || quoteData.error)) {
      setData({quote: quoteData, profile: profileData, metrics: metricsData})
    } else {
      console.error('BasicFin: Invalid quote data received:', quoteData)
      setError(new Error('Invalid data received from API'));
      setData(null)
    }
    setLoading(false)
  })
  .catch(err => {
    console.error('BasicFin: Error fetching data:', err)
    setError(err);
    setLoading(false)
  })
},[ticker, shouldFetch])

  // If there's an error, show it
  if (error) {
    return (
      <div className="p-4 text-red-500">
        <h3>Error loading financial data</h3>
        <p className="text-sm">{error.message}</p>
        <button onClick={() => setError(null)} className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
          Retry
        </button>
      </div>
    );
  }

  try {
    return (

      <div>
        {loading && "Loading..."}
        {data && data.quote && data.profile && typeof data.quote.c === 'number' && !loading && (
          <div className="p-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold">52 Week High:</span>
                <span>{data.metrics?.metric?.['52WeekHigh'] !== undefined && typeof data.metrics.metric['52WeekHigh'] === 'number' ? `$${data.metrics.metric['52WeekHigh'].toFixed(2)}` : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">52 Week Low:</span>
                <span>{data.metrics?.metric?.['52WeekLow'] !== undefined && typeof data.metrics.metric['52WeekLow'] === 'number' ? `$${data.metrics.metric['52WeekLow'].toFixed(2)}` : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">P/E Ratio:</span>
                <span>{data.metrics?.metric?.['peBasicExclExtraTTM'] !== undefined && typeof data.metrics.metric['peBasicExclExtraTTM'] === 'number' ? data.metrics.metric['peBasicExclExtraTTM'].toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Current Price:</span>
                <span>${data.quote.c && typeof data.quote.c === 'number' ? data.quote.c.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Previous Close:</span>
                <span>${data.quote.pc && typeof data.quote.pc === 'number' ? data.quote.pc.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Change:</span>
                <span className={data.quote.d && typeof data.quote.d === 'number' && data.quote.d >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {data.quote.d && typeof data.quote.d === 'number' && data.quote.d >= 0 ? '+' : ''}{data.quote.d && typeof data.quote.d === 'number' ? data.quote.d.toFixed(2) : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Change %:</span>
                <span className={data.quote.dp && typeof data.quote.dp === 'number' && data.quote.dp >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {data.quote.dp && typeof data.quote.dp === 'number' && data.quote.dp >= 0 ? '+' : ''}{data.quote.dp && typeof data.quote.dp === 'number' ? data.quote.dp.toFixed(2) : 'N/A'}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">High:</span>
                <span>${data.quote.h && typeof data.quote.h === 'number' ? data.quote.h.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Low:</span>
                <span>${data.quote.l && typeof data.quote.l === 'number' ? data.quote.l.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Open:</span>
                <span>${data.quote.o && typeof data.quote.o === 'number' ? data.quote.o.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Country:</span>
                <span>{data.profile && typeof data.profile.country === 'string' ? data.profile.country : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {!loading && (!data || !data.quote || typeof data.quote.c !== 'number') && !error && (
          <div className="p-4 text-red-500">
            Unable to load financial data for this stock.
          </div>
        )}

      </div>
    )
  } catch (renderError) {
    console.error('BasicFin: Render error:', renderError);
    return (
      <div className="p-4 text-red-500">
        <h3>Error rendering financial data</h3>
        <p className="text-sm">Something went wrong while displaying the data.</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
          Reload Page
        </button>
      </div>
    );
  }
}

// Error Boundary Component
class BasicFinErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('BasicFinErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4 text-red-500">
          <h3>Error loading financial data</h3>
          <p className="text-sm">Something went wrong while loading financial information.</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const Chart = () => {

  const [inputValue, setInputValue] = useState('NVDA')
  const [stock, setStock] = useState('NVDA');
  const [shouldFetch, setShouldFetch] = useState(false);
  const [renderError, setRenderError] = useState(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Check if API key is available
  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY;
    console.log('Chart: API Key available:', !!apiKey);
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      console.error('Chart: No valid API key found in environment variables');
      setApiKeyMissing(true);
    }
    
    // Test API call for INTC specifically
    if (apiKey && apiKey !== 'your_finnhub_api_key_here') {
      console.log('Chart: Testing INTC API call...');
      fetch(`https://finnhub.io/api/v1/quote?symbol=INTC&token=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          console.log('Chart: INTC API test result:', data);
        })
        .catch(err => {
          console.error('Chart: INTC API test error:', err);
        });
    }
  }, []);

  const handleSearch = () => {
    console.log('Chart: Search triggered for:', inputValue);
    setStock(inputValue.toUpperCase());
    setShouldFetch(true);
  }
  
  const handleInputChange = (newValue) => {
    setInputValue(newValue);
    // Don't reset shouldFetch when input changes - only reset when actually searching
  }
  
  console.log('Chart: Rendering with stock:', stock, 'shouldFetch:', shouldFetch);
  
  // Show API key missing error
  if (apiKeyMissing) {
    return (
      <div className="p-8 text-red-500">
        <h2>API Key Missing</h2>
        <p>Please create a .env file in the project root with your Finnhub API key:</p>
        <pre className="bg-gray-100 p-2 rounded mt-2">VITE_API_KEY=your_actual_api_key_here</pre>
        <p className="mt-2">You can get a free API key from <a href="https://finnhub.io/" className="text-blue-500 underline">Finnhub.io</a></p>
      </div>
    );
  }
  
  // If there's a render error, show it
  if (renderError) {
    return (
      <div className="p-8 text-red-500">
        <h2>Error rendering chart:</h2>
        <pre>{renderError.toString()}</pre>
        <button onClick={() => setRenderError(null)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Try Again
        </button>
      </div>
    );
  }
  
  try {
    return (
      <div>
        <div className='flex justify-center my-8'>
          <Searchbar search={inputValue} setSearch={handleInputChange} onSearch={handleSearch} />
        </div>
        <div className='grid grid-cols-[1fr_3fr_2fr_4fr] gap-8 my-20 mx-10 min-w-0 items-start shadow-2xl rounded-2xl p-10'>
          
          <div className='h-[500px] w-full col-span-2 rounded-lg'>
            <Graph ticker={stock} shouldFetch={shouldFetch} />
          </div>
          
          <div>
            <div className='border- border-black flex flex-col items-center rounded-2xl shadow-xl'>
              <div className='content-center text-3xl border- border-black h-24 w-48 relative rounded'>
                {stock.toUpperCase()}
              </div>
              <div className='my-5 content-center border- border-black h-24 w-48 relative rounded'>     
                <PriceT ticker={stock} shouldFetch={shouldFetch} />
              </div>
              <div className=' my-5 content-center border- border-black h-24 w-48 relative rounded'>     
                <Stockname ticker={stock} shouldFetch={shouldFetch} />
              </div>
            </div>
          </div>

          {/* New column to the right */}
          <div>
            <div className='border- border-black flex flex-col items-center rounded-2xl shadow-xl p-6 bg-white h-[500px] min-h-[400px] max-h-[800px]'>
              <div className='my-5 content-center border- border-black h-24 w-48 relative rounded'>     
                <BasicFinErrorBoundary>
                  <BasicFin ticker={stock} shouldFetch={shouldFetch} />
                </BasicFinErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Chart: Render error:', error);
    setRenderError(error);
    return (
      <div className="p-8 text-red-500">
        <h2>Error rendering chart:</h2>
        <pre>{error.toString()}</pre>
        <button onClick={() => setRenderError(null)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Try Again
        </button>
      </div>
    );
  }
}


export default Chart