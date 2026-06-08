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
