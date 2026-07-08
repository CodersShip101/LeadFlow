// Confirms the email on the owner's own account (smamdou111@gmail.com) so
// sign-in works — the Supabase signup confirmation email never arrived.
// Run from the project root: node e2e/fix-account.mjs
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const { data, error } = await admin.auth.admin.updateUserById(
  'ea667498-0b34-43bb-9d51-65be1d18f85c', // smamdou111@gmail.com (verified earlier)
  { email_confirm: true },
)
if (error) { console.log('ERROR:', error.message); process.exit(1) }
console.log('OK — email_confirmed_at:', data.user.email_confirmed_at)
console.log('You can now sign in with your original password, or use forgot-password.')
