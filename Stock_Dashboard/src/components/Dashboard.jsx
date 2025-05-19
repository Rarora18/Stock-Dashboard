import React from 'react'
import { useState } from 'react'
const Dashboard = () => {
    const [search, setSearch] = useState('')
  return (
    <div>
      <div className='searchBar'>
        <input className='mx-4 h-10 w-80 px-2 shadow-lg rounded-2xl ' type="text" placeholder='Search Stocks' />
        <button className='bg-yellow-600 shadow-lg '> Search</button>
      </div>

    </div>
  )
}

export default Dashboard