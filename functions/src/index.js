const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const Anthropic = require('@anthropic-ai/sdk')
const path = require('path')
const fs = require('fs')

admin.initializeApp()

const textosLaudo = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'textos_laudo.json'), 'utf8')
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function verifyToken(req) {
  const header = req.headers.authorization || req.headers.Authorization
  if (!header?.startsWith('Bearer ')) return null
  try { return await admin.auth().verifyIdToken(header.slice(7)) }
  catch { return null }
}

// ─── prodoctorProxy ───────────────────────────────────────────────────────────
const PRODOCTOR_BASE = 'https://open-api.prodoctor.net'

exports.prodoctorProxy = onRequest(
  { region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') { res.set(CORS).status(204).send(''); return }

    const decoded = await verifyToken(req)
    if (!decoded) { res.set(CORS).status(401).json({ error: 'Não autorizado' }); return }

    const { path, method = 'GET', body: rawBody = null } = req.body || {}
    if (!path) { res.set(CORS).status(400).json({ error: 'path obrigatório' }); return }

    const apiKey  = process.env.PRODOCTOR_APIKEY
    const apiPass = process.env.PRODOCTOR_APIPASSWORD

    if (!apiKey || !apiPass) {
      res.set(CORS).status(500).json({ error: 'Credenciais ProDoctor não configuradas no servidor' })
      return
    }

    const body = rawBody
    console.log('[prodoctorProxy] request:', method, path, JSON.stringify(body))
    try {
      const pdRes = await fetch(`${PRODOCTOR_BASE}${path}`, {
        method,
        headers: {
          'Content-Type':      'application/json',
          'X-APIKEY':          apiKey,
          'X-APIPASSWORD':     apiPass,
          'X-APITIMEZONE':     '-03:00',
          'X-APITIMEZONENAME': 'America/Sao_Paulo',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })

      const data = await pdRes.json().catch(() => ({}))
      const lista = data?.payload?.pacientes ?? data?.pacientes ?? data ?? []
      const total = data?.payload?.totalRegistros ?? data?.payload?.total ?? (Array.isArray(lista) ? lista.length : '?')
      const primeiro = Array.isArray(lista) ? lista[0] : lista
      console.log('[prodoctorProxy] status:', pdRes.status, 'total:', total, 'payloadKeys:', Object.keys(data?.payload ?? {}), 'primeiro:', JSON.stringify(primeiro))
      res.set(CORS).status(pdRes.status).json(data)
    } catch (e) {
      console.error('[prodoctorProxy] error:', e.message)
      res.set(CORS).status(500).json({ error: e.message })
    }
  }
)

// ─── generateReport ───────────────────────────────────────────────────────────
exports.generateReport = onRequest(
  { region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') { res.set(CORS).status(204).send(''); return }

    const decoded = await verifyToken(req)
    if (!decoded) { res.set(CORS).status(401).json({ error: 'Não autorizado' }); return }

    const {
      patient, anamnesisData: ad, selectedTests,
      testsData: td, neupsilinZScores, dexScores,
      appliedBy, supervisor, dataFormatada
    } = req.body

    const getTexto = (dominio, classificacao) =>
      textosLaudo?.[dominio]?.[classificacao] || null

    const s   = v => v || 'N/D'
    const arr = v => Array.isArray(v) ? v.join(', ') : (v || 'N/D')
    const lbl = z => {
      if (z == null) return 'N/A'
      const n = parseFloat(z)
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
`

    const prompt = `Você é um neuropsicólogo clínico especialista. Elabore um laudo neuropsicológico completo e individualizado em português brasileiro, com linguagem técnica, precisa e empática.

IDENTIFICAÇÃO
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

TEXTOS CLÍNICOS VALIDADOS
Os textos abaixo foram extraídos do protocolo clínico validado. Utilize-os OBRIGATORIAMENTE na seção CONCLUSÃO, sem alterar o conteúdo clínico. Conecte os parágrafos com fluidez, mas preserve o texto de cada domínio integralmente:

${[
  getTexto('orientacao', neupsilinZScores?.orientation >= -1.0 ? 'PRESERVADA' : 'COMPROMETIDA'),
  getTexto('atencao', (() => {
    const z = neupsilinZScores?.attention
    if (z == null) return null
    return z >= -1.0 ? 'PRESERVADA' : z >= -1.5 ? 'INFERIOR' : 'MUITO_INFERIOR'
  })()),
  getTexto('memoria_operacional', neupsilinZScores?.memory >= -1.0 ? 'PRESERVADA' : 'COMPROMETIDA'),
  getTexto('memoria_longo_prazo', (() => {
    if (!td?.RAVLT) return null
    const a7 = parseFloat(td.RAVLT.a7)
    if (isNaN(a7)) return null
    return a7 >= 1.0 ? 'SUPERIOR' : a7 >= 0.5 ? 'MEDIA_SUPERIOR' : a7 >= -0.5 ? 'MEDIA' : a7 >= -1.5 ? 'MEDIA_INFERIOR' : 'COMPROMETIDA'
  })()),
  getTexto('funcoes_executivas', (() => {
    const z = neupsilinZScores?.executive
    if (z == null) return null
    return z >= -1.0 ? 'PRESERVADA' : z >= -1.5 ? 'LIMITROFE' : 'COMPROMETIDA'
  })()),
  getTexto('linguagem', neupsilinZScores?.language >= -1.0 ? 'PRESERVADA' : 'COMPROMETIDA'),
  getTexto('praxias', neupsilinZScores?.praxis >= -1.0 ? 'PRESERVADA' : 'COMPROMETIDA'),
].filter(Boolean).map((t, i) => `${i + 1}. ${t}`).join('\n\n')}

Regras:
- Parágrafos: <p style="font-size:13px;margin-bottom:8px;line-height:1.7">
- Listas: <ul style="margin-left:20px;margin-bottom:8px"><li style="font-size:13px;margin-bottom:4px">
- Destaques: <span style="font-weight:bold">
- NÃO inclua html/body/head
- NÃO mencione "inteligência artificial" ou "IA" em nenhum momento
- Laudo rigoroso, técnico e completamente individualizado para este paciente
- Na seção CONCLUSÃO, use OBRIGATORIAMENTE os textos clínicos validados acima, preservando cada parágrafo integralmente e apenas conectando-os com fluidez`

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const html = msg.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')

      res.set(CORS).status(200).json({ html })
    } catch (e) {
      console.error('[generateReport]', e)
      res.set(CORS).status(500).json({ error: e.message })
    }
  }
)
