import React, { useState, useEffect, useCallback } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, updatePassword, signOut as signOutSecondary } from 'firebase/auth'
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { firebaseConfig } from '@/lib/firebase'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import {
  UserPlus, Users, Shield, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, X, Eye, EyeOff, Edit2, Save,
} from 'lucide-react'

const S = {
  bg:     '#0D1117',
  card:   '#1A2744',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.4)',
  dark:   'rgba(255,255,255,0.04)',
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', outline: 'none', boxSizing: 'border-box',
}

const ROLES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'supervisor',   label: 'Supervisor'   },
  { value: 'admin',        label: 'Administrador' },
]

function roleLabel(r) {
  return ROLES.find(x => x.value === r)?.label || r || 'Profissional'
}

function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === 'neuroclin-secondary')
  const app = existing || initializeApp(firebaseConfig, 'neuroclin-secondary')
  return getAuth(app)
}

function Fld({ label, type = 'text', value, onChange, placeholder, right }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 5 }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        <input
          type={isPass && !show ? 'password' : 'text'}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder || ''}
          style={{ ...inputStyle, ...(isPass ? { paddingRight: 40 } : {}) }}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(v => !v)} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 0,
          }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        {right}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: S.card, borderRadius: 14, border: `1px solid ${S.border}`,
        width: '100%', maxWidth: 440, padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 2 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CreateModal({ onClose, onCreated }) {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState('professional')
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState(false)

  const errMessages = {
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/invalid-email':        'E-mail inválido.',
    'auth/weak-password':        'Senha muito fraca (mínimo 6 caracteres).',
  }

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErr('Preencha todos os campos.'); return
    }
    if (password.length < 6) {
      setErr('Senha deve ter no mínimo 6 caracteres.'); return
    }
    setErr(''); setLoading(true)
    try {
      const secondaryAuth = getSecondaryAuth()
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password)
      const uid  = cred.user.uid
      await signOutSecondary(secondaryAuth)

      await setDoc(doc(db, 'users', uid), {
        email:      email.trim().toLowerCase(),
        full_name:  name.trim(),
        role,
        active:     true,
        created_at: serverTimestamp(),
        last_login: null,
      })
      setOk(true)
      setTimeout(() => { onCreated(); onClose() }, 1200)
    } catch (e) {
      setErr(errMessages[e.code] || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Novo Profissional" onClose={onClose}>
      {ok ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={36} color={S.greenL} style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Profissional criado com sucesso!</div>
        </div>
      ) : (
        <>
          {err && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#EF4444', marginBottom: 16 }}>
              {err}
            </div>
          )}
          <Fld label="NOME COMPLETO" value={name} onChange={setName} placeholder="Ex: Dra. Ana Silva" />
          <Fld label="E-MAIL" value={email} onChange={setEmail} placeholder="profissional@email.com" />
          <Fld label="SENHA INICIAL" type="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 5 }}>CARGO / PERFIL</div>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '11px', borderRadius: 9, border: `1px solid ${S.border}`,
              background: 'transparent', color: S.muted, fontSize: 13, cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={handleCreate} disabled={loading} style={{
              padding: '11px', borderRadius: 9, border: 'none',
              background: loading ? 'rgba(46,125,50,0.5)' : S.green,
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Criando...</> : 'Criar Acesso'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

function EditModal({ user: u, onClose, onSaved }) {
  const [name,    setName]    = useState(u.full_name || '')
  const [role,    setRole]    = useState(u.role || 'professional')
  const [active,  setActive]  = useState(u.active !== false)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')
  const [ok,      setOk]      = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { setErr('Nome obrigatório.'); return }
    setErr(''); setLoading(true)
    try {
      await updateDoc(doc(db, 'users', u.id), {
        full_name: name.trim(),
        role,
        active,
        updated_at: serverTimestamp(),
      })
      setOk(true)
      setTimeout(() => { onSaved(); onClose() }, 1000)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Editar Profissional" onClose={onClose}>
      {ok ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={36} color={S.greenL} style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Salvo com sucesso!</div>
        </div>
      ) : (
        <>
          {err && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#EF4444', marginBottom: 16 }}>
              {err}
            </div>
          )}
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>E-mail: <span style={{ color: '#fff' }}>{u.email}</span></div>
          <Fld label="NOME COMPLETO" value={name} onChange={setName} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 5 }}>CARGO / PERFIL</div>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="active-chk" checked={active} onChange={e => setActive(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: S.green, cursor: 'pointer' }} />
            <label htmlFor="active-chk" style={{ fontSize: 12, color: '#fff', cursor: 'pointer' }}>
              Acesso ativo
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '11px', borderRadius: 9, border: `1px solid ${S.border}`,
              background: 'transparent', color: S.muted, fontSize: 13, cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={handleSave} disabled={loading} style={{
              padding: '11px', borderRadius: 9, border: 'none',
              background: loading ? 'rgba(46,125,50,0.5)' : S.green,
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Save size={14} /> Salvar</>}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

function ResetPasswordModal({ user: u, onClose }) {
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState(false)

  const handleReset = async () => {
    if (password.length < 6) { setErr('Senha deve ter no mínimo 6 caracteres.'); return }
    setErr(''); setLoading(true)
    try {
      const secondaryAuth = getSecondaryAuth()
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const cred = await signInWithEmailAndPassword(secondaryAuth, u.email, password)
      await updatePassword(cred.user, password)
      await signOutSecondary(secondaryAuth)
      setOk(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        // Can't reset without re-auth — use a different approach
        setErr('Não é possível redefinir a senha diretamente. O profissional deve usar a opção "Esqueci minha senha" na tela de login, ou você pode recriar o acesso com nova senha.')
      } else {
        setErr(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Redefinir Senha" onClose={onClose}>
      {ok ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={36} color={S.greenL} style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ color: '#fff', fontSize: 14 }}>Senha redefinida!</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: S.muted, marginBottom: 16 }}>
            Profissional: <span style={{ color: '#fff' }}>{u.full_name}</span><br />
            E-mail: <span style={{ color: '#fff' }}>{u.email}</span>
          </div>
          {err && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#EF4444', marginBottom: 16 }}>
              {err}
            </div>
          )}
          <Fld label="NOVA SENHA" type="password" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '11px', borderRadius: 9, border: `1px solid ${S.border}`,
              background: 'transparent', color: S.muted, fontSize: 13, cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={handleReset} disabled={loading} style={{
              padding: '11px', borderRadius: 9, border: 'none',
              background: loading ? 'rgba(46,125,50,0.5)' : S.green,
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Aguarde...</> : 'Redefinir'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}


export default function Admin() {
  const { user } = useAuth()
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [editUser,    setEditUser]    = useState(null)
  const [resetUser,   setResetUser]   = useState(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor'

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'pt-BR'))
      setUsers(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={40} color={S.muted} style={{ margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontSize: 14, color: S.muted }}>Acesso restrito a administradores.</div>
        </div>
      </div>
    )
  }

  const roleColor = (r) => {
    if (r === 'admin')       return '#7C3AED'
    if (r === 'supervisor')  return '#0369A1'
    return S.green
  }

  const formatDate = (ts) => {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Gerenciar Profissionais</h1>
          <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Crie e gerencie os acessos da equipe ao NeuroClin</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={loadUsers} style={{
            padding: '8px 14px', borderRadius: 8, border: `1px solid ${S.border}`,
            background: 'transparent', color: S.muted, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <RefreshCw size={13} /> Atualizar
          </button>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: S.green, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <UserPlus size={15} /> Novo Profissional
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total de usuários',  value: users.length,                                        icon: Users },
          { label: 'Ativos',             value: users.filter(u => u.active !== false).length,         icon: CheckCircle2 },
          { label: 'Administradores',    value: users.filter(u => u.role === 'admin' || u.role === 'supervisor').length, icon: Shield },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{
            background: S.card, borderRadius: 10, border: `1px solid ${S.border}`,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(46,125,50,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={S.greenL} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: 11, color: S.muted }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} color={S.greenL} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Equipe cadastrada</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Loader2 size={24} color={S.green} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 12, color: S.muted }}>Carregando...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: S.muted, fontSize: 13 }}>
            Nenhum profissional cadastrado.
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1.2fr 110px 110px auto',
              padding: '10px 18px', borderBottom: `1px solid ${S.border}`,
              fontSize: 10, fontWeight: 700, color: S.muted, letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              <div>Nome</div>
              <div>E-mail</div>
              <div>Cargo</div>
              <div>Último acesso</div>
              <div></div>
            </div>

            {users.map((u, i) => {
              const inactive = u.active === false
              return (
                <div key={u.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.2fr 110px 110px auto',
                  padding: '13px 18px', borderBottom: i < users.length - 1 ? `1px solid ${S.border}` : 'none',
                  alignItems: 'center', gap: 8,
                  background: inactive ? 'rgba(239,68,68,0.04)' : 'transparent',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: inactive ? S.muted : '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.full_name || '—'}
                      {!inactive && u.id === user?.id && (
                        <span style={{ fontSize: 9, background: 'rgba(46,125,50,0.2)', color: S.greenL, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>você</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: `${roleColor(u.role)}22`, color: roleColor(u.role),
                    }}>
                      {roleLabel(u.role)}
                    </span>
                    {inactive && <span style={{ fontSize: 9, color: '#EF4444', display: 'block', marginTop: 2 }}>Inativo</span>}
                  </div>
                  <div style={{ fontSize: 11, color: S.muted }}>{formatDate(u.last_login)}</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditUser(u)}
                      title="Editar"
                      style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${S.border}`, background: 'transparent', color: S.muted, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Edit2 size={12} /> Editar
                    </button>
                    <button
                      onClick={() => setResetUser(u)}
                      title="Redefinir senha"
                      style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${S.border}`, background: 'transparent', color: S.muted, fontSize: 11, cursor: 'pointer' }}>
                      Senha
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nota */}
      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`, fontSize: 11, color: S.muted, lineHeight: 1.6 }}>
        <AlertCircle size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
        O profissional recebe o e-mail e a senha definidos aqui para acessar o NeuroClin. Recomende trocar a senha no primeiro acesso.
        Para redefinir senha, o profissional pode usar a opção de recuperação na tela de login ou solicitar ao administrador.
      </div>

      {/* Modals */}
      {showCreate  && <CreateModal        onClose={() => setShowCreate(false)} onCreated={loadUsers} />}
      {editUser    && <EditModal  user={editUser}  onClose={() => setEditUser(null)}  onSaved={loadUsers} />}
      {resetUser   && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }
        select option { background: #1A2744; color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(46,125,50,0.6) !important; background: rgba(255,255,255,0.08) !important; }
        select { appearance: none; }
      `}</style>
    </div>
  )
}
