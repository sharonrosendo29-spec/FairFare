import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../../styles/Admin.module.css'

const REASON_LABELS = {
  spam: '🗑 Spam',
  fake: '🤥 Fake/Misleading',
  inappropriate: '⚠️ Inappropriate',
  other: '❓ Other',
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [posts, setPosts] = useState([])
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [digestSending, setDigestSending] = useState(false)

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    setAuthError('')
    const res = await fetch('/api/admin/flags', {
      headers: { Authorization: `Bearer ${password}` }
    })
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts)
      setFlags(data.flags)
      setAuthed(true)
    } else {
      setAuthError('Wrong password')
    }
    setLoading(false)
  }

  async function doAction(action, postId) {
    const res = await fetch('/api/admin/flags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ action, post_id: postId }),
    })
    if (res.ok) {
      setPosts(prev => action === 'delete' ? prev.filter(p => p.id !== postId) : prev)
      setFlags(prev => prev.filter(f => f.post_id !== postId))
      setMessage(action === 'delete' ? 'Post deleted.' : 'Flags dismissed, post kept.')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function sendDigest() {
    setDigestSending(true)
    const res = await fetch('/api/digest', {
      method: 'POST',
      headers: { Authorization: `Bearer ${password}` },
    })
    const data = await res.json()
    setMessage(data.message || 'Digest sent!')
    setTimeout(() => setMessage(''), 5000)
    setDigestSending(false)
  }

  function flagsForPost(postId) {
    return flags.filter(f => f.post_id === postId)
  }

  if (!authed) {
    return (
      <div className={styles.loginWrap}>
        <Head><title>FairFare Admin</title></Head>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}><span style={{color:'#E8500A'}}>Fair</span>Fare Admin</h1>
          <p style={{fontSize:13,color:'var(--muted)',marginBottom:'1.25rem'}}>Moderation & digest controls</p>
          <form onSubmit={login}>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{marginBottom:10}}
            />
            {authError && <p className={styles.error}>{authError}</p>}
            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? 'Checking...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head><title>FairFare Admin — Moderation</title></Head>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}><span style={{color:'#E8500A'}}>Fair</span>Fare Admin</h1>
            <p style={{fontSize:12,color:'var(--muted)'}}>Moderation dashboard</p>
          </div>
          <button className={styles.digestBtn} onClick={sendDigest} disabled={digestSending}>
            {digestSending ? 'Sending...' : '📧 Send Weekly Digest'}
          </button>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{posts.length}</div>
            <div className={styles.statLbl}>Flagged posts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{flags.length}</div>
            <div className={styles.statLbl}>Open flags</div>
          </div>
        </div>

        {posts.length === 0 && (
          <div className={styles.empty}>No flagged posts. The community is behaving! ✓</div>
        )}

        {posts.map(post => {
          const postFlags = flagsForPost(post.id)
          return (
            <div key={post.id} className={styles.flagCard}>
              <div className={styles.flagMeta}>
                <span className={styles.platform}>{post.platform}</span>
                <span className={styles.location}>{post.location}</span>
                <span className={styles.flagCount}>🚩 {post.flag_count} flag{post.flag_count !== 1 ? 's' : ''}</span>
              </div>

              <p className={styles.postBody}>{post.body.slice(0, 300)}{post.body.length > 300 ? '...' : ''}</p>

              {post.photo_urls?.length > 0 && (
                <div className={styles.photoRow}>
                  {post.photo_urls.map((url, i) => (
                    <img key={i} src={url} alt="Post photo" className={styles.photo} />
                  ))}
                </div>
              )}

              <div className={styles.flagList}>
                {postFlags.map(f => (
                  <div key={f.id} className={styles.flagItem}>
                    <span className={styles.flagReason}>{REASON_LABELS[f.reason]}</span>
                    {f.details && <span className={styles.flagDetails}>"{f.details}"</span>}
                    <span className={styles.flagTime}>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <button className={styles.keepBtn} onClick={() => doAction('dismiss', post.id)}>
                  ✓ Keep post — dismiss flags
                </button>
                <button className={styles.deleteBtn} onClick={() => {
                  if (confirm('Delete this post permanently?')) doAction('delete', post.id)
                }}>
                  🗑 Delete post
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
