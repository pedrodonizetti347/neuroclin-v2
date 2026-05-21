import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { getDevolutivas14Days, clearDevolutivasCache } from '@/services/prodoctorApi'
import {
  CalendarClock, RefreshCw, CheckCircle2, AlertTriangle,
  FileText, BookOpen, Clock, ChevronRight, Loader2,
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

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
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

function LaudoStatusBadge({ status }) {
  const cfg = {
    aprovado:   { bg: 'rgba(46,125,50,0.2)',   color: '#4CAF50', label: 'Laudo aprovado',  icon: CheckCircle2 },
    rascunho:   { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B', label: 'Rascunho',        icon: AlertTriangle },
    sem_laudo:  { bg: 'rgba(239,68,68,0.2)',   color: '#EF4444', label: 'Sem laudo',       icon: AlertTriangle },
    sem_vinculo:{ bg: 'rgba(255,255,255,0.06)', color: S.muted,  label: 'Não vinculado',   icon: Clock },
  }
  const c = cfg[status] || cfg.sem_vinculo
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

function DevolutivaCard({ item }) {
  const navigate = useNavigate()
  const { paciente, hora, professional, laudoStatus, ncPatient } = item

  const urgente = laudoStatus === 'sem_laudo' || laudoStatus === 'sem_vinculo'

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8, marginBottom: 6,
      background: urgente ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
      border: urgente ? '1px solid rgba(239,68,68,0.2)' : `1px solid ${S.border}`,
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      {/* Hora */}
      <div style={{
        minWidth: 48, textAlign: 'center', background: 'rgba(255,255,255,0.05)',
        borderRadius: 6, padding: '6px 0',
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

      {/* Status laudo */}
      <LaudoStatusBadge status={laudoStatus} />

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
            <button
              onClick={() => navigate(`/laudos?paciente=${ncPatient.id}`)}
              title="Ir para laudos"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                borderRadius: 6, border: 'none',
                background: laudoStatus === 'aprovado' ? S.green : S.amber,
                color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700,
              }}
            >
              <FileText size={12} />
              {laudoStatus === 'aprovado' ? 'Ver laudo' : 'Gerar laudo'}
            </button>
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
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  async function load(refresh = false) {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      if (refresh) clearDevolutivasCache()

      // Busca devolutivas ProDoctor + pacientes/laudos NeuroClin em paralelo
      const [devolutivas, patientsSnap, reportsSnap] = await Promise.all([
        getDevolutivas14Days(refresh),
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'reports')),
      ])

      // Mapa prodoctor_id → paciente NeuroClin
      const pdMap = {}
      patientsSnap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() }
        if (p.prodoctor_id) pdMap[p.prodoctor_id] = p
      })

      // Mapa patientId → laudos (mais recente primeiro)
      const reportsMap = {}
      reportsSnap.docs.forEach(d => {
        const r = { id: d.id, ...d.data() }
        if (!reportsMap[r.patientId]) reportsMap[r.patientId] = []
        reportsMap[r.patientId].push(r)
      })

      // Enriquece cada devolutiva com dados do NeuroClin
      const enriched = devolutivas.map(dv => {
        const ncPatient = pdMap[dv.paciente.codigo] || null
        let laudoStatus = 'sem_vinculo'
        if (ncPatient) {
          const patReports = (reportsMap[ncPatient.id] || [])
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          const latest = patReports[0]
          if (!latest)        laudoStatus = 'sem_laudo'
          else if (latest.approved) laudoStatus = 'aprovado'
          else                laudoStatus = 'rascunho'
        }
        return { ...dv, ncPatient, laudoStatus }
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

  const totalSemLaudo = items.filter(i => i.laudoStatus === 'sem_laudo').length
  const totalRascunho = items.filter(i => i.laudoStatus === 'rascunho').length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={18} color={S.greenL} /> DEVOLUTIVAS
          </h1>
          <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>
            Agendamentos tipo Devolutiva nos próximos 14 dias — via ProDoctor
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

      {/* Resumo */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ background: S.card, borderRadius: 8, border: `1px solid ${S.border}`, padding: '10px 16px', display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{items.length}</div>
              <div style={{ fontSize: 10, color: S.muted }}>DEVOLUTIVAS</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: S.red }}>{totalSemLaudo}</div>
              <div style={{ fontSize: 10, color: S.muted }}>SEM LAUDO</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: S.amber }}>{totalRascunho}</div>
              <div style={{ fontSize: 10, color: S.muted }}>RASCUNHO</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: S.greenL }}>{items.length - totalSemLaudo - totalRascunho}</div>
              <div style={{ fontSize: 10, color: S.muted }}>PRONTOS</div>
            </div>
          </div>
          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: S.muted }}>
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
          <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Consultando agenda dos próximos 14 dias</div>
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
            Não há agendamentos do tipo Devolutiva nos próximos 14 dias no ProDoctor.
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
