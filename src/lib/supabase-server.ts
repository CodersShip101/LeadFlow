import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}

export function createAdminSupabase() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

type AnySupabase =
  | Awaited<ReturnType<typeof createServerSupabase>>
  | ReturnType<typeof createAdminSupabase>

// Look up display names for a set of user ids.
// PostgREST can't embed profiles into org_members (no FK relationship is
// registered), so we resolve names in a second query and merge in JS.
export async function fullNamesByUserId(
  client: AnySupabase,
  ids: string[],
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map()
  const { data } = await client.from('profiles').select('id, full_name').in('id', ids)
  return new Map((data ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? null]))
}

export async function requireUser() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Response('Unauthorized', { status: 401 })
  return { supabase, user }
}
