import {
  AlignmentType, BorderStyle, Document, Header, ImageRun, Packer,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx'
import { saveAs } from 'file-saver'

// ── Paleta de cores do template ───────────────────────────────────────────────
const C = {
  sectionBg:    '5B83A5',
  tableHeader:  '4472C4',
  comprometido: 'E8821A',
  deficitario:  'C00000',
  preservado:   '1F3864',
  altRow:       'EEF3F8',
  domainSub:    'D6E4F0',
  border:       'B8C7D9',
  dark:         '1A3D2B',
  white:        'FFFFFF',
  gray:         '555555',
  text:         '1A1A2E',
}

// ── NORMAS NEUPSILIN (para cálculo de z-score no docx) ───────────────────────
const NP = {
  orientation: { '19-39':{'1-4':{mean:7.59,sd:0.75},'5-8':{mean:7.82,sd:0.43},'9+':{mean:7.92,sd:0.27}},'40-59':{'1-4':{mean:7.62,sd:0.70},'5-8':{mean:7.73,sd:0.58},'9+':{mean:7.89,sd:0.41}},'60-75':{'1-4':{mean:7.69,sd:0.57},'5-8':{mean:7.83,sd:0.38},'9+':{mean:7.76,sd:0.43}},'76-90':{'1-4':{mean:7.69,sd:0.54},'5-8':{mean:7.90,sd:0.30},'9+':{mean:7.81,sd:0.39}} },
  attention:   { '19-39':{'1-4':{mean:18.33,sd:6.94},'5-8':{mean:21.63,sd:4.28},'9+':{mean:23.94,sd:3.58}},'40-59':{'1-4':{mean:16.40,sd:7.82},'5-8':{mean:22.02,sd:4.20},'9+':{mean:23.53,sd:2.08}},'60-75':{'1-4':{mean:18.13,sd:7.43},'5-8':{mean:20.96,sd:5.17},'9+':{mean:22.29,sd:3.53}},'76-90':{'1-4':{mean:19.24,sd:5.05},'5-8':{mean:18.10,sd:5.68},'9+':{mean:22.02,sd:2.48}} },
  perception:  { '19-39':{'1-4':{mean:14.43,sd:3.13},'5-8':{mean:15.35,sd:1.95},'9+':{mean:15.71,sd:0.58}},'40-59':{'1-4':{mean:13.97,sd:3.48},'5-8':{mean:15.22,sd:1.87},'9+':{mean:15.75,sd:0.59}},'60-75':{'1-4':{mean:14.17,sd:3.16},'5-8':{mean:14.93,sd:2.61},'9+':{mean:15.52,sd:0.88}},'76-90':{'1-4':{mean:13.76,sd:3.50},'5-8':{mean:14.40,sd:3.00},'9+':{mean:15.04,sd:2.11}} },
  memory:      { '19-39':{'1-4':{mean:21.56,sd:8.07},'5-8':{mean:27.19,sd:6.98},'9+':{mean:30.85,sd:5.48}},'40-59':{'1-4':{mean:19.63,sd:8.51},'5-8':{mean:24.73,sd:7.46},'9+':{mean:29.43,sd:6.46}},'60-75':{'1-4':{mean:18.71,sd:8.09},'5-8':{mean:22.86,sd:7.71},'9+':{mean:26.88,sd:7.20}},'76-90':{'1-4':{mean:16.54,sd:8.69},'5-8':{mean:21.24,sd:7.68},'9+':{mean:25.77,sd:7.53}} },
  arithmetic:  { '19-39':{'1-4':{mean:5.33,sd:2.26},'5-8':{mean:7.01,sd:1.89},'9+':{mean:7.86,sd:1.22}},'40-59':{'1-4':{mean:4.74,sd:2.47},'5-8':{mean:6.83,sd:1.97},'9+':{mean:7.88,sd:1.07}},'60-75':{'1-4':{mean:4.48,sd:2.45},'5-8':{mean:6.28,sd:2.36},'9+':{mean:7.54,sd:1.55}},'76-90':{'1-4':{mean:4.00,sd:2.38},'5-8':{mean:5.00,sd:2.45},'9+':{mean:7.17,sd:1.63}} },
  language:    { '19-39':{'1-4':{mean:43.17,sd:10.24},'5-8':{mean:50.70,sd:7.35},'9+':{mean:56.44,sd:5.21}},'40-59':{'1-4':{mean:39.21,sd:11.44},'5-8':{mean:49.12,sd:8.73},'9+':{mean:55.87,sd:5.93}},'60-75':{'1-4':{mean:38.53,sd:11.75},'5-8':{mean:46.98,sd:9.53},'9+':{mean:53.56,sd:6.31}},'76-90':{'1-4':{mean:34.52,sd:11.82},'5-8':{mean:43.90,sd:10.59},'9+':{mean:51.77,sd:7.59}} },
  praxis:      { '19-39':{'1-4':{mean:9.00,sd:2.10},'5-8':{mean:9.42,sd:1.52},'9+':{mean:9.78,sd:0.49}},'40-59':{'1-4':{mean:8.57,sd:2.48},'5-8':{mean:9.34,sd:1.57},'9+':{mean:9.86,sd:0.37}},'60-75':{'1-4':{mean:8.41,sd:2.48},'5-8':{mean:9.09,sd:1.76},'9+':{mean:9.69,sd:0.68}},'76-90':{'1-4':{mean:7.59,sd:2.86},'5-8':{mean:8.60,sd:2.41},'9+':{mean:9.38,sd:1.29}} },
  executive:   { '19-39':{'1-4':{mean:7.56,sd:2.41},'5-8':{mean:9.21,sd:2.30},'9+':{mean:10.64,sd:1.78}},'40-59':{'1-4':{mean:6.26,sd:2.84},'5-8':{mean:8.68,sd:2.54},'9+':{mean:10.62,sd:1.92}},'60-75':{'1-4':{mean:5.96,sd:2.77},'5-8':{mean:7.72,sd:2.61},'9+':{mean:9.58,sd:2.36}},'76-90':{'1-4':{mean:5.59,sd:2.52},'5-8':{mean:7.28,sd:2.35},'9+':{mean:8.92,sd:2.64}} },
}

function npAgeGroup(age) {
  if (!age) return '60-75'
  if (age <= 39) return '19-39'
  if (age <= 59) return '40-59'
  if (age <= 75) return '60-75'
  return '76-90'
}
function npEduGroup(e) {
  if (!e) return '9+'
  const n = parseInt(e)
  if (!isNaN(n)) { if (n <= 4) return '1-4'; if (n <= 8) return '5-8'; return '9+' }
  const low = e.toLowerCase()
  if (low.includes('fundamental') && (low.includes('incompleto') || low.includes('1') || low.includes('4'))) return '1-4'
  if (low.includes('fundamental')) return '5-8'
  return '9+'
}
function npCalcZ(score, domain, ageG, eduG) {
  const n = NP[domain]?.[ageG]?.[eduG]
  if (!n || score == null || score === '') return null
  const s = Number(score)
  if (isNaN(s)) return null
  const sd = n.sd < 0.05 ? 0.05 : n.sd
  return isFinite((s - n.mean) / sd) ? (s - n.mean) / sd : null
}
function npZtoPct(z) {
  if (z == null) return null
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t) * Math.exp(-x*x)
  return Math.round(Math.max(1, Math.min(99, 0.5 * (1 + sign * y) * 100)))
}
function classLabel(z) {
  if (z == null) return '—'
  const n = parseFloat(z)
  if (n >= -1.0) return 'PRESERVADO'
  if (n >= -1.5) return 'LIMÍTROFE'
  return 'COMPROMETIDO'
}

// ── Utilitários ───────────────────────────────────────────────────────────────
async function loadImage(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch { return null }
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
}

function parseInlineHtml(html, size = 22) {
  const runs = []
  let bold = false, italic = false, under = false
  const parts = (html || '').split(/(<\/?strong>|<\/?b>|<\/?em>|<\/?i>|<\/?u>|<span[^>]*>|<\/span>|<br\s*\/?>)/i)
  for (const part of parts) {
    if (!part) continue
    if (/<(strong|b)>/i.test(part)) { bold = true; continue }
    if (/<\/(strong|b)>/i.test(part)) { bold = false; continue }
    if (/<(em|i)>/i.test(part)) { italic = true; continue }
    if (/<\/(em|i)>/i.test(part)) { italic = false; continue }
    if (/<u>/i.test(part)) { under = true; continue }
    if (/<\/u>/i.test(part)) { under = false; continue }
    if (/^<span/i.test(part) || part === '</span>') continue
    if (/<br/i.test(part)) { runs.push(new TextRun({ break: 1 })); continue }
    const text = part.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    if (!text.trim()) continue
    runs.push(new TextRun({ text, bold, italics: italic, underline: under ? {} : undefined, font: 'Arial', size, color: C.text }))
  }
  return runs.length ? runs : [new TextRun({ text: '', font: 'Arial', size })]
}

function htmlToParagraphs(html, size = 22) {
  const paras = []
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let m, found = false

  while ((m = pRe.exec(html)) !== null) {
    found = true
    paras.push(new Paragraph({
      children: parseInlineHtml(m[1], size),
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120 },
      indent: { firstLine: 400 },
    }))
  }
  if (!found) {
    while ((m = liRe.exec(html)) !== null) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: `• ${stripHtml(m[1])}`, font: 'Arial', size })],
        indent: { left: 360 },
        spacing: { after: 80 },
      }))
    }
  }
  if (paras.length === 0) {
    const t = stripHtml(html)
    if (t) paras.push(new Paragraph({ children: [new TextRun({ text: t, font: 'Arial', size })], alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 } }))
  }
  return paras
}

function parseSections(html) {
  const secs = []
  // Match: <div style="margin-bottom:20px;"><div ...>TITLE</div>CONTENT</div>
  const re = /<div[^>]*margin-bottom[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>([\s\S]*?)<\/div>\s*(?=<div|$)/gi
  let m
  while ((m = re.exec(html || '')) !== null) {
    const title = stripHtml(m[1]).trim()
    if (title) secs.push({ title, content: m[2].trim() })
  }
  return secs
}

// ── Construtores de elementos docx ───────────────────────────────────────────
const BORDER_DEF = { style: BorderStyle.SINGLE, size: 4, color: C.border }
const BORDERS    = { top: BORDER_DEF, bottom: BORDER_DEF, left: BORDER_DEF, right: BORDER_DEF }
const NO_BORDER  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }

function secHeader(text) {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), color: C.white, bold: true, size: 24, font: 'Arial' })],
    shading: { type: ShadingType.SOLID, fill: C.sectionBg, color: C.sectionBg },
    spacing: { before: 280, after: 140 },
    indent: { left: 120, right: 120 },
  })
}

function hCell(text, { span, center, pct } = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text ?? ''), color: C.white, bold: true, size: 20, font: 'Arial' })],
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 60, after: 60 },
    })],
    shading: { type: ShadingType.SOLID, fill: C.tableHeader },
    borders: BORDERS,
    columnSpan: span,
    width: pct ? { size: pct, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  })
}

function dCell(text, { alt, center, bold, color } = {}) {
  const fill = alt ? C.altRow : 'FFFFFF'
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text ?? '—'), font: 'Arial', size: 20, bold: !!bold, color: color || C.text })],
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 60, after: 60 },
    })],
    shading: { type: ShadingType.SOLID, fill },
    borders: BORDERS,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  })
}

function domainCell(text, { alt, isHeader } = {}) {
  const fill = isHeader ? C.domainSub : (alt ? C.altRow : 'FFFFFF')
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text ?? ''), font: 'Arial', size: 20, bold: !!isHeader, color: C.text })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 60, after: 60 },
    })],
    shading: { type: ShadingType.SOLID, fill },
    borders: BORDERS,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  })
}

function classColor(lbl) {
  if (!lbl) return C.text
  const u = String(lbl).toUpperCase()
  if (u.includes('COMPROMETIDO') || u.includes('LIMÍTROFE') || u.includes('LIMITROFE')) return C.comprometido
  if (u.includes('DEFICITÁRIO') || u.includes('DEFICITARIO')) return C.deficitario
  if (u.includes('PRESERVADO') || u.includes('NORMAL') || u.includes('DENTRO')) return C.preservado
  return C.text
}

function spacer(size = 120) {
  return new Paragraph({ spacing: { after: size } })
}

function fmtDate(d) {
  if (!d) return '—'
  const p = d.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d
}

// ── Nomes completos dos testes ────────────────────────────────────────────────
const FULL_NAMES = {
  NEUPSILIN: 'Instrumento de Avaliação Neuropsicológica Breve Adulto (NEUPSILIN)',
  TRIACOG:   'Triagem Cognitiva (TRIACOG)',
  RAVLT:     'Teste de Aprendizagem Auditivo-Verbal de Rey (RAVLT)',
  BAMS:      'Bateria de Avaliação da Memória Semântica (BAMS)',
  WASI:      'Escala de Inteligência de Wechsler Abreviada (WASI)',
  'WASI-III':'Escala de Inteligência de Wechsler Abreviada III (WASI-III)',
  'WCST-N':  'Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)',
  DEX:       'Questionário Disexecutivo (DEX)',
  FAB:       'Bateria de Avaliação Frontal (FAB)',
  'GDS-15':  'Escala de Depressão Geriátrica (GDS-15)',
  GAI:       'Inventário de Ansiedade Geriátrica (GAI)',
  'BDI-II':  'Inventário de Depressão de Beck — II (BDI-II)',
  HAD:       'Escala Hospitalar de Ansiedade e Depressão (HAD)',
  IQCODE:    'Questionário Informante sobre Declínio Cognitivo no Idoso (IQCODE)',
  'B-ADL':   'Escala Bayer de Atividades da Vida Diária (B-ADL)',
  Pfeffer:   'Questionário de Atividades Funcionais de Pfeffer',
  Lawton:    'Escala de Atividades Instrumentais de Lawton e Brody',
  'IDATE-E': 'Inventário de Ansiedade Traço-Estado (IDATE) — Estado',
  'IDATE-T': 'Inventário de Ansiedade Traço-Estado (IDATE) — Traço',
  TOKEN:     'Token Test',
  BADL:      'Índice de Katz — Atividades Básicas de Vida Diária (BADL)',
  MoCA:      'Avaliação Cognitiva Montreal (MoCA)',
}

// ── Referências ABNT ──────────────────────────────────────────────────────────
const REFERENCES = [
  'FONSECA, R. P. et al. Neupsilin – Instrumento de Avaliação Neuropsicológica Breve. 1. ed. São Paulo: Vetor Editora, 2009.',
  'BERTOLA, L.; DINIZ LEANDRO. Bateria de Avaliação da Memória Semântica – BAMS. São Paulo: Vetor, 2019.',
  'REY, André. Adaptação Brasileira: Jonas Jardim de Paula e Leandro F. Malloy-Diniz. Teste de Aprendizagem Auditivo-Verbal de Rey. São Paulo: Vetor Editora, 2018.',
  'HEATON, R. K. et al. Teste Wisconsin de Classificação de Cartas. São Paulo: Casa do Psicólogo, 2004.',
  'MOREIRA, Lafaiete et al. Token Test. In: MALLOY-DINIZ, L. F. Avaliação Neuropsicológica. Porto Alegre: Artmed, 2010.',
  'YESAVAGE, J. A. Geriatric Depression Scale. Psychopharmacol Bull, v. 24, p. 709, 1988.',
  'MASSENA, P. N. et al. Validation of the Brazilian Portuguese Version of Geriatric Anxiety Inventory – GAIBR. International Psychogeriatrics, p. 1-7, 2014.',
  'CHAN, R. K. C. Dysexecutive symptoms among a non-clinical sample. British Journal of Psychology, v. 92, p. 551-565, 2001.',
  'SMITH, G. et al. Prospective and retrospective memory in normal aging and dementia. Memory, v. 8, n. 5, p. 311-321, 2000.',
  'SANCHEZ, M. A. S.; LOURENCO, R. A. Informant Questionnaire on Cognitive Decline in the Elderly (IQCODE). Cad. Saúde Pública, v. 25, n. 7, p. 1455-1465, 2009.',
  'FOLQUITTO, J. C. et al. The Bayer: Activities of Daily Living Scale (B-ADL). Rev. Bras. Psiquiatr., v. 29, n. 4, p. 350-353, 2007.',
  'ASSIS, L. de O. et al. O questionário de atividades funcionais de Pfeffer. Estudos Interdisciplinares sobre o Envelhecimento, v. 20, n. 1, p. 297-324, 2015.',
]

// ── FUNÇÃO PRINCIPAL ──────────────────────────────────────────────────────────
export async function exportToDocx({ patient, selectedTests = [], ad = {}, td = {}, aiBodyHtml = '', approvalInfo = null, appliedBy, user, dataFormatada }) {
  // td já chega completo e carregado pelo Reports.jsx (mesma fonte da conclusão da IA)
  const allTd = td
  const age = patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const professional = appliedBy || user?.full_name || 'Profissional responsável'
  const SUPER = { name: 'Dr. Pedro Donizetti de Oliveira', crp: 'CRP 06/82.060' }
  const informante = [ad?.acompanhante, ad?.responsavel].filter(Boolean).join(', ') || ad?.informante || 'Paciente'
  const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Carregar imagens do diretório público
  const [logoData, _sig1Raw, sig2Data] = await Promise.all([
    loadImage('/images/logo_header.png'),
    loadImage('/images/sig-003.png'),   // assinatura Pedro (opcional)
    loadImage('/images/sig-002.png'),
  ])
  const sig1Data = _sig1Raw || sig2Data  // fallback para carimbo da clínica

  const body = []

  // ── TÍTULO ────────────────────────────────────────────────────────────────
  body.push(new Paragraph({
    children: [new TextRun({ text: 'Laudo Psicológico com Ênfase Neuropsicológico', color: C.sectionBg, bold: true, size: 52, font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.SOLID, fill: C.altRow, color: C.altRow },
    spacing: { before: 0, after: 280 },
    indent: { left: 120, right: 120 },
  }))

  // ── TABELA DE IDENTIFICAÇÃO ───────────────────────────────────────────────
  const idRows = [
    ['Paciente', patient?.full_name || '—', 'Matrícula Prevent', ad?.matricula || '—'],
    ['Idade', age != null ? `${age} anos` : '—', 'Data de Nascimento', fmtDate(patient?.birth_date)],
    ['Escolaridade', patient?.education || ad?.escolaridade || '—', 'Lateralidade', ad?.lateralidade || patient?.lateralidade || '—'],
    ['Período do Exame', mesAno, 'Data do Laudo', dataFormatada || '—'],
    ['Informante', informante, 'Avaliado por', professional],
  ]

  body.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: idRows.map((r, i) => new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r[0], font: 'Arial', size: 20, bold: true })], spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: i % 2 === 0 ? C.altRow : 'FFFFFF' }, borders: BORDERS, margins: { left: 100, right: 100 } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r[1], font: 'Arial', size: 20 })], spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: i % 2 === 0 ? C.altRow : 'FFFFFF' }, borders: BORDERS, margins: { left: 100, right: 100 } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r[2], font: 'Arial', size: 20, bold: true })], spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: i % 2 === 0 ? C.altRow : 'FFFFFF' }, borders: BORDERS, margins: { left: 100, right: 100 } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r[3], font: 'Arial', size: 20 })], spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: i % 2 === 0 ? C.altRow : 'FFFFFF' }, borders: BORDERS, margins: { left: 100, right: 100 } }),
    ]}))
  }))

  body.push(spacer(160))

  // ── INFORMAÇÕES GERAIS E QUEIXAS ──────────────────────────────────────────
  const infoItems = [
    ad?.objetivo_avaliacao || ad?.motivo_encaminhamento
      ? { lbl: 'Objetivo da avaliação', txt: ad.objetivo_avaliacao || ad.motivo_encaminhamento } : null,
    ad?.queixas
      ? { lbl: 'Descrição da demanda', txt: ad.queixas } : null,
    (ad?.profissao || ad?.estado_civil || ad?.moradia)
      ? { lbl: 'Informações gerais', txt: [ad.profissao && `Profissão: ${ad.profissao}`, ad.estado_civil && `Estado civil: ${ad.estado_civil}`, ad.moradia && `Moradia: ${ad.moradia}`].filter(Boolean).join(' | ') } : null,
    (ad?.doencas_preexistentes || ad?.medicamentos)
      ? { lbl: 'Saúde e antecedentes', txt: [ad.doencas_preexistentes && `Doenças: ${Array.isArray(ad.doencas_preexistentes) ? ad.doencas_preexistentes.join(', ') : ad.doencas_preexistentes}`, ad.medicamentos && `Medicamentos: ${ad.medicamentos}`].filter(Boolean).join(' | ') } : null,
  ].filter(Boolean)

  if (infoItems.length) {
    body.push(secHeader('INFORMAÇÕES GERAIS E QUEIXAS PRINCIPAIS'))
    for (const item of infoItems) {
      body.push(new Paragraph({
        children: [
          new TextRun({ text: `${item.lbl}: `, bold: true, font: 'Arial', size: 22, color: C.text }),
          new TextRun({ text: item.txt, font: 'Arial', size: 22, color: C.text }),
        ],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120 },
        indent: { firstLine: 400 },
      }))
    }
  }

  // ── EXAMES IMAGIOLÓGICOS ──────────────────────────────────────────────────
  body.push(secHeader('EXAMES IMAGIOLÓGICOS'))
  body.push(new Paragraph({
    children: [new TextRun({ text: ad?.exames || 'Paciente não apresenta exames imagiológicos.', font: 'Arial', size: 22, color: C.text })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    indent: { firstLine: 400 },
  }))

  // ── PROCEDIMENTO ──────────────────────────────────────────────────────────
  body.push(secHeader('PROCEDIMENTO'))
  body.push(new Paragraph({
    children: [new TextRun({ text: 'Foram realizadas consultas para entrevista de anamnese e aplicação dos seguintes instrumentos neuropsicológicos:', font: 'Arial', size: 22, color: C.text })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80 },
  }))
  for (const key of selectedTests) {
    body.push(new Paragraph({
      children: [new TextRun({ text: `• ${FULL_NAMES[key] || key}`, font: 'Arial', size: 22, color: C.text })],
      indent: { left: 360 },
      spacing: { after: 60 },
    }))
  }
  body.push(spacer(120))

  // ── TABELA DE RESULTADOS — ESCALAS ────────────────────────────────────────
  const scaleKeys = ['GDS-15','GAI','BDI-II','HAD','IQCODE','B-ADL','Pfeffer','Lawton','BADL','FAB','MoCA','IDATE-E','IDATE-T']
  const scaleRows = []
  let si = 0
  for (const key of scaleKeys) {
    if (!allTd?.[key]) continue
    const t = allTd[key]
    if (key === 'HAD') {
      scaleRows.push([`HAD — Ansiedade`, t.anxiety_score, t.anxiety_classification, si++ % 2 === 1])
      scaleRows.push([`HAD — Depressão`, t.depression_score, t.depression_classification, si++ % 2 === 1])
    } else {
      scaleRows.push([FULL_NAMES[key] || key, t.total_score, t.classification, si++ % 2 === 1])
    }
  }

  const hasMemimp    = !!(allTd?.MEMIMP && (allTd.MEMIMP.patient_total != null || allTd.MEMIMP.family_total != null))
  const hasDexDomain = !!(allTd?.DEX   && (allTd.DEX.patient_total   != null || allTd.DEX.family_total   != null))

  if (scaleRows.length || hasMemimp || hasDexDomain) {
    body.push(secHeader('TABELA DE RESULTADOS – ESCALAS'))
  }

  if (scaleRows.length) {
    body.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [hCell('Escalas', { pct: 60 }), hCell('Pontos', { pct: 20, center: true }), hCell('Classificação', { pct: 20, center: true })] }),
        ...scaleRows.map(([lbl, score, classif, alt]) => new TableRow({ children: [
          dCell(lbl, { alt }),
          dCell(score ?? '—', { alt, center: true, bold: true }),
          dCell(classif ?? '—', { alt, center: true, bold: true, color: classColor(classif) }),
        ]}))
      ]
    }))
    body.push(spacer(100))
  }

  // MEMIMP — Memória Prospectiva e Retrospectiva
  if (hasMemimp) {
    const mm = allTd.MEMIMP
    const memimpClass = (v, max) => {
      if (v == null) return '—'
      const pct = v / max
      if (pct <= 0.25) return 'Normal'
      if (pct <= 0.50) return 'Leve'
      return 'Elevado'
    }
    const famProspScore = mm.family_prospective_score  ?? mm.family_prospective
    const famRetroScore = mm.family_retrospective_score ?? mm.family_retrospective
    const patProspScore = mm.patient_prospective_score  ?? mm.patient_prospective
    const patRetroScore = mm.patient_retrospective_score ?? mm.patient_retrospective
    const mRows = [
      ['Memória Prospectiva',   famProspScore, mm.family_prospective_classification   || memimpClass(famProspScore, 32),  patProspScore, mm.patient_prospective_classification   || memimpClass(patProspScore, 32)],
      ['Memória Retrospectiva', famRetroScore, mm.family_retrospective_classification || memimpClass(famRetroScore, 32), patRetroScore, mm.patient_retrospective_classification || memimpClass(patRetroScore, 32)],
      ['Total',                 mm.family_total, memimpClass(mm.family_total, 64), mm.patient_total, memimpClass(mm.patient_total, 64)],
    ]
    body.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [new TableCell({ columnSpan: 5, children: [new Paragraph({ children: [new TextRun({ text: 'Memória Prospectiva e Retrospectiva (MEMIMP)', color: C.white, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: C.tableHeader }, borders: BORDERS })] }),
        new TableRow({ children: [hCell('Itens', { pct: 30 }), hCell('Familiar', { pct: 15, center: true }), hCell('Classif.', { pct: 20, center: true }), hCell('Paciente', { pct: 15, center: true }), hCell('Classif.', { pct: 20, center: true })] }),
        ...mRows.map(([lbl, famV, famC, patV, patC], i) => new TableRow({ children: [
          dCell(lbl, { alt: i % 2 === 1 }),
          dCell(famV ?? '—', { alt: i % 2 === 1, center: true, bold: true }),
          dCell(famC,        { alt: i % 2 === 1, center: true, bold: true }),
          dCell(patV ?? '—', { alt: i % 2 === 1, center: true, bold: true }),
          dCell(patC,        { alt: i % 2 === 1, center: true, bold: true }),
        ]}))
      ]
    }))
    body.push(spacer(100))
  }

  // DEX — por domínio (Comportamental / Cognitivo / Emoções)
  if (hasDexDomain) {
    const dx = allTd.DEX
    const DEX_DOMAINS = [
      { lbl: 'Comportamental', items: [2, 6, 7, 11, 16, 17, 18, 19] },
      { lbl: 'Cognitivo',      items: [1, 3, 4, 8, 10, 12, 15] },
      { lbl: 'Emoções',        items: [5, 9, 13, 14, 20] },
    ]
    const dexDomainClass = (v, max) => {
      if (v == null) return '—'
      const cutNorm = Math.round(max * 0.25)
      const cutLim  = Math.round(max * 0.4375)
      if (v <= cutNorm) return 'Normal'
      if (v <= cutLim)  return 'Limítrofe'
      return 'Alterado'
    }
    const dexColorMap = (c) => c === 'Alterado' ? C.comprometido : c === 'Limítrofe' ? C.comprometido : c === 'Normal' ? C.preservado : C.text

    const domainRows = DEX_DOMAINS.map(({ lbl, items }) => {
      const max    = items.length * 4
      const patHas = items.some(n => dx[`patient_q${n}`] != null)
      const famHas = items.some(n => dx[`family_q${n}`]  != null)
      const patScore = patHas ? items.reduce((s, n) => s + (Number(dx[`patient_q${n}`]) || 0), 0) : null
      const famScore = famHas ? items.reduce((s, n) => s + (Number(dx[`family_q${n}`])  || 0), 0) : null
      return { lbl, patScore, patClass: patHas ? dexDomainClass(patScore, max) : null, famScore, famClass: famHas ? dexDomainClass(famScore, max) : null }
    })
    const patTot = dx.patient_total
    const famTot = dx.family_total
    const patCls = dx.patient_classification
    const famCls = dx.family_classification

    body.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [new TableCell({ columnSpan: 5, children: [new Paragraph({ children: [new TextRun({ text: 'Questionário Disexecutivo (DEX) — por Domínio', color: C.white, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: C.tableHeader }, borders: BORDERS })] }),
        new TableRow({ children: [hCell('Domínio', { pct: 30 }), hCell('Familiar', { pct: 15, center: true }), hCell('Classif.', { pct: 20, center: true }), hCell('Paciente', { pct: 15, center: true }), hCell('Classif.', { pct: 20, center: true })] }),
        ...domainRows.map(({ lbl, famScore, famClass, patScore, patClass }, i) => new TableRow({ children: [
          dCell(lbl, { alt: i % 2 === 1 }),
          dCell(famScore ?? '—', { alt: i % 2 === 1, center: true, bold: true }),
          dCell(famClass ?? '—', { alt: i % 2 === 1, center: true, bold: !!famClass, color: famClass ? dexColorMap(famClass) : C.text }),
          dCell(patScore ?? '—', { alt: i % 2 === 1, center: true, bold: true }),
          dCell(patClass ?? '—', { alt: i % 2 === 1, center: true, bold: !!patClass, color: patClass ? dexColorMap(patClass) : C.text }),
        ]})),
        new TableRow({ children: [
          dCell('Total', { alt: true }),
          dCell(famTot ?? '—', { alt: true, center: true, bold: true }),
          dCell(famCls ?? '—', { alt: true, center: true, bold: !!famCls, color: classColor(famCls) }),
          dCell(patTot ?? '—', { alt: true, center: true, bold: true }),
          dCell(patCls ?? '—', { alt: true, center: true, bold: !!patCls, color: classColor(patCls) }),
        ]}),
      ]
    }))
    body.push(spacer(160))
  }

  // ── TABELA DE RESULTADOS — TESTES ─────────────────────────────────────────
  // Mostra as tabelas para qualquer teste com dados na sessão (não exige selectedTests)
  const hasNp   = !!allTd?.NEUPSILIN
  const hasRv   = !!allTd?.RAVLT
  const hasBams = !!allTd?.BAMS
  const hasTok  = !!(allTd?.TOKEN && (allTd.TOKEN.total_score != null || allTd.TOKEN.part_a_score != null))

  if (hasNp || hasRv || hasBams || hasTok) {
    body.push(secHeader('TABELA DE RESULTADOS – TESTES'))
  }

  // TOKEN
  if (hasTok) {
    const tok = allTd.TOKEN
    const tokParts = [
      { key: 'part_a', lbl: 'Parte A — Todas as peças' },
      { key: 'part_b', lbl: 'Parte B — Somente peças grandes' },
      { key: 'part_c', lbl: 'Parte C — Todas, sem repetir instrução' },
      { key: 'part_d', lbl: 'Parte D — Grandes, sem repetir instrução' },
      { key: 'part_e', lbl: 'Parte E — Todas, sem repetir instrução' },
      { key: 'part_f', lbl: 'Parte F — Todas, sem repetir instrução' },
    ]
    const tokRows = tokParts.filter(p => tok[`${p.key}_score`] != null)
    if (tokRows.length || tok.total_score != null) {
      body.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [new TableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: 'Token Test', color: C.white, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: C.tableHeader }, borders: BORDERS })] }),
          new TableRow({ children: [hCell('Teste', { pct: 50 }), hCell('Pontos', { pct: 15, center: true }), hCell('Percentil', { pct: 15, center: true }), hCell('Classificação', { pct: 20, center: true })] }),
          ...tokRows.map((p, i) => new TableRow({ children: [
            dCell(p.lbl, { alt: i % 2 === 1 }),
            dCell(tok[`${p.key}_score`] ?? '—', { alt: i % 2 === 1, center: true, bold: true }),
            dCell(tok[`${p.key}_percentile`] != null ? String(tok[`${p.key}_percentile`]) : '—', { alt: i % 2 === 1, center: true }),
            dCell('—', { alt: i % 2 === 1, center: true }),
          ]})),
          ...(tok.total_score != null ? [new TableRow({ children: [
            dCell('Total', { alt: true }),
            dCell(String(tok.total_score), { alt: true, center: true, bold: true }),
            dCell(tok.percentile != null ? String(tok.percentile) : '—', { alt: true, center: true }),
            dCell(tok.classification ?? '—', { alt: true, center: true, bold: !!tok.classification, color: classColor(tok.classification) }),
          ]})] : []),
        ]
      }))
      body.push(spacer(120))
    }
  }

  // NEUPSILIN
  if (hasNp) {
    const np  = allTd.NEUPSILIN
    const ag  = npAgeGroup(age)
    const eg  = npEduGroup(np.education_years || patient?.education || '9+')
    const zs  = np.zScores || {}

    // Totais para novo formato
    const calcZflat = (total, domain) => zs[domain] ?? npCalcZ(total, domain, ag, eg)

    const orientT = (Number(np.orientation_time_total)||0) + (Number(np.orientation_space_total)||0)
    const attT    = (Number(np.attention_reverse_count)||0) + (Number(np.attention_digit_sequence)||0)
    const percT   = (Number(np.perception_line_equality)||0) + (Number(np.perception_visual_hemineglect)||0) + (Number(np.perception_face_perception)||0) + (Number(np.perception_face_recognition)||0)
    const episT   = (Number(np.memory_episodic_immediate)||0) + (Number(np.memory_episodic_delayed)||0) + (Number(np.memory_episodic_recognition)||0)
    const memT    = (Number(np.memory_working)||0) + (Number(np.memory_span_auditory)||0) + episT + (Number(np.memory_semantic_long)||0) + (Number(np.memory_visual_short)||0) + (Number(np.memory_prospective)||0)
    const langT   = (Number(np.lang_nomeacao)||0)+(Number(np.lang_repeticao)||0)+(Number(np.lang_automatica)||0)+(Number(np.lang_compreensao_oral)||0)+(Number(np.lang_inferencias)||0)+(Number(np.lang_leitura)||0)+(Number(np.lang_compreensao_escrita)||0)+(Number(np.lang_escrita_espontanea)||0)+(Number(np.lang_escrita_copiada)||0)+(Number(np.lang_ditada)||0)
    const praxT   = (Number(np.praxis_ideomotor)||0) + (Number(np.praxis_constructive)||0) + (Number(np.praxis_reflexive)||0)
    const execT   = (Number(np.executive_problem_solving)||0) + (Number(np.executive_verbal_fluency)||0)

    const npDomains = [
      { lbl: '1 – Orientação',              raw: orientT,               z: calcZflat(orientT, 'orientation') },
      { lbl: '2 – Atenção',                 raw: attT,                  z: calcZflat(attT,    'attention')   },
      { lbl: '3 – Percepção',               raw: percT,                 z: calcZflat(percT,   'perception')  },
      { lbl: '4 – Memória',                 raw: memT,                  z: calcZflat(memT,    'memory')      },
      { lbl: '5 – Habilidades Aritméticas', raw: np.arithmetic != null ? Number(np.arithmetic) : null, z: calcZflat(np.arithmetic, 'arithmetic') },
      { lbl: '6 – Linguagem',               raw: langT,                 z: calcZflat(langT,   'language')    },
      { lbl: '7 – Praxias',                 raw: praxT,                 z: calcZflat(praxT,   'praxis')      },
      { lbl: '8 – Funções Executivas',      raw: execT,                 z: calcZflat(execT,   'executive')   },
    ]

    body.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [new TableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: 'Instrumento de Avaliação Neuropsicológica Breve Adulto – NEUPSILIN', color: C.white, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: C.tableHeader }, borders: BORDERS })] }),
        new TableRow({ children: [hCell('Fatores', { pct: 35 }), hCell('Escore Bruto', { pct: 20, center: true }), hCell('Z-Escore', { pct: 20, center: true }), hCell('Resultado', { pct: 25, center: true })] }),
        ...npDomains.map(({ lbl, raw, z }, i) => {
          const zn = z != null ? parseFloat(z) : null
          const cls = classLabel(zn)
          return new TableRow({ children: [
            dCell(lbl, { alt: i % 2 === 1 }),
            dCell(raw != null ? String(raw) : '—', { alt: i % 2 === 1, center: true }),
            dCell(zn != null ? zn.toFixed(2) : '—', { alt: i % 2 === 1, center: true }),
            dCell(cls, { alt: i % 2 === 1, center: true, bold: true, color: classColor(cls) }),
          ]})
        })
      ]
    }))
    body.push(spacer(120))
  }

  // RAVLT
  if (hasRv) {
    const rv = allTd.RAVLT
    const rvRows = [
      { lbl: 'A1 — Aprendizagem (1ª tentativa)', v: rv.a1_score, pct: rv.a1_percentile ?? null, c: rv.a1_classification },
      { lbl: 'A2 — Aprendizagem (2ª tentativa)', v: rv.a2_score, pct: rv.a2_percentile ?? null, c: rv.a2_classification },
      { lbl: 'A3 — Aprendizagem (3ª tentativa)', v: rv.a3_score, pct: rv.a3_percentile ?? null, c: rv.a3_classification },
      { lbl: 'A4 — Aprendizagem (4ª tentativa)', v: rv.a4_score, pct: rv.a4_percentile ?? null, c: rv.a4_classification },
      { lbl: 'A5 — Aprendizagem (5ª tentativa)', v: rv.a5_score, pct: rv.a5_percentile ?? null, c: rv.a5_classification },
      { lbl: 'B1 — Lista interferência',          v: rv.b1_score, pct: rv.b1_percentile ?? null, c: rv.b1_classification },
      { lbl: 'A6 — Evocação pós-interferência',   v: rv.a6_score, pct: rv.a6_percentile ?? null, c: rv.a6_classification },
      { lbl: 'A7 — Evocação tardia',              v: rv.a7_score, pct: rv.percentile ?? null, c: rv.a7_classification || rv.classification },
      { lbl: 'Reconhecimento — Acertos',          v: rv.recognition_hits,  pct: null, c: null },
      { lbl: 'Reconhecimento — Falsos Positivos', v: rv.recognition_false, pct: null, c: null },
    ].filter(r => r.v != null)

    if (rvRows.length) {
      body.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [new TableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: 'Teste de Aprendizagem Auditivo-Verbal de Rey – RAVLT', color: C.white, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: C.tableHeader }, borders: BORDERS })] }),
          new TableRow({ children: [hCell('Índices', { pct: 50 }), hCell('Escore', { pct: 15, center: true }), hCell('%', { pct: 15, center: true }), hCell('Classificação', { pct: 20, center: true })] }),
          ...rvRows.map((r, i) => new TableRow({ children: [
            dCell(r.lbl, { alt: i % 2 === 1 }),
            dCell(r.v != null ? String(r.v) : '—', { alt: i % 2 === 1, center: true, bold: true }),
            dCell(r.pct != null ? String(r.pct) : '—', { alt: i % 2 === 1, center: true }),
            dCell(r.c ?? '—', { alt: i % 2 === 1, center: true, bold: !!r.c, color: classColor(r.c) }),
          ]}))
        ]
      }))
      body.push(spacer(120))
    }
  }

  // BAMS
  if (hasBams) {
    const bm = allTd.BAMS
    const bamsRows = [
      { lbl: 'Fluência Verbal (FV)',              v: bm.fv_total,              pct: null },
      { lbl: 'Denominação de Figuras (ND)',        v: bm.nd_total,              pct: null },
      { lbl: 'Nomeação de Imagens (NI)',           v: bm.ni_total,              pct: null },
      { lbl: 'Conceitos Gerais (CG)',              v: bm.cg_total,              pct: null },
      { lbl: 'Definição por Palavras (DP)',        v: bm.dp_total,              pct: null },
      { lbl: 'Categorias de Imagens (CI)',         v: bm.ci_total,              pct: null },
      { lbl: 'Contexto Visual (CV)',               v: bm.cv_total,              pct: null },
      { lbl: 'Memória Léxica (ND + NI)',           v: bm.lexico_score,          pct: null },
      { lbl: 'Categorização (FV + CI + CV)',       v: bm.categorization_score,  pct: null },
      { lbl: 'Conceituação (CG + DP)',             v: bm.conceptualization_score, pct: null },
      { lbl: 'Total Global',                       v: bm.global_score, pct: bm.percentile ?? null, cls: bm.classification },
    ].filter(r => r.v != null)

    if (bamsRows.length) {
      body.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [new TableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: 'Bateria de Avaliação da Memória Semântica – BAMS', color: C.white, bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })], shading: { type: ShadingType.SOLID, fill: C.tableHeader }, borders: BORDERS })] }),
          new TableRow({ children: [hCell('Fatores', { pct: 50 }), hCell('Pontos', { pct: 15, center: true }), hCell('Percentil', { pct: 15, center: true }), hCell('Classificação', { pct: 20, center: true })] }),
          ...bamsRows.map((r, i) => new TableRow({ children: [
            dCell(r.lbl, { alt: i % 2 === 1 }),
            dCell(String(r.v ?? '—'), { alt: i % 2 === 1, center: true, bold: true }),
            dCell(r.pct != null ? String(r.pct) : '—', { alt: i % 2 === 1, center: true }),
            dCell(r.cls ?? '—', { alt: i % 2 === 1, center: true, bold: !!r.cls, color: classColor(r.cls) }),
          ]}))
        ]
      }))
      body.push(spacer(120))
    }
  }

  // ── SEÇÕES INTERPRETATIVAS (do aiBody) ────────────────────────────────────
  const sections = parseSections(aiBodyHtml)
  if (sections.length) {
    for (const sec of sections) {
      body.push(secHeader(sec.title))
      body.push(...htmlToParagraphs(sec.content))
      body.push(spacer(80))
    }
  } else if (aiBodyHtml) {
    // Fallback: extrair texto plano
    const text = stripHtml(aiBodyHtml)
    const paras = text.split(/\n{2,}/).filter(Boolean)
    for (const p of paras) {
      body.push(new Paragraph({ children: [new TextRun({ text: p, font: 'Arial', size: 22, color: C.text })], alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, indent: { firstLine: 400 } }))
    }
  }

  // ── DATA ──────────────────────────────────────────────────────────────────
  body.push(new Paragraph({
    children: [new TextRun({ text: `São Paulo, ${dataFormatada || new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.`, font: 'Arial', size: 22, color: C.text })],
    alignment: AlignmentType.RIGHT,
    spacing: { before: 560, after: 200 },
  }))

  // ── ASSINATURAS ───────────────────────────────────────────────────────────
  const makeSigCell = (imgData, w, h, name, crp, role, extra) => {
    const children = []
    if (imgData) {
      children.push(new Paragraph({
        children: [new ImageRun({ data: imgData, transformation: { width: w, height: h }, type: 'png' })],
        alignment: AlignmentType.CENTER,
      }))
    }
    children.push(new Paragraph({ children: [new TextRun({ text: '___________________________________', font: 'Arial', size: 20 })], alignment: AlignmentType.CENTER }))
    children.push(new Paragraph({ children: [new TextRun({ text: name, bold: true, font: 'Arial', size: 22, color: C.text })], alignment: AlignmentType.CENTER }))
    children.push(new Paragraph({ children: [new TextRun({ text: crp, font: 'Arial', size: 20, color: C.gray })], alignment: AlignmentType.CENTER }))
    children.push(new Paragraph({ children: [new TextRun({ text: role, font: 'Arial', size: 20, color: C.gray })], alignment: AlignmentType.CENTER }))
    if (extra) children.push(new Paragraph({ children: [new TextRun({ text: extra, font: 'Arial', size: 18, color: C.gray })], alignment: AlignmentType.CENTER }))
    return new TableCell({ children, borders: NO_BORDERS })
  }

  body.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [
      makeSigCell(sig1Data, 140, 96, SUPER.name, SUPER.crp, 'Neuropsicólogo · Responsável Técnico', `CNES 707604276735994`),
      // sig-002.png: 586x332 → exibir 148x84 mantendo proporção
      makeSigCell(sig2Data, 148, 84, 'NEUROAVALIAÇÃO ME', 'CRPJ 06/6481 / CNES 49795', 'CNPJ 29.313.355/0001-12', ''),
    ]})]
  }))

  // ── APROVAÇÃO DO SUPERVISOR ───────────────────────────────────────────────
  if (approvalInfo?.approved) {
    body.push(spacer(200))
    body.push(secHeader('✓ LAUDO APROVADO PELO SUPERVISOR TÉCNICO'))
    body.push(new Paragraph({
      children: [new TextRun({ text: `${approvalInfo.supervisor_name || SUPER.name}  ·  ${SUPER.crp}  ·  Neuropsicólogo · Diretor Clínico`, bold: true, font: 'Arial', size: 22, color: C.text })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }))
    body.push(new Paragraph({
      children: [new TextRun({ text: `Aprovado em: ${approvalInfo.approval_date ? new Date(approvalInfo.approval_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`, font: 'Arial', size: 20, color: C.gray })],
      alignment: AlignmentType.CENTER,
    }))
  }

  // ── P.S. ──────────────────────────────────────────────────────────────────
  body.push(spacer(240))
  body.push(new Paragraph({
    children: [new TextRun({
      text: 'P.S.: A interpretação dos resultados destes testes e a conclusão diagnóstica são atos médicos, dependem da análise conjunta dos dados clínicos e demais exames do(a) paciente. Esse laudo não serve para fins judiciais, apenas para fins de auxílio diagnóstico médico.',
      italics: true, font: 'Arial', size: 18, color: C.gray,
    })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
  }))

  // ── REFERÊNCIAS BIBLIOGRÁFICAS ────────────────────────────────────────────
  body.push(secHeader('REFERÊNCIAS BIBLIOGRÁFICAS'))
  REFERENCES.forEach((ref, i) => {
    body.push(new Paragraph({
      children: [new TextRun({ text: `${i + 1}. ${ref}`, font: 'Arial', size: 18, color: '444444' })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 80 },
      indent: { left: 400, hanging: 400 },
    }))
  })

  // ── MONTAR DOCUMENTO ──────────────────────────────────────────────────────
  // Logo: usa proporção real da imagem; para cabeçalho horizontal ideal fornecer logo_header.png landscape
  // Atual: 1414x2000 (retrato) → exibe 48x68 mantendo proporção
  const logoW = 48, logoH = 68
  const headerChildren = logoData
    ? [new Paragraph({ children: [new ImageRun({ data: logoData, transformation: { width: logoW, height: logoH }, type: 'png' })], spacing: { after: 80 } })]
    : [new Paragraph({ children: [new TextRun({ text: 'NEUROAVALIAÇÃO — Neuropsicologia na Prática', bold: true, font: 'Arial', size: 24, color: C.dark })], alignment: AlignmentType.LEFT })]

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          size: { width: 11906, height: 16838 },
        },
      },
      headers: { default: new Header({ children: headerChildren }) },
      children: body,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const fname = `laudo_${(patient?.full_name || 'paciente').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.docx`
  saveAs(blob, fname)
}
