
import React from 'react'
import { useState, useEffect } from 'react'
import Searchbar from './Searchbar'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const PriceT = ({ticker, shouldFetch}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const stockk = 'AAPL'
  useEffect(() => {
    if (!shouldFetch || !ticker) return;
    
    setLoading(true);
    setError(null);
    
    Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${import.meta.env.VITE_API_KEY}`).then(res => res.json()),
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${import.meta.env.VITE_API_KEY}`).then(res => res.json())
    ])
    .then(([quote, profile]) => {
        setData({quote, profile})
        setLoading(false)
      })

      .catch(err => {
        setError(err)
        setLoading(false)
      });
  }, [ticker, shouldFetch]);

  return (
    <div>

      {/* <div><b>Ticker: {ticker}</b></div> */}
      <div className='align-center'>
        {loading && "Loading..."}
        {error && "Error loading data"}
        {data && data.quote && data.profile && !loading && !error && (
          <div className='text-3xl'>
            <b>${data.quote.c.toFixed(2)}</b>

            <div className='text-xs'>${data.quote.pc}</div>
            {/* <div className = 'text-xs'>{data.profile.symbol}</div> */}
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

    try {
      // Get both quote and metrics data
      const [quoteResponse, metricsResponse] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${import.meta.env.VITE_API_KEY}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${import.meta.env.VITE_API_KEY}`)
      ])
      
      const quoteData = await quoteResponse.json()
      const metricsData = await metricsResponse.json()
      
      if (quoteData && quoteData.c) {
        const currentPrice = quoteData.c
        const previousClose = quoteData.pc || currentPrice
        const week52High = metricsData?.metric?.['52WeekHigh'] || currentPrice * 1.1
        const week52Low = metricsData?.metric?.['52WeekLow'] || currentPrice * 0.9
        
        if (period === '1D') {
          // For 1D, use only real data
          if (quoteData.pc) {
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
            } else if (i === dataPoints - 2 && quoteData.pc) {
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
      }
    } catch (error) {
      console.error('Error fetching real data:', error)
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
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timePeriod === period.value
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Debug info - remove this later */}
      <div className="mt-4 text-xs text-gray-500">
        <div>Chart Data Points: {chartData.length}</div>
        <div>Min Price: ${chartData.length > 0 ? Math.min(...chartData.map(d => d.close)).toFixed(2) : 'N/A'}</div>
        <div>Max Price: ${chartData.length > 0 ? Math.max(...chartData.map(d => d.close)).toFixed(2) : 'N/A'}</div>
      </div>
    </div>
  )
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
  
  setLoading(true);
  setError(null);
  
    fetch(`https://finnhub.io/api/v1/search?q=${ticker}&exchange=US&token=${import.meta.env.VITE_API_KEY}`).then(res => res.json())

  .then(data =>{
  setName(data.result[0]);
    setLoading(false)
  })
  .catch(err => {
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

useEffect(() => {
  if (!shouldFetch || !ticker) {
    setData(null);
    setLoading(false);
    return;
  }

  setLoading(true);

  // Use metrics API for 52-week data and free endpoints for the rest
  Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${import.meta.env.VITE_API_KEY}`),
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${import.meta.env.VITE_API_KEY}`),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${import.meta.env.VITE_API_KEY}`)
  ])
  .then(([quoteRes, profileRes, metricsRes]) => Promise.all([quoteRes.json(), profileRes.json(), metricsRes.json()]))
  .then(([quoteData, profileData, metricsData]) => {
    setData({quote: quoteData, profile: profileData, metrics: metricsData})
    setLoading(false)
  })
  .catch(err => {
    console.error('Error fetching data:', err)
    setLoading(false)
  })
},[ticker, shouldFetch])

  return (

    <div>
      {loading && "Loading..."}
      {data && data.quote && data.profile && !loading && (
        <div className="p-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-semibold">52 Week High:</span>
              <span>{data.metrics?.metric?.['52WeekHigh'] !== undefined ? `$${data.metrics.metric['52WeekHigh'].toFixed(2)}` : 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">52 Week Low:</span>
              <span>{data.metrics?.metric?.['52WeekLow'] !== undefined ? `$${data.metrics.metric['52WeekLow'].toFixed(2)}` : 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">P/E Ratio:</span>
              <span>{data.metrics?.metric?.['peBasicExclExtraTTM'] !== undefined ? data.metrics.metric['peBasicExclExtraTTM'].toFixed(2) : 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Current Price:</span>
              <span>${data.quote.c?.toFixed(2) || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Previous Close:</span>
              <span>${data.quote.pc?.toFixed(2) || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Change:</span>
              <span className={data.quote.d >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.quote.d >= 0 ? '+' : ''}{data.quote.d?.toFixed(2) || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Change %:</span>
              <span className={data.quote.dp >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.quote.dp >= 0 ? '+' : ''}{data.quote.dp?.toFixed(2) || 'N/A'}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">High:</span>
              <span>${data.quote.h?.toFixed(2) || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Low:</span>
              <span>${data.quote.l?.toFixed(2) || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Open:</span>
              <span>${data.quote.o?.toFixed(2) || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Country:</span>
              <span>{data.profile.country || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const Chart = () => {

  const [inputValue, setInputValue] = useState('NVDA')
  const [stock, setStock] = useState('NVDA');
  const [shouldFetch, setShouldFetch] = useState(false);

  const handleSearch = () => {
    setStock(inputValue.toUpperCase());
    setShouldFetch(true);
  }
  
  const handleInputChange = (newValue) => {
    setInputValue(newValue);
    // Don't reset shouldFetch when input changes - only reset when actually searching
  }
  
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
              <BasicFin ticker={stock} shouldFetch={shouldFetch} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}


export default Chart