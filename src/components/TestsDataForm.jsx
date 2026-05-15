import React, { useState, useEffect, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ChevronDown, ChevronRight, Save } from 'lucide-react'

const S = {
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  greenL: '#4CAF50',
  green:  '#2E7D32',
  accent: '#60A5FA',
}

const inp = {
  background: 'rgba(255,255,255,0.06)',
  border: `1px solid rgba(255,255,255,0.10)`,
  color: '#fff',
  borderRadius: 5,
  padding: '4px 7px',
  fontSize: 11,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const inpRO = { ...inp, color: S.greenL, background: 'rgba(76,175,80,0.07)', cursor: 'default' }

function Acc({ title, badge, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 6, border: `1px solid ${S.border}`, borderRadius: 7, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none',
        padding: '8px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', color: '#fff',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {badge && <span style={{ fontSize: 9, background: 'rgba(76,175,80,0.2)', color: S.greenL, padding: '1px 6px', borderRadius: 9, fontWeight: 700 }}>{badge}</span>}
          {open ? <ChevronDown size={12} color={S.muted} /> : <ChevronRight size={12} color={S.muted} />}
        </div>
      </button>
      {open && <div style={{ padding: '10px 11px', background: 'rgba(0,0,0,0.15)' }}>{children}</div>}
    </div>
  )
}

function Lbl({ children }) {
  return <div style={{ fontSize: 9, color: S.muted, marginBottom: 2 }}>{children}</div>
}

function SubHead({ children }) {
  return <div style={{ fontSize: 9, color: S.greenL, fontWeight: 700, marginBottom: 4, marginTop: 8 }}>{children}</div>
}

function Grid({ cols = 3, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 5, marginBottom: 5 }}>{children}</div>
}

function Num({ label, value, onChange, max, min = '0', step = '1' }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <input type="number" value={value ?? ''} min={min} max={max} step={step}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={inp} />
    </div>
  )
}

function Txt({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{ ...inp, color: 'rgba(255,255,255,0.85)' }} />
    </div>
  )
}

function RO({ label, value }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div style={{ ...inpRO, display: 'flex', alignItems: 'center', minHeight: 26, fontWeight: value != null ? 700 : 400, fontSize: 11 }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

const DEX_LABELS = [
  'Planejamento','Impulsividade','Confabulação','Cognição Social','Desinibição',
  'Autocrítica','Dissociação','Memória de Intenções','Distratibilidade','Euforia',
  'Perseveração','Apatia','Descontrole Emocional','Inquietação','Concentração',
  'Juízo Crítico','Embotamento Afetivo','Sequência Temporal','Linguagem Espontânea','Tomada de Decisão',
]

function dexSum(dex, prefix) {
  return DEX_LABELS.reduce((s, _, i) => {
    const v = dex?.[`${prefix}_q${i + 1}`]
    return s + (v != null && v !== '' ? Number(v) : 0)
  }, 0)
}

export function TestsDataForm({ savedReportId, testsData, onUpdate }) {
  const [data, setData] = useState(testsData || {})
  const [saving, setSaving] = useState(false)
  const timerRef    = useRef(null)
  const saveTimer   = useRef(null)
  const dataRef     = useRef(data)
  const reportIdRef = useRef(savedReportId)

  useEffect(() => { reportIdRef.current = savedReportId }, [savedReportId])

  // Load from prop when savedReportId changes (new patient selected)
  useEffect(() => {
    const next = testsData || {}
    dataRef.current = next
    setData(next)
  }, [savedReportId]) // eslint-disable-line

  const set = (instrument, fields) => {
    const prev = dataRef.current
    const newInst = { ...(prev[instrument] || {}), ...fields }
    const newData = { ...prev, [instrument]: newInst }
    dataRef.current = newData
    setData(newData)
    onUpdate(newData)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const rid = reportIdRef.current
      if (rid) {
        setSaving(true)
        updateDoc(doc(db, 'reports', rid), { testsData: dataRef.current })
          .then(() => {
            setSaving(false)
            if (saveTimer.current) clearTimeout(saveTimer.current)
            saveTimer.current = setTimeout(() => setSaving(null), 1500)
          })
          .catch(() => setSaving(false))
      }
    }, 800)
  }

  const d = data

  // ── RAVLT auto ────────────────────────────────────────────────────────────────
  const rv = d?.RAVLT || {}
  const rn = k => (rv[k] != null && rv[k] !== '') ? Number(rv[k]) : null
  const rvTotal  = [rn('a1_score'),rn('a2_score'),rn('a3_score'),rn('a4_score'),rn('a5_score')].every(v=>v!=null)
    ? [rn('a1_score'),rn('a2_score'),rn('a3_score'),rn('a4_score'),rn('a5_score')].reduce((s,v)=>s+v,0) : null
  const rvAlt    = (rn('a1_score')!=null&&rn('a5_score')!=null) ? rn('a5_score')-rn('a1_score') : null
  const rvRec    = (rn('recognition_hits')!=null&&rn('recognition_false')!=null) ? rn('recognition_hits')-rn('recognition_false') : null
  const rvForg   = (rn('a6_score')!=null&&rn('a7_score')!=null&&rn('a6_score')>0) ? (rn('a7_score')/rn('a6_score')).toFixed(2) : null
  const rvRetro  = (rn('a5_score')!=null&&rn('a6_score')!=null&&rn('a5_score')>0) ? (rn('a6_score')/rn('a5_score')).toFixed(2) : null
  const rvProact = (rn('a1_score')!=null&&rn('b1_score')!=null&&rn('a1_score')>0) ? (rn('b1_score')/rn('a1_score')).toFixed(2) : null

  // ── TOKEN auto ────────────────────────────────────────────────────────────────
  const tokParts = ['part_a_score','part_b_score','part_c_score','part_d_score','part_e_score','part_f_score']
  const tokAuto  = tokParts.every(k => d?.TOKEN?.[k] != null && d?.TOKEN?.[k] !== '')
    ? tokParts.reduce((s,k) => s + Number(d.TOKEN[k]), 0) : null

  // ── DEX auto ─────────────────────────────────────────────────────────────────
  const dexPat = dexSum(d?.DEX, 'patient')
  const dexFam = dexSum(d?.DEX, 'family')

  const hasBadge = (key) => d?.[key] && Object.values(d[key]).some(v => v != null && v !== '')

  return (
    <div>
      {/* Save indicator */}
      {saving !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 10, color: saving ? S.muted : S.greenL }}>
          <Save size={10} />
          {saving ? 'Salvando...' : 'Salvo ✓'}
        </div>
      )}

      {/* ── ESCALAS CLÍNICAS ─────────────────────────────────────────────────── */}
      <Acc title="ESCALAS CLÍNICAS" badge={hasBadge('GDS-15') || hasBadge('GAI') || hasBadge('MEMIMP') ? '●' : ''}>
        <SubHead>GDS-15</SubHead>
        <Grid cols={2}>
          <Num label="Pontos (0–15)" value={d?.['GDS-15']?.total_score} onChange={v => set('GDS-15', { total_score: v })} max="15" />
          <Txt label="Classificação" value={d?.['GDS-15']?.classification} onChange={v => set('GDS-15', { classification: v })} placeholder="ex: sem depressão" />
        </Grid>

        <SubHead>GAI</SubHead>
        <Grid cols={2}>
          <Num label="Pontos (0–20)" value={d?.GAI?.total_score} onChange={v => set('GAI', { total_score: v })} max="20" />
          <Txt label="Classificação" value={d?.GAI?.classification} onChange={v => set('GAI', { classification: v })} placeholder="ex: sem ansiedade" />
        </Grid>

        <SubHead>MEMÓRIA PROSPECTIVA E RETROSPECTIVA (MEMIMP)</SubHead>
        <div style={{ fontSize: 9, color: S.muted, marginBottom: 4 }}>Paciente (auto-relato)</div>
        <Grid cols={2}>
          <Num label="Prospectiva" value={d?.MEMIMP?.patient_prospective_score} onChange={v => set('MEMIMP', { patient_prospective_score: v })} />
          <Txt label="Classificação Prosp." value={d?.MEMIMP?.patient_prospective_classification} onChange={v => set('MEMIMP', { patient_prospective_classification: v })} />
        </Grid>
        <Grid cols={2}>
          <Num label="Retrospectiva" value={d?.MEMIMP?.patient_retrospective_score} onChange={v => set('MEMIMP', { patient_retrospective_score: v })} />
          <Txt label="Classificação Retro." value={d?.MEMIMP?.patient_retrospective_classification} onChange={v => set('MEMIMP', { patient_retrospective_classification: v })} />
        </Grid>
        <div style={{ fontSize: 9, color: S.muted, marginBottom: 4, marginTop: 6 }}>Familiar / Informante</div>
        <Grid cols={2}>
          <Num label="Prospectiva" value={d?.MEMIMP?.family_prospective_score} onChange={v => set('MEMIMP', { family_prospective_score: v })} />
          <Txt label="Classificação Prosp." value={d?.MEMIMP?.family_prospective_classification} onChange={v => set('MEMIMP', { family_prospective_classification: v })} />
        </Grid>
        <Grid cols={2}>
          <Num label="Retrospectiva" value={d?.MEMIMP?.family_retrospective_score} onChange={v => set('MEMIMP', { family_retrospective_score: v })} />
          <Txt label="Classificação Retro." value={d?.MEMIMP?.family_retrospective_classification} onChange={v => set('MEMIMP', { family_retrospective_classification: v })} />
        </Grid>
        <Grid cols={2}>
          <Num label="Total Paciente" value={d?.MEMIMP?.patient_total} onChange={v => set('MEMIMP', { patient_total: v })} />
          <Num label="Total Familiar" value={d?.MEMIMP?.family_total} onChange={v => set('MEMIMP', { family_total: v })} />
        </Grid>
      </Acc>

      {/* ── DEX ──────────────────────────────────────────────────────────────── */}
      <Acc title="DEX — QUESTIONÁRIO DISEXECUTIVO" badge={dexPat > 0 || dexFam > 0 ? `P:${dexPat} F:${dexFam}` : ''}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 4, marginBottom: 5, fontSize: 9, color: S.muted, fontWeight: 700 }}>
          <div>Item (0 = nunca, 4 = sempre)</div>
          <div style={{ textAlign: 'center' }}>Paciente</div>
          <div style={{ textAlign: 'center' }}>Familiar</div>
        </div>
        {DEX_LABELS.map((label, i) => {
          const qi = i + 1
          return (
            <div key={qi} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 4, marginBottom: 3 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: S.muted, marginRight: 4, minWidth: 14 }}>{qi}.</span>{label}
              </div>
              <input type="number" min="0" max="4"
                value={d?.DEX?.[`patient_q${qi}`] ?? ''}
                onChange={e => {
                  const v = e.target.value === '' ? '' : Math.max(0, Math.min(4, Number(e.target.value)))
                  const cur = dataRef.current?.DEX || {}
                  const updated = { ...cur, [`patient_q${qi}`]: v }
                  const total = DEX_LABELS.reduce((s,_,idx) => {
                    const val = updated[`patient_q${idx+1}`]
                    return s + (val != null && val !== '' ? Number(val) : 0)
                  }, 0)
                  set('DEX', { [`patient_q${qi}`]: v, patient_total: total })
                }}
                style={{ ...inp, textAlign: 'center', padding: '3px 4px' }}
              />
              <input type="number" min="0" max="4"
                value={d?.DEX?.[`family_q${qi}`] ?? ''}
                onChange={e => {
                  const v = e.target.value === '' ? '' : Math.max(0, Math.min(4, Number(e.target.value)))
                  const cur = dataRef.current?.DEX || {}
                  const updated = { ...cur, [`family_q${qi}`]: v }
                  const total = DEX_LABELS.reduce((s,_,idx) => {
                    const val = updated[`family_q${idx+1}`]
                    return s + (val != null && val !== '' ? Number(val) : 0)
                  }, 0)
                  set('DEX', { [`family_q${qi}`]: v, family_total: total })
                }}
                style={{ ...inp, textAlign: 'center', padding: '3px 4px' }}
              />
            </div>
          )
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 4, marginTop: 8, borderTop: `1px solid ${S.border}`, paddingTop: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center' }}>TOTAL (0–80)</div>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: S.greenL }}>{dexPat || '—'}</div>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: S.greenL }}>{dexFam || '—'}</div>
        </div>
      </Acc>

      {/* ── TOKEN TEST ───────────────────────────────────────────────────────── */}
      <Acc title="TOKEN TEST" badge={tokAuto != null ? `${tokAuto}/36` : d?.TOKEN?.total_score != null ? `${d.TOKEN.total_score}/36` : ''}>
        {[
          { key: 'part_a_score', label: 'Parte A — Todas as peças', max: '7' },
          { key: 'part_b_score', label: 'Parte B — Somente grandes', max: '4' },
          { key: 'part_c_score', label: 'Parte C — Sem repetir', max: '4' },
          { key: 'part_d_score', label: 'Parte D — Grandes, sem repetir', max: '4' },
          { key: 'part_e_score', label: 'Parte E — Todas, sem repetir', max: '4' },
          { key: 'part_f_score', label: 'Parte F — Ordens verbais (máx 13)', max: '13' },
        ].map(p => (
          <Grid key={p.key} cols={2}>
            <Num label={`${p.label} (0–${p.max})`} value={d?.TOKEN?.[p.key]} onChange={v => {
              const updated = { ...(dataRef.current?.TOKEN || {}), [p.key]: v }
              const auto = tokParts.every(k => updated[k] != null && updated[k] !== '')
                ? tokParts.reduce((s,k) => s + Number(updated[k]), 0) : null
              set('TOKEN', { [p.key]: v, ...(auto != null ? { total_score: auto } : {}) })
            }} max={p.max} />
            <div />
          </Grid>
        ))}
        <Grid cols={2}>
          <RO label="Total (auto)" value={tokAuto != null ? `${tokAuto}/36` : d?.TOKEN?.total_score != null ? `${d.TOKEN.total_score}/36` : null} />
          <Txt label="Classificação" value={d?.TOKEN?.classification} onChange={v => set('TOKEN', { classification: v })} placeholder="Normal / Limítrofe / Comprometido" />
        </Grid>
      </Acc>

      {/* ── NEUPSILIN ────────────────────────────────────────────────────────── */}
      <Acc title="NEUPSILIN" badge={hasBadge('NEUPSILIN') ? '●' : ''}>
        <Grid cols={2}>
          <Num label="Idade" value={d?.NEUPSILIN?.age} onChange={v => set('NEUPSILIN', { age: v })} />
          <Txt label="Escolaridade (anos ou 1-4/5-8/9+)" value={d?.NEUPSILIN?.education_years}
            onChange={v => set('NEUPSILIN', { education_years: v })} placeholder="ex: 12 ou 9+" />
        </Grid>

        <SubHead>ORIENTAÇÃO</SubHead>
        <Grid>
          <Num label="Temporal (0–4)" value={d?.NEUPSILIN?.orientation_time_total} onChange={v => set('NEUPSILIN', { orientation_time_total: v })} max="4" />
          <Num label="Espacial (0–4)" value={d?.NEUPSILIN?.orientation_space_total} onChange={v => set('NEUPSILIN', { orientation_space_total: v })} max="4" />
          <div />
        </Grid>

        <SubHead>ATENÇÃO</SubHead>
        <Grid>
          <Num label="Contagem Inversa" value={d?.NEUPSILIN?.attention_reverse_count} onChange={v => set('NEUPSILIN', { attention_reverse_count: v })} />
          <Num label="Tempo Execução (seg)" value={d?.NEUPSILIN?.attention_execution_time} onChange={v => set('NEUPSILIN', { attention_execution_time: v })} min="0" step="1" />
          <Num label="Seq. de Dígitos" value={d?.NEUPSILIN?.attention_digit_sequence} onChange={v => set('NEUPSILIN', { attention_digit_sequence: v })} />
        </Grid>

        <SubHead>PERCEPÇÃO</SubHead>
        <Grid>
          <Num label="Julgamento de Linhas (0–6)" value={d?.NEUPSILIN?.perception_line_equality} onChange={v => set('NEUPSILIN', { perception_line_equality: v })} max="6" />
          <Num label="Heminegligência (0–1)" value={d?.NEUPSILIN?.perception_visual_hemineglect} onChange={v => set('NEUPSILIN', { perception_visual_hemineglect: v })} max="1" />
          <Num label="Percepção Faces (0–3)" value={d?.NEUPSILIN?.perception_face_perception} onChange={v => set('NEUPSILIN', { perception_face_perception: v })} max="3" />
        </Grid>
        <Grid cols={2}>
          <Num label="Reconhecimento Faces (0–2)" value={d?.NEUPSILIN?.perception_face_recognition} onChange={v => set('NEUPSILIN', { perception_face_recognition: v })} max="2" />
          <div />
        </Grid>

        <SubHead>MEMÓRIA</SubHead>
        <Grid>
          <Num label="Mem. Trabalho Ord." value={d?.NEUPSILIN?.memory_working} onChange={v => set('NEUPSILIN', { memory_working: v })} />
          <Num label="Mem. Trabalho Dígitos" value={d?.NEUPSILIN?.memory_working_digit} onChange={v => set('NEUPSILIN', { memory_working_digit: v })} />
          <Num label="Span Auditivo" value={d?.NEUPSILIN?.memory_span_auditory} onChange={v => set('NEUPSILIN', { memory_span_auditory: v })} />
        </Grid>
        <Grid>
          <Num label="Evocação Imediata" value={d?.NEUPSILIN?.memory_episodic_immediate} onChange={v => set('NEUPSILIN', { memory_episodic_immediate: v })} />
          <Num label="Evocação Tardia" value={d?.NEUPSILIN?.memory_episodic_delayed} onChange={v => set('NEUPSILIN', { memory_episodic_delayed: v })} />
          <Num label="Reconhecimento" value={d?.NEUPSILIN?.memory_episodic_recognition} onChange={v => set('NEUPSILIN', { memory_episodic_recognition: v })} />
        </Grid>
        <Grid>
          <Num label="Mem. Semântica" value={d?.NEUPSILIN?.memory_semantic_long} onChange={v => set('NEUPSILIN', { memory_semantic_long: v })} />
          <Num label="Mem. Visual" value={d?.NEUPSILIN?.memory_visual_short} onChange={v => set('NEUPSILIN', { memory_visual_short: v })} />
          <Num label="Mem. Prospectiva (0–2)" value={d?.NEUPSILIN?.memory_prospective} onChange={v => set('NEUPSILIN', { memory_prospective: v })} max="2" />
        </Grid>

        <SubHead>HABILIDADES ARITMÉTICAS</SubHead>
        <Grid cols={2}>
          <Num label="Aritmética (0–9)" value={d?.NEUPSILIN?.arithmetic} onChange={v => set('NEUPSILIN', { arithmetic: v })} max="9" />
          <div />
        </Grid>

        <SubHead>LINGUAGEM ORAL</SubHead>
        <Grid>
          <Num label="Nomeação (0–4)" value={d?.NEUPSILIN?.lang_nomeacao} onChange={v => set('NEUPSILIN', { lang_nomeacao: v })} max="4" />
          <Num label="Repetição (0–10)" value={d?.NEUPSILIN?.lang_repeticao} onChange={v => set('NEUPSILIN', { lang_repeticao: v })} max="10" />
          <Num label="Ling. Automática (0–2)" value={d?.NEUPSILIN?.lang_automatica} onChange={v => set('NEUPSILIN', { lang_automatica: v })} max="2" />
        </Grid>
        <Grid cols={2}>
          <Num label="Compreensão Oral (0–3)" value={d?.NEUPSILIN?.lang_compreensao_oral} onChange={v => set('NEUPSILIN', { lang_compreensao_oral: v })} max="3" />
          <Num label="Inferências (0–3)" value={d?.NEUPSILIN?.lang_inferencias} onChange={v => set('NEUPSILIN', { lang_inferencias: v })} max="3" />
        </Grid>

        <SubHead>LINGUAGEM ESCRITA</SubHead>
        <Grid>
          <Num label="Leitura (0–12)" value={d?.NEUPSILIN?.lang_leitura} onChange={v => set('NEUPSILIN', { lang_leitura: v })} max="12" />
          <Num label="Comp. Escrita (0–3)" value={d?.NEUPSILIN?.lang_compreensao_escrita} onChange={v => set('NEUPSILIN', { lang_compreensao_escrita: v })} max="3" />
          <Num label="Escrita Espontânea (0–2)" value={d?.NEUPSILIN?.lang_escrita_espontanea} onChange={v => set('NEUPSILIN', { lang_escrita_espontanea: v })} max="2" />
        </Grid>
        <Grid cols={2}>
          <Num label="Escrita Copiada (0–2)" value={d?.NEUPSILIN?.lang_escrita_copiada} onChange={v => set('NEUPSILIN', { lang_escrita_copiada: v })} max="2" />
          <Num label="Escrita Ditada (0–12)" value={d?.NEUPSILIN?.lang_ditada} onChange={v => set('NEUPSILIN', { lang_ditada: v })} max="12" />
        </Grid>

        <SubHead>PRAXIAS</SubHead>
        <Grid>
          <Num label="Ideomotora (0–3)" value={d?.NEUPSILIN?.praxis_ideomotor} onChange={v => set('NEUPSILIN', { praxis_ideomotor: v })} max="3" />
          <Num label="Construtiva" value={d?.NEUPSILIN?.praxis_constructive} onChange={v => set('NEUPSILIN', { praxis_constructive: v })} max="15" />
          <Num label="Reflexiva" value={d?.NEUPSILIN?.praxis_reflexive} onChange={v => set('NEUPSILIN', { praxis_reflexive: v })} max="3" />
        </Grid>

        <SubHead>FUNÇÕES EXECUTIVAS</SubHead>
        <Grid cols={2}>
          <Num label="Resolução Problemas (0–2)" value={d?.NEUPSILIN?.executive_problem_solving} onChange={v => set('NEUPSILIN', { executive_problem_solving: v })} max="2" />
          <Num label="Fluência Verbal (nº palavras)" value={d?.NEUPSILIN?.executive_verbal_fluency} onChange={v => set('NEUPSILIN', { executive_verbal_fluency: v })} />
        </Grid>
      </Acc>

      {/* ── BAMS ─────────────────────────────────────────────────────────────── */}
      <Acc title="BAMS — MEMÓRIA SEMÂNTICA" badge={d?.BAMS?.global_score != null ? `Global: ${d.BAMS.global_score}` : ''}>
        <SubHead>Fatores</SubHead>
        <Grid>
          <Num label="FV — Fluência Verbal" value={d?.BAMS?.fv_total} onChange={v => set('BAMS', { fv_total: v })} />
          <Num label="ND — Nomeação" value={d?.BAMS?.nd_total} onChange={v => set('BAMS', { nd_total: v })} />
          <Num label="NI — Nom. por Imagem" value={d?.BAMS?.ni_total} onChange={v => set('BAMS', { ni_total: v })} />
        </Grid>
        <Grid>
          <Num label="CG — Categ. Genérica" value={d?.BAMS?.cg_total} onChange={v => set('BAMS', { cg_total: v })} />
          <Num label="DP — Det. de Partes" value={d?.BAMS?.dp_total} onChange={v => set('BAMS', { dp_total: v })} />
          <Num label="CI — Categ. Individual" value={d?.BAMS?.ci_total} onChange={v => set('BAMS', { ci_total: v })} />
        </Grid>
        <Grid cols={2}>
          <Num label="CV — Comparação Visual" value={d?.BAMS?.cv_total} onChange={v => set('BAMS', { cv_total: v })} />
          <div />
        </Grid>
        <SubHead>Subtestes específicos</SubHead>
        <Grid>
          <Num label="Léxico" value={d?.BAMS?.lexico_score} onChange={v => set('BAMS', { lexico_score: v })} />
          <Num label="Categorização" value={d?.BAMS?.categorization_score} onChange={v => set('BAMS', { categorization_score: v })} />
          <Num label="Conceitualização" value={d?.BAMS?.conceptualization_score} onChange={v => set('BAMS', { conceptualization_score: v })} />
        </Grid>
        <SubHead>Resultado Global</SubHead>
        <Grid>
          <Num label="Escore Global" value={d?.BAMS?.global_score} onChange={v => set('BAMS', { global_score: v })} />
          <Num label="Percentil" value={d?.BAMS?.percentile} onChange={v => set('BAMS', { percentile: v })} max="100" />
          <Txt label="Classificação" value={d?.BAMS?.classification || d?.BAMS?.interpretation}
            onChange={v => set('BAMS', { classification: v, interpretation: v })} placeholder="ex: Médio" />
        </Grid>
      </Acc>

      {/* ── RAVLT ────────────────────────────────────────────────────────────── */}
      <Acc title="RAVLT — MEMÓRIA VERBAL" badge={rvTotal != null ? `A1–A5: ${rvTotal}` : ''}>
        <SubHead>Tentativas de Aprendizagem</SubHead>
        <Grid>
          {['a1','a2','a3','a4','a5'].map(k => (
            <Num key={k} label={k.toUpperCase()} value={rv[`${k}_score`]}
              onChange={v => set('RAVLT', { [`${k}_score`]: v })} max="15" />
          ))}
        </Grid>
        <Grid>
          <Num label="B1 — Lista Distratora" value={rv.b1_score} onChange={v => set('RAVLT', { b1_score: v })} max="15" />
          <Num label="A6 — Pós-interferência" value={rv.a6_score} onChange={v => set('RAVLT', { a6_score: v })} max="15" />
          <Num label="A7 — Evocação Tardia" value={rv.a7_score} onChange={v => set('RAVLT', { a7_score: v })} max="15" />
        </Grid>

        <SubHead>Reconhecimento</SubHead>
        <Grid>
          <Num label="Acertos (hits)" value={rv.recognition_hits} onChange={v => set('RAVLT', { recognition_hits: v })} max="15" />
          <Num label="Falsos Positivos" value={rv.recognition_false} onChange={v => set('RAVLT', { recognition_false: v })} />
          <RO label="Reconhecimento (auto)" value={rvRec ?? rv.recognition_score} />
        </Grid>
        {rvRec != null && rv.recognition_score == null && (
          <button onClick={() => set('RAVLT', { recognition_score: Number(rvRec) })}
            style={{ fontSize: 9, color: S.accent, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginBottom: 4 }}>
            ↑ salvar reconhecimento calculado ({rvRec})
          </button>
        )}

        <SubHead>Índices Derivados (auto-calculados)</SubHead>
        <Grid cols={2}>
          <RO label="Total A1–A5" value={rvTotal ?? rv.total_score} />
          <RO label="ALT — A5−A1" value={rvAlt ?? rv.alt_score} />
          <RO label="Vel. Esquecimento (A7/A6)" value={rvForg ?? rv.forgetting_speed} />
          <RO label="Interf. Retroativa (A6/A5)" value={rvRetro ?? rv.retroactive_interference} />
          <RO label="Interf. Proativa (B1/A1)" value={rvProact ?? rv.proactive_interference} />
          <div />
        </Grid>
        <button onClick={() => {
          const fields = {}
          if (rvTotal != null) fields.total_score = rvTotal
          if (rvAlt   != null) fields.alt_score = rvAlt
          if (rvRec   != null) fields.recognition_score = Number(rvRec)
          if (rvForg  != null) fields.forgetting_speed = Number(rvForg)
          if (rvRetro != null) fields.retroactive_interference = Number(rvRetro)
          if (rvProact!= null) fields.proactive_interference = Number(rvProact)
          if (Object.keys(fields).length > 0) set('RAVLT', fields)
        }} style={{ fontSize: 9, color: S.accent, background: 'none', border: `1px solid rgba(96,165,250,0.3)`, cursor: 'pointer', padding: '3px 8px', borderRadius: 4, marginBottom: 8 }}>
          ↑ Salvar todos os índices calculados
        </button>

        <SubHead>Percentil e Classificação</SubHead>
        <Grid cols={2}>
          <Num label="Percentil" value={rv.percentile} onChange={v => set('RAVLT', { percentile: v })} max="100" />
          <Txt label="Classificação" value={rv.classification} onChange={v => set('RAVLT', { classification: v })} placeholder="ex: Média" />
        </Grid>
      </Acc>

      <style>{`
        input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }
        input::placeholder { color: rgba(255,255,255,0.18) !important; }
        input:focus { border-color: rgba(76,175,80,0.5) !important; outline: none; }
      `}</style>
    </div>
  )
}
