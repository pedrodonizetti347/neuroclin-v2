import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { getDevolutivas14Days } from '@/services/prodoctorApi'
import {
  Users, FileText, FlaskConical, ArrowRight, Clock,
  CalendarClock, CheckCircle2, AlertTriangle, Circle,
  Loader2, BookOpen,
} from 'lucide-react'

const S = {
  card:      '#1A2744',
  cardGreen: '#1A3D2B',
  green:     '#2E7D32',
  greenL:    '#4CAF50',
  border:    'rgba(255,255,255,0.08)',
  muted:     'rgba(255,255,255,0.45)',
  amber:     '#F59E0B',
  blue:      '#60A5FA',
  red:       '#EF4444',
}

const DIAS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const STATUS_CFG = {
  sem_vinculo: {
    bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
    label: 'Não vinculado', icon: Circle,
    border: 'rgba(255,255,255,0.08)', cardBg: 'rgba(255,255,255,0.01)',
    hint: 'Paciente não cadastrado no NeuroClin',
    panelLabel: 'Não vinculados', panelDesc: 'Cadastrar no NeuroClin',
    panelBorder: 'rgba(255,255,255,0.12)',
  },
  aguardando_correcao: {
    bg: 'rgba(245,158,11,0.15)', color: '#F59E0B',
    label: 'Aguardando correção', icon: AlertTriangle,
    border: 'rgba(245,158,11,0.3)', cardBg: 'rgba(245,158,11,0.03)',
    hint: 'Estagiário precisa lançar os testes',
    panelLabel: 'Ag. Correção', panelDesc: 'Estagiário',
    panelBorder: 'rgba(245,158,11,0.5)',
  },
  aguardando_anamnese: {
    bg: 'rgba(96,165,250,0.15)', color: '#60A5FA',
    label: 'Aguardando anamnese', icon: Clock,
    border: 'rgba(96,165,250,0.3)', cardBg: 'rgba(96,165,250,0.03)',
    hint: 'Neuropsicólogo precisa preencher a anamnese',
    panelLabel: 'Ag. Anamnese', panelDesc: 'Neuropsicólogo',
    panelBorder: 'rgba(96,165,250,0.5)',
  },
  pronto: {
    bg: 'rgba(46,125,50,0.18)', color: '#4CAF50',
    label: 'Pronto', icon: CheckCircle2,
    border: 'rgba(46,125,50,0.35)', cardBg: 'rgba(46,125,50,0.04)',
    hint: 'Devolutiva pode acontecer',
    panelLabel: 'Prontos', panelDesc: 'Pode iniciar',
    panelBorder: 'rgba(76,175,80,0.5)',
  },
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.sem_vinculo
  const Icon = c.icon
  return (
    <span title={c.hint} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
      background: c.bg, color: c.color, cursor: 'default',
    }}>
      <Icon size={11} /> {c.label}
    </span>
  )
}

function PatientRow({ patient }) {
  const initials = patient.full_name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const colors = ['#2E7D32', '#5B4FCF', '#B83246', '#C17F24', '#0891B2']
  const ci = (patient.full_name?.charCodeAt(0) || 0) % colors.length
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${S.border}` }}>
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
      <Link to={`/pacientes/${patient.id}`} style={{ fontSize: 11, color: S.greenL, fontWeight: 600 }}>Ver →</Link>
    </div>
  )
}

function DevolutivaRow({ item }) {
  const navigate = useNavigate()
  const { paciente, hora, date, professional, laudoStatus, ncPatient, hasApprovedReport } = item
  const cfg = STATUS_CFG[laudoStatus] || STATUS_CFG.sem_vinculo
  const dia = DIAS_PT[date.getDay()]
  const d   = String(date.getDate()).padStart(2, '0')
  const m   = MESES_PT[date.getMonth()]
  const today = new Date(); today.setHours(0,0,0,0)
  const diff  = Math.round((date - today) / 86400000)
  const dateTag = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${dia} ${d}/${m}`

  return (
    <div style={{
      padding: '10px 18px', borderBottom: `1px solid ${S.border}`,
      background: cfg.cardBg,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      {/* Data + hora */}
      <div style={{ minWidth: 82, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: diff <= 1 ? '#fff' : S.muted }}>{dateTag}</div>
        <div style={{ fontSize: 11, color: S.muted }}>{hora || '--:--'}</div>
      </div>

      {/* Paciente */}
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
          {paciente.nome || 'Paciente sem nome'}
        </div>
        <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{professional.name}</div>
      </div>

      {/* Badge */}
      <StatusBadge status={laudoStatus} />

      {/* Ações */}
      {ncPatient && (
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            onClick={() => navigate(`/pacientes/${ncPatient.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
              borderRadius: 6, border: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.04)',
              color: S.muted, fontSize: 10, cursor: 'pointer', fontWeight: 600,
            }}
          >
            <BookOpen size={10} /> Prontuário
          </button>
          {laudoStatus === 'pronto' && (
            <button
              onClick={() => navigate(`/laudos?paciente=${ncPatient.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px',
                borderRadius: 6, border: 'none',
                background: S.green, color: '#fff', fontSize: 10, cursor: 'pointer', fontWeight: 700,
              }}
            >
              <FileText size={10} />
              {hasApprovedReport ? 'Ver laudo' : 'Gerar laudo'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading,       setLoading]       = useState(true)
  const [devolvLoading, setDevolvLoading] = useState(true)
  const [devolvError,   setDevolvError]   = useState('')
  const [patients,      setPatients]      = useState([])
  const [enrichedDevs,  setEnrichedDevs]  = useState([])

  useEffect(() => {
    if (!user) return

    async function loadAll() {
      try {
        // Fase 1: Firestore (rápido)
        const [patientsSnap, reportsSnap, sessionsSnap] = await Promise.all([
          getDocs(collection(db, 'patients')),
          getDocs(collection(db, 'reports')),
          getDocs(collection(db, 'sessions')),
        ])

        const patientsData = patientsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setPatients(patientsData)
        setLoading(false)

        const pdMap = {}
        patientsData.forEach(p => { if (p.prodoctor_id) pdMap[p.prodoctor_id] = p })

        const reportsMap = {}
        reportsSnap.docs.forEach(d => {
          const r = { id: d.id, ...d.data() }
          if (!reportsMap[r.patientId]) reportsMap[r.patientId] = []
          reportsMap[r.patientId].push(r)
        })

        const sessionsStatusMap = {}
        sessionsSnap.docs.forEach(d => {
          const s = d.data()
          const pid = s.patientId
          if (!pid) return
          if (!sessionsStatusMap[pid]) sessionsStatusMap[pid] = { hasTests: false, hasAnamnesis: false }
          const hasTests = Object.values(s.tests || {}).some(t =>
            t && Object.keys(t).filter(k => k !== '_savedAt').length > 0
          )
          if (hasTests) sessionsStatusMap[pid].hasTests = true
          const hasAnamnesis = Object.values(s.anamnesis || {}).some(v =>
            v !== null && v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0)
          )
          if (hasAnamnesis) sessionsStatusMap[pid].hasAnamnesis = true
        })

        // Fase 2: ProDoctor (usa cache 15 min se visitou Devolutivas recentemente)
        const devs = await getDevolutivas14Days()

        const enriched = devs.map(dv => {
          const ncPatient = pdMap[dv.paciente.codigo] || null
          let laudoStatus = 'sem_vinculo'
          let hasApprovedReport = false
          if (ncPatient) {
            const sess = sessionsStatusMap[ncPatient.id] || {}
            hasApprovedReport = (reportsMap[ncPatient.id] || []).some(r => r.approved)
            if (hasApprovedReport || (sess.hasTests && sess.hasAnamnesis)) laudoStatus = 'pronto'
            else if (sess.hasTests) laudoStatus = 'aguardando_anamnese'
            else                    laudoStatus = 'aguardando_correcao'
          }
          return { ...dv, ncPatient, laudoStatus, hasApprovedReport }
        })

        setEnrichedDevs(enriched)
      } catch (e) {
        console.error('[Dashboard]', e)
        setDevolvError('Erro ao carregar devolutivas')
        setLoading(false)
      } finally {
        setDevolvLoading(false)
      }
    }

    loadAll()
  }, [user])

  const firstName = user?.full_name?.split(' ')[0] || 'Doutor(a)'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const today     = new Date()
  const dateLbl   = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })

  const statusCounts = {
    aguardando_correcao: enrichedDevs.filter(i => i.laudoStatus === 'aguardando_correcao').length,
    aguardando_anamnese: enrichedDevs.filter(i => i.laudoStatus === 'aguardando_anamnese').length,
    pronto:              enrichedDevs.filter(i => i.laudoStatus === 'pronto').length,
    sem_vinculo:         enrichedDevs.filter(i => i.laudoStatus === 'sem_vinculo').length,
  }

  // Até 8 devolutivas mais próximas, ordenadas por data
  const nextDevs = [...enrichedDevs].sort((a, b) => a.date - b.date).slice(0, 8)

  const QUICK_ACTIONS = [
    { label: 'NOVO PACIENTE',  sub: 'Cadastrar registro',    path: '/pacientes',  icon: Users,        color: S.greenL,  bg: 'rgba(46,125,50,0.15)' },
    { label: 'GERAR LAUDO',    sub: 'Relatório clínico',     path: '/laudos',     icon: FileText,     color: S.blue,    bg: 'rgba(96,165,250,0.1)'  },
    { label: 'APLICAR TESTE',  sub: 'Iniciar avaliação',     path: '/testes',     icon: FlaskConical, color: S.amber,   bg: 'rgba(245,158,11,0.1)'  },
    { label: 'PRONTUÁRIOS',    sub: 'Histórico do paciente', path: '/prontuario', icon: Clock,        color: '#C084FC', bg: 'rgba(192,132,252,0.1)' },
  ]

  const PANEL_STATUS_ORDER = ['aguardando_correcao', 'aguardando_anamnese', 'pronto', 'sem_vinculo']

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Saudação */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{greeting}, {firstName}</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4, textTransform: 'capitalize' }}>{dateLbl}</p>
      </div>

      {/* ── Painel: Ações Necessárias ─────────────────────────────────── */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
            ⚡ AÇÕES NECESSÁRIAS
          </span>
          <span style={{ fontSize: 11, color: S.muted }}>devolutivas · próximos 14 dias</span>
        </div>

        {devolvLoading ? (
          <div style={{ padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 10, color: S.muted, fontSize: 12 }}>
            <Loader2 size={15} color={S.greenL} style={{ animation: 'spin 1s linear infinite' }} />
            Carregando via ProDoctor...
          </div>
        ) : devolvError ? (
          <div style={{ padding: '16px 18px', color: S.red, fontSize: 12 }}>
            <AlertTriangle size={13} style={{ display: 'inline', marginRight: 6 }} />
            {devolvError}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
            {PANEL_STATUS_ORDER.map((key, i) => {
              const cfg   = STATUS_CFG[key]
              const Icon  = cfg.icon
              const count = statusCounts[key]
              return (
                <div key={key} style={{
                  padding: '18px 20px',
                  borderRight: i < 3 ? `1px solid ${S.border}` : 'none',
                  borderTop: `3px solid ${cfg.panelBorder}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <Icon size={13} color={cfg.color} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: S.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {cfg.panelLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 700, color: count > 0 ? cfg.color : S.muted, lineHeight: 1, marginBottom: 4 }}>
                    {count}
                  </div>
                  <div style={{ fontSize: 11, color: S.muted }}>{cfg.panelDesc}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Próximas Devolutivas ──────────────────────────────────────── */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 7 }}>
            <CalendarClock size={14} color={S.greenL} /> PRÓXIMAS DEVOLUTIVAS
          </span>
          <Link to="/devolutivas" style={{ fontSize: 11, color: S.greenL, fontWeight: 600 }}>
            Ver todas →
          </Link>
        </div>

        {devolvLoading ? (
          <div style={{ padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 10, color: S.muted, fontSize: 12 }}>
            <Loader2 size={15} color={S.greenL} style={{ animation: 'spin 1s linear infinite' }} />
            Carregando...
          </div>
        ) : nextDevs.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: S.muted, fontSize: 13 }}>
            Nenhuma devolutiva agendada nos próximos 14 dias.
          </div>
        ) : (
          nextDevs.map((item, i) => <DevolutivaRow key={i} item={item} />)
        )}
      </div>

      {/* ── Pacientes recentes + Atalhos rápidos ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>

        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>⚡ PACIENTES RECENTES</span>
            <Link to="/pacientes" style={{ fontSize: 11, color: S.greenL, fontWeight: 600 }}>Ver todos →</Link>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: S.muted, fontSize: 12 }}>Carregando...</div>
          ) : patients.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: S.muted, fontSize: 13 }}>Nenhum paciente cadastrado ainda.</div>
          ) : (
            patients.slice(0, 5).map(p => <PatientRow key={p.id} patient={p} />)
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {QUICK_ACTIONS.map(({ label, sub, path, icon: Icon, color, bg }) => (
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

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
