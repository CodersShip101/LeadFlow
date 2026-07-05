import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const { error } = await admin.from('profiles').select('pre_team_status').limit(1)
if (error) {
  console.log('Column missing. Paste supabase/RUN_THIS_team_prior_plan.sql into')
  console.log('Supabase -> SQL Editor -> Run, then re-run this script. Detail:', error.message)
  process.exit(1)
}
console.log('OK - pre_team_status present')
