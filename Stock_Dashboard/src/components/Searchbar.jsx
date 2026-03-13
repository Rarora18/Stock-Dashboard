import React from 'react'

const Searchbar = ({ search, setSearch, onSearch }) => {
  const handleQuery = (e) => {
    setSearch(e.target.value)
  }

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch()
    } else {
      setSearch(search.toUpperCase())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick()
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-3 rounded-2xl border border-purple-900/70 bg-black/40 p-2 shadow-[0_0_24px_rgba(168,85,247,0.12)] backdrop-blur-sm">
        <input
          value={search}
          onChange={handleQuery}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-xl border border-transparent bg-zinc-900/90 px-4 text-purple-100 placeholder:text-purple-300/50 outline-none transition focus:border-purple-500 focus:bg-zinc-900 focus:ring-2 focus:ring-purple-500/30"
          type="text"
          placeholder="Search stocks (e.g. NVDA, AAPL)"
        />
        <button
          onClick={handleSearchClick}
          className="h-11 rounded-xl bg-purple-700 px-5 text-sm font-semibold text-white transition hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
          style={{ backgroundColor: '#7e22ce', color: '#ffffff' }}
        >
          Search
        </button>
      </div>
    </div>
  )
}

export default Searchbar