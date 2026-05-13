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

  const calcAge = (bd) => {
    if (!bd) return null
    const diff = Date.now() - new Date(bd).getTime()
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
  }

  // Monta o documento completo no padrão da clínica (tela + impressão)
  const buildFullDocument = (aiBody) => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    const age = calcAge(patient?.birth_date)
    const professional = appliedBy || user?.full_name || 'Profissional responsável'

    return `
<div style="font-family:Georgia,serif;color:#1a1a2e;line-height:1.7;max-width:760px;margin:0 auto">

  <!-- CABEÇALHO -->
  <div style="border-bottom:3px solid #1A3D2B;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:10px;color:#2E7D32;font-weight:700;letter-spacing:0.12em;margin-bottom:3px">NEUROPSICOLOGIA NA PRÁTICA</div>
      <div style="font-size:22px;font-weight:800;color:#1A3D2B;letter-spacing:-0.01em">NEUROAVALIAÇÃO</div>
      <div style="font-size:10px;color:#555;margin-top:2px">Neuropsicologia Clínica · Psicoterapia · Terapia ABA</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#555;line-height:1.6">
      <div style="font-weight:700;color:#1A3D2B">${SUPERVISOR.name}</div>
      <div>${SUPERVISOR.crp}</div>
      <div>São Paulo — SP</div>
    </div>
  </div>

  <!-- TÍTULO -->
  <div style="text-align:center;margin-bottom:20px">
    <div style="display:inline-block;background:#1A3D2B;color:#fff;font-size:13px;font-weight:700;letter-spacing:0.1em;padding:8px 32px;border-radius:4px">
      LAUDO NEUROPSICOLÓGICO
    </div>
  </div>

  <!-- DADOS DO PACIENTE -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px">
    <thead>
      <tr><th colspan="4" style="background:#1A3D2B;color:#fff;padding:7px 10px;text-align:left;font-size:11px;letter-spacing:0.06em">DADOS DO PACIENTE</th></tr>
    </thead>
    <tbody>
      <tr style="background:#f0f7f0">
        <td style="padding:6px 10px;border:1px solid #c8dfc8;font-weight:700;width:22%">Paciente</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8;width:28%">${patient?.full_name || '—'}</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8;font-weight:700;width:22%">Data da avaliação</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8;width:28%">${dataFormatada}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #c8dfc8;font-weight:700">Idade</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8">${age != null ? age + ' anos' : '—'}</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8;font-weight:700">Sexo</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8">${patient?.sex || '—'}</td>
      </tr>
      <tr style="background:#f0f7f0">
        <td style="padding:6px 10px;border:1px solid #c8dfc8;font-weight:700">Escolaridade</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8">${patient?.education || '—'}</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8;font-weight:700">Testes aplicados por</td>
        <td style="padding:6px 10px;border:1px solid #c8dfc8">${professional}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border:1px solid #c8dfc8;font-weight:700">Testes</td>
        <td colspan="3" style="padding:6px 10px;border:1px solid #c8dfc8">${selectedTests.join(' · ')}</td>
      </tr>
    </tbody>
  </table>

  <!-- CORPO GERADO PELA IA -->
  <div style="font-size:13px;line-height:1.8;color:#1a1a2e">
    ${aiBody}
  </div>

  <!-- ASSINATURA -->
  <div style="margin-top:50px;padding-top:24px;border-top:2px solid #1A3D2B">
    <p style="font-size:11px;color:#555;text-align:right;margin-bottom:4px">
      São Paulo, ${dataFormatada}
    </p>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;flex-wrap:wrap;gap:24px">
      <div style="text-align:center;min-width:220px">
        <div style="border-top:1.5px solid #1A3D2B;padding-top:8px">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e">${professional}</div>
          <div style="font-size:11px;color:#555">${user?.crp || 'CRP ___________'}</div>
          <div style="font-size:10px;color:#777">Neuropsicólogo(a) Responsável</div>
        </div>
      </div>
      <div style="text-align:center;min-width:220px">
        <div style="border-top:1.5px solid #1A3D2B;padding-top:8px">
          <div style="font-size:14px;font-weight:800;color:#1A3D2B">${SUPERVISOR.name}</div>
          <div style="font-size:11px;color:#555">${SUPERVISOR.crp}</div>
          <div style="font-size:10px;color:#777">Supervisor Técnico · Diretor Clínico</div>
        </div>
      </div>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div style="margin-top:36px;padding-top:12px;border-top:1px solid #c8dfc8;text-align:center;font-size:9px;color:#888;line-height:1.6">
    <div style="font-weight:700;color:#2E7D32;font-size:10px;margin-bottom:2px">NEUROAVALIAÇÃO — Neuropsicologia na Prática</div>
    <div>São Paulo · SP · neuroavaliacao.com.br</div>
    <div style="margin-top:4px;font-style:italic">
      Este laudo é um documento complementar e deve ser interpretado em conjunto com a avaliação clínica global.<br>
      Documento gerado em ${dataFormatada} · Uso exclusivo para fins diagnósticos.
    </div>
  </div>

</div>`
  }

  const generate = async () => {
    if (!patientId)               return setError('Selecione um paciente.')
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

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('Chave da API não configurada. Verifique o arquivo .env.local.')

      const ad  = session.session?.anamnesis || {}
      const td  = session.session?.tests     || {}
      const s   = v => v || 'N/D'
      const arr = v => Array.isArray(v) ? v.join(', ') : (v || 'N/D')
      const lbl = z => {
        if (z == null) return 'N/A'
        const n = parseFloat(z)
        return n >= -1.0 ? 'PRESERVADO' : n >= -1.5 ? 'LIMÍTROFE' : 'COMPROMETIDO'
      }

      const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

      const anam = Object.keys(ad).length ? `
Objetivo: ${s(ad.objetivo_avaliacao || ad.motivo_encaminhamento)}
Queixas: ${s(ad.queixas)}
Queixas cognitivas/emocionais: ${s(ad.queixas_cognitivas_emocionais)}
Início dos sintomas: ${s(ad.inicio_sintomas_data)} | Desenvolvimento: ${s(ad.desenvolvimento_sintomas)}
Medicamentos: ${s(ad.medicamentos)} | Doenças: ${arr(ad.doencas_preexistentes)}
Escolaridade: ${s(ad.escolaridade)} | Profissão: ${s(ad.profissao)}
Sono: ${s(ad.sono_como_e)} | Apetite: ${s(ad.apetite_como_e)}
Atividade física: ${s(ad.atividade_fisica)} | Lazer: ${s(ad.lazer)}
História familiar (memória): ${s(ad.historico_familiar_memoria)}
` : 'Sem dados de anamnese disponíveis.'

      const results = `
Testes aplicados: ${selectedTests.join(', ')}
Aplicados por: ${appliedBy || user?.full_name || 'Profissional responsável'}
Supervisão: ${SUPERVISOR.name} | ${SUPERVISOR.crp}

WASI: ${td?.WASI ? `QI=${td.WASI.qit_2 ?? '-'}, Percentil=${td.WASI.qit_percentile ?? '-'}, Classif.=${td.WASI.classification ?? '-'}` : 'Não aplicado'}
WASI-III: ${td?.['WASI-III'] ? `QI=${td['WASI-III'].qit_2 ?? '-'}, Percentil=${td['WASI-III'].qit_percentile ?? '-'}` : 'Não aplicado'}

NEUPSILIN (z-scores):
  Orientação: ${lbl(td?.NEUPSILIN?.zScores?.orientation)} | Atenção: ${lbl(td?.NEUPSILIN?.zScores?.attention)}
  Percepção: ${lbl(td?.NEUPSILIN?.zScores?.perception)} | Memória: ${lbl(td?.NEUPSILIN?.zScores?.memory)}
  Aritmética: ${lbl(td?.NEUPSILIN?.zScores?.arithmetic)} | Linguagem: ${lbl(td?.NEUPSILIN?.zScores?.language)}
  Praxia: ${lbl(td?.NEUPSILIN?.zScores?.praxis)} | Funções executivas: ${lbl(td?.NEUPSILIN?.zScores?.executive)}

BAMS: ${td?.BAMS ? `Global=${td.BAMS.global_score}, Percentil=${td.BAMS.percentile}, Classif.=${td.BAMS.interpretation}` : 'Não aplicado'}
RAVLT: ${td?.RAVLT ? `A1=${td.RAVLT.a1}, A5=${td.RAVLT.a5}, A6=${td.RAVLT.a6}, A7=${td.RAVLT.a7}, Reconhecimento=${td.RAVLT.recognition}` : 'Não aplicado'}
WCST-N: ${td?.['WCST-N'] ? `Categorias=${td['WCST-N'].categories_completed}, Erros perseverativos=${td['WCST-N'].perseverative_errors}` : 'Não aplicado'}
FAB: ${td?.FAB ? `Escore=${td.FAB.total_score}, Classif.=${td.FAB.classification}` : 'Não aplicado'}
GDS-15: ${td?.['GDS-15'] ? `${td['GDS-15'].total_score} pts — ${td['GDS-15'].classification}` : 'Não aplicado'}
GAI: ${td?.GAI ? `${td.GAI.total_score} pts — ${td.GAI.classification}` : 'Não aplicado'}
BDI-II: ${td?.['BDI-II'] ? `${td['BDI-II'].total_score} pts — ${td['BDI-II'].classification}` : 'Não aplicado'}
HAD: ${td?.HAD ? `Ansiedade=${td.HAD.anxiety_score}(${td.HAD.anxiety_classification}), Depressão=${td.HAD.depression_score}(${td.HAD.depression_classification})` : 'Não aplicado'}
IQCODE: ${td?.IQCODE ? `${td.IQCODE.total_score} — ${td.IQCODE.classification}` : 'Não aplicado'}
B-ADL: ${td?.['B-ADL'] ? `${td['B-ADL'].total_score} — ${td['B-ADL'].classification}` : 'Não aplicado'}
Pfeffer: ${td?.Pfeffer ? `${td.Pfeffer.total_score} — ${td.Pfeffer.classification}` : 'Não aplicado'}
Lawton: ${td?.Lawton ? `${td.Lawton.total_score} — ${td.Lawton.classification}` : 'Não aplicado'}
`

      const prompt = `Você é um neuropsicólogo clínico especialista. Elabore um laudo neuropsicológico completo e individualizado em português brasileiro, com linguagem técnica, precisa e empática.

IDENTIFICAÇÃO
Paciente: ${patient?.full_name || 'N/D'}
Idade: ${patient?.age || ad?.idade || 'N/D'} anos
Sexo: ${patient?.sex || ad?.sexo || 'N/D'}
Escolaridade: ${patient?.education || ad?.escolaridade || 'N/D'}
Data da avaliação: ${dataFormatada}
Testes aplicados por: ${appliedBy || user?.full_name || 'Profissional responsável'}
Supervisão técnica: ${SUPERVISOR.name} — ${SUPERVISOR.crp}

ANAMNESE
${anam}

RESULTADOS DOS TESTES
${results}

Elabore o laudo completo em HTML com as seguintes seções:

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">ANÁLISE NEUROPSICOLÓGICA</h3>
[análise detalhada de cada domínio cognitivo avaliado, relacionando resultados objetivos com as queixas clínicas]
</div>

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">SÍNTESE DIAGNÓSTICA</h3>
[integração dos achados, identificação do padrão neuropsicológico]
</div>

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">CONCLUSÃO</h3>
[perfil neuropsicológico completo e hipótese diagnóstica fundamentada]
</div>

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">RECOMENDAÇÕES</h3>
[recomendações clínicas e terapêuticas individualizadas]
</div>

Regras:
- Parágrafos: <p style="font-size:13px;margin-bottom:8px;line-height:1.7">
- Listas: <ul style="margin-left:20px;margin-bottom:8px"><li style="font-size:13px;margin-bottom:4px">
- Destaques: <span style="font-weight:bold">
- NÃO inclua html/body/head
- NÃO mencione "inteligência artificial" ou "IA" em nenhum momento
- Laudo rigoroso, técnico e completamente individualizado para este paciente`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const aiBody = data.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')

      const fullDoc = buildFullDocument(aiBody)
      setReport(fullDoc)
      const reportId = await session.saveReport(fullDoc, selectedTests)
      if (reportId) setSaved(true)

    } catch (e) {
      setError('Erro ao gerar laudo: ' + e.message)
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  const print = () => {
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8">
  <title>Laudo Neuropsicológico — ${patient?.full_name || ''}</title>
  <style>
    @page { size: A4; margin: 2cm 2cm 2.5cm 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt; line-height: 1.7; color: #1a1a2e;
      background: #fff; max-width: 21cm; margin: 0 auto; padding: 24px;
    }
    h3 { font-size: 12pt; font-weight: bold; color: #1A3D2B; border-bottom: 2px solid #1A3D2B; padding-bottom: 4px; margin: 20px 0 10px; }
    p  { font-size: 11pt; margin-bottom: 8px; text-align: justify; }
    ul { margin-left: 22px; font-size: 11pt; }
    li { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    td, th { padding: 5px 9px; border: 1px solid #c8dfc8; }
    th { background: #1A3D2B; color: #fff; }
    .preservado  { color: #2E7D32; font-weight: bold; }
    .limitrofe   { color: #b45309; font-weight: bold; }
    .comprometido{ color: #dc2626; font-weight: bold; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head><body>
  ${report}
</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
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
            {report && (
              <button onClick={print} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                padding: '5px 12px', borderRadius: 7,
                border: `1px solid ${S.border}`, background: 'transparent',
                cursor: 'pointer', color: S.greenL,
              }}>
                <Download size={13} /> IMPRIMIR / PDF
              </button>
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
              <div style={{
                background: '#fff', borderRadius: 6, padding: '32px 28px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
              }}
                dangerouslySetInnerHTML={{ __html: report }} />
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
