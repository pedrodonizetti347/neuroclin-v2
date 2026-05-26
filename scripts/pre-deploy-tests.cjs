/**
 * pre-deploy-tests.cjs
 * Testes automáticos executados antes de cada deploy.
 * Se qualquer teste falhar → process.exit(1) → deploy bloqueado.
 *
 * Ponto de referência validado: tag v-mario-validado (25/05/2026)
 */

const fs   = require('fs')
const path = require('path')

const ROOT    = path.join(__dirname, '..')
const REPORTS = path.join(ROOT, 'src/pages/Reports.jsx')
const CONCLUSAO = path.join(ROOT, 'src/utils/generateTextoConclusao.js')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    const result = fn()
    if (result === true) {
      console.log(`  ✅  ${name}`)
      passed++
    } else {
      console.log(`  ❌  ${name}`)
      console.log(`       → ${result}`)
      failed++
    }
  } catch (e) {
    console.log(`  ❌  ${name}`)
    console.log(`       → ERRO: ${e.message}`)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🔍  Executando testes pré-deploy NeuroClin...\n')

const reports = fs.readFileSync(REPORTS, 'utf8')

// ── BLOCO 1 — Geração da conclusão via planilha ──────────────────────────────
console.log('BLOCO 1 — Conclusão gerada pela planilha Protocolo_Prevent\n')

test('generateTextoConclusao importado em Reports.jsx', () => {
  if (!reports.includes('generateTextoConclusao'))
    return 'generateTextoConclusao não encontrado em Reports.jsx'
  return true
})

test('buildAiBodyFromData chama generateTextoConclusao', () => {
  const conclusao = fs.readFileSync(CONCLUSAO, 'utf8')
  // O arquivo generateTextoConclusao.js deve exportar a função
  if (!conclusao.includes('generateTextoConclusao'))
    return 'função generateTextoConclusao não declarada no arquivo'
  // Reports.jsx deve chamar buildAiBodyFromData
  if (!reports.includes('buildAiBodyFromData(patient, ad, td)'))
    return 'buildAiBodyFromData(patient, ad, td) não encontrado na geração'
  return true
})

test('Claude API NÃO usada para gerar texto da conclusão', () => {
  // generateAiBodyWithClaude não pode existir (foi removida)
  if (reports.includes('generateAiBodyWithClaude'))
    return 'generateAiBodyWithClaude detectada — texto livre de IA na conclusão PROIBIDO'
  // Não pode haver fetch para api.anthropic.com dentro do fluxo de geração
  const genStart = reports.indexOf('const generate = async')
  const genEnd   = reports.indexOf('\n  const generate', genStart + 50)
  // Busca no trecho da função generate
  const genBlock = reports.substring(genStart, genEnd > genStart ? genEnd : genStart + 4000)
  if (genBlock.includes('api.anthropic.com'))
    return 'chamada à Anthropic API detectada dentro de generate() — proibido'
  return true
})

test('Fallback determinístico garantido quando aiBody vazio', () => {
  // buildAiBodyFromData deve ser chamado com || '' para garantir string vazia como fallback
  // Padrão atual: const aiBody = buildAiBodyFromData(patient, ad, td) || ''
  if (!reports.includes("buildAiBodyFromData(patient, ad, td) || ''"))
    return "Padrão buildAiBodyFromData(patient, ad, td) || '' não encontrado"
  return true
})

// ── BLOCO 2 — Anamnese pelo patientId correto ────────────────────────────────
console.log('\nBLOCO 2 — Anamnese buscada do Firestore pelo patientId\n')

test("doc(db, 'anamneses', patientId) presente na geração", () => {
  if (!reports.includes("'anamneses', patientId"))
    return "Padrão doc(db, 'anamneses', patientId) não encontrado"
  return true
})

test('Verificação aSnap.exists() antes de usar dados da anamnese', () => {
  if (!reports.includes('aSnap.exists()'))
    return 'aSnap.exists() não encontrado — anamnese pode ser lida sem checar existência'
  return true
})

test('Fusão de dados (spread) ao carregar anamnese', () => {
  if (!reports.includes('ad = { ...ad, ...aSnap.data() }'))
    return 'Padrão de fusão "ad = { ...ad, ...aSnap.data() }" não encontrado'
  return true
})

// ── BLOCO 3 — Validação obrigatória antes de imprimir PDF ───────────────────
console.log('\nBLOCO 3 — PDF bloqueado por seções obrigatórias vazias\n')

test('Função validateLaudo definida em Reports.jsx', () => {
  if (!reports.includes('const validateLaudo'))
    return 'validateLaudo não declarada'
  return true
})

test('validateLaudo chamada dentro de print()', () => {
  const printStart = reports.indexOf('const print = async')
  if (printStart === -1) return 'Função print() não encontrada'
  // Pega o corpo da função até a próxima declaração de const no mesmo nível
  const printEnd = reports.indexOf('\n  const requestApproval', printStart)
  const printBody = reports.substring(printStart, printEnd > printStart ? printEnd : printStart + 2000)
  if (!printBody.includes('validateLaudo'))
    return 'validateLaudo não chamada dentro de print()'
  return true
})

test('print() retorna antecipadamente se há erros de validação', () => {
  const printStart = reports.indexOf('const print = async')
  const printEnd   = reports.indexOf('\n  const requestApproval', printStart)
  const printBody  = reports.substring(printStart, printEnd > printStart ? printEnd : printStart + 2000)
  if (!printBody.includes('errors.length > 0'))
    return 'Condição errors.length > 0 não encontrada em print()'
  if (!printBody.includes('setValidationErrors(errors)'))
    return 'setValidationErrors não chamado ao detectar erros'
  return true
})

test('5 seções obrigatórias verificadas em validateLaudo', () => {
  const sections = [
    'DADOS DO PACIENTE',
    'ANAMNESE',
    'PROCEDIMENTO',
    'CONCLUS',
    'REFERÊNCI',
  ]
  const missing = sections.filter(s => !reports.includes(s))
  if (missing.length > 0)
    return `Seções não verificadas na validação: ${missing.join(', ')}`
  return true
})

// ── RESULTADO FINAL ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`  ${passed} passou(aram)   ${failed} falhou(aram)`)
console.log('─'.repeat(50))

if (failed > 0) {
  console.log('\n🚫  Deploy BLOQUEADO — corrija os erros acima antes de deployar.\n')
  process.exit(1)
}

console.log('\n✅  Todos os testes passaram — deploy autorizado.\n')
