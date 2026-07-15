'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { LogoMark, RED as BRAND_RED } from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Guards an auth call against hanging indefinitely — a slow/stuck request
// should surface a friendly retry message in a few seconds, not leave the
// button spinning for ~40s with no feedback.
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('This is taking longer than expected — check your connection and try again.')), ms)
    ),
  ])
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/decks'

  // 'login' | 'signup' | 'reset'
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setMessage('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const supabase = createClient()
    try {
      if (mode === 'reset') {
        const { error } = await withTimeout(
          supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        )
        if (error) throw error
        setMessage('If an account exists for that email, a password reset link is on its way. Check your inbox.')
        setMode('login')
      } else if (mode === 'signup') {
        const { data, error } = await withTimeout(supabase.auth.signUp({ email, password }))
        if (error) throw error
        if (data.session) {
          router.push(next)
          router.refresh()
        } else {
          setMessage('Account created. Check your email to confirm, then log in.')
          setMode('login')
        }
      } else {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }))
        if (error) throw error
        router.push(next)
        router.refresh()
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'
  const subtitle =
    mode === 'login' ? 'Log in to save decks and review your vocabulary.'
      : mode === 'signup' ? 'Sign up to save flashcards and track your progress.'
        : 'Enter your email and we’ll send you a link to set a new password.'
  const submitLabel = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Send reset link'

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1442]">
      <div className="px-6 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-3" role="img" aria-label="LingoRewired">
          <LogoMark className="size-12 sm:size-16" />
          <span className="font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-none" aria-hidden="true">
            <span className="text-white">Lingo</span><span style={{ color: BRAND_RED }}>Rewired</span>
          </span>
        </div>
        <Link href="/" className="shrink-0 inline-flex items-center gap-1 text-base text-white/60 hover:text-white">
          <ArrowLeft className="size-4" /> Back to app
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="bg-card text-card-foreground rounded-2xl shadow-sm ring-1 ring-foreground/10 p-6 sm:p-8 w-full max-w-sm">
          <h1 className="text-2xl font-semibold mb-1 text-foreground">{title}</h1>
          <p className="text-muted-foreground text-sm mb-6">{subtitle}</p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            {mode !== 'reset' && (
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            )}
            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => switchMode('reset')} className="text-xs text-muted-foreground hover:text-foreground">
                  Forgot password?
                </button>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            {mode === 'reset' ? (
              <button type="button" onClick={() => switchMode('login')} className="font-medium text-primary hover:underline">
                Back to log in
              </button>
            ) : (
              <>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-medium text-primary hover:underline">
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
