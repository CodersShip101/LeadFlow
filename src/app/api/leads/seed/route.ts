import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

const DEMO_LEADS = [
  {
    source: 'reddit',
    source_url: 'https://reddit.com/r/forhire/',
    title: 'Senior React Developer — FinTech',
    description: 'Looking for an experienced React developer to build out a new trading dashboard. Must have deep knowledge of React, TypeScript, and real-time data visualisation. The role is fully remote with a London-based team. You will be working on greenfield projects from day one.',
    budget_text: '£500–650/day',
    budget_min: 500,
    budget_max: 650,
    client_location: 'London (remote)',
    project_type: 'Contract',
    skills_required: ['React', 'TypeScript', 'D3.js', 'GraphQL', 'Node.js'],
    ir35: 'outside',
    posted_date: new Date(Date.now() - 2 * 3600000).toISOString(),
    applicants: 4,
    detail_score: 8,
    expiry_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'reed',
    source_url: 'https://reed.co.uk/',
    title: 'Full Stack Engineer — SaaS Platform',
    description: 'Join a fast-growing SaaS startup building AI-powered workflow tools. We need a full-stack engineer comfortable with Next.js, PostgreSQL, and AWS. You will own features end-to-end from frontend to infrastructure.',
    budget_text: '£70k–90k',
    budget_min: 337,
    budget_max: 433,
    client_location: 'Manchester (hybrid)',
    project_type: 'Permanent',
    skills_required: ['Next.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Python', 'Docker'],
    ir35: 'unknown',
    posted_date: new Date(Date.now() - 12 * 3600000).toISOString(),
    applicants: 12,
    detail_score: 7,
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'reed',
    source_url: 'https://reed.co.uk/',
    title: 'Frontend Developer — E‑commerce',
    description: 'Leading e-commerce brand needs a frontend developer to build and maintain their customer-facing React Native mobile app and Next.js web experience. Strong design sensibility and performance optimisation skills required.',
    budget_text: '£55k–70k',
    budget_min: 264,
    budget_max: 337,
    client_location: 'Bristol',
    project_type: 'Permanent',
    skills_required: ['React Native', 'Next.js', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'Storybook'],
    ir35: 'unknown',
    posted_date: new Date(Date.now() - 24 * 3600000).toISOString(),
    applicants: 18,
    detail_score: 6,
    expiry_date: new Date(Date.now() + 21 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'wwr',
    source_url: 'https://weworkremotely.com/',
    title: 'Remote Backend Engineer — Go & Postgres',
    description: 'We are building the next generation of developer tooling. As a Backend Engineer you will design and implement high-throughput APIs, manage our Postgres fleet, and contribute to our open-source SDK. Distributed team across EU timezones.',
    budget_text: '$120k–150k',
    budget_min: 475,
    budget_max: 594,
    client_location: 'Remote (EU)',
    project_type: 'Contract',
    skills_required: ['Go', 'PostgreSQL', 'Redis', 'gRPC', 'Kubernetes', 'Terraform'],
    ir35: 'outside',
    posted_date: new Date(Date.now() - 6 * 3600000).toISOString(),
    applicants: 7,
    detail_score: 9,
    expiry_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'rok',
    source_url: 'https://remoteok.com/',
    title: 'UI/UX Designer — Design Systems',
    description: 'Help us build and maintain a world-class design system used by millions. You will work closely with engineering to create accessible, performant components. Strong Figma skills and React knowledge are essential.',
    budget_text: '$90k–120k',
    budget_min: 356,
    budget_max: 475,
    client_location: 'Remote (global)',
    project_type: 'Permanent',
    skills_required: ['Figma', 'React', 'TypeScript', 'CSS', 'Storybook', 'Design Systems'],
    ir35: 'unknown',
    posted_date: new Date(Date.now() - 48 * 3600000).toISOString(),
    applicants: 23,
    detail_score: 8,
    expiry_date: new Date(Date.now() + 45 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'reddit',
    source_url: 'https://reddit.com/r/forhire/',
    title: 'Python Data Engineer — ETF Pricing',
    description: 'Hedge fund seeks a data engineer to build and maintain real-time ETF pricing pipelines. Strong Python, SQL, and AWS experience required. Knowledge of financial data (Bloomberg, Reuters) is a big plus.',
    budget_text: '£600–800/day',
    budget_min: 600,
    budget_max: 800,
    client_location: 'London',
    project_type: 'Contract',
    skills_required: ['Python', 'SQL', 'AWS', 'Airflow', 'Spark', 'Kafka'],
    ir35: 'outside',
    posted_date: new Date(Date.now() - 8 * 3600000).toISOString(),
    applicants: 3,
    detail_score: 8,
    expiry_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'reddit',
    source_url: 'https://reddit.com/r/forhire/',
    title: 'WordPress Developer — Agency Retainer',
    description: 'Digital agency looking for a WordPress developer to take over a retainer client. Custom theme development, ACF, WooCommerce, and performance optimisation. Approximately 20h/week with potential to grow.',
    budget_text: '£250–350/day',
    budget_min: 250,
    budget_max: 350,
    client_location: 'Remote (UK)',
    project_type: 'Contract',
    skills_required: ['WordPress', 'PHP', 'JavaScript', 'ACF', 'WooCommerce', 'SCSS'],
    ir35: 'outside',
    posted_date: new Date(Date.now() - 36 * 3600000).toISOString(),
    applicants: 15,
    detail_score: 6,
    expiry_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'wwr',
    source_url: 'https://weworkremotely.com/',
    title: 'DevOps Engineer — Platform Team',
    description: 'Join the platform engineering team to build internal developer tools and infrastructure. You will design CI/CD pipelines, manage multi-cloud k8s clusters, and build self-service tooling for 200+ engineers.',
    budget_text: '$130k–160k',
    budget_min: 515,
    budget_max: 634,
    client_location: 'Remote (US)',
    project_type: 'Permanent',
    skills_required: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD', 'Docker', 'Bash'],
    ir35: 'unknown',
    posted_date: new Date(Date.now() - 3 * 3600000).toISOString(),
    applicants: 9,
    detail_score: 9,
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'rok',
    source_url: 'https://remoteok.com/',
    title: 'Senior Product Manager — B2B SaaS',
    description: 'We are looking for a Senior Product Manager to own the roadmap for our analytics platform. You will work with a distributed team of engineers and designers, conduct user research, and define OKRs. Background in data products preferred.',
    budget_text: '$110k–140k',
    budget_min: 436,
    budget_max: 554,
    client_location: 'Remote (global)',
    project_type: 'Permanent',
    skills_required: ['Product Management', 'Data Analytics', 'SQL', 'A/B Testing', 'Roadmapping'],
    ir35: 'unknown',
    posted_date: new Date(Date.now() - 72 * 3600000).toISOString(),
    applicants: 31,
    detail_score: 7,
    expiry_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'active',
  },
  {
    source: 'reed',
    source_url: 'https://reed.co.uk/',
    title: 'Junior Frontend Developer — Green Energy',
    description: 'Exciting opportunity to join a clean energy startup. You will help build customer-facing dashboards and landing pages using React and TypeScript. Mentorship from senior engineers and clear progression path.',
    budget_text: '£30k–40k',
    budget_min: 144,
    budget_max: 192,
    client_location: 'Edinburgh',
    project_type: 'Permanent',
    skills_required: ['React', 'TypeScript', 'CSS', 'HTML', 'Git'],
    ir35: 'unknown',
    posted_date: new Date(Date.now() - 16 * 3600000).toISOString(),
    applicants: 42,
    detail_score: 7,
    expiry_date: new Date(Date.now() + 28 * 86400000).toISOString(),
    status: 'active',
  },
]

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminSupabase()

    const raw = req.nextUrl.searchParams.get('raw')
    if (raw) {
      const { data, error } = await admin.from('leads').select('*').limit(5)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const { count } = await admin.from('leads').select('*', { count: 'exact', head: true })
      return NextResponse.json({ totalLeads: count ?? 0, sample: data })
    }

    const { data: columns, error: colErr } = await admin.rpc('exec_sql', { query: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'leads'
      ORDER BY ordinal_position
    ` })
    if (colErr) {
      return NextResponse.json({ info: 'exec_sql not available', hint: 'Try GET /api/leads/seed?raw=1' }, { status: 200 })
    }

    return NextResponse.json({ columns })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const admin = createAdminSupabase()

    // Verify table exists first
    const { error: tableCheck } = await admin.from('leads').select('id').limit(1)
    if (tableCheck) {
      return NextResponse.json({ error: `Cannot access leads table: ${tableCheck.message}`, hint: 'Run the schema migration first via POST /api/migrate, then try again.' }, { status: 500 })
    }

    // Only skip if there are leads posted within the last 6 hours (likely already seeded)
    const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString()
    const { count: recentCount } = await admin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('posted_date', sixHoursAgo)

    if (recentCount && recentCount > 0) {
      return NextResponse.json({ message: 'Recent leads already exist — no action taken', count: 0 })
    }

    const { data, error } = await admin
      .from('leads')
      .insert(DEMO_LEADS)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Demo leads seeded', count: data?.length ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
