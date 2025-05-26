
import React from 'react'
import { useState, useEffect } from 'react'


const PriceT = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${import.meta.env.VITE_API_KEY}`)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err)
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div>Ticker: AAPL</div>
      <div className='align-center'>
        {loading && "Loading..."}
        {error && "Error loading data"}
        {data && !loading && !error && (
          <div>
            Current Price: {data.c}
          </div>
        )}
      </div>
    </div>
  )
}

const Graph = () => {

    return (
          <div>
        Stock graph
        </div>
    )
}
const Chart = () => {


  return (
    <div>
    <div className='grid grid-cols-[2fr_4fr_4fr] gap-8 my-20 mx-10 min-w-0 items-start'>

       <div className='border-2 border-black h-100 w-100 col-span-2 rounded'>
    <Graph />
    </div>
   <div className=' border-2 border-black h-24 w-48 relative rounded'>     
       <PriceT />
        </div>
    </div>
        
        </div>

  )
}


export default Chart