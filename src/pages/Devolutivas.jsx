import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { getDevolutivas14Days, clearDevolutivasCache } from '@/services/prodoctorApi'
import {
  CalendarClock, RefreshCw, CheckCircle2, AlertTriangle,
  FileText, BookOpen, Clock, Loader2, Circle,
} from 'lucide-react'

const S = {
  bg:     '#0D1B2A',
  card:   '#1A2744',
  cardG:  '#1A3D2B',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  amber:  '#F59E0B',
  red:    '#EF4444',
  blue:   '#3B82F6',
}

const DIAS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatDateLabel(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86400000)
  const dia  = DIAS_PT[date.getDay()]
  const d    = String(date.getDate()).padStart(2, '0')
  const m    = MESES_PT[date.getMonth()]
  if (diff === 0) return `Hoje — ${dia} ${d}/${m}`
  if (diff === 1) return `Amanhã — ${dia} ${d}/${m}`
  return `${dia} ${d}/${m}`
}

// Configuração visual dos 4 status
const STATUS_CFG = {
  sem_vinculo: {
    bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
    label: 'Não vinculado',
    icon: Circle,
    border: 'rgba(255,255,255,0.08)', cardBg: 'rgba(255,255,255,0.01)',
    hint: 'Paciente não cadastrado no NeuroClin',
  },
  aguardando_correcao: {
    bg: 'rgba(245,158,11,0.15)', color: '#F59E0B',
    label: 'Aguardando correção',
    icon: AlertTriangle,
    border: 'rgba(245,158,11,0.3)', cardBg: 'rgba(245,158,11,0.03)',
    hint: 'Estagiário precisa lançar os testes',
  },
  aguardando_anamnese: {
    bg: 'rgba(59,130,246,0.15)', color: '#60A5FA',
    label: 'Aguardando anamnese',
    icon: Clock,
    border: 'rgba(59,130,246,0.3)', cardBg: 'rgba(59,130,246,0.03)',
    hint: 'Neuropsicólogo precisa preencher a anamnese',
  },
  pronto: {
    bg: 'rgba(46,125,50,0.18)', color: '#4CAF50',
    label: 'Pronto',
    icon: CheckCircle2,
    border: 'rgba(46,125,50,0.35)', cardBg: 'rgba(46,125,50,0.04)',
    hint: 'Devolutiva pode acontecer',
  },
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.sem_vinculo
  const Icon = c.icon
  return (
    <span
      title={c.hint}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
        background: c.bg, color: c.color, cursor: 'default',
      }}
    >
      <Icon size={11} /> {c.label}
    </span>
  )
}

function DevolutivaCard({ item }) {
  const navigate = useNavigate()
  const { paciente, hora, professional, laudoStatus, ncPatient, hasApprovedReport } = item
  const cfg = STATUS_CFG[laudoStatus] || STATUS_CFG.sem_vinculo

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8, marginBottom: 6,
      background: cfg.cardBg,
      border: `1px solid ${cfg.border}`,
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      {/* Hora */}
      <div style={{
        minWidth: 48, textAlign: 'center', background: 'rgba(255,255,255,0.05)',
        borderRadius: 6, padding: '6px 0', flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{hora || '--:--'}</div>
      </div>

      {/* Info paciente */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {paciente.nome || 'Paciente sem nome'}
        </div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>
          {professional.name} · ProDoctor #{paciente.codigo}
        </div>
      </div>

      {/* Badge de status */}
      <StatusBadge status={laudoStatus} />

      {/* Ações */}
      <div style={{ display: 'flex', gap: 6 }}>
        {ncPatient && (
          <>
            <button
              onClick={() => navigate(`/pacientes/${ncPatient.id}`)}
              title="Ver prontuário"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                borderRadius: 6, border: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.05)',
                color: S.muted, fontSize: 11, cursor: 'pointer', fontWeight: 600,
              }}
            >
              <BookOpen size={12} /> Prontuário
            </button>
            {laudoStatus === 'pronto' && (
              <button
                onClick={() => navigate(`/laudos?paciente=${ncPatient.id}`)}
                title="Ir para laudos"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                  borderRadius: 6, border: 'none',
                  background: S.green,
                  color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700,
                }}
              >
                <FileText size={12} />
                {hasApprovedReport ? 'Ver laudo' : 'Gerar laudo'}
              </button>
            )}
          </>
        )}
        {!ncPatient && (
          <span style={{ fontSize: 11, color: S.muted, fontStyle: 'italic' }}>
            Paciente não cadastrado no NeuroClin
          </span>
        )}
      </div>
    </div>
  )
}

export default function Devolutivas() {
  const { user } = useAuth()
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  async function load(refresh = false) {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      if (refresh) clearDevolutivasCache()

      const [devolutivas, patientsSnap, reportsSnap, sessionsSnap] = await Promise.all([
        getDevolutivas14Days(refresh),
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'reports')),
        getDocs(collection(db, 'sessions')),
      ])

      // prodoctor_id → paciente NeuroClin
      const pdMap = {}
      patientsSnap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() }
        if (p.prodoctor_id) pdMap[p.prodoctor_id] = p
      })

      // patientId → laudos (mais recente primeiro)
      const reportsMap = {}
      reportsSnap.docs.forEach(d => {
        const r = { id: d.id, ...d.data() }
        if (!reportsMap[r.patientId]) reportsMap[r.patientId] = []
        reportsMap[r.patientId].push(r)
      })

      // patientId → { hasTests, hasAnamnesis }
      const sessionsStatusMap = {}
      sessionsSnap.docs.forEach(d => {
        const s = d.data()
        const pid = s.patientId
        if (!pid) return
        if (!sessionsStatusMap[pid]) sessionsStatusMap[pid] = { hasTests: false, hasAnamnesis: false }

        // Tem testes se há pelo menos um teste com campos além de _savedAt
        const hasTests = Object.values(s.tests || {}).some(t =>
          t && Object.keys(t).filter(k => k !== '_savedAt').length > 0
        )
        if (hasTests) sessionsStatusMap[pid].hasTests = true

        // Tem anamnese se há pelo menos um valor não-vazio
        const hasAnamnesis = Object.values(s.anamnesis || {}).some(v =>
          v !== null && v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0)
        )
        if (hasAnamnesis) sessionsStatusMap[pid].hasAnamnesis = true
      })

      // Enriquece cada devolutiva com status semafórico
      const enriched = devolutivas.map(dv => {
        const ncPatient = pdMap[dv.paciente.codigo] || null
        let laudoStatus = 'sem_vinculo'
        let hasApprovedReport = false

        if (ncPatient) {
          const sess = sessionsStatusMap[ncPatient.id] || {}
          hasApprovedReport = (reportsMap[ncPatient.id] || []).some(r => r.approved)

          if (hasApprovedReport || (sess.hasTests && sess.hasAnamnesis)) {
            laudoStatus = 'pronto'
          } else if (sess.hasTests) {
            laudoStatus = 'aguardando_anamnese'
          } else {
            laudoStatus = 'aguardando_correcao'
          }
        }

        return { ...dv, ncPatient, laudoStatus, hasApprovedReport }
      })

      setItems(enriched)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('[Devolutivas]', e)
      setError('Erro ao buscar devolutivas do ProDoctor. Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user])

  // Agrupa por data
  const grouped = {}
  items.forEach(item => {
    const key = item.date.toDateString()
    if (!grouped[key]) grouped[key] = { date: item.date, items: [] }
    grouped[key].items.push(item)
  })
  const groups = Object.values(grouped).sort((a, b) => a.date - b.date)

  const totalCorrecao  = items.filter(i => i.laudoStatus === 'aguardando_correcao').length
  const totalAnamnese  = items.filter(i => i.laudoStatus === 'aguardando_anamnese').length
  const totalPronto    = items.filter(i => i.laudoStatus === 'pronto').length
  const totalSemVincul = items.filter(i => i.laudoStatus === 'sem_vinculo').length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={18} color={S.greenL} /> DEVOLUTIVAS
          </h1>
          <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>
            Agendamentos tipo Devolutiva nos próximos 7 dias — via ProDoctor
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
            borderRadius: 8, border: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.05)',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* Resumo com legenda de cores */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ background: S.card, borderRadius: 8, border: `1px solid ${S.border}`, padding: '10px 18px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{items.length}</div>
              <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
            </div>
            <div style={{ width: 1, background: S.border }} />
            <div style={{ textAlign: 'center' }} title="Estagiário precisa lançar os testes">
              <div style={{ fontSize: 20, fontWeight: 700, color: S.amber }}>{totalCorrecao}</div>
              <div style={{ fontSize: 10, color: S.amber, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Corrigir Testes</div>
            </div>
            <div style={{ textAlign: 'center' }} title="Neuropsicólogo precisa preencher a anamnese">
              <div style={{ fontSize: 20, fontWeight: 700, color: '#60A5FA' }}>{totalAnamnese}</div>
              <div style={{ fontSize: 10, color: '#60A5FA', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preencher Anamnese</div>
            </div>
            <div style={{ textAlign: 'center' }} title="Devolutiva pode acontecer">
              <div style={{ fontSize: 20, fontWeight: 700, color: S.greenL }}>{totalPronto}</div>
              <div style={{ fontSize: 10, color: S.greenL, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prontos p/ Devolutiva</div>
            </div>
            {totalSemVincul > 0 && (
              <div style={{ textAlign: 'center' }} title="Não cadastrado no NeuroClin">
                <div style={{ fontSize: 20, fontWeight: 700, color: S.muted }}>{totalSemVincul}</div>
                <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Não Cadastrados</div>
              </div>
            )}
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 11, color: S.muted }}>
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 60, textAlign: 'center' }}>
          <Loader2 size={28} color={S.greenL} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, color: S.muted }}>Buscando devolutivas no ProDoctor...</div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Consultando agenda dos próximos 7 dias</div>
        </div>
      )}

      {/* Erro */}
      {!loading && error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '16px 20px', color: S.red, fontSize: 13,
        }}>
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: 8 }} />
          {error}
        </div>
      )}

      {/* Sem devolutivas */}
      {!loading && !error && items.length === 0 && (
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 60, textAlign: 'center' }}>
          <CalendarClock size={40} color={S.muted} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Nenhuma devolutiva encontrada</div>
          <div style={{ fontSize: 12, color: S.muted }}>
            Não há agendamentos do tipo Devolutiva nos próximos 7 dias no ProDoctor.
          </div>
        </div>
      )}

      {/* Lista agrupada por data */}
      {!loading && groups.map(group => (
        <div key={group.date.toDateString()} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: S.greenL,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 8, paddingLeft: 4,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <CalendarClock size={12} />
            {formatDateLabel(group.date)}
            <span style={{ color: S.muted, fontWeight: 400 }}>
              · {group.items.length} devolutiva{group.items.length !== 1 ? 's' : ''}
            </span>
          </div>
          {group.items.map((item, i) => (
            <DevolutivaCard key={i} item={item} />
          ))}
        </div>
      ))}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
