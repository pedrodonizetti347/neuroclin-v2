const fs = require('fs');
const os = require('os');
const https = require('https');
const data = JSON.parse(fs.readFileSync(os.homedir() + '/.config/configstore/firebase-tools.json', 'utf8'));
const accessToken = data.tokens.access_token;
const projectId = 'neuroclin-f55a5';
const reportId = 'eWbpAEBVnEszcIPZS8Z2_1780005797029';
const tmpPath = os.tmpdir() + '/soliedade_report.html';

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

(async () => {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${reportId}`;
  const doc = await get(url);
  let html = doc.fields?.reportHtml?.stringValue || '';
  console.log('html length:', html.length);
  fs.writeFileSync(tmpPath, html, 'utf8');
  console.log('saved to:', tmpPath);

  const checks = ['&amp;nbsp;', '&amp;amp;', 'correto', 'PP.'];
  checks.forEach(c => {
    const count = (html.split(c).length - 1);
    if (count > 0) console.log('FOUND:', JSON.stringify(c), 'x', count);
  });

  ['correto', 'PP.'].forEach(word => {
    const idx = html.indexOf(word);
    if (idx >= 0) {
      const ctx = html.substring(Math.max(0, idx-150), idx+150).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
      console.log('\nContext [' + word + ']:', ctx);
    }
  });
})().catch(console.error);
