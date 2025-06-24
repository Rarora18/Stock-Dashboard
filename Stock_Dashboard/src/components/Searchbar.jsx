import React from 'react'
import { useState } from 'react'


const Searchbar = ({search, setSearch,}) => {
    // const [search, setSearch] = useState('');

    const handleQuery = (e) => {

      setSearch(e.target.value);
      
    }

    const queryUpper = () => {

      setSearch(search.toUpperCase());
    }

    return <div>
      <div className='flex flex-start'>
        <input value = {search}  onChange = {handleQuery} className='mx-4 h-10 w-80 px-2 shadow-lg rounded-2xl' type="text" placeholder='Search Stocks' />
        <button onClick={queryUpper} className='bg-yellow-600 shadow-lg '> Search</button>
      </div>
    </div>
}


export default Searchbar