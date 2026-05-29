const fs = require('fs');
const os = require('os');
const https = require('https');
const data = JSON.parse(fs.readFileSync(os.homedir() + '/.config/configstore/firebase-tools.json', 'utf8'));
const accessToken = data.tokens.access_token;
const projectId = 'neuroclin-f55a5';
const reportId = 'eWbpAEBVnEszcIPZS8Z2_1780005797029';
const tmpPath = os.tmpdir() + '/soliedade_report.html';

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
  let html = fs.readFileSync(tmpPath, 'utf8');
  console.log('Original length:', html.length);

  // 1. Corrigir &amp;nbsp; → &nbsp;
  const before1 = (html.split('&amp;nbsp;').length - 1);
  html = html.split('&amp;nbsp;').join('&nbsp;');
  console.log('Fixed &amp;nbsp;:', before1, 'occurrences');

  // 2. Remover "tudo correto." e variações
  html = html.replace(/\s*tudo correto\.\s*/gi, ' ');
  html = html.replace(/\s*correto\.\s*/gi, ' ');
  console.log('Removed "correto"');

  // 3. Remover "PP." solto
  html = html.replace(/\s*PP\.\s*/g, ' ');
  console.log('Removed "PP."');

  // 4. Limpar espaços duplos resultantes
  html = html.replace(/  +/g, ' ');

  console.log('New length:', html.length);

  // Verificar se ainda existe problema
  ['&amp;nbsp;', 'correto', 'PP.'].forEach(c => {
    const count = html.split(c).length - 1;
    console.log(JSON.stringify(c), ':', count, 'restantes');
  });

  // Salvar no Firestore
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${reportId}?updateMask.fieldPaths=reportHtml`;
  const result = await patch(url, { fields: { reportHtml: { stringValue: html } } });
  const saved = result.fields?.reportHtml?.stringValue?.length || 0;
  if (result.error) console.log('ERRO:', JSON.stringify(result.error));
  else console.log('Salvo no Firestore! Length:', saved);
})().catch(console.error);
