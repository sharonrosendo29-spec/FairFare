import { useState } from 'react'
import styles from './PostCard.module.css'

const PLATFORM_COLORS = {
  'Uber': { bg: '#000', color: '#fff' },
  'Lyft': { bg: '#FF00BF', color: '#fff' },
  'DoorDash': { bg: '#FF3008', color: '#fff' },
  'Grubhub': { bg: '#F63440', color: '#fff' },
  'Instacart': { bg: '#2E7D32', color: '#fff' },
  'Amazon Flex': { bg: '#FF9900', color: '#111' },
  'Uber Eats': { bg: '#06C167', color: '#fff' },
  'Shipt': { bg: '#E31837', color: '#fff' },
}

const SENTIMENTS = { negative: '😡', neutral: '😐', positive: '😊', great: '⭐' }
const TYPE_LABELS = { ride: 'Ride', delivery: 'Delivery', story: 'Story' }
const FLAG_REASONS = [
  { value: 'spam', label: 'Spam / ads' },
  { value: 'fake', label: 'Fake / misleading' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'other', label: 'Other' },
]

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function PostCard({ post }) {
  const [votes, setVotes] = useState(post.votes || 0)
  const [voted, setVoted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [voting, setVoting] = useState(false)
  const [showFlagMenu, setShowFlagMenu] = useState(false)
  const [flagReason, setFlagReason] = useState('spam')
  const [flagDetails, setFlagDetails] = useState('')
  const [flagged, setFlagged] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  const platformStyle = PLATFORM_COLORS[post.platform] || { bg: '#888', color: '#fff' }
  const driverPct = post.driver_pct ? Math.round(post.driver_pct) : null
  const companyPct = driverPct ? 100 - driverPct : null
  const photos = post.photo_urls || []

  async function handleVote(e) {
    e.stopPropagation()
    if (voted || voting) return
    setVoting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) { setVotes(data.votes); setVoted(true) }
      else if (data.alreadyVoted) setVoted(true)
    } catch {}
    setVoting(false)
  }

  async function submitFlag(e) {
    e.stopPropagation()
    setFlagging(true)
    try {
      await fetch(`/api/posts/${post.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: flagReason, details: flagDetails }),
      })
      setFlagged(true)
      setShowFlagMenu(false)
    } catch {}
    setFlagging(false)
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.meta}>
          <span className={styles.platformBadge} style={{ background: platformStyle.bg, color: platformStyle.color }}>
            {post.platform}
          </span>
          <span className={`${styles.typeBadge} ${styles['type_' + post.type]}`}>
            {TYPE_LABELS[post.type]}
          </span>
          <span className={styles.sentiment}>{SENTIMENTS[post.sentiment] || ''}</span>
          <span className={styles.location}>{post.location}</span>
        </div>

        {post.customer_paid && post.driver_got && (
          <div className={styles.amounts}>
            <div className={styles.amountBlock}>
              <div className={styles.amountLabel}>Customer paid</div>
              <div className={`${styles.amountVal} ${styles.customer}`}>${Number(post.customer_paid).toFixed(2)}</div>
            </div>
            <div className={styles.amountBlock}>
              <div className={styles.amountLabel}>Driver got</div>
              <div className={`${styles.amountVal} ${styles.driver}`}>${Number(post.driver_got).toFixed(2)}</div>
            </div>
            <div className={styles.amountBlock}>
              <div className={styles.amountLabel}>Platform kept</div>
              <div className={`${styles.amountVal} ${styles.company}`}>${Number(post.company_kept).toFixed(2)}</div>
            </div>
            {post.miles && (
              <div className={styles.amountBlock}>
                <div className={styles.amountLabel}>Miles</div>
                <div className={styles.amountVal}>{post.miles}</div>
              </div>
            )}
          </div>
        )}

        {driverPct && (
          <div className={styles.cutBar}>
            <div className={styles.cutTrack}>
              <div className={styles.cutDriver} style={{ width: `${driverPct}%` }} />
              <div className={styles.cutCompany} style={{ width: `${companyPct}%` }} />
            </div>
            <div className={styles.cutLabels}>
              <span className={styles.driverLabel}>Driver {driverPct}%</span>
              <span className={styles.companyLabel}>Platform {companyPct}%</span>
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className={styles.photoRow}>
            {photos.map((url, i) => (
              <img key={i} src={url} alt="Receipt or proof" className={styles.photo}
                onClick={e => { e.stopPropagation(); setLightboxPhoto(url) }} />
            ))}
          </div>
        )}

        <div className={`${styles.body} ${!expanded ? styles.truncated : ''}`} onClick={() => setExpanded(!expanded)}>
          {post.body}
        </div>

        <div className={styles.footer}>
          <button className={`${styles.voteBtn} ${voted ? styles.voted : ''}`} onClick={handleVote} disabled={voted || voting}>
            {voted ? '✓' : '+1'} Relatable &nbsp;{votes}
          </button>
          <button className={styles.voteBtn} onClick={() => setExpanded(!expanded)}>{expanded ? '↑' : '↓'}</button>
          {!flagged ? (
            <button className={`${styles.flagBtn} ${showFlagMenu ? styles.flagActive : ''}`}
              onClick={e => { e.stopPropagation(); setShowFlagMenu(!showFlagMenu) }} title="Report this post">
              🚩
            </button>
          ) : (
            <span className={styles.flaggedNote}>Flagged ✓</span>
          )}
          <span className={styles.time}>{timeAgo(post.created_at)}</span>
        </div>

        {showFlagMenu && (
          <div className={styles.flagMenu} onClick={e => e.stopPropagation()}>
            <div className={styles.flagTitle}>Report this post</div>
            <div className={styles.flagReasons}>
              {FLAG_REASONS.map(r => (
                <label key={r.value} className={styles.flagReasonOpt}>
                  <input type="radio" name={`flag-${post.id}`} value={r.value}
                    checked={flagReason === r.value} onChange={() => setFlagReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
            <input type="text" placeholder="Optional details..." value={flagDetails}
              onChange={e => setFlagDetails(e.target.value)} className={styles.flagDetailsInput} />
            <div className={styles.flagActions}>
              <button className={styles.flagCancel} onClick={() => setShowFlagMenu(false)}>Cancel</button>
              <button className={styles.flagSubmit} onClick={submitFlag} disabled={flagging}>
                {flagging ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </div>
        )}
      </div>

      {lightboxPhoto && (
        <div className={styles.lightbox} onClick={() => setLightboxPhoto(null)}>
          <img src={lightboxPhoto} alt="Full size" className={styles.lightboxImg} />
          <button className={styles.lightboxClose} onClick={() => setLightboxPhoto(null)}>✕</button>
        </div>
      )}
    </>
  )
}
