import { useState, useCallback } from 'react'
import styles from './SubmitModal.module.css'

const PLATFORMS = ['Uber', 'Lyft', 'DoorDash', 'Grubhub', 'Instacart', 'Amazon Flex', 'Uber Eats', 'Shipt', 'Other']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']

export default function SubmitModal({ onClose, onSubmitted }) {
  const [type, setType] = useState('ride')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState([]) // { file, preview, url, uploading }
  const [form, setForm] = useState({
    platform: 'Uber',
    location: '',
    state: '',
    customer_paid: '',
    driver_got: '',
    miles: '',
    body: '',
    sentiment: 'negative',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const customerPaid = parseFloat(form.customer_paid) || 0
  const driverGot = parseFloat(form.driver_got) || 0
  const companyKept = customerPaid && driverGot ? (customerPaid - driverGot).toFixed(2) : null
  const companyCutPct = customerPaid && driverGot ? Math.round(((customerPaid - driverGot) / customerPaid) * 100) : null

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const remaining = 3 - photos.length
    const toAdd = files.slice(0, remaining)

    const newPhotos = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      url: null,
      uploading: true,
    }))
    setPhotos(prev => [...prev, ...newPhotos])

    // Upload each photo
    for (let i = 0; i < toAdd.length; i++) {
      const formData = new FormData()
      formData.append('photo', toAdd[i])
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        setPhotos(prev => prev.map(p =>
          p.preview === newPhotos[i].preview
            ? { ...p, url: data.url, uploading: false }
            : p
        ))
      } catch {
        setPhotos(prev => prev.map(p =>
          p.preview === newPhotos[i].preview
            ? { ...p, uploading: false, error: true }
            : p
        ))
      }
    }
  }, [photos])

  function removePhoto(preview) {
    setPhotos(prev => prev.filter(p => p.preview !== preview))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.location.trim()) return setError('Please enter your city and state.')
    if (!form.body.trim() || form.body.length < 20) return setError('Please write at least 20 characters.')
    if (photos.some(p => p.uploading)) return setError('Please wait for photos to finish uploading.')

    setSubmitting(true)
    try {
      const photoUrls = photos.filter(p => p.url).map(p => p.url)
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          platform: form.platform,
          location: form.location,
          state: form.state,
          customer_paid: form.customer_paid ? parseFloat(form.customer_paid) : null,
          driver_got: form.driver_got ? parseFloat(form.driver_got) : null,
          miles: form.miles ? parseFloat(form.miles) : null,
          body: form.body,
          sentiment: form.sentiment,
          photo_urls: photoUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      onSubmitted(data.post)
      onClose()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Share your experience</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.group}>
            <label className={styles.label}>What kind of report?</label>
            <div className={styles.typeRow}>
              {[['ride','🚗 Ride'],['delivery','🍔 Delivery'],['story','✍ Story']].map(([t, label]) => (
                <button key={t} type="button"
                  className={`${styles.typeOpt} ${type === t ? styles.selected : ''}`}
                  onClick={() => setType(t)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.group}>
              <label className={styles.label}>Platform</label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>State</label>
              <select value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">Select state</option>
                {US_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.group}>
            <label className={styles.label}>City, State (e.g. Chicago, IL)</label>
            <input type="text" placeholder="Chicago, IL" value={form.location}
              onChange={e => set('location', e.target.value)} />
          </div>

          {type !== 'story' && (
            <>
              <div className={styles.row2}>
                <div className={styles.group}>
                  <label className={styles.label}>Customer paid ($)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.customer_paid} onChange={e => set('customer_paid', e.target.value)} />
                </div>
                <div className={styles.group}>
                  <label className={styles.label}>Driver received ($)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.driver_got} onChange={e => set('driver_got', e.target.value)} />
                </div>
              </div>

              {companyKept && (
                <div className={styles.cutPreview}>
                  Platform kept <strong>${companyKept}</strong> — that's <strong>{companyCutPct}%</strong> of what the customer paid
                </div>
              )}

              <div className={styles.group}>
                <label className={styles.label}>Trip distance (miles, optional)</label>
                <input type="number" step="0.1" min="0" placeholder="e.g. 8.2"
                  value={form.miles} onChange={e => set('miles', e.target.value)} />
              </div>
            </>
          )}

          <div className={styles.group}>
            <label className={styles.label}>Your story</label>
            <textarea rows={4}
              placeholder="Describe what happened — be specific. Your report helps other workers and passengers understand the real picture."
              value={form.body} onChange={e => set('body', e.target.value)} />
          </div>

          {/* Photo upload */}
          <div className={styles.group}>
            <label className={styles.label}>Photos — receipts, screenshots, proof (optional, max 3)</label>
            <div className={styles.photoUploadArea}>
              {photos.map(p => (
                <div key={p.preview} className={styles.photoThumb}>
                  <img src={p.preview} alt="upload preview" className={styles.thumbImg} />
                  {p.uploading && <div className={styles.thumbOverlay}>uploading...</div>}
                  {p.error && <div className={styles.thumbError}>failed</div>}
                  <button type="button" className={styles.removePhoto} onClick={() => removePhoto(p.preview)}>✕</button>
                </div>
              ))}
              {photos.length < 3 && (
                <label className={styles.uploadBtn}>
                  <span>+ Add photo</span>
                  <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleFileChange} />
                </label>
              )}
            </div>
            <p className={styles.photoHint}>Upload receipts or screenshots as evidence. Max 5MB per photo, JPEG/PNG/WebP.</p>
          </div>

          <div className={styles.group}>
            <label className={styles.label}>How did it feel?</label>
            <select value={form.sentiment} onChange={e => set('sentiment', e.target.value)}>
              <option value="negative">😡 Unfair / Outrageous</option>
              <option value="neutral">😐 Mixed / Unclear</option>
              <option value="positive">😊 Actually decent</option>
              <option value="great">⭐ Great story to share</option>
            </select>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submit} disabled={submitting || photos.some(p => p.uploading)}>
              {submitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
