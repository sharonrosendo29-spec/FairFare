import { supabaseAdmin } from '../../../lib/supabaseAdmin'

function isAuthorized(req) {
  const authHeader = req.headers.authorization
  return authHeader === `Bearer ${process.env.ADMIN_SECRET}`
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    // Get flagged posts for review
    const { data, error } = await supabaseAdmin
      .from('posts_with_flags')
      .select('*')
      .gt('flag_count', 0)
      .order('flag_count', { ascending: false })
      .limit(50)

    if (error) return res.status(500).json({ error: error.message })

    // Get flag details for each post
    const postIds = data.map(p => p.id)
    const { data: flags } = await supabaseAdmin
      .from('flags')
      .select('*')
      .in('post_id', postIds)
      .eq('resolved', false)
      .order('created_at', { ascending: false })

    return res.status(200).json({ posts: data, flags: flags || [] })
  }

  if (req.method === 'POST') {
    const { action, post_id, flag_ids } = req.body

    if (action === 'delete') {
      // Delete the post entirely
      const { error } = await supabaseAdmin.from('posts').delete().eq('id', post_id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ success: true, action: 'deleted' })
    }

    if (action === 'dismiss') {
      // Mark flags as resolved (keep post)
      const { error } = await supabaseAdmin
        .from('flags')
        .update({ resolved: true })
        .eq('post_id', post_id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ success: true, action: 'dismissed' })
    }

    return res.status(400).json({ error: 'Invalid action' })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).json({ error: 'Method not allowed' })
}
