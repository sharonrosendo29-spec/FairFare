import { supabaseAdmin } from '../../lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email } = req.body
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    const { error } = await supabaseAdmin.from('digest_subscribers').insert([{ email }])

    if (error) {
      if (error.code === '23505') {
        return res.status(200).json({ success: true, message: 'Already subscribed!' })
      }
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json({ success: true, message: 'Subscribed! You\'ll get weekly top posts.' })
  }

  if (req.method === 'DELETE') {
    // Unsubscribe via token
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const { error } = await supabaseAdmin
      .from('digest_subscribers')
      .update({ active: false })
      .eq('token', token)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, message: 'Unsubscribed successfully.' })
  }

  res.setHeader('Allow', ['POST', 'DELETE'])
  res.status(405).json({ error: `Method ${req.method} not allowed` })
}
