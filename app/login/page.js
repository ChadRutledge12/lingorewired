'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { LogoMark, RED as BRAND_RED } from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
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
  // The auth callback redirects here with ?error=... when an email link is bad
  // or expired; show that instead of a silent bounce.
  const [error, setError] = useState(params.get('error') || '')
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
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
          })
        )
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f1442]">
      <div className="px-6 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-3" role="img" aria-label="LingoRewired">
          <LogoMark className="size-10 sm:size-14" />
          <span className="font-display text-xl sm:text-3xl font-semibold tracking-tight leading-none" aria-hidden="true">
            <span className="text-foreground dark:text-white">Lingo</span><span style={{ color: BRAND_RED }}>Rewired</span>
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <Link href="/" className="inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground dark:text-white/60 dark:hover:text-white">
            <ArrowLeft className="size-4" /> Back to app
          </Link>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-medium mb-3 text-foreground dark:text-white">{title}</h1>
          <p className="text-muted-foreground dark:text-white/60 text-base mb-7">{subtitle}</p>

          {error && (
            <Alert variant="destructive" className="mb-4 dark:bg-red-500/10 dark:border-red-400/30 text-left">
              <AlertDescription className="dark:text-red-200">{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="mb-4 dark:bg-white/10 dark:border-white/20 text-left">
              <AlertDescription className="dark:text-white/80">{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-3 text-left">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="h-12 rounded-xl px-4 text-base dark:bg-white/5 dark:border-white/20 dark:text-white dark:placeholder:text-white/40 dark:focus-visible:border-white/40 dark:focus-visible:ring-white/20"
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
                  className="h-12 rounded-xl px-4 pr-11 text-base dark:bg-white/5 dark:border-white/20 dark:text-white dark:placeholder:text-white/40 dark:focus-visible:border-white/40 dark:focus-visible:ring-white/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white/90">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            )}
            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => switchMode('reset')} className="text-sm text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white/90">
                  Forgot password?
                </button>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base mt-2">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </form>

          <p className="text-muted-foreground dark:text-white/60 text-sm mt-7 text-center">
            {mode === 'reset' ? (
              <button type="button" onClick={() => switchMode('login')} className="font-medium text-primary hover:underline dark:text-[#A5B4FC]">
                Back to log in
              </button>
            ) : (
              <>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-medium text-primary hover:underline dark:text-[#A5B4FC]">
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
