// deploy: 2026-05-12 07:45:06
const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const Anthropic = require('@anthropic-ai/sdk')

admin.initializeApp()

console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY)

function setCors(res) {
  res.set('Access-Control-Allow-Origin',  '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

const PRODOCTOR_BASE = 'https://open-api.prodoctor.net'

async function verifyToken(req) {
  const header = req.headers.authorization || req.headers.Authorization
  if (!header?.startsWith('Bearer ')) return null
  try { return await admin.auth().verifyIdToken(header.slice(7)) }
  catch { return null }
}

// â”€â”€â”€ prodoctorProxy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.prodoctorProxy = onRequest(
  { region: 'us-central1', timeoutSeconds: 30, invoker: 'public' },
  async (req, res) => {
    setCors(res)
    if (req.method === 'OPTIONS') { res.status(204).send(''); return }

    const decoded = await verifyToken(req)
    if (!decoded) { res.status(401).json({ error: 'NÃ£o autorizado' }); return }

    const { path, method = 'GET', body } = req.body || {}
    if (!path) { res.status(400).json({ error: 'path obrigatÃ³rio' }); return }

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
    if (body && method !== 'GET') {
      fetchOpts.body = JSON.stringify(body)
    }

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

// â”€â”€â”€ generateReport â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.generateReport = onRequest(
  { region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', invoker: 'public' },
  async (req, res) => {
    setCors(res)
    if (req.method === 'OPTIONS') { res.status(204).send(''); return }

    const decoded = await verifyToken(req)
    if (!decoded) { res.status(401).json({ error: 'NÃ£o autorizado' }); return }

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
      return n >= -1.0 ? 'PRESERVADO' : n >= -1.5 ? 'LIMÃTROFE' : 'COMPROMETIDO'
    }

    const anam = ad && Object.keys(ad).length ? `
Objetivo: ${s(ad.objetivo_avaliacao || ad.motivo_encaminhamento)}
Queixas: ${s(ad.queixas)}
Queixas cognitivas/emocionais: ${s(ad.queixas_cognitivas_emocionais)}
InÃ­cio dos sintomas: ${s(ad.inicio_sintomas_data)} | Desenvolvimento: ${s(ad.desenvolvimento_sintomas)}
Medicamentos: ${s(ad.medicamentos)} | DoenÃ§as: ${arr(ad.doencas_preexistentes)}
Escolaridade: ${s(ad.escolaridade)} | ProfissÃ£o: ${s(ad.profissao)}
Sono: ${s(ad.sono_como_e)} | Apetite: ${s(ad.apetite_como_e)}
Atividade fÃ­sica: ${s(ad.atividade_fisica)} | Lazer: ${s(ad.lazer)}
HistÃ³ria familiar (memÃ³ria): ${s(ad.historico_familiar_memoria)}
` : 'Sem dados de anamnese disponÃ­veis.'

    const results = `
Testes aplicados: ${(selectedTests || []).join(', ')}
Aplicados por: ${appliedBy || 'Profissional responsÃ¡vel'}
SupervisÃ£o: ${supervisor?.name || 'Dr. Pedro Donizetti'} | ${supervisor?.crp || 'CRP 06/82060'}

WASI: ${td?.WASI ? `QI=${td.WASI.qit_2 ?? '-'}, Percentil=${td.WASI.qit_percentile ?? '-'}, Classif.=${td.WASI.classification ?? '-'}` : 'NÃ£o aplicado'}
WASI-III: ${td?.['WASI-III'] ? `QI=${td['WASI-III'].qit_2 ?? '-'}, Percentil=${td['WASI-III'].qit_percentile ?? '-'}` : 'NÃ£o aplicado'}

NEUPSILIN (z-scores):
  OrientaÃ§Ã£o: ${lbl(neupsilinZScores?.orientation)} | AtenÃ§Ã£o: ${lbl(neupsilinZScores?.attention)}
  PercepÃ§Ã£o: ${lbl(neupsilinZScores?.perception)} | MemÃ³ria: ${lbl(neupsilinZScores?.memory)}
  AritmÃ©tica: ${lbl(neupsilinZScores?.arithmetic)} | Linguagem: ${lbl(neupsilinZScores?.language)}
  Praxia: ${lbl(neupsilinZScores?.praxis)} | FunÃ§Ãµes executivas: ${lbl(neupsilinZScores?.executive)}

BAMS: ${td?.BAMS ? `Global=${td.BAMS.global_score}, Percentil=${td.BAMS.percentile}, Classif.=${td.BAMS.interpretation}` : 'NÃ£o aplicado'}
RAVLT: ${td?.RAVLT ? `A1=${td.RAVLT.a1}, A5=${td.RAVLT.a5}, A6(interferÃªncia)=${td.RAVLT.a6}, A7(tardio)=${td.RAVLT.a7}, Reconhecimento=${td.RAVLT.recognition}` : 'NÃ£o aplicado'}
WCST-N: ${td?.['WCST-N'] ? `Categorias=${td['WCST-N'].categories_completed}, Erros perseverativos=${td['WCST-N'].perseverative_errors}` : 'NÃ£o aplicado'}
DEX: ${dexScores ? `Paciente=${dexScores.totals?.patient_total}(${dexScores.totals?.patient_mean_class}), Familiar=${dexScores.totals?.family_total}` : 'NÃ£o aplicado'}
FAB: ${td?.FAB ? `Escore=${td.FAB.total_score}, Classif.=${td.FAB.classification}` : 'NÃ£o aplicado'}
GDS-15: ${td?.['GDS-15'] ? `${td['GDS-15'].total_score} pts â€” ${td['GDS-15'].classification}` : 'NÃ£o aplicado'}
GAI: ${td?.GAI ? `${td.GAI.total_score} pts â€” ${td.GAI.classification}` : 'NÃ£o aplicado'}
BDI-II: ${td?.['BDI-II'] ? `${td['BDI-II'].total_score} pts â€” ${td['BDI-II'].classification}` : 'NÃ£o aplicado'}
HAD: ${td?.HAD ? `Ansiedade=${td.HAD.anxiety_score}(${td.HAD.anxiety_classification}), DepressÃ£o=${td.HAD.depression_score}(${td.HAD.depression_classification})` : 'NÃ£o aplicado'}
IQCODE: ${td?.IQCODE ? `${td.IQCODE.total_score} â€” ${td.IQCODE.classification}` : 'NÃ£o aplicado'}
B-ADL: ${td?.['B-ADL'] ? `${td['B-ADL'].total_score} â€” ${td['B-ADL'].classification}` : 'NÃ£o aplicado'}
Pfeffer: ${td?.Pfeffer ? `${td.Pfeffer.total_score} â€” ${td.Pfeffer.classification}` : 'NÃ£o aplicado'}
Lawton: ${td?.Lawton ? `${td.Lawton.total_score} â€” ${td.Lawton.classification}` : 'NÃ£o aplicado'}
`

    const prompt = `VocÃª Ã© um neuropsicÃ³logo clÃ­nico especialista. Elabore um laudo neuropsicolÃ³gico completo e individualizado em portuguÃªs brasileiro, com linguagem tÃ©cnica, precisa e empÃ¡tica.

IDENTIFICAÃ‡ÃƒO
Paciente: ${patient?.full_name || 'N/D'}
Idade: ${patient?.age || ad?.idade || 'N/D'} anos
Sexo: ${patient?.sex || ad?.sexo || 'N/D'}
Escolaridade: ${patient?.education || ad?.escolaridade || 'N/D'}
Data da avaliaÃ§Ã£o: ${dataFormatada || new Date().toLocaleDateString('pt-BR')}
Testes aplicados por: ${appliedBy || 'Profissional responsÃ¡vel'}
SupervisÃ£o tÃ©cnica: ${supervisor?.name || 'Dr. Pedro Donizetti'} â€” ${supervisor?.crp || 'CRP 06/82060'}

ANAMNESE
${anam}

RESULTADOS DOS TESTES
${results}

Elabore o laudo completo em HTML com as seguintes seÃ§Ãµes:

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">ANÃLISE NEUROPSICOLÃ“GICA</h3>
[anÃ¡lise detalhada de cada domÃ­nio cognitivo avaliado, relacionando resultados objetivos com as queixas clÃ­nicas]
</div>

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">SÃNTESE DIAGNÃ“STICA</h3>
[integraÃ§Ã£o dos achados, identificaÃ§Ã£o do padrÃ£o neuropsicolÃ³gico]
</div>

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">CONCLUSÃƒO</h3>
[perfil neuropsicolÃ³gico completo e hipÃ³tese diagnÃ³stica fundamentada]
</div>

<div class="mb-6">
<h3 style="font-size:14px;font-weight:bold;color:#1a3d2b;border-bottom:2px solid #1A3D2B;padding-bottom:6px;margin-bottom:12px">RECOMENDAÃ‡Ã•ES</h3>
[recomendaÃ§Ãµes clÃ­nicas e terapÃªuticas individualizadas]
</div>

Regras:
- ParÃ¡grafos: <p style="font-size:13px;margin-bottom:8px;line-height:1.7">
- Listas: <ul style="margin-left:20px;margin-bottom:8px"><li style="font-size:13px;margin-bottom:4px">
- Destaques: <span style="font-weight:bold">
- NÃƒO inclua html/body/head
- NÃƒO mencione "inteligÃªncia artificial" ou "IA" em nenhum momento
- Laudo rigoroso, tÃ©cnico e completamente individualizado para este paciente`

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const html = msg.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')

      res.status(200).json({ html })
    } catch (e) {
      console.error('[generateReport]', e)
      res.status(500).json({ error: e.message })
    }
  }
) 

 
