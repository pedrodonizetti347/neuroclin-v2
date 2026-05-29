import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAgendaDay, listProfessionals } from '@/services/prodoctorApi'

const DATA_CORTE = new Date('2026-05-29T00:00:00') // TEMPORÁRIO para testes — voltar para 2026-06-01

const DIAS_JANELA = 90        // últimos 3 meses
const BATCH_DIAS  = 14        // dias em paralelo por lote (mesmo padrão getDevolutivas14Days)

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

  // Monta array dos últimos DIAS_JANELA dias
  const dias = Array.from({ length: DIAS_JANELA }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (DIAS_JANELA - 1 - i))
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
          return ags.map(ag => ({ ...ag, _diaLoop: dia }))
        })
      )
      todos.push(...results.flat())
    }
  }

  console.log(`[FluxoAvaliacao] ${totalChamadas} chamadas → ${todos.length} agendamentos totais (${professionals.length} profissionais, ${DIAS_JANELA} dias)`)
  return todos
}

export async function sincronizarFluxoPrevent() {
  const agendamentos = await buscarTodosAgendamentos()

  if (agendamentos.length === 0) {
    return { criados: 0, atualizados: 0, ignorados: 0, aviso: 'Nenhum agendamento retornado pelo ProDoctor' }
  }

  // Agrupa por paciente, filtrando apenas Prevent Sênior
  const porPaciente = {}
  for (const ag of agendamentos) {
    if (!ag.paciente) continue
    if (!isPreventSenior(ag)) continue

    const { id, nome } = getPacienteInfo(ag)
    if (!id) continue

    if (!porPaciente[id]) porPaciente[id] = { nome, consultas: [], retornos: [] }

    // Usa a data do loop (_diaLoop) como fallback quando o campo 'data' está ausente
    const dtRaw = ag.data ?? ag.dataConsulta ?? ag.dataAgendamento ?? null
    const dt = dtRaw ? parseDate(String(dtRaw)) : ag._diaLoop
    if (!dt) continue

    if (isConsultaContavel(ag))  porPaciente[id].consultas.push({ data: dt, tipo: getTipoNome(ag) })
    else if (isRetornoFinal(ag)) porPaciente[id].retornos.push({ data: dt, hora: ag.hora ?? '' })
  }

  const totalPrevent = Object.keys(porPaciente).length
  console.log(`[FluxoAvaliacao] ${totalPrevent} pacientes Prevent Sênior encontrados`)

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
