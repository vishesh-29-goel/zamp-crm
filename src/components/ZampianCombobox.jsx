import { useState, useMemo, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useZampians } from '../lib/useApi'

/**
 * Searchable zampian dropdown.
 * Props:
 *   value       – currently selected zampian id (number | null)
 *   onChange    – (zampian | null) => void
 *   placeholder – string
 *   disabled    – bool
 *   className   – extra class on the outer div
 */
export default function ZampianCombobox({ value, onChange, placeholder = 'Search name or email…', disabled = false, className = '' }) {
  const { data: allZampians = [] } = useZampians()
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef(null)

  // When value changes externally, sync the query to the selected name
  const selectedZampian = useMemo(
    () => allZampians.find(z => z.id === value) || null,
    [allZampians, value]
  )
  useEffect(() => {
    if (!open) setQuery(selectedZampian?.name || '')
  }, [selectedZampian, open])

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim()
    return allZampians
      .filter(z => z.name.toLowerCase().includes(q) || (z.email || '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [allZampians, query])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        // If nothing was confirmed, reset query to selected name
        setQuery(selectedZampian?.name || '')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, selectedZampian])

  function handleSelect(z) {
    onChange(z)
    setQuery(z.name)
    setOpen(false)
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40 focus:border-zamp-400 placeholder:text-gray-300 disabled:opacity-50 disabled:bg-gray-50"
        />
        {value && !disabled && (
          <button type="button" onClick={handleClear} className="text-gray-300 hover:text-gray-500">
            <X size={14} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto"
          onMouseDown={e => e.preventDefault()}
        >
          {suggestions.map(z => (
            <li key={z.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-zamp-50 transition-colors text-[13px]"
                onClick={() => handleSelect(z)}
              >
                <span className="font-medium text-gray-800">{z.name}</span>
                {z.email && <span className="text-gray-400 ml-1.5 text-[11px]">({z.email})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && suggestions.length === 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-[13px] text-gray-400">
          No matches for "{query}"
        </div>
      )}
    </div>
  )
}
