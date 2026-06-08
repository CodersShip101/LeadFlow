import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = createAdminSupabase()

    const { error: colError } = await supabase.rpc('exec_sql', {
      query: `ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome text DEFAULT NULL;`,
    })

    if (colError) {
      const { error: colError2 } = await supabase.rpc('exec_sql', {
        query: `ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_at timestamptz DEFAULT NULL;`,
      })
      if (colError2) {
        const { error: fallback } = await supabase.from('applications').select('outcome').limit(1)
        if (fallback?.message?.includes('column') && fallback?.message?.includes('exist')) {
          return NextResponse.json({
            error: 'Migration failed. Run this SQL in your Supabase dashboard SQL editor: ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome text DEFAULT NULL; ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_at timestamptz DEFAULT NULL;',
            detail: colError.message,
          }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Schema up to date' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
