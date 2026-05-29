import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { logAction } from './auditLog'
import { Brain, Eye, EyeOff } from 'lucide-react'

const AuthContext = createContext(null)
const ADMIN_UIDS  = ['i5nwg569WabTUk69wzCWV5PRw9E3']

export const ROLE_LABELS = {
  admin:        'Administrador',
  supervisor:   'Supervisor',
  estagiario:   'Estagiário',
  professional: 'Profissional',
  entregador:   'Entregador',
}
export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Profissional'
}

const ROLE_PERMISSIONS = {
  admin:        ['generate_report', 'upload_anamnese', 'approve_report', 'manage_users'],
  supervisor:   ['generate_report', 'upload_anamnese', 'approve_report'],
  professional: ['generate_report', 'upload_anamnese'],
  estagiario:   [],
  entregador:   ['generate_report', 'upload_anamnese'],
}
export function hasPermission(user, permission) {
  return ROLE_PERMISSIONS[user?.role]?.includes(permission) ?? false
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', outline: 'none', boxSizing: 'border-box',
}

function LoginScreen({ loginErr, email, setEmail, password, setPassword, showPass, setShowPass,
  emailLoading, loginWithEmail, handleReset, resetLoading, resetMsg, loginWithGoogle }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0D1117',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
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

      <div style={{
        background: '#1A2744', borderRadius: 16, padding: '32px 32px',
        width: '100%', maxWidth: 380, border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 24 }}>
          Bem-vindo!
        </h1>

        {loginErr && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#EF4444', marginBottom: 16
          }}>
            {loginErr}
          </div>
        )}

        <form onSubmit={loginWithEmail}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
              E-MAIL
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" autoComplete="email" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
              SENHA
            </label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0,
              }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={emailLoading} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: emailLoading ? 'rgba(46,125,50,0.5)' : '#2E7D32',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: emailLoading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em', marginBottom: 8,
          }}>
            {emailLoading ? 'Entrando...' : 'ENTRAR'}
          </button>
        </form>

        <button onClick={handleReset} disabled={resetLoading} style={{
          width: '100%', background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', padding: '4px 0', marginBottom: 16,
        }}>
          {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
        </button>

        {resetMsg && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12, textAlign: 'center', marginBottom: 16,
            background: resetMsg.includes('enviado') ? 'rgba(46,125,50,0.15)' : 'rgba(239,68,68,0.1)',
            color: resetMsg.includes('enviado') ? '#4CAF50' : '#EF4444',
          }}>
            {resetMsg}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button onClick={loginWithGoogle} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '11px 20px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </button>

        <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Acesso restrito a profissionais autorizados<br />
          Neuroavaliação — Neuropsicologia na Prática
        </p>
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Supervisão: Dr. Pedro Donizetti · CRP 06/82060
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(46,125,50,0.6) !important; background: rgba(255,255,255,0.08) !important; }
      `}</style>
    </div>
  )
}

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [loginErr,     setLoginErr]     = useState(null)
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [resetMsg,     setResetMsg]     = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        try {
          const ref  = doc(db, 'users', fu.uid)
          const snap = await getDoc(ref)

          if (snap.exists()) {
            const data = snap.data()
            if (data.active === false) {
              await firebaseSignOut(auth)
              setLoginErr('Seu acesso está desativado. Entre em contato com o administrador.')
              setUser(null)
              setLoading(false)
              return
            }
            const role = ADMIN_UIDS.includes(fu.uid) ? 'admin' : (data.role || 'professional')
            try {
              if (ADMIN_UIDS.includes(fu.uid) && data.role !== 'admin') {
                await setDoc(ref, { role: 'admin', last_login: serverTimestamp() }, { merge: true })
              } else {
                await setDoc(ref, { last_login: serverTimestamp() }, { merge: true })
              }
            } catch (updateErr) {
              console.warn('[AuthContext] last_login não atualizado:', updateErr?.code)
            }
            const resolvedUser = { id: fu.uid, ...data, role, roleLabel: getRoleLabel(role), permissions: ROLE_PERMISSIONS[role] || [] }
            setUser(resolvedUser)
            if (sessionStorage.getItem('neuroclin_login_pending')) {
              sessionStorage.removeItem('neuroclin_login_pending')
              logAction(resolvedUser, 'login')
            }
          } else {
            const isAdmin = ADMIN_UIDS.includes(fu.uid)
            const profile = {
              email:      fu.email,
              full_name:  fu.displayName || fu.email?.split('@')[0] || 'Profissional',
              photo_url:  fu.photoURL || '',
              role:       isAdmin ? 'admin' : 'professional',
              active:     true,
              created_at: serverTimestamp(),
              last_login: serverTimestamp(),
            }
            await setDoc(ref, profile)
            setUser({ id: fu.uid, ...profile, roleLabel: getRoleLabel(profile.role), permissions: ROLE_PERMISSIONS[profile.role] || [] })
          }
        } catch (err) {
          console.error('[AuthContext] erro ao carregar perfil:', err)
          const fallbackRole = ADMIN_UIDS.includes(fu.uid) ? 'admin' : 'professional'
          setUser({ id: fu.uid, email: fu.email, full_name: fu.displayName || 'Profissional', role: fallbackRole, roleLabel: getRoleLabel(fallbackRole), permissions: ROLE_PERMISSIONS[fallbackRole] || [] })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const loginWithGoogle = async () => {
    try {
      setLoginErr(null)
      sessionStorage.setItem('neuroclin_login_pending', 'true')
      await signInWithPopup(auth, googleProvider)
    } catch {
      sessionStorage.removeItem('neuroclin_login_pending')
      setLoginErr('Não foi possível fazer login com Google. Tente novamente.')
    }
  }

  const loginWithEmail = async (e) => {
    e.preventDefault()
    if (!email || !password) return setLoginErr('Preencha e-mail e senha.')
    try {
      setLoginErr(null)
      setEmailLoading(true)
      sessionStorage.setItem('neuroclin_login_pending', 'true')
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      sessionStorage.removeItem('neuroclin_login_pending')
      const msg = {
        'auth/user-not-found':     'E-mail não encontrado.',
        'auth/wrong-password':     'Senha incorreta.',
        'auth/invalid-email':      'E-mail inválido.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/too-many-requests':  'Muitas tentativas. Aguarde alguns minutos.',
      }
      setLoginErr(msg[err.code] || 'Erro ao fazer login. Verifique os dados.')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleReset = async () => {
    if (!email) { setResetMsg('Digite seu e-mail acima primeiro.'); return }
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetMsg('E-mail de redefinição enviado! Verifique sua caixa de entrada.')
    } catch {
      setResetMsg('Erro ao enviar e-mail. Verifique se o endereço está correto.')
    } finally {
      setResetLoading(false)
    }
  }

  const logout = () => firebaseSignOut(auth)

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
    <AuthContext.Provider value={{ user, logout }}>
      {!user ? (
        <LoginScreen
          loginErr={loginErr}
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          showPass={showPass} setShowPass={setShowPass}
          emailLoading={emailLoading}
          loginWithEmail={loginWithEmail}
          handleReset={handleReset}
          resetLoading={resetLoading}
          resetMsg={resetMsg}
          loginWithGoogle={loginWithGoogle}
        />
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
