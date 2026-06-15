'use client'

// Smarter search (UXUI Playbook, Top 5 Part 3 #2): tapping the search bar is a
// moment of intent. Instead of a blank dead-end we surface recent + popular
// searches on focus to reduce friction, and the query actually filters the feed.
// Shared via context because the input lives in the dashboard layout while the
// feed that consumes it is a separate route under that layout.

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

type SearchCtx = { query: string; setQuery: (q: string) => void }
const Ctx = createContext<SearchCtx | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  return <Ctx.Provider value={{ query, setQuery }}>{children}</Ctx.Provider>
}

export function useSearch(): SearchCtx {
  return useContext(Ctx) ?? { query: '', setQuery: () => {} }
}

const POPULAR_FALLBACK: [string, string][] = [
  ['Next.js', '312 leads'],
  ['UI design', '204 leads'],
  ['£500+/day', '98 leads'],
]

const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem('recentSearches') || '[]') } catch { return [] }
}

export default function TopbarSearch() {
  const { query, setQuery } = useSearch()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [popular, setPopular] = useState<[string, string][]>(POPULAR_FALLBACK)
  const router = useRouter()

  const loadSuggestions = useCallback(async () => {
    setRecent(readRecent().slice(0, 3))
    try {
      const r = await fetch('/api/search/suggest')
      if (!r.ok) return
      const d = await r.json()
      if (Array.isArray(d.recent) && d.recent.length) setRecent(d.recent.slice(0, 3))
      if (Array.isArray(d.popular) && d.popular.length) {
        setPopular(d.popular
          .map((p: { query?: string; count?: number }) => [p.query ?? '', p.count != null ? `${p.count} leads` : ''] as [string, string])
          .filter(([q]: [string, string]) => q))
      }
    } catch { /* keep fallback — DB objects may not be provisioned yet */ }
  }, [])

  const submit = useCallback((raw: string) => {
    const q = raw.trim()
    setQuery(q)
    setOpen(false)
    if (q) {
      const next = [q, ...readRecent().filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 8)
      try { localStorage.setItem('recentSearches', JSON.stringify(next)) } catch { /* ignore */ }
      fetch('/api/search/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) }).catch(() => {})
    }
    router.push('/dashboard')
  }, [router, setQuery])

  return (
    <div className="tb-search search-wrap">
      <i className="ti ti-search"></i>
      <input
        id="searchInput"
        placeholder="Search leads&hellip;"
        aria-label="Search leads"
        autoComplete="off"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setOpen(true); loadSuggestions() }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === 'Enter') submit(query) }}
      />
      <div className={`suggest${open ? ' show' : ''}`} id="suggestBox">
        {recent.length > 0 && (
          <>
            <div className="suggest-label">Recent</div>
            {recent.map(q => (
              <div key={q} className="suggest-item" onMouseDown={() => submit(q)}>
                <i className="ti ti-history"></i>{q}
              </div>
            ))}
          </>
        )}
        <div className="suggest-label">Popular this week</div>
        {popular.map(([q, n]) => (
          <div key={q} className="suggest-item" onMouseDown={() => submit(q)}>
            <i className="ti ti-trending-up"></i>{q}<span className="tag">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
