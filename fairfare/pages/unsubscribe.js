import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Unsubscribe() {
  const router = useRouter()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const { token } = router.query
    if (!token) return
    fetch(`/api/subscribe?token=${token}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => setStatus(data.success ? 'done' : 'error'))
      .catch(() => setStatus('error'))
  }, [router.query])

  return (
    <>
      <Head><title>Unsubscribe — FairFare</title></Head>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ textAlign:'center', maxWidth:400 }}>
          <div style={{ fontFamily:'var(--syne)', fontSize:24, fontWeight:800, marginBottom:16 }}>
            <span style={{ color:'#E8500A' }}>Fair</span>Fare
          </div>
          {status === 'loading' && <p style={{ color:'var(--muted)' }}>Unsubscribing...</p>}
          {status === 'done' && (
            <>
              <p style={{ fontSize:16, marginBottom:8 }}>You've been unsubscribed. ✓</p>
              <p style={{ fontSize:13, color:'var(--muted)' }}>You won't receive any more digest emails from us.</p>
              <a href="/" style={{ display:'inline-block', marginTop:20, color:'#E8500A', fontSize:13 }}>← Back to FairFare</a>
            </>
          )}
          {status === 'error' && (
            <>
              <p style={{ fontSize:16, color:'#C0291F', marginBottom:8 }}>Something went wrong.</p>
              <p style={{ fontSize:13, color:'var(--muted)' }}>Try clicking the link in your email again, or contact us.</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
