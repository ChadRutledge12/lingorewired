'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogoMark, RED as BRAND_RED } from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'

// Where the password-reset email link lands. Supabase's client
// (detectSessionInUrl) turns the recovery token in the URL into a temporary
// session, after which updateUser can set the new password.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // The recovery link fires a PASSWORD_RECOVERY auth event once the token
    // in the URL is consumed; either that or an existing session means we can
    // let them set a new password.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push('/decks')
      router.refresh()
    } catch (err) {
      setError(err.message || 'Could not update your password. The link may have expired — request a new one.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f1442]">
      <div className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3" role="img" aria-label="LingoRewired">
          <LogoMark className="size-10 sm:size-14" />
          <span className="font-display text-xl sm:text-3xl font-semibold tracking-tight leading-none" aria-hidden="true">
            <span className="text-foreground dark:text-white">Lingo</span><span style={{ color: BRAND_RED }}>Rewired</span>
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-medium mb-3 text-foreground dark:text-white">Set a new password</h1>
          <p className="text-muted-foreground dark:text-white/60 text-base mb-7">Choose a new password for your account.</p>

          {error && (
            <Alert variant="destructive" className="mb-4 dark:bg-red-500/10 dark:border-red-400/30 text-left">
              <AlertDescription className="dark:text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {!ready && !error ? (
            <div className="flex items-center justify-center gap-2 text-base text-muted-foreground dark:text-white/60 py-4">
              <Loader2 className="size-4 animate-spin" /> Verifying your reset link…
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3 text-left">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
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
              <Button type="submit" disabled={saving || !ready} className="w-full h-12 rounded-xl text-base mt-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
