const fs = require('fs');
const os = require('os');
const https = require('https');
const data = JSON.parse(fs.readFileSync(os.homedir() + '/.config/configstore/firebase-tools.json', 'utf8'));
const accessToken = data.tokens.access_token;
const projectId = 'neuroclin-f55a5';
const reportId = 'eWbpAEBVnEszcIPZS8Z2_1780005797029';

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers: { 'Authorization': 'Bearer ' + accessToken } }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function patch(url, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request(url, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(b); req.end();
  });
}

(async () => {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${reportId}`;
  const doc = await get(url);
  let html = doc.fields?.reportHtml?.stringValue || '';
  console.log('Fetched from Firestore, length:', html.length);

  // Remover todos os resíduos de "correto" (com e sem ponto, com e sem "tudo")
  html = html.replace(/\s*tudo correto\.?\s*/gi, ' ');
  html = html.replace(/\)\s*correto\s*(<)/gi, ')$1');  // caso após parêntese
  html = html.replace(/\.\s*correto\s*(<)/gi, '.$1');  // caso após ponto
  html = html.replace(/\s+correto\s*(<div)/gi, '$1');  // caso antes de <div
  html = html.replace(/\bcorreto\b\.?\s*/gi, '');      // qualquer restante

  // Verificar resultado
  const remaining = html.split('correto').length - 1;
  console.log('correto restantes:', remaining);
  console.log('New length:', html.length);

  // Salvar no Firestore
  const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${reportId}?updateMask.fieldPaths=reportHtml`;
  const result = await patch(patchUrl, { fields: { reportHtml: { stringValue: html } } });
  const saved = result.fields?.reportHtml?.stringValue?.length || 0;
  if (result.error) console.log('ERRO:', JSON.stringify(result.error));
  else console.log('Salvo! Length:', saved);
})().catch(console.error);
