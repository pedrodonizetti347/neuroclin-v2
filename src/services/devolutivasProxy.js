// URL do novo projeto GAS NeuroClin-Devolutivas
// Preencher com o Deployment ID após publicar o webapp no Google Apps Script
const GAS_URL_DEVOLUTIVAS = 'https://script.google.com/macros/s/AKfycbzZzSLb7Hti9lMR07BkiNm2cGF8OeK8_0Gd6zUoaxDZKz5Kz6lOmuiN_cU_701wT_EzoQ/exec'

export async function fetchDevolutivas() {
  const res = await fetch(`${GAS_URL_DEVOLUTIVAS}?action=getDevolutivas`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.erro) throw new Error(json.mensagem || 'Erro do servidor')
  return Array.isArray(json) ? json : []
}
