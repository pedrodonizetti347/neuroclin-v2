import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { Brain } from 'lucide-react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [loginErr,  setLoginErr]  = useState(null)

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
              photo_url:  fu.photoURL || '',
              role:       'professional',
              created_at: serverTimestamp(),
              last_login: serverTimestamp(),
            }
            await setDoc(ref, profile)
            setUser({ id: fu.uid, ...profile })
          }
        } catch {
          setUser({ id: fu.uid, email: fu.email, full_name: fu.displayName || 'Profissional', role: 'professional' })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = async () => {
    try {
      setLoginErr(null)
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setLoginErr('Não foi possível fazer login. Tente novamente.')
    }
  }

  const logout = () => signOut(auth)

  // Tela de login — tema escuro igual ao Neuroavaliação
  const LoginScreen = () => (
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
        width: '100%', maxWidth: 380, border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 6 }}>
          Bem-vindo!
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 28 }}>
          Acesse com sua conta Google autorizada
        </p>

        {loginErr && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#EF4444', marginBottom: 16
          }}>
            {loginErr}
          </div>
        )}

        <button onClick={login} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '13px 20px',
          background: '#2E7D32', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff',
          letterSpacing: '0.02em', transition: 'background 0.15s',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="rgba(255,255,255,0.8)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="rgba(255,255,255,0.6)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="rgba(255,255,255,0.9)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </button>

        <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          Acesso restrito a profissionais autorizados<br />
          Neuroavaliação — Neuropsicologia na Prática
        </p>
      </div>

      {/* Supervisor */}
      <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
        Supervisão: Dr. Pedro Donizetti · CRP 06/82060
      </div>
    </div>
  )

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
      {!user ? <LoginScreen /> : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
