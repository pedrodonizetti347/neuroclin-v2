import React, { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTestSession } from '@/hooks/useTestSession'
import TestScanUpload from '@/components/tests/TestScanUpload'
import { FlaskConical, CheckCircle2, Save, Camera } from 'lucide-react'

// ─── Paleta ──────────────────────────────────────────────────────────────────
const S = {
  bg:     '#0D1B2A',
  card:   '#1A2744',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  amber:  '#F59E0B',
  red:    '#EF4444',
  blue:   '#3B82F6',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${S.border}`,
  color: '#fff', borderRadius: 6,
  padding: '6px 10px', fontSize: 13, width: '100%', outline: 'none',
  textAlign: 'center',
}

// ─── Badge de classificação ───────────────────────────────────────────────────
function Badge({ label, type }) {
  if (!label) return null
  const colors = {
    preserved:  { bg: 'rgba(46,125,50,0.2)',  border: '#2E7D32', text: '#4CAF50' },
    borderline: { bg: 'rgba(245,158,11,0.2)', border: '#F59E0B', text: '#FCD34D' },
    impaired:   { bg: 'rgba(239,68,68,0.2)',  border: '#EF4444', text: '#F87171' },
    info:       { bg: 'rgba(59,130,246,0.2)', border: '#3B82F6', text: '#93C5FD' },
  }
  const c = colors[type] || colors.info
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>{label}</span>
  )
}

// ─── Funções de classificação ─────────────────────────────────────────────────
const classify = {
  fab: (n) => {
    if (n === '' || n === null || n === undefined) return null
    const v = Number(n)
    if (v >= 15) return { label: 'PRESERVADO', type: 'preserved' }
    if (v >= 13) return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'COMPROMETIDO', type: 'impaired' }
  },
  gds15: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v <= 4)  return { label: 'NORMAL', type: 'preserved' }
    if (v <= 10) return { label: 'DEPRESSÃO LEVE/MODERADA', type: 'borderline' }
    return { label: 'DEPRESSÃO GRAVE', type: 'impaired' }
  },
  bdi2: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v <= 13) return { label: 'MÍNIMO', type: 'preserved' }
    if (v <= 19) return { label: 'LEVE', type: 'borderline' }
    if (v <= 28) return { label: 'MODERADO', type: 'borderline' }
    return { label: 'GRAVE', type: 'impaired' }
  },
  had: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v <= 7)  return { label: 'NORMAL', type: 'preserved' }
    if (v <= 10) return { label: 'LIMÍTROFE', type: 'borderline' }
    if (v <= 14) return { label: 'MODERADO', type: 'impaired' }
    return { label: 'GRAVE', type: 'impaired' }
  },
  gai: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v <= 9) return { label: 'NORMAL', type: 'preserved' }
    return { label: 'SINTOMAS DE ANSIEDADE', type: 'impaired' }
  },
  idate: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v < 40) return { label: 'BAIXO', type: 'preserved' }
    if (v < 60) return { label: 'MÉDIO', type: 'borderline' }
    return { label: 'ALTO', type: 'impaired' }
  },
  iqcode: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v < 3.31) return { label: 'SEM DECLÍNIO', type: 'preserved' }
    if (v <= 3.6) return { label: 'INDETERMINADO', type: 'borderline' }
    return { label: 'SUGESTIVO DE DECLÍNIO', type: 'impaired' }
  },
  badl: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v < 3.5) return { label: 'NORMAL', type: 'preserved' }
    if (v < 5.0) return { label: 'LEVE', type: 'borderline' }
    if (v < 7.5) return { label: 'MODERADO', type: 'impaired' }
    return { label: 'GRAVE', type: 'impaired' }
  },
  pfeffer: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v <= 5)  return { label: 'NORMAL', type: 'preserved' }
    if (v <= 10) return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'COMPROMETIMENTO FUNCIONAL', type: 'impaired' }
  },
  lawton: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v === 8) return { label: 'INDEPENDENTE', type: 'preserved' }
    if (v >= 5)  return { label: 'DEPENDÊNCIA LEVE', type: 'borderline' }
    if (v >= 1)  return { label: 'DEPENDÊNCIA MODERADA', type: 'impaired' }
    return { label: 'DEPENDÊNCIA GRAVE', type: 'impaired' }
  },
  wasi: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 130) return { label: 'MUITO SUPERIOR', type: 'preserved' }
    if (v >= 120) return { label: 'SUPERIOR', type: 'preserved' }
    if (v >= 110) return { label: 'MÉDIO ALTO', type: 'preserved' }
    if (v >= 90)  return { label: 'MÉDIO', type: 'preserved' }
    if (v >= 80)  return { label: 'MÉDIO BAIXO', type: 'borderline' }
    if (v >= 70)  return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'EXTREMAMENTE BAIXO', type: 'impaired' }
  },
  ravlt_a7: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 9) return { label: 'PRESERVADO', type: 'preserved' }
    if (v >= 6) return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'COMPROMETIDO', type: 'impaired' }
  },
  zscore: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= -1.0)  return { label: 'PRESERVADO', type: 'preserved' }
    if (v >= -1.5)  return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'COMPROMETIDO', type: 'impaired' }
  },
  moca: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 26) return { label: 'NORMAL', type: 'preserved' }
    if (v >= 18) return { label: 'CCL', type: 'borderline' }
    return { label: 'SUGESTIVO DE DEMÊNCIA', type: 'impaired' }
  },
  wcst_cat: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 5) return { label: 'PRESERVADO', type: 'preserved' }
    if (v >= 3) return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'COMPROMETIDO', type: 'impaired' }
  },
}

// ─── Componente de campo numérico ─────────────────────────────────────────────
function NumField({ label, value, onChange, min, max, step = 1, hint }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>
        {label}{hint && <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>({hint})</span>}
      </div>
      <input
        type="number" min={min} max={max} step={step}
        value={value ?? ''} onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  )
}

// ─── RAVLT ────────────────────────────────────────────────────────────────────
function RAVLTForm({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  const a7c = classify.ravlt_a7(d.a7)
  const recog = d.recognition != null ? (Number(d.recognition) >= 13 ? { label: 'PRESERVADO', type: 'preserved' } : { label: 'COMPROMETIDO', type: 'impaired' }) : null
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 12 }}>
        {['a1','a2','a3','a4','a5'].map((k,i) => (
          <NumField key={k} label={`A${i+1}`} value={d[k]} onChange={v => set(k,v)} min={0} max={15} hint="0-15" />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <NumField label="A6 — Interferência" value={d.a6} onChange={v => set('a6',v)} min={0} max={15} hint="0-15" />
        <div>
          <NumField label="A7 — Evocação Tardia" value={d.a7} onChange={v => set('a7',v)} min={0} max={15} hint="0-15" />
          {a7c && <div style={{ marginTop: 4 }}><Badge {...a7c} /></div>}
        </div>
        <div>
          <NumField label="Reconhecimento" value={d.recognition} onChange={v => set('recognition',v)} min={0} max={15} hint="0-15" />
          {recog && <div style={{ marginTop: 4 }}><Badge {...recog} /></div>}
        </div>
      </div>
      {d.a1 && d.a5 && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, fontSize: 12, color: S.muted }}>
          Curva de aprendizagem: A1={d.a1} → A5={d.a5}
          {' '}(ganho: <span style={{ color: S.greenL, fontWeight: 700 }}>{Number(d.a5)-Number(d.a1) >= 0 ? '+' : ''}{Number(d.a5)-Number(d.a1)}</span>)
        </div>
      )}
    </div>
  )
}

// ─── NEUPSILIN Completo (sub-domínios + normatização) ────────────────────────
function NEUPSILINForm({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  const [tab, setTab] = React.useState('orientacao')

  // Totais calculados automaticamente
  const orientTotal = (Number(d.orientation_time)||0) + (Number(d.orientation_space)||0)
  const attTotal    = (Number(d.attention_reverse_count)||0) + (Number(d.attention_digit_sequence)||0)
  const percTotal   = (Number(d.perception_line_equality)||0) + (Number(d.perception_visual_hemineglect)||0) + (Number(d.perception_face_perception)||0) + (Number(d.perception_face_recognition)||0)
  const episTotal   = (Number(d.memory_episodic_immediate)||0) + (Number(d.memory_episodic_delayed)||0) + (Number(d.memory_episodic_recognition)||0)
  const memTotal    = (Number(d.memory_working)||0) + (Number(d.memory_span_auditory)||0) + episTotal + (Number(d.memory_semantic_long)||0) + (Number(d.memory_visual_short)||0) + (Number(d.memory_prospective)||0)
  const langOral    = (Number(d.lang_nomeacao)||0) + (Number(d.lang_repeticao)||0) + (Number(d.lang_automatica)||0) + (Number(d.lang_compreensao_oral)||0) + (Number(d.lang_inferencias)||0)
  const langEsc     = (Number(d.lang_leitura)||0) + (Number(d.lang_compreensao_escrita)||0) + (Number(d.lang_escrita_espontanea)||0) + (Number(d.lang_escrita_copiada)||0) + (Number(d.lang_ditada)||0)
  const langTotal   = langOral + langEsc
  const praxTotal   = (Number(d.praxis_ideomotor)||0) + (Number(d.praxis_constructive)||0) + (Number(d.praxis_reflexive)||0)
  const execTotal   = (Number(d.executive_problem_solving)||0) + (Number(d.executive_verbal_fluency)||0)

  const tabs = [
    { id: 'orientacao', label: '1.Orient.',  tot: orientTotal, max: 8  },
    { id: 'atencao',    label: '2.Atenção',  tot: attTotal,    max: 27 },
    { id: 'percepcao',  label: '3.Percep.',  tot: percTotal,   max: 12 },
    { id: 'memoria',    label: '4.Memória',  tot: memTotal              },
    { id: 'aritmetica', label: '5.Aritmét.', tot: Number(d.arithmetic)||0, max: 8 },
    { id: 'linguagem',  label: '6.Ling.',    tot: langTotal             },
    { id: 'praxias',    label: '7.Praxias',  tot: praxTotal,   max: 20 },
    { id: 'executivas', label: '8.Exec.',    tot: execTotal             },
  ]

  const secBox  = { background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 14px', marginBottom: 8 }
  const subHead = (txt) => (
    <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '10px 0 6px', borderTop: `1px solid ${S.border}`, paddingTop: 8 }}>{txt}</div>
  )
  const totLine = (v, max) => (
    <div style={{ marginTop: 10, fontSize: 12, color: S.greenL, fontWeight: 700, borderTop: `1px solid ${S.border}`, paddingTop: 8 }}>
      Total: {v}{max ? '/' + max : ''}
    </div>
  )

  return (
    <div>
      {/* Dados normativos — obrigatório para z-escore automático no laudo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <NumField label="Idade do paciente (anos)" value={d.age} onChange={v => set('age', v)} min={18} max={100} hint="para normatização" />
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade (para normatização)</div>
          <select value={d.education_years||''} onChange={e => set('education_years', e.target.value)}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">— selecionar —</option>
            <option value="1-4">1–4 anos</option>
            <option value="5-8">5–8 anos</option>
            <option value="9+">9+ anos</option>
          </select>
        </div>
      </div>

      {/* Tabs de domínio */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '4px 9px', borderRadius: 5, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
            background: tab === t.id ? S.green : 'rgba(255,255,255,0.06)',
            color: tab === t.id ? '#fff' : S.muted,
          }}>
            {t.label} {t.max ? `(${t.tot}/${t.max})` : `(${t.tot})`}
          </button>
        ))}
      </div>

      {/* 1 – Orientação */}
      {tab === 'orientacao' && <div style={secBox}>
        <NumField label="Temporal — Dia Semana, Dia Mês, Mês, Ano (/4)" value={d.orientation_time}  onChange={v => set('orientation_time',  v)} min={0} max={4} />
        <NumField label="Espacial — Local, Cidade, Estado, País (/4)"   value={d.orientation_space} onChange={v => set('orientation_space', v)} min={0} max={4} />
        {totLine(orientTotal, 8)}
      </div>}

      {/* 2 – Atenção */}
      {tab === 'atencao' && <div style={secBox}>
        <NumField label="Contagem Inversa 50–30 (/20)"  value={d.attention_reverse_count}  onChange={v => set('attention_reverse_count',  v)} min={0} max={20} />
        <NumField label="Tempo de Execução Contagem (seg) — escore invertido" value={d.attention_execution_time} onChange={v => set('attention_execution_time', v)} min={0} hint="seg" />
        <NumField label="Sequência de Dígitos (/7)"     value={d.attention_digit_sequence} onChange={v => set('attention_digit_sequence', v)} min={0} max={7}  />
        {totLine(attTotal, 27)}
      </div>}

      {/* 3 – Percepção */}
      {tab === 'percepcao' && <div style={secBox}>
        <NumField label="Julgamento de Linhas (/6)"      value={d.perception_line_equality}       onChange={v => set('perception_line_equality',       v)} min={0} max={6} />
        <NumField label="Heminegligência Visual (/1)"    value={d.perception_visual_hemineglect}  onChange={v => set('perception_visual_hemineglect',  v)} min={0} max={1} />
        <NumField label="Percepção de Faces (/3)"        value={d.perception_face_perception}     onChange={v => set('perception_face_perception',     v)} min={0} max={3} />
        <NumField label="Reconhecimento de Faces (/2)"   value={d.perception_face_recognition}    onChange={v => set('perception_face_recognition',    v)} min={0} max={2} />
        {totLine(percTotal, 12)}
      </div>}

      {/* 4 – Memória */}
      {tab === 'memoria' && <div style={secBox}>
        {subHead('Memória de Trabalho')}
        <NumField label="Ordenamento de Dígitos — total (/20)" value={d.memory_working}       onChange={v => set('memory_working',       v)} min={0} max={20} />
        <NumField label="Span de Dígitos — máx sequência"      value={d.memory_working_digit} onChange={v => set('memory_working_digit', v)} min={0} max={10} />
        {subHead('Span Auditivo')}
        <NumField label="Span Auditivo — Frases (/28)"   value={d.memory_span_auditory} onChange={v => set('memory_span_auditory', v)} min={0} max={28} />
        {subHead('Memória Episódica')}
        <NumField label="Evocação Imediata (/9)"          value={d.memory_episodic_immediate}   onChange={v => set('memory_episodic_immediate',   v)} min={0} max={9}  />
        <NumField label="Evocação Tardia (/9)"            value={d.memory_episodic_delayed}     onChange={v => set('memory_episodic_delayed',     v)} min={0} max={9}  />
        <NumField label="Reconhecimento (/18)"            value={d.memory_episodic_recognition} onChange={v => set('memory_episodic_recognition', v)} min={0} max={18} />
        {subHead('Outras Memórias')}
        <NumField label="Memória Semântica de Longo Prazo (/5)" value={d.memory_semantic_long}  onChange={v => set('memory_semantic_long',  v)} min={0} max={5} />
        <NumField label="Memória Visual de Curto Prazo (/3)"    value={d.memory_visual_short}   onChange={v => set('memory_visual_short',   v)} min={0} max={3} />
        <NumField label="Memória Prospectiva (/2)"              value={d.memory_prospective}    onChange={v => set('memory_prospective',    v)} min={0} max={2} />
        {totLine(memTotal)}
      </div>}

      {/* 5 – Aritmética */}
      {tab === 'aritmetica' && <div style={secBox}>
        <NumField label="Habilidades Aritméticas (/8)" value={d.arithmetic} onChange={v => set('arithmetic', v)} min={0} max={8} />
        {totLine(Number(d.arithmetic)||0, 8)}
      </div>}

      {/* 6 – Linguagem */}
      {tab === 'linguagem' && <div style={secBox}>
        {subHead('Linguagem Oral')}
        <NumField label="Nomeação (/4)"             value={d.lang_nomeacao}         onChange={v => set('lang_nomeacao',         v)} min={0} max={4}  />
        <NumField label="Repetição (/14)"           value={d.lang_repeticao}        onChange={v => set('lang_repeticao',        v)} min={0} max={14} />
        <NumField label="Linguagem Automática (/2)" value={d.lang_automatica}       onChange={v => set('lang_automatica',       v)} min={0} max={2}  />
        <NumField label="Compreensão Oral (/3)"     value={d.lang_compreensao_oral} onChange={v => set('lang_compreensao_oral', v)} min={0} max={3}  />
        <NumField label="Inferências (/3)"          value={d.lang_inferencias}      onChange={v => set('lang_inferencias',      v)} min={0} max={3}  />
        {subHead('Linguagem Escrita')}
        <NumField label="Leitura (/12)"             value={d.lang_leitura}              onChange={v => set('lang_leitura',             v)} min={0} max={12} />
        <NumField label="Compreensão Escrita (/3)"  value={d.lang_compreensao_escrita}  onChange={v => set('lang_compreensao_escrita', v)} min={0} max={3}  />
        <NumField label="Escrita Espontânea (/2)"   value={d.lang_escrita_espontanea}   onChange={v => set('lang_escrita_espontanea',  v)} min={0} max={2}  />
        <NumField label="Escrita Copiada (/2)"      value={d.lang_escrita_copiada}      onChange={v => set('lang_escrita_copiada',     v)} min={0} max={2}  />
        <NumField label="Escrita Ditada (/12)"      value={d.lang_ditada}               onChange={v => set('lang_ditada',              v)} min={0} max={12} />
        <div style={{ marginTop: 8, fontSize: 11, color: S.muted, borderTop: `1px solid ${S.border}`, paddingTop: 8 }}>
          Oral: {langOral} | Escrita: {langEsc}
        </div>
        {totLine(langTotal)}
      </div>}

      {/* 7 – Praxias */}
      {tab === 'praxias' && <div style={secBox}>
        <NumField label="Ideomotora (/3)"   value={d.praxis_ideomotor}   onChange={v => set('praxis_ideomotor',   v)} min={0} max={3}  />
        <NumField label="Construtiva (/14)" value={d.praxis_constructive} onChange={v => set('praxis_constructive', v)} min={0} max={14} />
        <NumField label="Reflexiva (/3)"    value={d.praxis_reflexive}   onChange={v => set('praxis_reflexive',   v)} min={0} max={3}  />
        {totLine(praxTotal, 20)}
      </div>}

      {/* 8 – Executivas */}
      {tab === 'executivas' && <div style={secBox}>
        <NumField label="Resolução de Problemas (/2)"     value={d.executive_problem_solving} onChange={v => set('executive_problem_solving', v)} min={0} max={2} />
        <NumField label="Fluência Verbal (nº vocábulos)"  value={d.executive_verbal_fluency}  onChange={v => set('executive_verbal_fluency',  v)} min={0} hint="nº palavras" />
        {totLine(execTotal)}
      </div>}
    </div>
  )
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
function FABForm({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  const total = ['similarities','fluency','motor_series','conflicting','go_nogo','prehension']
    .reduce((sum, k) => sum + (d[k] !== '' && d[k] != null ? Number(d[k]) : 0), 0)
  const hasAny = ['similarities','fluency','motor_series','conflicting','go_nogo','prehension'].some(k => d[k] !== '' && d[k] != null)
  const c = hasAny ? classify.fab(total) : null
  const fields = [
    { key: 'similarities',   label: 'Semelhanças' },
    { key: 'fluency',        label: 'Fluência verbal' },
    { key: 'motor_series',   label: 'Série motora' },
    { key: 'conflicting',    label: 'Instruções conflitantes' },
    { key: 'go_nogo',        label: 'Go/No-go' },
    { key: 'prehension',     label: 'Comportamento de preensão' },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {fields.map(f => (
          <NumField key={f.key} label={f.label} value={d[f.key]} onChange={v => set(f.key, v)} min={0} max={3} hint="0-3" />
        ))}
      </div>
      {hasAny && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/18</span>
          {c && <Badge {...c} />}
        </div>
      )}
    </div>
  )
}

// ─── GDS-15 ───────────────────────────────────────────────────────────────────
function GDS15Form({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v, classification: classify.gds15(k === 'total_score' ? v : d.total_score)?.label })
  const c = classify.gds15(d.total_score)
  return (
    <div>
      <NumField label="Pontuação Total" value={d.total_score} onChange={v => set('total_score', v)} min={0} max={15} hint="0-15" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: 0-4 Normal · 5-10 Leve/Moderado · 11-15 Grave</p>
    </div>
  )
}

// ─── BDI-II ───────────────────────────────────────────────────────────────────
function BDI2Form({ data, onChange }) {
  const d = data || {}
  const c = classify.bdi2(d.total_score)
  return (
    <div>
      <NumField label="Pontuação Total" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.bdi2(v)?.label })}
        min={0} max={63} hint="0-63" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: 0-13 Mínimo · 14-19 Leve · 20-28 Moderado · 29+ Grave</p>
    </div>
  )
}

// ─── HAD ─────────────────────────────────────────────────────────────────────
function HADForm({ data, onChange }) {
  const d = data || {}
  const ca = classify.had(d.anxiety_score)
  const cd = classify.had(d.depression_score)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, marginBottom: 8 }}>ANSIEDADE</div>
        <NumField label="Pontuação" value={d.anxiety_score}
          onChange={v => onChange({ ...d, anxiety_score: v, anxiety_classification: classify.had(v)?.label })}
          min={0} max={21} hint="0-21" />
        {ca && <div style={{ marginTop: 6 }}><Badge {...ca} /></div>}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, marginBottom: 8 }}>DEPRESSÃO</div>
        <NumField label="Pontuação" value={d.depression_score}
          onChange={v => onChange({ ...d, depression_score: v, depression_classification: classify.had(v)?.label })}
          min={0} max={21} hint="0-21" />
        {cd && <div style={{ marginTop: 6 }}><Badge {...cd} /></div>}
      </div>
      <p style={{ fontSize: 11, color: S.muted, gridColumn: '1/-1' }}>Ref: 0-7 Normal · 8-10 Limítrofe · 11-14 Moderado · 15-21 Grave</p>
    </div>
  )
}

// ─── GAI ─────────────────────────────────────────────────────────────────────
function GAIForm({ data, onChange }) {
  const d = data || {}
  const c = classify.gai(d.total_score)
  return (
    <div>
      <NumField label="Pontuação Total" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.gai(v)?.label })}
        min={0} max={20} hint="0-20" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: 0-9 Normal · ≥10 Sintomas de ansiedade</p>
    </div>
  )
}

// ─── IDATE ────────────────────────────────────────────────────────────────────
function IDATEForm({ testKey, data, onChange, label }) {
  const d = data || {}
  const c = classify.idate(d.total_score)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, marginBottom: 8 }}>{label}</div>
      <NumField label="Pontuação Total" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.idate(v)?.label })}
        min={20} max={80} hint="20-80" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: {'<'}40 Baixo · 40-59 Médio · ≥60 Alto</p>
    </div>
  )
}

// ─── IQCODE ───────────────────────────────────────────────────────────────────
function IQCODEForm({ data, onChange }) {
  const d = data || {}
  const c = classify.iqcode(d.total_score)
  return (
    <div>
      <NumField label="Média (1–5)" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.iqcode(v)?.label })}
        min={1} max={5} step={0.01} hint="média dos 16 itens" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: {'<'}3,31 Sem declínio · 3,31-3,6 Indeterminado · {'>'}3,6 Sugestivo de declínio</p>
    </div>
  )
}

// ─── B-ADL ────────────────────────────────────────────────────────────────────
function BADLForm({ data, onChange }) {
  const d = data || {}
  const c = classify.badl(d.total_score)
  return (
    <div>
      <NumField label="Pontuação (0–10)" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.badl(v)?.label })}
        min={0} max={10} step={0.1} hint="0-10" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: {'<'}3,5 Normal · 3,5-4,9 Leve · 5-7,4 Moderado · ≥7,5 Grave</p>
    </div>
  )
}

// ─── Pfeffer ─────────────────────────────────────────────────────────────────
function PfefferForm({ data, onChange }) {
  const d = data || {}
  const c = classify.pfeffer(d.total_score)
  return (
    <div>
      <NumField label="Pontuação Total (0–30)" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.pfeffer(v)?.label })}
        min={0} max={30} hint="0-30" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: 0-5 Normal · 6-10 Limítrofe · ≥11 Comprometimento funcional</p>
    </div>
  )
}

// ─── Lawton ───────────────────────────────────────────────────────────────────
function LawtonForm({ data, onChange }) {
  const d = data || {}
  const c = classify.lawton(d.total_score)
  return (
    <div>
      <NumField label="Pontuação Total (0–8)" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.lawton(v)?.label })}
        min={0} max={8} hint="0-8" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: 8 Independente · 5-7 Dep. leve · 1-4 Dep. moderada · 0 Dep. grave</p>
    </div>
  )
}

// ─── WASI / WASI-III ─────────────────────────────────────────────────────────
function WASIForm({ data, onChange, version }) {
  const d = data || {}
  const cqi = classify.wasi(d.qit_2)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
      <div>
        <NumField label="QI Total (QIT-2)" value={d.qit_2}
          onChange={v => onChange({ ...d, qit_2: v })}
          min={40} max={160} hint="QI" />
        {cqi && <div style={{ marginTop: 4 }}><Badge {...cqi} /></div>}
      </div>
      <NumField label="Percentil" value={d.qit_percentile}
        onChange={v => onChange({ ...d, qit_percentile: v })}
        min={1} max={99} hint="1-99" />
      <div style={{ paddingTop: 20 }}>
        <input
          value={d.classification || ''}
          onChange={e => onChange({ ...d, classification: e.target.value })}
          placeholder="Classificação verbal..."
          style={{ ...inputStyle, textAlign: 'left' }}
        />
      </div>
    </div>
  )
}

// ─── WCST-N ───────────────────────────────────────────────────────────────────
function WCSTForm({ data, onChange }) {
  const d = data || {}
  const cc = classify.wcst_cat(d.categories_completed)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
      <div>
        <NumField label="Categorias completadas" value={d.categories_completed}
          onChange={v => onChange({ ...d, categories_completed: v })}
          min={0} max={6} hint="0-6" />
        {cc && <div style={{ marginTop: 4 }}><Badge {...cc} /></div>}
      </div>
      <NumField label="Erros perseverativos" value={d.perseverative_errors}
        onChange={v => onChange({ ...d, perseverative_errors: v })}
        min={0} hint="total" />
      <NumField label="Respostas perseverativas" value={d.perseverative_responses}
        onChange={v => onChange({ ...d, perseverative_responses: v })}
        min={0} hint="total" />
    </div>
  )
}

// ─── BAMS ─────────────────────────────────────────────────────────────────────
function BAMSForm({ data, onChange }) {
  const d = data || {}
  const cp = d.percentile != null ? (Number(d.percentile) >= 25 ? { label: 'PRESERVADO', type: 'preserved' } : Number(d.percentile) >= 10 ? { label: 'LIMÍTROFE', type: 'borderline' } : { label: 'COMPROMETIDO', type: 'impaired' }) : null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
      <NumField label="Escore global" value={d.global_score}
        onChange={v => onChange({ ...d, global_score: v })} min={0} />
      <div>
        <NumField label="Percentil" value={d.percentile}
          onChange={v => onChange({ ...d, percentile: v })} min={1} max={99} hint="1-99" />
        {cp && <div style={{ marginTop: 4 }}><Badge {...cp} /></div>}
      </div>
      <div style={{ paddingTop: 20 }}>
        <input value={d.interpretation || ''}
          onChange={e => onChange({ ...d, interpretation: e.target.value })}
          placeholder="Interpretação..."
          style={{ ...inputStyle, textAlign: 'left' }} />
      </div>
    </div>
  )
}

// ─── MoCA ─────────────────────────────────────────────────────────────────────
function MoCAForm({ data, onChange }) {
  const d = data || {}
  const c = classify.moca(d.total_score)
  return (
    <div>
      <NumField label="Pontuação Total (0–30)" value={d.total_score}
        onChange={v => onChange({ ...d, total_score: v, classification: classify.moca(v)?.label })}
        min={0} max={30} hint="0-30" />
      {c && <div style={{ marginTop: 8 }}><Badge {...c} /></div>}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref: ≥26 Normal · 18-25 CCL · {'<'}18 Sugestivo de demência</p>
    </div>
  )
}

// ─── Anamnese Completa ────────────────────────────────────────────────────────
function ANAMNESEForm({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, [k]: v })
  const [tab, setTab] = React.useState('queixas')

  const tabStyle = (active) => ({
    padding: '4px 9px', borderRadius: 5, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: active ? 700 : 400,
    background: active ? S.green : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : S.muted,
  })
  const box = { background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 14px', marginBottom: 8 }
  const sub = (txt) => <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '10px 0 5px', borderTop: `1px solid ${S.border}`, paddingTop: 8 }}>{txt}</div>

  const Fld = ({ label, k, rows, placeholder, half }) => (
    <div style={{ marginBottom: 10, ...(half ? {} : {}) }}>
      <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>{label}</div>
      {rows
        ? <textarea rows={rows} value={d[k]||''} onChange={e => set(k, e.target.value)} placeholder={placeholder||''}
            style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', width: '100%', lineHeight: 1.5 }} />
        : <input type="text" value={d[k]||''} onChange={e => set(k, e.target.value)} placeholder={placeholder||''}
            style={{ ...inputStyle, textAlign: 'left', padding: '7px 10px', width: '100%' }} />
      }
    </div>
  )
  const Grid2 = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>

  const tabList = [
    { id: 'queixas',   label: '1.Queixas'   },
    { id: 'clinico',   label: '2.Clínico'   },
    { id: 'memoria',   label: '3.Memória'   },
    { id: 'funcional', label: '4.Funcional' },
    { id: 'sono',      label: '5.Sono/Ap.'  },
    { id: 'exames',    label: '6.Exames'    },
    { id: 'familia',   label: '7.Família'   },
  ]

  return (
    <div>
      {/* Informante */}
      <div style={{ ...box, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Fld label="Informante / Acompanhante" k="acompanhante" placeholder="Nome completo" />
        <Fld label="Parentesco / Relação" k="parentesco_acompanhante" placeholder="Ex: filha, cônjuge..." />
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {tabList.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>)}
      </div>

      {/* 1 – Queixas */}
      {tab === 'queixas' && <div style={box}>
        <Fld label="Objetivo da avaliação / Motivo do encaminhamento" k="objetivo_avaliacao" rows={2} />
        <Fld label="Queixas principais (cognitivas, emocionais, comportamentais)" k="queixas" rows={3} />
        <Grid2>
          <Fld label="Início dos sintomas (data aproximada)" k="inicio_sintomas_data" placeholder="Ex: 2022, há 2 anos..." />
          <Fld label="Forma de início" k="forma_inicio" placeholder="Agudo / Gradual / Insidioso" />
        </Grid2>
        <Fld label="Evolução / Desenvolvimento dos sintomas" k="desenvolvimento_sintomas" rows={3} />
        <Fld label="Queixa principal do informante / cuidador" k="queixa_informante" rows={2} />
      </div>}

      {/* 2 – Clínico */}
      {tab === 'clinico' && <div style={box}>
        <Fld label="Doenças preexistentes (HAS, DM, cardiopatia, AVC, TCE, depressão...)" k="doencas_preexistentes" rows={3} />
        <Fld label="Medicamentos em uso (nome, dose, motivo)" k="medicamentos" rows={3} />
        <Fld label="Cirurgias / Internações (tipo, data, sequelas)" k="cirurgias_internacoes" rows={2} />
        {sub('Neurológico')}
        <Grid2>
          <Fld label="Já bateu a cabeça / TCE? Como?" k="tce_historico" />
          <Fld label="AVC / AIT? Quando? Sequelas?" k="avc_historico" />
        </Grid2>
        <Grid2>
          <Fld label="Epilepsia / Crises convulsivas?" k="epilepsia" />
          <Fld label="Tontura / Desmaio / Síncope?" k="tontura_desmaio" />
        </Grid2>
        <Fld label="Dificuldade na fala / linguagem?" k="fono_dificuldade_fala" />
        <Fld label="Alteração de humor / comportamento?" k="alteracao_humor_comportamento" rows={2} />
        <Fld label="Uso de álcool (frequência, quantidade)" k="alcool_frequencia_quantidade" />
        <Fld label="Uso de drogas (tipo, frequência, tratamento)" k="drogas_frequencia_quantidade" />
      </div>}

      {/* 3 – Memória */}
      {tab === 'memoria' && <div style={box}>
        <Grid2>
          <Fld label="Esquece onde coloca objetos? Frequência?" k="memoria_esquece_objetos" />
          <Fld label="Esquece nome de pessoas conhecidas?" k="memoria_esquece_nomes" />
        </Grid2>
        <Grid2>
          <Fld label="Dificuldade para encontrar palavras?" k="memoria_dificuldade_palavras" />
          <Fld label="Esquece fatos recentes? Frequência?" k="memoria_esquece_hoje" />
        </Grid2>
        <Grid2>
          <Fld label="Conta casos repetidamente?" k="memoria_conta_repetido" />
          <Fld label="Usa recursos para lembrar? Quais?" k="memoria_recursos_lembrar" />
        </Grid2>
        <Fld label="Já se perdeu em lugar conhecido?" k="memoria_perdeu_lugar_conhecido" />
        <Fld label="Troca de objetos / coloca coisas em lugar errado?" k="memoria_troca_objetos" rows={2} />
        <Fld label="Família nota que está esquecendo?" k="memoria_familia_acha_esquecido" />
        <Fld label="Relato de um dia típico" k="memoria_relato_dia" rows={3} />
      </div>}

      {/* 4 – Funcional */}
      {tab === 'funcional' && <div style={box}>
        <Grid2>
          <Fld label="Executa atividades externas sozinho? (supermercado, banco)" k="executa_atividades_externas" />
          <Fld label="Cuida do próprio dinheiro / finanças?" k="cuida_proprio_dinheiro" />
        </Grid2>
        <Grid2>
          <Fld label="Administra a casa / atividades domésticas?" k="administra_casa_adulto" />
          <Fld label="Dirige? Se não, por quê?" k="dirige" />
        </Grid2>
        <Fld label="Dificuldade nas AVDs (alimentação, higiene, vestuário)?" k="dificuldade_avds" rows={2} />
        <Fld label="Comprometimento do trabalho e vida social?" k="comprometimento_trabalho_social" rows={2} />
        <Fld label="Atividade física / lazer / hobbies?" k="atividade_fisica_lazer" />
        <Fld label="Flutuações do estado geral / agitação noturna?" k="flutuacoes_estado_geral" />
      </div>}

      {/* 5 – Sono / Apetite / Sensorial */}
      {tab === 'sono' && <div style={box}>
        {sub('Sono')}
        <Fld label="Como é o sono?" k="sono_como_e" />
        <Grid2>
          <Fld label="Duração (horas/noite)" k="sono_duracao_adulto" placeholder="Ex: 6-7 horas" />
          <Fld label="Contínuo ou com interrupções?" k="sono_continuo_adulto" />
        </Grid2>
        <Grid2>
          <Fld label="Ronco / Apneia?" k="sono_ronco_apneia" />
          <Fld label="Sonambulismo / Pesadelos?" k="sono_sonambulismo" />
        </Grid2>
        {sub('Apetite')}
        <Fld label="Como está o apetite?" k="apetite_como_e" />
        <Grid2>
          <Fld label="Voracidade ou perda de apetite?" k="apetite_voraz_perda" />
          <Fld label="Mudança de hábitos alimentares?" k="apetite_mudanca_habitos" />
        </Grid2>
        {sub('Sensorial')}
        <Grid2>
          <Fld label="Dificuldade de audição?" k="audicao_dificuldade" />
          <Fld label="Dificuldade de visão / usa óculos?" k="visao_usa_oculos" />
        </Grid2>
        <Fld label="Dificuldade de motricidade / equilíbrio / quedas?" k="motricidade_dificuldade" />
      </div>}

      {/* 6 – Exames */}
      {tab === 'exames' && <div style={box}>
        <Grid2>
          <Fld label="Tomografia (quando e resultado)" k="exame_tomografia" />
          <Fld label="Ressonância magnética (quando e resultado)" k="exame_ressonancia" />
        </Grid2>
        <Grid2>
          <Fld label="EEG (quando e resultado)" k="exame_eeg" />
          <Fld label="Outros exames laboratoriais / complementares" k="exame_outros" />
        </Grid2>
        <Fld label="Resumo dos exames imagiológicos para o laudo" k="exames" rows={3} placeholder="Ex: Ressonância de 03/2024 sem alterações estruturais significativas..." />
        {sub('Acompanhamento')}
        <Fld label="Neurologista / psiquiatra que acompanha" k="medico_responsavel" />
        <Fld label="Hipótese diagnóstica prévia (se houver)" k="hipotese_diagnostica_previa" />
        <Fld label="Observações adicionais do avaliador" k="observacoes_avaliador" rows={3} />
      </div>}

      {/* 7 – Família / Antecedentes */}
      {tab === 'familia' && <div style={box}>
        <Fld label="Histórico familiar de demência / Alzheimer?" k="historia_familiar_demencia" />
        <Fld label="Histórico familiar de doenças neurológicas" k="historia_familiar_neurologica" />
        <Fld label="Como envelheceram os pais?" k="como_envelheceram_pais_adulto" rows={2} />
        <Fld label="Estado civil" k="estado_civil" placeholder="Casado, divorciado, viúvo..." />
        <Fld label="Profissão / ocupação atual" k="profissao" />
        <Fld label="Escolaridade detalhada (escola pública/particular, repetências)" k="escolaridade_detalhada" rows={2} />
        <Fld label="Lateralidade dominante" k="lateralidade" placeholder="Destro / Canhoto / Ambidestro" />
      </div>}
    </div>
  )
}

// ─── Configuração dos testes ──────────────────────────────────────────────────
const TEST_CONFIG = [
  { group: 'Anamnese', items: [
    { key: 'ANAMNESE', label: 'Anamnese', Form: ANAMNESEForm, isAnamnese: true },
  ]},
  { group: 'Rastreio Cognitivo', items: [
    { key: 'MoCA',      label: 'MoCA',    Form: MoCAForm },
  ]},
  { group: 'Memória', items: [
    { key: 'RAVLT',     label: 'RAVLT',   Form: RAVLTForm },
    { key: 'BAMS',      label: 'BAMS',    Form: BAMSForm },
  ]},
  { group: 'Bateria Cognitiva', items: [
    { key: 'NEUPSILIN', label: 'NEUPSILIN', Form: NEUPSILINForm },
  ]},
  { group: 'Funções Executivas', items: [
    { key: 'FAB',       label: 'FAB',      Form: FABForm },
    { key: 'WCST-N',    label: 'WCST-N',   Form: WCSTForm },
  ]},
  { group: 'Inteligência', items: [
    { key: 'WASI',      label: 'WASI',     Form: (p) => <WASIForm {...p} version="WASI" /> },
    { key: 'WASI-III',  label: 'WASI-III', Form: (p) => <WASIForm {...p} version="WASI-III" /> },
  ]},
  { group: 'Humor', items: [
    { key: 'GDS-15',    label: 'GDS-15',   Form: GDS15Form },
    { key: 'BDI-II',    label: 'BDI-II',   Form: BDI2Form },
    { key: 'HAD',       label: 'HAD',      Form: HADForm },
  ]},
  { group: 'Ansiedade', items: [
    { key: 'GAI',       label: 'GAI',      Form: GAIForm },
    { key: 'IDATE-E',   label: 'IDATE-E',  Form: (p) => <IDATEForm {...p} label="Estado (IDATE-E)" /> },
    { key: 'IDATE-T',   label: 'IDATE-T',  Form: (p) => <IDATEForm {...p} label="Traço (IDATE-T)" /> },
  ]},
  { group: 'Funcional / Informante', items: [
    { key: 'IQCODE',    label: 'IQCODE',   Form: IQCODEForm },
    { key: 'B-ADL',     label: 'B-ADL',    Form: BADLForm },
    { key: 'Pfeffer',   label: 'Pfeffer',  Form: PfefferForm },
    { key: 'Lawton',    label: 'Lawton',   Form: LawtonForm },
  ]},
]

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Tests() {
  const [patients,  setPatients]  = useState([])
  const [patientId, setPatientId] = useState('')
  const [activeKey, setActiveKey] = useState('RAVLT')
  const [justSaved, setJustSaved] = useState({})

  const session = useTestSession(patientId)

  useEffect(() => {
    getDocs(query(collection(db, 'patients'), orderBy('createdAt', 'desc')))
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => getDocs(collection(db, 'patients'))
        .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })))))
  }, [])

  useEffect(() => {
    if (patientId) session.loadSession()
  }, [patientId])

  const activeConf = TEST_CONFIG.flatMap(g => g.items).find(t => t.key === activeKey)
  const patient = patients.find(p => p.id === patientId)

  const handleChange = (key, data) => {
    session.updateTest(key, data)
    setJustSaved(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setJustSaved(prev => ({ ...prev, [key]: false })), 2000)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>TESTES</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Registro e classificação automática em tempo real</p>
      </div>

      {/* Seletor de paciente */}
      <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <FlaskConical size={16} color={S.greenL} />
        <select
          value={patientId} onChange={e => setPatientId(e.target.value)}
          style={{ ...inputStyle, width: 'auto', flex: 1, textAlign: 'left' }}
        >
          <option value="">— Selecionar paciente —</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        {patient && (
          <span style={{ fontSize: 11, color: S.greenL }}>
            {patient.birth_date && `${new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos`}
            {patient.sex ? ` · ${patient.sex}` : ''}
          </span>
        )}
        {session.saving && <span style={{ fontSize: 11, color: S.muted }}>Salvando...</span>}
        {session.lastSaved && !session.saving && (
          <span style={{ fontSize: 11, color: S.greenL, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Salvo
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Menu lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TEST_CONFIG.map(group => (
            <div key={group.group}>
              <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 8px 4px' }}>
                {group.group}
              </div>
              {group.items.map(item => {
                const hasData = patientId && (
                  item.isAnamnese
                    ? session.session?.anamnesis && Object.keys(session.session.anamnesis).length > 0
                    : session.getTest(item.key) && Object.keys(session.getTest(item.key)).length > 0
                )
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveKey(item.key)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px',
                      borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12,
                      background: activeKey === item.key ? 'rgba(46,125,50,0.25)' : 'transparent',
                      color: activeKey === item.key ? '#fff' : S.muted,
                      fontWeight: activeKey === item.key ? 700 : 400,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    {item.label}
                    {hasData && <CheckCircle2 size={11} color={S.greenL} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Painel do teste ativo */}
        <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '20px 24px' }}>
          {!patientId ? (
            <div style={{ textAlign: 'center', padding: 40, color: S.muted }}>
              <FlaskConical size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Selecione um paciente para começar</p>
            </div>
          ) : activeConf ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{activeConf.label}</h2>
                  <p style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>{activeConf.isAnamnese ? 'Salvo automaticamente' : 'Classificação automática ao digitar'}</p>
                </div>
                {justSaved[activeKey] && (
                  <span style={{ fontSize: 11, color: S.greenL, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Save size={12} /> Salvo
                  </span>
                )}
              </div>
              <activeConf.Form
                data={activeConf.isAnamnese ? (session.session?.anamnesis || {}) : session.getTest(activeKey)}
                onChange={(data) => activeConf.isAnamnese
                  ? session.updateAnamnesis(data)
                  : handleChange(activeKey, data)
                }
              />
              {!activeConf.isAnamnese && (
                <TestScanUpload
                  patientId={patientId}
                  testKey={activeKey}
                  existingUrls={session.getTest(activeKey)?.scan_urls || []}
                  onUrlsChange={(urls) => handleChange(activeKey, { ...session.getTest(activeKey), scan_urls: urls })}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
