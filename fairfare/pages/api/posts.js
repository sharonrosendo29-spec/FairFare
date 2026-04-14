import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { type, platform, state, search, sort = 'newest', limit = 20, offset = 0 } = req.query

    let query = supabase.from('posts').select('*')

    if (type && type !== 'all') query = query.eq('type', type)
    if (platform && platform !== 'all') query = query.eq('platform', platform)
    if (state && state !== 'all') query = query.eq('state', state)
    if (search) query = query.or(`body.ilike.%${search}%,location.ilike.%${search}%,platform.ilike.%${search}%`)

    if (sort === 'top') query = query.order('votes', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1)

    const { data, error, count } = await query

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ posts: data, total: count })
  }

  if (req.method === 'POST') {
    const { type, platform, location, state, customer_paid, driver_got, miles, body, sentiment } = req.body

    if (!type || !platform || !location || !body) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (body.length < 20) {
      return res.status(400).json({ error: 'Please write at least 20 characters' })
    }

    const { data, error } = await supabase.from('posts').insert([{
      type,
      platform,
      location,
      state: state || extractState(location),
      customer_paid: customer_paid || null,
      driver_got: driver_got || null,
      miles: miles || null,
      body: body.trim(),
      photo_urls: photo_urls || [],
      sentiment: sentiment || 'neutral',
    }]).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ post: data })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).json({ error: `Method ${req.method} not allowed` })
}

function extractState(location) {
  const match = location.match(/,\s*([A-Z]{2})\s*$/)
  return match ? match[1] : null
}
