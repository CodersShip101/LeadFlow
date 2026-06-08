'use client'

import { useEffect, useState } from 'react'

export default function SignupCounter() {
  const [count, setCount] = useState(2847)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="text-sm font-semibold" style={{ color: '#1B6B4A' }}>
      {count.toLocaleString()}
    </span>
  )
}
