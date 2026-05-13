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
    full_name:    raw.nomeCivil || raw.nome || '',
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

/**
 * Busca pacientes por nome.
 * POST /api/v1/Pacientes → response.payload.pacientes[]
 */
export async function searchPatients(termo) {
  if (!termo || termo.trim().length < 2) return []

  const data = await request('/api/v1/Pacientes', 'POST', {
    nome:       termo.trim(),
    pagina:     1,
    quantidade: 20,
  })

  const list = data?.payload?.pacientes ?? data?.pacientes ?? data ?? []
  return Array.isArray(list) ? list.map(normalizePatient) : []
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
