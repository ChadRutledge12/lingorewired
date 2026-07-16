'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function DeleteDeckButton({ deckId, deckName }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete deck')
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${deckName}`}
          className="text-muted-foreground hover:text-destructive dark:text-white/40 dark:hover:text-red-400 dark:hover:bg-white/10 shrink-0">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{deckName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the deck and all its cards and review history. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleDelete() }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Delete deck
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
