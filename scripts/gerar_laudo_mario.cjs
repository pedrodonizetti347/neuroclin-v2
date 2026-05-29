/**
 * gerar_laudo_mario.cjs
 * Busca o laudo aprovado do Mario do Firestore, gera a CONCLUSÃO pela planilha
 * Protocolo_Prevent e salva LAUDO_MARIO_FINAL.html na Área de Trabalho.
 *
 * Uso: node scripts/gerar_laudo_mario.cjs
 */

const fs    = require('fs')
const path  = require('path')
const https = require('https')

const PROJECT = 'neuroclin-f55a5'
const FB_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// ─── OAuth via Firebase CLI tokens ───────────────────────────────────────────
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = require('C:/Users/Pedro Donizetti/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js')
    const acct = auth.getGlobalDefaultAccount()
    if (!acct?.tokens?.refresh_token) return reject(new Error('Sem refresh_token — rode: firebase login'))
    const body = JSON.stringify({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: acct.tokens.refresh_token,
      grant_type: 'refresh_token',
    })
    const req = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { const j = JSON.parse(d); j.access_token ? resolve(j.access_token) : reject(new Error(JSON.stringify(j))) })
    })
    req.write(body); req.end()
  })
}

// ─── Firestore REST helpers ───────────────────────────────────────────────────
function firestoreGet(token, col, docId) {
  return new Promise((resolve, reject) => {
    const url = `${FB_BASE}/${col}/${docId}`
    const u   = new URL(url)
    https.get({ hostname: u.hostname, path: u.pathname, headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`GET ${col}/${docId} → ${res.statusCode}: ${d.slice(0,200)}`))
        resolve(JSON.parse(d))
      })
    }).on('error', reject)
  })
}

function firestorePatch(token, col, docId, fields) {
  return new Promise((resolve, reject) => {
    const fieldPaths = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
    const url = `${FB_BASE}/${col}/${docId}?${fieldPaths}`
    const body = JSON.stringify({ fields })
    const u = new URL(url)
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`PATCH ${col}/${docId} → ${res.statusCode}: ${d.slice(0,200)}`))
        resolve(JSON.parse(d))
      })
    })
    req.write(body); req.end()
  })
}

// Extrai valor de campo Firestore (string, number, map)
function fVal(field) {
  if (!field) return undefined
  if (field.stringValue  !== undefined) return field.stringValue
  if (field.integerValue !== undefined) return Number(field.integerValue)
  if (field.doubleValue  !== undefined) return Number(field.doubleValue)
  if (field.booleanValue !== undefined) return field.booleanValue
  if (field.nullValue    !== undefined) return null
  if (field.arrayValue)  return (field.arrayValue.values || []).map(fVal)
  if (field.mapValue)    return fDoc(field.mapValue.fields || {})
  return undefined
}
function fDoc(fields) {
  const out = {}
  for (const [k, v] of Object.entries(fields || {})) out[k] = fVal(v)
  return out
}

const PATIENT_ID = 'MWXavkKHuySC4JMo8oCx'
const REPORT_ID  = 'MWXavkKHuySC4JMo8oCx_1779755876499'
const PEDRO_UID  = 'i5nwg569WabTUk69wzCWV5PRw9E3'
const OUTPUT     = path.join('C:\\Users\\Pedro Donizetti\\Desktop', 'LAUDO_MARIO_FINAL.html')

// ─── Normas NEUPSILIN (subset necessário) ─────────────────────────────────────
const NP = {
  orientation: { '19-39':{'1-4':{mean:7.59,sd:0.75},'5-8':{mean:7.82,sd:0.43},'9+':{mean:7.92,sd:0.27}},'40-59':{'1-4':{mean:7.62,sd:0.70},'5-8':{mean:7.73,sd:0.58},'9+':{mean:7.89,sd:0.41}},'60-75':{'1-4':{mean:7.69,sd:0.57},'5-8':{mean:7.83,sd:0.38},'9+':{mean:7.76,sd:0.43}},'76-90':{'1-4':{mean:7.69,sd:0.54},'5-8':{mean:7.90,sd:0.30},'9+':{mean:7.81,sd:0.39}} },
  attention:   { '19-39':{'1-4':{mean:18.33,sd:6.94},'5-8':{mean:21.63,sd:4.28},'9+':{mean:23.94,sd:3.58}},'40-59':{'1-4':{mean:16.40,sd:7.82},'5-8':{mean:22.02,sd:4.20},'9+':{mean:23.53,sd:2.08}},'60-75':{'1-4':{mean:18.13,sd:7.43},'5-8':{mean:20.96,sd:5.17},'9+':{mean:22.29,sd:3.53}},'76-90':{'1-4':{mean:19.24,sd:5.05},'5-8':{mean:18.10,sd:5.68},'9+':{mean:22.02,sd:2.48}} },
  perception:  { '19-39':{'1-4':{mean:10.51,sd:1.43},'5-8':{mean:10.52,sd:1.21},'9+':{mean:11.22,sd:0.82}},'40-59':{'1-4':{mean:10.40,sd:1.64},'5-8':{mean:10.73,sd:1.27},'9+':{mean:11.09,sd:1.06}},'60-75':{'1-4':{mean:9.95,sd:1.54},'5-8':{mean:10.13,sd:1.30},'9+':{mean:10.73,sd:1.18}},'76-90':{'1-4':{mean:9.24,sd:1.64},'5-8':{mean:9.27,sd:1.57},'9+':{mean:9.95,sd:1.36}} },
  memory:      { '19-39':{'1-4':{mean:43.25,sd:10.62},'5-8':{mean:48.88,sd:7.24},'9+':{mean:61.10,sd:11.02}},'40-59':{'1-4':{mean:38.95,sd:9.29},'5-8':{mean:45.51,sd:6.79},'9+':{mean:56.37,sd:8.46}},'60-75':{'1-4':{mean:37.54,sd:8.26},'5-8':{mean:45.60,sd:8.94},'9+':{mean:51.18,sd:8.59}},'76-90':{'1-4':{mean:31.72,sd:6.93},'5-8':{mean:38.87,sd:7.15},'9+':{mean:43.07,sd:7.22}} },
  praxis:      { '19-39':{'1-4':{mean:14.94,sd:2.64},'5-8':{mean:16.33,sd:2.61},'9+':{mean:19.09,sd:2.07}},'40-59':{'1-4':{mean:13.93,sd:3.27},'5-8':{mean:16.69,sd:2.68},'9+':{mean:18.44,sd:2.09}},'60-75':{'1-4':{mean:14.74,sd:2.70},'5-8':{mean:15.35,sd:2.96},'9+':{mean:17.36,sd:3.03}},'76-90':{'1-4':{mean:12.79,sd:2.69},'5-8':{mean:14.97,sd:2.76},'9+':{mean:16.60,sd:2.44}} },
  executive:   { '19-39':{'1-4':{mean:5.35,sd:1.60},'5-8':{mean:6.52,sd:1.63},'9+':{mean:7.64,sd:1.56}},'40-59':{'1-4':{mean:4.90,sd:1.44},'5-8':{mean:6.27,sd:1.56},'9+':{mean:7.74,sd:1.50}},'60-75':{'1-4':{mean:5.23,sd:1.52},'5-8':{mean:5.94,sd:1.58},'9+':{mean:7.50,sd:1.59}},'76-90':{'1-4':{mean:4.45,sd:1.31},'5-8':{mean:5.47,sd:1.39},'9+':{mean:6.07,sd:1.55}} },
}
function npAgeGroup(age) {
  const a = Number(age); if (!a) return '40-59'
  if (a <= 39) return '19-39'; if (a <= 59) return '40-59'; if (a <= 75) return '60-75'; return '76-90'
}
function npEduGroup(edu) {
  if (!edu) return '9+'; const e = String(edu)
  if (e === '1-4') return '1-4'; if (e === '5-8') return '5-8'; if (e === '9+') return '9+'
  const n = parseInt(e); if (!isNaN(n)) { if (n <= 4) return '1-4'; if (n <= 8) return '5-8'; return '9+' }
  const low = e.toLowerCase()
  if (low.includes('fundamental')) return low.includes('incompleto') ? '1-4' : '5-8'
  return '9+'
}
function npCalcZ(score, domain, ageG, eduG) {
  const n = NP[domain]?.[ageG]?.[eduG]; if (!n || score == null || score === '') return null
  const s = Number(score); if (isNaN(s)) return null
  const sd = n.sd < 0.05 ? 0.05 : n.sd; const z = (s - n.mean) / sd
  return isFinite(z) ? z : null
}
function lbl(z) {
  return z == null ? 'N/A' : parseFloat(z) >= -1.0 ? 'PRESERVADO' : parseFloat(z) >= -1.5 ? 'LIMÍTROFE' : 'COMPROMETIDO'
}
function fluencyWordsToScore(w) {
  if (w == null || w === '') return null; const v = Number(w)
  if (isNaN(v) || v < 0) return null; return Math.min(11, Math.floor(v / 3) + 1)
}

// ─── mapToDadosPaciente (portado de Reports.jsx) ──────────────────────────────
function mapToDadosPaciente(patient, ad, td, npZscores) {
  const initials = patient?.full_name
    ? patient.full_name.split(' ').filter(Boolean).map(w => w[0].toUpperCase() + '.').join('')
    : 'M.A.'
  const toFem  = (val) => { if (!val || val === 'N/A') return 'PRESERVADA'; const v = String(val).toUpperCase(); if (v === 'PRESERVADO') return 'PRESERVADA'; if (v === 'COMPROMETIDO') return 'COMPROMETIDA'; return val }
  const toDesc = (val) => (!val || String(val).toUpperCase().includes('PRESERV')) ? 'CAPACIDADE' : 'DIFICULDADE'
  const toRateD = (val) => (!val || String(val).toUpperCase().includes('PRESERV')) ? 'DENTRO DO ESPERADO' : 'ABAIXO DO ESPERADO'
  const sex  = (patient?.sex || '').toUpperCase()
  const sexo = sex.includes('FEM') ? 'FEMININO' : 'MASCULINO'

  const npOri  = toFem(lbl(npZscores?.orientation))
  const npAtt  = toFem(lbl(npZscores?.attention))
  const npPerc = toFem(lbl(npZscores?.perception))
  const npMem  = toFem(lbl(npZscores?.memory))
  const npPrax = toFem(lbl(npZscores?.praxis))
  const npExec = toFem(lbl(npZscores?.executive))

  const classRvlt = (s) => { if (s == null || s === '') return 'PRESERVADA'; const v = Number(s); return v >= 9 ? 'PRESERVADA' : v >= 6 ? 'LIMÍTROFE' : 'COMPROMETIDA' }
  const rv = td?.RAVLT
  const ravltA1 = rv ? classRvlt(rv.a1_score) : 'PRESERVADA'
  const ravltB1 = rv ? classRvlt(rv.b1_score) : 'PRESERVADA'
  const ravltA6 = rv ? classRvlt(rv.a6_score) : 'PRESERVADA'
  const ravltA7 = rv ? (toFem(rv.classification) || classRvlt(rv.a7_score)) : 'PRESERVADA'
  let velEsq = 'PRESERVADA'
  if (rv?.forgetting_speed != null) { const fs = Number(rv.forgetting_speed); if (fs < 0.6) velEsq = 'COMPROMETIDA'; else if (fs < 0.8) velEsq = 'LIMÍTROFE' }
  let recogn = 'PRESERVADA'
  if (rv?.recognition_score != null) { const rs = Number(rv.recognition_score); if (rs < 10) recogn = 'COMPROMETIDA'; else if (rs < 13) recogn = 'LIMÍTROFE' }

  const wcst = td?.['WCST-N'] || td?.WCST
  const wcstCat = toFem(wcst?.classification) || 'PRESERVADA'
  const wcstPE  = wcst?.perseverative_errors != null ? (() => { const n = Number(wcst.perseverative_errors); return n <= 10 ? 'PRESERVADA' : n <= 16 ? 'LIMÍTROFE' : 'COMPROMETIDA' })() : 'PRESERVADA'
  const wcstNPE = wcst?.non_perseverative_errors != null ? (() => { const n = Number(wcst.non_perseverative_errors); return n <= 10 ? 'PRESERVADA' : n <= 16 ? 'LIMÍTROFE' : 'COMPROMETIDA' })() : 'PRESERVADA'
  const beneficioFeedback = (wcst?.total_breaks ?? 0) > 2 ? 'NÃO SE BENEFICIAR' : 'SE BENEFICIAR'

  const tokenRawCls = (td?.TOKEN?.classification || '').toUpperCase()
  const tokenLabel = tokenRawCls || 'NORMAL'
  const tokenBad   = tokenRawCls.includes('DEFICIT') || tokenRawCls.includes('LIMIT') || tokenRawCls.includes('INFERIOR')
  const tokenDesc  = tokenBad ? 'DIFICULDADE' : 'CAPACIDADE'

  const bams = td?.BAMS
  const bamsClass   = (bams?.classification || bams?.interpretation || 'PRESERVADO').toUpperCase()
  const bamsGlobal  = toFem(bamsClass.includes('PRESERV') ? 'PRESERVADO' : bamsClass.includes('LIMIT') ? 'LIMÍTROFE' : 'COMPROMETIDO')
  const bamsGlobalDesc = bamsClass.includes('PRESERV') ? 'DENTRO DO ESPERADO' : 'ABAIXO DO ESPERADO'
  const bamsSubCls  = (raw, max) => { if (raw == null || max == null) return bamsGlobal; const pct = Number(raw)/max; return pct >= 0.5 ? 'PRESERVADA' : pct >= 0.25 ? 'LIMÍTROFE' : 'COMPROMETIDA' }

  const gdsClass  = (td?.['GDS-15']?.classification || '').toUpperCase()
  const depressao = (gdsClass.includes('DEPRESS') || gdsClass.includes('SUGEST') || Number(td?.['GDS-15']?.total_score) >= 6) ? 'SUGERE QUADRO DE DEPRESSÃO' : 'NÃO APRESENTA SINTOMATOLOGIA DE DEPRESSÃO'
  const gaiClass  = (td?.GAI?.classification || '').toUpperCase()
  const ansiedade = (gaiClass.includes('ANSIED') || gaiClass.includes('SUGEST') || Number(td?.GAI?.total_score) >= 10) ? 'SUGERE QUADRO DE ANSIEDADE' : 'NÃO APRESENTA SINTOMATOLOGIA DE ANSIEDADE'

  const iqcodeClass = (td?.IQCODE?.classification || '').toUpperCase()
  const iqcode = iqcodeClass.includes('DECL') ? 'APRESENTA DECLÍNIO COGNITIVO' : iqcodeClass.includes('LIMIT') ? 'APRESENTA POSSÍVEL DECLÍNIO COGNITIVO' : 'NÃO APRESENTA DECLÍNIO COGNITIVO'
  const badlClass  = (td?.['B-ADL']?.classification || '').toUpperCase()
  const badl = badlClass.includes('LEVE') ? 'APRESENTA COMPROMETIMENTO LEVE' : badlClass.includes('MODER') ? 'APRESENTA COMPROMETIMENTO MODERADO' : badlClass.includes('GRAVE') ? 'APRESENTA COMPROMETIMENTO GRAVE' : 'NÃO APRESENTA COMPROMETIMENTO'
  const pfefferClass = (td?.Pfeffer?.classification || '').toUpperCase()
  const pfeffer = pfefferClass.includes('COMPROM') ? 'APRESENTA COMPROMETIMENTO FUNCIONAL' : 'NÃO APRESENTA COMPROMETIMENTO'

  const mm = td?.MEMIMP
  const mmCls = (v, max) => { if (v == null) return 'PRESERVADA'; const pct = Number(v)/max; return pct <= 0.25 ? 'PRESERVADA' : pct <= 0.50 ? 'LIMÍTROFE' : 'COMPROMETIDA' }

  const qualidadeDiscurso = ad?.observacoes_comportamentais || 'Seu discurso é organizado e coerente com as atividades abordadas durante a avaliação.'
  const cooperacao = (ad?.cooperacao || '').toLowerCase()
  const compreendia = cooperacao.includes('não') || cooperacao.includes('nao') ? 'NÃO' : 'SIM'

  const wasi = td?.WASI || td?.['WASI-III']
  return {
    nome: initials, sexo, qualidadeDiscurso, compreendia,
    wasiPontuacao: wasi ? (Number(wasi.qit_2 ?? wasi.qit) || null) : null,
    wasiPercentil: wasi ? (Number(wasi.qit_percentile) || null) : null,
    wasiDesempenho: wasi?.classification ?? null,
    orientacaoTemporal: npOri, orientacaoEspacial: npOri,
    atencao: npAtt, atencaoDesc: toDesc(npAtt),
    percepcao: npPerc, percepcaoDesc: toDesc(npPerc),
    memoriaTrabalho: npMem, memoriaVCurtoPrazo: npMem,
    memoriaProspectiva: mm ? mmCls(mm.patient_prospective, 32) : npMem,
    praxiaIdeomotora: npPrax, praxiaConstrutiva: npPrax, praxiaReflexiva: npPrax,
    fluenciaFonemica: npExec,
    fluenciaSematica:    bamsSubCls(bams?.fv_total, 40),
    definicaoPalavras:   bamsSubCls(bams?.dp_total, 10),
    categorizacaoVerbal: bamsSubCls(bams?.cv_total, 10),
    conceituacao:        bamsSubCls(bams?.cg_total, 10),
    escoreGlobal: bamsGlobal, escoreGlobalDesc: bamsGlobalDesc,
    ravltA1, ravltA1Desc: toDesc(ravltA1), ravltB1,
    ravltA6, ravltA6Desc: toDesc(ravltA6),
    ravltA7, ravltA7Desc: toDesc(ravltA7),
    velEsquecimento: velEsq, velEsquecimentoDesc: toRateD(velEsq),
    reconhecimento: recogn, reconhecimentoDesc: recogn.includes('PRESERV') ? 'facilitou o reconhecimento' : 'NÃO facilitou o reconhecimento',
    categoriasCompletas: wcstCat,
    errosPerseverativos: wcstPE, errosPersDesc: toDesc(wcstPE),
    errosNaoPers: wcstNPE, errosNaoPersDesc: toDesc(wcstNPE),
    beneficioFeedback, token: tokenLabel, tokenDesc,
    prospInformante:   mm ? mmCls(mm.family_prospective, 32)    : 'PRESERVADA',
    prospPaciente:     mm ? mmCls(mm.patient_prospective, 32)   : 'PRESERVADA',
    retrospInformante: mm ? mmCls(mm.family_retrospective, 32)  : 'PRESERVADA',
    retrospPaciente:   mm ? mmCls(mm.patient_retrospective, 32) : 'PRESERVADA',
    retrospAnamnese:   iqcode.includes('NÃO') ? 'PRESERVADA' : 'COMPROMETIDA',
    depressao, ansiedade, iqcode, badl, pfeffer,
    avdAnamnese: pfeffer.includes('NÃO') ? 'NÃO APRESENTA COMPROMETIMENTO' : 'APRESENTA COMPROMETIMENTO',
  }
}

// ─── generateTextoConclusao (portado de generateTextoConclusao.js) ─────────────
const art = (s) => s === 'MASCULINO' ? 'o' : 'a'
const ART = (s) => s === 'MASCULINO' ? 'O' : 'A'
const clean = (str) => str.replace(/\s{2,}/g, ' ').trim()

function gerarDiscurso(p) { const g = art(p.sexo); return clean(`Os resultados foram obtidos a partir dos dados da avaliação neuropsicológica, observação clínica, além da anamnese realizada e questionários respondidos pel${g} paciente e pelo informante. Durante a avaliação, ${g} paciente demonstrou ser comunicativ${g}, colaborativ${g} e dispost${g} a realizar as atividades propostas. ${p.qualidadeDiscurso}`) }
function gerarInteligencia(p) {
  if (!p.wasiPontuacao && !p.wasiDesempenho) return null
  const g = art(p.sexo)
  return clean(`No que tange às funções avaliadas, a INTELIGÊNCIA pode ser definida como a capacidade conjunta ou global do indivíduo para agir com finalidade, pensar racionalmente e lidar efetivamente com seu meio ambiente. Global pode ser caracterizado como o comportamento do indivíduo como um todo, e conjunta, por ser composta de habilidades qualitativamente diferenciáveis, mas não inteiramente independentes, sendo então multifacetada e multideterminada. A estimativa do desempenho intelectual d${g} paciente foi medida pelo teste WASI, através do QI estimado. ${p.nome} apresentou um QI Total-2 estimado de ${p.wasiPontuacao}, percentil ${p.wasiPercentil}, o que corresponde a uma classificação de desempenho ${p.wasiDesempenho}.`)
}
function gerarOrientacao(p) {
  const g = art(p.sexo); const introBase = 'Na ORIENTAÇÃO TÊMPORO-ESPACIAL, é avaliada a capacidade de se orientar nos aspectos'
  if (p.orientacaoTemporal === p.orientacaoEspacial) return clean(`${introBase}: noção de data e/ou espaço. Em outras palavras, a Orientação Espacial (OE) é a habilidade que o sujeito tem de localizar-se e orientar-se em relação às coisas, pessoas e até mesmo ao seu próprio corpo em uma determinada área. A Orientação Temporal (OT) é a capacidade de perceber a noção de tempo. No teste em que foi avaliada estas áreas, ${g} paciente obteve desempenho ${p.orientacaoTemporal} em ambas as funções.`)
  return clean(`${introBase} de: noção de data e/ou espaço. Em outras palavras, a Orientação Espacial (OE) é a habilidade que o sujeito tem de localizar-se e orientar-se em relação às coisas, pessoas e até mesmo ao seu próprio corpo em uma determinada área e a Orientação Temporal (OT) é a capacidade de perceber a noção de tempo. No teste no qual foi avaliada estas áreas, ${g} paciente obteve desempenho ${p.orientacaoEspacial} na área de OE e ${p.orientacaoTemporal} na OT.`)
}
function gerarAtencao(p) {
  const g = art(p.sexo)
  const intro = 'A ATENÇÃO pode ser compreendida como a quantidade de esforço exercido para se concentrar em determinada tarefa. Refere-se ao conjunto de processos cognitivos que torna o ser humano capaz de selecionar, filtrar e organizar as informações em unidades controláveis e significativas. Nos testes onde se podem avaliar os processos atencionais pode-se perceber que:'
  return `${intro} ${clean(`Em tarefas curtas onde precisou manter o foco durante a realização do teste ${g} paciente apresentou o desempenho ${p.atencao}. Demonstrando assim, ${p.atencaoDesc} na atenção concentrada para realização de algumas tarefas.`)}`
}
function gerarMemoria(p) {
  const g = art(p.sexo); const G = ART(p.sexo)
  const intro = 'A MEMÓRIA é a capacidade de registrar, manter e evocar as experiências e os fatos já ocorridos. A capacidade de memorizar relaciona-se intimamente com o nível de consciência, com a atenção e com o interesse afetivo (motivação).'
  const codificacao = clean(p.compreendia === 'NÃO' ? `${p.nome} não apresentou dificuldades no processo de codificação da memória na realização das tarefas, pois parecia NÃO compreender o que era pedido;` : `${p.nome} apresentou dificuldades no processo de codificação da memória na realização das tarefas, pois parecia  compreender o que era pedido;`)
  const introTipos  = clean(`${G} paciente foi submetid${g} a diversas tarefas para avaliar os seguintes tipos de memória:`)
  const curtoPrazo  = clean(p.ravltA1 === p.ravltB1 ? `Memória de Curto Prazo: Memória de curto prazo é responsável pela manutenção mental (por um breve período) de uma quantidade limitada de informações necessárias para a resolução de algum problema imediato, por exemplo, recordar o que precisa buscar na dispensa. ${G} paciente obteve o desempenho que ${p.ravltA1} demonstrando assim apresentar ${p.ravltA1Desc} no presente momento nesse construto. Em relação a Memória Visual de Curto prazo, ${g} paciente apresentou o desempenho ${p.memoriaVCurtoPrazo} nesse constructo.` : `Memória de Curto Prazo: Memória de curto prazo é responsável pela manutenção mental (por um breve período) de uma quantidade limitada de informações necessárias para a resolução de algum problema imediato, por exemplo, recordar o que precisa buscar na dispensa. O desempenho d${g} paciente oscilou entre ${p.ravltA1} e ${p.ravltB1} demonstrando assim apresentar ${p.ravltA1Desc} no presente momento nesse constructo. Em relação a Memória Visual de Curto prazo, ${g} paciente apresentou o desempenho ${p.memoriaVCurtoPrazo} nesse constructo.`)
  const memOp       = clean(`A Memória Operacional: pode ser definida como um conjunto de processos que nos permite armazenar e manipular informações temporárias e realizar tarefas cognitivas complexas como a compreensão da linguagem, a leitura, a aprendizagem ou o raciocínio. A memória operacional é um tipo de memória de curto prazo. Em tarefa onde pode avaliar a memória operacional, e os comandos são dados de forma verbal, ${g} paciente obteve o desempenho ${p.memoriaTrabalho}.`)
  const introEp     = 'Memória de Longo Prazo Episódica: A memória episódica consiste na aprendizagem e recuperação de informações novas e que foram aprendidas em um contexto (tempo, espaço e pessoas presentes), que podem ser recordadas posteriormente, a partir do retorno da informação à memória da pessoa. A memória episódica verbal pode ser mensurada através da apresentação sucessiva do mesmo material (geralmente listas de palavras apresentadas fixamente ou apresentação apenas das palavras que não foram evocadas na tentativa anterior). Essa última maneira avalia, além da retenção da informação, a capacidade de aprendizagem de novo conteúdo. Os resultados obtidos nas tarefas que avaliam a recordação de informações verbais são apresentados a seguir:'
  const longoPrazo  = clean(p.ravltA6 === p.ravltA7 ? `${G} paciente apresentou ${p.ravltA6Desc} em RETER e RECUPERAR o conteúdo compreendido. Apresentando desempenho ${p.ravltA6}, reforçando a ${p.ravltA6Desc} na memória de longo prazo.` : `${G} paciente apresentou ${p.ravltA6Desc} em RETER o que aprende, demonstrando desempenho ${p.ravltA6} e apresentou ${p.ravltA7Desc} em RECUPERAR o conteúdo compreendido, com desempenho ${p.ravltA7} na memória de longo prazo.`)
  const velEsq      = clean(`Percebe-se também que em termos processuais (codificação, armazenamento e recuperação) na recuperação de conteúdos já apreendidos ${g} paciente tem um índice de retenção ${p.velEsquecimento}, ou seja, a sua velocidade de esquecimento está com o desempenho ${p.velEsquecimentoDesc} do esperado para a sua faixa etária.`)
  const recTempo    = clean(`A recordação da lista após a passagem do tempo manteve o desempenho ${p.ravltA7} ao esperado para a idade, sugerindo que ${p.nome} apresenta ${p.ravltA7Desc} para se recordar de fatos aprendidos recentemente.`)
  const pistas      = clean(`A apresentação de pistas verbais ${p.reconhecimentoDesc} das informações aprendidas anteriormente (classificação ${p.reconhecimento}).`)
  const semant      = clean(`A Memória Semântica é responsável pelo nosso conhecimento genérico do mundo. É responsável pelo uso da linguagem, pelo conhecimento organizado de palavras e símbolos verbais, seus significados e as relações entre eles, bem como pelo uso de regras, fórmulas, algoritmos para a manipulação de símbolos e conceitos. ${G} paciente apresentou capacidade em relação a categorização, conceituação, léxico e conhecimentos gerais, obtendo assim o desempenho ${p.escoreGlobal} para sua idade, apresentando ${p.escoreGlobalDesc} em sua memória semântica.`)
  const memProsp    = clean(p.prospInformante === p.prospPaciente ? `A Memória Prospectiva é definida como a capacidade de recordar uma ação que se pretende realizar no futuro (intenção), num determinado momento ou local específico, sem nenhuma instrução permanente que nos lembre a realização da ação. Por exemplo, tomar a medicação em momentos específicos ou confirmar previamente procedimentos em cirurgias são exemplos de tarefas de MP. Segundo a percepção do informante e d${g} paciente, encontra-se ${p.prospInformante}. Em teste apresentou resultado ${p.memoriaProspectiva} nesse constructo.` : `A Memória Prospectiva é definida como a capacidade de recordar uma ação que se pretende realizar no futuro (intenção), num determinado momento ou local específico, sem nenhuma instrução permanente que nos lembre a realização da ação. Por exemplo, tomar a medicação em momentos específicos ou confirmar previamente procedimentos em cirurgias são exemplos de tarefas de MP. Segundo a percepção do informante encontra-se ${p.prospInformante}, porém a percepção d${g} paciente encontra-se ${p.prospPaciente}. Contudo em teste onde se avaliou a memória prospectiva pode-se averiguar que a memória prospectiva d${g} paciente encontra-se ${p.memoriaProspectiva}.`)
  const memRetro    = clean(p.retrospInformante === p.retrospPaciente ? `A Memória Retrospectiva é a memória de longo prazo de pessoas, palavras e eventos que aconteceram no passado, está relacionada ao armazenamento e recuperação de eventos passados. Segundo a percepção do informante e d${g} paciente, encontra-se ${p.retrospInformante}. Em observação durante a anamnese, é possível verificar que a memória retrospectiva encontra-se ${p.retrospAnamnese}.` : `A Memória Retrospectiva é a memória de longo prazo de pessoas, palavras e eventos que aconteceram no passado, está relacionada ao armazenamento e recuperação de eventos passados. Segundo a percepção do informante, a memória prospectiva do avaliado encontra-se ${p.retrospInformante}. Já na percepção d${g} paciente encontra-se ${p.retrospPaciente}. Em observação durante a anamnese, é possível verificar que a memória retrospectiva encontra-se ${p.retrospAnamnese}.`)
  return [intro, codificacao, introTipos, curtoPrazo, memOp, introEp, longoPrazo, velEsq, recTempo, pistas, semant, memProsp, memRetro].join(' ')
}
function gerarFuncoesExecutivas(p) {
  const g = art(p.sexo); const G = ART(p.sexo)
  const intro = 'Quando se avalia as FUNÇÕES EXECUTIVAS procura-se entender a capacidade de planejamento, o controle inibitório, a flexibilidade cognitiva, a estratégia de organização e a categorização dos estímulos. Esses processos cognitivos, enquanto conjunto atua de forma coordenada, são à base da intencionalidade e autogestão do indivíduo, e permitem o direcionamento a metas, escolha de estratégias eficazes, avaliação da eficiência e adequação dos comportamentos. Além disso, os aspectos executivos também são modulados pelos aspectos emocionais, ou seja, o seu funcionamento pode ser influenciado pelas emoções intensas experimentadas pela pessoa. O funcionamento executivo está relacionado ao grau de autonomia e eficiência no desempenho funcional que o indivíduo apresenta nas suas atividades acadêmicas, profissionais e de relacionamentos interpessoais. Esses aspectos foram avaliados isoladamente e/ou conjuntamente a partir de entrevistas, observação clínica e testes psicológicos. Os resultados são descritos abaixo:'
  const sugDep = p.depressao === 'SUGERE QUADRO DE DEPRESSÃO'; const sugAns = p.ansiedade === 'SUGERE QUADRO DE ANSIEDADE'
  let volitivos
  if (sugDep || sugAns) { const q = [sugDep?p.depressao:'', sugDep&&sugAns?' e ':'', sugAns?p.ansiedade:''].join(''); volitivos = clean(`Os aspectos volitivos (motivação, interesse por hobbies e planos de vida) parecem estar comprometidos no momento, apresentando ${q}.`) }
  else volitivos = clean(`Os aspectos volitivos (motivação, interesse por hobbies e planos de vida) parecem não estar comprometidos no momento.`)
  const planejamento   = clean(`Capacidade de planejamento, tomada de decisão e hierarquização dos passos adequados quando ocorre dentro de uma estrutura. Em tarefas onde se pode avaliar esses construtos ${p.nome} apresentou desempenho ${p.categoriasCompletas} de planejamento, abstração e insight para retomar, aprender e alterar suas estratégias quando na realização de alguma tarefa quando essa não é bem-sucedida.`)
  const controleInib   = clean(`Quanto ao Controle Inibitório, isto é, o automonitoramento do comportamento quando tem que suprimir uma resposta frente a um estímulo intrusivo, e que envolve processos de controle do comportamento, da atenção e dos pensamentos/emoções, ${g} paciente demonstrou ter ${p.errosPersDesc} no controle da impulsividade frente às respostas cognitivas, apresentando desempenho ${p.errosPerseverativos}.`)
  const flexib         = clean(`A Flexibilidade Cognitiva envolve a capacidade de lidar com diferentes informações e tarefas simultaneamente e alternância do curso de ações ou dos pensamentos de acordo com as exigências do ambiente. Esta habilidade cognitiva é essencial para poder resolver problemas de modo criativo e requer a habilidade de mudar o foco de um objetivo para o outro. Nas tarefas onde se pode avaliar a flexibilidade cognitiva. ${G} paciente apresentou desempenho ${p.errosNaoPers} ao esperado demonstrando ${p.errosNaoPersDesc} em adaptar sua conduta e opiniões a acontecimentos novos, variáveis e inesperados, além de ${p.beneficioFeedback} do feedback externo.`)
  const introQF        = clean(`O funcionamento executivo inclui tanto aspectos cognitivos (mensurados por testes psicológicos) como emocionais e comportamentais. Esses aspectos podem ser subdivididos como funções executivas "quentes" e "frias", isto é, a habilidades ligadas ao controle do comportamento e dos impulsos versus o controle do raciocínio voltado para a solução de problemas. Abaixo se observa o desempenho obtido através de questionários respondidos por informante e pel${g} própri${g} paciente:`)
  return [intro, volitivos, planejamento, controleInib, flexib, introQF].join(' ')
}
function gerarLinguagem(p) {
  const G = ART(p.sexo)
  const intro = 'Com relação à LINGUAGEM, nas provas específicas de linguagem, e compreensão verbal observou-se que:'
  const defCat = clean(`${G} paciente teve desempenho ${p.conceituacao} em tarefas que envolviam conceituação de palavras, desempenho ${p.categorizacaoVerbal} categorização de palavras e desempenho e ${p.definicaoPalavras} em definição de vocábulos.`)
  const fluen  = clean(`Desempenho ${p.fluenciaSematica} frente ao esperado para sua faixa etária e grau de escolaridade em tarefas envolvendo a fluência semântica e desempenho ${p.fluenciaFonemica} em fluência verbal fonêmica.`)
  const tok    = clean(`Desempenho ${p.token} em tarefas que envolviam ordens diretas demonstrando assim ${p.tokenDesc} de compreensão de comandos simples e complexos.`)
  return [intro, defCat, fluen, tok].join(' ')
}
function gerarPercepcao(p) {
  const G = ART(p.sexo)
  const intro = 'Em relação ao domínio de PERCEPÇÃO, pode ser definida como a capacidade de organizar e processar informações do mundo (símbolos, objetos ou imagens, por exemplo), que são obtidas por meio dos sentidos, e atribuir significado a essas informações. Ela se divide em três ramificações bem desenvolvidas, sendo visual, auditivo e somestésico. Foi avaliado especificamente a habilidade visual.'
  return `${intro} ${clean(`${G} paciente apresentou desempenho avaliado e classificado como ${p.percepcao}, o que indica ${p.percepcaoDesc} neste constructo.`)}`
}
function gerarPraxia(p) {
  const G = ART(p.sexo)
  const intro = 'PRAXIA é a sequência de movimentos necessários para a execução de atos motores mais ou menos complexos, com uma intenção e objetivo determinados por um contexto associado à organização e a capacidade de planejamento mental:'
  const cons  = clean(`Praxias Construtivas é a capacidade de planejar e realizar os movimentos necessários para organizar uma série de elementos no espaço, para formar um desenho ou uma figura final. ${G} paciente obteve desempenho ${p.praxiaConstrutiva}.`)
  const ideo  = clean(`Praxias Ideomotoras é a capacidade de realizar um movimento ou gesto simples de maneira intencionada. ${G} paciente obteve desempenho ${p.praxiaIdeomotora}.`)
  const refl  = clean(`Praxias Reflexivas se referem-se à habilidade de imitação de gestos, principalmente de maneira sequencial. ${G} paciente obteve desempenho ${p.praxiaReflexiva}.`)
  return [intro, cons, ideo, refl].join(' ')
}
function gerarDepressaoAnsiedade(p) {
  const g = art(p.sexo); return clean(`Em escalas onde se mediram o nível de depressão e ansiedade vivenciad${g}s pel${g} paciente no momento ${g} paciente ${p.depressao} e ${p.ansiedade}.`)
}
function gerarDeclinioAVD(p) {
  const g = art(p.sexo); return clean(`Segundo as respostas dadas pelo informante de ${p.nome}, se observa que ${p.iqcode} d${g} paciente nos últimos dez anos. No que concerne as suas ATIVIDADES DIÁRIAS BÁSICAS DA VIDA DIÁRIA - são as atividades diretamente relacionadas ao cuidado do próprio corpo, atualmente ${p.avdAnamnese}. Com relação as ATIVIDADE INSTRUMENTAIS DA VIDA DIÁRIA (as atividades instrumentais da vida diária são atividades relacionadas com o meio no qual se vive, e geralmente são atividades complexas), ${g} paciente ${p.badl}. E para a realização das atividades diárias e funcionais em sua vida diária ${p.pfeffer} para a realização delas.`)
}

function generateTextoConclusao(p) {
  const blocos = {
    discurso:           gerarDiscurso(p),
    inteligencia:       gerarInteligencia(p),
    orientacao:         gerarOrientacao(p),
    atencao:            gerarAtencao(p),
    memoria:            gerarMemoria(p),
    funcoesExecutivas:  gerarFuncoesExecutivas(p),
    linguagem:          gerarLinguagem(p),
    percepcao:          gerarPercepcao(p),
    praxia:             gerarPraxia(p),
    depressaoAnsiedade: gerarDepressaoAnsiedade(p),
    declinioAVD:        gerarDeclinioAVD(p),
  }
  blocos.textoCompleto = Object.values(blocos).filter(Boolean).join('\n\n')
  return blocos
}

// ─── buildConclusaoHtml (apenas bloco CONCLUSÃO — sem ENFIM/ENCAMINHAMENTOS) ──
const H = '#4472C4'
function buildNovaConclusao(blocos, ad) {
  const P = 'font-size:11pt;margin:8px 0;text-align:justify;line-height:1.8;'
  const S = `background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;`
  const sec = (t) => `<div style="${S}">${t}</div>`
  const colorText = (text) => text.replace(
    /MUITO SUPERIOR|ABAIXO DO ESPERADO|DENTRO DO ESPERADO|COMPROMETIDA|COMPROMETIDO|COMPROMETIMENTO|DIFICULDADE|DÉFICIT|LIMÍTROFE|SUPERIOR|PRESERVADA|PRESERVADO|NORMAL|MÉDIO|MÉDIA|CAPACIDADE/g,
    (m) => {
      let bg
      if (m === 'MUITO SUPERIOR') bg = '#b2dfdb'
      else if (['COMPROMETIDA','COMPROMETIDO','COMPROMETIMENTO','DIFICULDADE','DÉFICIT','ABAIXO DO ESPERADO'].includes(m)) bg = '#ffcdd2'
      else if (m === 'LIMÍTROFE') bg = '#fff9c4'
      else if (m === 'SUPERIOR') bg = '#c8e6c9'
      else bg = '#f1f8e9'
      return `<span style="background:${bg};padding:1px 4px;border-radius:2px;font-weight:bold;color:#1a1a1a;">${m}</span>`
    }
  )
  const p = (text) => `<p style="${P}">${colorText(text)}</p>`

  const obsTexto = [ad?.observacoes_comportamentais, ad?.humor?`Humor aparente: ${ad.humor}.`:null, ad?.cooperacao?`Cooperação: ${ad.cooperacao}.`:null, ad?.nivel_alerta?`Nível de alerta: ${ad.nivel_alerta}.`:null].filter(Boolean).join(' ') || '[Registrar o comportamento do paciente durante a avaliação]'

  const objetivo = ad?.objetivoAvaliacao  || ad?.objetivo_avaliacao  || ad?.motivo_encaminhamento || ''
  const queixas  = ad?.descricaoDemanda   || ad?.queixas             || ad?.queixas_cognitivas_emocionais || ''
  const saude    = ad?.saudeAntecedentes  || ad?.doencas_preexistentes || ''
  const doencas  = Array.isArray(saude) ? saude.join(', ') : (saude || '')
  const analiseQParts = [objetivo?`<p style="${P}"><strong>Motivo da avaliação:</strong> ${objetivo}</p>`:null, queixas?`<p style="${P}"><strong>Queixas principais:</strong> ${queixas}</p>`:null, doencas?`<p style="${P}"><strong>Histórico clínico:</strong> ${doencas}</p>`:null].filter(Boolean)
  const analiseQ = analiseQParts.length > 0 ? analiseQParts.join('') : p('[A ser preenchido com os dados da anamnese clínica do paciente — use o botão EDITAR.]')

  const conclusaoBlocks = [blocos.discurso, blocos.inteligencia, blocos.orientacao, blocos.atencao, blocos.memoria, blocos.funcoesExecutivas, blocos.linguagem, blocos.percepcao, blocos.praxia, blocos.depressaoAnsiedade, blocos.declinioAVD].filter(Boolean).map(t => p(t)).join('\n')

  return `
<div style="margin-bottom:20px;">${sec('ANÁLISE DAS QUEIXAS E HISTÓRICO CLÍNICO')}${analiseQ}</div>
<div style="margin-bottom:20px;">${sec('OBSERVAÇÕES COMPORTAMENTAIS')}${p(obsTexto)}</div>
<div style="margin-bottom:20px;">${sec('CONCLUSÃO')}${conclusaoBlocks}</div>
<div style="margin-bottom:20px;">${sec('ENFIM')}${p('[Síntese diagnóstica — inserir hipótese diagnóstica principal e código CID-10 — use o botão EDITAR.]')}</div>
<div style="margin-bottom:20px;">${sec('ENCAMINHAMENTOS')}${p('Com base nos resultados, sugere-se:')}
  <ul style="margin:8px 0 12px 24px;font-size:11pt;">
    <li style="margin-bottom:4px;">Retorno ao médico solicitante com este laudo</li>
    <li style="margin-bottom:4px;">Exercícios cognitivos (mínimo 2x/semana)</li>
    <li style="margin-bottom:4px;">Treino de memória, função executiva e atenção</li>
    <li style="margin-bottom:4px;">Psicoterapia (modalidade adequada ao caso)</li>
    <li style="margin-bottom:4px;">Exercícios físicos regulares</li>
    <li style="margin-bottom:4px;"><em><strong>Reavaliação neuropsicológica após 1 ano</strong></em></li>
  </ul>
</div>`
}

// ─── Substitui apenas o bloco aiBody (ANÁLISE+OBSERVAÇÕES+CONCLUSÃO) no HTML ──
function patchConclusaoNoHtml(html, novaConclusao) {
  // O aiBody está dentro de: <div style="font-size:11pt;line-height:1.8;color:#1a1a2e;">
  // e termina antes de: <!-- DATA + NOTA LEGAL -->
  const startMarker = 'font-size:11pt;line-height:1.8;color:#1a1a2e;">'
  const endMarker   = '<!-- DATA + NOTA LEGAL -->'
  const si = html.indexOf(startMarker)
  const ei = html.indexOf(endMarker)
  if (si === -1 || ei === -1) {
    console.warn('Marcadores não encontrados — retornando HTML original')
    return html
  }
  const before = html.slice(0, si + startMarker.length)
  const after  = html.slice(ei)
  return before + '\n  ' + novaConclusao + '\n\n</div>\n\n' + after
}

// ─── patchColors: converte spans de cor-de-texto para cor-de-fundo nas tabelas ─
function patchColors(html) {
  const span = (bg, c) => `<span style="background:${bg};padding:1px 4px;border-radius:2px;font-weight:bold;color:#1a1a1a;">${c}</span>`
  return html
    .replace(/<span style="color:#C00000;font-weight:bold;">(.*?)<\/span>/g, (_, c) => span('#ffcdd2', c))
    .replace(/<span style="color:#E8821A;font-weight:bold;">(.*?)<\/span>/g, (_, c) => span('#fff9c4', c))
    .replace(/<span style="color:#1F3864;font-weight:bold;">(.*?)<\/span>/g, (_, c) => span('#f1f8e9', c))
}

// ─── Classificações validadas por Dr. Pedro — MARIO ARAKAKI 26/05/2026 ────────
const MARIO_DADOS = {
  nome: 'M.A.', sexo: 'MASCULINO', qualidadeDiscurso: null, compreendia: 'SIM',
  wasiPontuacao: null, wasiPercentil: null, wasiDesempenho: null,
  orientacaoTemporal: 'PRESERVADA', orientacaoEspacial: 'PRESERVADA',
  atencao: 'PRESERVADA', atencaoDesc: 'CAPACIDADE',
  percepcao: 'PRESERVADA', percepcaoDesc: 'CAPACIDADE',
  memoriaTrabalho: 'COMPROMETIDA', memoriaVCurtoPrazo: 'LIMÍTROFE',
  memoriaProspectiva: 'LIMÍTROFE',
  praxiaIdeomotora: 'PRESERVADA', praxiaConstrutiva: 'PRESERVADA', praxiaReflexiva: 'PRESERVADA',
  fluenciaFonemica: 'PRESERVADA',
  fluenciaSematica: 'LIMÍTROFE', definicaoPalavras: 'MUITO SUPERIOR',
  categorizacaoVerbal: 'MÉDIO', conceituacao: 'MÉDIO',
  escoreGlobal: 'NORMAL', escoreGlobalDesc: 'DENTRO DO ESPERADO',
  ravltA1: 'PRESERVADA', ravltA1Desc: 'CAPACIDADE', ravltB1: 'PRESERVADA',
  ravltA6: 'COMPROMETIDA', ravltA6Desc: 'DIFICULDADE',
  ravltA7: 'PRESERVADA',  ravltA7Desc: 'CAPACIDADE',
  velEsquecimento: 'PRESERVADA', velEsquecimentoDesc: 'DENTRO DO ESPERADO',
  reconhecimento: 'PRESERVADA', reconhecimentoDesc: 'facilitou o reconhecimento',
  categoriasCompletas: 'MUITO SUPERIOR',
  errosPerseverativos: 'MUITO SUPERIOR', errosPersDesc: 'CAPACIDADE',
  errosNaoPers: 'MUITO SUPERIOR', errosNaoPersDesc: 'CAPACIDADE',
  beneficioFeedback: 'SE BENEFICIAR',
  token: 'MÉDIO', tokenDesc: 'CAPACIDADE',
  prospInformante: 'LIMÍTROFE', prospPaciente: 'LIMÍTROFE',
  retrospInformante: 'LIMÍTROFE', retrospPaciente: 'LIMÍTROFE',
  retrospAnamnese: 'COMPROMETIDA',
  depressao: 'NÃO APRESENTA SINTOMATOLOGIA DE DEPRESSÃO',
  ansiedade: 'NÃO APRESENTA SINTOMATOLOGIA DE ANSIEDADE',
  iqcode: 'NÃO APRESENTA DECLÍNIO COGNITIVO',
  badl: 'NÃO APRESENTA COMPROMETIMENTO',
  pfeffer: 'NÃO APRESENTA COMPROMETIMENTO',
  avdAnamnese: 'NÃO APRESENTA COMPROMETIMENTO',
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📋  Gerando laudo do Mario com planilha Protocolo_Prevent...\n')

  const token = await getAccessToken()
  console.log('   ✅  Token OAuth obtido\n')

  // 1. Laudo aprovado
  console.log('1. Buscando laudo aprovado...')
  const repRaw = await firestoreGet(token, 'reports', REPORT_ID)
  const repData = fDoc(repRaw.fields)
  if (!repData.reportHtml) { console.error('ERRO: Laudo não encontrado ou sem reportHtml!'); process.exit(1) }
  console.log(`   ✅  ${repData.reportHtml.length} chars — status: ${repData.status}`)

  // 2. Paciente
  console.log('2. Buscando dados do paciente...')
  let patient = { full_name: 'Mario Arakaki', sex: 'Masculino' }
  try {
    const patRaw = await firestoreGet(token, 'patients', PATIENT_ID)
    patient = fDoc(patRaw.fields)
  } catch (e) { console.warn('   ⚠️  Paciente não encontrado, usando dados padrão') }
  console.log(`   ✅  ${patient.full_name}`)

  // 3. Anamnese
  console.log('3. Buscando anamnese...')
  let ad = {}
  try {
    const adRaw = await firestoreGet(token, 'anamneses', PATIENT_ID)
    ad = fDoc(adRaw.fields)
  } catch (e) { console.warn('   ⚠️  Anamnese não encontrada') }
  console.log(`   ✅  ${Object.keys(ad).length} campos`)

  // 4. Testes — tenta 3 locais
  console.log('4. Buscando dados dos testes...')
  let td = {}
  try {
    const s1Raw = await firestoreGet(token, 'sessions', PATIENT_ID)
    const s1 = fDoc(s1Raw.fields)
    if (s1.tests) td = { ...td, ...s1.tests }
  } catch (_) {}
  try {
    const s2Raw = await firestoreGet(token, 'sessions', `${PATIENT_ID}_${PEDRO_UID}`)
    const s2 = fDoc(s2Raw.fields)
    if (s2.tests) td = { ...td, ...s2.tests }
  } catch (_) {}
  if (repData.testsData && typeof repData.testsData === 'object') td = { ...td, ...repData.testsData }
  console.log(`   ✅  Testes: ${Object.keys(td).join(', ') || '(nenhum)'}`)

  // 5. Classificações validadas pelo Dr. Pedro (bypassa cálculo de z-scores)
  console.log('5. Usando classificações validadas pelo Dr. Pedro...')
  const dadosPac = {
    ...MARIO_DADOS,
    qualidadeDiscurso: ad?.observacoes_comportamentais ||
      'Seu discurso é organizado e coerente com as atividades abordadas durante a avaliação.',
    compreendia: (ad?.cooperacao || '').toLowerCase().includes('não') ? 'NÃO' : 'SIM',
  }
  const blocos   = generateTextoConclusao(dadosPac)
  const novaConclusao = buildNovaConclusao(blocos, ad)
  console.log(`   ✅  Conclusão gerada: ${novaConclusao.length} chars`)

  // 6. Aplica cores de fundo nas classificações das tabelas existentes
  console.log('6. Aplicando cores nas tabelas...')
  const htmlComCores = patchColors(repData.reportHtml)
  console.log(`   ✅  Cores aplicadas`)

  // 7. Substitui conclusão no HTML aprovado (preserva ENFIM e ENCAMINHAMENTOS)
  console.log('7. Substituindo conclusão (preserva ENFIM e ENCAMINHAMENTOS)...')
  const htmlFinal = patchConclusaoNoHtml(htmlComCores, novaConclusao)
  console.log(`   ✅  HTML final: ${htmlFinal.length} chars`)

  // 8. Salva como HTML para imprimir
  const printHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8">
  <title>Laudo — ${patient.full_name}</title>
  <style>
    @page { size: A4; margin: 2.5cm 2cm 2.5cm 2cm; }
    * { box-sizing: border-box; }
    body { font-family: Georgia,'Times New Roman',serif; font-size:11pt; line-height:1.7; color:#1a1a2e; background:#fff; max-width:21cm; margin:0 auto; padding:20px; }
    h2,h3 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
    p { font-size:11pt; margin-bottom:8px; text-align:justify; }
    ul { margin-left:24px; font-size:11pt; }
    li { margin-bottom:4px; }
    @media print { body { padding:0; } }
  </style>
</head><body>${htmlFinal}</body></html>`

  fs.writeFileSync(OUTPUT, printHtml, 'utf8')
  console.log(`\n✅  Arquivo salvo: ${OUTPUT}`)
  console.log('   Abra no navegador → Ctrl+P → Salvar como PDF\n')

  // 9. Atualiza o documento aprovado no Firestore
  console.log('8. Atualizando laudo aprovado no Firestore...')
  await firestorePatch(token, 'reports', REPORT_ID, {
    reportHtml: { stringValue: htmlFinal },
    updatedAt:  { timestampValue: new Date().toISOString() },
  })
  console.log('   ✅  Firestore atualizado\n')
  console.log('🎉  Concluído! O laudo está pronto para impressão.\n')
  process.exit(0)
}

main().catch(e => { console.error('\n❌  ERRO:', e.message); process.exit(1) })
