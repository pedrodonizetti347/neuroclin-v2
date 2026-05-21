// src/components/tests/TestStatusPanel.jsx
// Painel de visualização e validação — NÃO altera nada existente
// Apenas lê os dados já salvos no Firestore e exibe o status

import React, { useState } from 'react'
import { validateTest, TEST_RULES } from '@/utils/testValidationRules'
import { CheckCircle2, AlertTriangle, Clock, Circle } from 'lucide-react'

const S = {
  bg:     '#0D1B2A',
  card:   '#1A2744',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  amber:  '#F59E0B',
  red:    '#EF4444',
}

// Agrupa os testes por categoria para exibição
const GROUPS = [
  { label: 'Rastreio Cognitivo', keys: ['MoCA', 'NEUPSILIN', 'TRIACOG'] },
  { label: 'Memória',            keys: ['RAVLT', 'BAMS', 'MEMIMP'] },
  { label: 'Funções Executivas', keys: ['FAB', 'WCST', 'WCST-N', 'DEX'] },
  { label: 'Linguagem',          keys: ['TOKEN'] },
  { label: 'Inteligência',       keys: ['WASI', 'WASI-III'] },
  { label: 'Humor',              keys: ['GDS-15', 'BDI-II', 'HAD'] },
  { label: 'Ansiedade',          keys: ['GAI', 'IDATE-E', 'IDATE-T'] },
  { label: 'Funcional / Informante', keys: ['IQCODE', 'B-ADL', 'Pfeffer', 'Lawton', 'PCRS'] },
]

function StatusIcon({ status }) {
  if (status === 'complete')    return <CheckCircle2 size={14} color={S.greenL} />
  if (status === 'warning')     return <AlertTriangle size={14} color={S.amber} />
  if (status === 'inProgress')  return <Clock size={14} color={S.amber} />
  return <Circle size={14} color={S.muted} />
}

function StatusBadge({ status, label }) {
  const styles = {
    complete:   { bg: 'rgba(46,125,50,0.2)',   color: '#4CAF50', text: 'Concluído' },
    warning:    { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B', text: 'Dados faltando' },
    inProgress: { bg: 'rgba(59,130,246,0.2)',  color: '#93C5FD', text: 'Em andamento' },
    absent:     { bg: 'rgba(255,255,255,0.05)', color: S.muted,  text: 'Não aplicado' },
  }
  const s = styles[status] || styles.absent
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
      background: s.bg, color: s.color,
    }}>{s.text}</span>
  )
}

export default function TestStatusPanel({ sessionTests, patientName }) {
  const [expanded, setExpanded] = useState({})

  if (!sessionTests) return null

  // Conta totais para o resumo
  let totalApplied = 0, totalComplete = 0, totalWarning = 0

  const groupsData = GROUPS.map(group => ({
    ...group,
    items: group.keys.map(key => {
      const data = sessionTests[key]
      const validation = validateTest(key, data)
      const rule = TEST_RULES[key]

      let status = 'absent'
      if (validation.present) {
        totalApplied++
        if (validation.complete) { status = 'complete'; totalComplete++ }
        else if (validation.missing.length > 0) { status = 'warning'; totalWarning++ }
        else { status = 'inProgress' }
      }

      return { key, label: rule?.label || key, status, validation, data }
    }).filter(item => item.status !== 'absent' || item.validation.present),
  })).filter(group => group.items.length > 0)

  const toggleGroup = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }))

  return (
    <div style={{
      background: S.card, borderRadius: 10,
      border: `1px solid ${S.border}`, padding: '16px 20px', marginBottom: 16,
    }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Painel de Testes {patientName ? `— ${patientName}` : ''}
          </div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>
            {totalApplied} aplicado{totalApplied !== 1 ? 's' : ''} · {totalComplete} concluído{totalComplete !== 1 ? 's' : ''} · {totalWarning} com pendência
          </div>
        </div>
        {totalWarning > 0 && (
          <div style={{
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8, padding: '6px 12px', fontSize: 11, color: S.amber, fontWeight: 700,
          }}>
            ⚠ {totalWarning} teste{totalWarning !== 1 ? 's' : ''} com dados incompletos
          </div>
        )}
      </div>

      {/* Se nenhum teste aplicado */}
      {totalApplied === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: S.muted, fontSize: 12 }}>
          Nenhum teste aplicado ainda para este paciente.
        </div>
      )}

      {/* Grupos de testes */}
      {groupsData.map(group => (
        <div key={group.label} style={{ marginBottom: 8 }}>
          {/* Cabeçalho do grupo */}
          <button
            onClick={() => toggleGroup(group.label)}
            style={{
              width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${S.border}`, borderRadius: 7, padding: '8px 12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {group.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: S.muted }}>{group.items.length} teste{group.items.length !== 1 ? 's' : ''}</span>
              <span style={{ color: S.muted, fontSize: 12 }}>{expanded[group.label] ? '▲' : '▼'}</span>
            </div>
          </button>

          {/* Itens do grupo */}
          {expanded[group.label] && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {group.items.map(item => (
                <div key={item.key} style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: item.status === 'warning' ? 'rgba(245,158,11,0.06)' :
                              item.status === 'complete' ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
                  border: item.status === 'warning' ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusIcon status={item.status} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</span>
                      {item.data?.total_score != null && (
                        <span style={{ fontSize: 11, color: S.muted }}>
                          Score: {item.data.total_score}
                        </span>
                      )}
                      {item.data?.classification && (
                        <span style={{ fontSize: 10, color: S.greenL }}>{item.data.classification}</span>
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  {/* Alertas de campos faltando */}
                  {item.status === 'warning' && item.validation.missingLabels.length > 0 && (
                    <div style={{
                      marginTop: 6, fontSize: 11, color: S.amber,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <AlertTriangle size={11} />
                      Faltando: {item.validation.missingLabels.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
