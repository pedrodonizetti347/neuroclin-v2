import React, { useState, useEffect, useCallback } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { BarChart2, Users, FileText, CheckCircle, Clock, Download, AlertTriangle, RefreshCw } from 'lucide-react'
import { TESTES_FOTOS_CONFIG } from '@/pages/UploadConvenio'

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MIN_DOCS = {
  'NEUPSILIN': 10, 'DEX': 4, 'MEMIMP': 2,
  'BAMS': 2, 'TOKEN': 2, 'B-ADL': 2, 'Pfeffer': 2,
  'WCST': 2, 'WASI': 6, 'WASI-III': 10,
}

const S = {
  bg:     '#0F1B2D',
  card:   '#1A2744',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  amber:  '#F59E0B',
  red:    '#EF4444',
  blue:   '#60A5FA',
}

// ── Gráfico de barras SVG simples ────────────────────────────────────────────
function BarChart({ data, color = S.greenL, height = 140 }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * (height - 28), d.value > 0 ? 3 : 0)
        const y = height - 18 - h
        return (
          <g key={i}>
            <rect x={i * barW + barW * 0.18} y={y} width={barW * 0.64} height={h} fill={color} rx="1.5" opacity="0.9" />
            <text x={i * barW + barW / 2} y={height - 3} textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.4)">{d.label}</text>
            {d.value > 0 && <text x={i * barW + barW / 2} y={y - 3} textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.85)" fontWeight="700">{d.value}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// ── Card de KPI ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color = S.greenL, sub }) {
  return (
    <div style={{ background: S.card, borderRadius: 12, padding: '20px 22px', border: `1px solid ${S.border}`, flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={color} />
        </div>
        <span style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', lineHeight: 1.3 }}>{label}</span>
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ── Seção com título ──────────────────────────────────────────────────────────
function Section({ title, children, style }) {
  return (
    <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: '20px 24px', ...style }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: S.muted, margin: '0 0 18px', textTransform: 'uppercase' }}>{title}</h2>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'estagiario'

  const now = new Date()
  const [filterYear, setFilterYear]   = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [patients, setPatients]       = useState([])
  const [reports, setReports]         = useState([])
  const [sessions, setSessions]       = useState([])
  const [users, setUsers]             = useState([])
  const [anamneses, setAnamneses]     = useState([])

  // Buscas por seção
  const [searchDocs, setSearchDocs]         = useState('')
  const [searchProd, setSearchProd]         = useState('')
  const [searchAnamnese, setSearchAnamnese] = useState('')
  const [convenioUploads,  setConvenioUploads]  = useState([])
  const [searchConvenio,   setSearchConvenio]   = useState('')
  const [filterConvenio,   setFilterConvenio]   = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pSnap, rSnap, sSnap, uSnap, aSnap] = await Promise.all([
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'reports')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'anamneses')),
      ])
      setPatients(pSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setReports(rSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setSessions(sSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setAnamneses(aSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('[Analytics]', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    getDocs(collection(db, 'convenio_uploads'))
      .then(snap => setConvenioUploads(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(e => console.warn('[Analytics] convenio_uploads:', e))
  }, [])

  // ── Acesso restrito ──
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <AlertTriangle size={40} color={S.amber} style={{ marginBottom: 16 }} />
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Acesso restrito</h2>
        <p style={{ color: S.muted, fontSize: 13 }}>Esta área é exclusiva para administradores do sistema.</p>
      </div>
    )
  }

  // ── Utilidade: converte timestamp Firestore ou Date para objeto Date ──
  const toDate = (ts) => {
    if (!ts) return null
    if (ts.toDate) return ts.toDate()
    return new Date(ts)
  }

  const inRange = (ts) => {
    const d = toDate(ts)
    if (!d) return false
    if (d.getFullYear() !== filterYear) return false
    if (filterMonth !== null && d.getMonth() !== filterMonth) return false
    return true
  }

  const filteredReports = reports.filter(r => inRange(r.createdAt))

  // ── KPIs ──
  const totalPatients = patients.length
  const totalReports  = filteredReports.length
  const approved      = filteredReports.filter(r => r.status === 'aprovado').length
  const pending       = filteredReports.filter(r => r.status !== 'aprovado').length

  // ── Laudos por mês (sempre ano inteiro) ──
  const byMonth = Array.from({ length: 12 }, (_, i) => ({
    label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
    value: reports.filter(r => {
      const d = toDate(r.createdAt)
      return d && d.getFullYear() === filterYear && d.getMonth() === i
    }).length,
  }))

  // ── Convênios / Fonte ──
  const sourceCount = filteredReports.reduce((acc, r) => {
    const s = r.source || 'particular'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const sourceLabel = { prevent: 'Prevent Senior', particular: 'Particular' }

  // ── Anamneses ──
  const anamneseFilled = sessions.filter(s => s.anamnesis && Object.keys(s.anamnesis).length > 0).length
  const anamnPct = totalPatients ? Math.round((anamneseFilled / totalPatients) * 100) : 0

  // ── Documentação de testes ──
  // Fotos salvas em sessions.tests.{testKey}.scan_urls (campo nativo do sistema)
  // testDocumentation é preenchido pelo novo código — fallback para retrocompatibilidade
  const sessionsWithDocs = sessions.map(s => {
    const testsObj = s.tests || {}
    const docMap = {}

    for (const [testKey, testData] of Object.entries(testsObj)) {
      const urls = testData?.scan_urls
      if (Array.isArray(urls) && urls.length > 0) {
        const min = MIN_DOCS[testKey] ?? 1
        docMap[testKey] = { count: urls.length, min, complete: urls.length >= min }
      }
    }

    // Complementa com testDocumentation para chaves ainda não cobertas
    // Recalcula complete com MIN_DOCS atual (ignora valor salvo — pode estar desatualizado)
    for (const [testKey, data] of Object.entries(s.testDocumentation || {})) {
      if (!docMap[testKey] && (data?.count || 0) > 0) {
        const min = MIN_DOCS[testKey] ?? 1
        docMap[testKey] = { ...data, min, complete: (data.count || 0) >= min }
      }
    }

    return { session: s, docMap }
  }).filter(({ docMap }) => Object.keys(docMap).length > 0)

  // ── Produção por Profissional ──
  const byProfessional = filteredReports.reduce((acc, r) => {
    const name = r.professionalName || r.professionalId || 'Não identificado'
    if (!acc[name]) acc[name] = { total: 0, aprovados: 0 }
    acc[name].total++
    if (r.status === 'aprovado') acc[name].aprovados++
    return acc
  }, {})

  // ── Mapa de usuários: id → { name, role } ──
  const userInfoMap = users.reduce((acc, u) => {
    acc[u.id] = { name: u.full_name || u.name || u.email || u.id, role: u.role || '' }
    return acc
  }, {})

  // ── Correção de Testes — apenas role 'estagiario' ──
  const testsByEstagiario = {}
  for (const s of sessions) {
    for (const [testKey, testData] of Object.entries(s.tests || {})) {
      const savedBy = testData?._savedBy
      if (!savedBy) continue
      const info = userInfoMap[savedBy]
      if (!info || info.role !== 'estagiario') continue
      if (!testsByEstagiario[info.name]) testsByEstagiario[info.name] = { total: 0, testes: {} }
      testsByEstagiario[info.name].total++
      testsByEstagiario[info.name].testes[testKey] = (testsByEstagiario[info.name].testes[testKey] || 0) + 1
    }
  }

  // ── Anamneses por Profissional — usa savedBy da coleção 'anamneses' (campo adicionado ago/26)
  // Fallback: sessions.anamnesisSavedBy → sessions.lastUpdatedBy (para dados anteriores)
  const anamneseByProfessional = {}
  for (const a of anamneses) {
    // Determina o userId: savedBy (campo direto) > fallback nas sessions
    let userId = a.savedBy || null
    if (!userId) {
      const sess = sessions.find(s => (s.patientId || s.id) === a.id)
      userId = sess?.anamnesisSavedBy || sess?.lastUpdatedBy || null
    }
    if (!userId) continue
    const info = userInfoMap[userId]
    if (!info || (info.role !== 'professional' && info.role !== 'supervisor')) continue
    if (!anamneseByProfessional[info.name]) anamneseByProfessional[info.name] = { total: 0, pacientes: [] }
    const patient = patients.find(p => p.id === a.id)
    const patientName = patient?.full_name || patient?.name || a.id
    anamneseByProfessional[info.name].total++
    anamneseByProfessional[info.name].pacientes.push(patientName)
  }

  // ── CSV export ──
  const exportCSV = () => {
    const header = ['ID', 'Profissional', 'Status', 'Convênio', 'Data']
    const rows = filteredReports.map(r => [
      r.id,
      r.professionalName || '',
      r.status || '',
      sourceLabel[r.source] || r.source || 'Particular',
      toDate(r.createdAt)?.toLocaleDateString('pt-BR') || '',
    ])
    const csv = [header, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `laudos_${filterYear}${filterMonth !== null ? `_${filterMonth + 1}` : ''}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const years = []
  for (let y = now.getFullYear() - 2; y <= now.getFullYear(); y++) years.push(y)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px 60px', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.04em', margin: 0 }}>RELATÓRIOS E ESTATÍSTICAS</h1>
          <p style={{ fontSize: 12, color: S.muted, margin: '4px 0 0' }}>Painel administrativo — visão geral do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${S.border}`, background: 'transparent', color: S.muted, fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={13} /> Atualizar
          </button>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px solid ${S.greenL}`, background: 'transparent', color: S.greenL, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ── FILTRO ── */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.07em' }}>FILTRAR POR:</span>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          style={{ background: '#0F1B2D', border: `1px solid ${S.border}`, borderRadius: 7, color: '#fff', padding: '5px 10px', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterMonth ?? ''} onChange={e => setFilterMonth(e.target.value === '' ? null : Number(e.target.value))}
          style={{ background: '#0F1B2D', border: `1px solid ${S.border}`, borderRadius: 7, color: '#fff', padding: '5px 10px', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          <option value="">Todos os meses</option>
          {MONTHS_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        {filterMonth !== null && (
          <button onClick={() => setFilterMonth(null)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${S.border}`, background: 'transparent', color: S.muted, fontSize: 11, cursor: 'pointer' }}>
            Limpar filtro
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: S.muted, fontSize: 14 }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Carregando dados...</div>
        </div>
      ) : (
        <>
          {/* ── SEÇÃO 1 — KPIs ── */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
            <KpiCard icon={Users}       label="Pacientes cadastrados" value={totalPatients} color={S.greenL} />
            <KpiCard icon={FileText}    label={filterMonth !== null ? `Laudos em ${MONTHS_FULL[filterMonth]}` : `Laudos em ${filterYear}`} value={totalReports} color={S.blue} />
            <KpiCard icon={CheckCircle} label="Aprovados" value={approved} color={S.greenL} sub={totalReports ? `${Math.round(approved/totalReports*100)}% do total` : undefined} />
            <KpiCard icon={Clock}       label="Em revisão" value={pending} color={S.amber} />
          </div>

          {/* ── SEÇÃO 2 — Laudos por mês ── */}
          <Section title={`Laudos por mês — ${filterYear}`} style={{ marginBottom: 20 }}>
            {byMonth.every(d => d.value === 0) ? (
              <p style={{ fontSize: 13, color: S.muted, textAlign: 'center', padding: '24px 0' }}>Nenhum laudo registrado em {filterYear}.</p>
            ) : (
              <BarChart data={byMonth} color={S.greenL} height={150} />
            )}
          </Section>

          {/* ── SEÇÃO 3 — Convênios ── */}
          <Section title="Laudos por convênio" style={{ marginBottom: 20 }}>
            {Object.keys(sourceCount).length === 0 ? (
              <p style={{ fontSize: 13, color: S.muted }}>Nenhum laudo no período selecionado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).map(([src, cnt]) => {
                  const label = sourceLabel[src] || (src.charAt(0).toUpperCase() + src.slice(1))
                  const pct = totalReports ? Math.round((cnt / totalReports) * 100) : 0
                  return (
                    <div key={src}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 13, color: S.muted }}>{cnt} laudo{cnt !== 1 ? 's' : ''} ({pct}%)</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: S.greenL, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* ── SEÇÃO 4 — Anamneses ── */}
          <Section title="Anamneses preenchidas" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{anamneseFilled}</div>
              <div style={{ fontSize: 13, color: S.muted }}>de {totalPatients} pacientes</div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 5, background: anamnPct >= 80 ? S.greenL : anamnPct >= 50 ? S.amber : S.red, width: `${anamnPct}%`, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 5 }}>{anamnPct}% preenchidas</div>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`, fontSize: 12, color: S.muted }}>
              {totalPatients - anamneseFilled === 0
                ? '✅ Todos os pacientes têm anamnese preenchida.'
                : `⚠️ ${totalPatients - anamneseFilled} paciente${totalPatients - anamneseFilled !== 1 ? 's' : ''} sem anamnese preenchida.`}
            </div>
          </Section>

          {/* ── SEÇÃO 5 — Documentação de testes ── */}
          <Section title="Documentação de testes (fotos das folhas)" style={{ marginBottom: 20 }}>
            {sessionsWithDocs.length === 0 ? (
              <p style={{ fontSize: 13, color: S.muted }}>Nenhuma documentação de teste registrada ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={searchDocs} onChange={e => setSearchDocs(e.target.value)} placeholder="Buscar paciente..." style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.border}`, borderRadius: 8, color: '#fff', padding: '7px 12px', fontSize: 12, outline: 'none', marginBottom: 4 }} />
                <div style={{ display: 'flex', gap: 16, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: S.muted }}>🔴 Sem fotos &nbsp;|&nbsp; 🟡 Incompleto &nbsp;|&nbsp; 🟢 Completo</span>
                </div>
                {sessionsWithDocs
                  .filter(({ session: s, docMap }) => {
                    if (!searchDocs) return true
                    const patientId = s.patientId || s.id
                    const patient = patients.find(p => p.id === patientId)
                    const name = patient?.full_name || patient?.name || patientId
                    return name.toLowerCase().includes(searchDocs.toLowerCase())
                  })
                  .map(({ session: s, docMap }) => {
                    const keys = Object.keys(docMap)
                    const patientId = s.patientId || s.id
                    const patient = patients.find(p => p.id === patientId)
                    const name = patient?.full_name || patient?.name || patientId
                    const allComplete = keys.every(k => docMap[k]?.complete)
                    const anyDocs     = keys.some(k => (docMap[k]?.count || 0) > 0)
                    const rowColor  = allComplete ? 'rgba(76,175,80,0.06)'  : anyDocs ? 'rgba(245,158,11,0.06)'  : 'rgba(239,68,68,0.06)'
                    const rowBorder = allComplete ? 'rgba(76,175,80,0.2)'   : anyDocs ? 'rgba(245,158,11,0.2)'   : 'rgba(239,68,68,0.2)'
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: rowColor, border: `1px solid ${rowBorder}`, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 600, flex: '1 1 160px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {keys.map(k => {
                            const cnt = docMap[k]?.count || 0
                            const min = docMap[k]?.min ?? (MIN_DOCS[k] ?? 1)
                            const emoji = cnt === 0 ? '🔴' : cnt < min ? '🟡' : '🟢'
                            return (
                              <span key={k} style={{ fontSize: 11, color: S.muted, background: 'rgba(255,255,255,0.05)', borderRadius: 5, padding: '2px 7px' }}>
                                {emoji} {k} ({cnt}/{min})
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </Section>

          {/* ── SEÇÃO 5b — Convênios e Particular ── */}
          <Section title="Convênios e Particular — documentação de testes" style={{ marginBottom: 20 }}>
            {convenioUploads.length === 0 ? (
              <p style={{ fontSize: 13, color: S.muted }}>Nenhum upload de convênio registrado ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <input
                    value={searchConvenio}
                    onChange={e => setSearchConvenio(e.target.value)}
                    placeholder="Buscar paciente..."
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.border}`, borderRadius: 8, color: '#fff', padding: '7px 12px', fontSize: 12, outline: 'none', flex: 1, minWidth: 160 }}
                  />
                  <select
                    value={filterConvenio}
                    onChange={e => setFilterConvenio(e.target.value)}
                    style={{ background: '#0F1B2D', border: `1px solid ${S.border}`, borderRadius: 8, color: '#fff', padding: '7px 12px', fontSize: 12, outline: 'none' }}
                  >
                    <option value="">Todos os convênios</option>
                    {['Particular','Hapvida Notredame Intermedica','Cassi','Cabesp','Plan Assist'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: S.muted }}>🔴 Sem arquivos &nbsp;|&nbsp; 🟡 Parcial &nbsp;|&nbsp; 🟢 Completo</span>
                </div>
                {convenioUploads
                  .filter(u => {
                    if (filterConvenio && u.convenio !== filterConvenio) return false
                    if (searchConvenio) {
                      const patient = patients.find(p => p.id === u.patientId)
                      const name = patient?.full_name || patient?.name || u.patientId || ''
                      return name.toLowerCase().includes(searchConvenio.toLowerCase())
                    }
                    return true
                  })
                  .map(u => {
                    const patient  = patients.find(p => p.id === u.patientId)
                    const name     = patient?.full_name || patient?.name || u.patientId
                    const testes   = Object.entries(u.testes || {})
                    const CONV_CLR = {
                      'Particular': '#60A5FA', 'Hapvida Notredame Intermedica': '#a78bfa',
                      'Cassi': '#34d399', 'Cabesp': '#fb923c', 'Plan Assist': '#f472b6',
                    }
                    const badgeColor = CONV_CLR[u.convenio] || S.muted
                    const allComplete = testes.every(([nome, arqs]) => {
                      const cfg = TESTES_FOTOS_CONFIG.find(t => t.nome === nome)
                      return cfg?.totalFotos != null && (arqs?.length || 0) >= cfg.totalFotos
                    })
                    const anyFiles  = testes.some(([, arqs]) => (arqs?.length || 0) > 0)
                    const rowColor  = allComplete ? 'rgba(76,175,80,0.06)'  : anyFiles ? 'rgba(245,158,11,0.06)'  : 'rgba(239,68,68,0.06)'
                    const rowBorder = allComplete ? 'rgba(76,175,80,0.2)'   : anyFiles ? 'rgba(245,158,11,0.2)'   : 'rgba(239,68,68,0.2)'
                    return (
                      <div key={u.id} style={{ padding: '10px 14px', borderRadius: 8, background: rowColor, border: `1px solid ${rowBorder}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: testes.length ? 8 : 0, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, color: '#fff', fontWeight: 600, flex: '1 1 140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, color: badgeColor, border: `1px solid ${badgeColor}`, background: 'rgba(255,255,255,0.04)' }}>
                            {u.convenio}
                          </span>
                        </div>
                        {testes.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {testes.map(([nome, arqs]) => {
                              const cnt   = arqs?.length || 0
                              const cfg   = TESTES_FOTOS_CONFIG.find(t => t.nome === nome)
                              const total = cfg?.totalFotos ?? null
                              const emoji = cnt === 0 ? '🔴' : total != null && cnt >= total ? '🟢' : '🟡'
                              return (
                                <span key={nome} style={{ fontSize: 11, color: S.muted, background: 'rgba(255,255,255,0.05)', borderRadius: 5, padding: '2px 7px' }}>
                                  {emoji} {nome} ({cnt}{total != null ? `/${total}` : ''})
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </Section>

          {/* ── SEÇÃO 6 — Produção por Profissional ── */}
          <Section title="Produção por profissional" style={{ marginBottom: 20 }}>
            {Object.keys(byProfessional).length === 0 ? (
              <p style={{ fontSize: 13, color: S.muted }}>Nenhum laudo no período selecionado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={searchProd} onChange={e => setSearchProd(e.target.value)} placeholder="Buscar profissional..." style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.border}`, borderRadius: 8, color: '#fff', padding: '7px 12px', fontSize: 12, outline: 'none', marginBottom: 4 }} />
                {Object.entries(byProfessional)
                  .filter(([name]) => !searchProd || name.toLowerCase().includes(searchProd.toLowerCase()))
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([name, data]) => {
                    const pct = totalReports ? Math.round((data.total / totalReports) * 100) : 0
                    const aprvPct = data.total ? Math.round((data.aprovados / data.total) * 100) : 0
                    return (
                      <div key={name} style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{name}</span>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: S.muted }}>{data.total} laudo{data.total !== 1 ? 's' : ''}</span>
                            <span style={{ fontSize: 11, color: S.greenL, background: 'rgba(76,175,80,0.12)', borderRadius: 5, padding: '1px 7px' }}>
                              {data.aprovados} aprovado{data.aprovados !== 1 ? 's' : ''} ({aprvPct}%)
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: S.blue, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </Section>

          {/* ── SEÇÃO 7 — Correção de Testes por Estagiário ── */}
          <Section title="Correção de testes por estagiário" style={{ marginBottom: 20 }}>
            {Object.keys(testsByEstagiario).length === 0 ? (
              <p style={{ fontSize: 13, color: S.muted }}>Nenhum estagiário com testes registrados no sistema.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(testsByEstagiario).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => (
                  <div key={name} style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{name}</span>
                      <span style={{ fontSize: 12, color: S.muted }}>{data.total} teste{data.total !== 1 ? 's' : ''} preenchido{data.total !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(data.testes).sort((a, b) => b[1] - a[1]).map(([testKey, cnt]) => (
                        <span key={testKey} style={{ fontSize: 11, color: S.muted, background: 'rgba(255,255,255,0.06)', borderRadius: 5, padding: '2px 8px' }}>
                          {testKey}: {cnt}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── SEÇÃO 8 — Anamneses por Profissional ── */}
          <Section title="Anamneses por profissional">
            {Object.keys(anamneseByProfessional).length === 0 ? (
              <p style={{ fontSize: 13, color: S.muted }}>
                Nenhuma anamnese com profissional identificado.{' '}
                <span style={{ fontSize: 11 }}>Os próximos salvamentos registrarão o autor automaticamente.</span>
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={searchAnamnese} onChange={e => setSearchAnamnese(e.target.value)} placeholder="Buscar paciente..." style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.border}`, borderRadius: 8, color: '#fff', padding: '7px 12px', fontSize: 12, outline: 'none', marginBottom: 4 }} />
                {Object.entries(anamneseByProfessional).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => {
                  const filteredPacientes = searchAnamnese
                    ? data.pacientes.filter(p => p.toLowerCase().includes(searchAnamnese.toLowerCase()))
                    : data.pacientes
                  if (searchAnamnese && filteredPacientes.length === 0) return null
                  return (
                    <div key={name} style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{name}</span>
                        <span style={{ fontSize: 12, color: S.blue, background: 'rgba(96,165,250,0.12)', borderRadius: 5, padding: '1px 8px' }}>
                          {data.total} anamnese{data.total !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {filteredPacientes.map((p, i) => (
                          <span key={i} style={{ fontSize: 11, color: S.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${S.border}`, borderRadius: 5, padding: '2px 7px' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
