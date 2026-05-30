/**
 * Página de diagnóstico — NÃO altera nenhuma lógica de produção.
 * Acesse em /diagnostico (somente admin).
 * Mostra relatório completo dos pacientes Prevent Sênior e por que
 * apenas alguns estão no fluxo de correção.
 */
import React, { useState } from 'react'
import { getAgendaDay, listProfessionals } from '@/services/prodoctorApi'

// ── Mesmos parâmetros do fluxoAvaliacaoService ──────────────────────────────
const DIAS_PASSADO  = 90
const DIAS_FUTURO   = 90
const BATCH_DIAS    = 14
const DATA_CORTE    = new Date('2026-02-28T00:00:00')
const CICLO_INICIO  = new Date('2026-02-28T00:00:00')

// ── Helpers (cópia fiel dos helpers internos do serviço) ────────────────────
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

function getTipoNome(ag) {
  return (
    ag.tipoConsulta?.nome ?? ag.tipo?.nome ?? ag.tipoAtendimento?.nome ??
    ag.descricaoTipo ?? ag.descricao ?? ''
  ).toLowerCase()
}

function isPreventSenior(ag) {
  return JSON.stringify(ag).toLowerCase().includes('prevent')
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
  if (t.includes('retorno') || t.includes('devolutiva')) return true
  // fallback: busca no JSON completo (cobre campos de tipo não mapeados)
  const raw = JSON.stringify(ag).toLowerCase()
  return raw.includes('devolutiva') || raw.includes('"retorno"') || raw.includes("'retorno'")
}

function fmtDate(d) {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR')
}

// ── Lógica principal de diagnóstico ────────────────────────────────────────
async function executarDiagnostico(onProgress) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const hojeMax = new Date(); hojeMax.setHours(23, 59, 59, 999)

  // 1 — Profissionais
  onProgress('Buscando profissionais...')
  const profData = await listProfessionals()
  const professionals = profData
    .map(p => ({ id: String(p.codigo ?? p.id ?? ''), nome: p.nome ?? p.nomeCivil ?? '' }))
    .filter(p => p.id)
  onProgress(`${professionals.length} profissionais encontrados. Buscando agendamentos...`)

  // 2 — Agendamentos (mesmo range do serviço: -90 / +90 dias)
  const totalDias = DIAS_PASSADO + DIAS_FUTURO + 1
  const dias = Array.from({ length: totalDias }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - DIAS_PASSADO + i)
    d.setHours(12, 0, 0, 0)
    return d
  })

  const todos = []
  for (let pi = 0; pi < professionals.length; pi++) {
    const prof = professionals[pi]
    if (pi > 0) await sleep(1000)
    onProgress(`Prof ${pi + 1}/${professionals.length}: ${prof.nome}`)
    for (let b = 0; b < dias.length; b += BATCH_DIAS) {
      const lote = dias.slice(b, b + BATCH_DIAS)
      const res = await Promise.all(
        lote.map(async dia => {
          const ags = await getAgendaDay(prof.id, dia)
          return ags.map(ag => ({ ...ag, _diaLoop: dia, _profNome: prof.nome }))
        })
      )
      todos.push(...res.flat())
    }
  }
  onProgress(`${todos.length} agendamentos totais. Processando...`)

  // ── DIAGNÓSTICO A: tipos de procedimento distintos ─────────────────────
  console.clear()
  console.log('%c=== DIAGNÓSTICO ProDoctor — TIPOS DE PROCEDIMENTO ===', 'font-size:13px;font-weight:bold;color:#F59E0B')
  const tiposDistintos = new Map()
  for (const ag of todos) {
    const t = getTipoNome(ag)
    const label = t || '(vazio)'
    tiposDistintos.set(label, (tiposDistintos.get(label) ?? 0) + 1)
  }
  console.log('Valores encontrados nos campos tipoConsulta.nome / tipo.nome / tipoAtendimento.nome / descricaoTipo / descricao:')
  ;[...tiposDistintos.entries()].sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  "${t}"  →  ${n} agendamento(s)`))

  // ── DIAGNÓSTICO B: JSON completo de 1 agendamento de paciente Prevent ──
  const agPrevent = todos.filter(ag => ag.paciente && isPreventSenior(ag))
  console.log(`\n%c=== AGENDAMENTOS PREVENT ENCONTRADOS: ${agPrevent.length} ===`, 'font-weight:bold;color:#3B82F6')
  if (agPrevent.length > 0) {
    const ag0 = agPrevent[0]
    const nomePac = ag0.paciente?.nome ?? ag0.paciente?.nomeCivil ?? '(sem nome)'
    console.log(`\nJSON completo do 1º agendamento Prevent (paciente: ${nomePac}):`)
    console.log(JSON.stringify(ag0, null, 2))
    console.log('\nCampos de tipo extraídos:')
    console.log('  tipoConsulta  :', ag0.tipoConsulta)
    console.log('  tipo          :', ag0.tipo)
    console.log('  tipoAtendimento:', ag0.tipoAtendimento)
    console.log('  descricaoTipo :', ag0.descricaoTipo)
    console.log('  descricao     :', ag0.descricao)
  }

  // ── DIAGNÓSTICO C: candidatos a retorno/devolutiva ─────────────────────
  console.log('\n%c=== CANDIDATOS A RETORNO/DEVOLUTIVA ===', 'font-weight:bold;color:#8B5CF6')
  const candidatos = todos.filter(ag => {
    const raw = JSON.stringify(ag).toLowerCase()
    return raw.includes('retorn') || raw.includes('devolut')
  })
  if (candidatos.length === 0) {
    console.log('%c⚠️ Nenhum agendamento contém "retorn" ou "devolut" em nenhum campo!', 'color:#EF4444;font-size:12px;font-weight:bold')
    console.log('→ Os agendamentos de retorno/devolutiva podem não estar sendo retornados pela API ProDoctor.')
    console.log('→ Verifique se o endpoint /api/v1/Agenda/Listar inclui esses tipos de consulta.')
  } else {
    console.log(`${candidatos.length} agendamento(s) com "retorn" ou "devolut" encontrado(s):`)
    candidatos.slice(0, 3).forEach((ag, i) => {
      const nomePac = ag.paciente?.nome ?? ag.paciente?.nomeCivil ?? '(sem nome)'
      console.log(`\n--- Candidato ${i + 1} — paciente: ${nomePac} ---`)
      console.log(JSON.stringify(ag, null, 2))
    })
  }
  console.log('\n%c=== FIM DOS DIAGNÓSTICOS — PROCESSANDO FLUXO ===', 'color:#4CAF50;font-weight:bold')
  // ── FIM DOS DIAGNÓSTICOS ───────────────────────────────────────────────

  // 3 — Identificar IDs de pacientes Prevent
  const preventIds = new Set()
  for (const ag of todos) {
    if (!ag.paciente) continue
    if (!isPreventSenior(ag)) continue
    if (!isConsultaContavel(ag)) continue
    const id = String(ag.paciente?.codigo ?? ag.paciente?.id ?? '')
    if (id) preventIds.add(id)
  }

  // 4 — Agrupar testagens e retornos por paciente
  const porPaciente = {}
  for (const ag of todos) {
    if (!ag.paciente) continue
    const id = String(ag.paciente?.codigo ?? ag.paciente?.id ?? '')
    if (!id || !preventIds.has(id)) continue
    if (!porPaciente[id]) {
      porPaciente[id] = {
        id,
        nome:        ag.paciente?.nome ?? ag.paciente?.nomeCivil ?? '(sem nome)',
        profissional: null,
        testagens:   [],
        retornos:    [],
      }
    }
    if (ag._profNome && isConsultaContavel(ag) && !porPaciente[id].profissional) {
      porPaciente[id].profissional = ag._profNome
    }
    const dtRaw = ag.data ?? ag.dataConsulta ?? ag.dataAgendamento ?? null
    const dt = dtRaw ? parseDate(String(dtRaw)) : ag._diaLoop
    if (!dt) continue
    if (isRetornoFinal(ag))          porPaciente[id].retornos.push({ data: dt, hora: ag.hora ?? '' })
    else if (isConsultaContavel(ag)) porPaciente[id].testagens.push(dt)
  }

  // 5 — Montar relatório por paciente
  const relatorio = []
  for (const [, dados] of Object.entries(porPaciente)) {
    // Todas do ciclo atual (>= CICLO_INICIO)
    const doCiclo   = dados.testagens.filter(d => d >= CICLO_INICIO).sort((a, b) => a - b)
    // Passadas (realizadas): até hoje
    const passadas  = doCiclo.filter(d => d <= hojeMax)
    // Futuras agendadas: depois de hoje
    const futuras   = doCiclo.filter(d => d > hojeMax)
    // Próxima futura
    const proximaFutura = futuras[0] ?? null
    // Devolutiva: prefere futura; se não houver, mostra a mais recente passada
    const retornosFuturos  = dados.retornos.filter(r => r.data > hojeMax).sort((a, b) => a.data - b.data)
    const retornosPassados = dados.retornos.filter(r => r.data <= hojeMax).sort((a, b) => b.data - a.data)
    const proximoRetorno   = retornosFuturos[0] ?? retornosPassados[0] ?? null
    const retornoFuturo    = !!retornosFuturos[0]

    // Motivo de estar (ou não) no fluxo
    let motivo
    const quinta = passadas[4] ?? null
    if (passadas.length >= 5 && quinta && quinta >= DATA_CORTE) {
      motivo = '✅ DEVERIA ESTAR NO FLUXO'
    } else if (passadas.length >= 5 && quinta) {
      motivo = `⚠️ 5ª testagem antes da data de corte (${fmtDate(quinta)} < 01/06)`
    } else if (doCiclo.length >= 5) {
      motivo = `⏳ 5ª testagem futura: ${fmtDate(futuras[0])}`
    } else {
      motivo = `❌ ${passadas.length} testagem(ns) concluída(s) — aguardando ${5 - passadas.length} mais`
    }

    relatorio.push({
      nome:           dados.nome,
      profissional:   dados.profissional ?? '—',
      passadas:       passadas.length,
      futuras:        futuras.length,
      proximaFutura,
      proximoRetorno,
      retornoFuturo,
      todasDoCiclo:   doCiclo,
      motivo,
    })
  }

  // Ordenar: quem tem mais testagens primeiro
  relatorio.sort((a, b) => b.passadas - a.passadas || a.nome.localeCompare(b.nome))

  // 6 — Log completo no console
  console.clear()
  console.log('%c═══ DIAGNÓSTICO PREVENT SÊNIOR ═══', 'font-size:14px;font-weight:bold;color:#4CAF50')
  console.log(`Período analisado: ${fmtDate(CICLO_INICIO)} → hoje`)
  console.log(`Data de corte (5ª ≥): ${fmtDate(DATA_CORTE)}`)
  console.log(`Total de pacientes Prevent: ${relatorio.length}`)
  console.log(`Em análise: ${relatorio.filter(r => r.motivo.startsWith('✅')).length} deveria(m) estar no fluxo`)
  console.log('─'.repeat(110))
  console.log(
    'NOME'.padEnd(38),
    'PROFISSIONAL'.padEnd(28),
    'TEST.'.padEnd(8),
    'FUT.'.padEnd(6),
    'PRÓX.TESTAGEM'.padEnd(16),
    'DEVOLUTIVA'.padEnd(20),
    'STATUS',
  )
  console.log('─'.repeat(130))

  function fmtDev(r) {
    if (!r?.data) return '—'
    return (fmtDate(r.data) + (r.hora ? ' ' + r.hora : '')).trim()
  }

  for (const r of relatorio) {
    console.log(
      r.nome.substring(0, 37).padEnd(38),
      (r.profissional || '—').substring(0, 27).padEnd(28),
      String(r.passadas).padEnd(8),
      String(r.futuras).padEnd(6),
      fmtDate(r.proximaFutura).padEnd(16),
      fmtDev(r.proximoRetorno).padEnd(20),
      r.motivo,
    )
  }

  console.log('─'.repeat(120))
  const noFluxo = relatorio.filter(r => r.motivo.startsWith('✅'))
  if (noFluxo.length === 0) {
    console.log('%c⚠️ Nenhum paciente atende todos os critérios do fluxo!', 'color:#F59E0B;font-weight:bold')
  } else {
    console.log(`%c✅ ${noFluxo.length} paciente(s) deveria(m) estar no fluxo:`, 'color:#4CAF50;font-weight:bold')
    noFluxo.forEach(r => console.log(`   → ${r.nome} | ${r.passadas} testagens | 5ª: ${fmtDate(r.todasDoCiclo[4])} | devolutiva: ${fmtDev(r.proximoRetorno)}`))
  }

  console.log('\n%c📊 Distribuição por número de testagens concluídas:', 'font-weight:bold')
  for (let n = 5; n >= 0; n--) {
    const grupo = relatorio.filter(r => r.passadas === n)
    if (grupo.length) console.log(`   ${n} testagens: ${grupo.length} paciente(s)`)
  }

  return relatorio
}

// ── Estilos ────────────────────────────────────────────────────────────────
const S = {
  bg:     '#0D1B2A',
  card:   '#1A2744',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  green:  '#4CAF50',
  amber:  '#F59E0B',
  red:    '#EF4444',
  blue:   '#3B82F6',
}

function Badge({ texto, cor }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 8,
      background: cor + '22', color: cor,
      border: `1px solid ${cor}44`,
      whiteSpace: 'nowrap',
    }}>{texto}</span>
  )
}

function exportarCSV(relatorio) {
  const header = ['Paciente', 'Profissional', 'Testagens realizadas', 'Testagens futuras', 'Próxima testagem', 'Devolutiva', 'Status']
  const fmtD = d => d ? d.toLocaleDateString('pt-BR') : '—'
  const fmtR = r => r?.data ? (fmtD(r.data) + (r.hora ? ' ' + r.hora : '')) : '—'
  const rows = relatorio.map(r => [
    r.nome,
    r.profissional || '—',
    r.passadas,
    r.futuras,
    fmtD(r.proximaFutura),
    fmtR(r.proximoRetorno),
    r.motivo.replace(/[✅⏳❌⚠️]/g, '').trim(),
  ])
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prevent_senior_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Busca agendamentos de um paciente específico ────────────────────────────
async function buscarAgendamentosPaciente(codigoPaciente, diasPassado, diasFuturo, onProgress) {
  onProgress('Buscando profissionais...')
  const profData = await listProfessionals()
  const professionals = profData
    .map(p => ({ id: String(p.codigo ?? p.id ?? ''), nome: p.nome ?? p.nomeCivil ?? '' }))
    .filter(p => p.id)

  const hoje = new Date(); hoje.setHours(12, 0, 0, 0)
  const totalDias = diasPassado + diasFuturo + 1
  const dias = Array.from({ length: totalDias }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() - diasPassado + i)
    return d
  })

  const encontrados = []

  for (let pi = 0; pi < professionals.length; pi++) {
    const prof = professionals[pi]
    if (pi > 0) await sleep(1000)
    onProgress(`Profissional ${pi + 1}/${professionals.length}: ${prof.nome}`)

    for (let b = 0; b < dias.length; b += BATCH_DIAS) {
      const lote = dias.slice(b, b + BATCH_DIAS)
      const res = await Promise.all(
        lote.map(async dia => {
          const ags = await getAgendaDay(prof.id, dia)
          return ags
            .filter(ag => {
              const pid = String(ag.paciente?.codigo ?? ag.paciente?.id ?? '')
              return pid === String(codigoPaciente)
            })
            .map(ag => ({ ...ag, _diaLoop: dia, _profNome: prof.nome }))
        })
      )
      encontrados.push(...res.flat())
    }
  }

  encontrados.sort((a, b) => new Date(a._diaLoop) - new Date(b._diaLoop))
  return encontrados
}

export default function DiagnosticoPrevent() {
  const [rodando,   setRodando]   = useState(false)
  const [progresso, setProgresso] = useState('')
  const [relatorio, setRelatorio] = useState(null)
  const [erro,      setErro]      = useState('')
  const [busca,     setBusca]     = useState('')

  // ── Busca por paciente específico ─────────────────────────────────────────
  const [codigoPac,     setCodigoPac]     = useState('11507')
  const [diasPast,      setDiasPast]      = useState(180)
  const [diasFut,       setDiasFut]       = useState(180)
  const [buscandoPac,   setBuscandoPac]   = useState(false)
  const [agendamentos,  setAgendamentos]  = useState(null)
  const [erroPac,       setErroPac]       = useState('')
  const [progPac,       setProgPac]       = useState('')
  const [expandido,     setExpandido]     = useState(null)

  async function rodarBuscaPaciente() {
    setBuscandoPac(true); setErroPac(''); setAgendamentos(null); setExpandido(null)
    try {
      const ags = await buscarAgendamentosPaciente(codigoPac, diasPast, diasFut, msg => setProgPac(msg))
      setAgendamentos(ags)
      setProgPac(`Concluído — ${ags.length} agendamento(s) encontrado(s).`)
      console.log(`%c=== AGENDAMENTOS DO PACIENTE ${codigoPac} ===`, 'font-size:13px;font-weight:bold;color:#F59E0B')
      console.log(`Total: ${ags.length}`)
      ags.forEach((ag, i) => {
        console.log(`\n--- Agendamento ${i + 1} — ${ag._diaLoop?.toLocaleDateString('pt-BR')} (${ag._profNome}) ---`)
        console.log(JSON.stringify(ag, null, 2))
      })
    } catch (e) {
      setErroPac(e.message)
    } finally {
      setBuscandoPac(false)
    }
  }

  async function rodar() {
    setRodando(true)
    setErro('')
    setRelatorio(null)
    try {
      const r = await executarDiagnostico(msg => setProgresso(msg))
      setRelatorio(r)
      setProgresso(`Concluído — ${r.length} pacientes Prevent encontrados. Veja o console (F12) para o relatório completo.`)
    } catch (e) {
      setErro(e.message)
      setProgresso('')
    } finally {
      setRodando(false)
    }
  }

  const totalNoFluxo = relatorio?.filter(r => r.motivo.startsWith('✅')).length ?? 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          🔍 Diagnóstico — Pacientes Prevent Sênior
        </h1>
        <p style={{ fontSize: 12, color: S.muted }}>
          Relatório completo do ciclo {new Date('2026-02-28').toLocaleDateString('pt-BR')} → hoje.
          Nenhuma lógica de produção é alterada.
        </p>
      </div>

      {/* ── PAINEL: Busca agendamentos por paciente ── */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid rgba(245,158,11,0.3)`, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          🔎 Buscar agendamentos de paciente específico
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Código ProDoctor</div>
            <input value={codigoPac} onChange={e => setCodigoPac(e.target.value)} placeholder="ex: 11507"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 7, padding: '7px 12px', fontSize: 13, outline: 'none', width: 120 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Dias passado</div>
            <input type="number" value={diasPast} onChange={e => setDiasPast(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 7, padding: '7px 12px', fontSize: 13, outline: 'none', width: 90 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Dias futuro</div>
            <input type="number" value={diasFut} onChange={e => setDiasFut(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 7, padding: '7px 12px', fontSize: 13, outline: 'none', width: 90 }} />
          </div>
          <button onClick={rodarBuscaPaciente} disabled={buscandoPac || !codigoPac}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: buscandoPac ? 'rgba(245,158,11,0.3)' : '#D97706', color: '#fff', fontSize: 12, fontWeight: 700, cursor: buscandoPac ? 'not-allowed' : 'pointer' }}>
            {buscandoPac ? '⏳ Buscando...' : '▶ Buscar'}
          </button>
        </div>
        {progPac && <div style={{ fontSize: 12, color: S.muted, marginBottom: 8 }}>{progPac}</div>}
        {erroPac && <div style={{ fontSize: 12, color: S.red }}>{erroPac}</div>}

        {agendamentos !== null && (
          agendamentos.length === 0
            ? <div style={{ fontSize: 13, color: S.muted, padding: '10px 0' }}>Nenhum agendamento encontrado para o código {codigoPac} no período.</div>
            : <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: S.green, fontWeight: 700, marginBottom: 10 }}>
                  ✅ {agendamentos.length} agendamento(s) encontrado(s) — JSON completo também no console (F12)
                </div>
                {agendamentos.map((ag, i) => {
                  const dt = ag._diaLoop?.toLocaleDateString('pt-BR') ?? '—'
                  const tipo = (ag.tipoConsulta?.nome ?? ag.tipo?.nome ?? ag.tipoAtendimento?.nome ?? ag.descricaoTipo ?? ag.descricao ?? '(sem tipo)').substring(0, 60)
                  const aberto = expandido === i
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`, borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
                      <div onClick={() => setExpandido(aberto ? null : i)}
                        style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, minWidth: 90 }}>{dt}</span>
                        <span style={{ fontSize: 11, color: S.muted, minWidth: 160 }}>{ag._profNome}</span>
                        <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>{tipo}</span>
                        <span style={{ fontSize: 10, color: S.muted, marginLeft: 'auto' }}>{aberto ? '▲ fechar' : '▼ ver JSON'}</span>
                      </div>
                      {aberto && (
                        <pre style={{ margin: 0, padding: '10px 14px', fontSize: 10, color: '#93C5FD', background: 'rgba(0,0,0,0.3)', overflowX: 'auto', borderTop: `1px solid ${S.border}`, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(ag, null, 2)}
                        </pre>
                      )}
                    </div>
                  )
                })}
              </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={rodar}
          disabled={rodando}
          style={{
            padding: '10px 22px', borderRadius: 9, border: 'none',
            background: rodando ? 'rgba(46,125,50,0.4)' : '#2E7D32',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: rodando ? 'not-allowed' : 'pointer',
          }}
        >
          {rodando ? '⏳ Executando...' : '▶ Executar diagnóstico'}
        </button>

        {relatorio && (
          <button
            onClick={() => exportarCSV(relatorio)}
            style={{
              padding: '10px 18px', borderRadius: 9, border: '1px solid rgba(76,175,80,0.4)',
              background: 'rgba(76,175,80,0.1)', color: '#4CAF50',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ⬇ Exportar CSV
          </button>
        )}

        {progresso && (
          <span style={{ fontSize: 12, color: S.muted }}>{progresso}</span>
        )}
        {erro && (
          <span style={{ fontSize: 12, color: S.red }}>⚠️ {erro}</span>
        )}
      </div>

      {relatorio && (
        <>
          {/* Resumo */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Prevent', value: relatorio.length, cor: '#fff' },
              { label: 'Deveria estar no fluxo', value: totalNoFluxo, cor: S.green },
              { label: '4 testagens (falta 1)', value: relatorio.filter(r => r.passadas === 4).length, cor: S.amber },
              { label: '3 testagens', value: relatorio.filter(r => r.passadas === 3).length, cor: S.blue },
              { label: '< 3 testagens', value: relatorio.filter(r => r.passadas < 3).length, cor: S.muted },
            ].map(({ label, value, cor }) => (
              <div key={label} style={{
                background: S.card, borderRadius: 10, padding: '12px 18px',
                border: `1px solid ${S.border}`, minWidth: 140,
              }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: cor, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="🔍  Filtrar por nome do paciente..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', borderRadius: 8,
                padding: '9px 14px', fontSize: 13, outline: 'none',
              }}
            />
          </div>

          {/* Tabela */}
          <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1.2fr 90px 80px 110px 130px 1fr',
              padding: '10px 16px',
              borderBottom: `1px solid ${S.border}`,
              fontSize: 10, fontWeight: 700, color: S.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              gap: 8,
            }}>
              <span>Paciente</span>
              <span>Profissional</span>
              <span style={{ textAlign: 'center' }}>Realizadas</span>
              <span style={{ textAlign: 'center' }}>Futuras</span>
              <span>Próxima testagem</span>
              <span>Devolutiva</span>
              <span>Status</span>
            </div>

            {relatorio
              .filter(r => !busca || r.nome.toLowerCase().includes(busca.toLowerCase()))
              .map((r, idx) => {
              const bgRow = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
              let cor = S.muted
              if (r.motivo.startsWith('✅')) cor = S.green
              else if (r.motivo.startsWith('⏳')) cor = S.blue
              else if (r.passadas === 4)          cor = S.amber

              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1.2fr 90px 80px 110px 130px 1fr',
                  padding: '9px 16px', gap: 8,
                  background: bgRow,
                  borderBottom: `1px solid ${S.border}`,
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.nome}
                  </span>
                  <span style={{ fontSize: 11, color: S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.profissional}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: cor, textAlign: 'center' }}>
                    {r.passadas}
                  </span>
                  <span style={{ fontSize: 12, color: r.futuras > 0 ? S.blue : S.muted, textAlign: 'center' }}>
                    {r.futuras}
                  </span>
                  <span style={{ fontSize: 11, color: r.proximaFutura ? '#fff' : S.muted }}>
                    {fmtDate(r.proximaFutura)}
                  </span>
                  <span style={{ fontSize: 11, lineHeight: 1.4 }}>
                    {r.proximoRetorno ? (
                      <>
                        <span style={{ fontWeight: 700, color: r.retornoFuturo ? '#8B5CF6' : S.muted }}>
                          {fmtDate(r.proximoRetorno.data)}
                        </span>
                        {r.proximoRetorno.hora && (
                          <span style={{ display: 'block', fontSize: 10, color: r.retornoFuturo ? 'rgba(139,92,246,0.7)' : S.muted }}>
                            {r.proximoRetorno.hora}
                          </span>
                        )}
                        <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: r.retornoFuturo ? '#8B5CF6' : S.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {r.retornoFuturo ? 'agendado' : 'realizado'}
                        </span>
                      </>
                    ) : <span style={{ color: S.muted }}>—</span>}
                  </span>
                  <Badge texto={r.motivo} cor={cor} />
                </div>
              )
            })}
          </div>

        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
