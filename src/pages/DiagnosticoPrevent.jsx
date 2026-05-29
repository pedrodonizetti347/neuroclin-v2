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
const DATA_CORTE    = new Date('2026-06-01T00:00:00')
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
  return t.includes('retorno') || t.includes('devolutiva')
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
        nome: ag.paciente?.nome ?? ag.paciente?.nomeCivil ?? '(sem nome)',
        testagens: [],
        retornos:  [],
      }
    }
    const dtRaw = ag.data ?? ag.dataConsulta ?? ag.dataAgendamento ?? null
    const dt = dtRaw ? parseDate(String(dtRaw)) : ag._diaLoop
    if (!dt) continue
    if (isRetornoFinal(ag))        porPaciente[id].retornos.push(dt)
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
    // Próximo retorno futuro
    const proximoRetorno = dados.retornos.filter(d => d > hojeMax).sort((a, b) => a - b)[0] ?? null

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
      passadas:       passadas.length,
      futuras:        futuras.length,
      proximaFutura,
      proximoRetorno,
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
    'NOME'.padEnd(42),
    'TESTAGENS'.padEnd(12),
    'FUTURAS'.padEnd(10),
    'PRÓXIMA'.padEnd(14),
    'RETORNO'.padEnd(14),
    'STATUS',
  )
  console.log('─'.repeat(110))

  for (const r of relatorio) {
    console.log(
      r.nome.substring(0, 41).padEnd(42),
      String(r.passadas).padEnd(12),
      String(r.futuras).padEnd(10),
      (fmtDate(r.proximaFutura)).padEnd(14),
      (fmtDate(r.proximoRetorno)).padEnd(14),
      r.motivo,
    )
  }

  console.log('─'.repeat(110))
  const noFluxo = relatorio.filter(r => r.motivo.startsWith('✅'))
  if (noFluxo.length === 0) {
    console.log('%c⚠️ Nenhum paciente atende todos os critérios do fluxo!', 'color:#F59E0B;font-weight:bold')
  } else {
    console.log(`%c✅ ${noFluxo.length} paciente(s) deveria(m) estar no fluxo:`, 'color:#4CAF50;font-weight:bold')
    noFluxo.forEach(r => console.log(`   → ${r.nome} | ${r.passadas} testagens | 5ª: ${fmtDate(r.todasDoCiclo[4])} | retorno: ${fmtDate(r.proximoRetorno)}`))
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

export default function DiagnosticoPrevent() {
  const [rodando,   setRodando]   = useState(false)
  const [progresso, setProgresso] = useState('')
  const [relatorio, setRelatorio] = useState(null)
  const [erro,      setErro]      = useState('')

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

          {/* Tabela */}
          <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 90px 80px 110px 110px 1fr',
              padding: '10px 16px',
              borderBottom: `1px solid ${S.border}`,
              fontSize: 10, fontWeight: 700, color: S.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              gap: 8,
            }}>
              <span>Paciente</span>
              <span style={{ textAlign: 'center' }}>Realizadas</span>
              <span style={{ textAlign: 'center' }}>Futuras</span>
              <span>Próxima testagem</span>
              <span>Próx. retorno</span>
              <span>Status</span>
            </div>

            {relatorio.map((r, idx) => {
              const bgRow = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
              let cor = S.muted
              if (r.motivo.startsWith('✅')) cor = S.green
              else if (r.motivo.startsWith('⏳')) cor = S.blue
              else if (r.passadas === 4)          cor = S.amber

              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 90px 80px 110px 110px 1fr',
                  padding: '9px 16px', gap: 8,
                  background: bgRow,
                  borderBottom: `1px solid ${S.border}`,
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.nome}
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
                  <span style={{ fontSize: 11, color: r.proximoRetorno ? '#8B5CF6' : S.muted }}>
                    {fmtDate(r.proximoRetorno)}
                  </span>
                  <Badge texto={r.motivo} cor={cor} />
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 11, color: S.muted, marginTop: 12 }}>
            💡 Abra o console (F12) para o relatório tabulado completo, pronto para copiar.
          </p>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
