'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Logo from '@/components/Logo'

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
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 sm:p-6">
      <div className="bg-card text-card-foreground rounded-2xl shadow-sm ring-1 ring-foreground/10 p-6 sm:p-8 w-full max-w-sm">
        <Logo className="mb-5" />
        <h1 className="text-2xl font-semibold mb-1 text-foreground">Set a new password</h1>
        <p className="text-muted-foreground text-sm mb-6">Choose a new password for your account.</p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!ready && !error ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="size-4 animate-spin" /> Verifying your reset link…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
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
            <Button type="submit" disabled={saving || !ready} className="w-full h-11 rounded-xl">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
