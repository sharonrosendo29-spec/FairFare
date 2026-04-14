import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get aggregate stats per platform
  const { data, error } = await supabase
    .from('posts')
    .select('platform, driver_pct, votes, type')
    .not('driver_pct', 'is', null)

  if (error) return res.status(500).json({ error: error.message })

  // Group by platform
  const companies = {}
  for (const row of data) {
    if (!companies[row.platform]) {
      companies[row.platform] = { platform: row.platform, cuts: [], votes: 0, count: 0 }
    }
    companies[row.platform].cuts.push(row.driver_pct)
    companies[row.platform].votes += row.votes
    companies[row.platform].count++
  }

  // Compute averages
  const result = Object.values(companies).map(c => ({
    platform: c.platform,
    avg_driver_pct: Math.round(c.cuts.reduce((a, b) => a + Number(b), 0) / c.cuts.length),
    avg_company_cut: Math.round(100 - c.cuts.reduce((a, b) => a + Number(b), 0) / c.cuts.length),
    report_count: c.count,
    total_votes: c.votes,
  })).sort((a, b) => a.avg_driver_pct - b.avg_driver_pct) // worst first

  // Overall stats
  const { count: totalPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true })
  const { data: allCuts } = await supabase.from('posts').select('driver_pct').not('driver_pct', 'is', null)
  const avgDriverPct = allCuts?.length
    ? Math.round(allCuts.reduce((a, b) => a + Number(b.driver_pct), 0) / allCuts.length)
    : 0
  const { data: states } = await supabase.from('posts').select('state').not('state', 'is', null)
  const uniqueStates = new Set(states?.map(s => s.state)).size

  return res.status(200).json({
    companies: result,
    stats: {
      total_posts: totalPosts || 0,
      avg_driver_pct: avgDriverPct,
      unique_states: uniqueStates,
    }
  })
}
