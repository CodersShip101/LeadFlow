export function getSourceInfo(url: string | null) {
  if (!url) return { label: 'Remote', color: '#7C3AED', bg: '#F0EFFE' }
  if (url.includes('linkedin'))    return { label: 'LinkedIn',   color: '#0A66C2', bg: '#EBF1FC' }
  if (url.includes('indeed'))      return { label: 'Indeed',     color: '#2164F3', bg: '#EBF1FC' }
  if (url.includes('reed'))        return { label: 'Reed',       color: '#1B6B4A', bg: '#EBF5F0' }
  if (url.includes('cwjobs'))      return { label: 'CWJobs',    color: '#7C3AED', bg: '#F0EFFE' }
  if (url.includes('totaljobs'))   return { label: 'Totaljobs', color: '#D97706', bg: '#FEF3E2' }
  if (url.includes('reddit'))      return { label: 'Reddit',     color: '#EA580C', bg: '#FEF0EB' }
  if (url.includes('remotive'))    return { label: 'Remotive',   color: '#1B6B4A', bg: '#EBF5F0' }
  if (url.includes('weworkremotely')) return { label: 'WWR',    color: '#2563EB', bg: '#EBF1FC' }
  if (url.includes('upwork'))      return { label: 'Upwork',    color: '#6FDA44', bg: '#EBF5F0' }
  if (url.includes('freelancer'))  return { label: 'Freelancer', color: '#2563EB', bg: '#EBF1FC' }
  if (url.includes('peopleperhour')) return { label: 'PPH',     color: '#7C3AED', bg: '#F0EFFE' }
  return { label: 'Remote', color: '#7C3AED', bg: '#F0EFFE' }
}

export function formatBudgetGBP(min: number | null, max: number | null) {
  if (!min && !max) return null
  if (min && max) return `£${min}—${max}`
  if (min) return `From £${min}`
  return `Up to £${max}`
}

export function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function isNewLead(date: string, hours = 48) {
  return Date.now() - new Date(date).getTime() < hours * 3600000
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const ukPlaces = [
  'uk', 'united kingdom', 'britain', 'england', 'scotland', 'wales', 'northern ireland',
  'london', 'manchester', 'birmingham', 'leeds', 'edinburgh', 'glasgow', 'bristol',
  'liverpool', 'newcastle', 'sheffield', 'cardiff', 'belfast', 'aberdeen', 'nottingham',
  'leicester', 'oxford', 'cambridge', 'brighton', 'southampton', 'portsmouth',
  'reading', 'bath', 'york', 'exeter', 'dundee', 'swansea', 'coventry', 'hull',
  'plymouth', 'derby', 'milton keynes',
]

const nonUkPlaces = [
  'us', 'usa', 'united states', 'america', 'canada', 'australia', 'germany', 'france',
  'spain', 'italy', 'india', 'china', 'japan', 'brazil', 'mexico', 'netherlands',
  'switzerland', 'sweden', 'norway', 'denmark', 'finland', 'belgium', 'austria',
  'ireland', 'new zealand', 'singapore', 'dubai', 'uae', 'hong kong',
]

export function isUKLead(location: string | null, sourceUrl: string | null): boolean {
  const loc = (location || '').toLowerCase().trim()
  const url = (sourceUrl || '').toLowerCase()

  // If location mentions a UK place → keep
  if (loc && ukPlaces.some(p => loc.includes(p))) return true
  // If location mentions a non-UK place and no UK place → reject
  if (loc && nonUkPlaces.some(p => loc.includes(p))) return false
  // If source URL is UK-specific → keep
  if (url.includes('.co.uk') || url.includes('reed.co.uk') || url.includes('cwjobs.co.uk') ||
      url.includes('totaljobs.com') || url.includes('indeed.co.uk')) return true
  // If location is empty or ambiguous → keep (assume UK)
  return true
}
