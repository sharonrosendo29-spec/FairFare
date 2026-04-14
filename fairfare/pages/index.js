import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import PostCard from '../components/PostCard'
import SubmitModal from '../components/SubmitModal'
import styles from '../styles/Home.module.css'
import Subscribe from '../components/Subscribe'

const PLATFORMS = ['all', 'Uber', 'Lyft', 'DoorDash', 'Grubhub', 'Instacart', 'Amazon Flex', 'Uber Eats', 'Shipt']
const US_STATES = ['all','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']

export default function Home({ initialPosts, initialStats }) {
  const [page, setPage] = useState('feed')
  const [posts, setPosts] = useState(initialPosts || [])
  const [stats, setStats] = useState(initialStats || {})
  const [companyData, setCompanyData] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Filters
  const [tab, setTab] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [state, setState] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ sort, limit: 30 })
    if (tab !== 'all') params.set('type', tab)
    if (platform !== 'all') params.set('platform', platform)
    if (state !== 'all') params.set('state', state)
    if (search) params.set('search', search)
    try {
      const res = await fetch(`/api/posts?${params}`)
      const data = await res.json()
      if (data.posts) setPosts(data.posts)
    } catch {}
    setLoading(false)
  }, [tab, platform, state, sort, search])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  useEffect(() => {
    if (page === 'data' && !companyData) {
      fetch('/api/stats').then(r => r.json()).then(d => setCompanyData(d))
    }
  }, [page, companyData])

  function onSubmitted(newPost) {
    setPosts(prev => [newPost, ...prev])
    setStats(prev => ({ ...prev, total_posts: (prev.total_posts || 0) + 1 }))
  }

  return (
    <>
      <Head>
        <title>FairFare — Gig Worker Transparency</title>
        <meta name="description" content="Where rideshare drivers, delivery workers, and passengers expose the real cuts taken by Uber, Lyft, DoorDash, and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.app}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div>
              <div className={styles.logo}>Fair<span>Fare</span></div>
              <div className={styles.tagline}>Gig worker transparency — powered by real people</div>
            </div>
            <nav className={styles.nav}>
              {[['feed','Feed'],['data','By Company'],['map','By State']].map(([id, label]) => (
                <button key={id} className={`${styles.navBtn} ${page===id ? styles.active : ''}`}
                  onClick={() => setPage(id)}>{label}</button>
              ))}
            </nav>
          </div>
        </header>

        <main className={styles.main}>
          <div className="container">

            {/* === FEED PAGE === */}
            {page === 'feed' && (
              <>
                {/* Stats bar */}
                <div className={styles.statsBar}>
                  <div className={styles.statCard}>
                    <div className={styles.statVal}>{(stats.total_posts || 0).toLocaleString()}</div>
                    <div className={styles.statLabel}>Reports filed</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statVal}>{stats.avg_driver_pct ? `${100 - stats.avg_driver_pct}%` : '—'}</div>
                    <div className={styles.statLabel}>Avg platform cut</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statVal}>{stats.unique_states || '—'}</div>
                    <div className={styles.statLabel}>States covered</div>
                  </div>
                </div>

                <Subscribe />

        {/* Section header */}
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Community reports</h2>
                  <button className={styles.postBtn} onClick={() => setShowModal(true)}>
                    + Share your story
                  </button>
                </div>

                {/* Tabs */}
                <div className={styles.tabBar}>
                  {[['all','All'],['ride','Rides'],['delivery','Deliveries'],['story','Stories']].map(([t, label]) => (
                    <button key={t} className={`${styles.tab} ${tab===t ? styles.activeTab : ''}`}
                      onClick={() => setTab(t)}>{label}</button>
                  ))}
                </div>

                {/* Filters */}
                <div className={styles.filterRow}>
                  <input className={styles.searchInput} type="text" placeholder="Search city, company, keyword..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <select className={styles.filterSelect} value={platform} onChange={e => setPlatform(e.target.value)}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p === 'all' ? 'All platforms' : p}</option>)}
                  </select>
                  <select className={styles.filterSelect} value={state} onChange={e => setState(e.target.value)}>
                    {US_STATES.map(s => <option key={s} value={s}>{s === 'all' ? 'All states' : s}</option>)}
                  </select>
                  <select className={styles.filterSelect} value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="newest">Newest</option>
                    <option value="top">Most relatable</option>
                  </select>
                </div>

                {/* Feed */}
                {loading && <div className={styles.loading}>Loading reports...</div>}
                {!loading && posts.length === 0 && (
                  <div className={styles.empty}>No reports found. Be the first to share your story!</div>
                )}
                {posts.map(post => <PostCard key={post.id} post={post} />)}
              </>
            )}

            {/* === BY COMPANY PAGE === */}
            {page === 'data' && (
              <>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Platform cut breakdown</h2>
                </div>
                <p className={styles.subtext}>Based on community-reported data. Sorted worst first — the lower the driver %, the more the platform takes.</p>

                {!companyData && <div className={styles.loading}>Loading company data...</div>}

                {companyData?.companies?.map(c => (
                  <div key={c.platform} className={styles.companyRow}>
                    <div className={styles.companyName}>{c.platform}</div>
                    <div className={styles.companyBar}>
                      <div className={styles.companyTrack}>
                        <div className={styles.companyDriverFill} style={{ width: `${c.avg_driver_pct}%` }} />
                        <div className={styles.companyPlatformFill} style={{ width: `${c.avg_company_cut}%` }} />
                      </div>
                      <div className={styles.companyNums}>
                        <span className={styles.driverNum}>Driver {c.avg_driver_pct}%</span>
                        <span className={styles.platformNum}>Platform {c.avg_company_cut}%</span>
                      </div>
                    </div>
                    <div className={styles.companyMeta}>{c.report_count} report{c.report_count !== 1 ? 's' : ''}</div>
                  </div>
                ))}

                <div className={styles.disclaimer}>
                  All data is self-reported by drivers, delivery workers, and passengers. Individual rides vary widely.
                </div>
              </>
            )}

            {/* === BY STATE PAGE === */}
            {page === 'map' && (
              <>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Browse by state</h2>
                </div>
                <p className={styles.subtext}>Click a state to filter the feed to reports from that area.</p>
                <div className={styles.stateGrid}>
                  {US_STATES.filter(s => s !== 'all').map(s => (
                    <button key={s} className={styles.stateBtn}
                      onClick={() => { setPage('feed'); setState(s) }}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        </main>

        <footer className={styles.footer}>
          <div className="container">
            <p>FairFare is an independent community platform. All reports are user-submitted. We are not affiliated with any gig company.</p>
            <p style={{ marginTop: 4 }}>Built to give gig workers and passengers a voice. 🚗 🍔</p>
          </div>
        </footer>
      </div>

      {showModal && (
        <SubmitModal onClose={() => setShowModal(false)} onSubmitted={onSubmitted} />
      )}
    </>
  )
}

export async function getServerSideProps() {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const [postsRes, statsRes] = await Promise.all([
      fetch(`${base}/api/posts?limit=20&sort=newest`),
      fetch(`${base}/api/stats`),
    ])

    const postsData = postsRes.ok ? await postsRes.json() : { posts: [] }
    const statsData = statsRes.ok ? await statsRes.json() : { stats: {} }

    return {
      props: {
        initialPosts: postsData.posts || [],
        initialStats: statsData.stats || {},
      }
    }
  } catch {
    return { props: { initialPosts: [], initialStats: {} } }
  }
}
