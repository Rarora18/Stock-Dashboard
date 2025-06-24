
import React from 'react'
import { useState, useEffect } from 'react'
import Searchbar from './Searchbar'

const PriceT = ({ticker}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // const value = Searchbar({Stock, setStock});

  const stockk = 'AAPL'
  useEffect(() => {
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
  }, [ticker]);

  return (
    <div>

      {/* <div><b>Ticker: {ticker}</b></div> */}
      <div className='align-center'>
        {loading && "Loading..."}
        {error && "Error loading data"}
        {data && data.quote && data.profile && !loading && !error && (
          <div className='text-3xl'>
            <b>{data.quote.c}</b>
            <div className='text-xs'>{data.quote.pc}</div>
            <div className = 'text-xs'>{data.profile.symbol}</div>
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

const Chart = () => {

  const [stock, setStock] = useState('NVDA');


  return (
    <div>
      <div className='flex justify-center my-8'>
     
     <Searchbar search={stock} setSearch={setStock} />
    </div>
    <div className=' grid grid-cols-[2fr_4fr_4fr] gap-8 my-20 mx-10 min-w-0 items-start shadow-2xl rounded-2xl p-10'>
      
       <div className='border-2 border-black h-100 w-100 col-span-2 rounded'>
    <Graph />
    </div>
    <div>
    <div className='content-center text-3xl border-2 border-black h-24 w-48 relative rounded'>
      {stock}
    </div>
        
    <div className='my-5 content-center border-2 border-black h-24 w-48 relative rounded'>     
       <PriceT ticker={stock} />
        </div>
    </div>
     
    
  </div>
        
        </div>

  )
}


export default Chart