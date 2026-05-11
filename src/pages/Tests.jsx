import React, { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTestSession } from '@/hooks/useTestSession'
import { FlaskConical, Save, CheckCircle2, User, ChevronRight } from 'lucide-react'

const S = {
  card: '#1A2744', cardG: '#1A3D2B', green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
  amber: '#F59E0B', blue: '#60A5FA',
}

const TESTS_CONFIG = [
  {
    key: 'RAVLT', label: 'RAVLT', group: 'Memória', desc: 'Rey Auditory Verbal Learning Test',
    fields: [
      { key: 'a1', label: 'A1 — 1ª tentativa', max: 15 },
      { key: 'a2', label: 'A2 — 2ª tentativa', max: 15 },
      { key: 'a3', label: 'A3 — 3ª tentativa', max: 15 },
      { key: 'a4', label: 'A4 — 4ª tentativa', max: 15 },
      { key: 'a5', label: 'A5 — 5ª tentativa', max: 15 },
      { key: 'b1', label: 'Lista B (interferência)', max: 15 },
      { key: 'a6', label: 'A6 — imediata pós-B', max: 15 },
      { key: 'a7', label: 'A7 — recordação tardia', max: 15 },
      { key: 'reconhecimento', label: 'Reconhecimento', max: 30 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Total A1–A5', value: ['a1','a2','a3','a4','a5'].reduce((s,k)=>s+(+d[k]||0),0), max: 75 },
      { label: 'Curva', value: `${d.a1||0}→${d.a2||0}→${d.a3||0}→${d.a4||0}→${d.a5||0}` },
    ]
  },
  {
    key: 'NEUPSILIN', label: 'NEUPSILIN', group: 'Bateria Cognitiva', desc: 'Avaliação Neuropsicológica Breve',
    fields: [
      { key: 'orientacao_temporal', label: 'Orientação temporal', max: 4 },
      { key: 'orientacao_espacial', label: 'Orientação espacial', max: 4 },
      { key: 'atencao', label: 'Atenção/concentração', max: 10 },
      { key: 'dig_direto', label: 'Dígitos span direto', max: 9 },
      { key: 'dig_inverso', label: 'Dígitos span inverso', max: 8 },
      { key: 'mev_imediata', label: 'Mem. episódica verbal imediata', max: 10 },
      { key: 'mev_tardia', label: 'Mem. episódica verbal tardia', max: 10 },
      { key: 'mevis_imediata', label: 'Mem. episódica visual imediata', max: 3 },
      { key: 'mevis_tardia', label: 'Mem. episódica visual tardia', max: 3 },
      { key: 'mem_semantica', label: 'Memória semântica', max: 10 },
      { key: 'mem_prospectiva', label: 'Memória prospectiva', max: 2 },
      { key: 'linguagem_oral', label: 'Linguagem oral', max: 20 },
      { key: 'linguagem_escrita', label: 'Linguagem escrita', max: 10 },
      { key: 'habilidades_aritmeticas', label: 'Habilidades aritméticas', max: 4 },
      { key: 'percepcao_visual', label: 'Percepção visual', max: 10 },
      { key: 'visuoespacial', label: 'Habilidades visuoespaciais', max: 10 },
      { key: 'praxias', label: 'Praxias', max: 20 },
      { key: 'funcoes_executivas', label: 'Funções executivas', max: 10 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ]
  },
  {
    key: 'WASI-III', label: 'WASI-III', group: 'Inteligência', desc: 'Wechsler Abbreviated Scale of Intelligence',
    fields: [
      { key: 'vocab_bruto', label: 'Vocabulário — pontuação bruta', max: 80 },
      { key: 'vocab_ponderado', label: 'Vocabulário — pontuação ponderada', max: 19 },
      { key: 'cubos_bruto', label: 'Cubos — pontuação bruta', max: 71 },
      { key: 'cubos_ponderado', label: 'Cubos — pontuação ponderada', max: 19 },
      { key: 'matrices_bruto', label: 'Raciocínio matricial — bruto', max: 35 },
      { key: 'matrices_ponderado', label: 'Raciocínio matricial — ponderado', max: 19 },
      { key: 'semelhancas_bruto', label: 'Semelhanças — bruto', max: 36 },
      { key: 'semelhancas_ponderado', label: 'Semelhanças — ponderado', max: 19 },
      { key: 'qi_verbal', label: 'QI Verbal (VCI)', max: 160 },
      { key: 'qi_execucao', label: 'QI de Execução (PRI)', max: 160 },
      { key: 'qi_total', label: 'QI Total (FSIQ-4)', max: 160 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ]
  },
  {
    key: 'WCST-N', label: 'WCST-N', group: 'Funções Executivas', desc: 'Wisconsin Card Sorting Test — Nelson',
    fields: [
      { key: 'tentativas_total', label: 'Total de tentativas', max: 128 },
      { key: 'categorias', label: 'Categorias completadas', max: 6 },
      { key: 'erros_totais', label: 'Erros totais', max: 128 },
      { key: 'erros_perseverativos', label: 'Erros perseverativos', max: 128 },
      { key: 'erros_nao_perseverativos', label: 'Erros não-perseverativos', max: 128 },
      { key: 'respostas_perseverativas', label: 'Respostas perseverativas', max: 128 },
      { key: 'tentativas_1cat', label: 'Tentativas para 1ª categoria', max: 128 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ]
  },
  {
    key: 'FAB', label: 'FAB', group: 'Funções Executivas', desc: 'Frontal Assessment Battery',
    fields: [
      { key: 'semelhancas', label: 'Semelhanças (abstração)', max: 3 },
      { key: 'fluencia_lexical', label: 'Fluência lexical', max: 3 },
      { key: 'serie_motora', label: 'Série motora de Luria', max: 3 },
      { key: 'instrucoes_conflitantes', label: 'Instruções conflitantes', max: 3 },
      { key: 'go_no_go', label: 'Go–No-Go', max: 3 },
      { key: 'comportamento_preensao', label: 'Comportamento de preensão', max: 3 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Total FAB', value: ['semelhancas','fluencia_lexical','serie_motora','instrucoes_conflitantes','go_no_go','comportamento_preensao'].reduce((s,k)=>s+(+d[k]||0),0), max: 18, cutoff: '≥12 preservado' },
    ]
  },
  {
    key: 'GDS-15', label: 'GDS-15', group: 'Humor', desc: 'Escala de Depressão Geriátrica',
    fields: [
      { key: 'score_total', label: 'Pontuação total', max: 15 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    cutoff: '0–4 normal | 5–10 depressão leve | 11–15 depressão grave',
  },
  {
    key: 'GAI', label: 'GAI', group: 'Humor', desc: 'Geriatric Anxiety Inventory',
    fields: [
      { key: 'score_total', label: 'Pontuação total', max: 20 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    cutoff: '0–9 sem ansiedade | ≥10 ansiedade clinicamente significativa',
  },
  {
    key: 'BDI-II', label: 'BDI-II', group: 'Humor', desc: 'Inventário de Depressão de Beck — 2ª Edição',
    fields: [
      { key: 'score_total', label: 'Pontuação total', max: 63 },
      { key: 'subtotal_cognitivo', label: 'Subtotal cognitivo-afetivo', max: 42 },
      { key: 'subtotal_somatico', label: 'Subtotal somático', max: 21 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    cutoff: '0–13 mínimo | 14–19 leve | 20–28 moderado | 29–63 grave',
  },
  {
    key: 'HAD', label: 'HAD', group: 'Humor', desc: 'Escala Hospitalar de Ansiedade e Depressão',
    fields: [
      { key: 'ansiedade', label: 'Subescala Ansiedade', max: 21 },
      { key: 'depressao', label: 'Subescala Depressão', max: 21 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    cutoff: '0–7 normal | 8–10 leve | 11–14 moderado | 15–21 grave (por subescala)',
  },
  {
    key: 'IDATE', label: 'IDATE', group: 'Ansiedade', desc: 'Inventário de Ansiedade Traço-Estado',
    fields: [
      { key: 'estado', label: 'IDATE-E (Estado)', max: 80, min: 20 },
      { key: 'traco', label: 'IDATE-T (Traço)', max: 80, min: 20 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    cutoff: 'Pontos de corte por sexo e faixa etária (ver manual)',
  },
  {
    key: 'BAMS', label: 'BAMS', group: 'Memória', desc: 'Brief Autobiographical Memory Schedule',
    fields: [
      { key: 'mem_infancia', label: 'Memória episódica — infância', max: 9 },
      { key: 'mem_adulto', label: 'Memória episódica — adulto', max: 9 },
      { key: 'mem_recente', label: 'Memória episódica — recente', max: 9 },
      { key: 'semantica_pessoal', label: 'Memória semântica pessoal', max: 9 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Total BAMS', value: ['mem_infancia','mem_adulto','mem_recente','semantica_pessoal'].reduce((s,k)=>s+(+d[k]||0),0), max: 36 },
    ]
  },
  {
    key: 'TRIACOG', label: 'TRIACOG', group: 'Bateria Cognitiva', desc: 'Triagem Cognitiva Breve',
    fields: [
      { key: 'orientacao', label: 'Orientação', max: 10 },
      { key: 'memoria_imediata', label: 'Memória imediata', max: 3 },
      { key: 'atencao', label: 'Atenção/cálculo', max: 5 },
      { key: 'evocacao', label: 'Evocação', max: 3 },
      { key: 'linguagem', label: 'Linguagem', max: 8 },
      { key: 'praxia_construtiva', label: 'Praxia construtiva', max: 1 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Total TRIACOG', value: ['orientacao','memoria_imediata','atencao','evocacao','linguagem','praxia_construtiva'].reduce((s,k)=>s+(+d[k]||0),0), max: 30 },
    ]
  },
  {
    key: 'LAWTON', label: 'Lawton', group: 'Funcional', desc: 'Escala de Lawton — AIVDs',
    fields: [
      { key: 'telefone', label: 'Uso do telefone', max: 3 },
      { key: 'compras', label: 'Compras', max: 3 },
      { key: 'cozinhar', label: 'Preparo de alimentos', max: 3 },
      { key: 'tarefas_domesticas', label: 'Tarefas domésticas', max: 3 },
      { key: 'lavanderia', label: 'Lavanderia', max: 3 },
      { key: 'transporte', label: 'Transporte', max: 3 },
      { key: 'medicamentos', label: 'Uso de medicamentos', max: 3 },
      { key: 'financas', label: 'Finanças', max: 3 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Total AIVDs', value: ['telefone','compras','cozinhar','tarefas_domesticas','lavanderia','transporte','medicamentos','financas'].reduce((s,k)=>s+(+d[k]||0),0), max: 24 },
    ]
  },
  {
    key: 'BADL', label: 'BADL', group: 'Funcional', desc: 'Katz — Atividades Básicas de Vida Diária',
    fields: [
      { key: 'banho', label: 'Banho', max: 1 },
      { key: 'vestuario', label: 'Vestuário', max: 1 },
      { key: 'higiene_pessoal', label: 'Higiene pessoal', max: 1 },
      { key: 'transferencia', label: 'Transferência', max: 1 },
      { key: 'continencia', label: 'Continência', max: 1 },
      { key: 'alimentacao', label: 'Alimentação', max: 1 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Total BADL', value: ['banho','vestuario','higiene_pessoal','transferencia','continencia','alimentacao'].reduce((s,k)=>s+(+d[k]||0),0), max: 6 },
    ]
  },
  {
    key: 'PCRS', label: 'PCRS', group: 'Funcional', desc: 'Patient Competency Rating Scale',
    fields: [
      { key: 'auto_total', label: 'Auto-avaliação (total)', max: 150 },
      { key: 'informante_total', label: 'Avaliação do informante (total)', max: 150 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Discrepância', value: ((+d.auto_total||0) - (+d.informante_total||0)).toFixed(0) },
    ]
  },
  {
    key: 'TOKEN', label: 'Token Test', group: 'Linguagem', desc: 'Teste dos Tokens (De Renzi & Vignolo)',
    fields: [
      { key: 'parte1', label: 'Parte 1', max: 10 },
      { key: 'parte2', label: 'Parte 2', max: 10 },
      { key: 'parte3', label: 'Parte 3', max: 10 },
      { key: 'parte4', label: 'Parte 4', max: 10 },
      { key: 'parte5', label: 'Parte 5', max: 22 },
      { key: 'obs', label: 'Observações', type: 'text' },
    ],
    computed: d => [
      { label: 'Total Token', value: ['parte1','parte2','parte3','parte4','parte5'].reduce((s,k)=>s+(+d[k]||0),0), max: 62 },
    ]
  },
]

const GROUPS = [...new Set(TESTS_CONFIG.map(t => t.group))]
const GROUP_COLORS = {
  'Memória': S.greenL, 'Bateria Cognitiva': S.blue, 'Inteligência': '#C084FC',
  'Funções Executivas': S.amber, 'Humor': '#F87171', 'Ansiedade': '#FB923C',
  'Funcional': '#34D399', 'Linguagem': '#38BDF8',
}

const inputSt = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`,
  color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none',
}

export default function Tests() {
  const [patients, setPatients] = useState([])
  const [patientId, setPatientId] = useState('')
  const [selectedKey, setSelectedKey] = useState('RAVLT')
  const [form, setForm] = useState({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const session = useTestSession(patientId)
  const test = TESTS_CONFIG.find(t => t.key === selectedKey)

  useEffect(() => {
    getDocs(collection(db, 'patients'))
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    if (patientId) session.loadSession()
  }, [patientId])

  useEffect(() => {
    setForm(session.getTest(selectedKey) || {})
    setSaved(false)
  }, [selectedKey, session.session.tests])

  const handleSave = async () => {
    if (!patientId) return alert('Selecione um paciente primeiro.')
    setSaving(true)
    try {
      await session.updateTest(selectedKey, { ...form, _appliedAt: new Date().toISOString() })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const computed = test?.computed?.(form) || []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, maxWidth: 1100, margin: '0 auto', height: 'calc(100vh - 120px)' }}>

      {/* Sidebar de testes */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Seletor de paciente */}
        <div style={{ padding: 12, borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>PACIENTE</div>
          <select value={patientId} onChange={e => setPatientId(e.target.value)} style={{ ...inputSt, fontSize: 12 }}>
            <option value="">— Selecionar —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        {/* Lista de testes por grupo */}
        <div style={{ flex: 1, padding: '8px 6px', overflow: 'auto' }}>
          {GROUPS.map(group => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: GROUP_COLORS[group] || S.muted, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px', marginBottom: 2 }}>
                {group.toUpperCase()}
              </div>
              {TESTS_CONFIG.filter(t => t.group === group).map(t => {
                const hasData = Object.keys(session.getTest(t.key) || {}).filter(k => k !== 'obs' && k !== '_appliedAt').some(k => session.getTest(t.key)[k] !== '' && session.getTest(t.key)[k] !== undefined)
                const active = selectedKey === t.key
                return (
                  <div key={t.key} onClick={() => setSelectedKey(t.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 7, marginBottom: 1,
                    background: active ? S.green : 'transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                    <span style={{ fontSize: 12, color: active ? '#fff' : S.muted, fontWeight: active ? 700 : 400, flex: 1 }}>
                      {t.label}
                    </span>
                    {hasData && !active && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.greenL, flexShrink: 0 }} />
                    )}
                    {active && <ChevronRight size={12} color="rgba(255,255,255,0.6)" />}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Formulário do teste */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlaskConical size={16} color={GROUP_COLORS[test?.group] || S.greenL} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{test?.label}</span>
              <span style={{ fontSize: 11, color: S.muted }}>{test?.group}</span>
            </div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{test?.desc}</div>
            {test?.cutoff && (
              <div style={{ fontSize: 10, color: S.amber, marginTop: 3 }}>Pontos de corte: {test.cutoff}</div>
            )}
          </div>
          <button onClick={handleSave} disabled={saving || !patientId} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700, cursor: patientId ? 'pointer' : 'not-allowed',
            background: saved ? S.cardG : (patientId ? S.green : 'rgba(255,255,255,0.05)'),
            color: saved ? S.greenL : '#fff', transition: 'all 0.2s',
          }}>
            {saved ? <><CheckCircle2 size={14} /> SALVO</> : <><Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}</>}
          </button>
        </div>

        {/* Campos */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {!patientId ? (
            <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
              <User size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontSize: 13 }}>Selecione um paciente na barra lateral para registrar os resultados.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {test?.fields.map(f => (
                <div key={f.key} style={{ gridColumn: f.type === 'text' ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 5, letterSpacing: '0.02em' }}>
                    {f.label}
                    {f.max !== undefined && f.type !== 'text' && (
                      <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>/ {f.max}</span>
                    )}
                  </label>
                  {f.type === 'text' ? (
                    <textarea
                      value={form[f.key] || ''}
                      onChange={e => set(f.key, e.target.value)}
                      rows={3}
                      placeholder="Observações clínicas..."
                      style={{ ...inputSt, resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      type="number"
                      min={f.min ?? 0}
                      max={f.max}
                      value={form[f.key] ?? ''}
                      onChange={e => set(f.key, e.target.value)}
                      style={inputSt}
                    />
                  )}
                </div>
              ))}

              {/* Escores computados */}
              {computed.length > 0 && (
                <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: '14px 16px', background: S.cardG, borderRadius: 10, border: '1px solid rgba(46,125,50,0.3)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', alignSelf: 'center' }}>ESCORES</span>
                  {computed.map(c => (
                    <div key={c.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: S.muted }}>{c.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: S.greenL }}>
                        {c.value}{c.max ? <span style={{ fontSize: 12, color: S.muted }}>/{c.max}</span> : ''}
                      </div>
                      {c.cutoff && <div style={{ fontSize: 10, color: S.amber }}>{c.cutoff}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Info última aplicação */}
              {form._appliedAt && (
                <div style={{ gridColumn: '1 / -1', fontSize: 11, color: S.muted, textAlign: 'right' }}>
                  Última atualização: {new Date(form._appliedAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
