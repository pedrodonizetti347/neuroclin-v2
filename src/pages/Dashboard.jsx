import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { getDevolutivas14Days } from '@/services/prodoctorApi'
import {
  Users, FileText, FlaskConical, ArrowRight, Clock,
  CalendarClock, CheckCircle2, AlertTriangle, Loader2,
  BookOpen, RefreshCw, ClipboardList,
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
  purple:    '#A78BFA',
  orange:    '#F97316',
  pink:      '#EC4899',
}

const DIAS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const CARDS_FLUXO = [
  { key: 'ag_anamnese',  label: 'Aguardando Anamnese',          sub: 'Profissional não preencheu',    color: '#F59E0B', icon: BookOpen,      etapa: 'ag_anamnese'  },
  { key: 'ag_correcao',  label: 'Aguardando Correção',           sub: 'Sem estagiário atribuído',      color: '#EF4444', icon: AlertTriangle, etapa: 'aguardando_correcao'  },
  { key: 'em_correcao',  label: 'Em Correção',                   sub: 'Estagiário corrigindo',         color: '#3B82F6', icon: Clock,         etapa: 'em_correcao'  },
  { key: 'ag_aprovacao', label: 'Aguardando Aprovação',          sub: 'Supervisão pendente',           color: '#8B5CF6', icon: FileText,      etapa: 'aguardando_aprovacao' },
  { key: 'pronto_dev',   label: 'Prontos para Devolutiva',       sub: 'Laudos aprovados',              color: '#10B981', icon: CheckCircle2,  etapa: 'pronto_devolutiva'    },
  { key: 'dev_proximos',    label: 'Devolutivas próximos 30 dias',       sub: 'Retornos agendados ProDoctor',          color: '#0D9488', icon: CalendarClock, etapa: null },
  { key: 'quintas_proximas', label: '5ª Consultas — próximos 7 dias',  sub: 'Protocolos prestes a ser entregues',    color: '#D97706', icon: CalendarClock, etapa: null },
]

const STATUS_CFG_DEV = {
  sem_vinculo:         { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', label: 'Não vinculado',   icon: ClipboardList },
  aguardando_correcao: { bg: 'rgba(245,158,11,0.15)',  color: S.amber,                label: 'Ag. Correção',    icon: AlertTriangle },
  aguardando_anamnese: { bg: 'rgba(96,165,250,0.15)',  color: S.blue,                 label: 'Ag. Anamnese',    icon: Clock },
  pronto:              { bg: 'rgba(46,125,50,0.18)',   color: S.greenL,               label: 'Pronto',          icon: CheckCircle2 },
}

function DevStatusBadge({ status }) {
  const c = STATUS_CFG_DEV[status] || STATUS_CFG_DEV.sem_vinculo
  const Icon = c.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
      background: c.bg, color: c.color,
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
        </div>
      </div>
      <Link to={`/pacientes/${patient.id}`} style={{ fontSize: 11, color: S.greenL, fontWeight: 600 }}>Ver →</Link>
    </div>
  )
}

function DevolutivaRow({ item }) {
  const navigate = useNavigate()
  const { paciente, hora, date, professional, laudoStatus, ncPatient, hasApprovedReport } = item
  const dia = DIAS_PT[date.getDay()]
  const d   = String(date.getDate()).padStart(2, '0')
  const m   = MESES_PT[date.getMonth()]
  const today = new Date(); today.setHours(0,0,0,0)
  const diff  = Math.round((date - today) / 86400000)
  const dateTag = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${dia} ${d}/${m}`

  return (
    <div style={{
      padding: '10px 18px', borderBottom: `1px solid ${S.border}`,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 82, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: diff <= 1 ? '#fff' : S.muted }}>{dateTag}</div>
        <div style={{ fontSize: 11, color: S.muted }}>{hora || '--:--'}</div>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{paciente.nome || 'Paciente sem nome'}</div>
        <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{professional.name}</div>
      </div>
      <DevStatusBadge status={laudoStatus} />
      {ncPatient && (
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            onClick={() => navigate(`/pacientes/${ncPatient.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 6, border: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.04)', color: S.muted, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            <BookOpen size={10} /> Prontuário
          </button>
          {laudoStatus === 'pronto' && (
            <button
              onClick={() => navigate(`/laudos?paciente=${ncPatient.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: 'none', background: S.green, color: '#fff', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
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
  const isAdminOrSupervisor = user?.role === 'admin' || user?.role === 'supervisor'
  const isSecretaria        = user?.role === 'secretaria'
  const isProfissional      = user?.role === 'profissional' || user?.role === 'professional'
  const isEstagiario        = user?.role === 'estagiario'
  const canSeeFluxo         = isAdminOrSupervisor || isSecretaria || isProfissional
  const canSeeDevolutivas   = isAdminOrSupervisor || isSecretaria

  const [loading,        setLoading]        = useState(true)
  const [devolvLoading,  setDevolvLoading]  = useState(false)
  const [devolvError,    setDevolvError]    = useState('')
  const [patients,       setPatients]       = useState([])
  const [enrichedDevs,   setEnrichedDevs]   = useState([])
  const [correcoes,      setCorrecoes]      = useState([])
  const [correcoesLoad,  setCorrecoesLoad]  = useState(false)

  useEffect(() => {
    if (!user) return

    async function loadAll() {
      try {
        // Pacientes — disponível para todos
        const patientsSnap = await getDocs(collection(db, 'patients'))
        const patientsData = patientsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setPatients(patientsData)
        setLoading(false)

        // Correções — filtra por role
        if (canSeeFluxo || isEstagiario) {
          setCorrecoesLoad(true)
          try {
            const corrSnap = await getDocs(collection(db, 'correcoes'))
            let all = corrSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            if (isProfissional) {
              all = all.filter(c => c.profissionalUid === user.uid)
            } else if (isEstagiario) {
              all = all.filter(c => c.estagiarioId === user.uid)
            }
            setCorrecoes(all)
          } catch (e) {
            console.warn('[Dashboard] correcoes:', e.message)
          } finally {
            setCorrecoesLoad(false)
          }
        }

        // ProDoctor devolutivas — apenas admin/supervisor/secretaria
        if (!canSeeDevolutivas) return
        setDevolvLoading(true)

        const [reportsSnap, sessionsSnap] = await Promise.all([
          getDocs(collection(db, 'reports')),
          getDocs(collection(db, 'sessions')),
        ])

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

  // Pacientes com 5ª consulta nos próximos 7 dias
  const hojeMs = new Date(); hojeMs.setHours(0, 0, 0, 0)
  const em7dias = new Date(hojeMs); em7dias.setDate(hojeMs.getDate() + 7)

  function parseDataCorte(val) {
    if (!val) return null
    if (val?.toDate) return val.toDate()
    if (val instanceof Date) return val
    return null
  }

  function fmtDateShort(val) {
    const d = parseDataCorte(val)
    if (!d) return ''
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  }

  const quintasProximas = correcoes.filter(c => {
    const dt = parseDataCorte(c.dataCorte)
    if (!dt) return false
    const d = new Date(dt); d.setHours(0, 0, 0, 0)
    return d >= hojeMs && d <= em7dias
  })

  const firstName = user?.full_name?.split(' ')[0] || 'Doutor(a)'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const today     = new Date()
  const dateLbl   = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })

  // Contagens para os 6 cards
  const counts = {
    ag_anamnese:  correcoes.filter(c => c.etapaAtual && !c.anamnese_preenchida).length,
    ag_correcao:  correcoes.filter(c => c.etapaAtual === 'aguardando_correcao').length,
    em_correcao:  correcoes.filter(c => c.etapaAtual === 'em_correcao').length,
    ag_aprovacao: correcoes.filter(c => c.etapaAtual === 'aguardando_aprovacao').length,
    pronto_dev:   correcoes.filter(c => c.etapaAtual === 'pronto_devolutiva').length,
    dev_proximos:     enrichedDevs.length,
    quintas_proximas: quintasProximas.length,
  }

  const nextDevs = [...enrichedDevs].sort((a, b) => a.date - b.date).slice(0, 8)

  const QUICK_ACTIONS = [
    { label: 'NOVO PACIENTE',  sub: 'Cadastrar registro',    path: '/pacientes',  icon: Users,        color: S.greenL,  bg: 'rgba(46,125,50,0.15)', adminOnly: true },
    { label: 'GERAR LAUDO',    sub: 'Relatório clínico',     path: '/laudos',     icon: FileText,     color: S.blue,    bg: 'rgba(96,165,250,0.1)',  adminOnly: true },
    { label: 'APLICAR TESTE',  sub: 'Iniciar avaliação',     path: '/testes',     icon: FlaskConical, color: S.amber,   bg: 'rgba(245,158,11,0.1)'  },
    { label: 'CORREÇÕES',      sub: 'Controle de prontuários', path: '/correcoes', icon: ClipboardList, color: S.purple, bg: 'rgba(167,139,250,0.1)' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Saudação */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{greeting}, {firstName}</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4, textTransform: 'capitalize' }}>{dateLbl}</p>
      </div>

      {/* ── 6 Cards do Fluxo de Avaliação ───────────────────────────── */}
      {(canSeeFluxo || isEstagiario) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Fluxo de Avaliação — Prevent Sênior
            </span>
            <Link to="/correcoes" style={{ fontSize: 11, color: S.greenL, fontWeight: 600 }}>Ver detalhes →</Link>
          </div>

          {correcoesLoad ? (
            <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 10, color: S.muted, fontSize: 12 }}>
              <Loader2 size={15} color={S.greenL} style={{ animation: 'spin 1s linear infinite' }} />
              Carregando fluxo de avaliação...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {CARDS_FLUXO.map((card) => {
                const Icon = card.icon
                const count = counts[card.key]
                const isDevs    = card.key === 'dev_proximos'
                const isQuintas = card.key === 'quintas_proximas'

                if (isEstagiario && !canSeeFluxo && card.key !== 'em_correcao') return null
                if (isProfissional && isDevs) return null

                // Pacientes para listar dentro do card
                let pacientes = []
                if (!isDevs && !isQuintas && card.etapa) {
                  if (card.key === 'ag_anamnese') {
                    pacientes = correcoes.filter(c => c.etapaAtual && !c.anamnese_preenchida)
                  } else {
                    pacientes = correcoes.filter(c => c.etapaAtual === card.etapa)
                  }
                } else if (isDevs) {
                  pacientes = enrichedDevs.slice(0, 5).map(d => ({ paciente: d.paciente.nome }))
                } else if (isQuintas) {
                  pacientes = quintasProximas.map(c => ({
                    paciente: c.paciente || '—',
                    _date:    fmtDateShort(c.dataCorte),
                    _prof:    c.profissionalNome || c.profissional || null,
                  }))
                }

                const to = isDevs ? '/devolutivas' : '/correcoes'
                const active = count > 0

                return (
                  <Link key={card.key} to={to} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: S.card,
                      borderRadius: 12,
                      borderLeft: `4px solid ${active ? card.color : 'rgba(255,255,255,0.1)'}`,
                      border: `1px solid ${active ? card.color + '30' : S.border}`,
                      borderLeftWidth: 4,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      height: '100%',
                      boxSizing: 'border-box',
                      boxShadow: active ? `0 4px 20px ${card.color}18` : 'none',
                      transition: 'box-shadow 0.2s',
                    }}>
                      {/* Cabeçalho do card */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: active ? `${card.color}20` : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={16} color={active ? card.color : S.muted} />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', lineHeight: 1.3 }}>{card.label}</div>
                            <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{card.sub}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: active ? card.color : S.muted, lineHeight: 1, minWidth: 36, textAlign: 'right' }}>
                          {count}
                        </div>
                      </div>

                      {/* Lista de pacientes */}
                      {pacientes.length > 0 && (
                        <div style={{ borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 10 }}>
                          {pacientes.slice(0, 4).map((p, idx) => (
                            <div key={idx} style={{ padding: '3px 0' }}>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: card.color, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.paciente || p.full_name || p.nome}
                                </span>
                                {p._date && (
                                  <span style={{ color: card.color, fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{p._date}</span>
                                )}
                              </div>
                              {p._prof && (
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', paddingLeft: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p._prof}
                                </div>
                              )}
                            </div>
                          ))}
                          {pacientes.length > 4 && (
                            <div style={{ fontSize: 10, color: card.color, marginTop: 3, fontWeight: 600 }}>
                              + {pacientes.length - 4} mais →
                            </div>
                          )}
                        </div>
                      )}

                      {count === 0 && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Nenhum no momento</div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Próximas Devolutivas ──────────────────────────────────────── */}
      {canSeeDevolutivas && (
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 7 }}>
              <CalendarClock size={14} color={S.greenL} /> PRÓXIMAS DEVOLUTIVAS
            </span>
            <Link to="/devolutivas" style={{ fontSize: 11, color: S.greenL, fontWeight: 600 }}>Ver todas →</Link>
          </div>

          {devolvLoading ? (
            <div style={{ padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 10, color: S.muted, fontSize: 12 }}>
              <Loader2 size={15} color={S.greenL} style={{ animation: 'spin 1s linear infinite' }} />
              Carregando via ProDoctor...
            </div>
          ) : devolvError ? (
            <div style={{ padding: '16px 18px', color: S.red, fontSize: 12 }}>
              {devolvError}
            </div>
          ) : nextDevs.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: S.muted, fontSize: 13 }}>
              Nenhuma devolutiva agendada nos próximos 30 dias.
            </div>
          ) : (
            nextDevs.map((item, i) => <DevolutivaRow key={i} item={item} />)
          )}
        </div>
      )}

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
            <div style={{ padding: 32, textAlign: 'center', color: S.muted, fontSize: 13 }}>Nenhum paciente cadastrado.</div>
          ) : (
            patients.slice(0, 5).map(p => <PatientRow key={p.id} patient={p} />)
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {QUICK_ACTIONS.filter(a => !a.adminOnly || isAdminOrSupervisor).map(({ label, sub, path, icon: Icon, color, bg }) => (
            <Link key={path} to={path}>
              <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
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
