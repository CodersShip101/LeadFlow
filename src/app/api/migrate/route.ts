import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

const STATEMENTS = [
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disciplines text[] DEFAULT NULL;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT NULL;`,
  `ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome text DEFAULT NULL;`,
  `ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_at timestamptz DEFAULT NULL;`,
]

const RLS_STATEMENTS = [
  `CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);`,
  `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);`,
  `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);`,
  `CREATE POLICY "Anyone can view active leads" ON leads FOR SELECT USING (status = 'active');`,
]

const MANUAL_SQL = [...STATEMENTS, ...RLS_STATEMENTS].join('\n')

export async function POST() {
  try {
    const supabase = createAdminSupabase()

    // Try exec_sql (created via Supabase docs). If missing, return SQL for manual run.
    const { error: testErr } = await supabase.rpc('exec_sql', { query: 'SELECT 1' })
    if (testErr && testErr.message.includes('function') && testErr.message.includes('not found')) {
      return NextResponse.json({
        error: 'exec_sql function not found. Run this SQL in your Supabase dashboard SQL editor, then refresh the schema cache:',
        instructions: [
          '1. Go to https://supabase.com/dashboard → your project → SQL Editor',
          '2. Paste and run the SQL below',
          '3. Go to Settings → API → scroll to "Schema cache" → click "Refresh"',
        ],
        sql: MANUAL_SQL,
      }, { status: 200 })
    }
    if (testErr) {
      // exec_sql exists but errored — possibly permission issue
      return NextResponse.json({ error: testErr.message, sql: MANUAL_SQL }, { status: 500 })
    }

    const failures: string[] = []
    for (const query of STATEMENTS) {
      const { error } = await supabase.rpc('exec_sql', { query })
      if (error) failures.push(`${query.slice(0, 60)}... → ${error.message}`)
    }

    if (failures.length > 0) {
      return NextResponse.json({ error: 'Some statements failed', sql: MANUAL_SQL, detail: failures }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Schema up to date. Refresh the schema cache in Supabase dashboard if errors persist.',
    })
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Unknown error',
      sql: MANUAL_SQL,
    }, { status: 500 })
  }
}
