import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAgendaDay, listProfessionals } from '@/services/prodoctorApi'

const DATA_CORTE = new Date('2026-06-01T00:00:00')

const DIAS_PASSADO = 90       // 3 meses atrás (consultas de testagem)
const DIAS_FUTURO  = 90       // 3 meses à frente (devolutivas agendadas)
const BATCH_DIAS   = 14       // dias em paralelo por lote (mesmo padrão getDevolutivas14Days)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

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
  // getAgendaDay retorna agendamentos de um dia específico, mas a data
  // vem do campo 'data' do próprio agendamento ou precisa ser inferida
  const raw = ag.data ?? ag.dataConsulta ?? ag.dataAgendamento ?? ag.dataHora ?? null
  return raw ? parseDate(String(raw)) : null
}

function getPacienteInfo(ag) {
  return {
    id:   String(ag.paciente?.codigo ?? ag.paciente?.id ?? ''),
    nome: ag.paciente?.nome ?? ag.paciente?.nomeCivil ?? '',
  }
}

/**
 * Busca agendamentos dos últimos DIAS_JANELA dias para todos os profissionais.
 * Usa exatamente o mesmo padrão de getAgendaDay que já funciona no projeto:
 *   POST /api/v1/Agenda/Listar com { Usuario, Data, LocalProDoctor }
 * Processa em lotes de BATCH_DIAS dias em paralelo por profissional,
 * com sleep(1s) entre profissionais para evitar rate limit.
 */
async function buscarTodosAgendamentos() {
  const profData = await listProfessionals()
  const professionals = profData.map(p => ({
    id:   String(p.codigo ?? p.id ?? ''),
    nome: p.nome ?? p.nomeCivil ?? '',
  })).filter(p => p.id)

  if (professionals.length === 0) {
    console.warn('[FluxoAvaliacao] nenhum profissional encontrado')
    return []
  }

  // Monta array: 3 meses atrás até 3 meses à frente
  const totalDias = DIAS_PASSADO + DIAS_FUTURO + 1
  const dias = Array.from({ length: totalDias }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - DIAS_PASSADO + i)
    d.setHours(12, 0, 0, 0)
    return d
  })

  const todos = []
  let totalChamadas = 0

  for (let pi = 0; pi < professionals.length; pi++) {
    const prof = professionals[pi]
    if (pi > 0) await sleep(1000)

    // Lotes de BATCH_DIAS dias em paralelo
    for (let batch = 0; batch < dias.length; batch += BATCH_DIAS) {
      const lote = dias.slice(batch, batch + BATCH_DIAS)
      const results = await Promise.all(
        lote.map(async (dia) => {
          totalChamadas++
          const ags = await getAgendaDay(prof.id, dia)
          // getAgendaDay retorna os agendamentos mas sem a data no objeto,
          // então injetamos a data do loop para facilitar o parseamento
          return ags.map(ag => ({ ...ag, _diaLoop: dia, _profId: prof.id }))
        })
      )
      todos.push(...results.flat())
    }
  }

  console.log(`[FluxoAvaliacao] ${totalChamadas} chamadas → ${todos.length} agendamentos totais (${professionals.length} profissionais, ${totalDias} dias)`)
  return todos
}

async function buildProfessionalsMap() {
  const [profSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'professionals')),
    getDocs(collection(db, 'users')),
  ])
  const emailToUser = {}
  usersSnap.docs.forEach(d => {
    const email = (d.data().email || '').toLowerCase()
    if (email) emailToUser[email] = { uid: d.id, name: d.data().full_name || '' }
  })
  const map = new Map()
  profSnap.docs.forEach(d => {
    const email = (d.data().email || '').toLowerCase()
    const found = emailToUser[email]
    if (found) map.set(d.id, { uid: found.uid, name: d.data().name || found.name })
  })
  return map
}

export async function sincronizarFluxoPrevent() {
  // Calcula o intervalo para exibir no diagnóstico
  const hoje = new Date()
  const inicio = new Date(); inicio.setDate(hoje.getDate() - DIAS_PASSADO)
  const fim    = new Date(); fim.setDate(hoje.getDate() + DIAS_FUTURO)
  const fmtDiag = (d) => d.toLocaleDateString('pt-BR')
  const intervalo = `${fmtDiag(inicio)} → ${fmtDiag(fim)}`

  const [agendamentos, profMap, patientsSnap] = await Promise.all([
    buscarTodosAgendamentos(),
    buildProfessionalsMap(),
    getDocs(collection(db, 'patients')),
  ])

  const prodoctorToPatientId = {}
  patientsSnap.docs.forEach(d => {
    const pid = d.data().prodoctor_id
    if (pid) prodoctorToPatientId[pid] = d.id
  })

  if (agendamentos.length === 0) {
    return { criados: 0, atualizados: 0, ignorados: 0, intervalo, totalAgendamentos: 0, totalPrevent: 0, aviso: 'Nenhum agendamento retornado pelo ProDoctor' }
  }

  // PASSO 1: identifica pacientes Prevent Sênior pelas consultas de testagem
  // (o agendamento de Retorno pode não ter "Prevent" no campo convênio)
  const preventIds = new Set()
  for (const ag of agendamentos) {
    if (!ag.paciente) continue
    if (!isPreventSenior(ag)) continue
    if (!isConsultaContavel(ag)) continue
    const { id } = getPacienteInfo(ag)
    if (id) preventIds.add(id)
  }

  // PASSO 2: para pacientes Prevent, processa TODOS os agendamentos
  // (incluindo Retornos que podem não ter "prevent" no campo convênio)
  const porPaciente = {}
  for (const ag of agendamentos) {
    if (!ag.paciente) continue
    const { id, nome } = getPacienteInfo(ag)
    if (!id || !preventIds.has(id)) continue

    if (!porPaciente[id]) porPaciente[id] = { nome, consultas: [], retornos: [], profId: null }
    if (ag._profId && isConsultaContavel(ag) && !porPaciente[id].profId) {
      porPaciente[id].profId = ag._profId
    }

    const dtRaw = ag.data ?? ag.dataConsulta ?? ag.dataAgendamento ?? null
    const dt = dtRaw ? parseDate(String(dtRaw)) : ag._diaLoop
    if (!dt) continue

    if (isRetornoFinal(ag))       porPaciente[id].retornos.push({ data: dt, hora: ag.hora ?? '' })
    else if (isConsultaContavel(ag)) porPaciente[id].consultas.push({ data: dt, tipo: getTipoNome(ag) })
  }

  const totalPrevent = Object.keys(porPaciente).length
  console.log(`[FluxoAvaliacao] ${totalPrevent} pacientes Prevent Sênior encontrados`)

  const res = { criados: 0, atualizados: 0, ignorados: 0, intervalo, totalAgendamentos: agendamentos.length, totalPrevent }

  for (const [pacienteId, dados] of Object.entries(porPaciente)) {
    const consultas = dados.consultas.sort((a, b) => a.data - b.data)

    // Referência para buscar retorno após a última consulta
    const ultimaConsulta = consultas[consultas.length - 1]
    const devFutura = dados.retornos
      .filter(r => ultimaConsulta ? r.data > ultimaConsulta.data : true)
      .sort((a, b) => a.data - b.data)[0]

    // Verifica registro existente ANTES de aplicar data de corte
    const q = query(collection(db, 'correcoes'), where('pacienteCodigo', '==', pacienteId))
    const snap = await getDocs(q)

    // Registro existente → atualiza sempre (sem filtro de data de corte)
    // Garante que devolutivas futuras (ex: Maria Tegazzini 09/06) sejam gravadas
    if (!snap.empty) {
      const existente = snap.docs[0].data()
      const profInfo = dados.profId ? profMap.get(dados.profId) : null
      await updateDoc(doc(db, 'correcoes', snap.docs[0].id), {
        paciente:          dados.nome,
        consultasContadas: consultas.map(c => c.data),
        dataDevolutiva:    devFutura?.data ?? existente.dataDevolutiva ?? null,
        atualizadoEm:      serverTimestamp(),
        ...(profInfo ? { profissionalId: dados.profId, profissionalNome: profInfo.name, profissionalUid: profInfo.uid } : {}),
      })
      const fsPatientId = prodoctorToPatientId[pacienteId]
      if (fsPatientId && profInfo) {
        updateDoc(doc(db, 'patients', fsPatientId), { profissionalUid: profInfo.uid, profissionalNome: profInfo.name }).catch(() => {})
      }
      res.atualizados++
      continue
    }

    // Novo registro → aplica filtros de data de corte
    if (consultas.length < 5) { res.ignorados++; continue }
    const quinta = consultas[4]
    if (quinta.data < DATA_CORTE) { res.ignorados++; continue }

    const profInfo = dados.profId ? profMap.get(dados.profId) : null
    await addDoc(collection(db, 'correcoes'), {
      pacienteCodigo:       pacienteId,
      paciente:             dados.nome,
      convenio:             'prevent_senior',
      dataCorte:            quinta.data,
      consultasContadas:    consultas.map(c => c.data),
      dataDevolutiva:       devFutura?.data ?? null,
      atualizadoEm:         serverTimestamp(),
      etapaAtual:           'aguardando_correcao',
      profissionalId:       profInfo ? dados.profId    : null,
      profissionalNome:     profInfo ? profInfo.name   : null,
      profissionalUid:      profInfo ? profInfo.uid    : null,
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
    const fsPatientId = prodoctorToPatientId[pacienteId]
    if (fsPatientId && profInfo) {
      updateDoc(doc(db, 'patients', fsPatientId), { profissionalUid: profInfo.uid, profissionalNome: profInfo.name }).catch(() => {})
    }
    res.criados++
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
