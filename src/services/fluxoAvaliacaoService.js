import { auth } from '@/lib/firebase'
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

const FUNCTIONS_URL =
  import.meta.env.VITE_FUNCTIONS_URL ||
  'https://us-central1-neuroclin-f55a5.cloudfunctions.net'

const DATA_CORTE = new Date('2026-05-29T00:00:00') // TEMPORÁRIO para testes — voltar para 2026-06-01

async function pdRequest(path, method = 'GET', body = null) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(`${FUNCTIONS_URL}/prodoctorProxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ path, method, body }),
  })
  if (!res.ok) throw new Error(`ProDoctor ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
}

function formatDateBR(date) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

function parseDate(str) {
  if (!str || typeof str !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str.substring(0, 10) + 'T12:00:00')
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const [d, m, y] = str.split('/')
    return new Date(`${y}-${m}-${d}T12:00:00`)
  }
  return null
}

function isPreventSenior(ag) {
  return JSON.stringify(ag).toLowerCase().includes('prevent')
}

function getTipoNome(ag) {
  return (
    ag.tipoConsulta?.nome ??
    ag.tipo?.nome ??
    ag.tipoAtendimento?.nome ??
    ag.descricaoTipo ??
    ag.descricao ??
    ''
  ).toLowerCase()
}

function isConsultaContavel(ag) {
  const t = getTipoNome(ag)
  if (t.includes('devolutiva')) return false
  if (t.includes('psicoterapi')) return false
  if (t === 'retorno') return false
  return true
}

function isRetornoFinal(ag) {
  const t = getTipoNome(ag)
  return t.includes('retorno') || t.includes('devolutiva')
}

function getConsultaDate(ag) {
  const raw = ag.data ?? ag.dataConsulta ?? ag.dataAgendamento ?? ag.dataHora ?? null
  return raw ? parseDate(String(raw)) : null
}

function getPacienteInfo(ag) {
  return {
    id:   String(ag.paciente?.codigo ?? ag.paciente?.id ?? ''),
    nome: ag.paciente?.nome ?? ag.paciente?.nomeCivil ?? '',
  }
}

function extractAgendamentos(data) {
  for (const c of [
    data?.payload?.agendamentos,
    data?.payload?.diaAgendaConsulta?.agendamentos,
    data?.agendamentos,
    data?.payload,
    data,
  ]) {
    if (Array.isArray(c) && c.length > 0) return c
  }
  return []
}

export async function buscarAgendamentosPrevent(dataInicio, dataFim) {
  const ini = formatDateBR(dataInicio)
  const fim = formatDateBR(dataFim)

  const payloads = [
    { dataInicial: ini, dataFinal: fim },
    { dataInicio: ini, dataFim: fim },
    { DataInicial: ini, DataFinal: fim },
    { dataInicial: ini, dataFinal: fim, somenteAtivos: true },
    { dataInicial: ini, dataFinal: fim, status: [1, 2, 3] },
  ]

  for (const payload of payloads) {
    try {
      const data = await pdRequest('/api/v1/Agenda/BuscarPorStatusTipo', 'POST', payload)
      const ags = extractAgendamentos(data)
      if (ags.length > 0) {
        console.log(`[FluxoAvaliacao] ${ags.length} agendamentos encontrados`)
        return ags
      }
    } catch (e) {
      console.warn('[FluxoAvaliacao] payload falhou:', e.message)
    }
  }
  return []
}

export async function sincronizarFluxoPrevent() {
  const hoje = new Date()
  hoje.setHours(23, 59, 59, 0)
  const tresM = new Date()
  tresM.setMonth(tresM.getMonth() - 3)
  tresM.setHours(0, 0, 0, 0)

  const agendamentos = await buscarAgendamentosPrevent(tresM, hoje)
  if (agendamentos.length === 0) {
    return { criados: 0, atualizados: 0, ignorados: 0, aviso: 'Nenhum agendamento retornado pelo ProDoctor' }
  }

  const porPaciente = {}
  for (const ag of agendamentos) {
    if (!isPreventSenior(ag)) continue
    const { id, nome } = getPacienteInfo(ag)
    if (!id) continue
    if (!porPaciente[id]) porPaciente[id] = { nome, consultas: [], retornos: [] }
    const dt = getConsultaDate(ag)
    if (!dt) continue
    if (isConsultaContavel(ag))    porPaciente[id].consultas.push({ data: dt, tipo: getTipoNome(ag) })
    else if (isRetornoFinal(ag))   porPaciente[id].retornos.push({ data: dt, hora: ag.hora ?? '' })
  }

  const res = { criados: 0, atualizados: 0, ignorados: 0 }

  for (const [pacienteId, dados] of Object.entries(porPaciente)) {
    const consultas = dados.consultas.sort((a, b) => a.data - b.data)
    if (consultas.length < 5) { res.ignorados++; continue }

    const quinta = consultas[4]
    if (quinta.data < DATA_CORTE) { res.ignorados++; continue }

    const devFutura = dados.retornos
      .filter(r => r.data > quinta.data)
      .sort((a, b) => a.data - b.data)[0]

    const q = query(collection(db, 'correcoes'), where('pacienteCodigo', '==', pacienteId))
    const snap = await getDocs(q)

    const base = {
      pacienteCodigo:    pacienteId,
      paciente:          dados.nome,
      convenio:          'prevent_senior',
      dataCorte:         quinta.data,
      consultasContadas: consultas.map(c => c.data),
      dataDevolutiva:    devFutura?.data ?? null,
      atualizadoEm:      serverTimestamp(),
    }

    if (snap.empty) {
      await addDoc(collection(db, 'correcoes'), {
        ...base,
        etapaAtual:           'aguardando_correcao',
        profissionalId:       null,
        profissionalNome:     null,
        profissionalUid:      null,
        estagiarioId:         null,
        estagiarioNome:       null,
        anamnese_preenchida:  false,
        entregueEmCorrecaoEm: null,
        assumidoEm:           null,
        finalizadoEm:         null,
        aprovadoEm:           null,
        criadoEm:             serverTimestamp(),
        origem:               'prodoctor_auto',
      })
      res.criados++
    } else {
      await updateDoc(doc(db, 'correcoes', snap.docs[0].id), base)
      res.atualizados++
    }
  }

  return res
}

export async function marcarAnamnesePreenchida(pacienteCodigo) {
  if (!pacienteCodigo) return
  try {
    const q = query(collection(db, 'correcoes'), where('pacienteCodigo', '==', String(pacienteCodigo)))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await updateDoc(doc(db, 'correcoes', snap.docs[0].id), {
        anamnese_preenchida:  true,
        anamnesePreenchidaEm: serverTimestamp(),
      })
    }
  } catch (e) {
    console.warn('[FluxoAvaliacao] marcarAnamnesePreenchida:', e.message)
  }
}
