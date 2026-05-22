// scripts/fix-neupsilin.cjs
// Migra dados NEUPSILIN do doc legado para sessions/1urdqbWvuNaSK6rFfa4M
// Usa credenciais do Firebase CLI via Firestore REST API
const https = require('https')
const fs    = require('fs')
const os    = require('os')
const path  = require('path')

const PROJECT    = 'neuroclin-f55a5'
const PATIENT_ID = '1urdqbWvuNaSK6rFfa4M'

// ─── Lê token do Firebase CLI ─────────────────────────────────────────────
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
const fbConfig   = JSON.parse(fs.readFileSync(configPath, 'utf8'))
let ACCESS_TOKEN = fbConfig.tokens?.access_token
const REFRESH_TOKEN = fbConfig.tokens?.refresh_token
const CLIENT_ID     = fbConfig.tokens?.client_id     || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = fbConfig.tokens?.client_secret || 'j9iVZfS8oDju_os3pogwHV3s'

// ─── Helpers HTTP ─────────────────────────────────────────────────────────
function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    r.on('error', reject)
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body))
    r.end()
  })
}

async function refreshToken() {
  console.log('Refreshing access token...')
  const body = `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token`
  const res = await req({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  }, body)
  if (res.status === 200 && res.body.access_token) {
    ACCESS_TOKEN = res.body.access_token
    console.log('Token renovado.')
  } else {
    throw new Error('Falha ao renovar token: ' + JSON.stringify(res.body))
  }
}

function fsGet(docPath) {
  return req({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
  })
}

function fsList(collection) {
  return req({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?pageSize=300`,
    method: 'GET',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
  })
}

function fsPatch(docPath, fields) {
  const body = JSON.stringify({ fields })
  return req({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT}/databases/(default)/documents/${docPath}`,
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body)
}

// ─── Converte valor Firestore REST → JS ──────────────────────────────────
function fromFirestore(v) {
  if (v === undefined || v === null) return null
  if ('nullValue'      in v) return null
  if ('booleanValue'   in v) return v.booleanValue
  if ('integerValue'   in v) return Number(v.integerValue)
  if ('doubleValue'    in v) return Number(v.doubleValue)
  if ('stringValue'    in v) return v.stringValue
  if ('timestampValue' in v) return v.timestampValue
  if ('mapValue'       in v) {
    const out = {}
    for (const [k, fv] of Object.entries(v.mapValue.fields || {})) out[k] = fromFirestore(fv)
    return out
  }
  if ('arrayValue'     in v) return (v.arrayValue.values || []).map(fromFirestore)
  return null
}

// ─── Converte JS → valor Firestore REST ─────────────────────────────────
function toFirestore(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean')  return { booleanValue: val }
  if (typeof val === 'number')   return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  if (typeof val === 'string')   return { stringValue: val }
  if (Array.isArray(val))        return { arrayValue: { values: val.map(toFirestore) } }
  if (typeof val === 'object')   {
    const fields = {}
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestore(v)
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function run() {
  // 1. Tenta com token atual; se 401, renova
  let res = await fsList('sessions')
  if (res.status === 401) {
    await refreshToken()
    res = await fsList('sessions')
  }
  if (res.status !== 200) throw new Error('Erro ao listar sessions: ' + JSON.stringify(res.body))

  const docs = res.body.documents || []
  const legacy = docs.filter(d => {
    const name = d.name.split('/').pop()
    return name.startsWith(`${PATIENT_ID}_`)
  })

  console.log(`\nDocs legados encontrados: ${legacy.length}`)

  let bestNeupsilin = null
  let bestCount = -1
  let bestId = null

  for (const d of legacy) {
    const docId   = d.name.split('/').pop()
    const tests   = fromFirestore(d.fields?.tests)
    const neupsilin = tests?.NEUPSILIN

    if (!neupsilin || typeof neupsilin !== 'object') {
      console.log(`  ${docId}: sem NEUPSILIN`)
      continue
    }

    const count = Object.entries(neupsilin).filter(([k, v]) =>
      !k.startsWith('_') && v !== null && v !== undefined && v !== 0 && v !== ''
    ).length
    console.log(`  ${docId}: NEUPSILIN com ${count} campos reais`)

    if (count > bestCount) {
      bestCount    = count
      bestNeupsilin = neupsilin
      bestId       = docId
    }
  }

  if (!bestNeupsilin) {
    console.log('\nNenhum dado NEUPSILIN encontrado nos docs legados. Nada a migrar.')
    process.exit(0)
  }

  console.log(`\nMelhor fonte: ${bestId} (${bestCount} campos reais)`)
  console.log('Campos NEUPSILIN encontrados:')
  Object.entries(bestNeupsilin).forEach(([k, v]) => {
    if (!k.startsWith('_')) console.log(`  ${k}: ${JSON.stringify(v)}`)
  })

  // 2. Carrega doc novo para merge
  const newDocPath = `sessions/${PATIENT_ID}`
  const existRes   = await fsGet(newDocPath)
  const existTests = existRes.status === 200
    ? (fromFirestore(existRes.body.fields?.tests) || {})
    : {}

  // Merge: mantém o que já existe no doc novo, preenche com dados legados onde não há
  const existNeupsilin = existTests.NEUPSILIN || {}
  const mergedNeupsilin = { ...bestNeupsilin, ...existNeupsilin }

  // 3. Salva com PATCH (merge sobre o doc existente)
  // Constrói o payload apenas para o campo tests.NEUPSILIN
  const updatedTests = { ...existTests, NEUPSILIN: mergedNeupsilin }
  const fieldsPayload = { tests: toFirestore(updatedTests) }

  const patchRes = await fsPatch(newDocPath, fieldsPayload)
  if (patchRes.status === 200) {
    console.log(`\nNEUPSILIN salvo em sessions/${PATIENT_ID} com merge.`)
    console.log(`Total de campos no doc após merge: ${Object.keys(mergedNeupsilin).filter(k => !k.startsWith('_')).length}`)
    console.log('Feito!')
  } else {
    console.error('\nErro ao salvar:', JSON.stringify(patchRes.body, null, 2))
    process.exit(1)
  }
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1) })
