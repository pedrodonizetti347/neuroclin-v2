import React, { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { useTestSession } from '@/hooks/useTestSession'
import { FileText, Loader2, CheckCircle2, Download, AlertCircle, ShieldCheck, Send, X, FileDown, Pencil } from 'lucide-react'

const SUPERVISOR = {
  name:   'Dr. Pedro Donizetti',
  crp:    'CRP 06/82060',
  clinic: 'Neuroavaliação — Neuropsicologia na Prática',
}

// Nomes completos dos testes para o PROCEDIMENTO
const FULL_TEST_NAMES = {
  'NEUPSILIN': 'Instrumento de Avaliação Neuropsicológica Breve Adulto (NEUPSILIN)',
  'TRIACOG':   'Triagem Cognitiva (TRIACOG)',
  'RAVLT':     'Teste de Aprendizagem Auditivo-Verbal de Rey (RAVLT)',
  'BAMS':      'Bateria de Avaliação da Memória Semântica (BAMS)',
  'WASI':      'Escala de Inteligência de Wechsler Abreviada (WASI)',
  'WASI-III':  'Escala de Inteligência de Wechsler Abreviada III (WASI-III)',
  'WCST-N':    'Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)',
  'DEX':       'Questionário Disexecutivo (DEX)',
  'FAB':       'Bateria de Avaliação Frontal (FAB)',
  'GDS-15':    'Escala de Depressão Geriátrica (GDS-15)',
  'GAI':       'Inventário de Ansiedade Geriátrica (GAI)',
  'BDI-II':    'Inventário de Depressão de Beck — II (BDI-II)',
  'HAD':       'Escala Hospitalar de Ansiedade e Depressão (HAD)',
  'IQCODE':    'Questionário Informante sobre Declínio Cognitivo no Idoso (IQCODE)',
  'B-ADL':     'Escala Bayer de Atividades da Vida Diária (B-ADL)',
  'Pfeffer':   'Questionário de Atividades Funcionais de Pfeffer',
  'Lawton':    'Escala de Atividades Instrumentais de Lawton e Brody',
  'IDATE-E':   'Inventário de Ansiedade Traço-Estado (IDATE) — Estado',
  'IDATE-T':   'Inventário de Ansiedade Traço-Estado (IDATE) — Traço',
  'TOKEN':     'Token Test',
  'BADL':      'Índice de Katz — Atividades Básicas de Vida Diária (BADL)',
  'MoCA':      'Avaliação Cognitiva Montreal (MoCA)',
}

// Quais testes vão para a Tabela de Escalas vs Tabela de Testes
const SCALE_TESTS = ['GDS-15','GAI','BDI-II','HAD','IQCODE','B-ADL','Pfeffer','Lawton','IDATE-E','IDATE-T','BADL','FAB','MoCA']
const COGNITIVE_TESTS = ['NEUPSILIN','TRIACOG','RAVLT','BAMS','WASI','WASI-III','WCST-N','DEX','TOKEN']

const TESTS_LIST = [
  { key: 'NEUPSILIN', label: 'Neupsilin',  group: 'Bateria Cognitiva' },
  { key: 'TRIACOG',   label: 'TRIACOG',    group: 'Bateria Cognitiva' },
  { key: 'MoCA',      label: 'MoCA',       group: 'Bateria Cognitiva' },
  { key: 'RAVLT',     label: 'RAVLT',      group: 'Memória' },
  { key: 'BAMS',      label: 'BAMS',       group: 'Memória Semântica' },
  { key: 'WASI',      label: 'WASI',       group: 'Inteligência' },
  { key: 'WASI-III',  label: 'WASI-III',   group: 'Inteligência' },
  { key: 'WCST-N',    label: 'WCST-N',     group: 'Funções Executivas' },
  { key: 'DEX',       label: 'DEX',        group: 'Funções Executivas' },
  { key: 'FAB',       label: 'FAB',        group: 'Funções Executivas' },
  { key: 'GDS-15',    label: 'GDS-15',     group: 'Humor' },
  { key: 'GAI',       label: 'GAI',        group: 'Humor' },
  { key: 'BDI-II',    label: 'BDI-II',     group: 'Humor' },
  { key: 'HAD',       label: 'HAD',        group: 'Humor' },
  { key: 'IQCODE',    label: 'IQCODE',     group: 'Funcional' },
  { key: 'B-ADL',     label: 'B-ADL',      group: 'Funcional' },
  { key: 'Pfeffer',   label: 'Pfeffer',    group: 'Funcional' },
  { key: 'Lawton',    label: 'Lawton',     group: 'Funcional' },
  { key: 'BADL',      label: 'BADL',       group: 'Funcional' },
  { key: 'IDATE-E',   label: 'IDATE-E',    group: 'Ansiedade' },
  { key: 'IDATE-T',   label: 'IDATE-T',    group: 'Ansiedade' },
  { key: 'TOKEN',     label: 'Token Test', group: 'Linguagem' },
]

const STEPS = [
  'Carregando dados do paciente...',
  'Coletando resultados dos testes...',
  'Processando avaliação clínica...',
  'Redigindo análise neuropsicológica...',
  'Finalizando laudo...',
]

const S = {
  card:   '#1A2744',
  cardG:  '#1A3D2B',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${S.border}`,
  color: '#fff', borderRadius: 8,
  padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none',
}

// ── NORMAS NEUPSILIN (Fonseca et al.) ─────────────────────────────────────────
const NP = {
  orientation:               { '19-39':{'1-4':{mean:7.59,sd:0.75},'5-8':{mean:7.82,sd:0.43},'9+':{mean:7.92,sd:0.27}},'40-59':{'1-4':{mean:7.62,sd:0.70},'5-8':{mean:7.73,sd:0.58},'9+':{mean:7.89,sd:0.41}},'60-75':{'1-4':{mean:7.69,sd:0.57},'5-8':{mean:7.83,sd:0.38},'9+':{mean:7.76,sd:0.43}},'76-90':{'1-4':{mean:7.69,sd:0.54},'5-8':{mean:7.90,sd:0.30},'9+':{mean:7.81,sd:0.39}} },
  orientation_time:          { '19-39':{'1-4':{mean:3.69,sd:0.65},'5-8':{mean:3.85,sd:0.36},'9+':{mean:3.92,sd:0.27}},'40-59':{'1-4':{mean:3.79,sd:0.52},'5-8':{mean:3.76,sd:0.53},'9+':{mean:3.89,sd:0.41}},'60-75':{'1-4':{mean:3.72,sd:0.51},'5-8':{mean:3.85,sd:0.36},'9+':{mean:3.76,sd:0.43}},'76-90':{'1-4':{mean:3.86,sd:0.35},'5-8':{mean:3.90,sd:0.30},'9+':{mean:3.84,sd:0.37}} },
  orientation_space:         { '19-39':{'1-4':{mean:3.90,sd:0.36},'5-8':{mean:3.97,sd:0.26},'9+':{mean:4.00,sd:0.00}},'40-59':{'1-4':{mean:3.83,sd:0.38},'5-8':{mean:3.98,sd:0.15},'9+':{mean:4.00,sd:0.00}},'60-75':{'1-4':{mean:3.97,sd:0.16},'5-8':{mean:3.98,sd:0.14},'9+':{mean:4.00,sd:0.00}},'76-90':{'1-4':{mean:3.83,sd:0.38},'5-8':{mean:4.00,sd:0.00},'9+':{mean:3.98,sd:0.15}} },
  attention:                 { '19-39':{'1-4':{mean:18.33,sd:6.94},'5-8':{mean:21.63,sd:4.28},'9+':{mean:23.94,sd:3.58}},'40-59':{'1-4':{mean:16.40,sd:7.82},'5-8':{mean:22.02,sd:4.20},'9+':{mean:23.53,sd:2.08}},'60-75':{'1-4':{mean:18.13,sd:7.43},'5-8':{mean:20.96,sd:5.17},'9+':{mean:22.29,sd:3.53}},'76-90':{'1-4':{mean:19.24,sd:5.05},'5-8':{mean:18.10,sd:5.68},'9+':{mean:22.02,sd:2.48}} },
  attention_reverse_count:   { '19-39':{'1-4':{mean:16.10,sd:6.64},'5-8':{mean:18.63,sd:3.82},'9+':{mean:19.56,sd:2.58}},'40-59':{'1-4':{mean:14.10,sd:7.20},'5-8':{mean:18.80,sd:3.61},'9+':{mean:19.39,sd:0.36}},'60-75':{'1-4':{mean:16.05,sd:6.92},'5-8':{mean:18.25,sd:4.59},'9+':{mean:19.18,sd:2.79}},'76-90':{'1-4':{mean:17.14,sd:4.90},'5-8':{mean:15.90,sd:5.90},'9+':{mean:19.53,sd:1.62}} },
  attention_execution_time:  { '19-39':{'1-4':{mean:29.68,sd:15.54},'5-8':{mean:20.57,sd:5.54},'9+':{mean:17.82,sd:5.55}},'40-59':{'1-4':{mean:34.97,sd:17.98},'5-8':{mean:25.31,sd:8.69},'9+':{mean:18.45,sd:5.78}},'60-75':{'1-4':{mean:34.73,sd:20.63},'5-8':{mean:26.88,sd:15.98},'9+':{mean:20.51,sd:6.79}},'76-90':{'1-4':{mean:32.17,sd:12.77},'5-8':{mean:26.01,sd:8.95},'9+':{mean:23.72,sd:9.96}} },
  attention_digit_sequence:  { '19-39':{'1-4':{mean:2.24,sd:1.29},'5-8':{mean:3.00,sd:1.75},'9+':{mean:4.38,sd:2.01}},'40-59':{'1-4':{mean:2.31,sd:1.73},'5-8':{mean:3.22,sd:1.99},'9+':{mean:3.63,sd:2.06}},'60-75':{'1-4':{mean:2.08,sd:1.61},'5-8':{mean:2.71,sd:1.81},'9+':{mean:3.11,sd:1.86}},'76-90':{'1-4':{mean:2.10,sd:1.70},'5-8':{mean:2.20,sd:1.60},'9+':{mean:2.49,sd:1.56}} },
  perception:                { '19-39':{'1-4':{mean:10.51,sd:1.43},'5-8':{mean:10.52,sd:1.21},'9+':{mean:11.22,sd:0.82}},'40-59':{'1-4':{mean:10.40,sd:1.64},'5-8':{mean:10.73,sd:1.27},'9+':{mean:11.09,sd:1.06}},'60-75':{'1-4':{mean:9.95,sd:1.54},'5-8':{mean:10.13,sd:1.30},'9+':{mean:10.73,sd:1.18}},'76-90':{'1-4':{mean:9.24,sd:1.64},'5-8':{mean:9.27,sd:1.57},'9+':{mean:9.95,sd:1.36}} },
  perception_line_equality:  { '19-39':{'1-4':{mean:5.41,sd:0.92},'5-8':{mean:5.25,sd:0.97},'9+':{mean:5.69,sd:0.65}},'40-59':{'1-4':{mean:5.24,sd:1.05},'5-8':{mean:5.31,sd:1.02},'9+':{mean:5.70,sd:0.73}},'60-75':{'1-4':{mean:5.26,sd:1.02},'5-8':{mean:5.12,sd:1.04},'9+':{mean:5.58,sd:0.78}},'76-90':{'1-4':{mean:4.41,sd:1.43},'5-8':{mean:4.40,sd:1.45},'9+':{mean:5.02,sd:1.01}} },
  perception_visual_hemineglect: { '19-39':{'1-4':{mean:1.00,sd:0.01},'5-8':{mean:1.00,sd:0.01},'9+':{mean:1.00,sd:0.01}},'40-59':{'1-4':{mean:1.00,sd:0.01},'5-8':{mean:1.00,sd:0.01},'9+':{mean:1.00,sd:0.01}},'60-75':{'1-4':{mean:1.00,sd:0.01},'5-8':{mean:1.00,sd:0.01},'9+':{mean:1.00,sd:0.01}},'76-90':{'1-4':{mean:1.00,sd:0.01},'5-8':{mean:1.00,sd:0.01},'9+':{mean:1.00,sd:0.01}} },
  perception_face_perception:    { '19-39':{'1-4':{mean:2.25,sd:0.89},'5-8':{mean:2.42,sd:0.72},'9+':{mean:2.55,sd:0.56}},'40-59':{'1-4':{mean:2.43,sd:0.67},'5-8':{mean:2.53,sd:0.59},'9+':{mean:2.42,sd:0.70}},'60-75':{'1-4':{mean:1.97,sd:0.78},'5-8':{mean:2.25,sd:0.86},'9+':{mean:2.29,sd:0.78}},'76-90':{'1-4':{mean:2.00,sd:0.75},'5-8':{mean:2.20,sd:0.76},'9+':{mean:2.07,sd:0.88}} },
  perception_face_recognition:   { '19-39':{'1-4':{mean:1.84,sd:0.37},'5-8':{mean:1.85,sd:0.40},'9+':{mean:1.98,sd:0.12}},'40-59':{'1-4':{mean:1.74,sd:0.50},'5-8':{mean:1.90,sd:0.32},'9+':{mean:1.96,sd:0.18}},'60-75':{'1-4':{mean:1.72,sd:0.45},'5-8':{mean:1.77,sd:0.47},'9+':{mean:1.85,sd:0.45}},'76-90':{'1-4':{mean:1.83,sd:0.38},'5-8':{mean:1.67,sd:0.48},'9+':{mean:1.86,sd:0.41}} },
  memory:                    { '19-39':{'1-4':{mean:43.25,sd:10.62},'5-8':{mean:48.88,sd:7.24},'9+':{mean:61.10,sd:11.02}},'40-59':{'1-4':{mean:38.95,sd:9.29},'5-8':{mean:45.51,sd:6.79},'9+':{mean:56.37,sd:8.46}},'60-75':{'1-4':{mean:37.54,sd:8.26},'5-8':{mean:45.60,sd:8.94},'9+':{mean:51.18,sd:8.59}},'76-90':{'1-4':{mean:31.72,sd:6.93},'5-8':{mean:38.87,sd:7.15},'9+':{mean:43.07,sd:7.22}} },
  memory_working:            { '19-39':{'1-4':{mean:15.71,sd:7.29},'5-8':{mean:20.63,sd:5.26},'9+':{mean:27.40,sd:6.48}},'40-59':{'1-4':{mean:13.36,sd:6.16},'5-8':{mean:18.71,sd:5.28},'9+':{mean:25.16,sd:5.13}},'60-75':{'1-4':{mean:13.69,sd:7.00},'5-8':{mean:19.37,sd:5.44},'9+':{mean:22.64,sd:5.33}},'76-90':{'1-4':{mean:10.07,sd:5.44},'5-8':{mean:15.97,sd:5.66},'9+':{mean:18.65,sd:5.12}} },
  memory_working_digit:      { '19-39':{'1-4':{mean:4.69,sd:2.41},'5-8':{mean:6.88,sd:1.54},'9+':{mean:8.23,sd:1.65}},'40-59':{'1-4':{mean:4.05,sd:2.53},'5-8':{mean:6.33,sd:1.86},'9+':{mean:7.65,sd:1.63}},'60-75':{'1-4':{mean:4.85,sd:2.34},'5-8':{mean:6.38,sd:2.20},'9+':{mean:7.56,sd:1.54}},'76-90':{'1-4':{mean:3.34,sd:2.14},'5-8':{mean:5.53,sd:2.57},'9+':{mean:6.28,sd:1.71}} },
  memory_span_auditory:      { '19-39':{'1-4':{mean:11.02,sd:5.63},'5-8':{mean:13.75,sd:4.61},'9+':{mean:19.18,sd:5.61}},'40-59':{'1-4':{mean:9.31,sd:5.05},'5-8':{mean:12.38,sd:4.33},'9+':{mean:17.51,sd:4.53}},'60-75':{'1-4':{mean:8.85,sd:5.51},'5-8':{mean:12.98,sd:4.38},'9+':{mean:15.07,sd:4.62}},'76-90':{'1-4':{mean:6.72,sd:4.46},'5-8':{mean:10.43,sd:4.38},'9+':{mean:12.37,sd:4.11}} },
  memory_episodic:           { '19-39':{'1-4':{mean:19.16,sd:4.66},'5-8':{mean:19.17,sd:4.23},'9+':{mean:24.13,sd:5.89}},'40-59':{'1-4':{mean:17.29,sd:3.81},'5-8':{mean:17.93,sd:4.03},'9+':{mean:21.65,sd:4.75}},'60-75':{'1-4':{mean:15.82,sd:3.48},'5-8':{mean:17.60,sd:4.29},'9+':{mean:19.38,sd:4.87}},'76-90':{'1-4':{mean:14.76,sd:2.28},'5-8':{mean:15.17,sd:2.98},'9+':{mean:15.98,sd:3.24}} },
  memory_episodic_immediate: { '19-39':{'1-4':{mean:4.39,sd:1.47},'5-8':{mean:4.68,sd:1.43},'9+':{mean:5.94,sd:1.52}},'40-59':{'1-4':{mean:4.14,sd:1.24},'5-8':{mean:4.40,sd:1.30},'9+':{mean:5.11,sd:1.32}},'60-75':{'1-4':{mean:4.00,sd:1.26},'5-8':{mean:4.38,sd:1.31},'9+':{mean:4.64,sd:1.34}},'76-90':{'1-4':{mean:2.97,sd:1.32},'5-8':{mean:3.87,sd:1.30},'9+':{mean:3.74,sd:1.23}} },
  memory_episodic_delayed:   { '19-39':{'1-4':{mean:2.41,sd:1.90},'5-8':{mean:2.33,sd:1.64},'9+':{mean:4.10,sd:2.39}},'40-59':{'1-4':{mean:1.12,sd:1.36},'5-8':{mean:1.58,sd:1.48},'9+':{mean:3.02,sd:2.14}},'60-75':{'1-4':{mean:0.87,sd:1.28},'5-8':{mean:1.25,sd:1.62},'9+':{mean:1.95,sd:1.88}},'76-90':{'1-4':{mean:0.48,sd:0.83},'5-8':{mean:0.67,sd:1.21},'9+':{mean:1.07,sd:1.10}} },
  memory_episodic_recognition:{ '19-39':{'1-4':{mean:12.35,sd:2.13},'5-8':{mean:12.15,sd:2.12},'9+':{mean:14.08,sd:2.58}},'40-59':{'1-4':{mean:12.02,sd:2.70},'5-8':{mean:11.96,sd:2.29},'9+':{mean:13.53,sd:2.18}},'60-75':{'1-4':{mean:10.95,sd:1.97},'5-8':{mean:11.96,sd:2.15},'9+':{mean:12.80,sd:2.55}},'76-90':{'1-4':{mean:11.31,sd:1.44},'5-8':{mean:10.63,sd:2.20},'9+':{mean:11.16,sd:2.19}} },
  memory_semantic_long:      { '19-39':{'1-4':{mean:4.22,sd:0.83},'5-8':{mean:4.40,sd:0.76},'9+':{mean:4.89,sd:0.32}},'40-59':{'1-4':{mean:4.31,sd:0.84},'5-8':{mean:4.93,sd:0.25},'9+':{mean:4.95,sd:0.22}},'60-75':{'1-4':{mean:4.44,sd:0.75},'5-8':{mean:4.77,sd:0.47},'9+':{mean:4.95,sd:0.23}},'76-90':{'1-4':{mean:4.28,sd:0.84},'5-8':{mean:4.63,sd:0.61},'9+':{mean:4.77,sd:0.48}} },
  memory_visual_short:       { '19-39':{'1-4':{mean:2.55,sd:0.73},'5-8':{mean:2.85,sd:0.36},'9+':{mean:2.94,sd:0.28}},'40-59':{'1-4':{mean:2.67,sd:0.65},'5-8':{mean:2.58,sd:0.66},'9+':{mean:2.89,sd:0.31}},'60-75':{'1-4':{mean:2.49,sd:0.55},'5-8':{mean:2.60,sd:0.60},'9+':{mean:2.75,sd:0.52}},'76-90':{'1-4':{mean:2.03,sd:0.78},'5-8':{mean:2.43,sd:0.73},'9+':{mean:2.60,sd:0.66}} },
  memory_prospective:        { '19-39':{'1-4':{mean:1.63,sd:0.60},'5-8':{mean:1.83,sd:0.42},'9+':{mean:1.74,sd:0.49}},'40-59':{'1-4':{mean:1.33,sd:0.81},'5-8':{mean:1.36,sd:0.80},'9+':{mean:1.72,sd:0.52}},'60-75':{'1-4':{mean:1.10,sd:0.88},'5-8':{mean:1.27,sd:0.82},'9+':{mean:1.47,sd:0.69}},'76-90':{'1-4':{mean:0.59,sd:0.73},'5-8':{mean:0.67,sd:0.84},'9+':{mean:1.07,sd:0.91}} },
  arithmetic:                { '19-39':{'1-4':{mean:5.22,sd:2.26},'5-8':{mean:6.47,sd:1.60},'9+':{mean:7.59,sd:0.93}},'40-59':{'1-4':{mean:4.26,sd:2.98},'5-8':{mean:6.93,sd:1.57},'9+':{mean:7.82,sd:0.57}},'60-75':{'1-4':{mean:5.03,sd:2.58},'5-8':{mean:6.75,sd:1.81},'9+':{mean:7.65,sd:0.84}},'76-90':{'1-4':{mean:4.17,sd:2.82},'5-8':{mean:6.70,sd:1.98},'9+':{mean:7.42,sd:1.00}} },
  language:                  { '19-39':{'1-4':{mean:46.14,sd:3.93},'5-8':{mean:49.53,sd:2.20},'9+':{mean:51.93,sd:1.27}},'40-59':{'1-4':{mean:43.33,sd:7.45},'5-8':{mean:49.24,sd:2.39},'9+':{mean:51.46,sd:1.32}},'60-75':{'1-4':{mean:44.31,sd:6.34},'5-8':{mean:48.44,sd:3.39},'9+':{mean:50.87,sd:2.05}},'76-90':{'1-4':{mean:41.03,sd:6.09},'5-8':{mean:48.33,sd:2.84},'9+':{mean:50.30,sd:2.30}} },
  lang_oral:                 { '19-39':{'1-4':{mean:20.37,sd:1.28},'5-8':{mean:21.27,sd:0.84},'9+':{mean:20.71,sd:0.52}},'40-59':{'1-4':{mean:20.17,sd:1.88},'5-8':{mean:20.89,sd:1.13},'9+':{mean:21.61,sd:0.62}},'60-75':{'1-4':{mean:20.08,sd:1.38},'5-8':{mean:20.71,sd:1.11},'9+':{mean:21.33,sd:0.98}},'76-90':{'1-4':{mean:19.03,sd:1.82},'5-8':{mean:20.53,sd:1.17},'9+':{mean:21.05,sd:1.19}} },
  lang_nomeacao:             { '19-39':{'1-4':{mean:3.98,sd:0.14},'5-8':{mean:4.00,sd:0.01},'9+':{mean:4.00,sd:0.01}},'40-59':{'1-4':{mean:4.00,sd:0.01},'5-8':{mean:4.00,sd:0.01},'9+':{mean:4.00,sd:0.01}},'60-75':{'1-4':{mean:3.97,sd:0.16},'5-8':{mean:4.00,sd:0.01},'9+':{mean:4.00,sd:0.01}},'76-90':{'1-4':{mean:4.00,sd:0.01},'5-8':{mean:3.93,sd:0.25},'9+':{mean:4.00,sd:0.01}} },
  lang_repeticao:            { '19-39':{'1-4':{mean:9.56,sd:0.66},'5-8':{mean:9.83,sd:0.46},'9+':{mean:9.91,sd:0.28}},'40-59':{'1-4':{mean:9.67,sd:0.75},'5-8':{mean:9.76,sd:0.48},'9+':{mean:9.98,sd:0.13}},'60-75':{'1-4':{mean:9.46,sd:0.85},'5-8':{mean:9.73,sd:0.60},'9+':{mean:9.84,sd:0.46}},'76-90':{'1-4':{mean:8.90,sd:1.23},'5-8':{mean:9.67,sd:0.55},'9+':{mean:9.65,sd:0.84}} },
  lang_automatica:           { '19-39':{'1-4':{mean:1.82,sd:0.38},'5-8':{mean:1.93,sd:0.25},'9+':{mean:1.97,sd:0.18}},'40-59':{'1-4':{mean:1.81,sd:0.45},'5-8':{mean:1.98,sd:0.15},'9+':{mean:2.00,sd:0.01}},'60-75':{'1-4':{mean:1.95,sd:0.22},'5-8':{mean:1.96,sd:0.19},'9+':{mean:1.98,sd:0.13}},'76-90':{'1-4':{mean:1.93,sd:0.26},'5-8':{mean:2.00,sd:0.01},'9+':{mean:2.00,sd:0.01}} },
  lang_compreensao_oral:     { '19-39':{'1-4':{mean:2.78,sd:0.50},'5-8':{mean:2.98,sd:0.13},'9+':{mean:2.98,sd:0.15}},'40-59':{'1-4':{mean:2.60,sd:0.63},'5-8':{mean:2.80,sd:0.46},'9+':{mean:2.98,sd:0.13}},'60-75':{'1-4':{mean:2.77,sd:0.48},'5-8':{mean:2.83,sd:0.38},'9+':{mean:2.85,sd:0.40}},'76-90':{'1-4':{mean:2.48,sd:0.78},'5-8':{mean:2.73,sd:0.58},'9+':{mean:2.86,sd:0.35}} },
  lang_inferencias:          { '19-39':{'1-4':{mean:2.14,sd:0.69},'5-8':{mean:2.52,sd:0.65},'9+':{mean:2.85,sd:0.37}},'40-59':{'1-4':{mean:2.10,sd:0.76},'5-8':{mean:2.36,sd:0.61},'9+':{mean:2.65,sd:0.55}},'60-75':{'1-4':{mean:1.92,sd:0.90},'5-8':{mean:2.19,sd:0.63},'9+':{mean:2.65,sd:0.48}},'76-90':{'1-4':{mean:1.72,sd:0.96},'5-8':{mean:2.20,sd:0.66},'9+':{mean:2.53,sd:0.59}} },
  lang_written:              { '19-39':{'1-4':{mean:25.76,sd:3.25},'5-8':{mean:28.27,sd:1.70},'9+':{mean:30.22,sd:1.03}},'40-59':{'1-4':{mean:23.17,sd:6.33},'5-8':{mean:28.36,sd:1.81},'9+':{mean:29.84,sd:1.06}},'60-75':{'1-4':{mean:24.23,sd:6.15},'5-8':{mean:27.73,sd:3.05},'9+':{mean:29.55,sd:1.56}},'76-90':{'1-4':{mean:22.00,sd:5.67},'5-8':{mean:27.80,sd:2.23},'9+':{mean:29.26,sd:1.69}} },
  lang_leitura:              { '19-39':{'1-4':{mean:10.80,sd:1.57},'5-8':{mean:11.60,sd:0.56},'9+':{mean:11.90,sd:0.31}},'40-59':{'1-4':{mean:9.74,sd:2.82},'5-8':{mean:11.71,sd:0.50},'9+':{mean:11.89,sd:0.31}},'60-75':{'1-4':{mean:10.46,sd:2.41},'5-8':{mean:11.48,sd:0.87},'9+':{mean:11.91,sd:0.35}},'76-90':{'1-4':{mean:10.34,sd:1.78},'5-8':{mean:11.60,sd:0.72},'9+':{mean:11.86,sd:0.41}} },
  lang_compreensao_escrita:  { '19-39':{'1-4':{mean:2.78,sd:0.46},'5-8':{mean:2.87,sd:0.34},'9+':{mean:2.96,sd:0.20}},'40-59':{'1-4':{mean:2.60,sd:0.66},'5-8':{mean:2.80,sd:0.46},'9+':{mean:2.92,sd:0.26}},'60-75':{'1-4':{mean:2.56,sd:0.68},'5-8':{mean:2.75,sd:0.55},'9+':{mean:2.85,sd:0.35}},'76-90':{'1-4':{mean:2.34,sd:0.72},'5-8':{mean:2.63,sd:0.55},'9+':{mean:2.77,sd:0.53}} },
  lang_escrita_espontanea:   { '19-39':{'1-4':{mean:1.41,sd:0.67},'5-8':{mean:1.63,sd:0.52},'9+':{mean:1.90,sd:0.37}},'40-59':{'1-4':{mean:1.14,sd:0.84},'5-8':{mean:1.53,sd:0.66},'9+':{mean:1.91,sd:0.28}},'60-75':{'1-4':{mean:1.08,sd:0.77},'5-8':{mean:1.67,sd:0.55},'9+':{mean:1.89,sd:0.37}},'76-90':{'1-4':{mean:0.83,sd:0.80},'5-8':{mean:1.70,sd:0.59},'9+':{mean:1.60,sd:0.66}} },
  lang_escrita_copiada:      { '19-39':{'1-4':{mean:1.49,sd:0.50},'5-8':{mean:1.85,sd:0.36},'9+':{mean:1.98,sd:0.12}},'40-59':{'1-4':{mean:1.64,sd:0.58},'5-8':{mean:1.91,sd:0.29},'9+':{mean:1.98,sd:0.13}},'60-75':{'1-4':{mean:1.38,sd:0.67},'5-8':{mean:1.67,sd:0.47},'9+':{mean:1.91,sd:0.35}},'76-90':{'1-4':{mean:1.14,sd:0.64},'5-8':{mean:1.60,sd:0.50},'9+':{mean:1.91,sd:0.29}} },
  lang_ditada:               { '19-39':{'1-4':{mean:9.27,sd:1.48},'5-8':{mean:10.32,sd:1.20},'9+':{mean:11.48,sd:0.77}},'40-59':{'1-4':{mean:8.05,sd:3.18},'5-8':{mean:10.40,sd:1.32},'9+':{mean:11.12,sd:0.82}},'60-75':{'1-4':{mean:8.74,sd:2.99},'5-8':{mean:10.15,sd:1.74},'9+':{mean:10.98,sd:1.03}},'76-90':{'1-4':{mean:7.34,sd:2.94},'5-8':{mean:10.27,sd:1.46},'9+':{mean:11.12,sd:1.09}} },
  praxis:                    { '19-39':{'1-4':{mean:14.94,sd:2.64},'5-8':{mean:16.33,sd:2.61},'9+':{mean:19.09,sd:2.07}},'40-59':{'1-4':{mean:13.93,sd:3.27},'5-8':{mean:16.69,sd:2.68},'9+':{mean:18.44,sd:2.09}},'60-75':{'1-4':{mean:14.74,sd:2.70},'5-8':{mean:15.35,sd:2.96},'9+':{mean:17.36,sd:3.03}},'76-90':{'1-4':{mean:12.79,sd:2.69},'5-8':{mean:14.97,sd:2.76},'9+':{mean:16.60,sd:2.44}} },
  praxis_ideomotor:          { '19-39':{'1-4':{mean:2.96,sd:0.19},'5-8':{mean:2.95,sd:0.22},'9+':{mean:2.99,sd:0.09}},'40-59':{'1-4':{mean:2.88,sd:0.39},'5-8':{mean:2.98,sd:0.15},'9+':{mean:3.00,sd:0.01}},'60-75':{'1-4':{mean:2.95,sd:0.22},'5-8':{mean:2.98,sd:0.14},'9+':{mean:3.00,sd:0.01}},'76-90':{'1-4':{mean:2.93,sd:0.26},'5-8':{mean:2.97,sd:0.18},'9+':{mean:2.98,sd:0.15}} },
  praxis_constructive:       { '19-39':{'1-4':{mean:9.65,sd:2.05},'5-8':{mean:11.00,sd:2.25},'9+':{mean:13.44,sd:1.97}},'40-59':{'1-4':{mean:9.12,sd:3.04},'5-8':{mean:11.60,sd:2.52},'9+':{mean:13.11,sd:1.99}},'60-75':{'1-4':{mean:9.74,sd:2.51},'5-8':{mean:10.58,sd:2.74},'9+':{mean:12.29,sd:2.64}},'76-90':{'1-4':{mean:8.10,sd:2.47},'5-8':{mean:10.13,sd:2.33},'9+':{mean:11.84,sd:2.30}} },
  praxis_reflexive:          { '19-39':{'1-4':{mean:2.33,sd:0.95},'5-8':{mean:2.38,sd:0.99},'9+':{mean:2.65,sd:0.77}},'40-59':{'1-4':{mean:1.93,sd:1.11},'5-8':{mean:2.11,sd:1.09},'9+':{mean:2.33,sd:0.85}},'60-75':{'1-4':{mean:2.05,sd:0.97},'5-8':{mean:1.79,sd:1.09},'9+':{mean:2.07,sd:1.01}},'76-90':{'1-4':{mean:1.76,sd:1.09},'5-8':{mean:1.87,sd:1.04},'9+':{mean:1.79,sd:1.08}} },
  executive:                 { '19-39':{'1-4':{mean:5.35,sd:1.60},'5-8':{mean:6.52,sd:1.63},'9+':{mean:7.64,sd:1.56}},'40-59':{'1-4':{mean:4.90,sd:1.44},'5-8':{mean:6.27,sd:1.56},'9+':{mean:7.74,sd:1.50}},'60-75':{'1-4':{mean:5.23,sd:1.52},'5-8':{mean:5.94,sd:1.58},'9+':{mean:7.50,sd:1.59}},'76-90':{'1-4':{mean:4.45,sd:1.31},'5-8':{mean:5.47,sd:1.39},'9+':{mean:6.07,sd:1.55}} },
  executive_problem_solving: { '19-39':{'1-4':{mean:1.45,sd:0.54},'5-8':{mean:1.55,sd:0.53},'9+':{mean:1.87,sd:0.38}},'40-59':{'1-4':{mean:1.45,sd:0.63},'5-8':{mean:1.69,sd:0.56},'9+':{mean:1.88,sd:0.33}},'60-75':{'1-4':{mean:1.44,sd:0.64},'5-8':{mean:1.56,sd:0.54},'9+':{mean:1.85,sd:0.35}},'76-90':{'1-4':{mean:1.28,sd:0.59},'5-8':{mean:1.47,sd:0.51},'9+':{mean:1.60,sd:0.49}} },
  executive_verbal_fluency:  { '19-39':{'1-4':{mean:9.80,sd:4.22},'5-8':{mean:12.87,sd:4.09},'9+':{mean:15.35,sd:4.27}},'40-59':{'1-4':{mean:8.57,sd:3.62},'5-8':{mean:11.89,sd:3.89},'9+':{mean:15.79,sd:4.41}},'60-75':{'1-4':{mean:9.36,sd:4.40},'5-8':{mean:11.13,sd:4.73},'9+':{mean:14.91,sd:4.85}},'76-90':{'1-4':{mean:7.52,sd:3.71},'5-8':{mean:10.00,sd:4.09},'9+':{mean:11.28,sd:4.35}} },
}

function npAgeGroup(age) {
  const a = Number(age)
  if (!a) return '40-59'
  if (a <= 39) return '19-39'
  if (a <= 59) return '40-59'
  if (a <= 75) return '60-75'
  return '76-90'
}
function npEduGroup(edu) {
  if (!edu) return '9+'
  const e = String(edu)
  if (e === '1-4') return '1-4'
  if (e === '5-8') return '5-8'
  if (e === '9+')  return '9+'
  const n = parseInt(e)
  if (!isNaN(n)) { if (n <= 4) return '1-4'; if (n <= 8) return '5-8'; return '9+' }
  const low = e.toLowerCase()
  if (low.includes('fundamental') && (low.includes('incompleto') || low.includes('1') || low.includes('4'))) return '1-4'
  if (low.includes('fundamental')) return '5-8'
  return '9+'
}
function npCalcZ(score, domain, ageG, eduG, inverted = false) {
  const n = NP[domain]?.[ageG]?.[eduG]
  if (!n || score == null || score === '') return null
  const s = Number(score)
  if (isNaN(s)) return null
  const sd = n.sd < 0.05 ? 0.05 : n.sd
  const z = inverted ? (n.mean - s) / sd : (s - n.mean) / sd
  return isFinite(z) ? z : null
}
function npZtoPct(z) {
  if (z == null) return null
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t) * Math.exp(-x*x)
  const pct = 0.5 * (1 + sign * y) * 100
  return Math.round(Math.max(1, Math.min(99, pct)))
}

// ── Helpers para tabelas do laudo ────────────────────────────────────────────
const H = '#1A3D2B'  // verde escuro cabeçalho
const HR = '#e8f5e9' // verde claro linha alternada

const thCell  = (txt, extra='') => `<th style="border:1px solid #a5c6a5;padding:7px 10px;background:${H};color:#fff;text-align:left;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;${extra}">${txt}</th>`
const tdCell  = (txt, extra='') => `<td style="border:1px solid #c8dfc8;padding:6px 10px;${extra}">${txt ?? '—'}</td>`
const secHead = (title) => `<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${title}</div>`
const tableWrap = (rows, head='') => `<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:11pt;">${head}<tbody>${rows}</tbody></table>`

const classZ = (z) => {
  if (z == null) return { label: '—', color: '#555' }
  const n = parseFloat(z)
  if (n >= -1.0)  return { label: 'PRESERVADO',   color: '#1b5e20' }
  if (n >= -1.5)  return { label: 'LIMÍTROFE',     color: '#e65100' }
  return              { label: 'COMPROMETIDO',  color: '#c62828' }
}

const fmtDate = (d) => {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}

// ── Tabela ESCALAS ────────────────────────────────────────────────────────────
function buildEscalasSection(td, selectedTests) {
  const rows = []

  const addRow = (label, score, classif, alt = false) => {
    const bg = alt ? HR : '#fff'
    rows.push(`<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(label)}
      ${tdCell(score ?? '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(classif ?? '—', 'text-align:center;')}
    </tr>`)
  }

  let i = 0
  if (selectedTests.includes('GDS-15') && td?.['GDS-15']) {
    addRow('Escala de Depressão Geriátrica (GDS-15)', td['GDS-15'].total_score, td['GDS-15'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('GAI') && td?.GAI) {
    addRow('Inventário de Ansiedade Geriátrica (GAI)', td.GAI.total_score, td.GAI.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('BDI-II') && td?.['BDI-II']) {
    addRow('Inventário de Depressão de Beck II (BDI-II)', td['BDI-II'].total_score, td['BDI-II'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('HAD') && td?.HAD) {
    addRow(`HAD — Ansiedade`, td.HAD.anxiety_score, td.HAD.anxiety_classification, i++ % 2 === 1)
    addRow(`HAD — Depressão`, td.HAD.depression_score, td.HAD.depression_classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('IQCODE') && td?.IQCODE) {
    addRow('IQCODE', td.IQCODE.total_score, td.IQCODE.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('B-ADL') && td?.['B-ADL']) {
    addRow('Escala Bayer (B-ADL)', td['B-ADL'].total_score, td['B-ADL'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('Pfeffer') && td?.Pfeffer) {
    addRow('Questionário de Pfeffer', td.Pfeffer.total_score, td.Pfeffer.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('Lawton') && td?.Lawton) {
    addRow('Escala de Lawton', td.Lawton.total_score, td.Lawton.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('BADL') && td?.BADL) {
    addRow('BADL (Índice de Katz)', td.BADL.total_score, td.BADL.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('FAB') && td?.FAB) {
    addRow('Bateria de Avaliação Frontal (FAB)', td.FAB.total_score, td.FAB.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('MoCA') && td?.MoCA) {
    addRow('MoCA (Avaliação Cognitiva Montreal)', td.MoCA.total_score, td.MoCA.classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('IDATE-E') && td?.['IDATE-E']) {
    addRow('IDATE — Estado', td['IDATE-E'].total_score, td['IDATE-E'].classification, i++ % 2 === 1)
  }
  if (selectedTests.includes('IDATE-T') && td?.['IDATE-T']) {
    addRow('IDATE — Traço', td['IDATE-T'].total_score, td['IDATE-T'].classification, i++ % 2 === 1)
  }

  if (rows.length === 0) return ''

  const head = `<thead><tr>
    ${thCell('Escalas')}
    ${thCell('Pontos', 'text-align:center;')}
    ${thCell('Classificação', 'text-align:center;')}
  </tr></thead>`

  return secHead('TABELA DE RESULTADOS – ESCALAS') + tableWrap(rows.join(''), head)
}

// ── Tabela NEUPSILIN (sub-domínios completos com NORMAS) ─────────────────────
function buildNeupsilinSection(td, patient) {
  const d = td?.NEUPSILIN
  if (!d) return ''

  // --- Formato legado (rawScores/zScores) ---
  if (d.rawScores || d.zScores) {
    const zs = d.zScores   || {}
    const rs = d.rawScores || {}
    const domains = [
      { label: '1 – Orientação',              key: 'orientation' },
      { label: '2 – Atenção',                 key: 'attention'   },
      { label: '3 – Percepção',               key: 'perception'  },
      { label: '4 – Memória',                 key: 'memory'      },
      { label: '5 – Habilidades Aritméticas', key: 'arithmetic'  },
      { label: '6 – Linguagem',               key: 'language'    },
      { label: '7 – Praxias',                 key: 'praxis'      },
      { label: '8 – Funções Executivas',      key: 'executive'   },
    ]
    const rows = domains.map((dom, i) => {
      const z = zs[dom.key]; const raw = rs[dom.key]; const cls = classZ(z)
      const bg = i % 2 === 0 ? '#fff' : HR
      return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell(dom.label,'font-weight:bold;')}
        ${tdCell(raw ?? '—','text-align:center;')}
        ${tdCell(z != null ? parseFloat(z).toFixed(2) : '—','text-align:center;')}
        ${tdCell('—','text-align:center;')}
        ${tdCell(`<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>`,'text-align:center;')}
      </tr>`
    }).join('')
    const head = `<thead>
      <tr><th colspan="5" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Instrumento de Avaliação Neuropsicológica Breve Adulto – NEUPSILIN</th></tr>
      <tr>${thCell('Domínio')}${thCell('Escore Bruto','text-align:center;')}${thCell('Z-Escore','text-align:center;')}${thCell('Percentil','text-align:center;')}${thCell('Classificação','text-align:center;')}</tr>
    </thead>`
    return tableWrap(rows, head)
  }

  // --- Novo formato (campos flat) ---
  const age = d.age || (patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25*24*60*60*1000)) : null)
  const eduRaw = d.education_years || patient?.education || '9+'
  const ageG = npAgeGroup(age)
  const eduG = npEduGroup(eduRaw)

  // Totais calculados
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

  const zRow = (score, domain, inv=false) => {
    const z = npCalcZ(score, domain, ageG, eduG, inv)
    const pct = npZtoPct(z)
    const cls = classZ(z)
    return { zLbl: z != null ? z.toFixed(2) : '—', pctLbl: pct != null ? pct+'%' : '—', cls }
  }

  const domHead = (label, score, domain, i) => {
    const { zLbl, pctLbl, cls } = zRow(score, domain)
    const bg = i % 2 === 0 ? '#e8f5e9' : '#d7ede7'
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(`<strong>${label}</strong>`,'font-weight:bold;background:${bg};')}
      ${tdCell(score != null && score !== '' ? String(score) : '—','text-align:center;font-weight:bold;')}
      ${tdCell(zLbl,'text-align:center;font-weight:bold;')}
      ${tdCell(pctLbl,'text-align:center;font-weight:bold;')}
      ${tdCell(`<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>`,'text-align:center;')}
    </tr>`
  }
  const subRow = (label, score, domain, i, inv=false) => {
    const { zLbl, pctLbl, cls } = zRow(score, domain, inv)
    const bg = i % 2 === 0 ? '#fff' : HR
    const scoreStr = score != null && score !== '' ? String(score) : '—'
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(`&nbsp;&nbsp;&nbsp;${label}`,'color:#444;')}
      ${tdCell(scoreStr,'text-align:center;')}
      ${tdCell(zLbl,'text-align:center;')}
      ${tdCell(pctLbl,'text-align:center;')}
      ${tdCell(scoreStr !== '—' ? `<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>` : '—','text-align:center;')}
    </tr>`
  }

  let ri = 0
  const rows = [
    domHead('1 – ORIENTAÇÃO', orientTotal || null, 'orientation', ri++),
    subRow('Orientação Temporal', d.orientation_time, 'orientation_time', ri++),
    subRow('Orientação Espacial', d.orientation_space, 'orientation_space', ri++),

    domHead('2 – ATENÇÃO', attTotal || null, 'attention', ri++),
    subRow('Contagem Inversa', d.attention_reverse_count, 'attention_reverse_count', ri++),
    subRow('Tempo de Execução (seg) ↑menor=melhor', d.attention_execution_time, 'attention_execution_time', ri++, true),
    subRow('Sequência de Dígitos', d.attention_digit_sequence, 'attention_digit_sequence', ri++),

    domHead('3 – PERCEPÇÃO', percTotal || null, 'perception', ri++),
    subRow('Julgamento de Linhas', d.perception_line_equality, 'perception_line_equality', ri++),
    subRow('Heminegligência Visual', d.perception_visual_hemineglect, 'perception_visual_hemineglect', ri++),
    subRow('Percepção de Faces', d.perception_face_perception, 'perception_face_perception', ri++),
    subRow('Reconhecimento de Faces', d.perception_face_recognition, 'perception_face_recognition', ri++),

    domHead('4 – MEMÓRIA', memTotal || null, 'memory', ri++),
    subRow('Memória de Trabalho — Ordenamento', d.memory_working, 'memory_working', ri++),
    subRow('Memória de Trabalho — Span Dígitos', d.memory_working_digit, 'memory_working_digit', ri++),
    subRow('Span Auditivo', d.memory_span_auditory, 'memory_span_auditory', ri++),
    subRow('Memória Episódica (total)', episTotal || null, 'memory_episodic', ri++),
    subRow('↳ Evocação Imediata', d.memory_episodic_immediate, 'memory_episodic_immediate', ri++),
    subRow('↳ Evocação Tardia', d.memory_episodic_delayed, 'memory_episodic_delayed', ri++),
    subRow('↳ Reconhecimento', d.memory_episodic_recognition, 'memory_episodic_recognition', ri++),
    subRow('Memória Semântica', d.memory_semantic_long, 'memory_semantic_long', ri++),
    subRow('Memória Visual', d.memory_visual_short, 'memory_visual_short', ri++),
    subRow('Memória Prospectiva', d.memory_prospective, 'memory_prospective', ri++),

    domHead('5 – HABILIDADES ARITMÉTICAS', d.arithmetic != null && d.arithmetic !== '' ? Number(d.arithmetic) : null, 'arithmetic', ri++),

    domHead('6 – LINGUAGEM', langTotal || null, 'language', ri++),
    subRow('Linguagem Oral (total)', langOral || null, 'lang_oral', ri++),
    subRow('↳ Nomeação', d.lang_nomeacao, 'lang_nomeacao', ri++),
    subRow('↳ Repetição', d.lang_repeticao, 'lang_repeticao', ri++),
    subRow('↳ Linguagem Automática', d.lang_automatica, 'lang_automatica', ri++),
    subRow('↳ Compreensão Oral', d.lang_compreensao_oral, 'lang_compreensao_oral', ri++),
    subRow('↳ Inferências', d.lang_inferencias, 'lang_inferencias', ri++),
    subRow('Linguagem Escrita (total)', langEsc || null, 'lang_written', ri++),
    subRow('↳ Leitura', d.lang_leitura, 'lang_leitura', ri++),
    subRow('↳ Compreensão Escrita', d.lang_compreensao_escrita, 'lang_compreensao_escrita', ri++),
    subRow('↳ Escrita Espontânea', d.lang_escrita_espontanea, 'lang_escrita_espontanea', ri++),
    subRow('↳ Escrita Copiada', d.lang_escrita_copiada, 'lang_escrita_copiada', ri++),
    subRow('↳ Escrita Ditada', d.lang_ditada, 'lang_ditada', ri++),

    domHead('7 – PRAXIAS', praxTotal || null, 'praxis', ri++),
    subRow('Ideomotora', d.praxis_ideomotor, 'praxis_ideomotor', ri++),
    subRow('Construtiva', d.praxis_constructive, 'praxis_constructive', ri++),
    subRow('Reflexiva', d.praxis_reflexive, 'praxis_reflexive', ri++),

    domHead('8 – FUNÇÕES EXECUTIVAS', execTotal || null, 'executive', ri++),
    subRow('Resolução de Problemas', d.executive_problem_solving, 'executive_problem_solving', ri++),
    subRow('Fluência Verbal (nº vocábulos)', d.executive_verbal_fluency, 'executive_verbal_fluency', ri++),
  ].join('')

  const head = `<thead>
    <tr><th colspan="5" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Instrumento de Avaliação Neuropsicológica Breve Adulto – NEUPSILIN<br/><span style="font-size:9pt;font-weight:400;">Grupo de referência: ${ageG} anos | Escolaridade: ${eduG} anos</span></th></tr>
    <tr>
      ${thCell('Domínio / Sub-domínio')}
      ${thCell('Escore Bruto','text-align:center;')}
      ${thCell('Z-Escore','text-align:center;')}
      ${thCell('Percentil','text-align:center;')}
      ${thCell('Classificação','text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela RAVLT ──────────────────────────────────────────────────────────────
const clsRAVLT = (s) => {
  if (s == null || s === '') return { label: '—', color: '#6b7280' }
  const v = Number(s)
  if (v >= 13) return { label: 'Superior',        color: '#15803d' }
  if (v >= 11) return { label: 'Acima da Média',  color: '#059669' }
  if (v >= 8)  return { label: 'Média',           color: '#1d4ed8' }
  if (v >= 5)  return { label: 'Abaixo da Média', color: '#d97706' }
  return             { label: 'Déficit',          color: '#dc2626' }
}
const clsRAVLT_total = (v) => {
  if (v == null) return { label: '—', color: '#6b7280' }
  if (v >= 50) return { label: 'Superior',        color: '#15803d' }
  if (v >= 40) return { label: 'Média',           color: '#1d4ed8' }
  if (v >= 30) return { label: 'Abaixo da Média', color: '#d97706' }
  return             { label: 'Déficit',          color: '#dc2626' }
}
const clsRAVLT_rec = (v) => {
  if (v == null) return { label: '—', color: '#6b7280' }
  if (v >= 13) return { label: 'Superior',        color: '#15803d' }
  if (v >= 10) return { label: 'Média',           color: '#1d4ed8' }
  if (v >= 7)  return { label: 'Abaixo da Média', color: '#d97706' }
  return             { label: 'Déficit',          color: '#dc2626' }
}

function buildRAVLTSection(td) {
  const d = td?.RAVLT
  if (!d) return ''

  const trialList = [
    { label: 'A1 — Tentativa 1',      score: d.a1 },
    { label: 'A2 — Tentativa 2',      score: d.a2 },
    { label: 'A3 — Tentativa 3',      score: d.a3 },
    { label: 'A4 — Tentativa 4',      score: d.a4 },
    { label: 'A5 — Tentativa 5',      score: d.a5 },
    { label: 'B1 — Lista Distratora', score: d.b1 },
    { label: 'A6 — Evocação Imediata após Interferência', score: d.a6 },
    { label: 'A7 — Evocação Tardia',  score: d.a7 },
  ]

  const total = [d.a1, d.a2, d.a3, d.a4, d.a5]
    .reduce((s, v) => s + (v != null && v !== '' ? Number(v) : 0), 0)
  const hasTotal = [d.a1, d.a2, d.a3, d.a4, d.a5].some(v => v != null && v !== '')

  const trialRows = trialList.map((t, i) => {
    const cls = clsRAVLT(t.score)
    const bg  = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(t.label)}
      ${tdCell(t.score ?? '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(`<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>`, 'text-align:center;')}
    </tr>`
  }).join('')

  const totalCls  = clsRAVLT_total(hasTotal ? total : null)
  const altScore  = d.a1 != null && d.a5 != null ? Number(d.a5) - Number(d.a1) : null
  const recCls    = clsRAVLT_rec(d.recognition != null && d.recognition !== '' ? Number(d.recognition) : null)

  const summaryRows = `
  <tr style="background:#dce8dc;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('<strong>Total A1–A5 (Aprendizagem Total)</strong>')}
    ${tdCell(hasTotal ? total : '—', 'text-align:center;font-weight:bold;')}
    ${tdCell(`<span style="color:${totalCls.color};font-weight:bold;">${totalCls.label}</span>`, 'text-align:center;')}
  </tr>
  ${altScore != null ? `<tr style="background:#fff;">
    ${tdCell('ALT — Aprendizagem ao Longo das Tentativas (A5–A1)')}
    ${tdCell(altScore >= 0 ? '+' + altScore : altScore, 'text-align:center;font-weight:bold;')}
    ${tdCell(altScore >= 7 ? '<span style="color:#15803d;font-weight:bold;">Adequada</span>' : '<span style="color:#d97706;font-weight:bold;">Abaixo do Esperado</span>', 'text-align:center;')}
  </tr>` : ''}
  <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('Reconhecimento')}
    ${tdCell(d.recognition ?? '—', 'text-align:center;font-weight:bold;')}
    ${tdCell(`<span style="color:${recCls.color};font-weight:bold;">${recCls.label}</span>`, 'text-align:center;')}
  </tr>`

  const head = `<thead>
    <tr><th colspan="3" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Teste de Aprendizagem Auditivo-Verbal de Rey – RAVLT</th></tr>
    <tr>
      ${thCell('Índice / Tentativa')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(trialRows + summaryRows, head)
}

// ── Tabela WASI/WASI-III ──────────────────────────────────────────────────────
function buildWASISection(td, selectedTests) {
  const key  = selectedTests.includes('WASI-III') ? 'WASI-III' : 'WASI'
  const d    = td?.[key]
  if (!d) return ''
  const label = key === 'WASI-III' ? 'Escala de Inteligência de Wechsler Abreviada III – WASI-III' : 'Escala de Inteligência de Wechsler Abreviada – WASI'

  const rows = [
    ['QI Total', d.qit_2 ?? d.qit, d.qit_percentile, d.classification],
    ['Vocabulário (QI)', d.vocab_qi, d.vocab_percentile, null],
    ['Raciocínio Matricial (QI)', d.matrix_qi, d.matrix_percentile, null],
  ].filter(r => r[1] != null).map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(r[0], i === 0 ? 'font-weight:bold;' : '')}
      ${tdCell(r[1], 'text-align:center;font-weight:bold;')}
      ${tdCell(r[2] ?? '—', 'text-align:center;')}
      ${tdCell(r[3] ?? '—', 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="4" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${label}</th></tr>
    <tr>
      ${thCell('Índice')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Percentil', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela BAMS ───────────────────────────────────────────────────────────────
function buildBAMSSection(td) {
  const d = td?.BAMS
  if (!d) return ''

  const rows = [
    ['Escore Global BAMS', d.global_score, d.percentile, d.interpretation],
  ].map((r, i) => {
    return `<tr style="background:#fff;">
      ${tdCell(r[0], 'font-weight:bold;')}
      ${tdCell(r[1], 'text-align:center;font-weight:bold;')}
      ${tdCell(r[2], 'text-align:center;')}
      ${tdCell(r[3], 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="4" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Bateria de Avaliação da Memória Semântica – BAMS</th></tr>
    <tr>
      ${thCell('Índice')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Percentil', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela WCST-N ─────────────────────────────────────────────────────────────
const clsWCST_pct = (pct) => {
  if (pct <  5) return { label: 'LIMÍTROFE',      color: '#D32F2F' }
  if (pct < 10) return { label: 'ABAIXO DA MÉDIA',color: '#E64A19' }
  if (pct < 25) return { label: 'MÉDIA INFERIOR', color: '#F57C00' }
  if (pct < 75) return { label: 'MÉDIA',          color: '#1b5e20' }
  if (pct < 90) return { label: 'MÉDIA SUPERIOR', color: '#2E7D32' }
  return              { label: 'SUPERIOR',        color: '#1B5E20' }
}
const wcstCatPct   = (n) => n >= 6 ? 95 : n >= 5 ? 75 : n >= 4 ? 50 : n >= 3 ? 25 : n >= 2 ? 10 : n >= 1 ? 5 : 2
const wcstPersPct  = (n) => n <= 5 ? 95 : n <= 10 ? 75 : n <= 16 ? 50 : n <= 22 ? 25 : n <= 30 ? 10 : n <= 41 ? 5 : 2
const wcstRespPct  = (n) => n <= 6 ? 95 : n <= 12 ? 75 : n <= 18 ? 50 : n <= 24 ? 25 : n <= 32 ? 10 : 5

function buildWCSTSection(td) {
  const d = td?.['WCST-N']
  if (!d) return ''

  const rows_data = [
    { label: 'Categorias completadas',          val: d.categories_completed,      pctFn: wcstCatPct,  note: '(0–6, maior = melhor)' },
    { label: 'Erros perseverativos',            val: d.perseverative_errors,      pctFn: wcstPersPct, note: '(menor = melhor)' },
    { label: 'Respostas perseverativas',        val: d.perseverative_responses,   pctFn: wcstRespPct, note: '(menor = melhor)' },
    { label: 'Total de erros',                  val: d.total_errors,              pctFn: null,        note: '' },
  ].filter(r => r.val != null && r.val !== '')

  if (rows_data.length === 0) return ''

  const rows = rows_data.map((r, i) => {
    const pct  = r.pctFn ? r.pctFn(Number(r.val)) : null
    const cls  = pct != null ? clsWCST_pct(pct) : { label: '—', color: '#6b7280' }
    const bg   = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(`${r.label} <span style="color:#888;font-size:9pt;">${r.note}</span>`)}
      ${tdCell(r.val, 'text-align:center;font-weight:bold;')}
      ${tdCell(pct != null ? `<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>` : '—', 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="3" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)</th></tr>
    <tr>
      ${thCell('Fator')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Documento completo ────────────────────────────────────────────────────────
function buildFullDocument({ patient, selectedTests, appliedBy, user, ad, td, aiBody, dataFormatada }) {
  const age   = patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const professional = appliedBy || user?.full_name || 'Profissional responsável'

  // Informante(s)
  const informante = [ad?.acompanhante, ad?.responsavel].filter(Boolean).join(', ')
    || ad?.informante || '—'
  const parentesco = ad?.parentesco_acompanhante ? ` (${ad.parentesco_acompanhante})` : ''

  // Período do exame
  const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // PROCEDIMENTO — lista de testes
  const procedimentoItems = selectedTests
    .map(k => FULL_TEST_NAMES[k] || k)
    .map(name => `<li style="margin-bottom:4px;">${name}</li>`)
    .join('')

  // ESCALAS e TESTES
  const escalasSection = buildEscalasSection(td, selectedTests)
  const hasNeupsilin   = selectedTests.includes('NEUPSILIN') && td?.NEUPSILIN
  const hasRAVLT       = selectedTests.includes('RAVLT')     && td?.RAVLT
  const hasWASI        = (selectedTests.includes('WASI') || selectedTests.includes('WASI-III'))
  const hasBAMS        = selectedTests.includes('BAMS')      && td?.BAMS
  const hasWCST        = selectedTests.includes('WCST-N')    && td?.['WCST-N']

  const testesSection = (hasNeupsilin || hasRAVLT || hasWASI || hasBAMS || hasWCST)
    ? secHead('TABELA DE RESULTADOS – TESTES') +
      buildNeupsilinSection(td, patient) +
      buildRAVLTSection(td) +
      buildWASISection(td, selectedTests) +
      buildBAMSSection(td) +
      buildWCSTSection(td)
    : ''

  // INFORMAÇÕES GERAIS — construídas da anamnese
  const queixas   = ad?.queixas || ad?.queixas_cognitivas_emocionais || ''
  const objetivo  = ad?.objetivo_avaliacao || ad?.motivo_encaminhamento || ''
  const doencas   = Array.isArray(ad?.doencas_preexistentes)
    ? ad.doencas_preexistentes.join(', ')
    : (ad?.doencas_preexistentes || '')
  const medicamentos = ad?.medicamentos || '—'
  const exames       = ad?.exames || 'Paciente não apresenta exames imagiológicos.'

  const infoGeraisParas = []
  if (objetivo) infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;"><strong>Objetivo da avaliação:</strong> ${objetivo}</p>`)
  if (queixas)  infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;"><strong>Queixas apresentadas:</strong> ${queixas}</p>`)
  if (doencas)  infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;"><strong>Histórico clínico:</strong> ${doencas}</p>`)
  if (ad?.sono || ad?.apetite) {
    const sonoApetite = [ad.sono && `Sono: ${ad.sono}`, ad.apetite && `Apetite: ${ad.apetite}`].filter(Boolean).join(' | ')
    infoGeraisParas.push(`<p style="font-size:11pt;margin:8px 0;text-align:justify;">${sonoApetite}</p>`)
  }

  return `
<div style="font-family:Georgia,'Times New Roman',serif;color:#1a1a2e;line-height:1.7;max-width:760px;margin:0 auto;">

  <!-- CABEÇALHO -->
  <div style="border-bottom:3px solid ${H};padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:10px;color:#2E7D32;font-weight:700;letter-spacing:0.12em;margin-bottom:3px;">NEUROPSICOLOGIA NA PRÁTICA</div>
      <div style="font-size:22px;font-weight:800;color:${H};letter-spacing:-0.01em;">NEUROAVALIAÇÃO</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">Neuropsicologia Clínica · Psicoterapia · Terapia ABA</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#555;line-height:1.6;">
      <div style="font-weight:700;color:${H};">${SUPERVISOR.name}</div>
      <div>${SUPERVISOR.crp}</div>
      <div>São Paulo — SP</div>
    </div>
  </div>

  <!-- TÍTULO -->
  <div style="text-align:center;margin-bottom:20px;">
    <div style="display:inline-block;background:${H};color:#fff;font-size:13px;font-weight:700;letter-spacing:0.1em;padding:8px 36px;border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      LAUDO NEUROPSICOLÓGICO
    </div>
  </div>

  <!-- DADOS DO PACIENTE -->
  ${secHead('DADOS DO PACIENTE')}
  <table style="width:100%;border-collapse:collapse;font-size:11pt;">
    <tbody>
      <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell('<strong>Paciente</strong>', 'font-weight:bold;width:22%;')}
        ${tdCell(patient?.full_name || '—', 'width:28%;')}
        ${tdCell('<strong>Data de Nascimento</strong>', 'font-weight:bold;width:22%;')}
        ${tdCell(fmtDate(patient?.birth_date))}
      </tr>
      <tr>
        ${tdCell('<strong>Idade</strong>', 'font-weight:bold;')}
        ${tdCell(age != null ? age + ' anos' : '—')}
        ${tdCell('<strong>Sexo</strong>', 'font-weight:bold;')}
        ${tdCell(patient?.sex || '—')}
      </tr>
      <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell('<strong>Escolaridade</strong>', 'font-weight:bold;')}
        ${tdCell(patient?.education || ad?.escolaridade || '—')}
        ${tdCell('<strong>Lateralidade</strong>', 'font-weight:bold;')}
        ${tdCell(ad?.lateralidade || patient?.lateralidade || '—')}
      </tr>
      <tr>
        ${tdCell('<strong>Período do Exame</strong>', 'font-weight:bold;')}
        ${tdCell(mesAno)}
        ${tdCell('<strong>Data do Laudo</strong>', 'font-weight:bold;')}
        ${tdCell(dataFormatada)}
      </tr>
      <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell('<strong>Informante(s)</strong>', 'font-weight:bold;')}
        ${tdCell(informante + parentesco)}
        ${tdCell('<strong>Avaliado por</strong>', 'font-weight:bold;')}
        ${tdCell(professional)}
      </tr>
      <tr>
        ${tdCell('<strong>Medicamentos</strong>', 'font-weight:bold;')}
        <td colspan="3" style="border:1px solid #c8dfc8;padding:6px 10px;">${medicamentos}</td>
      </tr>
    </tbody>
  </table>

  <!-- INFORMAÇÕES GERAIS E QUEIXAS -->
  ${infoGeraisParas.length > 0 ? secHead('INFORMAÇÕES GERAIS E QUEIXAS PRINCIPAIS') + infoGeraisParas.join('') : ''}

  <!-- EXAMES IMAGIOLÓGICOS -->
  ${secHead('EXAMES IMAGIOLÓGICOS')}
  <p style="font-size:11pt;margin:8px 0;text-align:justify;">${exames}</p>

  <!-- PROCEDIMENTO -->
  ${secHead('PROCEDIMENTO')}
  <p style="font-size:11pt;margin:8px 0;">Foram realizadas consultas para entrevista de anamnese e aplicação dos seguintes instrumentos neuropsicológicos:</p>
  <ul style="margin:8px 0 12px 24px;font-size:11pt;">${procedimentoItems}</ul>

  <!-- TABELAS DE RESULTADOS -->
  ${escalasSection}
  ${testesSection}

  <!-- Análise elaborada pelo supervisor -->
  <p style="font-size:9pt;color:#555;font-style:italic;text-align:right;margin:20px 0 4px;">
    Análise elaborada pelo supervisor: ${SUPERVISOR.name} — ${SUPERVISOR.crp}
  </p>
  <div style="font-size:11pt;line-height:1.8;color:#1a1a2e;">
    ${aiBody}
  </div>

  <!-- DATA + NOTA LEGAL -->
  <p style="font-size:11pt;color:#555;text-align:right;margin-top:36px;">
    São Paulo, ${dataFormatada}.
  </p>

  <p style="font-size:9pt;margin-top:16px;text-align:justify;line-height:1.5;">
    <strong>P.S.:</strong> Os resultados deste exame baseiam-se em informações obtidas na anamnese, observação clínica e aplicação de instrumentos aprovados para uso em população brasileira, de acordo com o Conselho Federal de Psicologia e a Resolução CFP nº 31/2022. O exame neuropsicológico é um exame complementar e deve ser interpretado em conjunto com outros dados clínicos. Este documento não tem validade para fins judiciais.
  </p>

  <!-- ASSINATURAS E CARIMBOS -->
  <div style="margin-top:50px;padding-top:16px;border-top:2px solid ${H};">
    <div style="display:flex;justify-content:space-around;align-items:flex-end;flex-wrap:wrap;gap:32px;margin-top:56px;">

      <!-- Profissional aplicador -->
      <div style="text-align:center;min-width:240px;">
        <div style="border-top:2px solid #1a1a2e;padding-top:10px;margin-top:8px;">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e;">${professional}</div>
          <div style="font-size:11px;color:#555;margin-top:2px;">Neuropsicólogo(a)</div>
          <div style="font-size:11px;color:#555;">${user?.crp || 'CRP: ___________'}</div>
          <div style="font-size:10px;color:#777;margin-top:2px;">Técnico Profissional — CNES: _______</div>
        </div>
      </div>

      <!-- Supervisor / Diretor + Carimbo da clínica -->
      <div style="text-align:center;min-width:240px;">
        <div style="border-top:2px solid ${H};padding-top:10px;margin-top:8px;">
          <div style="font-size:14px;font-weight:800;color:${H};">${SUPERVISOR.name}</div>
          <div style="font-size:11px;color:#555;margin-top:2px;">${SUPERVISOR.crp}</div>
          <div style="font-size:11px;color:#555;">Neuropsicólogo · Supervisor Técnico</div>
          <div style="font-size:10px;color:#777;margin-top:1px;">Diretor Clínico — Neuroavaliação</div>
        </div>
        <!-- Carimbo institucional -->
        <div style="border:1.5px solid ${H};border-radius:4px;padding:8px 16px;margin-top:14px;display:inline-block;text-align:center;min-width:200px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <div style="font-size:11px;font-weight:800;color:${H};letter-spacing:0.04em;">NEUROAVALIAÇÃO ME</div>
          <div style="font-size:9px;color:#555;margin-top:3px;">CRPJ 06/6481 &nbsp;|&nbsp; CNES 49795</div>
          <div style="font-size:9px;color:#555;">CNPJ 29.313.355/0001-12</div>
        </div>
      </div>

    </div>
  </div>

  <!-- REFERÊNCIAS -->
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #c8dfc8;">
    ${secHead('REFERÊNCIAS BIBLIOGRÁFICAS')}
    <ol style="font-size:9pt;color:#444;padding-left:22px;line-height:1.6;">
      <li style="margin-bottom:4px;">FONSECA, R. P. et al. <em>NEUPSILIN — Instrumento de Avaliação Neuropsicológica Breve</em>. São Paulo: Vetor Editora, 2009.</li>
      <li style="margin-bottom:4px;">BERTOLA, L.; DINIZ LEANDRO. <em>BAMS — Bateria de Avaliação da Memória Semântica</em>. São Paulo: Vetor, 2019.</li>
      <li style="margin-bottom:4px;">REY, A. <em>RAVLT — Teste de Aprendizagem Auditivo-Verbal de Rey</em>. São Paulo: Vetor Editora, 2018.</li>
      <li style="margin-bottom:4px;">HEATON, R. K. et al. <em>WCST — Teste Wisconsin de Classificação de Cartas</em>. São Paulo: Casa do Psicólogo, 2004.</li>
      <li style="margin-bottom:4px;">DUBOIS, B. et al. The FAB: A Frontal Assessment Battery at bedside. <em>Neurology</em>, 55(11), 2000.</li>
      <li style="margin-bottom:4px;">American Psychiatric Association. <em>DSM-5 — Manual Diagnóstico e Estatístico de Transtornos Mentais</em>. 5ª ed. Porto Alegre: Artmed, 2014.</li>
      <li style="margin-bottom:4px;">Organização Mundial da Saúde. <em>CID-10 — Classificação Internacional de Doenças</em>. 10ª revisão.</li>
    </ol>
  </div>

  <!-- RODAPÉ -->
  <div style="margin-top:28px;padding-top:12px;border-top:1px solid #c8dfc8;text-align:center;font-size:9px;color:#888;line-height:1.6;">
    <div style="font-weight:700;color:#2E7D32;font-size:10px;margin-bottom:2px;">NEUROAVALIAÇÃO — Neuropsicologia na Prática</div>
    <div>São Paulo · SP · neuroavaliacao.com.br</div>
    <div style="margin-top:4px;font-style:italic;">
      Documento gerado em ${dataFormatada} · Uso exclusivo para fins diagnósticos.
    </div>
  </div>

</div>`
}

function ReportBody({ html, editMode, reportRef }) {
  useEffect(() => {
    if (reportRef.current) reportRef.current.innerHTML = html
  }, [html])

  return (
    <div
      ref={reportRef}
      contentEditable={editMode}
      suppressContentEditableWarning
      style={{
        background: '#fff', borderRadius: 6, padding: '32px 28px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
        outline: editMode ? '2px solid rgba(96,165,250,0.5)' : 'none',
        cursor: editMode ? 'text' : 'default',
        minHeight: 200,
      }}
    />
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Reports() {
  const { user } = useAuth()
  const [patients,       setPatients]       = useState([])
  const [patientId,      setPatientId]      = useState('')
  const [selectedTests,  setSelectedTests]  = useState([])
  const [appliedBy,      setAppliedBy]      = useState('')
  const [report,         setReport]         = useState('')
  const [loading,        setLoading]        = useState(false)
  const [step,           setStep]           = useState(0)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')
  const [savedReportId,  setSavedReportId]  = useState(null)
  const [reportStatus,   setReportStatus]   = useState('rascunho')
  const [approvalInfo,   setApprovalInfo]   = useState(null)
  const [showApproval,   setShowApproval]   = useState(false)
  const [approvalLoading,setApprovalLoading]= useState(false)
  const [approvalErr,    setApprovalErr]    = useState('')
  const [editMode,       setEditMode]       = useState(false)
  const reportRef = useRef(null)

  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor'

  const session = useTestSession(patientId)

  useEffect(() => {
    if (!user) return
    const isAdmin = user.role === 'admin' || user.role === 'supervisor'
    const base = collection(db, 'patients')
    const q = isAdmin
      ? query(base, orderBy('createdAt', 'desc'))
      : query(base, where('createdBy', '==', user.id), orderBy('createdAt', 'desc'))
    getDocs(q)
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {
        const qFallback = isAdmin ? base : query(base, where('createdBy', '==', user.id))
        getDocs(qFallback).then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      })
  }, [user])

  useEffect(() => {
    if (patientId) session.loadSession()
  }, [patientId])

  const toggleTest = (key) =>
    setSelectedTests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const patient = patients.find(p => p.id === patientId)

  const generate = async () => {
    if (!patientId)               return setError('Selecione um paciente.')
    if (selectedTests.length === 0) return setError('Selecione ao menos um teste.')
    setError('')
    setLoading(true)
    setSaved(false)
    setReport('')

    try {
      for (let i = 0; i < STEPS.length; i++) {
        setStep(i)
        await new Promise(r => setTimeout(r, 500))
      }

      const fnUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-neuroclin-f55a5.cloudfunctions.net'
      const token = await auth.currentUser?.getIdToken()

      const ad  = session.session?.anamnesis || {}
      const td  = session.session?.tests     || {}
      const s   = v => v || 'N/D'
      const arr = v => Array.isArray(v) ? v.join(', ') : (v || 'N/D')
      const lbl = z => {
        if (z == null) return 'N/A'
        const n = parseFloat(z)
        return n >= -1.0 ? 'PRESERVADO' : n >= -1.5 ? 'LIMÍTROFE' : 'COMPROMETIDO'
      }

      const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      const professional  = appliedBy || user?.full_name || 'Profissional responsável'
      const age = patient?.birth_date
        ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      // Dados resumidos para o prompt (a IA NÃO re-descreve — apenas interpreta)
      const anamSummary = Object.keys(ad).length ? `
Objetivo: ${s(ad.objetivo_avaliacao || ad.motivo_encaminhamento)}
Queixas: ${s(ad.queixas || ad.queixas_cognitivas_emocionais)}
Início dos sintomas: ${s(ad.inicio_sintomas_data)} | Desenvolvimento: ${s(ad.desenvolvimento_sintomas)}
Medicamentos: ${s(ad.medicamentos)} | Doenças: ${arr(ad.doencas_preexistentes)}
Sono: ${s(ad.sono)} | Apetite: ${s(ad.apetite)}
` : 'Sem dados de anamnese.'

      const resultsSummary = `
WASI/WASI-III: ${td?.WASI ? `QI=${td.WASI.qit_2 ?? td.WASI.qit ?? '-'}, Percentil=${td.WASI.qit_percentile ?? '-'}, Classif.=${td.WASI.classification ?? '-'}` : (td?.['WASI-III'] ? `QI=${td['WASI-III'].qit_2 ?? '-'}, Percentil=${td['WASI-III'].qit_percentile ?? '-'}` : 'Não aplicado')}

NEUPSILIN (z-scores):
  Orientação: ${lbl(td?.NEUPSILIN?.zScores?.orientation)} | Atenção: ${lbl(td?.NEUPSILIN?.zScores?.attention)}
  Percepção: ${lbl(td?.NEUPSILIN?.zScores?.perception)} | Memória: ${lbl(td?.NEUPSILIN?.zScores?.memory)}
  Aritmética: ${lbl(td?.NEUPSILIN?.zScores?.arithmetic)} | Linguagem: ${lbl(td?.NEUPSILIN?.zScores?.language)}
  Praxia: ${lbl(td?.NEUPSILIN?.zScores?.praxis)} | Funções Executivas: ${lbl(td?.NEUPSILIN?.zScores?.executive)}

BAMS: ${td?.BAMS ? `Global=${td.BAMS.global_score}, Percentil=${td.BAMS.percentile}, Classif.=${td.BAMS.interpretation}` : 'Não aplicado'}
RAVLT: ${td?.RAVLT ? `A1=${td.RAVLT.a1 ?? '-'}, A2=${td.RAVLT.a2 ?? '-'}, A3=${td.RAVLT.a3 ?? '-'}, A4=${td.RAVLT.a4 ?? '-'}, A5=${td.RAVLT.a5 ?? '-'}, A6=${td.RAVLT.a6 ?? '-'}, A7=${td.RAVLT.a7 ?? '-'}, Recog.=${td.RAVLT.recognition ?? '-'}` : 'Não aplicado'}
WCST-N: ${td?.['WCST-N'] ? `Categorias=${td['WCST-N'].categories_completed}, Erros Persev.=${td['WCST-N'].perseverative_errors}` : 'Não aplicado'}
FAB: ${td?.FAB ? `Escore=${td.FAB.total_score}, Classif.=${td.FAB.classification}` : 'Não aplicado'}
MoCA: ${td?.MoCA ? `${td.MoCA.total_score}/30 — ${td.MoCA.classification}` : 'Não aplicado'}
GDS-15: ${td?.['GDS-15'] ? `${td['GDS-15'].total_score} pts — ${td['GDS-15'].classification}` : 'Não aplicado'}
GAI: ${td?.GAI ? `${td.GAI.total_score} pts — ${td.GAI.classification}` : 'Não aplicado'}
BDI-II: ${td?.['BDI-II'] ? `${td['BDI-II'].total_score} pts — ${td['BDI-II'].classification}` : 'Não aplicado'}
HAD: ${td?.HAD ? `Ansiedade=${td.HAD.anxiety_score}(${td.HAD.anxiety_classification}), Depressão=${td.HAD.depression_score}(${td.HAD.depression_classification})` : 'Não aplicado'}
IQCODE: ${td?.IQCODE ? `${td.IQCODE.total_score} — ${td.IQCODE.classification}` : 'Não aplicado'}
B-ADL: ${td?.['B-ADL'] ? `${td['B-ADL'].total_score} — ${td['B-ADL'].classification}` : 'Não aplicado'}
Pfeffer: ${td?.Pfeffer ? `${td.Pfeffer.total_score} — ${td.Pfeffer.classification}` : 'Não aplicado'}
Lawton: ${td?.Lawton ? `${td.Lawton.total_score} — ${td.Lawton.classification}` : 'Não aplicado'}
`

      const initials = patient?.full_name
        ? patient.full_name.split(' ').filter(Boolean).map(w => w[0].toUpperCase() + '.').join('')
        : 'N.P.'

      const prompt = `Você é um neuropsicólogo clínico especialista em laudos neuropsicológicos. As tabelas de identificação do paciente e de resultados dos testes já foram incluídas no laudo pelo sistema — NÃO as repita.

Sua tarefa é elaborar APENAS as seguintes três seções interpretativas, em português brasileiro técnico e empático, formatadas em HTML.

DADOS DO CASO:
Paciente (iniciais): ${initials} | ${age != null ? age + ' anos' : 'N/D'} | ${patient?.sex || 'N/D'}
Escolaridade: ${patient?.education || ad?.escolaridade || 'N/D'}
Testes aplicados: ${selectedTests.join(', ')}
Aplicado por: ${professional} | Supervisão: ${SUPERVISOR.name} — ${SUPERVISOR.crp}

ANAMNESE:
${anamSummary}

RESULTADOS DOS TESTES (use para interpretar, NÃO para repetir):
${resultsSummary}

Gere EXATAMENTE estas três seções em HTML:

<div style="margin-bottom:20px;">
<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">ANÁLISE NEUROPSICOLÓGICA</div>
[análise técnica detalhada de cada domínio avaliado, correlacionando resultados com as queixas e histórico clínico. Mencione especificamente os domínios preservados e alterados. Use as iniciais ${initials} ao referenciar o paciente. Seja clínico e individualizado.]
</div>

<div style="margin-bottom:20px;">
<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">CONCLUSÃO</div>
[OBRIGATÓRIO: inicie este parágrafo com "Enfim, os achados neuropsicológicos desta avaliação e da observação clínica do(a) paciente ${initials} indicam..." e então apresente o perfil neuropsicológico integrado e a hipótese diagnóstica fundamentada. Use sempre as iniciais ${initials} e nunca o nome completo.]
</div>

<div style="margin-bottom:20px;">
<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">ENCAMINHAMENTOS</div>
<p style="font-size:11pt;margin:8px 0;">Com base nos resultados, sugere-se:</p>
<ul style="margin:8px 0 12px 24px;font-size:11pt;">
[liste de 5 a 7 encaminhamentos individualizados com base nos achados específicos deste caso]
<li style="margin-bottom:4px;font-style:italic;">Reavaliação neuropsicológica em 12 meses para fins comparativos, a critério do profissional que acompanha o caso.</li>
</ul>
</div>

Regras:
- Parágrafos: <p style="font-size:11pt;margin:8px 0;text-align:justify;line-height:1.8;">
- Listas: <ul style="margin:8px 0 12px 24px;font-size:11pt;"><li style="margin-bottom:4px;">
- NÃO inclua html/body/head/style
- NÃO mencione "inteligência artificial" ou "IA"
- NÃO repita as tabelas de dados já incluídas
- SEMPRE use iniciais ${initials} ao referenciar o paciente, nunca o nome completo
- Tom: técnico, rigoroso, individualizado, empático, seguindo as boas práticas do CFP e critérios DSM-5/CID-10`

      const res = await fetch(`${fnUrl}/anthropicProxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Erro ${res.status}`)
      }

      const data   = await res.json()
      const aiBody = data.content.filter(b => b.type === 'text').map(b => b.text).join('')

      const fullDoc = buildFullDocument({ patient, selectedTests, appliedBy, user, ad, td, aiBody, dataFormatada })
      setReport(fullDoc)
      const reportId = await session.saveReport(fullDoc, selectedTests)
      if (reportId) {
        setSaved(true)
        setSavedReportId(reportId)
        setReportStatus('rascunho')
        setApprovalInfo(null)
      }

    } catch (e) {
      setError('Erro ao gerar laudo: ' + e.message)
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  const getReportContent = () =>
    reportRef.current ? reportRef.current.innerHTML : report

  const print = () => {
    const content = getReportContent()
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8">
  <title>Laudo Neuropsicológico — ${patient?.full_name || ''}</title>
  <style>
    @page { size: A4; margin: 2.5cm 2cm 2.5cm 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt; line-height: 1.7; color: #1a1a2e;
      background: #fff; max-width: 21cm; margin: 0 auto; padding: 20px;
    }
    h2, h3 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
    p  { font-size: 11pt; margin-bottom: 8px; text-align: justify; }
    ul { margin-left: 24px; font-size: 11pt; }
    li { margin-bottom: 4px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head><body>${content}</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }

  const downloadWord = () => {
    const content = getReportContent()
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>
body{font-family:'Times New Roman',serif;font-size:12pt;margin:2.5cm 2cm;line-height:1.7;}
h2{font-size:14pt;margin-top:18pt;margin-bottom:6pt;}
h3{font-size:12pt;margin-top:12pt;}
table{border-collapse:collapse;width:100%;margin-bottom:12pt;}
td,th{border:1px solid #999;padding:5pt;font-size:10pt;}
th{background:#f0f0f0;font-weight:bold;}
p{font-size:11pt;margin-bottom:6pt;text-align:justify;}
ul{margin-left:18pt;}li{margin-bottom:3pt;}
</style></head><body>`
    const blob = new Blob(['﻿', header + content + '</body></html>'], {
      type: 'application/msword',
    })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `laudo-${patient?.full_name?.replace(/\s+/g, '-') || 'paciente'}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const requestApproval = async () => {
    if (!savedReportId) return
    try {
      await updateDoc(doc(db, 'reports', savedReportId), {
        status: 'aguardando_aprovacao',
        updatedAt: serverTimestamp(),
      })
      setReportStatus('aguardando_aprovacao')
    } catch (e) {
      console.error(e)
    }
  }

  const handleApprove = async () => {
    if (!isSupervisor) return
    setApprovalErr('')
    setApprovalLoading(true)
    try {
      const now = new Date()
      const approval = {
        approved: true,
        supervisor_name: user?.full_name || 'Supervisor',
        supervisor_id: user?.id || '',
        approval_date: now.toISOString(),
      }
      if (savedReportId) {
        await updateDoc(doc(db, 'reports', savedReportId), {
          status: 'aprovado',
          supervisor_approval: approval,
          updatedAt: serverTimestamp(),
        })
      }
      setApprovalInfo(approval)
      setReportStatus('aprovado')
      setShowApproval(false)
    } catch (e) {
      setApprovalErr('Erro ao aprovar: ' + e.message)
    } finally {
      setApprovalLoading(false)
    }
  }

  const groups = [...new Set(TESTS_LIST.map(t => t.group))]

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>LAUDOS</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Geração de laudos clínicos neuropsicológicos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 16 }}>

        {/* Painel esquerdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ background: S.cardG, borderRadius: 10, border: '1px solid rgba(46,125,50,0.3)', padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>SUPERVISÃO</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{SUPERVISOR.name}</div>
            <div style={{ fontSize: 11, color: S.greenL, marginTop: 2 }}>{SUPERVISOR.crp}</div>
            <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{SUPERVISOR.clinic}</div>
          </div>

          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>1. PACIENTE</div>
            <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inputStyle}>
              <option value="">— Selecionar paciente —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            {patient && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(46,125,50,0.1)', borderRadius: 6, fontSize: 11, color: S.greenL }}>
                {patient.birth_date && `${new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos`}
                {patient.sex ? ` · ${patient.sex}` : ''}
                {patient.education ? ` · ${patient.education}` : ''}
              </div>
            )}
          </div>

          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>2. TESTES APLICADOS POR</div>
            <input
              value={appliedBy} onChange={e => setAppliedBy(e.target.value)}
              placeholder={user?.full_name || 'Nome do profissional...'}
              style={inputStyle}
            />
          </div>

          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
              3. TESTES APLICADOS ({selectedTests.length})
            </div>
            {groups.map(group => (
              <div key={group} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase' }}>
                  {group}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TESTS_LIST.filter(t => t.group === group).map(t => {
                    const on = selectedTests.includes(t.key)
                    return (
                      <button key={t.key} onClick={() => toggleTest(t.key)} style={{
                        padding: '4px 9px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                        border: on ? `1.5px solid ${S.green}` : `1px solid ${S.border}`,
                        background: on ? 'rgba(46,125,50,0.2)' : 'rgba(255,255,255,0.03)',
                        color: on ? S.greenL : S.muted, fontWeight: on ? 700 : 400,
                      }}>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button onClick={generate} disabled={loading} style={{
            padding: '13px', borderRadius: 10, border: 'none',
            background: loading ? 'rgba(46,125,50,0.4)' : S.green,
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: '0.04em',
          }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {STEPS[step]}</>
              : <><FileText size={16} /> GERAR LAUDO</>}
          </button>
        </div>

        {/* Painel direito — laudo */}
        <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <FileText size={15} color={S.greenL} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>LAUDO NEUROPSICOLÓGICO</span>
              {saved && reportStatus === 'rascunho' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: S.muted, background: 'rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                  RASCUNHO
                </span>
              )}
              {reportStatus === 'aguardando_aprovacao' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)' }}>
                  AGUARDANDO APROVAÇÃO
                </span>
              )}
              {reportStatus === 'aprovado' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: S.greenL, background: 'rgba(46,125,50,0.15)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: `1px solid rgba(46,125,50,0.3)` }}>
                  <CheckCircle2 size={10} /> APROVADO
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Editar na tela */}
              {report && (
                <button onClick={() => setEditMode(m => !m)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: `1px solid ${editMode ? 'rgba(96,165,250,0.5)' : S.border}`, background: editMode ? 'rgba(96,165,250,0.1)' : 'transparent', cursor: 'pointer', color: editMode ? '#60A5FA' : S.muted }}>
                  <Pencil size={12} /> {editMode ? 'EDITANDO' : 'EDITAR'}
                </button>
              )}
              {/* Download Word */}
              {report && (
                <button onClick={downloadWord} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.08)', cursor: 'pointer', color: '#60A5FA' }}>
                  <FileDown size={13} /> WORD
                </button>
              )}
              {/* Solicitar aprovação — profissional, laudo salvo e em rascunho */}
              {report && saved && !isSupervisor && reportStatus === 'rascunho' && (
                <button onClick={requestApproval} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', cursor: 'pointer', color: '#F59E0B' }}>
                  <Send size={12} /> SOLICITAR APROVAÇÃO
                </button>
              )}
              {/* Aprovar — supervisor, laudo aguardando ou em rascunho */}
              {report && isSupervisor && reportStatus !== 'aprovado' && (
                <button onClick={() => { setApprovalErr(''); setShowApproval(true) }} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(46,125,50,0.4)', background: 'rgba(46,125,50,0.1)', cursor: 'pointer', color: S.greenL }}>
                  <ShieldCheck size={13} /> APROVAR LAUDO
                </button>
              )}
              {/* Imprimir — apenas supervisor em laudo aprovado */}
              {report && isSupervisor && reportStatus === 'aprovado' && (
                <button onClick={print} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: `1px solid ${S.border}`, background: 'transparent', cursor: 'pointer', color: S.greenL }}>
                  <Download size={13} /> IMPRIMIR / PDF
                </button>
              )}
              {report && !isSupervisor && reportStatus !== 'aprovado' && (
                <span style={{ fontSize: 10, color: S.muted, fontStyle: 'italic' }}>Impressão liberada após aprovação</span>
              )}
            </div>
          </div>

          {/* Info de aprovação */}
          {approvalInfo?.approved && (
            <div style={{ padding: '10px 16px', background: 'rgba(46,125,50,0.08)', borderBottom: `1px solid rgba(46,125,50,0.2)`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ShieldCheck size={13} color={S.greenL} />
              <span style={{ fontSize: 11, color: S.greenL }}>
                Aprovado por <strong>{approvalInfo.supervisor_name}</strong> em{' '}
                {approvalInfo.approval_date ? new Date(approvalInfo.approval_date).toLocaleDateString('pt-BR') : '—'}
              </span>
            </div>
          )}

          <div style={{ flex: 1, padding: 20, overflowY: 'auto', maxHeight: '70vh' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 size={32} color={S.greenL} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 13, color: S.greenL, fontWeight: 700 }}>{STEPS[step]}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                  {STEPS.map((_, i) => (
                    <div key={i} style={{ width: i <= step ? 24 : 8, height: 4, borderRadius: 2, background: i <= step ? S.green : S.border, transition: 'all 0.3s' }} />
                  ))}
                </div>
              </div>
            )}

            {!loading && !report && (
              <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
                <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>O laudo aparecerá aqui</p>
                <p style={{ fontSize: 11, marginTop: 6 }}>Preencha os campos ao lado e clique em Gerar Laudo</p>
              </div>
            )}

            {!loading && report && (
              <ReportBody html={report} editMode={editMode} reportRef={reportRef} />
            )}
          </div>
        </div>
      </div>

      {/* Modal de aprovação do supervisor */}
      {showApproval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: S.card, borderRadius: 14, border: `1px solid ${S.border}`, width: '100%', maxWidth: 400, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color={S.greenL} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Aprovação de Supervisor</span>
              </div>
              <button onClick={() => { setShowApproval(false); setApprovalErr('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: S.greenL, marginBottom: 18 }}>
              <strong>{user?.full_name || 'Supervisor'}</strong>, ao confirmar você aprova este laudo e libera a impressão. A aprovação será registrada com seu nome e data.
            </div>
            <div style={{ fontSize: 12, color: S.muted, marginBottom: 20, padding: '0 2px' }}>
              Paciente: <span style={{ color: '#fff' }}>{patient?.full_name || '—'}</span>
            </div>
            {approvalErr && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#EF4444', marginBottom: 16 }}>
                {approvalErr}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => { setShowApproval(false); setApprovalErr('') }} style={{ padding: '11px', borderRadius: 9, border: `1px solid ${S.border}`, background: 'transparent', color: S.muted, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleApprove} disabled={approvalLoading} style={{ padding: '11px', borderRadius: 9, border: 'none', background: approvalLoading ? 'rgba(46,125,50,0.5)' : S.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: approvalLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {approvalLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Aprovando...</> : <><ShieldCheck size={14} /> Confirmar Aprovação</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(46,125,50,0.6) !important; }
      `}</style>
    </div>
  )
}
