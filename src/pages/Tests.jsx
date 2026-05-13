import React, { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useTestSession } from '@/hooks/useTestSession'
import { FlaskConical, Save, CheckCircle2, User, ChevronRight } from 'lucide-react'

const S = {
  card: '#1A2744', cardG: '#1A3D2B', green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
  amber: '#F59E0B', blue: '#60A5FA', danger: '#EF4444', purple: '#C084FC',
  teal: '#34D399', sky: '#38BDF8', orange: '#FB923C', rose: '#F87171',
}

// ── Classificação automática ────────────────────────────────────────────────
const classPfeffer= n => n===''||n==null ? '' : +n<=5 ? 'Sem comprometimento funcional' : 'Comprometimento funcional significativo'
const classGDS   = n => n===''||n==null ? '' : +n<=4 ? 'Sem depressão' : +n<=10 ? 'Depressão leve/moderada' : 'Depressão grave'
const classBDI   = n => n===''||n==null ? '' : +n<=13 ? 'Mínima' : +n<=19 ? 'Leve' : +n<=28 ? 'Moderada' : 'Grave'
const classGAI   = n => n===''||n==null ? '' : +n>=10 ? 'Ansiedade clinicamente significativa' : +n>=9 ? 'Provável ansiedade' : 'Ausência de ansiedade clínica'
const classHAD   = n => n===''||n==null ? '' : +n<=7 ? 'Normal' : +n<=10 ? 'Leve' : +n<=14 ? 'Moderado' : 'Grave'
const classFAB   = n => n===''||n==null ? '' : +n>=16 ? 'Normal' : +n>=12 ? 'Comprometimento leve' : +n>=6 ? 'Comprometimento moderado' : 'Comprometimento grave'
const classIDATE = n => n===''||n==null ? '' : +n<=34 ? 'Ansiedade baixa' : +n<=49 ? 'Ansiedade moderada' : +n<=64 ? 'Ansiedade elevada' : 'Ansiedade altíssima'
const classDEX   = n => n===''||n==null ? '' : +n/20<=1.5 ? 'Sem alteração significativa' : +n/20<=2.5 ? 'Comprometimento leve' : 'Comprometimento significativo'
const classLawton= n => n===''||n==null ? '' : +n>=20 ? 'Independência total' : +n>=12 ? 'Dependência parcial' : 'Dependência significativa'
const classBADL  = n => n===''||n==null ? '' : parseFloat(n)>=3.12 ? 'Comprometido' : 'Preservado'
const classIQCODE= n => n===''||n==null ? '' : parseFloat(n)>3.84 ? 'Declínio cognitivo considerável' : parseFloat(n)>3.51 ? 'Declínio cognitivo leve' : 'Sem declínio cognitivo significativo'
const classRAVLT = n => n===''||n==null||+n===0 ? '' : +n>=45 ? 'Superior' : +n>=40 ? 'Acima da Média' : +n>=35 ? 'Média' : +n>=30 ? 'Abaixo da Média' : 'Déficit'

const colorFor = (cls) => {
  if (!cls) return undefined
  const c = cls.toLowerCase()
  if (
    c.includes('preservado') || c.includes('independ') || c.includes('sem ') ||
    c.includes('normal') || c.includes('mínima') || c.includes('total') ||
    c.includes('ausência') || c.includes('baixa') || c.includes('superior') ||
    c.includes('acima') || c === 'média' || c.includes('sem alteração') ||
    (c.includes('médio') && !c.includes('inferior'))
  ) return S.greenL
  if (
    c.includes('leve') || c.includes('parcial') || c.includes('limítrofe') ||
    c.includes('provável') || c.includes('abaixo') || c.includes('moderada') ||
    c.includes('moderado') || c === 'média alta' || c.includes('inferior')
  ) return S.amber
  return S.danger
}

// ── Configuração de todos os testes ────────────────────────────────────────
const TESTS_CONFIG = [

  // ── MEMÓRIA ──────────────────────────────────────────────────────────────

  {
    key: 'RAVLT', label: 'RAVLT', group: 'Memória',
    desc: 'Rey Auditory Verbal Learning Test',
    cutoff: 'Total A1–A5: ≥45 Superior · ≥40 Acima da Média · ≥35 Média · ≥30 Abaixo da Média · <30 Déficit',
    fields: [
      { key: 'a1', label: 'A1 — 1ª tentativa', max: 15 },
      { key: 'a2', label: 'A2 — 2ª tentativa', max: 15 },
      { key: 'a3', label: 'A3 — 3ª tentativa', max: 15 },
      { key: 'a4', label: 'A4 — 4ª tentativa', max: 15 },
      { key: 'a5', label: 'A5 — 5ª tentativa', max: 15 },
      { key: 'b1', label: 'Lista B — interferência', max: 15 },
      { key: 'a6', label: 'A6 — evocação imediata pós-B', max: 15 },
      { key: 'a7', label: 'A7 — evocação tardia', max: 15 },
      { key: 'intrusions_a7', label: 'Intrusões em A7', max: 15 },
      { key: 'recognition', label: 'Reconhecimento (acertos − intrusões)', max: 30 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const total = ['a1','a2','a3','a4','a5'].reduce((s,k) => s + (+d[k]||0), 0)
      const a1n = +d.a1||0, a5n = +d.a5||0, a6n = +d.a6||0, a7n = +d.a7||0, b1n = +d.b1||0
      const cls = classRAVLT(total)
      const results = [
        { label: 'Total A1–A5', value: total, max: 75 },
        { label: 'Curva de aprendizagem', value: `${d.a1||'-'}→${d.a2||'-'}→${d.a3||'-'}→${d.a4||'-'}→${d.a5||'-'}` },
      ]
      if (cls) results.push({ label: 'Classificação', value: cls, color: colorFor(cls) })
      if (a5n > 0 && a1n > 0)
        results.push({ label: 'Velocidade aprendizagem (A5−A1)', value: a5n - a1n, max: 14 })
      if (a5n > 0 && a7n > 0)
        results.push({ label: 'Índice de retenção (A7/A5 %)', value: ((a7n / a5n) * 100).toFixed(1) + '%' })
      if (a5n > 0 && a6n > 0)
        results.push({ label: 'Interferência retroativa (A6/A5 %)', value: ((a6n / a5n) * 100).toFixed(1) + '%' })
      if (a1n > 0 && b1n > 0)
        results.push({ label: 'Interferência proativa (B1/A1 %)', value: ((b1n / a1n) * 100).toFixed(1) + '%' })
      return results
    },
    derive: d => {
      const total_a1_a5 = ['a1','a2','a3','a4','a5'].reduce((s,k) => s + (+d[k]||0), 0)
      const a1n = +d.a1||0, a5n = +d.a5||0, a7n = +d.a7||0, b1n = +d.b1||0, a6n = +d.a6||0
      return {
        total_a1_a5,
        classification: classRAVLT(total_a1_a5) || null,
        retention_index: a5n > 0 && a7n > 0 ? +((a7n / a5n) * 100).toFixed(1) : null,
        retroactive_interference: a5n > 0 && a6n > 0 ? +((a6n / a5n) * 100).toFixed(1) : null,
        proactive_interference:   a1n > 0 && b1n > 0 ? +((b1n / a1n) * 100).toFixed(1) : null,
        learning_speed: a5n > 0 && a1n > 0 ? a5n - a1n : null,
      }
    },
  },

  {
    key: 'BAMS', label: 'BAMS', group: 'Memória',
    desc: 'Bateria de Avaliação da Memória Semântica',
    cutoff: 'Escore global interpretado por percentil conforme tabela normativa',
    fields: [
      { key: 'fv_animais',    label: 'Fluência verbal — Animais (acertos/min)' },
      { key: 'fv_frutas',     label: 'Fluência verbal — Frutas (acertos/min)'  },
      { key: 'fv_utensilios', label: 'Fluência verbal — Utensílios (acertos/min)' },
      { key: 'fv_roupas',     label: 'Fluência verbal — Roupas (acertos/min)'  },
      { key: 'nd_total', label: 'Nomeação por denominação — ND (0–10)', max: 10 },
      { key: 'ni_total', label: 'Nomeação por indução — NI (0–28)',     max: 28 },
      { key: 'cg_total', label: 'Categorização gráfica — CG (0–10)',   max: 10 },
      { key: 'dp_total', label: 'Definição de palavras — DP (0–10)',   max: 10 },
      { key: 'ci_total', label: 'Compreensão de inferências — CI (0–10)', max: 10 },
      { key: 'cv_total', label: 'Compreensão de vocabulário — CV (0–10)', max: 10 },
      { key: 'percentile', label: 'Percentil (tabela normativa)', max: 100 },
      { key: 'interpretation', label: 'Interpretação', type: 'select', span: 'full',
        options: ['Desempenho Superior', 'Médio Superior', 'Médio', 'Médio Inferior', 'Limítrofe', 'Rebaixamento Significativo'] },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const fv = (+d.fv_animais||0)+(+d.fv_frutas||0)+(+d.fv_utensilios||0)+(+d.fv_roupas||0)
      const lexico  = (+d.nd_total||0)+(+d.ni_total||0)
      const categ   = fv+(+d.ci_total||0)+(+d.cv_total||0)
      const concept = (+d.cg_total||0)+(+d.dp_total||0)
      const global  = fv+(+d.nd_total||0)+(+d.ni_total||0)+(+d.cg_total||0)+(+d.dp_total||0)+(+d.ci_total||0)+(+d.cv_total||0)
      const results = []
      if (global > 0) {
        results.push({ label: 'Escore léxico (ND+NI)',            value: lexico })
        results.push({ label: 'Escore categorização (FV+CI+CV)',  value: categ  })
        results.push({ label: 'Escore conceitualização (CG+DP)',  value: concept })
        results.push({ label: 'Escore global BAMS',               value: global  })
      }
      if (d.interpretation) results.push({ label: 'Interpretação', value: d.interpretation, color: colorFor(d.interpretation) })
      return results
    },
    derive: d => {
      const fv = (+d.fv_animais||0)+(+d.fv_frutas||0)+(+d.fv_utensilios||0)+(+d.fv_roupas||0)
      return {
        lexico_score:           (+d.nd_total||0)+(+d.ni_total||0),
        categorization_score:   fv+(+d.ci_total||0)+(+d.cv_total||0),
        conceptualization_score:(+d.cg_total||0)+(+d.dp_total||0),
        global_score:           fv+(+d.nd_total||0)+(+d.ni_total||0)+(+d.cg_total||0)+(+d.dp_total||0)+(+d.ci_total||0)+(+d.cv_total||0),
        percentile:    d.percentile    ?? null,
        interpretation:d.interpretation?? null,
      }
    },
  },

  {
    key: 'MEMIMP', label: 'MEMIMP', group: 'Memória',
    desc: 'Memória Prospectiva e Retrospectiva (PRMQ)',
    fields: [
      { key: 'score_prospectivo',   label: 'Subtotal Prospectivo (8 itens × 1–5)',   min: 8, max: 40 },
      { key: 'score_retrospectivo', label: 'Subtotal Retrospectivo (8 itens × 1–5)', min: 8, max: 40 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const p = +d.score_prospectivo||0, r = +d.score_retrospectivo||0
      return (p||r) ? [{ label: 'Total MEMIMP', value: p+r, max: 80, cutoff: 'Escores maiores = mais falhas de memória' }] : []
    },
  },

  // ── BATERIA COGNITIVA ─────────────────────────────────────────────────────

  {
    key: 'NEUPSILIN', label: 'NEUPSILIN', group: 'Bateria Cognitiva',
    desc: 'Instrumento de Avaliação Neuropsicológica Breve',
    cutoff: 'Z ≥ −1,0 = Preservado · Z −1,0 a −2,0 = Limítrofe · Z < −2,0 = Comprometido',
    fields: [
      // Orientação
      { key: 'orientation_time',      label: 'Orientação temporal (0–4)',                max: 4  },
      { key: 'orientation_space',     label: 'Orientação espacial (0–4)',                max: 4  },
      // Atenção
      { key: 'attention_count',       label: 'Atenção — contagem inversa (0–20)',        max: 20 },
      { key: 'attention_digits',      label: 'Atenção — sequência de dígitos (0–7)',     max: 7  },
      // Percepção
      { key: 'total_perception',      label: 'Percepção visual — total',                max: 14 },
      // Memória
      { key: 'memory_working',        label: 'Memória de trabalho — ordenamento (0–10)',max: 10 },
      { key: 'memory_span',           label: 'Span auditivo de sentenças (0–28)',        max: 28 },
      { key: 'memory_imm',            label: 'Memória episódica verbal imediata (0–9)', max: 9  },
      { key: 'memory_del',            label: 'Memória episódica verbal tardia (0–9)',   max: 9  },
      { key: 'memory_recog',          label: 'Reconhecimento verbal (0–18)',             max: 18 },
      { key: 'memory_semantic',       label: 'Memória semântica (0–5)',                 max: 5  },
      { key: 'memory_visual',         label: 'Memória visual (0–3)',                    max: 3  },
      { key: 'memory_prospective',    label: 'Memória prospectiva (0–2)',               max: 2  },
      // Linguagem
      { key: 'language_oral',         label: 'Linguagem oral — total (0–22)',           max: 22 },
      { key: 'language_written',      label: 'Linguagem escrita — total (0–30)',        max: 30 },
      // Aritmética
      { key: 'arithmetic_skills',     label: 'Habilidades aritméticas (0–4)',           max: 4  },
      // Praxias
      { key: 'praxis_ideomotor',      label: 'Praxias ideomotoras (0–3)',               max: 3  },
      { key: 'praxis_constructive',   label: 'Praxias construtivas (0–4)',              max: 4  },
      { key: 'praxis_reflexive',      label: 'Praxias reflexivas (0–3)',                max: 3  },
      // Funções executivas
      { key: 'executive_problem',     label: 'Resolução de problemas (0–2)',            max: 2  },
      { key: 'executive_fluency',     label: 'Fluência verbal (nº de palavras)',        max: 30 },
      // Z-escores (inserir conforme tabela normativa)
      { key: 'z_orientation', label: 'Z-escore — Orientação',         step: 0.01, min: -5, max: 5 },
      { key: 'z_attention',   label: 'Z-escore — Atenção',            step: 0.01, min: -5, max: 5 },
      { key: 'z_perception',  label: 'Z-escore — Percepção visual',   step: 0.01, min: -5, max: 5 },
      { key: 'z_memory',      label: 'Z-escore — Memória',            step: 0.01, min: -5, max: 5 },
      { key: 'z_language',    label: 'Z-escore — Linguagem',          step: 0.01, min: -5, max: 5 },
      { key: 'z_praxis',      label: 'Z-escore — Praxias',            step: 0.01, min: -5, max: 5 },
      { key: 'z_executive',   label: 'Z-escore — Funções executivas', step: 0.01, min: -5, max: 5 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const classZ = z => (z === '' || z == null) ? '' : +z >= -1 ? 'Preservado' : +z >= -2 ? 'Limítrofe' : 'Comprometido'
      const results = []
      const total_orientation = (+d.orientation_time||0)+(+d.orientation_space||0)
      const total_attention   = (+d.attention_count||0)+(+d.attention_digits||0)
      const total_memory      = (+d.memory_working||0)+(+d.memory_span||0)+(+d.memory_imm||0)+(+d.memory_del||0)+(+d.memory_recog||0)+(+d.memory_semantic||0)+(+d.memory_visual||0)+(+d.memory_prospective||0)
      const total_language    = (+d.language_oral||0)+(+d.language_written||0)
      const total_praxis      = (+d.praxis_ideomotor||0)+(+d.praxis_constructive||0)+(+d.praxis_reflexive||0)
      const total_executive   = (+d.executive_problem||0)+(+d.executive_fluency||0)
      if (total_orientation) results.push({ label: 'Total orientação', value: total_orientation, max: 8  })
      if (total_attention)   results.push({ label: 'Total atenção',    value: total_attention,   max: 27 })
      if (+d.total_perception) results.push({ label: 'Total percepção', value: +d.total_perception })
      if (total_memory)      results.push({ label: 'Total memória',    value: total_memory })
      if (total_language)    results.push({ label: 'Total linguagem',  value: total_language, max: 52 })
      if (+d.arithmetic_skills) results.push({ label: 'Aritmética',   value: +d.arithmetic_skills, max: 4 })
      if (total_praxis)      results.push({ label: 'Total praxias',    value: total_praxis, max: 10 })
      if (total_executive)   results.push({ label: 'Total executivas', value: total_executive })
      ;[
        ['z_orientation','Orientação'], ['z_attention','Atenção'],   ['z_perception','Percepção'],
        ['z_memory','Memória'],         ['z_language','Linguagem'],  ['z_praxis','Praxias'],
        ['z_executive','Exec.'],
      ].forEach(([k, lbl]) => {
        if (d[k] !== '' && d[k] != null) {
          const cls = classZ(d[k])
          results.push({ label: lbl, value: `Z = ${d[k]}  (${cls})`, color: colorFor(cls) })
        }
      })
      return results
    },
    derive: d => {
      const classZ = z => (z === '' || z == null) ? null : +z >= -1 ? 'Preservado' : +z >= -2 ? 'Limítrofe' : 'Comprometido'
      return {
        total_orientation:          (+d.orientation_time||0)+(+d.orientation_space||0),
        total_attention:            (+d.attention_count||0)+(+d.attention_digits||0),
        total_perception:           +d.total_perception||0,
        memory_working:             +d.memory_working||0,
        memory_span:                +d.memory_span||0,
        total_memory:               (+d.memory_working||0)+(+d.memory_span||0)+(+d.memory_imm||0)+(+d.memory_del||0)+(+d.memory_recog||0)+(+d.memory_semantic||0)+(+d.memory_visual||0)+(+d.memory_prospective||0),
        arithmetic_skills:          +d.arithmetic_skills||0,
        language_oral:              +d.language_oral||0,
        language_written:           +d.language_written||0,
        total_language:             (+d.language_oral||0)+(+d.language_written||0),
        praxis_ideomotor:           +d.praxis_ideomotor||0,
        praxis_constructive:        +d.praxis_constructive||0,
        praxis_reflexive:           +d.praxis_reflexive||0,
        total_praxis:               (+d.praxis_ideomotor||0)+(+d.praxis_constructive||0)+(+d.praxis_reflexive||0),
        total_executive:            (+d.executive_problem||0)+(+d.executive_fluency||0),
        z_orientation:              d.z_orientation ?? null,
        z_attention:                d.z_attention   ?? null,
        z_perception:               d.z_perception  ?? null,
        z_memory:                   d.z_memory      ?? null,
        z_language:                 d.z_language    ?? null,
        z_praxis:                   d.z_praxis      ?? null,
        z_executive:                d.z_executive   ?? null,
        classification_orientation: classZ(d.z_orientation),
        classification_attention:   classZ(d.z_attention),
        classification_perception:  classZ(d.z_perception),
        classification_memory:      classZ(d.z_memory),
        classification_language:    classZ(d.z_language),
        classification_praxis:      classZ(d.z_praxis),
        classification_executive:   classZ(d.z_executive),
      }
    },
  },

  {
    key: 'TRIACOG', label: 'TRIACOG', group: 'Bateria Cognitiva',
    desc: 'Triagem Cognitiva Breve',
    fields: [
      { key: 'orientacao',          label: 'Orientação',          max: 10 },
      { key: 'memoria_imediata',    label: 'Memória imediata',    max: 3  },
      { key: 'atencao',             label: 'Atenção/cálculo',     max: 5  },
      { key: 'evocacao',            label: 'Evocação',            max: 3  },
      { key: 'linguagem',           label: 'Linguagem',           max: 8  },
      { key: 'praxia_construtiva',  label: 'Praxia construtiva',  max: 1  },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const total = ['orientacao','memoria_imediata','atencao','evocacao','linguagem','praxia_construtiva'].reduce((s,k)=>s+(+d[k]||0),0)
      return total > 0 ? [
        { label: 'Total TRIACOG', value: total, max: 30, cutoff: '≥24 normal | <24 sugestivo de comprometimento' },
      ] : []
    },
    derive: d => ({
      total_score: ['orientacao','memoria_imediata','atencao','evocacao','linguagem','praxia_construtiva'].reduce((s,k)=>s+(+d[k]||0),0),
    }),
  },

  // ── INTELIGÊNCIA ──────────────────────────────────────────────────────────

  {
    key: 'WASI-III', label: 'WASI-III', group: 'Inteligência',
    desc: 'Wechsler Abbreviated Scale of Intelligence — 3ª Edição',
    fields: [
      { key: 'vocab_bruto',          label: 'Vocabulário — bruto',                max: 80  },
      { key: 'vocab_ponderado',      label: 'Vocabulário — ponderado',            max: 19  },
      { key: 'cubos_bruto',          label: 'Cubos — bruto',                      max: 71  },
      { key: 'cubos_ponderado',      label: 'Cubos — ponderado',                  max: 19  },
      { key: 'matrices_bruto',       label: 'Raciocínio matricial — bruto',       max: 35  },
      { key: 'matrices_ponderado',   label: 'Raciocínio matricial — ponderado',   max: 19  },
      { key: 'semelhancas_bruto',    label: 'Semelhanças — bruto',                max: 36  },
      { key: 'semelhancas_ponderado',label: 'Semelhanças — ponderado',            max: 19  },
      { key: 'qi_verbal',            label: 'QI Verbal (VCI)',                    max: 160 },
      { key: 'qi_execucao',          label: 'QI de Execução (PRI)',               max: 160 },
      { key: 'qit_2',                label: 'QI Total (FSIQ-4)',                  max: 160 },
      { key: 'qit_percentile',       label: 'Percentil do QI Total',             max: 99  },
      { key: 'classification', label: 'Classificação intelectual', type: 'select', span: 'full',
        options: ['Muito Superior (≥130)', 'Superior (120–129)', 'Média Alta (110–119)', 'Médio (90–109)', 'Média Baixa (80–89)', 'Limítrofe (70–79)', 'Extremamente Baixo (<70)'] },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
  },

  // ── FUNÇÕES EXECUTIVAS ────────────────────────────────────────────────────

  {
    key: 'WCST-N', label: 'WCST-N', group: 'Funções Executivas',
    desc: 'Wisconsin Card Sorting Test — Nelson',
    fields: [
      { key: 'categories_completed',    label: 'Categorias completadas',          max: 6   },
      { key: 'perseverative_errors',    label: 'Erros perseverativos',            max: 128 },
      { key: 'non_perseverative_errors',label: 'Erros não-perseverativos',        max: 128 },
      { key: 'perseverative_responses', label: 'Respostas perseverativas',        max: 128 },
      { key: 'total_errors',            label: 'Erros totais',                    max: 128 },
      { key: 'first_cat_attempts',      label: 'Tentativas para 1ª categoria',    max: 128 },
      { key: 'total_trials',            label: 'Total de tentativas',             max: 128 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
  },

  {
    key: 'FAB', label: 'FAB', group: 'Funções Executivas',
    desc: 'Frontal Assessment Battery',
    fields: [
      { key: 'semelhancas',              label: 'Semelhanças (abstração)',      max: 3 },
      { key: 'fluencia_lexical',         label: 'Fluência lexical',             max: 3 },
      { key: 'serie_motora',             label: 'Série motora de Luria',        max: 3 },
      { key: 'instrucoes_conflitantes',  label: 'Instruções conflitantes',      max: 3 },
      { key: 'go_no_go',                 label: 'Go–No-Go',                     max: 3 },
      { key: 'comportamento_preensao',   label: 'Comportamento de preensão',    max: 3 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const FAB_KEYS = ['semelhancas','fluencia_lexical','serie_motora','instrucoes_conflitantes','go_no_go','comportamento_preensao']
      const total = FAB_KEYS.reduce((s,k)=>s+(+d[k]||0),0)
      const cls = classFAB(total)
      return total > 0 ? [
        { label: 'Total FAB', value: total, max: 18 },
        { label: 'Classificação', value: cls || '—', color: colorFor(cls) },
      ] : []
    },
    derive: d => {
      const FAB_KEYS = ['semelhancas','fluencia_lexical','serie_motora','instrucoes_conflitantes','go_no_go','comportamento_preensao']
      const total_score = FAB_KEYS.reduce((s,k)=>s+(+d[k]||0),0)
      return { total_score, classification: classFAB(total_score) }
    },
  },

  {
    key: 'DEX', label: 'DEX', group: 'Funções Executivas',
    desc: 'Dysexecutive Questionnaire — BADS',
    cutoff: 'Média ÷20: ≤1,5 sem alteração · ≤2,5 comprometimento leve · >2,5 comprometimento significativo',
    fields: [
      { key: 'paciente_total', label: 'DEX Paciente — total (20 itens × 0–4)', max: 80 },
      { key: 'informante_nome', label: 'Nome do informante (DEX-I)', type: 'input', span: 'full' },
      { key: 'informante_total', label: 'DEX-I Informante — total (20 itens × 0–4)', max: 80 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const results = []
      if (d.paciente_total !== '' && d.paciente_total != null) {
        const cls = classDEX(d.paciente_total)
        results.push({ label: 'Paciente — média', value: (+d.paciente_total / 20).toFixed(2), max: 4 })
        results.push({ label: 'Paciente — classif.', value: cls, color: colorFor(cls) })
      }
      if (d.informante_total !== '' && d.informante_total != null) {
        const cls = classDEX(d.informante_total)
        results.push({ label: 'Informante — média', value: (+d.informante_total / 20).toFixed(2), max: 4 })
        results.push({ label: 'Informante — classif.', value: cls, color: colorFor(cls) })
      }
      return results
    },
    derive: d => ({
      score_total: d.paciente_total ?? d.informante_total ?? null,
      paciente_mean: d.paciente_total != null && d.paciente_total !== '' ? +((+d.paciente_total / 20).toFixed(2)) : null,
      paciente_classification: classDEX(d.paciente_total) || null,
      informante_mean: d.informante_total != null && d.informante_total !== '' ? +((+d.informante_total / 20).toFixed(2)) : null,
      informante_classification: classDEX(d.informante_total) || null,
    }),
  },

  // ── HUMOR ────────────────────────────────────────────────────────────────

  {
    key: 'GDS-15', label: 'GDS-15', group: 'Humor',
    desc: 'Escala de Depressão Geriátrica — 15 itens',
    fields: [
      { key: 'total_score', label: 'Pontuação total (0–15)', max: 15 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const cls = classGDS(d.total_score)
      return cls ? [{ label: 'Classificação', value: cls, color: colorFor(cls) }] : []
    },
    derive: d => ({ classification: classGDS(d.total_score) }),
    cutoff: '0–4 sem depressão | 5–10 leve/moderada | 11–15 grave',
  },

  {
    key: 'BDI-II', label: 'BDI-II', group: 'Humor',
    desc: 'Inventário de Depressão de Beck — 2ª Edição',
    fields: [
      { key: 'total_score',         label: 'Pontuação total (0–63)',         max: 63 },
      { key: 'subtotal_cognitivo',  label: 'Subtotal cognitivo-afetivo',     max: 42 },
      { key: 'subtotal_somatico',   label: 'Subtotal somático-vegetativo',   max: 21 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const cls = classBDI(d.total_score)
      return cls ? [{ label: 'Classificação', value: cls, color: colorFor(cls) }] : []
    },
    derive: d => ({ classification: classBDI(d.total_score) }),
    cutoff: '0–13 mínima | 14–19 leve | 20–28 moderada | 29–63 grave',
  },

  {
    key: 'HAD', label: 'HAD', group: 'Humor',
    desc: 'Escala Hospitalar de Ansiedade e Depressão',
    fields: [
      { key: 'anxiety_score',    label: 'Subescala Ansiedade (0–21)',  max: 21 },
      { key: 'depression_score', label: 'Subescala Depressão (0–21)',  max: 21 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const results = []
      if (d.anxiety_score !== '' && d.anxiety_score != null) {
        const cls = classHAD(d.anxiety_score)
        results.push({ label: 'Ansiedade', value: cls, color: colorFor(cls) })
      }
      if (d.depression_score !== '' && d.depression_score != null) {
        const cls = classHAD(d.depression_score)
        results.push({ label: 'Depressão', value: cls, color: colorFor(cls) })
      }
      return results
    },
    derive: d => ({
      anxiety_classification:    classHAD(d.anxiety_score),
      depression_classification: classHAD(d.depression_score),
    }),
    cutoff: '0–7 normal | 8–10 leve | 11–14 moderado | 15–21 grave (por subescala)',
  },

  // ── ANSIEDADE ─────────────────────────────────────────────────────────────

  {
    key: 'IDATE', label: 'IDATE', group: 'Ansiedade',
    desc: 'Inventário de Ansiedade Traço-Estado (STAI)',
    cutoff: '20–34 Ansiedade baixa · 35–49 Moderada · 50–64 Elevada · 65–80 Altíssima',
    fields: [
      { key: 'estado', label: 'IDATE-E — Estado (20–80)', max: 80, min: 20 },
      { key: 'traco',  label: 'IDATE-T — Traço  (20–80)', max: 80, min: 20 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const results = []
      if (d.estado !== '' && d.estado != null) {
        const cls = classIDATE(d.estado)
        results.push({ label: 'Estado (IDATE-E)', value: cls, color: colorFor(cls) })
      }
      if (d.traco !== '' && d.traco != null) {
        const cls = classIDATE(d.traco)
        results.push({ label: 'Traço (IDATE-T)', value: cls, color: colorFor(cls) })
      }
      return results
    },
    derive: d => ({
      estado_classification: classIDATE(d.estado) || null,
      traco_classification:  classIDATE(d.traco)  || null,
    }),
  },

  {
    key: 'GAI', label: 'GAI', group: 'Ansiedade',
    desc: 'Geriatric Anxiety Inventory',
    fields: [
      { key: 'total_score', label: 'Pontuação total (0–20)', max: 20 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const cls = classGAI(d.total_score)
      return cls ? [{ label: 'Classificação', value: cls, color: colorFor(cls) }] : []
    },
    derive: d => ({ classification: classGAI(d.total_score) }),
    cutoff: '0–8 Ausência · 9 Provável ansiedade · ≥10 Ansiedade clinicamente significativa',
  },

  // ── FUNCIONAL ─────────────────────────────────────────────────────────────

  {
    key: 'Lawton', label: 'Lawton (AIVDs)', group: 'Funcional',
    desc: 'Escala de Lawton — Atividades Instrumentais de Vida Diária',
    fields: [
      { key: 'telefone',          label: 'Uso do telefone',       max: 3 },
      { key: 'compras',           label: 'Compras',               max: 3 },
      { key: 'cozinhar',          label: 'Preparo de alimentos',  max: 3 },
      { key: 'tarefas_domesticas',label: 'Tarefas domésticas',    max: 3 },
      { key: 'lavanderia',        label: 'Lavanderia',            max: 3 },
      { key: 'transporte',        label: 'Transporte',            max: 3 },
      { key: 'medicamentos',      label: 'Uso de medicamentos',   max: 3 },
      { key: 'financas',          label: 'Finanças',              max: 3 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const KEYS = ['telefone','compras','cozinhar','tarefas_domesticas','lavanderia','transporte','medicamentos','financas']
      const total = KEYS.reduce((s,k)=>s+(+d[k]||0),0)
      const cls = classLawton(total)
      return total > 0 ? [
        { label: 'Total AIVDs', value: total, max: 24 },
        { label: 'Nível de independência', value: cls, color: colorFor(cls) },
      ] : []
    },
    derive: d => {
      const KEYS = ['telefone','compras','cozinhar','tarefas_domesticas','lavanderia','transporte','medicamentos','financas']
      const total_score = KEYS.reduce((s,k)=>s+(+d[k]||0),0)
      return { total_score, classification: classLawton(total_score) }
    },
  },

  {
    key: 'B-ADL', label: 'B-ADL (Bayer)', group: 'Funcional',
    desc: 'Bayer Activities of Daily Living Scale — 25 itens, escala 1–10',
    cutoff: 'Nunca tem dificuldade (1) … Sempre tem dificuldade (10) | Média ≥ 3,12 = Comprometido · < 3,12 = Preservado',
    fields: [
      { key: 'q1',  label: '1. Fazer atividades diárias',                    min: 0, max: 10 },
      { key: 'q2',  label: '2. Cuidar de si próprio',                        min: 0, max: 10 },
      { key: 'q3',  label: '3. Tomar remédio sem supervisão',                min: 0, max: 10 },
      { key: 'q4',  label: '4. Cuidar da higiene pessoal',                   min: 0, max: 10 },
      { key: 'q5',  label: '5. Lembrar datas e compromissos',                min: 0, max: 10 },
      { key: 'q6',  label: '6. Concentrar-se na leitura',                    min: 0, max: 10 },
      { key: 'q7',  label: '7. Descrever o que acabou de ver ou ouvir',      min: 0, max: 10 },
      { key: 'q8',  label: '8. Participar de uma conversa',                  min: 0, max: 10 },
      { key: 'q9',  label: '9. Usar o telefone',                             min: 0, max: 10 },
      { key: 'q10', label: '10. Dar um recado a outra pessoa',               min: 0, max: 10 },
      { key: 'q11', label: '11. Passear sem se perder',                      min: 0, max: 10 },
      { key: 'q12', label: '12. Fazer compras',                              min: 0, max: 10 },
      { key: 'q13', label: '13. Preparar comida',                            min: 0, max: 10 },
      { key: 'q14', label: '14. Contar dinheiro sem errar',                  min: 0, max: 10 },
      { key: 'q15', label: '15. Lidar com contas',                           min: 0, max: 10 },
      { key: 'q16', label: '16. Ensinar o caminho se perguntado',            min: 0, max: 10 },
      { key: 'q17', label: '17. Usar eletrodomésticos',                      min: 0, max: 10 },
      { key: 'q18', label: '18. Orientar-se em lugar não familiar',          min: 0, max: 10 },
      { key: 'q19', label: '19. Usar meios de transporte sozinho',           min: 0, max: 10 },
      { key: 'q20', label: '20. Participar de atividades de lazer',          min: 0, max: 10 },
      { key: 'q21', label: '21. Retomar atividade após interrupção',         min: 0, max: 10 },
      { key: 'q22', label: '22. Fazer duas coisas ao mesmo tempo',           min: 0, max: 10 },
      { key: 'q23', label: '23. Lidar com situações não familiares',         min: 0, max: 10 },
      { key: 'q24', label: '24. Fazer coisas com segurança',                 min: 0, max: 10 },
      { key: 'q25', label: '25. Realizar tarefa sob pressão',                min: 0, max: 10 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12','q13','q14','q15','q16','q17','q18','q19','q20','q21','q22','q23','q24','q25']
      const answered = KEYS.filter(k => d[k] != null && d[k] !== '' && +d[k] > 0)
      if (answered.length === 0) return []
      const avg = parseFloat((answered.reduce((s,k)=>s+(+d[k]||0),0) / answered.length).toFixed(2))
      const cls = classBADL(avg)
      return [
        { label: 'Itens respondidos', value: `${answered.length}/25` },
        { label: 'Média B-ADL',       value: avg, max: 10 },
        { label: 'Classificação',     value: cls, color: colorFor(cls) },
      ]
    },
    derive: d => {
      const KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12','q13','q14','q15','q16','q17','q18','q19','q20','q21','q22','q23','q24','q25']
      const answered = KEYS.filter(k => d[k] != null && d[k] !== '' && +d[k] > 0)
      if (answered.length === 0) return { total_score: null, classification: null }
      const avg = parseFloat((answered.reduce((s,k)=>s+(+d[k]||0),0) / answered.length).toFixed(2))
      return { total_score: avg, classification: classBADL(avg), items_answered: answered.length }
    },
  },

  {
    key: 'PCRS', label: 'PCRS', group: 'Funcional',
    desc: 'Patient Competency Rating Scale',
    cutoff: 'Discrepância positiva = paciente superestima; negativa = paciente subestima | >10 pts clinicamente relevante',
    fields: [
      { key: 'informante_nome',  label: 'Nome do informante',                          type: 'input', span: 'full' },
      { key: 'auto_total',       label: 'Auto-avaliação paciente — total (17–85)',      max: 85, min: 17 },
      { key: 'informante_total', label: 'Avaliação do informante — total (17–85)',      max: 85, min: 17 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      if (!d.auto_total || !d.informante_total) return []
      const diff = (+d.auto_total||0) - (+d.informante_total||0)
      const abs = Math.abs(diff)
      const interp = abs <= 10 ? 'Concordância adequada' : diff > 0 ? 'Paciente superestima capacidades' : 'Paciente subestima capacidades'
      return [
        { label: 'Discrepância (paciente − informante)', value: (diff>0?'+':'')+diff, color: abs > 10 ? S.amber : S.greenL },
        { label: 'Interpretação', value: interp, color: abs > 10 ? S.amber : S.greenL },
      ]
    },
    derive: d => {
      if (!d.auto_total || !d.informante_total) return {}
      const diff = (+d.auto_total||0) - (+d.informante_total||0)
      return { discrepancy: diff, discrepancy_abs: Math.abs(diff) }
    },
  },

  {
    key: 'IQCODE', label: 'IQCODE', group: 'Funcional',
    desc: 'Informant Questionnaire on Cognitive Decline in the Elderly',
    fields: [
      { key: 'informante_nome',    label: 'Nome do informante',       type: 'input',  span: 'full' },
      { key: 'informante_relacao', label: 'Relação com o paciente',   type: 'select',
        options: ['Cônjuge/Companheiro(a)', 'Filho(a)', 'Irmão/Irmã', 'Cuidador(a) formal', 'Outro familiar', 'Outro'] },
      { key: 'total_score', label: 'Escore médio (1,00 a 5,00)', min: 1, max: 5, step: 0.01 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const cls = classIQCODE(d.total_score)
      return cls ? [{ label: 'Classificação', value: cls, color: colorFor(cls) }] : []
    },
    derive: d => ({ classification: classIQCODE(d.total_score) }),
    cutoff: '≤3,51 sem declínio · >3,51 declínio leve · >3,84 declínio considerável',
  },

  {
    key: 'Pfeffer', label: 'Pfeffer (FAQ)', group: 'Funcional',
    desc: 'Questionário de Atividades Funcionais — Pfeffer',
    cutoff: '0=Normalmente · 1=Com dificuldade · 2=Necessita ajuda · 3=Não é capaz | Total 0–5 normal · ≥6 comprometimento',
    fields: [
      { key: 'informante',  label: 'Nome do informante',    type: 'input', span: 'full' },
      { key: 'parentesco',  label: 'Grau de parentesco',    type: 'input', span: 'full' },
      { key: 'q1',  label: '1. Manuseia o próprio dinheiro?',                           min: 0, max: 3 },
      { key: 'q2',  label: '2. Compra roupas, comida, itens domésticos sozinho?',        min: 0, max: 3 },
      { key: 'q3',  label: '3. Esquenta água para o café e apaga o fogo?',               min: 0, max: 3 },
      { key: 'q4',  label: '4. Prepara uma refeição sozinho?',                           min: 0, max: 3 },
      { key: 'q5',  label: '5. Mantém-se em dia com as atualidades?',                   min: 0, max: 3 },
      { key: 'q6',  label: '6. Presta atenção e discute programas de rádio/TV?',         min: 0, max: 3 },
      { key: 'q7',  label: '7. Lembra compromissos e acontecimentos familiares?',         min: 0, max: 3 },
      { key: 'q8',  label: '8. Manuseia os próprios remédios?',                          min: 0, max: 3 },
      { key: 'q9',  label: '9. Passeia pela vizinhança e encontra o caminho de volta?',  min: 0, max: 3 },
      { key: 'q10', label: '10. Pode ficar em casa sozinho com segurança?',              min: 0, max: 3 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10']
      const filled = KEYS.some(k => d[k] !== '' && d[k] != null)
      const total = KEYS.reduce((s,k) => s + (+d[k] || 0), 0)
      const cls = classPfeffer(total)
      return filled ? [
        { label: 'Total FAQ', value: total, max: 30 },
        { label: 'Classificação', value: cls, color: colorFor(cls) },
      ] : []
    },
    derive: d => {
      const KEYS = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10']
      const total_score = KEYS.reduce((s,k) => s + (+d[k] || 0), 0)
      return { total_score, classification: classPfeffer(total_score) }
    },
  },

  // ── LINGUAGEM ─────────────────────────────────────────────────────────────

  {
    key: 'TOKEN', label: 'Token Test', group: 'Linguagem',
    desc: 'Teste dos Tokens (De Renzi & Vignolo) — 5 partes, máximo 62',
    cutoff: '≥54 Normal · 48–53 Déficit leve · 37–47 Déficit moderado · <37 Déficit grave',
    fields: [
      { key: 'parte1', label: 'Parte 1 — figuras grandes (max 10)', max: 10 },
      { key: 'parte2', label: 'Parte 2 — figuras pequenas (max 10)', max: 10 },
      { key: 'parte3', label: 'Parte 3 — grandes + pequenas (max 10)', max: 10 },
      { key: 'parte4', label: 'Parte 4 — cores e formas (max 10)', max: 10 },
      { key: 'parte5', label: 'Parte 5 — comandos complexos (max 22)', max: 22 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const KEYS = ['parte1','parte2','parte3','parte4','parte5']
      const total = KEYS.reduce((s,k) => s + (+d[k]||0), 0)
      if (!total) return []
      const cls = total >= 54 ? 'Normal' : total >= 48 ? 'Déficit leve' : total >= 37 ? 'Déficit moderado' : 'Déficit grave'
      return [
        { label: 'Total Token Test', value: total, max: 62 },
        { label: 'Classificação', value: cls, color: colorFor(cls) },
      ]
    },
    derive: d => {
      const KEYS = ['parte1','parte2','parte3','parte4','parte5']
      const total_score = KEYS.reduce((s,k) => s + (+d[k]||0), 0)
      const cls = total_score >= 54 ? 'Normal' : total_score >= 48 ? 'Déficit leve' : total_score >= 37 ? 'Déficit moderado' : total_score > 0 ? 'Déficit grave' : null
      return { total_score, classification: cls }
    },
  },
]

const GROUPS = [...new Set(TESTS_CONFIG.map(t => t.group))]
const GROUP_COLORS = {
  'Memória': S.greenL, 'Bateria Cognitiva': S.blue, 'Inteligência': S.purple,
  'Funções Executivas': S.amber, 'Humor': S.rose, 'Ansiedade': S.orange,
  'Funcional': S.teal, 'Linguagem': S.sky,
}

const inputSt = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`,
  color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none',
}

export default function Tests() {
  const [patients,    setPatients]    = useState([])
  const [patientId,   setPatientId]   = useState('')
  const [selectedKey, setSelectedKey] = useState('RAVLT')
  const [form,        setForm]        = useState({})
  const [saved,       setSaved]       = useState(false)
  const [saving,      setSaving]      = useState(false)

  const session = useTestSession(patientId)
  const test    = TESTS_CONFIG.find(t => t.key === selectedKey)

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
      const derived = test?.derive?.(form) || {}
      await session.updateTest(selectedKey, {
        ...form,
        ...derived,
        _appliedAt: new Date().toISOString(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => { setForm(prev => ({ ...prev, [k]: v })); setSaved(false) }

  const computed = test?.computed?.(form) || []
  const groupColor = GROUP_COLORS[test?.group] || S.greenL

  const hasData = (key) => {
    const d = session.getTest(key)
    return Object.keys(d).some(k => k !== 'obs' && k !== '_appliedAt' && k !== '_savedAt' && d[k] !== '' && d[k] != null)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, maxWidth: 1140, margin: '0 auto', height: 'calc(100vh - 120px)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Seletor de paciente */}
        <div style={{ padding: 12, borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>PACIENTE</div>
          <select value={patientId} onChange={e => setPatientId(e.target.value)} style={{ ...inputSt, fontSize: 12 }}>
            <option value="">— Selecionar —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        {/* Lista de testes por grupo */}
        <div style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }}>
          {GROUPS.map(group => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: GROUP_COLORS[group] || S.muted, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px 2px', textTransform: 'uppercase' }}>
                {group}
              </div>
              {TESTS_CONFIG.filter(t => t.group === group).map(t => {
                const active = selectedKey === t.key
                const done   = hasData(t.key)
                return (
                  <div key={t.key} onClick={() => setSelectedKey(t.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 7, marginBottom: 1,
                    background: active ? S.green : 'transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                    <span style={{ fontSize: 12, color: active ? '#fff' : (done ? 'rgba(255,255,255,0.75)' : S.muted), fontWeight: active ? 700 : (done ? 500 : 400), flex: 1 }}>
                      {t.label}
                    </span>
                    {done && !active && (
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

      {/* ── Formulário ──────────────────────────────────────────────────── */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlaskConical size={16} color={groupColor} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{test?.label}</span>
              <span style={{ fontSize: 10, color: groupColor, background: `${groupColor}22`, padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.04em' }}>
                {test?.group?.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{test?.desc}</div>
            {test?.cutoff && (
              <div style={{ fontSize: 10, color: S.amber, marginTop: 3 }}>
                Pontos de corte: {test.cutoff}
              </div>
            )}
          </div>
          <button onClick={handleSave} disabled={saving || !patientId} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 700,
            cursor: patientId ? 'pointer' : 'not-allowed',
            background: saved ? S.cardG : (patientId ? S.green : 'rgba(255,255,255,0.05)'),
            color: saved ? S.greenL : '#fff', transition: 'all 0.2s',
          }}>
            {saved
              ? <><CheckCircle2 size={14} /> SALVO</>
              : <><Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}</>
            }
          </button>
        </div>

        {/* Campos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {!patientId ? (
            <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
              <User size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontSize: 13 }}>Selecione um paciente para registrar os resultados.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

              {test?.fields.map(f => (
                <div key={f.key} style={{ gridColumn: (f.type === 'text' || f.span === 'full') ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 5, letterSpacing: '0.02em' }}>
                    {f.label}
                    {f.max !== undefined && !['text','input','select'].includes(f.type) && (
                      <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>/ {f.max}</span>
                    )}
                  </label>

                  {f.type === 'text' ? (
                    <textarea
                      value={form[f.key] || ''}
                      onChange={e => set(f.key, e.target.value)}
                      rows={3}
                      placeholder="Observações clínicas, comportamento durante aplicação..."
                      style={{ ...inputSt, resize: 'vertical' }}
                    />
                  ) : f.type === 'input' ? (
                    <input
                      type="text"
                      value={form[f.key] || ''}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder || ''}
                      style={inputSt}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      value={form[f.key] || ''}
                      onChange={e => set(f.key, e.target.value)}
                      style={inputSt}
                    >
                      <option value="">— Selecionar —</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={f.min ?? 0}
                      max={f.max}
                      step={f.step ?? 1}
                      value={form[f.key] ?? ''}
                      onChange={e => set(f.key, e.target.value)}
                      style={inputSt}
                    />
                  )}
                </div>
              ))}

              {/* Escores computados */}
              {computed.length > 0 && (
                <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: '14px 18px', background: 'rgba(46,125,50,0.08)', borderRadius: 10, border: '1px solid rgba(46,125,50,0.25)', display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em' }}>RESULTADO</span>
                  {computed.map(c => (
                    <div key={c.label} style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>{c.label}</div>
                      <div style={{ fontSize: typeof c.value === 'number' ? 22 : 14, fontWeight: 700, color: c.color || S.greenL, lineHeight: 1.2 }}>
                        {c.value}
                        {c.max != null && typeof c.value === 'number' && (
                          <span style={{ fontSize: 12, color: S.muted, fontWeight: 400 }}>/{c.max}</span>
                        )}
                      </div>
                      {c.cutoff && <div style={{ fontSize: 10, color: S.amber, marginTop: 2 }}>{c.cutoff}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Última aplicação */}
              {form._appliedAt && (
                <div style={{ gridColumn: '1 / -1', fontSize: 11, color: S.muted, textAlign: 'right' }}>
                  Último registro: {new Date(form._appliedAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
