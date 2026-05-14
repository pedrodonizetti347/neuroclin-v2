import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { Users, FileText, FlaskConical, ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const S = {
  card:       '#1A2744',
  cardGreen:  '#1A3D2B',
  green:      '#2E7D32',
  greenL:     '#4CAF50',
  border:     'rgba(255,255,255,0.08)',
  muted:      'rgba(255,255,255,0.45)',
  amber:      '#F59E0B',
}

function StatCard({ label, value, sub, icon: Icon, iconColor, iconBg, subColor }) {
  return (
    <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: '16px 18px' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={16} color={iconColor} />
      </div>
      <div style={{ fontSize: 11, color: S.muted, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || S.greenL, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function PatientRow({ patient }) {
  const initials = patient.full_name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const colors = ['#2E7D32', '#5B4FCF', '#B83246', '#C17F24', '#0891B2']
  const ci = (patient.full_name?.charCodeAt(0) || 0) % colors.length

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
      borderBottom: `1px solid ${S.border}`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', background: colors[ci],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {patient.full_name}
        </div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 1 }}>
          {patient.birth_date ? `${new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos` : '—'}
          {patient.education ? ` · ${patient.education}` : ''}
        </div>
      </div>
      <Link to={`/pacientes/${patient.id}`} style={{
        fontSize: 11, color: S.greenL, fontWeight: 600,
      }}>
        Ver →
      </Link>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [counts, setCounts]   = useState({ patients: 0, reports: 0, tests: 0 })
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubs = []
    const counts = { patients: 0, reports: 0, tests: 0 }

    const unsubP = onSnapshot(collection(db, 'patients'), snap => {
      counts.patients = snap.size
      setCounts(c => ({ ...c, patients: snap.size }))
      setRecent(snap.docs.slice(0, 5).map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, e => { console.error(e); setLoading(false) })

    const unsubR = onSnapshot(collection(db, 'reports'), snap => {
      setCounts(c => ({ ...c, reports: snap.size }))
    }, console.error)

    const unsubS = onSnapshot(collection(db, 'sessions'), snap => {
      setCounts(c => ({ ...c, tests: snap.size }))
    }, console.error)

    unsubs = [unsubP, unsubR, unsubS]
    return () => unsubs.forEach(u => u())
  }, [])

  const firstName = user?.full_name?.split(' ')[0] || 'Doutor(a)'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const currentMonth = new Date().getMonth()

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginRight: 4 }}>
          PERÍODO
        </span>
        {months.map((m, i) => (
          <button key={m} style={{
            padding: '4px 12px', borderRadius: 20, border: `1px solid ${S.border}`,
            background: i === currentMonth ? S.green : 'transparent',
            color: i === currentMonth ? '#fff' : S.muted,
            fontSize: 11, fontWeight: i === currentMonth ? 700 : 400, cursor: 'pointer',
          }}>{m}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: S.muted }}>
          {new Date().getFullYear()}
        </span>
      </div>

      {/* Cards grandes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.06em' }}>LAUDOS HOJE</span>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              AO VIVO
            </span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{loading ? '—' : counts.reports}</div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>laudos gerados hoje</div>
        </div>

        <div style={{ background: S.cardGreen, borderRadius: 12, border: `1px solid rgba(46,125,50,0.3)`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.06em' }}>LAUDOS NO MÊS</span>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(46,125,50,0.3)', color: S.greenL, fontWeight: 700 }}>
              MÊS
            </span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{loading ? '—' : counts.reports}</div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>
            {months[currentMonth].toLowerCase()} de {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Pacientes" value={loading ? '—' : counts.patients} sub="↑ cadastrados" icon={Users} iconColor={S.greenL} iconBg="rgba(46,125,50,0.2)" />
        <StatCard label="Laudos gerados" value={loading ? '—' : counts.reports} sub="↑ total" icon={FileText} iconColor="#60A5FA" iconBg="rgba(96,165,250,0.15)" subColor="#60A5FA" />
        <StatCard label="Avaliações" value={loading ? '—' : counts.tests} sub="↑ sessões" icon={FlaskConical} iconColor={S.amber} iconBg="rgba(245,158,11,0.15)" subColor={S.amber} />
      </div>

      {/* Pacientes recentes + atalhos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>

        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${S.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
              ⚡ PACIENTES RECENTES
            </span>
            <Link to="/pacientes" style={{ fontSize: 11, color: S.greenL, fontWeight: 600 }}>
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: S.muted, fontSize: 12 }}>Carregando...</div>
          ) : recent.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: S.muted, fontSize: 13 }}>
              Nenhum paciente cadastrado ainda.
            </div>
          ) : (
            recent.map(p => <PatientRow key={p.id} patient={p} />)
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'NOVO PACIENTE',    sub: 'Cadastrar registro',       path: '/pacientes',  icon: Users,        color: S.greenL,  bg: 'rgba(46,125,50,0.15)' },
            { label: 'GERAR LAUDO',      sub: 'Relatório clínico',        path: '/laudos',     icon: FileText,     color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
            { label: 'APLICAR TESTE',    sub: 'Iniciar avaliação',        path: '/testes',     icon: FlaskConical, color: S.amber,   bg: 'rgba(245,158,11,0.1)' },
            { label: 'PRONTUÁRIOS',      sub: 'Histórico do paciente',    path: '/prontuario', icon: Clock,        color: '#C084FC', bg: 'rgba(192,132,252,0.1)' },
          ].map(({ label, sub, path, icon: Icon, color, bg }) => (
            <Link key={path} to={path}>
              <div style={{
                background: S.card, borderRadius: 10, border: `1px solid ${S.border}`,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{sub}</div>
                </div>
                <ArrowRight size={14} color={S.muted} style={{ marginLeft: 'auto' }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
