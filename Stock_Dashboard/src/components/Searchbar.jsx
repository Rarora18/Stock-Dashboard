import React, { useEffect, useState } from 'react'

const Searchbar = ({ search, setSearch, onSearch }) => {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    const query = search.trim()
    if (!query) {
      setSuggestions([])
      setShowSuggestions(false)
      setLoadingSuggestions(false)
      return
    }

    const apiKey = import.meta.env.VITE_API_KEY
    if (!apiKey || apiKey === 'your_finnhub_api_key_here') {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }

    const debounceId = setTimeout(() => {
      setLoadingSuggestions(true)
      fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&exchange=US&token=${apiKey}`)
        .then((res) => res.json())
        .then((result) => {
          const matches = Array.isArray(result?.result)
            ? result.result
                .filter((item) => item?.symbol && item?.description)
                .slice(0, 8)
                .map((item) => ({
                  symbol: item.symbol,
                  description: item.description
                }))
            : []
          setSuggestions(matches)
          setShowSuggestions(matches.length > 0)
          setLoadingSuggestions(false)
        })
        .catch(() => {
          setSuggestions([])
          setLoadingSuggestions(false)
        })
    }, 250)

    return () => clearTimeout(debounceId)
  }, [search])

  const handleQuery = (e) => {
    setSearch(e.target.value)
    setShowSuggestions(true)
  }

  const runSearch = (value) => {
    if (!value.trim()) return
    if (onSearch) onSearch(value.trim())
    else setSearch(value.trim().toUpperCase())
    setShowSuggestions(false)
  }

  const handleSearchClick = () => {
    const exactTickerMatch = suggestions.find((item) => item.symbol.toUpperCase() === search.trim().toUpperCase())
    if (exactTickerMatch) {
      runSearch(exactTickerMatch.symbol)
      return
    }
    if (suggestions.length > 0) {
      runSearch(suggestions[0].symbol)
      return
    }
    runSearch(search)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchClick()
    }
  }

  const handleSuggestionSelect = (symbol) => {
    setSearch(symbol)
    runSearch(symbol)
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative">
        <div className="flex items-center gap-3 rounded-2xl border border-purple-900/70 bg-black/40 p-2 shadow-[0_0_24px_rgba(168,85,247,0.12)] backdrop-blur-sm">
          <input
            value={search}
            onChange={handleQuery}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 140)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-11 w-full rounded-xl border border-transparent bg-zinc-900/90 px-4 text-purple-100 placeholder:text-purple-300/50 outline-none transition focus:border-purple-500 focus:bg-zinc-900 focus:ring-2 focus:ring-purple-500/30"
            type="text"
            placeholder="Search by ticker or company (e.g. NVDA, NVIDIA)"
          />
          <button
            onClick={handleSearchClick}
            className="h-11 rounded-xl bg-purple-700 px-5 text-sm font-semibold text-white transition hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
            style={{ backgroundColor: '#7e22ce', color: '#ffffff' }}
          >
            Search
          </button>
        </div>

        {showSuggestions && (
          <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-purple-900/70 bg-zinc-950/95 p-2 shadow-[0_10px_35px_rgba(168,85,247,0.2)]">
            {loadingSuggestions && <div className="px-3 py-2 text-sm text-purple-300/90">Searching...</div>}
            {!loadingSuggestions && suggestions.length === 0 && <div className="px-3 py-2 text-sm text-purple-300/90">No matches found</div>}
            {!loadingSuggestions &&
              suggestions.map((item) => (
                <div
                  key={`${item.symbol}-${item.description}`}
                  role="button"
                  tabIndex={0}
                  onMouseDown={() => handleSuggestionSelect(item.symbol)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSuggestionSelect(item.symbol)
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-purple-900/60 bg-zinc-900/70 px-3 py-2 text-left transition hover:border-purple-600 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <span className="text-sm font-semibold text-purple-100">{item.symbol}</span>
                  <span className="ml-3 truncate text-xs text-purple-300/85">{item.description}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Searchbar