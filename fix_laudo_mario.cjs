/**
 * Script de recuperação do laudo do Mario Arakaki
 * Lê o Firestore via REST API, busca o laudo mais recente,
 * corrige apenas o carimbo danificado e preserva todas as edições do Pedro.
 */
const https = require('https')
const fs = require('fs')

const PROJECT_ID = 'neuroclin-f55a5'

// Lê o token salvo pelo firebase-tools
const cfg = JSON.parse(fs.readFileSync(
  'C:/Users/Pedro Donizetti/.config/configstore/firebase-tools.json', 'utf8'
))
const ACCESS_TOKEN = cfg.tokens.access_token

function firestoreGet(path) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`
    const req = https.get(url, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
  })
}

function firestoreQuery(collectionId, fieldPath, value) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`
    const body = JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: { stringValue: value }
          }
        },
        limit: 10
      }
    })
    const req = https.request(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function firestorePatch(docPath, fields) {
  return new Promise((resolve, reject) => {
    const fieldPaths = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?${fieldPaths}`

    // Converte campos para formato Firestore
    const firestoreFields = {}
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === 'string') firestoreFields[k] = { stringValue: v }
      else if (typeof v === 'number') firestoreFields[k] = { integerValue: v }
    }
    const body = JSON.stringify({ fields: firestoreFields })

    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function extractStr(field) {
  if (!field) return null
  return field.stringValue || field.bytesValue || null
}

async function main() {
  console.log('🔍 Buscando paciente Mario Arakaki...')

  // Busca pacientes com nome contendo Mario Arakaki
  // Como Firestore não tem LIKE, listar todos os pacientes e filtrar
  const patientsRes = await firestoreGet('patients?pageSize=200')
  const patients = (patientsRes.documents || [])
  const mario = patients.find(p => {
    const name = extractStr(p.fields?.full_name) || ''
    return name.toLowerCase().includes('mario') || name.toLowerCase().includes('mário') || name.toLowerCase().includes('arakaki')
  })

  if (!mario) {
    console.log('❌ Paciente Mario Arakaki não encontrado. Listando todos:')
    patients.forEach(p => console.log(' -', extractStr(p.fields?.full_name), '|', p.name))
    return
  }

  const patientDocId = mario.name.split('/').pop()
  const patientName = extractStr(mario.fields?.full_name)
  console.log(`✅ Paciente encontrado: ${patientName} (ID: ${patientDocId})`)

  // Busca laudos desse paciente
  console.log('🔍 Buscando laudos...')
  const reportsRes = await firestoreQuery('reports', 'patientId', patientDocId)
  const reportDocs = (reportsRes || []).filter(r => r.document).map(r => r.document)

  if (!reportDocs.length) {
    console.log('❌ Nenhum laudo encontrado para', patientName)
    return
  }

  console.log(`📋 ${reportDocs.length} laudo(s) encontrado(s)`)

  // Pega o mais recente (maior updatedAt)
  const sorted = reportDocs.sort((a, b) => {
    const ta = a.fields?.updatedAt?.timestampValue || a.updateTime || ''
    const tb = b.fields?.updatedAt?.timestampValue || b.updateTime || ''
    return tb.localeCompare(ta)
  })

  const report = sorted[0]
  const reportId = report.name.split('/').pop()
  const reportHtml = extractStr(report.fields?.reportHtml) || ''
  const status = extractStr(report.fields?.status) || ''

  console.log(`\n📄 Laudo mais recente:`)
  console.log(`   ID: ${reportId}`)
  console.log(`   Status: ${status}`)
  console.log(`   HTML salvo: ${reportHtml.length} caracteres`)
  console.log(`   Tem marcador APROVAÇÃO: ${reportHtml.includes('<!-- APROVAÇÃO DO SUPERVISOR -->')}`)
  console.log(`   Tem marcador REFERÊNCIAS: ${reportHtml.includes('<!-- REFERÊNCIAS -->')}`)

  if (reportHtml.length < 200) {
    console.log('\n⚠️  reportHtml está vazio ou muito pequeno. Verificando outros laudos...')
    sorted.forEach((r, i) => {
      const h = extractStr(r.fields?.reportHtml) || ''
      console.log(`   [${i}] ${r.name.split('/').pop()} — ${h.length} chars — status: ${extractStr(r.fields?.status)}`)
    })
    return
  }

  // Salva cópia de segurança local
  const backupPath = `./laudo_mario_backup_${Date.now()}.html`
  fs.writeFileSync(backupPath, reportHtml, 'utf8')
  console.log(`\n💾 Backup salvo em: ${backupPath}`)

  // Corrige o carimbo danificado
  const approvalMarker = '<!-- APROVAÇÃO DO SUPERVISOR -->'
  const refsMarker = '<!-- REFERÊNCIAS -->'

  if (reportHtml.includes(approvalMarker) && reportHtml.includes(refsMarker)) {
    // Remove o conteúdo danificado entre os marcadores, deixa o espaço limpo
    const fixed = reportHtml.replace(
      new RegExp(approvalMarker + '[\\s\\S]*?' + refsMarker),
      approvalMarker + '\n\n' + refsMarker
    )

    fs.writeFileSync('./laudo_mario_fixed.html', fixed, 'utf8')
    console.log(`\n✅ Laudo corrigido salvo localmente em: laudo_mario_fixed.html`)
    console.log(`   Conteúdo preservado: ${fixed.length} caracteres`)
    console.log('\n❓ Deseja salvar o laudo corrigido de volta no Firestore? (execute com --save para confirmar)')

    if (process.argv.includes('--save')) {
      console.log('\n📤 Salvando no Firestore...')
      const docPath = `reports/${reportId}`
      await firestorePatch(docPath, { reportHtml: fixed, status: 'rascunho' })
      console.log('✅ Laudo restaurado no Firestore com sucesso!')
      console.log('   Carimbo danificado removido, edições preservadas.')
      console.log('   Status revertido para rascunho para poder aprovar novamente.')
    } else {
      console.log('\nPara salvar, execute: node fix_laudo_mario.cjs --save')
    }
  } else {
    console.log('\n⚠️  Marcadores não encontrados no HTML. Estrutura do laudo:')
    console.log(reportHtml.substring(0, 500) + '...')
  }
}

main().catch(console.error)
