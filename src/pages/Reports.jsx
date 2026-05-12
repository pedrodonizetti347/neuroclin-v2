import React, { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { useTestSession } from '@/hooks/useTestSession'
import { FileText, Loader2, CheckCircle2, Download, AlertCircle } from 'lucide-react'

// Dados do supervisor responsável
const SUPERVISOR = {
  name:    'Dr. Pedro Donizetti',
  crp:     'CRP 06/82060',
  clinic:  'Neuroavaliação — Neuropsicologia na Prática',
}

const TESTS_LIST = [
  { key: 'NEUPSILIN', label: 'Neupsilin',  group: 'Bateria Cognitiva' },
  { key: 'TRIACOG',   label: 'TRIACOG',    group: 'Bateria Cognitiva' },
  { key: 'RAVLT',     label: 'RAVLT',      group: 'Memória' },
  { key: 'BAMS',      label: 'BAMS',       group: 'Memória Semântica' },
  { key: 'WASI',      label: 'WASI',       group: 'Inteligência' },
  { key: 'WASI-III',  label: 'WASI-III',   group: 'Inteligência' },
  { key: 'WCST-N',    label: 'WCST-N',     group: 'Funções Executivas' },
  { key: 'DEX',       label: 'DEX',        group: 'Funções Executivas' },
  { key: 'FAB',       label: 'FAB',        group: 'Funções Executivas' },
  { key: 'GDS-15',    label: 'GDS-15',     group: 'Humor' },
  { key: 'GAI',       label: 'GAI',        group: 'Humor' },
  { key: 'BDI-II',    label: 'BDI-II',     group: 'Humor' },
  { key: 'HAD',       label: 'HAD',        group: 'Humor' },
  { key: 'IQCODE',    label: 'IQCODE',     group: 'Funcional' },
  { key: 'B-ADL',     label: 'B-ADL',      group: 'Funcional' },
  { key: 'Pfeffer',   label: 'Pfeffer',    group: 'Funcional' },
  { key: 'Lawton',    label: 'Lawton',     group: 'Funcional' },
  { key: 'IDATE-E',   label: 'IDATE-E',    group: 'Ansiedade' },
  { key: 'IDATE-T',   label: 'IDATE-T',    group: 'Ansiedade' },
  { key: 'TOKEN',     label: 'Token Test', group: 'Linguagem' },
  { key: 'BADL',      label: 'BADL',       group: 'Funcional' },
]

const STEPS = [
  'Carregando dados do paciente...',
  'Coletando resultados dos testes...',
  'Processando avaliação clínica...',
  'Redigindo análise neuropsicológica...',
  'Finalizando laudo...',
]

const S = {
  card:   '#1A2744',
  cardG:  '#1A3D2B',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  amber:  '#F59E0B',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${S.border}`,
  color: '#fff', borderRadius: 8,
  padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none',
}

export default function Reports() {
  const { user } = useAuth()
  const [patients,       setPatients]       = useState([])
  const [patientId,      setPatientId]      = useState('')
  const [selectedTests,  setSelectedTests]  = useState([])
  const [appliedBy,      setAppliedBy]      = useState('')
  const [report,         setReport]         = useState('')
  const [loading,        setLoading]        = useState(false)
  const [step,           setStep]           = useState(0)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')
  const [pdfLoading,     setPdfLoading]     = useState(false)  // ← NOVO

  const session = useTestSession(patientId)

  useEffect(() => {
    getDocs(query(collection(db, 'patients'), orderBy('createdAt', 'desc')))
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => getDocs(collection(db, 'patients'))
        .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })))))
  }, [])

  useEffect(() => {
    if (patientId) session.loadSession()
  }, [patientId])

  const toggleTest = (key) =>
    setSelectedTests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const patient = patients.find(p => p.id === patientId)

  // Assinatura oficial do laudo
  const buildSignature = () => `
<div style="margin-top:40px;padding-top:20px;border-top:2px solid #1A2744;font-family:Georgia,serif">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px">
    <div>
      <p style="font-size:12px;color:#555;margin-bottom:4px">Testes aplicados por:</p>
      <p style="font-size:14px;font-weight:bold;color:#1a1a2e">${appliedBy || user?.full_name || 'Profissional responsável'}</p>
      <p style="font-size:12px;color:#555">${user?.crp || 'Psicólogo(a)'}</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:12px;color:#555;margin-bottom:4px">Laudo elaborado sob supervisão de:</p>
      <p style="font-size:15px;font-weight:bold;color:#1a1a2e">${SUPERVISOR.name}</p>
      <p style="font-size:12px;color:#555">${SUPERVISOR.crp}</p>
      <p style="font-size:12px;color:#555">${SUPERVISOR.clinic}</p>
    </div>
  </div>
  <div style="margin-top:30px;text-align:center">
    <div style="display:inline-block;border-top:1px solid #999;padding-top:8px;min-width:220px">
      <p style="font-size:13px;font-weight:bold;color:#1a1a2e">${SUPERVISOR.name}</p>
      <p style="font-size:12px;color:#555">${SUPERVISOR.crp} · ${SUPERVISOR.clinic}</p>
    </div>
  </div>
  <p style="font-size:10px;color:#aaa;text-align:center;margin-top:16px">
    Documento gerado em ${new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' })}
  </p>
</div>`

  const generate = async () => {
    if (!patientId)            return setError('Selecione um paciente.')
    if (selectedTests.length === 0) return setError('Selecione ao menos um teste.')
    setError('')
    setLoading(true)
    setSaved(false)
    setReport('')

    try {
      for (let i = 0; i < STEPS.length; i++) {
        setStep(i)
        await new Promise(r => setTimeout(r, 500))
      }

      const token  = await auth.currentUser?.getIdToken()
      const fnUrl  = import.meta.env.VITE_FUNCTIONS_URL

      const neu = session.session.tests.NEUPSILIN || {}
      const neupsilinZScores = {
        orientation: neu.orientation_z,
        attention:   neu.attention_z,
        perception:  neu.perception_z,
        memory:      neu.memory_z,
        arithmetic:  neu.arithmetic_z,
        language:    neu.language_z,
        praxis:      neu.praxis_z,
        executive:   neu.executive_z,
      }

      const payload = {
        patient,
        anamnesisData:    session.session.anamnesis,
        selectedTests,
        testsData:        session.session.tests,
        neupsilinZScores,
        appliedBy:        appliedBy || user?.full_name,
        supervisor:       SUPERVISOR,
        dataFormatada:    new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' }),
      }

      const res = await fetch(`${fnUrl}/generateReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data = await res.json()
      const html = (data.html || '') + buildSignature()

      setReport(html)

      const reportId = await session.saveReport(html, selectedTests)
      if (reportId) setSaved(true)

    } catch (e) {
      setError('Erro ao gerar laudo: ' + e.message)
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  // ── NOVO: download do PDF via generateReportPDF ───────────────────────────
  const downloadPDF = async () => {
    if (!report) return
    setPdfLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const fnUrl = import.meta.env.VITE_FUNCTIONS_URL

      const res = await fetch(`${fnUrl}/generateReportPDF`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          html:          report,
          patient,
          dataFormatada: new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' }),
          supervisor:    SUPERVISOR,
        }),
      })

      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const { pdfBase64 } = await res.json()

      // Converte base64 → Blob → dispara download
      const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
      const blob  = new Blob([bytes], { type: 'application/pdf' })
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      a.href      = url
      a.download  = `Laudo_${patient?.full_name?.replace(/\s+/g, '_') || 'Neuropsicologico'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('Erro ao gerar PDF: ' + e.message)
    } finally {
      setPdfLoading(false)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const print = () => {
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Laudo Neuropsicológico — ${patient?.full_name || ''}</title>
      <style>
        body { font-family: Georgia, serif; padding: 48px; max-width: 820px; margin: 0 auto; color: #1a1a2e; line-height: 1.7; }
        h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .header { border-bottom: 2px solid #1A2744; padding-bottom: 16px; margin-bottom: 24px; }
        h3 { font-size: 14px; font-weight: bold; color: #0C447C; border-bottom: 1px solid #B5D4F4; padding-bottom: 4px; margin: 16px 0 8px; }
        p { font-size: 13px; margin-bottom: 8px; }
        ul { margin-left: 20px; font-size: 13px; }
        li { margin-bottom: 4px; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>
      <div class="header">
        <h1>LAUDO NEUROPSICOLÓGICO</h1>
        <p style="font-size:13px;color:#555">
          Paciente: <strong>${patient?.full_name || ''}</strong><br>
          Data: ${new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' })}<br>
          Testes: ${selectedTests.join(', ')}
        </p>
      </div>
      ${report}
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const groups = [...new Set(TESTS_LIST.map(t => t.group))]

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
          LAUDOS
        </h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>
          Geração de relatórios clínicos neuropsicológicos
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 16 }}>

        {/* Painel esquerdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Supervisor — sempre visível */}
          <div style={{ background: S.cardG, borderRadius: 10, border: '1px solid rgba(46,125,50,0.3)', padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
              SUPERVISÃO
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{SUPERVISOR.name}</div>
            <div style={{ fontSize: 11, color: S.greenL, marginTop: 2 }}>{SUPERVISOR.crp}</div>
            <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{SUPERVISOR.clinic}</div>
          </div>

          {/* Paciente */}
          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
              1. PACIENTE
            </div>
            <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inputStyle}>
              <option value="">— Selecionar paciente —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            {patient && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(46,125,50,0.1)', borderRadius: 6, fontSize: 11, color: S.greenL }}>
                {patient.birth_date && `${new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos`}
                {patient.sex ? ` · ${patient.sex}` : ''}
                {patient.education ? ` · ${patient.education}` : ''}
              </div>
            )}
          </div>

          {/* Quem aplicou */}
          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
              2. TESTES APLICADOS POR
            </div>
            <input
              value={appliedBy} onChange={e => setAppliedBy(e.target.value)}
              placeholder={user?.full_name || 'Nome do profissional...'}
              style={inputStyle}
            />
          </div>

          {/* Testes */}
          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
              3. TESTES APLICADOS ({selectedTests.length})
            </div>
            {groups.map(group => (
              <div key={group} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase' }}>
                  {group}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TESTS_LIST.filter(t => t.group === group).map(t => {
                    const on = selectedTests.includes(t.key)
                    return (
                      <button key={t.key} onClick={() => toggleTest(t.key)} style={{
                        padding: '4px 9px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                        border: on ? `1.5px solid ${S.green}` : `1px solid ${S.border}`,
                        background: on ? 'rgba(46,125,50,0.2)' : 'rgba(255,255,255,0.03)',
                        color: on ? S.greenL : S.muted, fontWeight: on ? 700 : 400,
                      }}>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button onClick={generate} disabled={loading} style={{
            padding: '13px', borderRadius: 10, border: 'none',
            background: loading ? 'rgba(46,125,50,0.4)' : S.green,
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: '0.04em',
          }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {STEPS[step]}</>
              : <><FileText size={16} /> GERAR LAUDO</>}
          </button>
        </div>

        {/* Painel direito — laudo */}
        <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${S.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} color={S.greenL} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                LAUDO NEUROPSICOLÓGICO
              </span>
              {saved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: S.greenL, background: 'rgba(46,125,50,0.15)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                  <CheckCircle2 size={10} /> SALVO
                </span>
              )}
            </div>

            {/* ── Botões de exportação ── */}
            {report && (
              <div style={{ display: 'flex', gap: 8 }}>

                {/* Imprimir (existente) */}
                <button onClick={print} style={{
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                  padding: '5px 12px', borderRadius: 7,
                  border: `1px solid ${S.border}`, background: 'transparent',
                  cursor: 'pointer', color: S.muted,
                }}>
                  <Download size={13} /> IMPRIMIR
                </button>

                {/* ── NOVO: Baixar PDF com timbrado ── */}
                <button onClick={downloadPDF} disabled={pdfLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                  padding: '5px 12px', borderRadius: 7,
                  border: `1.5px solid ${S.greenL}`,
                  background: pdfLoading ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.15)',
                  cursor: pdfLoading ? 'not-allowed' : 'pointer',
                  color: S.greenL,
                }}>
                  {pdfLoading
                    ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</>
                    : <><Download size={13} /> BAIXAR PDF</>}
                </button>

              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: 'auto', maxHeight: '70vh' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 size={32} color={S.greenL} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 13, color: S.greenL, fontWeight: 700 }}>{STEPS[step]}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                  {STEPS.map((_, i) => (
                    <div key={i} style={{
                      width: i <= step ? 24 : 8, height: 4, borderRadius: 2,
                      background: i <= step ? S.green : S.border, transition: 'all 0.3s',
                    }} />
                  ))}
                </div>
              </div>
            )}

            {!loading && !report && (
              <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
                <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>O laudo aparecerá aqui</p>
                <p style={{ fontSize: 11, marginTop: 6 }}>Preencha os campos ao lado e clique em Gerar Laudo</p>
              </div>
            )}

            {!loading && report && (
              <div style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)' }}
                dangerouslySetInnerHTML={{ __html: report }} />
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
