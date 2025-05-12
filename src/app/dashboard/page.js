'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
      } catch (error) {
        console.error('Error:', error.message)
        router.push('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [supabase, router])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/auth')
    } catch (error) {
      console.error('Error:', error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-main)',
        padding: '2rem',
      }}
    >
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--color-primary)',
          marginBottom: '2rem',
        }}
      >
        Dashboard
      </h1>
      <div
        style={{
          background: 'var(--color-sidebar)',
          borderRadius: '1rem',
          boxShadow: '0 2px 12px rgba(26,46,68,0.06)',
          padding: '2rem',
          border: '1px solid var(--color-border)',
          color: 'var(--color-primary)',
        }}
      >
        <p style={{ color: 'var(--color-secondary)', fontSize: '1.1rem' }}>
          Welcome to your dashboard. Here you can manage your meetings, view your calendar, and update your profile.
        </p>
      </div>
    </div>
  )
} 