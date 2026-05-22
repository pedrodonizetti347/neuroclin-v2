import { saveAs } from 'file-saver'

// Converte URL relativa em base64 data-URI para que o Word incorpore imagens corretamente
async function imgToBase64(src) {
  try {
    const url = src.startsWith('/') ? window.location.origin + src : src
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror  = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// Substitui src relativos (/images/...) por base64 inline
async function inlineImages(html) {
  const srcs = [...new Set([...html.matchAll(/src="(\/[^"]+)"/g)].map(m => m[1]))]
  if (!srcs.length) return html
  const map = {}
  await Promise.all(srcs.map(async s => {
    const b64 = await imgToBase64(s)
    if (b64) map[s] = b64
  }))
  return html.replace(/src="(\/[^"]+)"/g, (_, s) => map[s] ? `src="${map[s]}"` : `src="${s}"`)
}

// ── FUNÇÃO PRINCIPAL ──────────────────────────────────────────────────────────
// Usa o reportHtml já salvo no Firebase (mesma fonte do PDF) e converte para .docx
// via html-docx-js carregado como script global em index.html (window.htmlDocx).
export async function exportToDocx({ patient, reportHtml }) {
  const htmlDocx = window.htmlDocx
  if (!htmlDocx) throw new Error('html-docx-js não carregado')

  const processedHtml = await inlineImages(reportHtml || '')

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body  { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a2e; line-height: 1.7; margin: 0; text-align: justify; }
    p     { text-align: justify; margin: 6px 0; }
    h1, h2, h3, h4 { text-align: center; }
    table { width: 100%; border-collapse: collapse; font-size: 11pt; }
    th    { text-align: center; }
    img   { max-width: 100%; height: auto; }
    *     { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${processedHtml}</body>
</html>`

  const blob = htmlDocx.asBlob(fullHtml, {
    orientation: 'portrait',
    margins: { top: 1417, right: 1417, bottom: 1417, left: 1417, header: 720, footer: 720, gutter: 0 },
  })

  const fname = `laudo_${(patient?.full_name || 'paciente').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.docx`
  saveAs(blob, fname)
}
