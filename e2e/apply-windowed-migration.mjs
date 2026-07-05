import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const { error } = await admin.from('profiles').select('leads_week_count, leads_week_anchor').limit(1)
if (error) {
  console.log('Columns missing. Paste supabase/RUN_THIS_free_windowed_leads.sql into')
  console.log('Supabase -> SQL Editor -> Run, then re-run this script. Detail:', error.message)
  process.exit(1)
}
console.log('OK - leads_week_count + leads_week_anchor present')
