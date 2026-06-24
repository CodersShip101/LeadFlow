// lib/supabase.ts
// ---------------------------------------------------------------------------
// Server-side Supabase clients for the Next.js App Router.
//  - createServerClient(): respects the signed-in user's RLS (cookie-based)
//  - createAdminClient():  service-role, bypasses RLS — use ONLY in trusted
//                          server code (webhooks, cross-user aggregates).
// Requires: @supabase/ssr  @supabase/supabase-js
// ---------------------------------------------------------------------------
import { cookies } from 'next/headers';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore; middleware refreshes.
        }
      },
    },
  });
}

// Service-role client. NEVER import this into client components.
export function createAdminClient() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// Small helper: get the current user or throw a 401-able error.
export async function requireUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return { supabase, user };
}
