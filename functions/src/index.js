// deploy: 2026-05-12
const { onRequest } = require('firebase-functions/v2/https')
const admin        = require('firebase-admin')
const AnthropicPkg = require('@anthropic-ai/sdk')
const Anthropic    = AnthropicPkg.default ?? AnthropicPkg
const PDFDocument  = require('pdfkit')
const sharp        = require('sharp')
const fs           = require('fs')
const path         = require('path')

admin.initializeApp()

// ── Imagens em base64 (para o HTML exibido na tela) ───────────────────────────
function imgBase64(filename, mime) {
  try {
    const buf = fs.readFileSync(path.join(__dirname, '..', 'assets', filename))
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch { return '' }
}

const LOGO_SRC    = imgBase64('logo_neuroavaliacao.png',     'image/png')
const ASSIN_SRC   = imgBase64('assinatura_pedro.jpeg',       'image/jpeg')
const CARIMBO_SRC = imgBase64('carimbo_neuroavaliacao.jpeg', 'image/jpeg')

// ── Caminhos para o PDF (pdfkit precisa de arquivo ou Buffer) ────────────────
const ASSETS_DIR   = path.join(__dirname, '..', 'assets')
const LOGO_PATH    = path.join(ASSETS_DIR, 'logo_neuroavaliacao.png')
const ASSIN_PATH   = path.join(ASSETS_DIR, 'assinatura_pedro.jpeg')
const CARIMBO_PATH = path.join(ASSETS_DIR, 'carimbo_neuroavaliacao.jpeg')

console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY)

// =============================================================================
// HELPERS
// =============================================================================
function setCors(res) {
  res.set('Access-Control-Allow-Origin',  '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

async function verifyToken(req) {
  const header = req.headers.authorization || req.headers.Authorization
  if (!header?.startsWith('Bearer ')) return null
  try { return await admin.auth().verifyIdToken(header.slice(7)) }
  catch { return null }
}

// =============================================================================
// PDF — PARSER HTML → BLOCOS TIPADOS
// =============================================================================
function cleanText(str) {
  return (str || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function htmlParaBlocks(html) {
  const blocks = []
  const divRx = /<div[^>]*mb-6[^>]*>([\s\S]*?)<\/div>/gi
  let divMatch
  while ((divMatch = divRx.exec(html)) !== null) {
    const inner = divMatch[1]
    const h3m = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    if (h3m) blocks.push({ type: 'h3', text: cleanText(h3m[1]) })

    const elemRx = /<h4[^>]*>([\s\S]*?)<\/h4>|<p[^>]*>([\s\S]*?)<\/p>|<ul[^>]*>([\s\S]*?)<\/ul>/gi
    let em
    while ((em = elemRx.exec(inner)) !== null) {
      if (em[1] !== undefined) {
        blocks.push({ type: 'h4', text: cleanText(em[1]) })
      } else if (em[2] !== undefined) {
        const italic = /<em>/.test(em[2])
        const text   = cleanText(em[2])
        if (text) blocks.push({ type: 'p', text, italic })
      } else if (em[3] !== undefined) {
        const liRx = /<li[^>]*>([\s\S]*?)<\/li>/gi
        let li
        while ((li = liRx.exec(em[3])) !== null) {
          const text = cleanText(li[1])
          if (text) blocks.push({ type: 'li', text })
        }
      }
    }
  }
  // fallback se o HTML não tiver divs mb-6
  if (blocks.length === 0) {
    const text = cleanText(html)
    if (text) blocks.push({ type: 'p', text })
  }
  return blocks
}

// =============================================================================
// PDF — GERADOR
// =============================================================================
async function buildPDF(html, patient, meta) {
  // Recorta só o cabeçalho do timbrado (top ~14% da imagem 1414×2000)
  const CROP_H      = 275
  const headerBuffer = await sharp(LOGO_PATH)
    .extract({ left: 0, top: 0, width: 1414, height: CROP_H })
    .toBuffer()

  const PAGE_W    = 595.28
  const PAGE_H    = 841.89
  const HEADER_H  = PAGE_W * CROP_H / 1414   // ≈ 116 pts
  const MARGIN_L  = 68
  const MARGIN_R  = 68
  const MARGIN_T  = HEADER_H + 14
  const MARGIN_B  = 55
  const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

  const AZUL  = '#1B4F8A'
  const PRETO = '#1A1A1A'
  const CINZA = '#555555'
  const LINHA = '#CCCCCC'

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN_T, bottom: MARGIN_B, left: MARGIN_L, right: MARGIN_R },
      autoFirstPage: false,
      bufferPages: true,
    })

    const chunks = []
    doc.on('data',  c  => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Cabeçalho repetido em cada página
    const drawHeader = () => {
      doc.save()
      doc.image(headerBuffer, 0, 0, { width: PAGE_W })
      doc.restore()
    }

    // Rodapé com paginação (chamado no final, quando total de páginas é conhecido)
    const drawFooter = (pageNum, total) => {
      doc.save()
      doc.switchToPage(pageNum - 1)
      doc.fontSize(7.5).fillColor('#888888').font('Helvetica')
      doc.text(
        `Clínica Neuroavaliação — CNPJ 29.313.355/0001-12 — Página ${pageNum} de ${total}`,
        MARGIN_L, PAGE_H - MARGIN_B + 8,
        { width: CONTENT_W, align: 'center' }
      )
      doc.restore()
    }

    const hRule = (color = AZUL, lw = 1.0) => {
      const y = doc.y
      doc.save()
      doc.moveTo(MARGIN_L, y).lineTo(PAGE_W - MARGIN_R, y)
        .strokeColor(color).lineWidth(lw).stroke()
      doc.restore()
      doc.moveDown(0.5)
    }

    const ensureSpace = (needed = 60) => {
      if (doc.y > PAGE_H - MARGIN_B - needed) doc.addPage()
    }

    doc.on('pageAdded', drawHeader)
    doc.addPage()

    // ── Título ───────────────────────────────────────────────────────────────
    doc.fontSize(14).fillColor(AZUL).font('Helvetica-Bold')
    doc.text('LAUDO NEUROPSICOLÓGICO', { align: 'center' })
    doc.fontSize(9).fillColor(CINZA).font('Helvetica')
    doc.text('Avaliação Clínica — Confidencial', { align: 'center' })
    doc.moveDown(0.6)
    hRule(AZUL, 1.2)

    // ── Dados do paciente ─────────────────────────────────────────────────────
    const p  = patient || {}
    const sv = meta.supervisor || {}
    const infos = [
      ['Paciente',          p.full_name || ''],
      ['Data da avaliação', meta.dataFormatada || ''],
      ['Supervisão técnica', (sv.name || 'Dr. Pedro Donizetti') + '  —  ' + (sv.crp || 'CRP 06/82060')],
    ].filter(([, v]) => v)

    for (const [label, value] of infos) {
      doc.fontSize(9)
      doc.fillColor(CINZA).font('Helvetica-Bold').text(`${label}: `, { continued: true })
      doc.fillColor(PRETO).font('Helvetica').text(value)
    }
    doc.moveDown(0.8)

    // ── Seções do laudo ───────────────────────────────────────────────────────
    const blocks = htmlParaBlocks(html)
    for (const block of blocks) {
      switch (block.type) {
        case 'h3':
          ensureSpace(70)
          doc.moveDown(0.6)
          doc.fontSize(11).fillColor(AZUL).font('Helvetica-Bold')
          doc.text(block.text)
          hRule(AZUL, 0.8)
          break
        case 'h4':
          ensureSpace(50)
          doc.moveDown(0.3)
          doc.fontSize(10).fillColor(AZUL).font('Helvetica-Bold')
          doc.text(block.text)
          doc.moveDown(0.2)
          break
        case 'p':
          ensureSpace(40)
          doc.fontSize(10).fillColor(PRETO)
            .font(block.italic ? 'Helvetica-Oblique' : 'Helvetica')
          doc.text(block.text, { align: 'justify', lineGap: 3 })
          doc.moveDown(0.4)
          break
        case 'li':
          ensureSpace(25)
          doc.fontSize(10).fillColor(PRETO).font('Helvetica')
          doc.text(`•  ${block.text}`, { indent: 12, align: 'justify', lineGap: 3 })
          doc.moveDown(0.2)
          break
      }
    }

    // ── Assinatura + Carimbo ──────────────────────────────────────────────────
    ensureSpace(140)
    doc.moveDown(1.2)
    hRule(LINHA, 0.5)

    const dataStr = meta.dataFormatada
      || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.fontSize(9).fillColor(CINZA).font('Helvetica')
    doc.text(`São Paulo, ${dataStr}`)
    doc.moveDown(1.2)

    const sigY  = doc.y
    const colW  = CONTENT_W / 3
    const imgW  = colW * 0.82

    if (fs.existsSync(ASSIN_PATH))   doc.image(ASSIN_PATH,    MARGIN_L,            sigY, { width: imgW })
    if (fs.existsSync(CARIMBO_PATH)) doc.image(CARIMBO_PATH,  MARGIN_L + colW * 2, sigY, { width: imgW })

    const textY = sigY + 88
    doc.fontSize(9).fillColor(PRETO).font('Helvetica-Bold')
    doc.text('Pedro Donizetti de Oliveira', MARGIN_L, textY, { width: colW * 1.1, align: 'center' })
    doc.fontSize(8).fillColor(CINZA).font('Helvetica')
    doc.text('Neuropsicólogo e Psicólogo Clínico', MARGIN_L, doc.y, { width: colW * 1.1, align: 'center' })
    doc.text('CRP 82060', MARGIN_L, doc.y, { width: colW * 1.1, align: 'center' })

    // ── Rodapés com total real ────────────────────────────────────────────────
    const total = doc.bufferedPageRange().count
    for (let i = 1; i <= total; i++) drawFooter(i, total)

    doc.end()
  })
}

// =============================================================================
// FUNCTION: prodoctorProxy  (inalterada)
// =============================================================================
const PRODOCTOR_BASE = 'https://open-api.prodoctor.net'

exports.prodoctorProxy = onRequest(
  { region: 'us-central1', timeoutSeconds: 30, invoker: 'public' },
  async (req, res) => {
    setCors(res)
    if (req.method === 'OPTIONS') { res.status(204).send(''); return }

    const decoded = await verifyToken(req)
    if (!decoded) { res.status(401).json({ error: 'Não autorizado' }); return }

    const { path, method = 'GET', body } = req.body || {}
    if (!path) { res.status(400).json({ error: 'path obrigatório' }); return }

    const fetchOpts = {
      method,
      headers: {
        'Content-Type':      'application/json',
        'X-APIKEY':          process.env.PRODOCTOR_KEY  || '',
        'X-APIPASSWORD':     process.env.PRODOCTOR_PASS || '',
        'X-APITIMEZONE':     '-03:00',
        'X-APITIMEZONENAME': 'America/Sao_Paulo',
      },
    }
    if (body && method !== 'GET') fetchOpts.body = JSON.stringify(body)

    try {
      const pdRes = await fetch(`${PRODOCTOR_BASE}${path}`, fetchOpts)
      const data  = await pdRes.json().catch(() => ({}))
      res.status(pdRes.status).json(data)
    } catch (e) {
      console.error('[prodoctorProxy]', e)
      res.status(502).json({ error: e.message })
    }
  }
)

// =============================================================================
// FUNCTION: generateReport  (inalterada — retorna HTML com logo/assinatura)
// =============================================================================
exports.generateReport = onRequest(
  { region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', invoker: 'public' },
  async (req, res) => {
    setCors(res)
    if (req.method === 'OPTIONS') { res.status(204).send(''); return }

    const decoded = await verifyToken(req)
    if (!decoded) { res.status(401).json({ error: 'Não autorizado' }); return }

    const {
      patient, anamnesisData: ad, selectedTests,
      testsData: td, neupsilinZScores, dexScores,
      appliedBy, supervisor, dataFormatada
    } = req.body

    const s   = v => v || 'N/D'
    const arr = v => Array.isArray(v) ? v.join(', ') : (v || 'N/D')
    const lbl = z => {
      if (z == null) return 'N/A'
      if (typeof z === 'string') return z || 'N/A'
      const n = parseFloat(z)
      if (isNaN(n)) return 'N/A'
      return n >= -1.0 ? 'PRESERVADO' : n >= -1.5 ? 'LIMÍTROFE' : 'COMPROMETIDO'
    }

    const anam = ad && Object.keys(ad).length ? `
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
Testes aplicados: ${(selectedTests || []).join(', ')}
Aplicados por: ${appliedBy || 'Profissional responsável'}
Supervisão: ${supervisor?.name || 'Dr. Pedro Donizetti'} | ${supervisor?.crp || 'CRP 06/82060'}

WASI: ${td?.WASI ? `QI=${td.WASI.qit_2 ?? '-'}, Percentil=${td.WASI.qit_percentile ?? '-'}, Classif.=${td.WASI.classification ?? '-'}` : 'Não aplicado'}
WASI-III: ${td?.['WASI-III'] ? `QI=${td['WASI-III'].qit_2 ?? '-'}, Percentil=${td['WASI-III'].qit_percentile ?? '-'}` : 'Não aplicado'}

NEUPSILIN (z-scores):
  Orientação: ${lbl(neupsilinZScores?.orientation)} | Atenção: ${lbl(neupsilinZScores?.attention)}
  Percepção: ${lbl(neupsilinZScores?.perception)} | Memória: ${lbl(neupsilinZScores?.memory)}
  Aritmética: ${lbl(neupsilinZScores?.arithmetic)} | Linguagem: ${lbl(neupsilinZScores?.language)}
  Praxia: ${lbl(neupsilinZScores?.praxis)} | Funções executivas: ${lbl(neupsilinZScores?.executive)}

BAMS: ${td?.BAMS ? `Global=${td.BAMS.global_score}, Percentil=${td.BAMS.percentile}, Classif.=${td.BAMS.interpretation}` : 'Não aplicado'}
RAVLT: ${td?.RAVLT ? `A1=${td.RAVLT.a1}, A5=${td.RAVLT.a5}, A6(interferência)=${td.RAVLT.a6}, A7(tardio)=${td.RAVLT.a7}, Reconhecimento=${td.RAVLT.recognition}` : 'Não aplicado'}
WCST-N: ${td?.['WCST-N'] ? `Categorias=${td['WCST-N'].categories_completed}, Erros perseverativos=${td['WCST-N'].perseverative_errors}` : 'Não aplicado'}
DEX: ${dexScores ? `Paciente=${dexScores.totals?.patient_total}(${dexScores.totals?.patient_mean_class}), Familiar=${dexScores.totals?.family_total}` : 'Não aplicado'}
FAB: ${td?.FAB ? `Escore=${td.FAB.total_score}, Classif.=${td.FAB.classification}` : 'Não aplicado'}
GDS-15: ${td?.['GDS-15'] ? `${td['GDS-15'].total_score} pts — ${td['GDS-15'].classification}` : 'Não aplicado'}
GAI: ${td?.GAI ? `${td.GAI.total_score} pts — ${td.GAI.classification}` : 'Não aplicado'}
BDI-II: ${td?.['BDI-II'] ? `${td['BDI-II'].total_score} pts — ${td['BDI-II'].classification}` : 'Não aplicado'}
HAD: ${td?.HAD ? `Ansiedade=${td.HAD.anxiety_score}(${td.HAD.anxiety_classification}), Depressão=${td.HAD.depression_score}(${td.HAD.depression_classification})` : 'Não aplicado'}
IQCODE: ${td?.IQCODE ? `${td.IQCODE.total_score} — ${td.IQCODE.classification}` : 'Não aplicado'}
B-ADL: ${td?.['B-ADL'] ? `${td['B-ADL'].total_score} — ${td['B-ADL'].classification}` : 'Não aplicado'}
Pfeffer: ${td?.Pfeffer ? `${td.Pfeffer.total_score} — ${td.Pfeffer.classification}` : 'Não aplicado'}
Lawton: ${td?.Lawton ? `${td.Lawton.total_score} — ${td.Lawton.classification}` : 'Não aplicado'}
MEMIMP: ${td?.MEMIMP ? `Prospectivo=${td.MEMIMP.score_prospectivo}, Retrospectivo=${td.MEMIMP.score_retrospectivo}` : 'Não aplicado'}
TRIACOG: ${td?.TRIACOG ? `Total=${td.TRIACOG.total_score}` : 'Não aplicado'}
IDATE: ${td?.IDATE ? `Estado=${td.IDATE.estado}, Traço=${td.IDATE.traco}` : 'Não aplicado'}
TOKEN: ${td?.TOKEN ? `Total=${td.TOKEN.total_score}` : 'Não aplicado'}
PCRS: ${td?.PCRS ? `Paciente=${td.PCRS.auto_total}, Informante=${td.PCRS.informante_total}` : 'Não aplicado'}
`

    const h3 = 'font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px'
    const h4 = 'font-size:13px;font-weight:bold;color:#1a3d2b;margin-top:10px;margin-bottom:6px'
    const p  = 'font-size:13px;margin-bottom:8px;line-height:1.7'

    const prompt = `Você é um neuropsicólogo clínico especialista. Elabore um laudo neuropsicológico completo e individualizado em português brasileiro, com linguagem técnica, precisa e empática.

DADOS DO PACIENTE
Paciente: ${patient?.full_name || 'N/D'}
Idade: ${patient?.age || ad?.idade || 'N/D'} anos
Sexo: ${patient?.sex || ad?.sexo || 'N/D'}
Escolaridade: ${patient?.education || ad?.escolaridade || 'N/D'}
Data da avaliação: ${dataFormatada || new Date().toLocaleDateString('pt-BR')}
Testes aplicados por: ${appliedBy || 'Profissional responsável'}
Supervisão técnica: ${supervisor?.name || 'Dr. Pedro Donizetti'} — ${supervisor?.crp || 'CRP 06/82060'}

ANAMNESE
${anam}

RESULTADOS DOS TESTES
${results}

Gere o laudo em HTML seguindo EXATAMENTE estas 7 seções, nesta ordem:

<div class="mb-6">
<h3 style="${h3}">INFORMAÇÕES GERAIS</h3>
[parágrafo com nome completo, idade, sexo, escolaridade, data da avaliação, profissional que aplicou os testes e supervisão técnica]
</div>

<div class="mb-6">
<h3 style="${h3}">QUEIXAS</h3>
[parágrafo em texto corrido descrevendo as queixas relatadas, o motivo do encaminhamento e contexto clínico relevante]
</div>

<div class="mb-6">
<h3 style="${h3}">PROCEDIMENTO</h3>
[parágrafo descrevendo os instrumentos utilizados, condições e local de aplicação, comportamento do paciente durante a avaliação e demais aspectos procedimentais relevantes — cite os nomes dos testes SOMENTE aqui]
</div>

<div class="mb-6">
<h3 style="${h3}">SÍNTESE NEUROPSICOLÓGICA POR DOMÍNIO</h3>
[Para cada domínio avaliado, gere um subtítulo h4 seguido de parágrafo em texto corrido. Inclua APENAS os domínios com dados disponíveis. Domínios possíveis: Inteligência, Memória, Atenção e Velocidade de Processamento, Funções Executivas, Linguagem, Humor e Estado Afetivo, Ansiedade, Funcionalidade. Integre os resultados objetivos com as queixas e o contexto clínico. Cite pontuações e classificações de forma naturalizada no texto.]
</div>

<div class="mb-6">
<h3 style="${h3}">CONCLUSÃO</h3>
[Prosa contínua em 2–3 parágrafos integrando os achados e o perfil neuropsicológico do paciente. PROIBIDO citar nomes de instrumentos ou testes — descreva os domínios e achados sem mencionar siglas ou nomes de escalas.]
</div>

<div class="mb-6">
<h3 style="${h3}">ENFIM</h3>
<p style="${p}"><em>[Um único parágrafo em itálico com o diagnóstico nosológico fundamentado. O código CID-10 deve aparecer APENAS neste parágrafo e em nenhum outro ponto do laudo.]</em></p>
</div>

<div class="mb-6">
<h3 style="${h3}">ENCAMINHAMENTOS</h3>
[Lista ou parágrafos com encaminhamentos e recomendações clínicas individualizadas: reabilitação, acompanhamentos, intervenções, orientações familiares conforme o caso]
</div>

Estilos obrigatórios:
- h3 de seção: style="${h3}"
- h4 de domínio: style="${h4}"
- Parágrafos: <p style="${p}">
- Listas: <ul style="margin-left:20px;margin-bottom:8px"><li style="${p}">
- NÃO inclua html/body/head/style
- NÃO mencione "inteligência artificial" ou "IA" em nenhum momento
- Laudo rigoroso, técnico e completamente individualizado para este paciente`

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada nas Cloud Functions')
      const anthropic = new Anthropic({ apiKey })
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const body = msg.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')

      const cabecalho = LOGO_SRC
        ? `<div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1A3D2B">
<img src="${LOGO_SRC}" alt="Neuroavaliação" style="max-width:220px;height:auto;display:block;margin:0 auto 8px auto" />
</div>`
        : `<div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1A3D2B">
<p style="font-size:18px;font-weight:bold;color:#1A3D2B;margin:0">NEUROAVALIAÇÃO ME</p>
</div>`

      const assinatura = `<div style="margin-top:40px;padding-top:16px;border-top:2px solid #1A3D2B;display:flex;align-items:flex-end;gap:24px">
${ASSIN_SRC   ? `<img src="${ASSIN_SRC}"   alt="Assinatura" style="max-width:160px;height:auto" />` : ''}
${CARIMBO_SRC ? `<img src="${CARIMBO_SRC}" alt="Carimbo"    style="max-width:120px;height:auto" />` : ''}
<div>
<p style="font-size:13px;margin-bottom:2px;line-height:1.5">Pedro Donizetti de Oliveira</p>
<p style="font-size:13px;margin-bottom:2px;line-height:1.5">Neuropsicólogo — CRP 06/82.060</p>
<p style="font-size:13px;margin-bottom:2px;line-height:1.5">NEUROAVALIAÇÃO ME</p>
</div>
</div>`

      const html = cabecalho + body + assinatura
      res.status(200).json({ html })
    } catch (e) {
      console.error('[generateReport]', e)
      res.status(500).json({ error: e.message })
    }
  }
)

// =============================================================================
// FUNCTION: generateReportPDF  ← NOVA
// Recebe o HTML já gerado (output de generateReport) e devolve PDF em base64.
// Chame APÓS ter o HTML — sem gastar crédito extra de IA.
//
// Body: { html, patient, dataFormatada, supervisor }
// Retorna: { pdfBase64 }
// =============================================================================
exports.generateReportPDF = onRequest(
  { region: 'us-central1', timeoutSeconds: 60, memory: '512MiB', invoker: 'public' },
  async (req, res) => {
    setCors(res)
    if (req.method === 'OPTIONS') { res.status(204).send(''); return }

    const decoded = await verifyToken(req)
    if (!decoded) { res.status(401).json({ error: 'Não autorizado' }); return }

    const { html, patient, dataFormatada, supervisor } = req.body
    if (!html) { res.status(400).json({ error: 'Campo "html" é obrigatório.' }); return }

    try {
      const pdfBuffer = await buildPDF(html, patient, { dataFormatada, supervisor })
      res.status(200).json({ pdfBase64: pdfBuffer.toString('base64') })
    } catch (e) {
      console.error('[generateReportPDF]', e)
      res.status(500).json({ error: e.message })
    }
  }
)
