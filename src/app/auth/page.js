'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const router = useRouter()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error:', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #F6F8FB 100%)',
        fontFamily: 'var(--font-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          boxShadow: '0 8px 32px rgba(26,46,68,0.12)',
          borderRadius: '1.5rem',
          padding: '2.5rem 2rem',
          maxWidth: '26rem',
          width: '100%',
          margin: '0 1rem',
          textAlign: 'center',
          border: '2px solid var(--color-border)',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111',
            marginBottom: '1.5rem',
          }}
        >
          Welcome Back
        </h1>
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: '0.75rem',
            background: 'var(--color-blue)',
            color: '#111',
            fontWeight: 700,
            fontSize: '1.05rem',
            fontFamily: 'var(--font-main)',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 8px rgba(79,143,249,0.08)',
          }}
        >
          <svg
            style={{ height: '1.5rem', width: '1.5rem' }}
            viewBox="0 0 48 48"
          >
            <g>
              <path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.64 2.7 30.18 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.2C12.13 13.98 17.56 9.5 24 9.5z"/>
              <path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/>
              <path fill="#FBBC05" d="M10.67 28.29c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.2C.86 15.1 0 19.41 0 24c0 4.59.86 8.9 2.69 12.24l7.98-6.2z"/>
              <path fill="#EA4335" d="M24 48c6.18 0 11.64-2.03 15.54-5.53l-7.19-5.6c-2.01 1.35-4.59 2.13-8.35 2.13-6.44 0-11.87-4.48-13.33-10.54l-7.98 6.2C6.73 42.18 14.82 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </g>
          </svg>
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
} 