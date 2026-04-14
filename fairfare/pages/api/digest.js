import { Resend } from 'resend'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { supabase } from '../../lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // Protect this endpoint — only callable with the admin secret
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get top posts from last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', oneWeekAgo)
    .order('votes', { ascending: false })
    .limit(5)

  if (postsError) return res.status(500).json({ error: postsError.message })
  if (!posts || posts.length === 0) {
    return res.status(200).json({ message: 'No posts this week, skipping digest.' })
  }

  // Get active subscribers
  const { data: subscribers, error: subError } = await supabaseAdmin
    .from('digest_subscribers')
    .select('email, token')
    .eq('active', true)

  if (subError) return res.status(500).json({ error: subError.message })
  if (!subscribers || subscribers.length === 0) {
    return res.status(200).json({ message: 'No subscribers yet.' })
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

  const SENTIMENTS = { negative: '😡', neutral: '😐', positive: '😊', great: '⭐' }
  const TYPE_LABELS = { ride: '🚗 Ride', delivery: '🍔 Delivery', story: '✍ Story' }

  function postHtml(p) {
    const driverPct = p.driver_pct ? Math.round(p.driver_pct) : null
    const companyPct = driverPct ? 100 - driverPct : null
    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
          <span style="background:#000;color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;">${p.platform}</span>
          <span style="font-size:11px;color:#6b7280;">${TYPE_LABELS[p.type] || p.type}</span>
          <span style="font-size:13px;">${SENTIMENTS[p.sentiment] || ''}</span>
          <span style="font-size:11px;color:#6b7280;margin-left:auto;">${p.location}</span>
        </div>
        ${p.customer_paid && p.driver_got ? `
        <div style="display:flex;gap:20px;margin-bottom:10px;flex-wrap:wrap;">
          <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;">Customer paid</div><div style="font-size:18px;font-weight:700;color:#E8500A;">$${Number(p.customer_paid).toFixed(2)}</div></div>
          <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;">Driver got</div><div style="font-size:18px;font-weight:700;color:#1A7A4A;">$${Number(p.driver_got).toFixed(2)}</div></div>
          <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;">Platform kept</div><div style="font-size:18px;font-weight:700;color:#C0291F;">$${Number(p.company_kept).toFixed(2)}</div></div>
        </div>
        ${driverPct ? `<div style="font-size:12px;margin-bottom:10px;"><span style="color:#1A7A4A;font-weight:600;">Driver ${driverPct}%</span> &nbsp;|&nbsp; <span style="color:#C0291F;font-weight:600;">Platform ${companyPct}%</span></div>` : ''}
        ` : ''}
        <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 10px;">${p.body.slice(0, 280)}${p.body.length > 280 ? '...' : ''}</p>
        <div style="font-size:12px;color:#9ca3af;">+${p.votes} people found this relatable</div>
      </div>`
  }

  const digestHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'DM Sans',sans-serif;background:#f9f8f6;margin:0;padding:24px 16px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="margin-bottom:24px;">
      <h1 style="font-size:28px;font-weight:800;margin:0;letter-spacing:-0.5px;">
        <span style="color:#E8500A;">Fair</span><span style="color:#1a1a1a;">Fare</span>
      </h1>
      <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Weekly digest — top community reports</p>
    </div>

    <div style="background:#FDF0EA;border:1px solid #F5A070;border-radius:12px;padding:14px 16px;margin-bottom:24px;">
      <p style="font-size:13px;color:#E8500A;margin:0;font-weight:500;">
        Here are the most-voted reports from the past week. Real people, real numbers, real stories.
      </p>
    </div>

    ${posts.map(postHtml).join('')}

    <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">
      <a href="${baseUrl}" style="display:inline-block;background:#E8500A;color:#fff;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;margin-bottom:16px;">View all reports on FairFare</a>
      <p style="font-size:11px;color:#9ca3af;margin:0;">
        You're receiving this because you subscribed to FairFare's weekly digest.<br>
        <a href="${baseUrl}/unsubscribe?token=SUBSCRIBER_TOKEN" style="color:#9ca3af;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`

  // Send to all subscribers
  const results = { sent: 0, failed: 0 }
  for (const sub of subscribers) {
    const html = digestHtml.replace('SUBSCRIBER_TOKEN', sub.token)
    try {
      await resend.emails.send({
        from: process.env.DIGEST_FROM_EMAIL || 'digest@fairfare.app',
        to: sub.email,
        subject: `FairFare Weekly: Top ${posts.length} reports this week`,
        html,
      })
      results.sent++
    } catch {
      results.failed++
    }
  }

  return res.status(200).json({
    message: `Digest sent to ${results.sent} subscribers (${results.failed} failed)`,
    posts_included: posts.length,
    ...results,
  })
}
