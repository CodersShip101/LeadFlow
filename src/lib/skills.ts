// Shared discipline → skills taxonomy.
// Used by onboarding (category screens) and reusable on the dashboard for
// "popular skills" suggestions.

export interface Discipline {
  id: string
  label: string
  /** tabler/lucide icon name without the `ti-` prefix */
  icon: string
  /** CSS color used as the section accent */
  accent: string
  accentBg: string
}

export const DISCIPLINES: Discipline[] = [
  { id: 'development', label: 'Development', icon: 'code', accent: '#2563EB', accentBg: 'rgba(37,99,235,.1)' },
  { id: 'design', label: 'Design', icon: 'palette', accent: '#7C3AED', accentBg: 'rgba(124,58,237,.1)' },
  { id: 'writing', label: 'Writing & Content', icon: 'pencil', accent: '#0891B2', accentBg: 'rgba(8,145,178,.1)' },
  { id: 'marketing', label: 'Marketing', icon: 'speakerphone', accent: '#EA580C', accentBg: 'rgba(234,88,12,.1)' },
  { id: 'video', label: 'Video & Motion', icon: 'video', accent: '#DB2777', accentBg: 'rgba(219,39,119,.1)' },
  { id: 'operations', label: 'Ops & Admin', icon: 'briefcase', accent: '#16A34A', accentBg: 'rgba(22,163,74,.1)' },
]

export const SKILLS_BY_DISCIPLINE: Record<string, string[]> = {
  development: ['React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'Python', 'Node.js', 'PHP', 'WordPress', 'Ruby on Rails', 'Go', 'AWS', 'DevOps', 'Mobile (iOS/Android)'],
  design: ['Figma', 'UI Design', 'UX Design', 'Design Systems', 'Branding', 'Illustration', 'Webflow', 'Product Design', 'Prototyping'],
  writing: ['Copywriting', 'Content Writing', 'SEO', 'Technical Writing', 'Editing', 'Ghostwriting', 'Scriptwriting'],
  marketing: ['SEO', 'Paid Ads', 'Email Marketing', 'Social Media', 'Growth', 'Content Strategy', 'Analytics', 'CRM'],
  video: ['Video Editing', 'Motion Graphics', 'After Effects', 'Animation', 'Photography', '3D'],
  operations: ['Project Management', 'Virtual Assistance', 'Bookkeeping', 'Consulting', 'Customer Support', 'Data Entry', 'Recruiting'],
}

/** All unique skills, used for global search in onboarding. */
export const ALL_SKILLS: string[] = Array.from(
  new Set(Object.values(SKILLS_BY_DISCIPLINE).flat())
).sort((a, b) => a.localeCompare(b))

/** Skills relevant to a set of chosen disciplines (deduped, order-preserved). */
export function skillsForDisciplines(disciplineIds: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of disciplineIds) {
    for (const s of SKILLS_BY_DISCIPLINE[id] || []) {
      if (!seen.has(s)) { seen.add(s); out.push(s) }
    }
  }
  return out
}

export function disciplineById(id: string): Discipline | undefined {
  return DISCIPLINES.find(d => d.id === id)
}
