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

// ─── NEUPSILIN (Z-scores) ─────────────────────────────────────────────────────
function NEUPSILINForm({ data, onChange }) {
  const d = data || {}
  const set = (k, v) => onChange({ ...d, zScores: { ...(d.zScores||{}), [k]: v } })
  const z = d.zScores || {}
  const fields = [
    { key: 'orientation', label: 'Orientação' },
    { key: 'attention',   label: 'Atenção' },
    { key: 'perception',  label: 'Percepção' },
    { key: 'memory',      label: 'Memória' },
    { key: 'arithmetic',  label: 'Aritmética' },
    { key: 'language',    label: 'Linguagem' },
    { key: 'praxis',      label: 'Praxia' },
    { key: 'executive',   label: 'Funções Executivas' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
      {fields.map(f => {
        const c = classify.zscore(z[f.key])
        return (
          <div key={f.key}>
            <NumField label={f.label} value={z[f.key]} onChange={v => set(f.key, v)} step={0.01} hint="z-score" />
            {c && <div style={{ marginTop: 3 }}><Badge {...c} /></div>}
          </div>
        )
      })}
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

// ─── Configuração dos testes ──────────────────────────────────────────────────
const TEST_CONFIG = [
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
                const hasData = patientId && session.getTest(item.key) && Object.keys(session.getTest(item.key)).length > 0
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
                  <p style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>Classificação automática ao digitar</p>
                </div>
                {justSaved[activeKey] && (
                  <span style={{ fontSize: 11, color: S.greenL, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Save size={12} /> Salvo
                  </span>
                )}
              </div>
              <activeConf.Form
                data={session.getTest(activeKey)}
                onChange={(data) => handleChange(activeKey, data)}
              />
              <TestScanUpload
                patientId={patientId}
                testKey={activeKey}
                existingUrls={session.getTest(activeKey)?.scan_urls || []}
                onUrlsChange={(urls) => handleChange(activeKey, { ...session.getTest(activeKey), scan_urls: urls })}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
