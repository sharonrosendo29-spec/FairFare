import { useState } from 'react'
import styles from './Subscribe.module.css'

export default function Subscribe() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok || res.status === 200) {
        setStatus('success')
        setMessage(data.message || 'Subscribed!')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.icon}>📧</div>
        <div className={styles.text}>
          <div className={styles.title}>Weekly digest</div>
          <div className={styles.sub}>Get the top community reports in your inbox every week. No spam, ever.</div>
        </div>
        {status === 'success' ? (
          <div className={styles.successMsg}>{message}</div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.input}
              required
            />
            <button type="submit" className={styles.btn} disabled={status === 'loading'}>
              {status === 'loading' ? '...' : 'Subscribe'}
            </button>
          </form>
        )}
        {status === 'error' && <p className={styles.errorMsg}>{message}</p>}
      </div>
    </div>
  )
}
