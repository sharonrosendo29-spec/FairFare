import { supabase } from '../../../lib/supabase'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  // Create anonymous voter hash from IP to prevent spam (not stored raw)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown'
  const voterHash = crypto.createHash('sha256').update(ip + id).digest('hex')

  // Check if already voted
  const { data: existing } = await supabase
    .from('post_votes')
    .select('post_id')
    .eq('post_id', id)
    .eq('voter_hash', voterHash)
    .single()

  if (existing) {
    return res.status(409).json({ error: 'Already voted', alreadyVoted: true })
  }

  // Record vote
  const { error: voteError } = await supabase
    .from('post_votes')
    .insert([{ post_id: id, voter_hash: voterHash }])

  if (voteError) return res.status(500).json({ error: voteError.message })

  // Increment post vote count
  const { data, error } = await supabase.rpc('increment_votes', { post_id: Number(id) })

  // Fallback if RPC not set up yet
  if (error) {
    const { data: post } = await supabase.from('posts').select('votes').eq('id', id).single()
    await supabase.from('posts').update({ votes: (post?.votes || 0) + 1 }).eq('id', id)
  }

  const { data: updated } = await supabase.from('posts').select('votes').eq('id', id).single()
  return res.status(200).json({ votes: updated?.votes || 0 })
}
