const admin = require('./functions/node_modules/firebase-admin')

admin.initializeApp({ projectId: 'neuroclin-f55a5' })

const db = admin.firestore()

db.collection('users').doc('fVJ20b5FyxeEVzxLDfck7Ga76oE2')
  .set({ role: 'admin', active: true }, { merge: true })
  .then(() => { console.log('OK — Maria Caroline agora é admin'); process.exit(0) })
  .catch(e => { console.error('ERRO:', e.message); process.exit(1) })
