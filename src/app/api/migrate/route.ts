import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

// Idempotent schema statements. Run via POST /api/migrate.
const STATEMENTS = [
  `ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome text DEFAULT NULL;`,
  `ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_at timestamptz DEFAULT NULL;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disciplines text[] DEFAULT NULL;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT NULL;`,
]

const MANUAL_SQL = STATEMENTS.join('\n')

export async function POST() {
  try {
    const supabase = createAdminSupabase()
    const failures: string[] = []

    for (const query of STATEMENTS) {
      const { error } = await supabase.rpc('exec_sql', { query })
      if (error) failures.push(`${query} -> ${error.message}`)
    }

    if (failures.length > 0) {
      return NextResponse.json({
        error: 'Some statements failed. Run this SQL in your Supabase dashboard SQL editor, then enable "Confirm email" under Auth → Providers → Email.',
        sql: MANUAL_SQL,
        detail: failures,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Schema up to date',
      reminder: 'Ensure "Confirm email" is enabled in Supabase Auth settings for the verification gate to work.',
    })
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Unknown error',
      sql: MANUAL_SQL,
    }, { status: 500 })
  }
}
