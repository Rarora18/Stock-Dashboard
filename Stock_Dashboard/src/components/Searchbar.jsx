import React from 'react'
import { useState } from 'react'


const Searchbar = () => {
    const [search, setSearch] = useState('');

    const handleQuery = (value) => {

      setSearch(value.target.value);
      
    }
    return <div>
      <div className='flex flex-start'>
        <input value = {search} onChange={handleQuery} className='mx-4 h-10 w-80 px-2 shadow-lg rounded-2xl ' type="text" placeholder='Search Stocks' />
        <button className='bg-yellow-600 shadow-lg '> Search</button>
        <h3><br />Testing: {search} </h3>
      </div>
    </div>
}


export default Searchbar