'use client'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Multiple-choice comprehension quiz, graded entirely client-side (each
// question already carries its correctIndex from generation — no separate
// grading call). Used identically for Read and Listen mode; the parent
// decides what happens after submit (e.g. revealing the transcript in
// listening mode) via `onSubmit`.
export default function ComprehensionQuiz({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  if (!questions || questions.length === 0) return null

  const allAnswered = questions.every((_, i) => answers[i] != null)
  const score = questions.filter((q, i) => answers[i] === q.correctIndex).length

  const selectOption = (qIndex, oIndex) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))
  }

  const check = () => {
    setSubmitted(true)
    onSubmit?.()
  }

  const retry = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Comprehension check</p>
        {submitted && (
          <p className="text-sm font-medium text-foreground shrink-0">{score} / {questions.length} correct</p>
        )}
      </div>
      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={qi}>
            <p className="mb-2 text-sm font-medium text-foreground">{qi + 1}. {q.question}</p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi
                const isCorrect = oi === q.correctIndex
                let stateClass = 'border-border hover:bg-muted'
                if (submitted && isCorrect) stateClass = 'border-emerald-500 bg-emerald-500/10'
                else if (submitted && selected) stateClass = 'border-red-500 bg-red-500/10'
                else if (selected) stateClass = 'border-primary bg-primary/10'
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={submitted}
                    onClick={() => selectOption(qi, oi)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-default ${stateClass}`}>
                    {submitted && isCorrect && <Check className="size-3.5 shrink-0 text-emerald-600" />}
                    {submitted && selected && !isCorrect && <X className="size-3.5 shrink-0 text-red-600" />}
                    <span>{opt}</span>
                  </button>
                )
              })}
            </div>
            {submitted && q.explanation && (
              <p className="mt-1.5 text-xs italic text-muted-foreground">{q.explanation}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5">
        {submitted ? (
          <Button variant="outline" size="sm" onClick={retry} className="rounded-xl">Try again</Button>
        ) : (
          <Button size="sm" onClick={check} disabled={!allAnswered} className="rounded-xl">Check answers</Button>
        )}
      </div>
    </div>
  )
}
