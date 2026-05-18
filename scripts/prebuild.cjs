const fs = require('fs')
const t  = Date.now()
const bt = new Date(t).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

fs.writeFileSync(
  'src/version.js',
  `export const BUILD_TIME = "${bt}";\nexport const BUILD_ID = ${t};\n`
)
fs.mkdirSync('public', { recursive: true })
fs.writeFileSync('public/version.json', JSON.stringify({ v: t }) + '\n')
console.log(`[prebuild] BUILD_ID=${t}  BUILD_TIME="${bt}"`)
