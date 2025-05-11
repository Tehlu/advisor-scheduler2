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
    <div>
      <nav className="navbar">
        <div className="container navbar-content">
          <h1 className="navbar-title">Advisor Scheduler</h1>
          <div className="navbar-user">
            <span className="user-email">{user?.email}</span>
            <button
              className="button button-danger"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="container dashboard">
        <div className="dashboard-card">
          <h2 className="dashboard-title">Welcome to your Dashboard</h2>
          <p className="dashboard-subtitle">
            This is where you'll manage your schedule and appointments.
          </p>
        </div>
      </main>
    </div>
  )
} 