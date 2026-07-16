'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Mounts as a no-op until hydrated — next-themes can't know the persisted
// theme during SSR, so rendering the real icon before mount would flash
// the wrong one.
export default function ThemeToggle({ className = '' }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className={`size-9 ${className}`} />

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`rounded-full border-foreground/20 text-foreground hover:bg-foreground/10 dark:border-white/30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 ${className}`}
    >
      {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </Button>
  )
}
