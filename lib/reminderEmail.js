// Sends the daily "come back and review" nudge via Resend's REST API — a
// plain fetch rather than the resend npm package, since one call doesn't
// need an SDK. Uses the same verified sending domain as Supabase Auth's SMTP
// (see AI project notes: spanishrewired.com, send. subdomain).

const APP_URL = 'https://lingorewired.vercel.app'
const FROM = 'LingoRewired <noreply@spanishrewired.com>'

function emailHtml({ streak, dueCount, unsubscribeUrl }) {
  const streakLine = streak > 0
    ? `<p>Your streak is at <strong>${streak} day${streak === 1 ? '' : 's'}</strong> — review today to keep it alive.</p>`
    : `<p>You have <strong>${dueCount} word${dueCount === 1 ? '' : 's'}</strong> due for review.</p>`
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">Time for a quick review</h2>
      ${streakLine}
      <p>${dueCount} word${dueCount === 1 ? '' : 's'} waiting for you.</p>
      <p style="margin: 24px 0;">
        <a href="${APP_URL}/decks" style="background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">
          Review now
        </a>
      </p>
      <p style="color:#888; font-size:12px; margin-top:32px;">
        <a href="${unsubscribeUrl}" style="color:#888;">Unsubscribe from these reminders</a>
      </p>
    </div>
  `
}

// Returns true on success; never throws — a failed send for one user
// shouldn't stop the rest of the cron run.
export async function sendReminderEmail({ to, streak, dueCount, unsubscribeToken }) {
  const unsubscribeUrl = `${APP_URL}/api/reminders/unsubscribe?token=${unsubscribeToken}`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: streak > 0 ? `Keep your ${streak}-day streak alive 🔥` : 'You have words waiting to review',
        html: emailHtml({ streak, dueCount, unsubscribeUrl }),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
