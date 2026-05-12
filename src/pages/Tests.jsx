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
const classGDS   = n => n===''||n==null ? '' : +n<=4 ? 'Sem depressão' : +n<=10 ? 'Depressão leve/moderada' : 'Depressão grave'
const classBDI   = n => n===''||n==null ? '' : +n<=13 ? 'Mínima' : +n<=19 ? 'Leve' : +n<=28 ? 'Moderada' : 'Grave'
const classGAI   = n => n===''||n==null ? '' : +n>=10 ? 'Ansiedade clinicamente significativa' : 'Sem ansiedade clinicamente significativa'
const classHAD   = n => n===''||n==null ? '' : +n<=7 ? 'Normal' : +n<=10 ? 'Leve' : +n<=14 ? 'Moderado' : 'Grave'
const classFAB   = n => n===''||n==null ? '' : +n>=12 ? 'Preservado' : 'Comprometido'
const classLawton= n => n===''||n==null ? '' : +n>=20 ? 'Independência total' : +n>=12 ? 'Dependência parcial' : 'Dependência significativa'
const classBADL  = n => n===''||n==null ? '' : +n===6 ? 'Independente' : +n>=4 ? 'Dependência leve' : +n>=2 ? 'Dependência moderada' : 'Dependência grave'
const classIQCODE= n => n===''||n==null ? '' : parseFloat(n)>=3.31 ? 'Sugestivo de declínio cognitivo' : 'Sem declínio cognitivo significativo'

const colorFor = (cls) => {
  if (!cls) return undefined
  const c = cls.toLowerCase()
  if (c.includes('preservado') || c.includes('independ') || c.includes('sem ') || c.includes('normal') || c.includes('mínima') || c.includes('total')) return S.greenL
  if (c.includes('leve') || c.includes('parcial') || c.includes('limítrofe')) return S.amber
  return S.danger
}

// ── Configuração de todos os testes ────────────────────────────────────────
const TESTS_CONFIG = [

  // ── MEMÓRIA ──────────────────────────────────────────────────────────────

  {
    key: 'RAVLT', label: 'RAVLT', group: 'Memória',
    desc: 'Rey Auditory Verbal Learning Test',
    fields: [
      { key: 'a1', label: 'A1 — 1ª tentativa', max: 15 },
      { key: 'a2', label: 'A2 — 2ª tentativa', max: 15 },
      { key: 'a3', label: 'A3 — 3ª tentativa', max: 15 },
      { key: 'a4', label: 'A4 — 4ª tentativa', max: 15 },
      { key: 'a5', label: 'A5 — 5ª tentativa', max: 15 },
      { key: 'b1', label: 'Lista B (interferência)', max: 15 },
      { key: 'a6', label: 'A6 — imediata pós-B', max: 15 },
      { key: 'a7', label: 'A7 — recordação tardia', max: 15 },
      { key: 'recognition', label: 'Reconhecimento (acertos − intrusões)', max: 30 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const total = ['a1','a2','a3','a4','a5'].reduce((s,k)=>s+(+d[k]||0),0)
      return [
        { label: 'Total A1–A5', value: total, max: 75 },
        { label: 'Curva de aprendizagem', value: `${d.a1||'-'}→${d.a2||'-'}→${d.a3||'-'}→${d.a4||'-'}→${d.a5||'-'}` },
      ]
    },
    derive: d => ({
      total_a1_a5: ['a1','a2','a3','a4','a5'].reduce((s,k)=>s+(+d[k]||0),0),
    }),
  },

  {
    key: 'BAMS', label: 'BAMS', group: 'Memória',
    desc: 'Brief Autobiographical Memory Schedule',
    fields: [
      { key: 'mem_infancia',      label: 'Memória episódica — infância',  max: 9 },
      { key: 'mem_adulto',        label: 'Memória episódica — adulto',    max: 9 },
      { key: 'mem_recente',       label: 'Memória episódica — recente',   max: 9 },
      { key: 'semantica_pessoal', label: 'Memória semântica pessoal',     max: 9 },
      { key: 'percentile',        label: 'Percentil (tabela normativa)',  max: 100 },
      { key: 'interpretation', label: 'Interpretação', type: 'select', span: 'full',
        options: ['Preservada', 'Limítrofe', 'Comprometida — leve', 'Comprometida — moderada', 'Comprometida — grave'] },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const total = ['mem_infancia','mem_adulto','mem_recente','semantica_pessoal'].reduce((s,k)=>s+(+d[k]||0),0)
      return [ { label: 'Total BAMS', value: total, max: 36 } ]
    },
    derive: d => ({
      global_score: ['mem_infancia','mem_adulto','mem_recente','semantica_pessoal'].reduce((s,k)=>s+(+d[k]||0),0),
    }),
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
    fields: [
      // Escores brutos
      { key: 'orientacao_temporal',     label: 'Orientação temporal',             max: 4  },
      { key: 'orientacao_espacial',     label: 'Orientação espacial',             max: 4  },
      { key: 'atencao',                 label: 'Atenção/concentração',            max: 10 },
      { key: 'dig_direto',              label: 'Dígitos span direto',             max: 9  },
      { key: 'dig_inverso',             label: 'Dígitos span inverso',            max: 8  },
      { key: 'mev_imediata',            label: 'Memória episódica verbal imediata', max: 10 },
      { key: 'mev_tardia',              label: 'Memória episódica verbal tardia',   max: 10 },
      { key: 'mevis_imediata',          label: 'Memória episódica visual imediata', max: 3  },
      { key: 'mevis_tardia',            label: 'Memória episódica visual tardia',   max: 3  },
      { key: 'mem_semantica',           label: 'Memória semântica',               max: 10 },
      { key: 'mem_prospectiva',         label: 'Memória prospectiva',             max: 2  },
      { key: 'linguagem_oral',          label: 'Linguagem oral',                  max: 20 },
      { key: 'linguagem_escrita',       label: 'Linguagem escrita',               max: 10 },
      { key: 'habilidades_aritmeticas', label: 'Habilidades aritméticas',         max: 4  },
      { key: 'percepcao_visual',        label: 'Percepção visual',                max: 10 },
      { key: 'visuoespacial',           label: 'Habilidades visuoespaciais',      max: 10 },
      { key: 'praxias',                 label: 'Praxias',                         max: 20 },
      { key: 'funcoes_executivas',      label: 'Funções executivas',              max: 10 },
      // Classificações por domínio (usadas no laudo)
      { key: 'orientation_z',  label: 'Classificação — Orientação',         type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'attention_z',    label: 'Classificação — Atenção',            type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'memory_z',       label: 'Classificação — Memória',            type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'language_z',     label: 'Classificação — Linguagem',          type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'arithmetic_z',   label: 'Classificação — Aritmética',         type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'perception_z',   label: 'Classificação — Percepção visual',   type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'praxis_z',       label: 'Classificação — Praxias',            type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'executive_z',    label: 'Classificação — Funções executivas', type: 'select', span: 'full', options: ['PRESERVADO', 'LIMÍTROFE', 'COMPROMETIDO'] },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
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
    fields: [
      { key: 'versao', label: 'Versão aplicada', type: 'select', span: 'full',
        options: ['DEX — Autoavaliação (paciente)', 'DEX-I — Avaliação por informante'] },
      { key: 'informante_nome', label: 'Nome do informante (se DEX-I)', type: 'input', span: 'full' },
      { key: 'score_total', label: 'Escore total (20 itens × 0–4)', max: 80 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    cutoff: 'Escores mais altos indicam maior comprometimento executivo',
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
    fields: [
      { key: 'estado', label: 'IDATE-E — Estado (20–80)', max: 80, min: 20 },
      { key: 'traco',  label: 'IDATE-T — Traço  (20–80)', max: 80, min: 20 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    cutoff: 'Ponto de corte por sexo e faixa etária — consultar manual normativo',
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
    cutoff: '0–9 sem ansiedade clínica | ≥10 ansiedade clinicamente significativa',
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
    key: 'B-ADL', label: 'BADL / Katz', group: 'Funcional',
    desc: 'Katz — Atividades Básicas de Vida Diária',
    fields: [
      { key: 'banho',           label: 'Banho (0 ou 1)',          max: 1 },
      { key: 'vestuario',       label: 'Vestuário (0 ou 1)',      max: 1 },
      { key: 'higiene_pessoal', label: 'Higiene pessoal (0 ou 1)',max: 1 },
      { key: 'transferencia',   label: 'Transferência (0 ou 1)',  max: 1 },
      { key: 'continencia',     label: 'Continência (0 ou 1)',    max: 1 },
      { key: 'alimentacao',     label: 'Alimentação (0 ou 1)',    max: 1 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const KEYS = ['banho','vestuario','higiene_pessoal','transferencia','continencia','alimentacao']
      const filled = KEYS.some(k => d[k] !== '' && d[k] != null)
      const total = KEYS.reduce((s,k)=>s+(+d[k]||0),0)
      const cls = classBADL(total)
      return filled ? [
        { label: 'Total BADL', value: total, max: 6 },
        { label: 'Classificação', value: cls, color: colorFor(cls) },
      ] : []
    },
    derive: d => {
      const KEYS = ['banho','vestuario','higiene_pessoal','transferencia','continencia','alimentacao']
      const total_score = KEYS.reduce((s,k)=>s+(+d[k]||0),0)
      return { total_score, classification: classBADL(total_score) }
    },
  },

  {
    key: 'PCRS', label: 'PCRS', group: 'Funcional',
    desc: 'Patient Competency Rating Scale',
    fields: [
      { key: 'auto_total',        label: 'Auto-avaliação — total (30–150)',           max: 150, min: 30 },
      { key: 'informante_total',  label: 'Avaliação do informante — total (30–150)',  max: 150, min: 30 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      if (!d.auto_total || !d.informante_total) return []
      const diff = (+d.auto_total||0) - (+d.informante_total||0)
      const abs = Math.abs(diff)
      return [
        { label: 'Discrepância (paciente − informante)', value: (diff>0?'+':'')+diff, color: abs>10 ? S.amber : S.greenL },
      ]
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
    cutoff: '< 3,31 sem declínio significativo | ≥ 3,31 sugestivo de declínio cognitivo',
  },

  // ── LINGUAGEM ─────────────────────────────────────────────────────────────

  {
    key: 'TOKEN', label: 'Token Test', group: 'Linguagem',
    desc: 'Teste dos Tokens (De Renzi & Vignolo)',
    fields: [
      { key: 'parte1', label: 'Parte 1', max: 10 },
      { key: 'parte2', label: 'Parte 2', max: 10 },
      { key: 'parte3', label: 'Parte 3', max: 10 },
      { key: 'parte4', label: 'Parte 4', max: 10 },
      { key: 'parte5', label: 'Parte 5', max: 22 },
      { key: 'obs', label: 'Observações clínicas', type: 'text' },
    ],
    computed: d => {
      const total = ['parte1','parte2','parte3','parte4','parte5'].reduce((s,k)=>s+(+d[k]||0),0)
      return total > 0 ? [
        { label: 'Total Token Test', value: total, max: 62, cutoff: '≥54 normal | <54 sugestivo de comprometimento da linguagem' },
      ] : []
    },
    derive: d => ({
      total_score: ['parte1','parte2','parte3','parte4','parte5'].reduce((s,k)=>s+(+d[k]||0),0),
    }),
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
