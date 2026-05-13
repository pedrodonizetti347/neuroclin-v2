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

let _allPatientsCache = null
let _cacheTimestamp   = 0
const CACHE_TTL_MS    = 5 * 60 * 1000
const PAGE_SIZE       = 20

async function loadAllPatients() {
  const now = Date.now()
  if (_allPatientsCache && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _allPatientsCache
  }

  const all = []
  const seenIds = new Set()
  let page  = 1

  while (true) {
    const data = await request('/api/v1/Pacientes', 'POST', {
      termo: '', campo: 1, pagina: page, somenteAtivos: true, quantidade: PAGE_SIZE,
    })
    const batch = data?.payload?.pacientes ?? []
    console.log(`[ProDoctor] página ${page} → ${batch.length} pacientes`, batch.map(p => p.nome || p.nomeCivil))

    let novos = 0
    for (const raw of batch) {
      const id = String(raw.codigo ?? raw.id ?? '')
      if (!seenIds.has(id)) {
        seenIds.add(id)
        all.push(normalizePatient(raw))
        novos++
      }
    }

    // Para se a API repetiu os mesmos pacientes (não suporta paginação real)
    if (novos === 0 || batch.length < PAGE_SIZE) break
    page++
    if (page > 200) break
  }

  console.log(`[ProDoctor] total carregado: ${all.length} pacientes únicos`)

  _allPatientsCache = all
  _cacheTimestamp   = now
  return all
}

/**
 * Busca pacientes por nome com filtro local.
 * A API ProDoctor retorna no máx. 20 por página independente do campo buscado —
 * por isso paginamos tudo e filtramos no cliente.
 */
export async function searchPatients(termo) {
  if (!termo || termo.trim().length < 2) return []

  const t = termo.trim()

  // Tenta busca direta pelo nome no servidor (vários formatos possíveis)
  const formatos = [
    { nome: t, pagina: 1, quantidade: 50 },
    { termo: t, campo: 0, pagina: 1, somenteAtivos: true, quantidade: 50 },
    { termo: t, campo: 2, pagina: 1, somenteAtivos: true, quantidade: 50 },
    { filtro: t, pagina: 1, quantidade: 50 },
  ]

  for (const body of formatos) {
    try {
      const data  = await request('/api/v1/Pacientes', 'POST', body)
      const batch = data?.payload?.pacientes ?? []
      console.log(`[ProDoctor] formato ${JSON.stringify(body)} → ${batch.length} pacientes:`, batch.map(p => p.nome || p.nomeCivil))

      if (batch.length === 0) continue

      const q       = t.toLowerCase()
      const results = batch.map(normalizePatient)
      const matched = results.filter(p => p.full_name?.toLowerCase().includes(q))

      // Se ao menos um resultado bate com o termo, a API filtrou corretamente
      if (matched.length > 0) {
        console.log(`[ProDoctor] ✓ formato funcional: ${JSON.stringify(body)}`)
        return results
      }
      // Se veio resultado mas nenhum tem o nome, a API ignorou o filtro → tenta próximo formato
    } catch (e) {
      console.warn(`[ProDoctor] formato falhou:`, e.message)
    }
  }

  // Nenhum formato filtrou no servidor → filtra localmente nos 20 disponíveis
  console.warn('[ProDoctor] API não suporta filtro por nome — usando cache local')
  const all     = await loadAllPatients()
  const q       = t.toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  return all.filter(p => {
    if (p.full_name?.toLowerCase().includes(q)) return true
    if (qDigits.length >= 3 && p.cpf?.replace(/\D/g, '').includes(qDigits)) return true
    return false
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
