import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { Brain, Eye, EyeOff, Loader2 } from 'lucide-react'

const AuthContext = createContext(null)

function LoginScreen({ onLogin, error }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onLogin(email, password)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 9,
    border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
    color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0D1117',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: 6 }}>
          NEUROPSICOLOGIA NA PRÁTICA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2E7D32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={24} color="#fff" />
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>NeuroClin</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Sistema de Laudos Neuropsicológicos</div>
      </div>

      {/* Card */}
      <div style={{
        background: '#1A2744', borderRadius: 16, padding: '36px 32px',
        width: '100%', maxWidth: 400, border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 6 }}>
          Bem-vindo!
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 28 }}>
          Acesse com seu e-mail e senha
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#EF4444', marginBottom: 16,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 7, letterSpacing: '0.08em' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="seu@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 7, letterSpacing: '0.08em' }}>
              SENHA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', display: 'flex', padding: 2,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '13px 20px', marginTop: 4,
              background: '#2E7D32', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              color: '#fff', opacity: loading ? 0.7 : 1, letterSpacing: '0.03em',
            }}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ marginTop: 22, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.6 }}>
          Acesso restrito a profissionais autorizados<br />
          Neuroavaliação — Neuropsicologia na Prática
        </p>
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Supervisão: Dr. Pedro Donizetti · CRP 06/82060
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [loginErr, setLoginErr] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        try {
          const ref  = doc(db, 'users', fu.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            setUser({ id: fu.uid, ...snap.data() })
            await setDoc(ref, { last_login: serverTimestamp() }, { merge: true })
          } else {
            const profile = {
              email:      fu.email,
              full_name:  fu.displayName || fu.email?.split('@')[0] || 'Profissional',
              photo_url:  '',
              role:       'professional',
              created_at: serverTimestamp(),
              last_login: serverTimestamp(),
            }
            await setDoc(ref, profile)
            setUser({ id: fu.uid, ...profile })
          }
        } catch {
          setUser({ id: fu.uid, email: fu.email, full_name: fu.email?.split('@')[0] || 'Profissional', role: 'professional' })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = async (email, password) => {
    try {
      setLoginErr(null)
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setLoginErr('Email ou senha incorretos.')
    }
  }

  const logout = () => signOut(auth)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0D1117' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(46,125,50,0.3)', borderTopColor: '#2E7D32', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Carregando NeuroClin...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {!user ? <LoginScreen onLogin={login} error={loginErr} /> : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
