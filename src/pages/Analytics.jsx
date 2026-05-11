import React, { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { FileText, Loader2, Download, CheckCircle2, AlertCircle, Brain, Sparkles } from 'lucide-react'

const S = {
  card: '#1A2744', cardG: '#1A3D2B', green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
  amber: '#F59E0B', blue: '#60A5FA', danger: '#EF4444',
}

const SUPERVISOR = { name: 'Dr. Pedro Donizetti', crp: 'CRP 06/82060', clinic: 'Neuroavaliação — Neuropsicologia na Prática' }

const TEST_GROUPS = [
  { group: 'Memória',           keys: ['RAVLT', 'BAMS'] },
  { group: 'Bateria Cognitiva', keys: ['NEUPSILIN', 'TRIACOG'] },
  { group: 'Inteligência',      keys: ['WASI-III'] },
  { group: 'Funções Executivas',keys: ['WCST-N', 'FAB'] },
  { group: 'Humor',             keys: ['GDS-15', 'BDI-II', 'HAD'] },
  { group: 'Ansiedade',         keys: ['IDATE', 'GAI'] },
  { group: 'Funcional',         keys: ['LAWTON', 'BADL', 'PCRS'] },
  { group: 'Linguagem',         keys: ['TOKEN'] },
]

const TEST_LABELS = {
  RAVLT: 'RAVLT', NEUPSILIN: 'NEUPSILIN', 'WASI-III': 'WASI-III',
  'WCST-N': 'WCST-N', FAB: 'FAB', 'GDS-15': 'GDS-15',
  GAI: 'GAI', 'BDI-II': 'BDI-II', HAD: 'HAD', IDATE: 'IDATE',
  BAMS: 'BAMS', TRIACOG: 'TRIACOG', LAWTON: 'Lawton',
  BADL: 'BADL', PCRS: 'PCRS', TOKEN: 'Token Test',
}

const inputSt = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`,
  color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none',
}

function buildPrompt(patient, testsData, selectedTests, appliedBy, queixa) {
  const age = patient.birth_date
    ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
    : null

  const testsBlock = selectedTests.map(key => {
    const data = testsData[key]
    if (!data) return `- ${TEST_LABELS[key] || key}: sem dados registrados`
    const scores = Object.entries(data)
      .filter(([k, v]) => k !== 'obs' && k !== '_appliedAt' && v !== '' && v !== undefined)
      .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${v}`)
      .join('\n')
    const obs = data.obs ? `\n  Observações: ${data.obs}` : ''
    return `- ${TEST_LABELS[key] || key}:\n${scores}${obs}`
  }).join('\n\n')

  return `Você é um neuropsicólogo clínico especialista. Redija um Laudo Neuropsicológico completo e profissional em português brasileiro para o seguinte caso:

DADOS DO PACIENTE:
- Nome: ${patient.full_name}
- Idade: ${age ? `${age} anos` : 'não informada'}
- Sexo: ${patient.sex || 'não informado'}
- Escolaridade: ${patient.education || 'não informada'}
- Queixa principal: ${queixa || 'Avaliação neuropsicológica'}

TESTES APLICADOS E RESULTADOS:
${testsBlock}

TESTES APLICADOS POR: ${appliedBy}

INSTRUÇÕES PARA O LAUDO:
1. Use linguagem técnica neuropsicológica, mas com clareza clínica
2. Organize o laudo em seções: Identificação, Queixa, Instrumentos Utilizados, Resultados (por domínio cognitivo), Análise Clínica e Conclusão
3. Interprete os escores em relação às normas brasileiras disponíveis
4. Indique pontos fortes e deficitários do perfil cognitivo
5. Faça recomendações clínicas específicas ao final
6. Tom formal e científico, em português do Brasil
7. Use HTML com tags h3 (seções), p (parágrafos) e ul/li (listas)
8. Não inclua cabeçalho com nome da clínica (será adicionado automaticamente)

Gere o laudo completo agora:`
}

function buildSignature(appliedBy, user) {
  return `
<div style="margin-top:40px;padding-top:20px;border-top:2px solid #1A2744;font-family:Georgia,serif">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px">
    <div>
      <p style="font-size:12px;color:#555;margin-bottom:4px">Testes aplicados por:</p>
      <p style="font-size:14px;font-weight:bold;color:#1a1a2e">${appliedBy}</p>
      <p style="font-size:12px;color:#555">${user?.crp || 'Psicólogo(a)'}</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:12px;color:#555;margin-bottom:4px">Supervisão:</p>
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
}

const STEPS = [
  'Carregando dados do paciente...',
  'Coletando resultados dos testes...',
  'Analisando perfil neuropsicológico...',
  'Redigindo laudo com IA...',
  'Finalizando documento...',
]

export default function Analytics() {
  const { user } = useAuth()
  const [patients, setPatients]         = useState([])
  const [patientId, setPatientId]       = useState('')
  const [sessions, setSessions]         = useState({})
  const [selectedTests, setSelectedTests] = useState([])
  const [appliedBy, setAppliedBy]       = useState('')
  const [queixa, setQueixa]             = useState('')
  const [report, setReport]             = useState('')
  const [loading, setLoading]           = useState(false)
  const [step, setStep]                 = useState(0)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    getDocs(collection(db, 'patients'))
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    if (!patientId) { setSessions({}); return }
    getDocs(collection(db, 'sessions')).then(snap => {
      const patSessions = snap.docs.filter(d => d.id.startsWith(patientId + '_'))
      const merged = patSessions.reduce((acc, s) => ({
        ...acc,
        ...(s.data().tests || {}),
      }), {})
      setSessions(merged)
    })
  }, [patientId])

  const toggleTest = k =>
    setSelectedTests(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])

  const patient = patients.find(p => p.id === patientId)

  const generate = async () => {
    if (!patientId)               return setError('Selecione um paciente.')
    if (selectedTests.length === 0) return setError('Selecione ao menos um teste.')
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey)                  return setError('VITE_ANTHROPIC_API_KEY não configurado no .env.local')

    setError('')
    setLoading(true)
    setSaved(false)
    setReport('')

    try {
      for (let i = 0; i < STEPS.length - 1; i++) {
        setStep(i)
        await new Promise(r => setTimeout(r, 600))
      }
      setStep(3)

      const prompt = buildPrompt(
        patient,
        sessions,
        selectedTests,
        appliedBy || user?.full_name || 'Profissional',
        queixa,
      )

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-7',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      setStep(4)
      const data  = await res.json()
      const text  = data.content?.[0]?.text || ''
      const html  = text + buildSignature(appliedBy || user?.full_name || 'Profissional', user)
      setReport(html)

      // Salvar no Firestore
      const reportId = `${patientId}_${Date.now()}`
      await setDoc(doc(db, 'reports', reportId), {
        patientId,
        professionalId:   user?.id,
        professionalName: appliedBy || user?.full_name,
        selectedTests,
        reportHtml: html,
        status: 'finalizado',
        createdAt: serverTimestamp(),
      })
      setSaved(true)

    } catch (e) {
      setError('Erro ao gerar laudo: ' + e.message)
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  const print = () => {
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Laudo Neuropsicológico — ${patient?.full_name || ''}</title>
      <style>
        body { font-family: Georgia, serif; padding: 48px; max-width: 820px; margin: 0 auto; color: #1a1a2e; line-height: 1.7; }
        h1, h2 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        h3 { font-size: 14px; font-weight: bold; color: #0C447C; border-bottom: 1px solid #B5D4F4; padding-bottom: 4px; margin: 16px 0 8px; }
        .header { border-bottom: 2px solid #1A2744; padding-bottom: 16px; margin-bottom: 24px; }
        p { font-size: 13px; margin-bottom: 8px; }
        ul { margin-left: 20px; font-size: 13px; } li { margin-bottom: 4px; }
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

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>RELATÓRIOS</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Geração de laudos neuropsicológicos com Inteligência Artificial</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>

        {/* Painel esquerdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Supervisor */}
          <div style={{ background: S.cardG, borderRadius: 10, border: '1px solid rgba(46,125,50,0.3)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={14} color={S.greenL} />
              <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em' }}>SUPERVISÃO</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 6 }}>{SUPERVISOR.name}</div>
            <div style={{ fontSize: 11, color: S.greenL }}>{SUPERVISOR.crp}</div>
            <div style={{ fontSize: 10, color: S.muted }}>{SUPERVISOR.clinic}</div>
          </div>

          {/* Paciente */}
          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: 14 }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>1. PACIENTE</div>
            <select value={patientId} onChange={e => { setPatientId(e.target.value); setReport(''); setSaved(false) }} style={inputSt}>
              <option value="">— Selecionar paciente —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            {patient && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(46,125,50,0.1)', borderRadius: 6, fontSize: 11, color: S.greenL }}>
                {patient.birth_date && `${new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos`}
                {patient.sex ? ` · ${patient.sex}` : ''}
                {patient.education ? ` · ${patient.education}` : ''}
              </div>
            )}
          </div>

          {/* Queixa */}
          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: 14 }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>2. QUEIXA PRINCIPAL</div>
            <input value={queixa} onChange={e => setQueixa(e.target.value)} placeholder="Ex: dificuldades de memória, avaliação pré-cirúrgica..." style={inputSt} />
          </div>

          {/* Aplicador */}
          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: 14 }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>3. TESTES APLICADOS POR</div>
            <input value={appliedBy} onChange={e => setAppliedBy(e.target.value)} placeholder={user?.full_name || 'Nome do profissional...'} style={inputSt} />
          </div>

          {/* Seleção de testes */}
          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: 14 }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
              4. TESTES APLICADOS ({selectedTests.length})
            </div>
            {TEST_GROUPS.map(({ group, keys }) => (
              <div key={group} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase' }}>{group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {keys.map(k => {
                    const on = selectedTests.includes(k)
                    const hasData = sessions[k] && Object.keys(sessions[k]).some(kk => kk !== 'obs' && kk !== '_appliedAt')
                    return (
                      <button key={k} onClick={() => toggleTest(k)} style={{
                        padding: '4px 9px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                        border: on ? `1.5px solid ${S.green}` : `1px solid ${S.border}`,
                        background: on ? 'rgba(46,125,50,0.2)' : 'rgba(255,255,255,0.03)',
                        color: on ? S.greenL : (hasData ? '#fff' : S.muted),
                        fontWeight: on ? 700 : 400, position: 'relative',
                      }}>
                        {TEST_LABELS[k]}
                        {hasData && !on && <span style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, borderRadius: '50%', background: S.greenL }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: S.danger, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button onClick={generate} disabled={loading} style={{
            padding: 14, borderRadius: 10, border: 'none',
            background: loading ? 'rgba(46,125,50,0.4)' : S.green,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: '0.04em',
          }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {STEPS[step]}</>
              : <><Sparkles size={16} /> GERAR LAUDO COM IA</>
            }
          </button>
        </div>

        {/* Painel direito — laudo */}
        <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', minHeight: 500 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} color={S.greenL} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>LAUDO NEUROPSICOLÓGICO</span>
              {saved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: S.greenL, background: 'rgba(46,125,50,0.15)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                  <CheckCircle2 size={10} /> SALVO
                </span>
              )}
            </div>
            {report && (
              <button onClick={print} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                padding: '5px 12px', borderRadius: 7, border: `1px solid ${S.border}`,
                background: 'transparent', cursor: 'pointer', color: S.greenL,
              }}>
                <Download size={13} /> IMPRIMIR / PDF
              </button>
            )}
          </div>

          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 size={32} color={S.greenL} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 13, color: S.greenL, fontWeight: 700 }}>{STEPS[step]}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                  {STEPS.map((_, i) => (
                    <div key={i} style={{ width: i <= step ? 24 : 8, height: 4, borderRadius: 2, background: i <= step ? S.green : S.border, transition: 'all 0.3s' }} />
                  ))}
                </div>
              </div>
            )}

            {!loading && !report && (
              <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
                <Sparkles size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>O laudo aparecerá aqui</p>
                <p style={{ fontSize: 11, marginTop: 6 }}>Preencha o painel e clique em Gerar Laudo</p>
              </div>
            )}

            {!loading && report && (
              <div style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)' }}
                dangerouslySetInnerHTML={{ __html: report }} />
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
