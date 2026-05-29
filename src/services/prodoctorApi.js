/**
 * ProDoctor Open API — src/services/prodoctorApi.js
 *
 * Todas as chamadas passam pela Cloud Function prodoctorProxy
 * para evitar CORS e manter as credenciais no servidor.
 */

import { auth } from '@/lib/firebase'

const FUNCTIONS_URL =
  import.meta.env.VITE_FUNCTIONS_URL ||
  'https://us-central1-neuroclin-f55a5.cloudfunctions.net'

export class ProDoctorError extends Error {
  constructor(status, body, path) {
    super(`ProDoctor ${status}: ${body || 'sem detalhes'} [${path}]`)
    this.status = status
    this.body   = body
    this.path   = path
  }
}

async function request(path, method = 'GET', body = null) {
  const token = await auth.currentUser?.getIdToken()

  const res = await fetch(`${FUNCTIONS_URL}/prodoctorProxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ path, method, body }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ProDoctorError(res.status, text, path)
  }
  return res.json()
}

function normalizePatient(raw) {
  const phone = raw.telefone1?.numero ?? raw.telefone1 ?? raw.telefone2?.numero ?? ''
  const sexRaw = raw.sexo?.nome ?? raw.sexo ?? raw.genero ?? ''
  const email = (raw.correioEletronico ?? raw.email ?? '').toLowerCase()
  const education = raw.escolaridade?.nome ?? raw.escolaridade ?? ''

  return {
    prodoctor_id: String(raw.codigo ?? raw.id ?? ''),
    full_name:    raw.nome || raw.nomeCivil || '',
    birth_date:   normDate(raw.dataNascimento ?? ''),
    cpf:          raw.cpf ?? '',
    phone:        String(phone),
    email,
    sex:          normSex(sexRaw),
    education:    String(education),
  }
}

function normDate(val) {
  if (!val) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) {
    const [d, m, y] = val.split('/')
    return `${y}-${m}-${d}`
  }
  return val
}

function normSex(val) {
  const v = String(val).toLowerCase().trim()
  if (['m', 'masculino', 'male', '1'].includes(v)) return 'masculino'
  if (['f', 'feminino', 'female', '2'].includes(v)) return 'feminino'
  return ''
}

let _allPatientsCache   = null
let _cacheTimestamp     = 0
let _loadingPromise     = null
const CACHE_TTL_MS      = 10 * 60 * 1000  // 10 min

// Formatos de paginação que a API ProDoctor pode aceitar (tenta em ordem)
const PAGINATION_FORMATS = (page) => [
  { pagina: page, quantidade: 100, somenteAtivos: true },
  { pagina: page, quantidade: 100 },
  { pagina: page, limite: 100, somenteAtivos: true },
  { page,         per_page: 100 },
  { offset: (page - 1) * 100, limite: 100, somenteAtivos: true },
  { termo: '', campo: 0, pagina: page, somenteAtivos: true, quantidade: 100 },
  { termo: '', campo: 1, pagina: page, somenteAtivos: true, quantidade: 100 },
]

async function fetchPage(page) {
  for (const body of PAGINATION_FORMATS(page)) {
    try {
      const data  = await request('/api/v1/Pacientes', 'POST', body)
      const batch = data?.payload?.pacientes ?? data?.pacientes ?? []
      if (batch.length > 0) {
        console.log(`[ProDoctor] pág.${page} formato ${JSON.stringify(body)} → ${batch.length}`)
        return batch
      }
    } catch { /* tenta próximo */ }
  }
  return []
}

async function _doLoad() {
  const all     = []
  const seenIds = new Set()
  let   page    = 1

  while (page <= 200) {
    const batch = await fetchPage(page)

    if (batch.length === 0) {
      console.log(`[ProDoctor] pág.${page} vazia — fim da lista`)
      break
    }

    let novos = 0
    for (const raw of batch) {
      const id = String(raw.codigo ?? raw.id ?? '')
      if (id && !seenIds.has(id)) {
        seenIds.add(id)
        all.push(normalizePatient(raw))
        novos++
      }
    }

    console.log(`[ProDoctor] pág.${page} → ${batch.length} recebidos, ${novos} novos (total: ${all.length})`)

    // Se não chegou nenhum novo ID a API não suporta paginação real
    if (novos === 0) break
    page++
  }

  console.log(`[ProDoctor] carregamento concluído: ${all.length} pacientes únicos`)
  return all
}

async function loadAllPatients(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && _allPatientsCache && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _allPatientsCache
  }

  // Evita múltiplos carregamentos paralelos
  if (!_loadingPromise) {
    _loadingPromise = _doLoad().then(all => {
      _allPatientsCache = all
      _cacheTimestamp   = Date.now()
      _loadingPromise   = null
      return all
    }).catch(err => {
      _loadingPromise = null
      throw err
    })
  }

  return _loadingPromise
}

/** Limpa o cache — útil quando o usuário clica em "Atualizar" */
export function clearPatientsCache() {
  _allPatientsCache = null
  _cacheTimestamp   = 0
  _loadingPromise   = null
}

/** Quantos pacientes estão em cache no momento */
export function getCachedCount() {
  return _allPatientsCache?.length ?? 0
}

/**
 * Busca pacientes por nome ou CPF, com filtro opcional por data de nascimento.
 * Carrega todos os pacientes via paginação e filtra localmente.
 * @param {string} termo - nome ou CPF (mínimo 2 chars)
 * @param {boolean} forceRefresh - ignora cache
 * @param {string|null} birthDate - filtro por data de nascimento (YYYY-MM-DD), opcional
 */
export async function searchPatients(termo, forceRefresh = false, birthDate = null) {
  if (!termo || termo.trim().length < 2) return []

  const t       = termo.trim()
  const q       = t.toLowerCase()
  const qDigits = q.replace(/\D/g, '')

  const all = await loadAllPatients(forceRefresh)
  console.log(`[ProDoctor] filtrando "${t}"${birthDate ? ` + nascimento:${birthDate}` : ''} em ${all.length} pacientes`)

  return all.filter(p => {
    const nameOrCpf = p.full_name?.toLowerCase().includes(q) ||
      (qDigits.length >= 3 && p.cpf?.replace(/\D/g, '').includes(qDigits))
    if (!nameOrCpf) return false
    // Filtro adicional por data de nascimento quando informada
    if (birthDate && p.birth_date && p.birth_date !== birthDate) return false
    return true
  })
}

/**
 * Detalha um paciente pelo código ProDoctor.
 * GET /api/v1/Pacientes/Detalhar/{codigo}
 */
export async function getPatient(codigo) {
  const data = await request(`/api/v1/Pacientes/Detalhar/${codigo}`)
  const raw  = data?.payload?.paciente ?? data?.payload ?? data
  return normalizePatient(raw)
}

/**
 * Lista todos os usuários (profissionais) do ProDoctor.
 * POST /api/v1/Usuarios → response.payload.usuarios[]
 */
export async function listProfessionals() {
  const data = await request('/api/v1/Usuarios', 'POST', {
    termo: '', somenteAtivos: true, quantidade: 100,
  })
  return data?.payload?.usuarios ?? []
}

/**
 * Formata uma Date como DD/MM/YYYY (formato aceito pela API ProDoctor)
 */
function formatDateBR(date) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

/**
 * Verifica se um agendamento é do tipo "Devolutiva"
 * Tenta múltiplos campos possíveis e faz fallback para busca no JSON completo
 */
function isDevolutiva(ag) {
  const tipo = (
    ag.tipoConsulta?.nome ??
    ag.tipo?.nome ??
    ag.tipoAtendimento?.nome ??
    ag.descricaoTipo ??
    ag.descricao ??
    ''
  )
  if (tipo.toLowerCase().includes('devolutiva')) return true
  return JSON.stringify(ag).toLowerCase().includes('devolutiva')
}

/**
 * Busca a agenda de um profissional em um dia específico.
 * POST /api/v1/Agenda/Listar
 */
export async function getAgendaDay(usuarioCodigo, date) {
  const dateStr = formatDateBR(date)
  try {
    const data = await request('/api/v1/Agenda/Listar', 'POST', {
      Usuario: { Codigo: Number(usuarioCodigo) },
      Data: dateStr,
      LocalProDoctor: { Codigo: 1 },
    })
    const ags = data?.payload?.diaAgendaConsulta?.agendamentos ?? []
    return ags
  } catch (err) {
    console.warn(`[ProDoctor Agenda] prof=${usuarioCodigo} data=${dateStr} ERRO:`, err.message)
    return []
  }
}

let _devolutivasCache   = null
let _devCacheTimestamp  = 0
const DEV_CACHE_TTL_MS  = 15 * 60 * 1000 // 15 min

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/**
 * Busca todas as devolutivas dos próximos 14 dias para todos os profissionais.
 * Processa profissionais sequencialmente (1s entre cada) para evitar rate limit.
 * Dentro de cada profissional, os 14 dias são consultados em paralelo.
 */
export async function getDevolutivas14Days(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && _devolutivasCache && (now - _devCacheTimestamp) < DEV_CACHE_TTL_MS) {
    return _devolutivasCache
  }

  const profData = await listProfessionals()
  const professionals = profData.map(p => ({
    prodoctor_id: String(p.codigo ?? p.id ?? ''),
    name:         p.nome ?? p.nomeCivil ?? '',
  })).filter(p => p.prodoctor_id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })

  const all = []

  for (let i = 0; i < professionals.length; i++) {
    const prof = professionals[i]
    // Pausa entre profissionais para não estourar o rate limit
    if (i > 0) await sleep(1000)

    const dayResults = await Promise.all(
      days.map(async day => {
        const ags = await getAgendaDay(prof.prodoctor_id, day)
        return ags
          .filter(ag => ag.paciente && isDevolutiva(ag))
          .map(ag => ({
            date:         new Date(day),
            hora:         ag.hora ?? '',
            paciente: {
              nome:   ag.paciente.nome ?? ag.paciente.nomeCivil ?? '',
              codigo: String(ag.paciente.codigo ?? ag.paciente.id ?? ''),
            },
            professional: prof,
            raw:          ag,
          }))
      })
    )
    all.push(...dayResults.flat())
  }

  const devolutivas = all.sort((a, b) => a.date - b.date || a.hora.localeCompare(b.hora))

  _devolutivasCache  = devolutivas
  _devCacheTimestamp = Date.now()
  return devolutivas
}

export function clearDevolutivasCache() {
  _devolutivasCache  = null
  _devCacheTimestamp = 0
}

/**
 * Detalha um usuário/profissional pelo código ProDoctor.
 * GET /api/v1/Usuarios/Detalhar/{codigo}
 */
export async function getProfessional(codigo) {
  const data = await request(`/api/v1/Usuarios/Detalhar/${codigo}`)
  const raw  = data?.payload?.usuario ?? data?.payload ?? data
  return {
    prodoctor_id:   String(raw.codigo ?? raw.id ?? ''),
    name:           raw.nome ?? raw.nomeCivil ?? '',
    email:          (raw.correioEletronico ?? raw.email ?? '').toLowerCase(),
    specialty:      raw.especialidade?.nome ?? raw.especialidade ?? '',
    council_number: raw.dadosConselho?.numero ?? raw.dadosConselho ?? '',
  }
}
