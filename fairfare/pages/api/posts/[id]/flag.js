import { supabase } from '../../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const { reason, details } = req.body

  if (!reason) return res.status(400).json({ error: 'Please select a reason' })

  const validReasons = ['spam', 'fake', 'inappropriate', 'other']
  if (!validReasons.includes(reason)) return res.status(400).json({ error: 'Invalid reason' })

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown'

  const { error } = await supabase.from('flags').insert([{
    post_id: Number(id),
    reason,
    details: details?.trim() || null,
    reporter_ip: ip,
  }])

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true })
}
