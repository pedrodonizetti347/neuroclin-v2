import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import {
  Brain, LayoutDashboard, Users, FileText,
  FlaskConical, BookOpen, BarChart3,
  LogOut, Menu, ChevronRight, Settings
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',       icon: LayoutDashboard, path: '/' },
  { label: 'Pacientes',       icon: Users,            path: '/pacientes' },
  { label: 'Laudos',          icon: FileText,         path: '/laudos' },
  { label: 'Testes',          icon: FlaskConical,     path: '/testes' },
  { label: 'Prontuário',      icon: BookOpen,         path: '/prontuario' },
  { label: 'Relatórios',      icon: BarChart3,        path: '/relatorios' },
  { label: 'Configurações',   icon: Settings,         path: '/configuracoes' },
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

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const initials = user?.full_name
    ?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'NC'

  const currentPage = NAV.find(n => n.path === location.pathname)?.label || 'Dashboard'

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
                  {user?.role === 'supervisor' ? 'Supervisor' : 'Profissional'}
                </div>
              </div>
            </div>
          )}
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
    </div>
  )
}
