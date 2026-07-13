import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoLink } from '@/components/Logo'

export const metadata = {
  title: 'Why LingoRewired — our philosophy',
  description:
    'After thousands of Spanish lessons, one thing became clear: you remember the language you can see yourself in. This is the thinking behind LingoRewired.',
}

// Public, server-rendered persuasion page. First-person teacher voice.
// NOTE: draft copy — the founder should edit this to match their own wording.
export default function PhilosophyPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <LogoLink />
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </div>

        <article className="space-y-6">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-primary">Our philosophy</p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-foreground">
              You remember the language you can see yourself in.
            </h1>
            <p className="text-lg text-muted-foreground">
              After thousands of Spanish lessons, that one idea changed how I teach — and it&apos;s the reason this app exists.
            </p>
          </header>

          <div className="space-y-5 text-[15px] leading-relaxed text-foreground/90">
            <p>
              Most flashcard apps are built one-size-fits-all. Every learner is marched through the same generic word lists,
              memorizing hundreds of terms that have little to do with their actual life. You drill vocabulary you don&apos;t
              need and may never use, and the words you <em>do</em> care about — the ones from your work, your hobbies, your
              relationships, the trip you&apos;re planning — never show up.
            </p>
            <p>
              I&apos;ve watched motivated students spend hours this way and still freeze in a real conversation. Not because
              they didn&apos;t work hard, but because the words never connected to anything real for them. Memory doesn&apos;t
              hold on to what&apos;s generic. It holds on to what&apos;s <em>ours</em> — what&apos;s tied to our experiences,
              our interests, our emotions, our goals.
            </p>

            <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5 sm:p-6">
              <p className="text-base font-medium text-foreground">
                The best lessons I ever taught weren&apos;t built from a textbook. They were built from the student in front of me.
              </p>
            </div>

            <p>
              So LingoRewired starts from you. Your vocabulary is split into two simple, honest kinds:
            </p>
            <ul className="space-y-3 pl-1">
              <li className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <span>
                  <strong className="text-foreground">Personal vocabulary</strong> — the words drawn from your own interests,
                  work, routines, relationships, and goals. This is the heart of it, because this is the language you&apos;ll
                  actually reach for.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" />
                <span>
                  <strong className="text-foreground">Essential vocabulary</strong> — the high-frequency, foundational words
                  every speaker needs. These still matter enormously — but they stick far better when they&apos;re learned
                  <em> alongside</em> your personal words, in sentences and stories you care about, instead of in isolation.
                </span>
              </li>
            </ul>

            <p>
              That&apos;s the whole idea: essential fluency, learned through a lens that&apos;s unmistakably yours. Words in
              real context. Stories built from your own set. A system that keeps adapting to you instead of forcing you down
              the same path as everyone else.
            </p>
            <p>
              Language isn&apos;t a list to be memorized. It&apos;s a way of describing your life. The more the Spanish you
              study reflects that life, the more of it you&apos;ll keep — and the sooner it becomes yours to speak.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            <Button asChild className="rounded-xl">
              <Link href="/login?next=/&mode=signup">Build your personalized set</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-xl">
              <Link href="/">Back to app</Link>
            </Button>
          </div>
        </article>
      </div>
    </div>
  )
}
