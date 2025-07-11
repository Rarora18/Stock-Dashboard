
import React from 'react'
import { useState, useEffect } from 'react'
import Searchbar from './Searchbar'

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
const Graph = () => {

    return (
          <div>
        Stock graph
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

fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${import.meta.env.VITE_API_KEY}`)
.then(res => res.json())
.then(data => {
  setData(data)
  setLoading(false)
  })
  .catch(err => {
    setLoading(false)
  })
},[ticker, shouldFetch])

  return (

    <div>
      {loading && "Loading..."}
      {data && data.metric && !loading && (
        <div>
          <div>
            <b>52 Week High:</b> {data.metric['52WeekHigh'] !== undefined ? `$${data.metric['52WeekHigh'].toFixed(2)}` : 'N/A'}
            <br />
            <b>52 Week Low :</b> {data.metric['52WeekLow'] !== undefined ? `$${data.metric['52WeekLow']}` : 'N/A'}
            <br />
            <b>P/E Ratio: </b> {data.metric['peBasicExclExtraTTM'] !== undefined ? data.metric['peBasicExclExtraTTM'].toFixed(2) : 'N/A'}
            <b></b>

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
      <div className='grid grid-cols-[2fr_4fr_3fr_6fr] gap-8 my-20 mx-10 min-w-0 items-start shadow-2xl rounded-2xl p-10'>
        
        <div className='border-2 border-black h-100 w-100 col-span-2 rounded'>
          <Graph />
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
          <div className='border- border-black flex flex-col items-center rounded-2xl shadow-xl'>
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