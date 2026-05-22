/**
 * Script de migração — atualiza role para 'estagiario'
 * Usuários alvo: Iasmina (email contém "iasmina") e Geane (geane081075@gmail.com)
 *
 * Usa o access_token já armazenado pelo Firebase CLI.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const PROJECT_ID = 'neuroclin-f55a5';
const FIRESTORE  = 'firestore.googleapis.com';
const BASE_URL   = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── 1. Ler access token do Firebase CLI ─────────────────────────────────────
function getAccessToken() {
  const credFile = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const data     = JSON.parse(fs.readFileSync(credFile, 'utf8'));
  const token    = data?.tokens?.access_token;
  if (!token) throw new Error('access_token não encontrado em firebase-tools.json');
  return token;
}

// ── 2. GET REST Firestore ────────────────────────────────────────────────────
function firestoreGet(token, urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: FIRESTORE,
      path:     urlPath,
      method:   'GET',
      headers:  { Authorization: `Bearer ${token}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── 3. PATCH — atualiza apenas o campo role ──────────────────────────────────
function firestorePatch(token, docPath, role) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify({ fields: { role: { stringValue: role } } });
    const urlPath = `${BASE_URL}/${docPath}?updateMask.fieldPaths=role`;
    const req = https.request({
      hostname: FIRESTORE,
      path:     urlPath,
      method:   'PATCH',
      headers:  {
        Authorization:    `Bearer ${token}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── 4. Listar todos os docs em users/ ────────────────────────────────────────
async function listUsers(token) {
  const result = await firestoreGet(token, `${BASE_URL}/users`);
  if (result.status !== 200) {
    throw new Error(`Erro ao listar usuários (HTTP ${result.status}): ${JSON.stringify(result.body)}`);
  }
  return result.body.documents || [];
}

// ── 5. Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Migração de roles — NeuroClin ===\n');

  const token = getAccessToken();
  console.log('✔ Access token lido do Firebase CLI.\n');

  const docs = await listUsers(token);
  console.log(`Usuários encontrados: ${docs.length}\n`);

  // Imprime todos para diagnóstico
  console.log('Lista de usuários:');
  for (const doc of docs) {
    const email = doc?.fields?.email?.stringValue || '(sem email)';
    const role  = doc?.fields?.role?.stringValue  || '(sem role)';
    const name  = doc?.fields?.name?.stringValue  || doc?.fields?.displayName?.stringValue || '(sem nome)';
    console.log(`  ${email.padEnd(38)} role: ${role.padEnd(14)} nome: ${name}`);
  }
  console.log('');

  // Alvos
  const targets = [
    { match: u => u?.fields?.email?.stringValue?.toLowerCase().includes('iasmina'), label: 'Iasmina' },
    { match: u => u?.fields?.email?.stringValue?.toLowerCase() === 'geane081075@gmail.com', label: 'Geane' },
  ];

  let updated = 0;

  for (const doc of docs) {
    const email   = doc?.fields?.email?.stringValue || '(sem email)';
    const roleNow = doc?.fields?.role?.stringValue  || '(sem role)';
    const docId   = doc.name.split('/').pop();

    const target = targets.find(t => t.match(doc));
    if (!target) continue;

    console.log(`→ Alvo: ${target.label}`);
    console.log(`  Email:  ${email}`);
    console.log(`  Role:   ${roleNow} → estagiario`);

    if (roleNow === 'estagiario') {
      console.log(`  ✔ Já é estagiario — sem alteração.\n`);
      continue;
    }

    const res = await firestorePatch(token, `users/${docId}`, 'estagiario');
    if (res.status === 200) {
      console.log(`  ✔ Atualizado com sucesso.\n`);
      updated++;
    } else {
      console.log(`  ✖ Erro HTTP ${res.status}:`, JSON.stringify(res.body, null, 2), '\n');
    }
  }

  console.log(`=== Resultado: ${updated} documento(s) atualizado(s) ===\n`);
}

main().catch(err => { console.error('ERRO:', err.message); process.exit(1); });
