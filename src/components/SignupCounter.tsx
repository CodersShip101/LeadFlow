'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function SignupCounter() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .then(({ count }) => setCount(count ?? 0))
  }, [])
  if (count === null) return null
  return <>{count >= 500 ? `${Math.floor(count / 100) * 100}+` : count}</>
}
