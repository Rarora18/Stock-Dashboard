import React from 'react'
import { useState } from 'react'


const Searchbar = () => {
    const [search, setSearch] = useState('')
    return <div>
      <div className='flex flex-start'>
        <input className='mx-4 h-10 w-80 px-2 shadow-lg rounded-2xl ' type="text" placeholder='Search Stocks' />
        <button className='bg-yellow-600 shadow-lg '> Search</button>
      </div>
    </div>
}



const Dashboard = () => {
  
  return (
    <div>
    <Searchbar />

    </div>
  )
}

export default Dashboard