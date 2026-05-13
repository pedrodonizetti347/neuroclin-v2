import React, { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { useTestSession } from '@/hooks/useTestSession'
import { FileText, Loader2, CheckCircle2, Download, AlertCircle } from 'lucide-react'

const SUPERVISOR = {
  name:   'Dr. Pedro Donizetti',
  crp:    'CRP 06/82060',
  clinic: 'Neuroavaliação — Neuropsicologia na Prática',
}

// Nomes completos dos testes para o PROCEDIMENTO
const FULL_TEST_NAMES = {
  'NEUPSILIN': 'Instrumento de Avaliação Neuropsicológica Breve Adulto (NEUPSILIN)',
  'TRIACOG':   'Triagem Cognitiva (TRIACOG)',
  'RAVLT':     'Teste de Aprendizagem Auditivo-Verbal de Rey (RAVLT)',
  'BAMS':      'Bateria de Avaliação da Memória Semântica (BAMS)',
  'WASI':      'Escala de Inteligência de Wechsler Abreviada (WASI)',
  'WASI-III':  'Escala de Inteligência de Wechsler Abreviada III (WASI-III)',
  'WCST-N':    'Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)',
  'DEX':       'Questionário Disexecutivo (DEX)',
  'FAB':       'Bateria de Avaliação Frontal (FAB)',
  'GDS-15':    'Escala de Depressão Geriátrica (GDS-15)',
  'GAI':       'Inventário de Ansiedade Geriátrica (GAI)',
  'BDI-II':    'Inventário de Depressão de Beck — II (BDI-II)',
  'HAD':       'Escala Hospitalar de Ansiedade e Depressão (HAD)',
  'IQCODE':    'Questionário Informante sobre Declínio Cognitivo no Idoso (IQCODE)',
  'B-ADL':     'Escala Bayer de Atividades da Vida Diária (B-ADL)',
  'Pfeffer':   'Questionário de Atividades Funcionais de Pfeffer',
  'Lawton':    'Escala de Atividades Instrumentais de Lawton e Brody',
  'IDATE-E':   'Inventário de Ansiedade Traço-Estado (IDATE) — Estado',
  'IDATE-T':   'Inventário de Ansiedade Traço-Estado (IDATE) — Traço',
  'TOKEN':     'Token Test',
  'BADL':      'Índice de Katz — Atividades Básicas de Vida Diária (BADL)',
  'MoCA':      'Avaliação Cognitiva Montreal (MoCA)',
}

// Quais testes vão para a Tabela de Escalas vs Tabela de Testes
const SCALE_TESTS = ['GDS-15','GAI','BDI-II','HAD','IQCODE','B-ADL','Pfeffer','Lawton','IDATE-E','IDATE-T','BADL','FAB','MoCA']
const COGNITIVE_TESTS = ['NEUPSILIN','TRIACOG','RAVLT','BAMS','WASI','WASI-III','WCST-N','DEX','TOKEN']

const TESTS_LIST = [
  { key: 'NEUPSILIN', label: 'Neupsilin',  group: 'Bateria Cognitiva' },
  { key: 'TRIACOG',   label: 'TRIACOG',    group: 'Bateria Cognitiva' },
  { key: 'MoCA',      label: 'MoCA',       group: 'Bateria Cognitiva' },
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
  { key: 'BADL',      label: 'BADL',       group: 'Funcional' },
  { key: 'IDATE-E',   label: 'IDATE-E',    group: 'Ansiedade' },
  { key: 'IDATE-T',   label: 'IDATE-T',    group: 'Ansiedade' },
  { key: 'TOKEN',     label: 'Token Test', group: 'Linguagem' },
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
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${S.border}`,
  color: '#fff', borderRadius: 8,
  padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none',
}

// ── Helpers para tabelas do laudo ────────────────────────────────────────────
const H = '#1A3D2B'  // verde escuro cabeçalho
const HR = '#e8f5e9' // verde claro linha alternada

const thCell  = (txt, extra='') => `<th style="border:1px solid #a5c6a5;padding:7px 10px;background:${H};color:#fff;text-align:left;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;${extra}">${txt}</th>`
const tdCell  = (txt, extra='') => `<td style="border:1px solid #c8dfc8;padding:6px 10px;${extra}">${txt ?? '—'}</td>`
const secHead = (title) => `<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${title}</div>`
const tableWrap = (rows, head='') => `<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:11pt;">${head}<tbody>${rows}</tbody></table>`

const classZ = (z) => {
  if (z == null) return { label: '—', color: '#555' }
  const n = parseFloat(z)
  if (n >= -1.0)  return { label: 'PRESERVADO',   color: '#1b5e20' }
  if (n >= -1.5)  return { label: 'LIMÍTROFE',     color: '#e65100' }
  return              { label: 'COMPROMETIDO',  color: '#c62828' }
}

const fmtDate = (d) => {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}

// ── Tabela ESCALAS ────────────────────────────────────────────────────────────
function buildEscalasSection(td, selectedTests) {
  const rows = []

  const addRow = (label, score, classif, alt = false) => {
    const bg = alt ? HR : '#fff'
    rows.push(`<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(label)}
      ${tdCell(score ?? '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(classif ?? '—', 'text-align:center;')}
    </tr>`)
  }

  let i = 0
  if (selectedTests.includes('GDS-15') && td?.['GDS-15']) {
    addRow('Escala de Depressão Geriátrica (GDS-15)', td['GDS-15'].total_score, td['GDS-15'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('GAI') && td?.GAI) {
    addRow('Inventário de Ansiedade Geriátrica (GAI)', td.GAI.total_score, td.GAI.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('BDI-II') && td?.['BDI-II']) {
    addRow('Inventário de Depressão de Beck II (BDI-II)', td['BDI-II'].total_score, td['BDI-II'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('HAD') && td?.HAD) {
    addRow(`HAD — Ansiedade`, td.HAD.anxiety_score, td.HAD.anxiety_classification, i++ % 2 === 1)
    addRow(`HAD — Depressão`, td.HAD.depression_score, td.HAD.depression_classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('IQCODE') && td?.IQCODE) {
    addRow('IQCODE', td.IQCODE.total_score, td.IQCODE.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('B-ADL') && td?.['B-ADL']) {
    addRow('Escala Bayer (B-ADL)', td['B-ADL'].total_score, td['B-ADL'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('Pfeffer') && td?.Pfeffer) {
    addRow('Questionário de Pfeffer', td.Pfeffer.total_score, td.Pfeffer.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('Lawton') && td?.Lawton) {
    addRow('Escala de Lawton', td.Lawton.total_score, td.Lawton.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('BADL') && td?.BADL) {
    addRow('BADL (Índice de Katz)', td.BADL.total_score, td.BADL.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('FAB') && td?.FAB) {
    addRow('Bateria de Avaliação Frontal (FAB)', td.FAB.total_score, td.FAB.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('MoCA') && td?.MoCA) {
    addRow('MoCA (Avaliação Cognitiva Montreal)', td.MoCA.total_score, td.MoCA.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('IDATE-E') && td?.['IDATE-E']) {
    addRow('IDATE — Estado', td['IDATE-E'].total_score, td['IDATE-E'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('IDATE-T') && td?.['IDATE-T']) {
    addRow('IDATE — Traço', td['IDATE-T'].total_score, td['IDATE-T'].classification, i++ % 2 === 1)
  }

  if (rows.length === 0) return ''

  const head = `<thead><tr>
    ${thCell('Escalas')}
    ${thCell('Pontos', 'text-align:center;')}
    ${thCell('Classificação', 'text-align:center;')}
  </tr></thead>`

  return secHead('TABELA DE RESULTADOS – ESCALAS') + tableWrap(rows.join(''), head)
}

// ── Tabela NEUPSILIN (domínios) ───────────────────────────────────────────────
function buildNeupsilinSection(td) {
  const d = td?.NEUPSILIN
  if (!d) return ''

  const zs = d.zScores || {}
  const domains = [
    { label: '1 – Orientação',            key: 'orientation', score: d.scores?.orientation ?? d.orientation_total ?? '—' },
    { label: '2 – Atenção',                key: 'attention',   score: d.scores?.attention   ?? d.attention_total   ?? '—' },
    { label: '3 – Percepção',              key: 'perception',  score: d.scores?.perception  ?? d.perception_total  ?? '—' },
    { label: '4 – Memória',                key: 'memory',      score: d.scores?.memory      ?? d.memory_total      ?? '—' },
    { label: '5 – Habilidades Aritméticas',key: 'arithmetic',  score: d.scores?.arithmetic  ?? d.arithmetic_total  ?? '—' },
    { label: '6 – Linguagem',              key: 'language',    score: d.scores?.language    ?? d.language_total    ?? '—' },
    { label: '7 – Praxias',                key: 'praxis',      score: d.scores?.praxis      ?? d.praxis_total      ?? '—' },
    { label: '8 – Funções Executivas',     key: 'executive',   score: d.scores?.executive   ?? d.executive_total   ?? '—' },
  ]

  const rows = domains.map((dom, i) => {
    const z    = zs[dom.key]
    const cls  = classZ(z)
    const bg   = i % 2 === 0 ? '#fff' : HR
    const zLbl = z != null ? parseFloat(z).toFixed(2) : '—'
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(dom.label, 'font-weight:bold;')}
      ${tdCell(dom.score, 'text-align:center;')}
      ${tdCell(zLbl,      'text-align:center;')}
      ${tdCell(`<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>`, 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="4" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Instrumento de Avaliação Neuropsicológica Breve Adulto – NEUPSILIN</th></tr>
    <tr>
      ${thCell('Domínio')}
      ${thCell('Escore Bruto', 'text-align:center;')}
      ${thCell('Z-Escore', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela RAVLT ──────────────────────────────────────────────────────────────
function buildRAVLTSection(td) {
  const d = td?.RAVLT
  if (!d) return ''

  const trials = [
    { label: 'A1 — Tentativa 1', score: d.a1 },
    { label: 'A2 — Tentativa 2', score: d.a2 },
    { label: 'A3 — Tentativa 3', score: d.a3 },
    { label: 'A4 — Tentativa 4', score: d.a4 },
    { label: 'A5 — Tentativa 5', score: d.a5 },
    { label: 'B1 — Lista Distratora', score: d.b1 },
    { label: 'A6 — Evocação Imediata', score: d.a6 },
    { label: 'A7 — Evocação Tardia', score: d.a7 },
  ]

  const total = (d.a1 ?? 0) + (d.a2 ?? 0) + (d.a3 ?? 0) + (d.a4 ?? 0) + (d.a5 ?? 0)

  const trialRows = trials.map((t, i) => {
    const bg = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(t.label)}
      ${tdCell(t.score ?? '—', 'text-align:center;font-weight:bold;')}
      ${tdCell('', 'text-align:center;')}
    </tr>`
  }).join('')

  const totalRow = `<tr style="background:#dce8dc;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('Total A1–A5 (Aprendizagem Total)', 'font-weight:bold;')}
    ${tdCell(total, 'text-align:center;font-weight:bold;')}
    ${tdCell(d.classification ?? '—', 'text-align:center;font-weight:bold;')}
  </tr>`

  const recRow = `<tr style="background:#fff;">
    ${tdCell('Reconhecimento')}
    ${tdCell(d.recognition ?? '—', 'text-align:center;font-weight:bold;')}
    ${tdCell('', 'text-align:center;')}
  </tr>`

  const head = `<thead>
    <tr><th colspan="3" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Teste de Aprendizagem Auditivo-Verbal de Rey – RAVLT</th></tr>
    <tr>
      ${thCell('Índice')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(trialRows + totalRow + recRow, head)
}

// ── Tabela WASI/WASI-III ──────────────────────────────────────────────────────
function buildWASISection(td, selectedTests) {
  const key  = selectedTests.includes('WASI-III') ? 'WASI-III' : 'WASI'
  const d    = td?.[key]
  if (!d) return ''
  const label = key === 'WASI-III' ? 'Escala de Inteligência de Wechsler Abreviada III – WASI-III' : 'Escala de Inteligência de Wechsler Abreviada – WASI'

  const rows = [
    ['QI Total', d.qit_2 ?? d.qit, d.qit_percentile, d.classification],
    ['Vocabulário (QI)', d.vocab_qi, d.vocab_percentile, null],
    ['Raciocínio Matricial (QI)', d.matrix_qi, d.matrix_percentile, null],
  ].filter(r => r[1] != null).map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(r[0], i === 0 ? 'font-weight:bold;' : '')}
      ${tdCell(r[1], 'text-align:center;font-weight:bold;')}
      ${tdCell(r[2] ?? '—', 'text-align:center;')}
      ${tdCell(r[3] ?? '—', 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="4" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${label}</th></tr>
    <tr>
      ${thCell('Índice')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Percentil', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela BAMS ───────────────────────────────────────────────────────────────
function buildBAMSSection(td) {
  const d = td?.BAMS
  if (!d) return ''

  const rows = [
    ['Escore Global BAMS', d.global_score, d.percentile, d.interpretation],
  ].map((r, i) => {
    return `<tr style="background:#fff;">
      ${tdCell(r[0], 'font-weight:bold;')}
      ${tdCell(r[1], 'text-align:center;font-weight:bold;')}
      ${tdCell(r[2], 'text-align:center;')}
      ${tdCell(r[3], 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="4" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Bateria de Avaliação da Memória Semântica – BAMS</th></tr>
    <tr>
      ${thCell('Índice')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Percentil', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela WCST-N ─────────────────────────────────────────────────────────────
function buildWCSTSection(td) {
  const d = td?.['WCST-N']
  if (!d) return ''

  const rows = [
    ['Categorias completadas', d.categories_completed],
    ['Erros perseverativos', d.perseverative_errors],
    ['Erros não perseverativos', d.non_perseverative_errors],
    ['Total de erros', d.total_errors],
  ].filter(r => r[1] != null).map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(r[0])}
      ${tdCell(r[1], 'text-align:center;font-weight:bold;')}
      ${tdCell('', 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="3" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)</th></tr>
    <tr>
      ${thCell('Fator')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Documento completo ────────────────────────────────────────────────────────
function buildFullDocument({ patient, selectedTests, appliedBy, user, ad, td, aiBody, dataFormatada }) {
  const age   = patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const professional = appliedBy || user?.full_name || 'Profissional responsável'

  // Informante(s)
  const informante = [ad?.acompanhante, ad?.responsavel].filter(Boolean).join(', ')
    || ad?.informante || '—'
  const parentesco = ad?.parentesco_acompanhante ? ` (${ad.parentesco_acompanhante})` : ''

  // Período do exame
  const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // PROCEDIMENTO — lista de testes
  const procedimentoItems = selectedTests
    .map(k => FULL_TEST_NAMES[k] || k)
    .map(name => `<li style="margin-bottom:4px;">${name}</li>`)
    .join('')

  // ESCALAS e TESTES
  const escalasSection = buildEscalasSection(td, selectedTests)
  const hasNeupsilin   = selectedTests.includes('NEUPSILIN') && td?.NEUPSILIN
  const hasRAVLT       = selectedTests.includes('RAVLT')     && td?.RAVLT
  const hasWASI        = (selectedTests.includes('WASI') || selectedTests.includes('WASI-III'))
  const hasBAMS        = selectedTests.includes('BAMS')      && td?.BAMS
  const hasWCST        = selectedTests.includes('WCST-N')    && td?.['WCST-N']

  const testesSection = (hasNeupsilin || hasRAVLT || hasWASI || hasBAMS || hasWCST)
    ? secHead('TABELA DE RESULTADOS – TESTES') +
      buildNeupsilinSection(td) +
      buildRAVLTSection(td) +
      buildWASISection(td, selectedTests) +
      buildBAMSSection(td) +
      buildWCSTSection(td)
    : ''

  // INFORMAÇÕES GERAIS — construídas da anamnese
  const queixas   = ad?.queixas || ad?.queixas_cognitivas_emocionais || ''
  const objetivo  = ad?.objetivo_avaliacao || ad?.motivo_encaminhamento || ''
  const doencas   = Array.isArray(ad?.doencas_preexistentes)
    ? ad.doencas_preexistentes.join(', ')
    : (ad?.doencas_preexistentes || '')
  const medicamentos = ad?.medicamentos || '—'
  const exames       = ad?.exames || 'Paciente não apresenta exames imagiológicos.'

  const infoGeraisParas = []
  if (objetivo) infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;"><strong>Objetivo da avaliação:</strong> ${objetivo}</p>`)
  if (queixas)  infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;"><strong>Queixas apresentadas:</strong> ${queixas}</p>`)
  if (doencas)  infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;"><strong>Histórico clínico:</strong> ${doencas}</p>`)
  if (ad?.sono || ad?.apetite) {
    const sonoApetite = [ad.sono && `Sono: ${ad.sono}`, ad.apetite && `Apetite: ${ad.apetite}`].filter(Boolean).join(' | ')
    infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;">${sonoApetite}</p>`)
  }

  return `
<div style="font-family:Georgia,'Times New Roman',serif;color:#1a1a2e;line-height:1.7;max-width:760px;margin:0 auto;">

  <!-- CABEÇALHO -->
  <div style="border-bottom:3px solid ${H};padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:10px;color:#2E7D32;font-weight:700;letter-spacing:0.12em;margin-bottom:3px;">NEUROPSICOLOGIA NA PRÁTICA</div>
      <div style="font-size:22px;font-weight:800;color:${H};letter-spacing:-0.01em;">NEUROAVALIAÇÃO</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">Neuropsicologia Clínica · Psicoterapia · Terapia ABA</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#555;line-height:1.6;">
      <div style="font-weight:700;color:${H};">${SUPERVISOR.name}</div>
      <div>${SUPERVISOR.crp}</div>
      <div>São Paulo — SP</div>
    </div>
  </div>

  <!-- TÍTULO -->
  <div style="text-align:center;margin-bottom:20px;">
    <div style="display:inline-block;background:${H};color:#fff;font-size:13px;font-weight:700;letter-spacing:0.1em;padding:8px 36px;border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      LAUDO NEUROPSICOLÓGICO
    </div>
  </div>

  <!-- DADOS DO PACIENTE -->
  ${secHead('DADOS DO PACIENTE')}
  <table style="width:100%;border-collapse:collapse;font-size:11pt;">
    <tbody>
      <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell('<strong>Paciente</strong>', 'font-weight:bold;width:22%;')}
        ${tdCell(patient?.full_name || '—', 'width:28%;')}
        ${tdCell('<strong>Data de Nascimento</strong>', 'font-weight:bold;width:22%;')}
        ${tdCell(fmtDate(patient?.birth_date))}
      </tr>
      <tr>
        ${tdCell('<strong>Idade</strong>', 'font-weight:bold;')}
        ${tdCell(age != null ? age + ' anos' : '—')}
        ${tdCell('<strong>Sexo</strong>', 'font-weight:bold;')}
        ${tdCell(patient?.sex || '—')}
      </tr>
      <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell('<strong>Escolaridade</strong>', 'font-weight:bold;')}
        ${tdCell(patient?.education || ad?.escolaridade || '—')}
        ${tdCell('<strong>Lateralidade</strong>', 'font-weight:bold;')}
        ${tdCell(ad?.lateralidade || patient?.lateralidade || '—')}
      </tr>
      <tr>
        ${tdCell('<strong>Período do Exame</strong>', 'font-weight:bold;')}
        ${tdCell(mesAno)}
        ${tdCell('<strong>Data do Laudo</strong>', 'font-weight:bold;')}
        ${tdCell(dataFormatada)}
      </tr>
      <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell('<strong>Informante(s)</strong>', 'font-weight:bold;')}
        ${tdCell(informante + parentesco)}
        ${tdCell('<strong>Avaliado por</strong>', 'font-weight:bold;')}
        ${tdCell(professional)}
      </tr>
      <tr>
        ${tdCell('<strong>Medicamentos</strong>', 'font-weight:bold;')}
        <td colspan="3" style="border:1px solid #c8dfc8;padding:6px 10px;">${medicamentos}</td>
      </tr>
    </tbody>
  </table>

  <!-- INFORMAÇÕES GERAIS E QUEIXAS -->
  ${infoGeraisParas.length > 0 ? secHead('INFORMAÇÕES GERAIS E QUEIXAS PRINCIPAIS') + infoGeraisParas.join('') : ''}

  <!-- EXAMES IMAGIOLÓGICOS -->
  ${secHead('EXAMES IMAGIOLÓGICOS')}
  <p style="font-size:11pt;margin:8px 0;text-align:justify;">${exames}</p>

  <!-- PROCEDIMENTO -->
  ${secHead('PROCEDIMENTO')}
  <p style="font-size:11pt;margin:8px 0;">Foram realizadas consultas para entrevista de anamnese e aplicação dos seguintes instrumentos neuropsicológicos:</p>
  <ul style="margin:8px 0 12px 24px;font-size:11pt;">${procedimentoItems}</ul>

  <!-- TABELAS DE RESULTADOS -->
  ${escalasSection}
  ${testesSection}

  <!-- CORPO GERADO PELA IA (Análise + Conclusão + Encaminhamentos) -->
  <div style="font-size:11pt;line-height:1.8;color:#1a1a2e;">
    ${aiBody}
  </div>

  <!-- DATA + ASSINATURA -->
  <p style="font-size:11pt;color:#555;text-align:right;margin-top:36px;">
    São Paulo, ${dataFormatada}.
  </p>

  <p style="font-size:9pt;margin-top:16px;text-align:justify;line-height:1.5;">
    <strong>P.S.:</strong> Os resultados deste exame baseiam-se em informações obtidas na anamnese, observação clínica e aplicação de instrumentos aprovados para uso em população brasileira, de acordo com o Conselho Federal de Psicologia e a Resolução CFP nº 31/2022. O exame neuropsicológico é um exame complementar e deve ser interpretado em conjunto com outros dados clínicos. Este documento não tem validade para fins judiciais.
  </p>

  <div style="margin-top:44px;padding-top:20px;border-top:2px solid ${H};">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:24px;">
      <div style="text-align:center;min-width:220px;">
        <div style="border-top:1.5px solid ${H};padding-top:8px;">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e;">${professional}</div>
          <div style="font-size:11px;color:#555;">${user?.crp || 'CRP ___________'}</div>
          <div style="font-size:10px;color:#777;">Neuropsicólogo(a) Responsável</div>
        </div>
      </div>
      <div style="text-align:center;min-width:220px;">
        <div style="border-top:1.5px solid ${H};padding-top:8px;">
          <div style="font-size:14px;font-weight:800;color:${H};">${SUPERVISOR.name}</div>
          <div style="font-size:11px;color:#555;">${SUPERVISOR.crp}</div>
          <div style="font-size:10px;color:#777;">Supervisor Técnico · Diretor Clínico</div>
        </div>
      </div>
    </div>
  </div>

  <!-- REFERÊNCIAS -->
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #c8dfc8;">
    ${secHead('REFERÊNCIAS BIBLIOGRÁFICAS')}
    <ol style="font-size:9pt;color:#444;padding-left:22px;line-height:1.6;">
      <li style="margin-bottom:4px;">FONSECA, R. P. et al. <em>NEUPSILIN — Instrumento de Avaliação Neuropsicológica Breve</em>. São Paulo: Vetor Editora, 2009.</li>
      <li style="margin-bottom:4px;">BERTOLA, L.; DINIZ LEANDRO. <em>BAMS — Bateria de Avaliação da Memória Semântica</em>. São Paulo: Vetor, 2019.</li>
      <li style="margin-bottom:4px;">REY, A. <em>RAVLT — Teste de Aprendizagem Auditivo-Verbal de Rey</em>. São Paulo: Vetor Editora, 2018.</li>
      <li style="margin-bottom:4px;">HEATON, R. K. et al. <em>WCST — Teste Wisconsin de Classificação de Cartas</em>. São Paulo: Casa do Psicólogo, 2004.</li>
      <li style="margin-bottom:4px;">DUBOIS, B. et al. The FAB: A Frontal Assessment Battery at bedside. <em>Neurology</em>, 55(11), 2000.</li>
      <li style="margin-bottom:4px;">American Psychiatric Association. <em>DSM-5 — Manual Diagnóstico e Estatístico de Transtornos Mentais</em>. 5ª ed. Porto Alegre: Artmed, 2014.</li>
      <li style="margin-bottom:4px;">Organização Mundial da Saúde. <em>CID-10 — Classificação Internacional de Doenças</em>. 10ª revisão.</li>
    </ol>
  </div>

  <!-- RODAPÉ -->
  <div style="margin-top:28px;padding-top:12px;border-top:1px solid #c8dfc8;text-align:center;font-size:9px;color:#888;line-height:1.6;">
    <div style="font-weight:700;color:#2E7D32;font-size:10px;margin-bottom:2px;">NEUROAVALIAÇÃO — Neuropsicologia na Prática</div>
    <div>São Paulo · SP · neuroavaliacao.com.br</div>
    <div style="margin-top:4px;font-style:italic;">
      Documento gerado em ${dataFormatada} · Uso exclusivo para fins diagnósticos.
    </div>
  </div>

</div>`
}

// ── Componente principal ──────────────────────────────────────────────────────
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
      const professional  = appliedBy || user?.full_name || 'Profissional responsável'
      const age = patient?.birth_date
        ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      // Dados resumidos para o prompt (a IA NÃO re-descreve — apenas interpreta)
      const anamSummary = Object.keys(ad).length ? `
Objetivo: ${s(ad.objetivo_avaliacao || ad.motivo_encaminhamento)}
Queixas: ${s(ad.queixas || ad.queixas_cognitivas_emocionais)}
Início dos sintomas: ${s(ad.inicio_sintomas_data)} | Desenvolvimento: ${s(ad.desenvolvimento_sintomas)}
Medicamentos: ${s(ad.medicamentos)} | Doenças: ${arr(ad.doencas_preexistentes)}
Sono: ${s(ad.sono)} | Apetite: ${s(ad.apetite)}
` : 'Sem dados de anamnese.'

      const resultsSummary = `
WASI/WASI-III: ${td?.WASI ? `QI=${td.WASI.qit_2 ?? td.WASI.qit ?? '-'}, Percentil=${td.WASI.qit_percentile ?? '-'}, Classif.=${td.WASI.classification ?? '-'}` : (td?.['WASI-III'] ? `QI=${td['WASI-III'].qit_2 ?? '-'}, Percentil=${td['WASI-III'].qit_percentile ?? '-'}` : 'Não aplicado')}

NEUPSILIN (z-scores):
  Orientação: ${lbl(td?.NEUPSILIN?.zScores?.orientation)} | Atenção: ${lbl(td?.NEUPSILIN?.zScores?.attention)}
  Percepção: ${lbl(td?.NEUPSILIN?.zScores?.perception)} | Memória: ${lbl(td?.NEUPSILIN?.zScores?.memory)}
  Aritmética: ${lbl(td?.NEUPSILIN?.zScores?.arithmetic)} | Linguagem: ${lbl(td?.NEUPSILIN?.zScores?.language)}
  Praxia: ${lbl(td?.NEUPSILIN?.zScores?.praxis)} | Funções Executivas: ${lbl(td?.NEUPSILIN?.zScores?.executive)}

BAMS: ${td?.BAMS ? `Global=${td.BAMS.global_score}, Percentil=${td.BAMS.percentile}, Classif.=${td.BAMS.interpretation}` : 'Não aplicado'}
RAVLT: ${td?.RAVLT ? `A1=${td.RAVLT.a1 ?? '-'}, A2=${td.RAVLT.a2 ?? '-'}, A3=${td.RAVLT.a3 ?? '-'}, A4=${td.RAVLT.a4 ?? '-'}, A5=${td.RAVLT.a5 ?? '-'}, A6=${td.RAVLT.a6 ?? '-'}, A7=${td.RAVLT.a7 ?? '-'}, Recog.=${td.RAVLT.recognition ?? '-'}` : 'Não aplicado'}
WCST-N: ${td?.['WCST-N'] ? `Categorias=${td['WCST-N'].categories_completed}, Erros Persev.=${td['WCST-N'].perseverative_errors}` : 'Não aplicado'}
FAB: ${td?.FAB ? `Escore=${td.FAB.total_score}, Classif.=${td.FAB.classification}` : 'Não aplicado'}
MoCA: ${td?.MoCA ? `${td.MoCA.total_score}/30 — ${td.MoCA.classification}` : 'Não aplicado'}
GDS-15: ${td?.['GDS-15'] ? `${td['GDS-15'].total_score} pts — ${td['GDS-15'].classification}` : 'Não aplicado'}
GAI: ${td?.GAI ? `${td.GAI.total_score} pts — ${td.GAI.classification}` : 'Não aplicado'}
BDI-II: ${td?.['BDI-II'] ? `${td['BDI-II'].total_score} pts — ${td['BDI-II'].classification}` : 'Não aplicado'}
HAD: ${td?.HAD ? `Ansiedade=${td.HAD.anxiety_score}(${td.HAD.anxiety_classification}), Depressão=${td.HAD.depression_score}(${td.HAD.depression_classification})` : 'Não aplicado'}
IQCODE: ${td?.IQCODE ? `${td.IQCODE.total_score} — ${td.IQCODE.classification}` : 'Não aplicado'}
B-ADL: ${td?.['B-ADL'] ? `${td['B-ADL'].total_score} — ${td['B-ADL'].classification}` : 'Não aplicado'}
Pfeffer: ${td?.Pfeffer ? `${td.Pfeffer.total_score} — ${td.Pfeffer.classification}` : 'Não aplicado'}
Lawton: ${td?.Lawton ? `${td.Lawton.total_score} — ${td.Lawton.classification}` : 'Não aplicado'}
`

      const prompt = `Você é um neuropsicólogo clínico especialista. As tabelas de identificação do paciente e de resultados dos testes já foram incluídas no laudo pelo sistema — NÃO as repita.

Sua tarefa é elaborar APENAS as seguintes três seções interpretativas, em português brasileiro técnico e empático, formatadas em HTML:

PACIENTE: ${patient?.full_name || 'N/D'}, ${age != null ? age + ' anos' : 'N/D'}, ${patient?.sex || 'N/D'}
Escolaridade: ${patient?.education || ad?.escolaridade || 'N/D'}
Testes aplicados: ${selectedTests.join(', ')}
Aplicado por: ${professional} | Supervisão: ${SUPERVISOR.name} — ${SUPERVISOR.crp}

ANAMNESE:
${anamSummary}

RESULTADOS DOS TESTES (use para interpretar, não para repetir):
${resultsSummary}

Gere EXATAMENTE estas três seções em HTML:

<div style="margin-bottom:20px;">
<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">ANÁLISE NEUROPSICOLÓGICA</div>
[análise técnica detalhada de cada domínio avaliado, correlacionando resultados com as queixas e histórico clínico. Mencione especificamente os domínios preservados e alterados. Seja clínico e individualizado.]
</div>

<div style="margin-bottom:20px;">
<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">CONCLUSÃO</div>
[perfil neuropsicológico integrado e hipótese diagnóstica fundamentada]
</div>

<div style="margin-bottom:20px;">
<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">ENCAMINHAMENTOS</div>
<p style="font-size:11pt;margin:8px 0;">Com base nos resultados, sugere-se:</p>
<ul style="margin:8px 0 12px 24px;font-size:11pt;">
[liste de 5 a 7 encaminhamentos individualizados com base nos achados específicos deste paciente]
<li style="margin-bottom:4px;font-style:italic;">Reavaliação neuropsicológica em 12 meses para fins comparativos, a critério do profissional que acompanha o caso.</li>
</ul>
</div>

Regras:
- Parágrafos: <p style="font-size:11pt;margin:8px 0;text-align:justify;line-height:1.8;">
- Listas: <ul style="margin:8px 0 12px 24px;font-size:11pt;"><li style="margin-bottom:4px;">
- NÃO inclua html/body/head/style
- NÃO mencione "inteligência artificial" ou "IA"
- NÃO repita as tabelas de dados já incluídas
- Tom: técnico, rigoroso, individualizado, empático`

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

      const data   = await res.json()
      const aiBody = data.content.filter(b => b.type === 'text').map(b => b.text).join('')

      const fullDoc = buildFullDocument({ patient, selectedTests, appliedBy, user, ad, td, aiBody, dataFormatada })
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
    @page { size: A4; margin: 2.5cm 2cm 2.5cm 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt; line-height: 1.7; color: #1a1a2e;
      background: #fff; max-width: 21cm; margin: 0 auto; padding: 20px;
    }
    h2, h3 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
    p  { font-size: 11pt; margin-bottom: 8px; text-align: justify; }
    ul { margin-left: 24px; font-size: 11pt; }
    li { margin-bottom: 4px; }
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
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>LAUDOS</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Geração de laudos clínicos neuropsicológicos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 16 }}>

        {/* Painel esquerdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ background: S.cardG, borderRadius: 10, border: '1px solid rgba(46,125,50,0.3)', padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>SUPERVISÃO</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{SUPERVISOR.name}</div>
            <div style={{ fontSize: 11, color: S.greenL, marginTop: 2 }}>{SUPERVISOR.crp}</div>
            <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{SUPERVISOR.clinic}</div>
          </div>

          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>1. PACIENTE</div>
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

          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>2. TESTES APLICADOS POR</div>
            <input
              value={appliedBy} onChange={e => setAppliedBy(e.target.value)}
              placeholder={user?.full_name || 'Nome do profissional...'}
              style={inputStyle}
            />
          </div>

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
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <button onClick={print} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: `1px solid ${S.border}`, background: 'transparent', cursor: 'pointer', color: S.greenL }}>
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
                    <div key={i} style={{ width: i <= step ? 24 : 8, height: 4, borderRadius: 2, background: i <= step ? S.green : S.border, transition: 'all 0.3s' }} />
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
              <div style={{ background: '#fff', borderRadius: 6, padding: '32px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}
                dangerouslySetInnerHTML={{ __html: report }} />
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
