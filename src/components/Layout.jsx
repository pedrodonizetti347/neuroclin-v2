import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { auth } from '@/lib/firebase'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { BUILD_TIME } from '@/version'
import {
  Brain, LayoutDashboard, Users, FileText,
  FlaskConical, BookOpen, BarChart3,
  LogOut, Menu, ChevronRight, Settings, ShieldCheck, KeyRound, X, Eye, EyeOff
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',       icon: LayoutDashboard, path: '/' },
  { label: 'Pacientes',       icon: Users,            path: '/pacientes' },
  { label: 'Laudos',          icon: FileText,         path: '/laudos' },
  { label: 'Testes',          icon: FlaskConical,     path: '/testes' },
  { label: 'Prontuário',      icon: BookOpen,         path: '/prontuario' },
  { label: 'Relatórios',      icon: BarChart3,        path: '/relatorios' },
]

const NAV_ADMIN = [
  { label: 'Administrador',   icon: ShieldCheck,      path: '/admin' },
]

const S = {
  bg:      '#0D1117',
  nav:     '#0B1929',
  sidebar: '#0F1B2D',
  card:    '#1A2744',
  green:   '#2E7D32',
  greenL:  '#4CAF50',
  border:  'rgba(255,255,255,0.07)',
  muted:   'rgba(255,255,255,0.4)',
}

function ChangePasswordModal({ onClose }) {
  const [currentPass,  setCurrentPass]  = useState('')
  const [newPass,      setNewPass]      = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [showCurrent,  setShowCurrent]  = useState(false)
  const [showNew,      setShowNew]      = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [err,          setErr]          = useState('')
  const [ok,           setOk]           = useState(false)

  const isEmailUser = auth.currentUser?.providerData?.some(p => p.providerId === 'password')

  async function handleSubmit() {
    setErr('')
    if (!currentPass || !newPass || !confirmPass) { setErr('Preencha todos os campos.'); return }
    if (newPass.length < 6) { setErr('Nova senha deve ter no mínimo 6 caracteres.'); return }
    if (newPass !== confirmPass) { setErr('As novas senhas não coincidem.'); return }
    setLoading(true)
    try {
      const u    = auth.currentUser
      const cred = EmailAuthProvider.credential(u.email, currentPass)
      await reauthenticateWithCredential(u, cred)
      await updatePassword(u, newPass)
      setOk(true)
    } catch (e) {
      const msgs = {
        'auth/wrong-password':      'Senha atual incorreta.',
        'auth/invalid-credential':  'Senha atual incorreta.',
        'auth/too-many-requests':   'Muitas tentativas. Aguarde e tente novamente.',
        'auth/weak-password':       'Nova senha muito fraca (mínimo 6 caracteres).',
        'auth/requires-recent-login': 'Sessão expirada. Faça logout e login novamente.',
      }
      setErr(msgs[e.code] || 'Erro ao alterar senha. Tente novamente.')
    } finally { setLoading(false) }
  }

  const inp = {
    width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8, fontSize: 13,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', outline: 'none', boxSizing: 'border-box',
  }

  function PassField({ label, value, onChange, show, setShow }) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
          {label}
        </label>
        <div style={{ position: 'relative' }}>
          <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} style={inp} />
          <button type="button" onClick={() => setShow(v => !v)} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0,
          }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1A2744', borderRadius: 14, padding: 28, width: '100%', maxWidth: 380,
        border: '1px solid rgba(255,255,255,0.1)', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
          cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4,
        }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <KeyRound size={18} color="#4CAF50" />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Alterar Minha Senha</span>
        </div>

        {!isEmailUser ? (
          <div style={{
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#FBBF24', lineHeight: 1.6,
          }}>
            Sua conta usa login via Google. A senha é gerenciada pelo Google e não pode ser alterada aqui.
          </div>
        ) : ok ? (
          <div style={{
            background: 'rgba(46,125,50,0.15)', border: '1px solid rgba(76,175,80,0.4)',
            borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#4CAF50', textAlign: 'center',
          }}>
            Senha alterada com sucesso!
          </div>
        ) : (
          <>
            {err && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#EF4444', marginBottom: 14,
              }}>
                {err}
              </div>
            )}
            <PassField label="SENHA ATUAL" value={currentPass} onChange={setCurrentPass} show={showCurrent} setShow={setShowCurrent} />
            <PassField label="NOVA SENHA" value={newPass} onChange={setNewPass} show={showNew} setShow={setShowNew} />
            <PassField label="CONFIRMAR NOVA SENHA" value={confirmPass} onChange={setConfirmPass} show={showNew} setShow={setShowNew} />
            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', padding: '11px', borderRadius: 9, border: 'none',
              background: loading ? 'rgba(46,125,50,0.5)' : '#2E7D32',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
            }}>
              {loading ? 'Alterando...' : 'ALTERAR SENHA'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor'
  const location = useLocation()
  const [collapsed,       setCollapsed]       = useState(false)
  const [showChangePass,  setShowChangePass]  = useState(false)

  const initials = user?.full_name
    ?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'NC'

  const currentPage = [...NAV, ...NAV_ADMIN].find(n => n.path === location.pathname)?.label || 'Dashboard'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: S.bg }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 60 : 210, flexShrink: 0,
        background: S.sidebar,
        borderRight: `1px solid ${S.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 12px' : '18px 16px',
          borderBottom: `1px solid ${S.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: S.green, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Brain size={18} color="#fff" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                NeuroClin
              </div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>
                Sistema de Laudos
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path
            return (
              <Link key={path} to={path}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: 9, padding: collapsed ? '10px 12px' : '9px 12px',
                  borderRadius: 7, marginBottom: 2,
                  background: active ? S.green : 'transparent',
                  color: active ? '#fff' : S.muted,
                  fontSize: 12, fontWeight: active ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  letterSpacing: active ? '0.02em' : '0',
                }}>
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{label}</span>}
                  {!collapsed && active && (
                    <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                  )}
                </div>
              </Link>
            )
          })}
          {isAdmin && (
            <>
              {!collapsed && (
                <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 12px 4px', opacity: 0.6 }}>
                  Gestão
                </div>
              )}
              {NAV_ADMIN.map(({ label, icon: Icon, path }) => {
                const active = location.pathname === path
                return (
                  <Link key={path} to={path}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: 9, padding: collapsed ? '10px 12px' : '9px 12px',
                      borderRadius: 7, marginBottom: 2,
                      background: active ? '#3730A3' : 'transparent',
                      color: active ? '#fff' : S.muted,
                      fontSize: 12, fontWeight: active ? 700 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}>
                      <Icon size={16} style={{ flexShrink: 0 }} />
                      {!collapsed && <span>{label}</span>}
                    </div>
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding: '10px 8px', borderTop: `1px solid ${S.border}` }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: S.green, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10, fontWeight: 700,
                color: '#fff', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'Profissional'}
                </div>
                <div style={{ fontSize: 10, color: S.muted }}>
                  {user?.role === 'admin' ? 'Administrador' : user?.role === 'supervisor' ? 'Supervisor' : 'Profissional'}
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setShowChangePass(true)} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, padding: '8px 10px', borderRadius: 7, border: 'none',
            background: 'rgba(255,255,255,0.05)', color: S.muted,
            fontSize: 11, cursor: 'pointer', marginBottom: 4,
          }}>
            <KeyRound size={14} />
            {!collapsed && 'Minha Senha'}
          </button>
          <button onClick={logout} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, padding: '8px 10px', borderRadius: 7, border: 'none',
            background: 'rgba(255,255,255,0.05)', color: S.muted,
            fontSize: 11, cursor: 'pointer',
          }}>
            <LogOut size={14} />
            {!collapsed && 'Sair'}
          </button>
          {!collapsed && (
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
              build {BUILD_TIME}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{
          background: S.nav, borderBottom: `1px solid ${S.border}`,
          padding: '0 20px', height: 52,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <button onClick={() => setCollapsed(c => !c)} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: S.muted, display: 'flex', padding: 4, borderRadius: 6,
          }}>
            <Menu size={18} />
          </button>

          <span style={{ fontSize: 12, color: S.muted }}>NeuroClin</span>
          <span style={{ color: S.border, fontSize: 16 }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            {currentPage.toUpperCase()}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontSize: 11, color: S.muted,
              background: 'rgba(255,255,255,0.05)',
              padding: '4px 12px', borderRadius: 20,
              border: `1px solid ${S.border}`,
            }}>
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: S.green, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {children}
        </main>
      </div>

      {showChangePass && <ChangePasswordModal onClose={() => setShowChangePass(false)} />}
    </div>
  )
}
