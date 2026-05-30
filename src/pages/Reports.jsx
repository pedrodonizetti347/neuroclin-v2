import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { collection, getDocs, query, orderBy, where, doc, updateDoc, setDoc, serverTimestamp, limit, getDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { useAuth } from '@/lib/AuthContext'
import { useTestSession } from '@/hooks/useTestSession'
import { FileText, Loader2, CheckCircle2, Download, AlertCircle, ShieldCheck, Send, X, Pencil, LockOpen, Lock } from 'lucide-react'
import TestStatusPanel from '@/components/tests/TestStatusPanel'
import PatientSearchInput from '@/components/PatientSearchInput'
import { logAction } from '@/lib/auditLog'
import { generateTextoConclusao } from '../utils/generateTextoConclusao'

const EDU_MAP = { fundamental_incompleto: 'Fundamental incompleto', fundamental_completo: 'Fundamental completo', medio_incompleto: 'Médio incompleto', medio_completo: 'Médio completo', superior_incompleto: 'Superior incompleto', superior_completo: 'Superior completo' }
const fmtEducation = v => EDU_MAP[v] || v || '—'

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
  'WCST':      'Teste Wisconsin de Classificação de Cartas (WCST)',
  'WCST-N':    'Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)',
  'MEMIMP':    'Questionário de Memória Prospectiva e Retrospectiva (PRMQ)',
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
const COGNITIVE_TESTS = ['NEUPSILIN','TRIACOG','RAVLT','MEMIMP','BAMS','WASI','WASI-III','WCST','WCST-N','DEX','TOKEN']

const TESTS_LIST = [
  { key: 'NEUPSILIN', label: 'Neupsilin',  group: 'Bateria Cognitiva' },
  { key: 'TRIACOG',   label: 'TRIACOG',    group: 'Bateria Cognitiva' },
  { key: 'MoCA',      label: 'MoCA',       group: 'Bateria Cognitiva' },
  { key: 'RAVLT',     label: 'RAVLT',      group: 'Memória' },
  { key: 'MEMIMP',    label: 'MEMIMP',     group: 'Memória' },
  { key: 'BAMS',      label: 'BAMS',       group: 'Memória Semântica' },
  { key: 'WASI',      label: 'WASI',       group: 'Inteligência' },
  { key: 'WASI-III',  label: 'WASI-III',   group: 'Inteligência' },
  { key: 'WCST',      label: 'WCST',       group: 'Funções Executivas' },
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
  'Gerando análise com IA (modelo validado)...',
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
const H  = '#4472C4'  // azul cabeçalho (novo template Neuroavaliação)
const HH = '#4472C4'  // azul tabela header
const HR = '#EEF3F8'  // azul claro linha alternada

const thCell  = (txt, extra='') => `<th style="border:1px solid #9DB8D9;padding:7px 10px;background:${HH};color:#fff;text-align:left;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;${extra}">${txt}</th>`
const tdCell  = (txt, extra='') => `<td style="border:1px solid #C5D9EF;padding:6px 10px;${extra}">${txt ?? '—'}</td>`
const secHead = (title) => `<div style="background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${title}</div>`
const tableWrap = (rows, head='') => `<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:11pt;">${head}<tbody>${rows}</tbody></table>`

const classZ = (z) => {
  if (z == null) return { label: '—', color: '#555' }
  const n = parseFloat(z)
  if (n >= -1.0)  return { label: 'PRESERVADO',   color: '#1F3864' }
  if (n >= -1.5)  return { label: 'LIMÍTROFE',     color: '#E8821A' }
  return              { label: 'COMPROMETIDO',  color: '#C00000' }
}
// Cor para classificações textuais de escalas (GDS, GAI, IQCODE, BDI, HAD, etc.)
const negClsColor = (text) => {
  if (!text) return '#374151'
  const v = String(text).toUpperCase()
  // Vermelho — comprometido/grave
  if (v.includes('GRAVE') || v.includes('SIGNIFICATIVO') || v.includes('SUGESTIVO') ||
      v.includes('PROVÁVEL') || v.includes('DEFICIT') || v.includes('DÉFICIT') ||
      v.includes('MUITO INFERIOR') || v.includes('DEFICITAR'))
    return '#C00000'
  // Azul — preservado/sem alteração
  if (v.startsWith('SEM ') || v.includes('NORMAL') || v.includes('PRESERVADO') ||
      v.includes('AUSÊNCIA') || v.includes('MÍNIMO'))
    return '#1F3864'
  // Laranja — leve/moderado/limítrofe
  if (v.includes('LEVE') || v.includes('MODERADO') || v.includes('MODERADA') ||
      v.includes('LIMÍTROFE') || v.includes('INDETERMINADO') || v.includes('MÉDIO'))
    return '#E8821A'
  // Vermelho — comprometimento restante (ex: "Comprometimento nas AVDs")
  if (v.includes('COMPROM'))
    return '#C00000'
  return '#374151'
}

// Remove markdown code fences that Claude sometimes wraps around HTML output
const stripMdFences = (text) => {
  if (!text) return text
  const m = text.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/i)
  if (m) return m[1].trim()
  return text.replace(/```html\s*/gi, '').replace(/```/g, '').trim()
}

// Deep merge at test-key level: individual fields from base are preserved when override lacks them
const mergeTests = (base, override) => {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    if (result[key] && typeof result[key] === 'object' && typeof override[key] === 'object') {
      result[key] = { ...result[key], ...override[key] }
    } else {
      result[key] = override[key]
    }
  }
  return result
}

const fmtDate = (d) => {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}

// ── Tabela ESCALAS ────────────────────────────────────────────────────────────
function buildEscalasSection(td) {
  const rows = []

  const addRow = (label, score, classif, alt = false) => {
    const bg  = alt ? HR : '#fff'
    const clr = negClsColor(classif)
    rows.push(`<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(label)}
      ${tdCell(score ?? '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(classif ? `<span style="color:${clr};font-weight:bold;">${classif}</span>` : '—', 'text-align:center;')}
    </tr>`)
  }

  // Ordem: GDS → GAI → IQCODE → B-ADL → Pfeffer → demais
  let i = 0
  if (td?.['GDS-15']?.total_score != null)
    addRow('Escala de Depressão Geriátrica (GDS-15)', td['GDS-15'].total_score, td['GDS-15'].classification, i++ % 2 === 1)
  if (td?.GAI?.total_score != null)
    addRow('Inventário de Ansiedade Geriátrica (GAI)', td.GAI.total_score, td.GAI.classification, i++ % 2 === 1)
  if (td?.IQCODE?.mean_score != null || td?.IQCODE?.total_score != null) {
    const iqMean = td.IQCODE.mean_score ?? Math.round((td.IQCODE.total_score / 26) * 100) / 100
    const iqClassif = iqMean <= 3.38 ? 'Sem declínio cognitivo'
      : iqMean <= 3.60 ? 'Declínio leve'
      : iqMean <= 3.84 ? 'Declínio moderado'
      : 'Declínio grave'
    addRow('IQCODE', iqMean, iqClassif, i++ % 2 === 1)
  }
  if (td?.['B-ADL']?.total_score != null) {
    const badlClassif = Number(td['B-ADL'].total_score) < 3.5 ? 'Preservado' : 'Comprometido'
    addRow('Escala Bayer (B-ADL)', td['B-ADL'].total_score, badlClassif, i++ % 2 === 1)
  }
  if (td?.Pfeffer?.total_score != null)
    addRow('Questionário de Pfeffer', td.Pfeffer.total_score, td.Pfeffer.classification, i++ % 2 === 1)
  if (td?.['BDI-II']?.total_score != null)
    addRow('Inventário de Depressão de Beck II (BDI-II)', td['BDI-II'].total_score, td['BDI-II'].classification, i++ % 2 === 1)
  if (td?.HAD?.anxiety_score != null) {
    addRow('HAD — Ansiedade', td.HAD.anxiety_score, td.HAD.anxiety_classification, i++ % 2 === 1)
    addRow('HAD — Depressão', td.HAD.depression_score, td.HAD.depression_classification, i++ % 2 === 1)
  }
  if (td?.Lawton?.total_score != null)
    addRow('Escala de Lawton', td.Lawton.total_score, td.Lawton.classification, i++ % 2 === 1)
  if (td?.BADL?.total_score != null)
    addRow('BADL (Índice de Katz)', td.BADL.total_score, td.BADL.classification, i++ % 2 === 1)
  if (td?.FAB?.total_score != null)
    addRow('Bateria de Avaliação Frontal (FAB)', td.FAB.total_score, td.FAB.classification, i++ % 2 === 1)
  if (td?.MoCA?.total_score != null)
    addRow('MoCA (Avaliação Cognitiva Montreal)', td.MoCA.total_score, td.MoCA.classification, i++ % 2 === 1)
  if (td?.['IDATE-E']?.total_score != null)
    addRow('IDATE — Estado', td['IDATE-E'].total_score, td['IDATE-E'].classification, i++ % 2 === 1)
  if (td?.['IDATE-T']?.total_score != null)
    addRow('IDATE — Traço', td['IDATE-T'].total_score, td['IDATE-T'].classification, i++ % 2 === 1)

  if (rows.length === 0) return ''

  const head = `<thead><tr>
    ${thCell('Escalas')}
    ${thCell('Pontos', 'text-align:center;')}
    ${thCell('Classificação', 'text-align:center;')}
  </tr></thead>`

  // Retorna apenas a tabela — secHead é adicionado em buildFullDocument
  return tableWrap(rows.join(''), head)
}

// Converte número de vocábulos (fluência verbal NEUPSILIN) para pontuação (1–11)
function fluencyWordsToScore(w) {
  if (w == null || w === '') return null
  const v = Number(w)
  if (isNaN(v) || v < 0) return null
  return Math.min(11, Math.floor(v / 3) + 1)
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
  const orientTotal = (Number(d.orientation_time_total)||0) + (Number(d.orientation_space_total)||0)
  const attTotal    = (Number(d.attention_reverse_count)||0) + (Number(d.attention_digit_sequence)||0)
  const percTotal   = (Number(d.perception_line_equality)||0) + (Number(d.perception_visual_hemineglect)||0) + (Number(d.perception_face_perception)||0) + (Number(d.perception_face_recognition)||0)
  const episTotal   = (Number(d.memory_episodic_immediate)||0) + (Number(d.memory_episodic_delayed)||0) + (Number(d.memory_episodic_recognition)||0)
  const memTotal    = (Number(d.memory_working)||0) + (Number(d.memory_span_auditory)||0) + episTotal + (Number(d.memory_semantic_long)||0) + (Number(d.memory_visual_short)||0) + (Number(d.memory_prospective)||0)
  const langOral    = (Number(d.lang_nomeacao)||0) + (Number(d.lang_repeticao)||0) + (Number(d.lang_automatica)||0) + (Number(d.lang_compreensao_oral)||0) + (Number(d.lang_inferencias)||0)
  const langEsc     = (Number(d.lang_leitura)||0) + (Number(d.lang_compreensao_escrita)||0) + (Number(d.lang_escrita_espontanea)||0) + (Number(d.lang_escrita_copiada)||0) + (Number(d.lang_ditada)||0)
  const langTotal   = langOral + langEsc
  const praxTotal   = (Number(d.praxis_ideomotor)||0) + (Number(d.praxis_constructive)||0) + (Number(d.praxis_reflexive)||0)
  const execTotal   = (Number(d.executive_problem_solving)||0) + (fluencyWordsToScore(d.executive_verbal_fluency) || 0)

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
    subRow('Orientação Temporal', d.orientation_time_total, 'orientation_time', ri++),
    subRow('Orientação Espacial', d.orientation_space_total, 'orientation_space', ri++),

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
// Classificação por percentil (derivada do z-score armazenado)
const clsRAVLTFromPct = (pct) => {
  if (pct == null) return null
  if (pct >= 90) return { label: 'Superior',        color: '#15803d' }
  if (pct >= 75) return { label: 'Acima da Média',  color: '#059669' }
  if (pct >= 25) return { label: 'Média',           color: '#1d4ed8' }
  if (pct >= 10) return { label: 'Média Inferior',  color: '#d97706' }
  if (pct >=  5) return { label: 'Limítrofe',       color: '#C00000' }
  return              { label: 'Déficit',           color: '#dc2626' }
}
// Classificação por escore bruto (usada quando não há z-score individual)
const clsRAVLT = (s) => {
  if (s == null || s === '') return { label: '—', color: '#6b7280' }
  const v = Number(s)
  if (v >= 13) return { label: 'Superior',        color: '#15803d' }
  if (v >= 11) return { label: 'Acima da Média',  color: '#059669' }
  if (v >= 8)  return { label: 'Média',           color: '#1d4ed8' }
  if (v >= 5)  return { label: 'Abaixo da Média', color: '#d97706' }
  return             { label: 'Déficit',          color: '#dc2626' }
}
const clsRAVLT_rec = (v) => {
  if (v == null) return { label: '—', color: '#6b7280' }
  if (v >= 13) return { label: 'Superior',        color: '#15803d' }
  if (v >= 10) return { label: 'Média',           color: '#1d4ed8' }
  if (v >= 7)  return { label: 'Abaixo da Média', color: '#d97706' }
  return             { label: 'Déficit',          color: '#dc2626' }
}

const RAVLT_NORMAS_RPT = {
  idade_6_8:    { media:{a1:4.5,  a2:6.0,  a3:7.0,  a4:7.9,  a5:8.4,  b1:4.3,  a6:7.2,  a7:7.6,  reconhecimento:10.3, escoreTotal:33.7,  ALT:11.2 }, dp:{a1:1.9, a2:2.1, a3:2.5, a4:2.8, a5:2.8, b1:1.6, a6:2.7, a7:2.7, reconhecimento:6.9,  escoreTotal:9.9,  ALT:8.2 } },
  idade_9_11:   { media:{a1:5.4,  a2:7.1,  a3:8.2,  a4:9.2,  a5:10.0, b1:5.0,  a6:8.7,  a7:8.7,  reconhecimento:11.7, escoreTotal:39.9,  ALT:12.8 }, dp:{a1:1.8, a2:2.2, a3:2.8, a4:2.8, a5:2.7, b1:1.5, a6:2.7, a7:2.7, reconhecimento:5.5,  escoreTotal:10.1, ALT:8.1 } },
  idade_12_14:  { media:{a1:6.3,  a2:8.1,  a3:9.5,  a4:10.0, a5:10.9, b1:5.6,  a6:9.6,  a7:9.6,  reconhecimento:12.5, escoreTotal:44.8,  ALT:13.3 }, dp:{a1:1.7, a2:2.6, a3:2.9, a4:2.7, a5:2.5, b1:1.7, a6:2.2, a7:3.0, reconhecimento:5.0,  escoreTotal:9.6,  ALT:7.8 } },
  idade_15_17:  { media:{a1:6.1,  a2:8.1,  a3:9.6,  a4:11.1, a5:11.6, b1:5.4,  a6:10.6, a7:10.5, reconhecimento:12.6, escoreTotal:46.4,  ALT:16.1 }, dp:{a1:1.4, a2:2.2, a3:2.4, a4:2.4, a5:2.3, b1:1.7, a6:2.5, a7:2.9, reconhecimento:3.1,  escoreTotal:8.6,  ALT:7.3 } },
  idade_18_20:  { media:{a1:6.8,  a2:9.5,  a3:11.0, a4:11.8, a5:12.2, b1:6.3,  a6:11.1, a7:11.0, reconhecimento:10.0, escoreTotal:51.4,  ALT:17.3 }, dp:{a1:1.7, a2:2.2, a3:2.2, a4:2.4, a5:2.4, b1:1.8, a6:2.5, a7:2.7, reconhecimento:5.7,  escoreTotal:8.7,  ALT:7.3 } },
  idade_21_30:  { media:{a1:6.5,  a2:8.9,  a3:10.4, a4:11.4, a5:12.2, b1:5.7,  a6:10.9, a7:10.7, reconhecimento:11.4, escoreTotal:49.3,  ALT:16.8 }, dp:{a1:1.7, a2:2.2, a3:2.4, a4:2.4, a5:2.2, b1:1.8, a6:2.6, a7:2.7, reconhecimento:4.7,  escoreTotal:8.6,  ALT:6.5 } },
  idade_31_40:  { media:{a1:6.1,  a2:8.7,  a3:10.3, a4:11.4, a5:12.2, b1:5.3,  a6:10.8, a7:10.3, reconhecimento:11.1, escoreTotal:48.6,  ALT:17.9 }, dp:{a1:1.6, a2:2.0, a3:2.1, a4:2.1, a5:2.2, b1:1.6, a6:2.4, a7:2.4, reconhecimento:4.7,  escoreTotal:8.0,  ALT:7.0 } },
  idade_41_50:  { media:{a1:6.0,  a2:8.5,  a3:9.8,  a4:10.7, a5:11.7, b1:4.9,  a6:9.8,  a7:9.6,  reconhecimento:9.9,  escoreTotal:46.7,  ALT:16.5 }, dp:{a1:1.6, a2:2.0, a3:2.5, a4:2.7, a5:2.6, b1:1.6, a6:2.8, a7:2.8, reconhecimento:5.6,  escoreTotal:9.6,  ALT:7.3 } },
  idade_51_60:  { media:{a1:6.0,  a2:8.2,  a3:9.6,  a4:10.6, a5:11.3, b1:4.8,  a6:9.4,  a7:9.5,  reconhecimento:10.9, escoreTotal:45.7,  ALT:15.6 }, dp:{a1:1.9, a2:2.3, a3:2.5, a4:2.4, a5:2.3, b1:1.7, a6:3.1, a7:3.2, reconhecimento:5.2,  escoreTotal:9.7,  ALT:7.4 } },
  idade_61_70:  { media:{a1:5.5,  a2:7.8,  a3:9.1,  a4:10.3, a5:11.3, b1:4.7,  a6:9.5,  a7:9.4,  reconhecimento:10.4, escoreTotal:44.0,  ALT:16.4 }, dp:{a1:1.6, a2:1.9, a3:2.0, a4:1.9, a5:2.0, b1:1.4, a6:2.6, a7:2.6, reconhecimento:3.8,  escoreTotal:7.6,  ALT:6.1 } },
  idade_71_79:  { media:{a1:5.09, a2:6.96, a3:7.98, a4:9.19, a5:10.27,b1:4.05, a6:8.29, a7:8.05, reconhecimento:7.72, escoreTotal:39.48, ALT:14.04}, dp:{a1:1.46,a2:1.74,a3:1.99,a4:2.30,a5:2.16,b1:1.75,a6:2.37,a7:2.39,reconhecimento:3.99, escoreTotal:8.23, ALT:5.70} },
  idade_80mais: { media:{a1:4.1,  a2:6.0,  a3:6.9,  a4:7.9,  a5:9.6,  b1:3.2,  a6:7.5,  a7:6.7,  reconhecimento:5.8,  escoreTotal:34.5,  ALT:13.9 }, dp:{a1:1.4, a2:1.5, a3:1.7, a4:1.6, a5:2.1, b1:1.7, a6:2.2, a7:2.0, reconhecimento:5.4,  escoreTotal:6.3,  ALT:5.5 } },
}
function ravltGetFaixaIdRpt(age) {
  const a = Number(age)
  if (a >= 6  && a <= 8)  return 'idade_6_8'
  if (a >= 9  && a <= 11) return 'idade_9_11'
  if (a >= 12 && a <= 14) return 'idade_12_14'
  if (a >= 15 && a <= 17) return 'idade_15_17'
  if (a >= 18 && a <= 20) return 'idade_18_20'
  if (a >= 21 && a <= 30) return 'idade_21_30'
  if (a >= 31 && a <= 40) return 'idade_31_40'
  if (a >= 41 && a <= 50) return 'idade_41_50'
  if (a >= 51 && a <= 60) return 'idade_51_60'
  if (a >= 61 && a <= 70) return 'idade_61_70'
  if (a >= 71 && a <= 79) return 'idade_71_79'
  if (a >= 80) return 'idade_80mais'
  return null
}

function buildRAVLTSection(td) {
  const d = td?.RAVLT
  if (!d) return ''

  const g  = (k) => (d[k] != null && d[k] !== '') ? Number(d[k]) : null
  const zp = (zkey) => { const z = g(zkey); return z != null ? rptBamsZToPct(z) : null }

  // Scores brutos pré-computados
  const a1s = g('a1_score'), a2s = g('a2_score'), a3s = g('a3_score'), a4s = g('a4_score'), a5s = g('a5_score')
  const b1s = g('b1_score'), a6s = g('a6_score'), a7s = g('a7_score')
  const totalScoreVal = g('total_score') ?? (a1s!=null&&a2s!=null&&a3s!=null&&a4s!=null&&a5s!=null ? a1s+a2s+a3s+a4s+a5s : null)
  const altScoreVal   = g('alt_score')   ?? (a1s!=null&&a5s!=null ? a5s-a1s : null)
  const recScoreVal   = g('recognition_score')

  // Norma por faixa etária — percentil calculado em tempo real
  const faixaRpt = d.age ? ravltGetFaixaIdRpt(Number(d.age)) : null
  const normaRpt = faixaRpt ? RAVLT_NORMAS_RPT[faixaRpt] : null
  const pctOf = (score, normKey) => {
    if (!normaRpt || score == null || normaRpt.dp[normKey] <= 0) return null
    return rptBamsZToPct((score - normaRpt.media[normKey]) / normaRpt.dp[normKey])
  }

  const pctA7  = pctOf(a7s, 'a7')                    ?? zp('a7_zscore')
  const pctA6  = pctOf(a6s, 'a6')                    ?? zp('a6_zscore')
  const pctTot = pctOf(totalScoreVal, 'escoreTotal')  ?? zp('total_zscore')
  const pctRec = pctOf(recScoreVal, 'reconhecimento') ?? zp('recognition_zscore')
  const pctALT = pctOf(altScoreVal, 'ALT')            ?? zp('alt_zscore')

  const trialList = [
    { label: 'A1 — Tentativa 1',                          score: a1s, pct: pctOf(a1s, 'a1') },
    { label: 'A2 — Tentativa 2',                          score: a2s, pct: pctOf(a2s, 'a2') },
    { label: 'A3 — Tentativa 3',                          score: a3s, pct: pctOf(a3s, 'a3') },
    { label: 'A4 — Tentativa 4',                          score: a4s, pct: pctOf(a4s, 'a4') },
    { label: 'A5 — Tentativa 5',                          score: a5s, pct: pctOf(a5s, 'a5') },
    { label: 'B1 — Lista Distratora',                     score: b1s, pct: pctOf(b1s, 'b1') },
    { label: 'A6 — Evocação Imediata após Interferência', score: a6s, pct: pctA6 },
    { label: 'A7 — Evocação Tardia',                      score: a7s, pct: pctA7 },
  ]

  const total    = totalScoreVal ?? [a1s, a2s, a3s, a4s, a5s].reduce((s,v) => s + (v ?? 0), 0)
  const hasTotal = trialList.slice(0,5).some(t => t.score != null)

  const trialRows = trialList.map((t, i) => {
    const pctCls = t.pct != null ? clsRAVLTFromPct(t.pct) : null
    const cls    = pctCls ?? clsRAVLT(t.score)
    const bg     = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(t.label)}
      ${tdCell(t.score ?? '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(t.pct != null ? String(t.pct) : '—', 'text-align:center;')}
      ${tdCell(`<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>`, 'text-align:center;')}
    </tr>`
  }).join('')

  const altScore  = altScoreVal
  // Deriva on-the-fly se não foi pré-calculado (ex: A6/A7 preenchidos depois do save)
  const forgSpeed   = g('forgetting_speed')
    ?? (a6s != null && a6s > 0 && a7s != null ? Math.round((a7s/a6s)*100)/100 : null)
  const proactive   = g('proactive_interference')
    ?? (b1s != null && a1s != null && a1s > 0 ? Math.round((b1s/a1s)*100)/100 : null)
  const retroactive = g('retroactive_interference')
    ?? (a6s != null && a5s != null && a5s > 0 ? Math.round((a6s/a5s)*100)/100 : null)

  // Recalcula hits e FP usando nomes das palavras como fonte de verdade
  // (contorna campo 'correta' que pode estar corrompido no Firestore)
  const LISTA_A_REC = new Set(['LUA','CHAPÉU','MESA','BALÃO','CORPO','CESTA','FLOR','BOCA','CHUVA','CIRCO','LÁPIS','SALA','MILHO','PEIXE','MÃE'])
  let recHits  = g('recognition_hits')
  let recFalse = g('recognition_false')
  if (Array.isArray(d.recognition_list) && d.recognition_list.length > 0 && d.recognition_list[0]?.palavra) {
    recHits  = d.recognition_list.filter(w => LISTA_A_REC.has(w.palavra) && w.marcada).length
    recFalse = d.recognition_list.filter(w => !LISTA_A_REC.has(w.palavra) && w.marcada).length
  }
  const recScore = (recHits != null && recFalse != null) ? recHits - recFalse : recScoreVal

  const totalCls = (hasTotal && pctTot != null) ? clsRAVLTFromPct(pctTot) : (hasTotal ? { label: '—', color: '#6b7280' } : { label: '—', color: '#6b7280' })
  const recCls   = pctRec != null ? clsRAVLTFromPct(pctRec) : clsRAVLT_rec(recScore)
  const altCls   = pctALT != null ? clsRAVLTFromPct(pctALT) : (altScore != null ? (altScore >= 7 ? { label: 'Adequada', color: '#15803d' } : { label: 'Abaixo do Esperado', color: '#d97706' }) : null)

  const summaryRows = `
  <tr style="background:#dce8dc;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('<strong>Total A1–A5 (Aprendizagem Total)</strong>')}
    ${tdCell(hasTotal ? total : '—', 'text-align:center;font-weight:bold;')}
    ${tdCell(pctTot != null ? String(pctTot) : '—', 'text-align:center;')}
    ${tdCell(`<span style="color:${totalCls.color};font-weight:bold;">${totalCls.label}</span>`, 'text-align:center;')}
  </tr>
  ${altScore != null ? `<tr style="background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('ALT — Aprendizagem ao Longo das Tentativas (A5−A1)')}
    ${tdCell(altScore >= 0 ? '+'+altScore : altScore, 'text-align:center;font-weight:bold;')}
    ${tdCell(pctALT != null ? String(pctALT) : '—', 'text-align:center;')}
    ${tdCell(altCls ? `<span style="color:${altCls.color};font-weight:bold;">${altCls.label}</span>` : '—', 'text-align:center;')}
  </tr>` : ''}
  <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('Velocidade de Esquecimento (A7/A6) <span style="color:#888;font-size:9pt;">≈1,0 sem esquecimento</span>')}
    ${tdCell(forgSpeed ?? '—', 'text-align:center;font-weight:bold;')}
    ${tdCell('—', 'text-align:center;')}
    ${tdCell(forgSpeed != null ? (forgSpeed >= 0.9 ? '<span style="color:#15803d;font-weight:bold;">Preservada</span>' : forgSpeed >= 0.7 ? '<span style="color:#d97706;font-weight:bold;">Leve Declínio</span>' : '<span style="color:#dc2626;font-weight:bold;">Esquecimento Acelerado</span>') : '—', 'text-align:center;')}
  </tr>
  <tr style="background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('Interferência Retroativa (A6/A5) <span style="color:#888;font-size:9pt;">efeito de B1 sobre A6</span>')}
    ${tdCell(retroactive ?? '—', 'text-align:center;font-weight:bold;')}
    ${tdCell('—', 'text-align:center;')}
    ${tdCell(retroactive != null ? (retroactive >= 0.8 ? '<span style="color:#15803d;font-weight:bold;">Baixa</span>' : retroactive >= 0.6 ? '<span style="color:#d97706;font-weight:bold;">Moderada</span>' : '<span style="color:#dc2626;font-weight:bold;">Alta</span>') : '—', 'text-align:center;')}
  </tr>
  <tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('Interferência Proativa (B1/A1) <span style="color:#888;font-size:9pt;">efeito de A sobre B</span>')}
    ${tdCell(proactive ?? '—', 'text-align:center;font-weight:bold;')}
    ${tdCell('—', 'text-align:center;')}
    ${tdCell('—', 'text-align:center;')}
  </tr>
  <tr style="background:#dce8dc;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell(`<strong>Reconhecimento</strong> <span style="color:#888;font-size:9pt;">${recHits!=null?'hits='+recHits:''} ${recFalse!=null?'FP='+recFalse:''}</span>`)}
    ${tdCell(recScore ?? '—', 'text-align:center;font-weight:bold;')}
    ${tdCell(pctRec != null ? String(pctRec) : '—', 'text-align:center;')}
    ${tdCell(`<span style="color:${recCls.color};font-weight:bold;">${recCls.label}</span>`, 'text-align:center;')}
  </tr>`

  const head = `<thead>
    <tr><th colspan="4" style="border:1px solid #a5c6a5;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Teste de Aprendizagem Auditivo-Verbal de Rey – RAVLT</th></tr>
    <tr>
      ${thCell('Índice / Tentativa')}
      ${thCell('Escore Bruto', 'text-align:center;')}
      ${thCell('Percentil', 'text-align:center;')}
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
// Normas por escolaridade — Manual BAMS, Apêndice 1
const BAMS_NORMAS_EDU_RPT = {
  analfabeto: {
    fv:{media:36.45,dp:12.37}, fv_animais:{media:10.92,dp:4.34}, fv_frutas:{media:8.88,dp:2.75}, fv_utensilios:{media:8.90,dp:4.21}, fv_roupas:{media:7.76,dp:3.22},
    nd:{media:6.37,dp:2.14}, ni:{media:21.10,dp:5.23}, ci:{media:6.51,dp:1.87}, cv:{media:1.92,dp:2.46}, cg:{media:1.29,dp:1.50}, dp:{media:2.24,dp:1.27},
    conceitualizacao:{media:3.53,dp:2.22}, categorizacao:{media:44.88,dp:14.27}, lexico:{media:27.47,dp:6.46}, BAMS:{media:75.88,dp:19.80},
  },
  anos_1_4: {
    fv:{media:45.84,dp:12.09}, fv_animais:{media:12.61,dp:4.36}, fv_frutas:{media:11.16,dp:2.75}, fv_utensilios:{media:11.58,dp:4.08}, fv_roupas:{media:10.50,dp:3.30},
    nd:{media:8.05,dp:1.63}, ni:{media:25.61,dp:2.79}, ci:{media:7.66,dp:1.71}, cv:{media:3.45,dp:2.64}, cg:{media:2.74,dp:1.64}, dp:{media:3.24,dp:1.38},
    conceitualizacao:{media:5.97,dp:2.44}, categorizacao:{media:56.95,dp:12.68}, lexico:{media:33.66,dp:3.70}, BAMS:{media:96.58,dp:16.24},
  },
  anos_5_8: {
    fv:{media:46.15,dp:9.65}, fv_animais:{media:13.44,dp:3.44}, fv_frutas:{media:12.15,dp:3.43}, fv_utensilios:{media:10.18,dp:3.28}, fv_roupas:{media:10.39,dp:2.61},
    nd:{media:8.67,dp:1.18}, ni:{media:26.82,dp:1.99}, ci:{media:8.67,dp:1.11}, cv:{media:5.10,dp:2.53}, cg:{media:5.15,dp:2.46}, dp:{media:4.26,dp:1.87},
    conceitualizacao:{media:9.41,dp:3.48}, categorizacao:{media:59.92,dp:10.90}, lexico:{media:35.49,dp:2.72}, BAMS:{media:104.82,dp:14.55},
  },
  anos_9_11: {
    fv:{media:51.22,dp:6.19}, fv_animais:{media:14.66,dp:4.23}, fv_frutas:{media:12.48,dp:3.61}, fv_utensilios:{media:12.37,dp:4.57}, fv_roupas:{media:11.71,dp:4.21},
    nd:{media:9.16,dp:1.12}, ni:{media:26.99,dp:2.08}, ci:{media:9.18,dp:1.23}, cv:{media:6.19,dp:2.85}, cg:{media:6.53,dp:2.48}, dp:{media:4.53,dp:1.93},
    conceitualizacao:{media:11.07,dp:3.68}, categorizacao:{media:67.00,dp:15.65}, lexico:{media:36.15,dp:2.89}, BAMS:{media:113.81,dp:16.00},
  },
  anos_12mais: {
    fv:{media:56.96,dp:6.98}, fv_animais:{media:17.30,dp:4.57}, fv_frutas:{media:13.84,dp:3.16}, fv_utensilios:{media:13.50,dp:4.10}, fv_roupas:{media:13.69,dp:3.30},
    nd:{media:9.46,dp:0.90}, ni:{media:27.46,dp:1.18}, ci:{media:9.36,dp:1.29}, cv:{media:6.98,dp:2.27}, cg:{media:8.21,dp:1.97}, dp:{media:6.12,dp:1.94},
    conceitualizacao:{media:14.33,dp:3.34}, categorizacao:{media:73.28,dp:13.11}, lexico:{media:36.92,dp:1.77}, BAMS:{media:124.48,dp:15.95},
  },
}
function rptBamsZToPct(z) {
  if (z == null) return null
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const dd = 0.3989423 * Math.exp(-z * z / 2)
  const p = dd * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  const pct = z >= 0 ? Math.round((1 - p) * 100) : Math.round(p * 100)
  return Math.max(1, Math.min(99, pct))
}
function rptBamsGetGrupo(eduGroup, patientEducation) {
  if (eduGroup && BAMS_NORMAS_EDU_RPT[eduGroup]) return eduGroup
  if (!patientEducation) return null
  const v = String(patientEducation).toLowerCase()
  if (v === 'analfabeto') return 'analfabeto'
  if (v.includes('superior') || v.includes('pos') || v.includes('pós')) return 'anos_12mais'
  if (v === 'medio_completo') return 'anos_12mais'
  if (v.includes('medio') || v.includes('médio')) return 'anos_9_11'
  if (v === 'fundamental_completo') return 'anos_9_11'
  if (v.includes('fundamental')) return 'anos_5_8'
  return null
}
function rptBamsCls(pct) {
  if (pct === '' || pct == null) return null
  const v = Number(pct)
  if (v >= 95) return { label: 'Muito Superior', color: '#1565C0' }
  if (v >= 75) return { label: 'Superior',        color: '#2E7D32' }
  if (v >= 25) return { label: 'Médio',           color: '#2E7D32' }
  if (v >= 10) return { label: 'Médio Inferior',  color: '#E8821A' }
  if (v >= 2)  return { label: 'Limítrofe',       color: '#E8821A' }
  return              { label: 'Deficitário',      color: '#C00000' }
}
function buildBAMSSection(td, patient) {
  const d = td?.BAMS
  if (!d) return ''

  // Calcula z-score: usa o salvo se existir; senão calcula das normas + escore bruto
  const grupoKey = rptBamsGetGrupo(d.edu_group, patient?.education)
  const norma = grupoKey ? BAMS_NORMAS_EDU_RPT[grupoKey] : null
  const calcZ = (savedZ, score, normaKey) => {
    if (savedZ != null && savedZ !== '') return Number(savedZ)
    if (!norma || score == null || score === '') return null
    const n = norma[normaKey]
    if (!n) return null
    return n.dp ? (Number(score) - n.media) / n.dp : null
  }
  const zL     = calcZ(d.z_lexico,           d.lexico_score,            'lexico')
  const zC     = calcZ(d.z_categorizacao,    d.categorization_score,    'categorizacao')
  const zK     = calcZ(d.z_conceitualizacao, d.conceptualization_score, 'conceitualizacao')
  const zG     = calcZ(d.z_bams,             d.global_score,            'BAMS')
  const zFV    = calcZ(null, d.fv_total,          'fv')
  const zFVAni = calcZ(null, d.fv_animals_hits,   'fv_animais')
  const zFVFru = calcZ(null, d.fv_fruits_hits,    'fv_frutas')
  const zFVUte = calcZ(null, d.fv_utensils_hits,  'fv_utensilios')
  const zFVRou = calcZ(null, d.fv_clothes_hits,   'fv_roupas')
  const zND    = calcZ(null, d.nd_total,           'nd')
  const zNI    = calcZ(null, d.ni_total,           'ni')
  const zCI    = calcZ(null, d.ci_total,           'ci')
  const zCV    = calcZ(null, d.cv_total,           'cv')
  const zCG    = calcZ(null, d.cg_total,           'cg')
  const zDP    = calcZ(null, d.dp_total,           'dp')

  const rowComp = (label, score, z) => {
    const pct = rptBamsZToPct(z)
    const cls = rptBamsCls(pct)
    const clr = cls?.color ?? '#374151'
    return `<tr style="background:#fff;"><td style="border:1px solid #C5D9EF;padding:6px 10px;font-weight:bold;">${label}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;font-weight:bold;">${score ?? '—'}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;font-weight:bold;color:${clr};">${pct ?? '—'}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;font-weight:bold;color:${clr};">${cls?.label ?? '—'}</td></tr>`
  }
  const rowSub = (label, score, level, z) => {
    const pl = 10 + (level ?? 1) * 14
    const pct = rptBamsZToPct(z)
    const cls = rptBamsCls(pct)
    const clr = cls?.color ?? '#374151'
    const hasPct = pct != null
    return `<tr style="background:${HR};-webkit-print-color-adjust:exact;print-color-adjust:exact;"><td style="border:1px solid #C5D9EF;padding:6px 10px;padding-left:${pl}px;">${label}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;font-weight:bold;">${score ?? '—'}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;${hasPct?'font-weight:bold;color:'+clr+';':''}">${hasPct ? pct : '—'}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;${hasPct?'font-weight:bold;color:'+clr+';':''}">${cls?.label ?? '—'}</td></tr>`
  }

  // Global: usa percentil salvo, ou calcula pelo z-score global
  const gPct = d.percentile != null && d.percentile !== '' ? Number(d.percentile) : rptBamsZToPct(zG)
  const gCls = rptBamsCls(gPct)
  const gLbl = d.interpretation || d.classification || gCls?.label || '—'
  const gClr = gCls?.color ?? '#374151'

  const rows = [
    rowComp('Léxico (ND + NI)',                       d.lexico_score,            zL),
    rowSub('· Nomeação por Definição (ND)',            d.nd_total,       1,       zND),
    rowSub('· Nomeação por Imagens (NI)',              d.ni_total,       1,       zNI),
    rowComp('Categorização (FV + CI + CV)',            d.categorization_score,    zC),
    rowSub('· Fluência Verbal Semântica (FV)',         d.fv_total,       1,       zFV),
    rowSub('· Categorização de Imagens (CI)',          d.ci_total,       1,       zCI),
    rowSub('· Categorização Verbal (CV)',              d.cv_total,       1,       zCV),
    rowComp('Conceitualização (CG + DP)',              d.conceptualization_score, zK),
    rowSub('· Conhecimentos Gerais (CG)',              d.cg_total,       1,       zCG),
    rowSub('· Definição de Palavras (DP)',             d.dp_total,       1,       zDP),
    `<tr style="background:#fff;"><td style="border:1px solid #C5D9EF;padding:6px 10px;font-weight:bold;font-size:11pt;">ESCORE GLOBAL BAMS</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;font-weight:bold;font-size:11pt;">${d.global_score ?? '—'}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;font-weight:bold;color:${gClr};">${gPct ?? '—'}</td><td style="border:1px solid #C5D9EF;padding:6px 10px;text-align:center;font-weight:bold;color:${gClr};">${gLbl}</td></tr>`,
  ].join('')

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
// Normas Zimmermann et al. (2015) — replicado de Tests.jsx para uso no builder de laudo
const WCST_N_NORMAS_RPT = {
  categorias:        { jovens: { baixa:[5,5,5,4,3,2,2],   alta:[6,6,6,6,6,5,4] }, intermediaria:{ baixa:[6,6,5,4,2,2,2],   alta:[6,6,6,6,4,3,2] }, idosos:{ baixa:[6,6,5,3,2,2,2],   alta:[6,6,6,6,6,5,5] } },
  ensaios:           { jovens: { baixa:[39,48,48,48,48,48,48], alta:[36,36,37,42,48,48,48] }, intermediaria:{ baixa:[43,46,48,48,48,48,48], alta:[36,37,37,43,48,48,48] }, idosos:{ baixa:[39,40,48,48,48,48,48], alta:[36,38,40,44,48,48,48] } },
  acertos:           { jovens: { baixa:[38,38,34,32,28,20,19], alta:[43,42,39,36,36,35,26] }, intermediaria:{ baixa:[40,40,37,29,25,20,19], alta:[40,40,37,36,34,30,26] }, idosos:{ baixa:[36,36,34,27,23,20,19], alta:[42,41,39,37,36,34,32] } },
  erros:             { jovens: { baixa:[1,8,14,16,20,28,28],  alta:[0,0,0,4,8,13,22]  }, intermediaria:{ baixa:[6,7,10,19,23,28,28],  alta:[0,1,1,3,14,19,19] }, idosos:{ baixa:[3,4,14,21,25,28,28],  alta:[0,2,4,6,9,14,16] } },
  perseverativos:    { jovens: { baixa:[0,4,8,12,18,20,20],  alta:[0,0,0,3,5,7,9]   }, intermediaria:{ baixa:[5,5,6,14,17,22,22],  alta:[0,0,1,2,11,14,14] }, idosos:{ baixa:[2,3,11,16,17,24,24],  alta:[0,1,2,3,6,8,13] } },
  naoPerseverativos: { jovens: { baixa:[1,2,3,6,7,9,9],   alta:[0,0,2,4,7,14,14] }, intermediaria:{ baixa:[1,1,2,3,7,9,9],   alta:[0,0,0,1,3,7,7] }, idosos:{ baixa:[1,1,2,4,7,9,9],   alta:[0,0,1,2,4,5,6] } },
  rupturas:          { jovens: { baixa:[0,0,0,1,1,2,2],   alta:[0,0,0,0,1,2,3] }, intermediaria:{ baixa:[0,0,0,1,1,2,2],   alta:[0,0,0,0,1,2,2] }, idosos:{ baixa:[0,0,0,1,1,3,3],   alta:[0,0,0,0,1,1,2] } },
}
const WCST_N_PCTS_RPT = [95, 90, 75, 50, 25, 10, 5]
function wcstGetGrupoRpt(age) {
  const a = Number(age)
  if (a <= 39) return 'jovens'
  if (a <= 59) return 'intermediaria'
  return 'idosos'
}
function wcstGetEscRpt(edu) {
  if (!edu) return 'alta'
  return (String(edu).includes('baixa') || String(edu).includes('2-7')) ? 'baixa' : 'alta'
}
function wcstCalcPctRpt(score, normArray, inverse) {
  if (score == null || score === '' || !normArray) return null
  const s = Number(score)
  if (!inverse) {
    for (let i = 0; i < WCST_N_PCTS_RPT.length; i++) { if (s >= normArray[i]) return WCST_N_PCTS_RPT[i] }
    return 1
  } else {
    for (let i = 0; i < WCST_N_PCTS_RPT.length; i++) { if (s <= normArray[i]) return WCST_N_PCTS_RPT[i] }
    return 1
  }
}
function wcstClassFromPctRpt(pct) {
  if (pct == null) return { label: '—', color: '#6b7280' }
  if (pct >= 95) return { label: 'MUITO SUPERIOR', color: '#1F3864' }
  if (pct >= 90) return { label: 'SUPERIOR',        color: '#1F3864' }
  if (pct >= 75) return { label: 'MÉDIA SUPERIOR',  color: '#1F3864' }
  if (pct >  25) return { label: 'MÉDIA',            color: '#1F3864' }
  if (pct >= 10) return { label: 'MÉDIA INFERIOR',  color: '#E8821A' }
  if (pct >=  5) return { label: 'LIMÍTROFE',        color: '#C00000' }
  return               { label: 'INFERIOR',          color: '#C00000' }
}

function buildWCSTSection(td) {
  const dN = td?.['WCST-N']
  const dF = td?.WCST
  let d  = dN || dF
  if (!d) return ''

  // Fallback: se os totais escalares estão ausentes mas o array trials existe, calcula a partir dele
  const trials = Array.isArray(d.trials) ? d.trials : []
  const scalarMissing = d.trials_administered == null || d.trials_administered === ''
  if (trials.length > 0 && scalarMissing) {
    let ta = 0, cc = 0, tc = 0, te = 0, tb = 0, pe = 0
    for (const t of trials) {
      if (!t.response && !t.isCorrect) continue
      ta++
      if (t.isCorrect) { tc++ } else { te++; if (t.isPerseverative) pe++ }
      if (t.isNewCategory) cc++
      if (t.cardType === 'B') tb++
    }
    d = {
      ...d,
      trials_administered:     ta  > 0 ? ta  : d.trials_administered,
      categories_completed:    cc  > 0 ? cc  : d.categories_completed,
      total_correct:           tc  > 0 ? tc  : d.total_correct,
      total_errors:            te  > 0 ? te  : d.total_errors,
      perseverative_errors:    pe  >= 0 ? pe : d.perseverative_errors,
      non_perseverative_errors: te > 0 ? te - pe : d.non_perseverative_errors,
      total_breaks:            tb  >= 0 ? tb : d.total_breaks,
    }
  }

  const isNelson   = !!dN
  const tableLabel = isNelson
    ? 'Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)'
    : 'Teste Wisconsin de Classificação de Cartas (WCST)'

  const ensaiosVal = isNelson ? d.trials_administered : d.total_trials

  // Fallback: calcular total_correct se ausente (ensaios − erros)
  const totalCorrectVal = (d.total_correct != null && d.total_correct !== '')
    ? d.total_correct
    : (ensaiosVal != null && d.total_errors != null)
      ? Math.max(0, Number(ensaiosVal) - Number(d.total_errors))
      : null

  // Percentis via normas Zimmermann et al. (2015) — apenas para WCST-N
  let pctCat = null, pctEns = null, pctAce = null, pctErr = null, pctPe = null, pctNPe = null, pctRupt = null
  if (isNelson) {
    const grupo = wcstGetGrupoRpt(d.age)
    const esc   = wcstGetEscRpt(d.education)
    const NR    = WCST_N_NORMAS_RPT
    pctCat  = wcstCalcPctRpt(d.categories_completed,     NR.categorias[grupo][esc],        false)
    pctEns  = wcstCalcPctRpt(ensaiosVal,                 NR.ensaios[grupo][esc],            true)
    pctAce  = wcstCalcPctRpt(totalCorrectVal,            NR.acertos[grupo][esc],            false)
    pctErr  = wcstCalcPctRpt(d.total_errors,             NR.erros[grupo][esc],              true)
    pctPe   = wcstCalcPctRpt(d.perseverative_errors,     NR.perseverativos[grupo][esc],     true)
    pctNPe  = wcstCalcPctRpt(d.non_perseverative_errors, NR.naoPerseverativos[grupo][esc],  true)
    pctRupt = wcstCalcPctRpt(d.total_breaks,             NR.rupturas[grupo][esc],           true)
  }

  const rows_data = [
    { label: 'Categorias completadas',    val: d.categories_completed,     pct: isNelson ? pctCat  : null, note: '(0–6, maior = melhor)' },
    { label: 'Ensaios administrados',     val: ensaiosVal,                 pct: isNelson ? pctEns  : null, note: isNelson ? '(máx 48)' : '(máx 128)' },
    { label: 'Total de acertos',          val: totalCorrectVal,            pct: isNelson ? pctAce  : null, note: '' },
    { label: 'Total de erros',            val: d.total_errors,             pct: isNelson ? pctErr  : null, note: '' },
    { label: 'Erros perseverativos',      val: d.perseverative_errors,     pct: isNelson ? pctPe   : null, note: '(menor = melhor)' },
    { label: 'Erros não-perseverativos',  val: d.non_perseverative_errors, pct: isNelson ? pctNPe  : null, note: '' },
    ...( isNelson
      ? [{ label: 'Total de rupturas', val: d.total_breaks, pct: pctRupt, note: '(menor = melhor)' }]
      : [
          { label: 'Respostas perseverativas',   val: d.perseverative_responses,    pct: null, note: '(menor = melhor)' },
          { label: 'Respostas nível conceitual', val: d.conceptual_level_responses, pct: null, note: '' },
          { label: 'Falha em manter contexto',   val: d.failure_to_maintain_set,    pct: null, note: '' },
        ]
    ),
  ]

  if (!rows_data.some(r => r.val != null && r.val !== '')) return ''

  const rows = rows_data.map((r, i) => {
    const cls = wcstClassFromPctRpt(r.pct)
    const bg  = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(`${r.label} <span style="color:#888;font-size:9pt;">${r.note}</span>`)}
      ${tdCell(r.val ?? '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(r.pct != null ? `<span style="color:${cls.color};font-weight:bold;">${r.pct}</span>` : '—', 'text-align:center;')}
      ${tdCell(r.pct != null ? `<span style="color:${cls.color};font-weight:bold;">${cls.label}</span>` : '—', 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="4" style="border:1px solid #9DB8D9;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${tableLabel}</th></tr>
    <tr>
      ${thCell('Fator')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Percentil', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela TOKEN ──────────────────────────────────────────────────────────────
function buildTOKENSection(td) {
  const d = td?.TOKEN
  if (!d || (d.total_score == null && !d.classification)) return ''

  const parts = [
    { key: 'part_a', label: 'Parte A — Todas as peças', max: 7 },
    { key: 'part_b', label: 'Parte B — Somente peças grandes', max: 4 },
    { key: 'part_c', label: 'Parte C — Todas, sem repetir instrução', max: 4 },
    { key: 'part_d', label: 'Parte D — Grandes, sem repetir instrução', max: 4 },
    { key: 'part_e', label: 'Parte E — Todas, sem repetir instrução', max: 4 },
    { key: 'part_f', label: 'Parte F — Todas, sem repetir instrução', max: 13 },
  ]

  const rows = parts.map((p, i) => {
    const score = d[`${p.key}_score`]
    if (score == null) return ''
    const bg = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(p.label)}
      ${tdCell(score, 'text-align:center;font-weight:bold;')}
      ${tdCell(p.max, 'text-align:center;color:#888;')}
    </tr>`
  }).filter(Boolean).join('')

  const total = d.total_score ?? 0
  const cls   = d.classification || (total >= 30 ? 'Normal' : total >= 20 ? 'Limítrofe' : 'Comprometido')
  const clsColor = total >= 30 ? '#1b5e20' : total >= 20 ? '#e65100' : '#c62828'

  const summaryRow = `<tr style="background:#dce8dc;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('<strong>TOTAL</strong>')}
    ${tdCell(`<strong>${total}/36</strong>`, 'text-align:center;font-weight:bold;')}
    ${tdCell(`<span style="color:${clsColor};font-weight:bold;">${cls}</span>`, 'text-align:center;')}
  </tr>`

  const head = `<thead>
    <tr><th colspan="3" style="border:1px solid #9DB8D9;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Token Test — Linguagem Receptiva</th></tr>
    <tr>${thCell('Parte')}${thCell('Acertos','text-align:center;')}${thCell('Máx / Classificação','text-align:center;')}</tr>
  </thead>`

  return tableWrap(rows + summaryRow, head)
}

// ── Tabela DEX ────────────────────────────────────────────────────────────────
// Itens 1, 4, 10, 17 são perguntas controle — não aparecem na tabela do laudo
const DEX_DOMAINS = [
  {
    label: 'DOMÍNIO COMPORTAMENTAL',
    items: [
      { idx: 2,  label: 'Impulsividade' },
      { idx: 7,  label: 'Autocrítica' },
      { idx: 9,  label: 'Desinibição' },
      { idx: 12, label: 'Descontrole' },
      { idx: 13, label: 'Autocrítica' },
      { idx: 15, label: 'Inquietação' },
      { idx: 16, label: 'Dissociação' },
      { idx: 20, label: 'Cognição social' },
    ],
  },
  {
    label: 'DOMÍNIO COGNITIVO',
    items: [
      { idx: 3,  label: 'Confabulação' },
      { idx: 6,  label: 'Sequência temporal' },
      { idx: 14, label: 'Inquietude/Perseveração' },
      { idx: 18, label: 'Concentração' },
      { idx: 19, label: 'Tomada de decisão' },
    ],
  },
  {
    label: 'DOMÍNIO EMOÇÕES',
    items: [
      { idx: 5,  label: 'Euforia' },
      { idx: 8,  label: 'Apatia' },
      { idx: 11, label: 'Embotamento' },
    ],
  },
]

function buildDEXSection(td) {
  const d = td?.DEX
  if (!d) return ''
  const patTotal = d.patient_total
  const famTotal = d.family_total
  const hasItems = DEX_DOMAINS.flatMap(dom => dom.items).some(item =>
    d[`patient_q${item.idx}`] != null || d[`family_q${item.idx}`] != null
  )
  if (!hasItems && patTotal == null && famTotal == null) return ''

  const dexItemCls = (v) => {
    if (v == null || v === '') return { label: '—', color: '#555' }
    const n = Number(v)
    if (n <= 1) return { label: 'PRESERVADO',  color: '#1F3864' }
    return             { label: 'COMPROMETIDO', color: '#C00000' }
  }

  const dexTotalCls = (v) => {
    if (v == null) return { label: '—', color: '#555' }
    const n = Number(v)
    if (n <= 20) return { label: 'Normal',    color: '#1F3864' }
    if (n <= 35) return { label: 'Limítrofe', color: '#E8821A' }
    return            { label: 'Alterado',  color: '#C00000' }
  }

  const head = `<thead>
    <tr><th colspan="5" style="border:1px solid #9DB8D9;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Questionário Disexecutivo (DEX) — Funções Executivas</th></tr>
    <tr>
      ${thCell('Itens')}
      ${thCell('Familiar', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
      ${thCell('Paciente', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  let ri = 0
  let allRows = ''

  DEX_DOMAINS.forEach(dom => {
    allRows += `<tr style="-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      <td colspan="5" style="border:1px solid #9DB8D9;padding:6px 10px;background:${HH};color:#fff;font-weight:bold;font-size:10pt;letter-spacing:0.05em;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${dom.label}</td>
    </tr>`

    dom.items.forEach(item => {
      const pV = d[`patient_q${item.idx}`]
      const fV = d[`family_q${item.idx}`]
      if (pV == null && fV == null) return
      const bg   = ri++ % 2 === 0 ? '#fff' : HR
      const pCls = dexItemCls(pV)
      const fCls = dexItemCls(fV)
      allRows += `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${tdCell(item.label)}
        ${tdCell(fV != null && fV !== '' ? fV : '—', 'text-align:center;font-weight:bold;')}
        ${tdCell(fV != null && fV !== '' ? `<span style="color:${fCls.color};font-weight:bold;">${fCls.label}</span>` : '—', 'text-align:center;')}
        ${tdCell(pV != null && pV !== '' ? pV : '—', 'text-align:center;font-weight:bold;')}
        ${tdCell(pV != null && pV !== '' ? `<span style="color:${pCls.color};font-weight:bold;">${pCls.label}</span>` : '—', 'text-align:center;')}
      </tr>`
    })
  })

  const patCls = dexTotalCls(patTotal)
  const famCls = dexTotalCls(famTotal)
  const disc   = (patTotal != null && famTotal != null) ? Number(patTotal) - Number(famTotal) : null

  allRows += `<tr style="background:#e8f5e9;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('<strong>TOTAL (0–64)</strong>', 'font-weight:bold;')}
    ${tdCell(famTotal != null ? `<strong>${famTotal}</strong>` : '—', 'text-align:center;font-weight:bold;')}
    ${tdCell(famTotal != null ? `<span style="color:${famCls.color};font-weight:bold;">${famCls.label}</span>` : '—', 'text-align:center;')}
    ${tdCell(patTotal != null ? `<strong>${patTotal}</strong>` : '—', 'text-align:center;font-weight:bold;')}
    ${tdCell(patTotal != null ? `<span style="color:${patCls.color};font-weight:bold;">${patCls.label}</span>` : '—', 'text-align:center;')}
  </tr>`

  if (disc != null) {
    allRows += `<tr style="background:#f0f4f8;">
      <td colspan="5" style="border:1px solid #C5D9EF;padding:6px 10px;color:#666;font-style:italic;">
        Discrepância (paciente − familiar): <strong>${disc >= 0 ? '+'+disc : disc}</strong>
        ${Math.abs(disc) > 10 ? ' — <span style="color:#E8821A;">Discrepância significativa</span>' : ''}
      </td>
    </tr>`
  }

  return tableWrap(allRows, head)
}

// ── Tabela MEMIMP ─────────────────────────────────────────────────────────────
function buildMEMIMPSection(td) {
  const d = td?.MEMIMP
  if (!d) return ''
  if (d.patient_total == null && d.family_total == null) return ''

  const clsMEMIMP = (v, max) => {
    if (v == null) return { label: '—', color: '#555' }
    const pct = Number(v) / max
    if (pct > 0.70) return { label: 'COMPROMETIDO', color: '#C00000' }
    if (pct >= 0.50) return { label: 'LIMÍTROFE',   color: '#E8821A' }
    return              { label: 'PRESERVADO',   color: '#1F3864' }
  }

  const rows_data = [
    { label: 'Memória Prospectiva — PM (itens 1,3,5,7,10,12,14,16)',  fam: d.family_prospective,   pat: d.patient_prospective,   max: 40 },
    { label: 'Memória Retrospectiva — RM (itens 2,4,6,8,9,11,13,15)', fam: d.family_retrospective, pat: d.patient_retrospective, max: 40 },
    { label: 'TOTAL',                             fam: d.family_total,         pat: d.patient_total,         max: 80 },
  ]

  const rows = rows_data.map((r, i) => {
    const clsFam = clsMEMIMP(r.fam, r.max)
    const clsPat = clsMEMIMP(r.pat, r.max)
    const bg = i % 2 === 0 ? '#fff' : HR
    const isTot = i === rows_data.length - 1
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;${isTot ? 'font-weight:bold;' : ''}">
      ${tdCell(isTot ? `<strong>${r.label}</strong>` : r.label, 'font-weight:' + (isTot ? 'bold' : 'normal') + ';')}
      ${tdCell(r.fam != null ? r.fam + '/' + r.max : '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(`<span style="color:${clsFam.color};font-weight:bold;">${clsFam.label}</span>`, 'text-align:center;')}
      ${tdCell(r.pat != null ? r.pat + '/' + r.max : '—', 'text-align:center;font-weight:bold;')}
      ${tdCell(`<span style="color:${clsPat.color};font-weight:bold;">${clsPat.label}</span>`, 'text-align:center;')}
    </tr>`
  }).join('')

  const head = `<thead>
    <tr><th colspan="5" style="border:1px solid #9DB8D9;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Questionário de Memória Prospectiva e Retrospectiva (PRMQ)</th></tr>
    <tr>
      ${thCell('Domínio')}
      ${thCell('Familiar (8–40)', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
      ${thCell('Paciente (8–40)', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(rows, head)
}

// ── Tabela TRIACOG ────────────────────────────────────────────────────────────
function buildTRIACOGSection(td) {
  const d = td?.TRIACOG
  if (!d) return ''
  if (d.total_score == null) return ''

  const clsTRIACOG = (total) => {
    if (total == null) return { label: '—', color: '#555' }
    return Number(total) >= 24
      ? { label: 'NORMAL',                        color: '#1F3864' }
      : { label: 'SUGESTIVO DE COMPROMETIMENTO',  color: '#C00000' }
  }

  const domains = [
    { label: 'Orientação',                         val: d.orientacao_total,              max: 2   },
    { label: 'Memória Imediata (lista de palavras)',val: d.memoria_evocacao_imediata,     max: 6   },
    { label: 'Memória Tardia (lista de palavras)', val: d.memoria_evocacao_tardia,       max: 6   },
    { label: 'Atenção — Span de Dígitos',          val: d.atencao_total,                 max: 10  },
    { label: 'Memória Visual',                     val: d.memoria_visual_total,          max: 24  },
    { label: 'Praxia — Cópia de Figura',           val: d.praxia_copia_figura_total,     max: 24  },
    { label: 'Praxia — Relógio',                   val: d.praxia_relogio_total,          max: 9   },
    { label: 'Funções Executivas — NSR (acertos)', val: d.fe_nsr_total_acertos,          max: 24  },
    { label: 'Processamento Numérico',             val: d.processamento_numerico_total,  max: 7   },
    { label: 'Linguagem — Nomeação',               val: d.linguagem_nomeacao_total,      max: 4   },
    { label: 'Linguagem — Repetição',              val: d.linguagem_repeticao_total,     max: 8   },
    { label: 'Linguagem — Escrita',                val: d.linguagem_escrita_total,       max: 4   },
  ].filter(r => r.val != null && r.val !== '')

  if (domains.length === 0) return ''

  const domainRows = domains.map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : HR
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      ${tdCell(r.label)}
      ${tdCell(r.val + '/' + r.max, 'text-align:center;font-weight:bold;')}
      ${tdCell('—', 'text-align:center;')}
    </tr>`
  }).join('')

  const totalCls = clsTRIACOG(d.total_score)
  const totalRow = `<tr style="background:#dce8f0;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${tdCell('<strong>TOTAL TRIACOG</strong>', 'font-weight:bold;')}
    ${tdCell(`<strong>${d.total_score}</strong>`, 'text-align:center;font-weight:bold;')}
    ${tdCell(`<span style="color:${totalCls.color};font-weight:bold;">${totalCls.label}</span>`, 'text-align:center;')}
  </tr>`

  const head = `<thead>
    <tr><th colspan="3" style="border:1px solid #9DB8D9;padding:9px 10px;background:${H};color:#fff;text-align:center;font-size:12pt;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Triagem Cognitiva — TRIACOG<br/><span style="font-size:9pt;font-weight:400;">Ponto de corte: ≥24 Normal · &lt;24 Sugestivo de comprometimento</span></th></tr>
    <tr>
      ${thCell('Domínio')}
      ${thCell('Escore', 'text-align:center;')}
      ${thCell('Classificação', 'text-align:center;')}
    </tr>
  </thead>`

  return tableWrap(domainRows + totalRow, head)
}

// ── Mapeamento de dados do Firebase para generateTextoConclusao ───────────────
function mapToDadosPaciente(patient, ad, td, npZscores, lbl, initials) {
  const toFem = (val) => {
    if (!val || val === 'N/A' || val === 'N/D') return 'PRESERVADA'
    const v = String(val).toUpperCase()
    if (v === 'PRESERVADO') return 'PRESERVADA'
    if (v === 'COMPROMETIDO') return 'COMPROMETIDA'
    return val
  }
  const toDesc  = (val) => {
    if (!val) return 'CAPACIDADE'
    const v = String(val).toUpperCase()
    if (v.includes('LIMÍT') || v.includes('LIMIT') || v.includes('COMPROM') || v.includes('DÉFIC') || v.includes('DEFIC')) return 'DIFICULDADE'
    return 'CAPACIDADE'
  }
  const toRateD = (val) => (!val || String(val).toUpperCase().includes('PRESERV')) ? 'DENTRO DO ESPERADO' : 'ABAIXO DO ESPERADO'

  const sex  = (patient?.sex || '').toUpperCase()
  const sexo = sex.includes('FEM') ? 'FEMININO' : 'MASCULINO'

  const npOri  = toFem(lbl(npZscores?.orientation))
  const npOriT = toFem(lbl(npZscores?.orientation_time))  || npOri
  const npOriS = toFem(lbl(npZscores?.orientation_space)) || npOri
  const npAtt  = toFem(lbl(npZscores?.attention))
  const npPerc = toFem(lbl(npZscores?.perception))
  const npMem  = toFem(lbl(npZscores?.memory))
  const npPrax       = toFem(lbl(npZscores?.praxis))
  const npPraxIdeo   = toFem(lbl(npZscores?.praxis_ideomotor))           || npPrax
  const npPraxReflex = toFem(lbl(npZscores?.praxis_reflexive))           || npPrax
  const npExec       = toFem(lbl(npZscores?.executive))
  const npFluFon     = toFem(lbl(npZscores?.executive_verbal_fluency))   || npExec

  // RAVLT — classifica escore bruto igual à função classify.ravlt_a7
  const classRvlt = (score) => {
    if (score == null || score === '') return 'PRESERVADA'
    const v = Number(score)
    if (v >= 9) return 'PRESERVADA'
    if (v >= 6) return 'LIMÍTROFE'
    return 'COMPROMETIDA'
  }
  // A6/A7 — usa percentil (clsRAVLTFromPct) para 6 níveis como A1/B1
  const ravltFromZOrRaw = (zscore, rawScore, normKey) => {
    if (zscore != null && zscore !== '') {
      const pct = rptBamsZToPct(Number(zscore))
      const cls = clsRAVLTFromPct(pct)
      if (cls) {
        const l = cls.label
        if (l === 'Déficit')        return 'COMPROMETIDA'
        if (l === 'Limítrofe')      return 'LIMÍTROFE'
        if (l === 'Média Inferior') return 'MÉDIA INFERIOR'
        return 'PRESERVADA'
      }
    }
    if (normKey && rvNorma) return ravltLabelFromPct(rvPctOf(rawScore, normKey), rawScore)
    return classRvlt(rawScore)
  }
  const rv = td?.RAVLT
  const patientAgeCalc = patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25*24*60*60*1000))
    : null
  const rvBirthCalc = rv?.birth_date
    ? Math.floor((Date.now() - new Date(rv.birth_date).getTime()) / (365.25*24*60*60*1000))
    : null
  // Idade na DATA DO EXAME — usa _savedAt (timestamp Firestore) + birth_date
  // Mais preciso que idade atual: paciente pode ter feito aniversário após avaliação
  const rvBirthRef = rv?.birth_date || patient?.birth_date
  // Idade na DATA DE APLICAÇÃO (campo explícito do formulário) — mais confiável que _savedAt
  const rvAgeAtApp = (rv?.application_date && rvBirthRef)
    ? Math.floor((new Date(rv.application_date).getTime() - new Date(rvBirthRef).getTime()) / (365.25*24*60*60*1000))
    : null
  // Fallback: _savedAt (menos confiável — muda se o teste for re-salvo após aniversário)
  const rvTs = (() => {
    const s = rv?._savedAt
    if (!s) return null
    if (typeof s.toDate === 'function') return s.toDate()
    if (s instanceof Date) return s
    if (typeof s.seconds === 'number') return new Date(s.seconds * 1000)
    return null
  })()
  const rvAgeAtTest = (rvTs && rvBirthRef)
    ? Math.floor((rvTs.getTime() - new Date(rvBirthRef).getTime()) / (365.25*24*60*60*1000))
    : null
  // Prioridade: idade digitada > data_aplicação+nasc > _savedAt+nasc > idade_atual
  const rvAgeKey = rv?.age ?? rvAgeAtApp ?? rvAgeAtTest ?? patientAgeCalc ?? rvBirthCalc
  const rvFaixa = rvAgeKey ? ravltGetFaixaIdRpt(Number(rvAgeKey)) : null
  const rvNorma = rvFaixa ? RAVLT_NORMAS_RPT[rvFaixa] : null
  const rvPctOf = (score, key) => {
    if (!rvNorma || score == null || score === '' || rvNorma.dp[key] <= 0) return null
    return rptBamsZToPct((Number(score) - rvNorma.media[key]) / rvNorma.dp[key])
  }
  const ravltLabelFromPct = (pct, rawScore) => {
    if (pct != null) {
      const cls = clsRAVLTFromPct(pct)
      if (cls) {
        const l = cls.label
        if (l === 'Déficit')        return 'COMPROMETIDA'
        if (l === 'Limítrofe')      return 'LIMÍTROFE'
        if (l === 'Média Inferior') return 'MÉDIA INFERIOR'
        return 'PRESERVADA'
      }
    }
    return classRvlt(rawScore)
  }
  const ravltA1 = rv ? ravltLabelFromPct(rvPctOf(rv.a1_score, 'a1'), rv.a1_score) : 'PRESERVADA'
  const ravltB1 = rv ? ravltLabelFromPct(rvPctOf(rv.b1_score, 'b1'), rv.b1_score) : 'PRESERVADA'
  const ravltA6 = rv ? ravltFromZOrRaw(rv.a6_zscore, rv.a6_score, 'a6') : 'PRESERVADA'
  const ravltA7 = rv ? ravltFromZOrRaw(rv.a7_zscore, rv.a7_score, 'a7') : 'PRESERVADA'

  let velEsq = 'PRESERVADA'
  if (rv?.forgetting_speed != null) {
    const fs = Number(rv.forgetting_speed)
    if (fs < 0.6) velEsq = 'COMPROMETIDA'
    else if (fs < 0.8) velEsq = 'LIMÍTROFE'
  }

  let recogn = 'PRESERVADA'
  if (rv?.recognition_score != null) {
    const rs = Number(rv.recognition_score)
    if (rs < 10) recogn = 'COMPROMETIDA'
    else if (rs < 13) recogn = 'LIMÍTROFE'
  }

  // WCST / WCST-N — usa classificação armazenada no Firestore (calculada pelas tabelas normativas em Tests.jsx)
  const wcst = td?.['WCST-N'] || td?.WCST
  const wcstCat = toFem(wcst?.classification) || 'PRESERVADA'
  const wcstPE = wcst?.perseverative_errors != null
    ? (() => { const n = Number(wcst.perseverative_errors); return n <= 10 ? 'PRESERVADA' : n <= 16 ? 'LIMÍTROFE' : 'COMPROMETIDA' })()
    : 'PRESERVADA'
  const wcstNPE = wcst?.non_perseverative_errors != null
    ? (() => { const n = Number(wcst.non_perseverative_errors); return n <= 10 ? 'PRESERVADA' : n <= 16 ? 'LIMÍTROFE' : 'COMPROMETIDA' })()
    : 'PRESERVADA'
  const beneficioFeedback = (wcst?.total_breaks ?? 0) > 2 ? 'NÃO SE BENEFICIAR' : 'SE BENEFICIAR'

  // TOKEN — usa classificação EPI armazenada no Firestore (tabela normativa de Tests.jsx)
  const tokenRawCls = (td?.TOKEN?.classification || '').toUpperCase()
  const tokenLabel = tokenRawCls || 'NORMAL'
  const tokenBad = tokenRawCls.includes('DEFICIT') || tokenRawCls.includes('LIMIT') || tokenRawCls.includes('INFERIOR')
  const tokenDesc = tokenBad ? 'DIFICULDADE' : 'CAPACIDADE'

  // BAMS
  const bams = td?.BAMS
  const bamsClass = (bams?.classification || bams?.interpretation || 'PRESERVADO').toUpperCase()
  const bamsGlobal = (bams?.z_bams != null && bams.z_bams !== '')
    ? toFem(lbl(parseFloat(bams.z_bams)))
    : toFem(bamsClass.includes('PRESERV') ? 'PRESERVADO' : bamsClass.includes('LIMIT') ? 'LIMÍTROFE' : 'COMPROMETIDO')
  const bamsGlobalDesc = bamsClass.includes('PRESERV') ? 'DENTRO DO ESPERADO' : 'ABAIXO DO ESPERADO'
  const bamsSubCls = (raw, max) => {
    if (raw == null || max == null) return bamsGlobal
    const pct = Number(raw) / max
    return pct >= 0.5 ? 'PRESERVADA' : pct >= 0.25 ? 'LIMÍTROFE' : 'COMPROMETIDA'
  }
  const bamsCatZ = (bams?.z_categorizacao != null && bams.z_categorizacao !== '')
    ? parseFloat(bams.z_categorizacao) : null
  const bamsZlbl = (z) => {
    if (z == null || z === '') return null
    const pct = rptBamsZToPct(parseFloat(z))
    const cls = clsRAVLTFromPct(pct)
    if (!cls) return null
    const l = cls.label
    if (l === 'Déficit')        return 'COMPROMETIDA'
    if (l === 'Limítrofe')      return 'LIMÍTROFE'
    if (l === 'Média Inferior') return 'MÉDIA INFERIOR'
    return 'PRESERVADA'
  }

  // GDS / GAI — texto real da classificação (com fallbacks BDI-II, HAD, IDATE)
  const depressao = td?.['GDS-15']?.classification
    || td?.['BDI-II']?.classification
    || td?.HAD?.had_d_class
    || 'Sem depressão'
  const ansiedade = td?.GAI?.classification
    || td?.['IDATE-E']?.classification
    || td?.HAD?.had_a_class
    || 'Sem ansiedade'

  // IQCODE / B-ADL / Pfeffer — recalculado do escore (ignora texto salvo)
  const iqMeanScore = td?.IQCODE?.mean_score ?? (td?.IQCODE?.total_score != null ? Math.round((td.IQCODE.total_score / 26) * 100) / 100 : null)
  const iqcode = iqMeanScore == null ? 'NÃO APRESENTA DECLÍNIO COGNITIVO'
    : iqMeanScore <= 3.38 ? 'NÃO APRESENTA DECLÍNIO COGNITIVO'
    : 'APRESENTA DECLÍNIO COGNITIVO'
  const badlScore = td?.['B-ADL']?.total_score
  const badl = badlScore == null ? 'NÃO APRESENTA COMPROMETIMENTO NAS AVDs'
    : Number(badlScore) < 3.5 ? 'NÃO APRESENTA COMPROMETIMENTO NAS AVDs'
    : 'APRESENTA COMPROMETIMENTO NAS AVDs'
  const pfefferClass = (td?.Pfeffer?.classification || '').toUpperCase()
  const pfeffer = pfefferClass.includes('COMPROM') ? 'APRESENTA COMPROMETIMENTO FUNCIONAL'
    : 'NÃO APRESENTA COMPROMETIMENTO'

  // MEMIMP
  const mm = td?.MEMIMP
  const mmCls = (v, max) => {
    if (v == null) return 'PRESERVADA'
    const pct = Number(v) / max
    return pct > 0.70 ? 'COMPROMETIDA' : pct >= 0.50 ? 'LIMÍTROFE' : 'PRESERVADA'
  }

  // Observações / comportamento
  const qualidadeDiscurso = ad?.observacoes_comportamentais
    ? ad.observacoes_comportamentais
    : 'Seu discurso é organizado e coerente com as atividades abordadas durante a avaliação.'
  const cooperacao = (ad?.cooperacao || '').toLowerCase()
  const compreendia = cooperacao.includes('não') || cooperacao.includes('nao') ? 'NÃO' : 'SIM'

  // WASI
  const wasi = td?.WASI || td?.['WASI-III']
  const wasiPontuacao = wasi ? (Number(wasi.qit_2 ?? wasi.qit) || null) : null
  const wasiPercentil = wasi ? (Number(wasi.qit_percentile) || null) : null
  const wasiDesempenho = wasi?.classification ?? null

  return {
    nome: initials,
    sexo,
    qualidadeDiscurso,
    compreendia,
    wasiPontuacao,
    wasiPercentil,
    wasiDesempenho,
    orientacaoTemporal: npOriT,
    orientacaoEspacial: npOriS,
    atencao: npAtt,
    atencaoDesc: toDesc(npAtt),
    percepcao: npPerc,
    percepcaoDesc: toDesc(npPerc),
    memoriaTrabalho: npMem,
    memoriaVCurtoPrazo: npMem,
    memoriaProspectiva: td?.NEUPSILIN?.memory_prospective != null
      ? (Number(td.NEUPSILIN.memory_prospective) >= 2 ? 'PRESERVADA' : Number(td.NEUPSILIN.memory_prospective) >= 1 ? 'LIMÍTROFE' : 'COMPROMETIDA')
      : (mm ? mmCls(mm.patient_prospective, 40) : npMem),
    praxiaIdeomotora: npPraxIdeo,
    praxiaConstrutiva: npPrax,
    praxiaReflexiva: npPraxReflex,
    fluenciaFonemica: npFluFon,
    fluenciaSematica: bamsCatZ != null ? toFem(lbl(bamsCatZ)) : bamsGlobal,
    definicaoPalavras: bamsZlbl(bams?.z_lexico) ?? bamsSubCls(bams?.dp_total, 10),
    categorizacaoVerbal: bamsZlbl(bams?.z_categorizacao) ?? bamsSubCls(bams?.cv_total, 10),
    conceituacao: bamsZlbl(bams?.z_conceitualizacao) ?? bamsSubCls(bams?.cg_total, 10),
    escoreGlobal: bamsGlobal,
    escoreGlobalDesc: bamsGlobalDesc,
    ravltA1, ravltA1Desc: toDesc(ravltA1),
    ravltB1,
    ravltA6, ravltA6Desc: toDesc(ravltA6),
    ravltA7, ravltA7Desc: ravltA7 === 'PRESERVADA' ? 'CAPACIDADE' : 'DIFICULDADE',
    velEsquecimento: velEsq,
    velEsquecimentoDesc: toRateD(velEsq),
    reconhecimento: recogn,
    reconhecimentoDesc: recogn.includes('PRESERV') ? 'facilitou o reconhecimento' : 'NÃO facilitou o reconhecimento',
    categoriasCompletas: wcstCat,
    errosPerseverativos: wcstPE, errosPersDesc: toDesc(wcstPE),
    errosNaoPers: wcstNPE, errosNaoPersDesc: toDesc(wcstNPE),
    beneficioFeedback,
    token: tokenLabel, tokenDesc,
    prospInformante:   mm ? mmCls(mm.family_prospective, 40)    : 'PRESERVADA',
    prospPaciente:     mm ? mmCls(mm.patient_prospective, 40)   : 'PRESERVADA',
    retrospInformante: mm ? mmCls(mm.family_retrospective, 40)  : 'PRESERVADA',
    retrospPaciente:   mm ? mmCls(mm.patient_retrospective, 40) : 'PRESERVADA',
    retrospAnamnese:   iqcode.includes('NÃO') ? 'PRESERVADA' : 'COMPROMETIDA',
    depressao, ansiedade, iqcode, badl, pfeffer,
    avdAnamnese: pfeffer.includes('NÃO') ? 'NÃO APRESENTA COMPROMETIMENTO' : 'APRESENTA COMPROMETIMENTO',
  }
}

// ── Tabela DEX: Facilidades / Dificuldades × Frias / Quentes ──────────────────
function buildDEXFriasQuentesTable(td) {
  const d = td?.DEX
  if (!d) return ''

  const ALL_ITEMS = DEX_DOMAINS.flatMap(dom => dom.items)
  const labelOf   = (idx) => ALL_ITEMS.find(it => it.idx === idx)?.label || `Item ${idx}`

  const FRIAS_IDX   = [3, 6, 14, 18, 19]
  const QUENTES_IDX = [2, 5, 7, 8, 9, 11, 12, 13, 15, 16, 20]

  const itemsFor = (prefix, indices, lo, hi) =>
    indices
      .filter(idx => { const v = d[`${prefix}_q${idx}`]; if (v == null) return false; const n = Number(v); return n >= lo && n <= hi })
      .map(labelOf)

  const thSt = `border:1px solid #9DB8D9;padding:8px 10px;background:${H};color:#fff;font-weight:bold;font-size:10pt;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact;`
  const tdSt = `border:1px solid #9DB8D9;padding:8px 10px;vertical-align:top;font-size:10pt;`
  const lbSt = `border:1px solid #9DB8D9;padding:8px 10px;background:${HR};font-weight:bold;font-size:10pt;white-space:nowrap;`

  const cell = (items, clr) =>
    items.length
      ? `<td style="${tdSt}"><span style="color:${clr};font-weight:600;">${items.join(' · ')}</span></td>`
      : `<td style="${tdSt}color:#aaa;">—</td>`

  const renderBlock = (prefix, title) => {
    const hasData = [...FRIAS_IDX, ...QUENTES_IDX].some(idx => d[`${prefix}_q${idx}`] != null)
    if (!hasData) return ''
    const fF = itemsFor(prefix, FRIAS_IDX,   0, 1)
    const fQ = itemsFor(prefix, QUENTES_IDX, 0, 1)
    const dF = itemsFor(prefix, FRIAS_IDX,   2, 4)
    const dQ = itemsFor(prefix, QUENTES_IDX, 2, 4)
    return `
    <p style="font-weight:700;font-size:11pt;margin:14px 0 5px;">${title}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <thead><tr>
        <th style="${thSt}width:20%;"> </th>
        <th style="${thSt}">Habilidades Frias</th>
        <th style="${thSt}">Habilidades Quentes</th>
      </tr></thead>
      <tbody>
        <tr>
          <td style="${lbSt}">Facilidades<br/><span style="font-size:9pt;font-weight:normal;">(pontuação 0–1)</span></td>
          ${cell(fF, '#1F3864')}${cell(fQ, '#1F3864')}
        </tr>
        <tr>
          <td style="${lbSt}">Dificuldades<br/><span style="font-size:9pt;font-weight:normal;">(pontuação 2–4)</span></td>
          ${cell(dF, '#C00000')}${cell(dQ, '#C00000')}
        </tr>
      </tbody>
    </table>`
  }

  const patBlock = renderBlock('patient', 'Paciente — auto-avaliação')
  const famBlock = renderBlock('family',  'Familiar — hetero-avaliação')
  if (!patBlock && !famBlock) return ''

  const secSt = `background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;`
  return `<div style="margin-bottom:20px;"><div style="${secSt}">SÍNTESE DEX — HABILIDADES FRIAS E QUENTES</div>${patBlock}${famBlock}</div>`
}

// ── Gera HTML da conclusão a partir dos blocos determinísticos ────────────────
function buildConclusaoHtml(blocos, ad, td = {}) {
  const paraStyle = 'font-size:11pt;margin:8px 0;text-align:justify;line-height:1.8;'
  const secStyle  = `background:${H};color:#fff;padding:8px 12px;margin:22px 0 10px;font-size:12pt;font-weight:bold;letter-spacing:0.04em;-webkit-print-color-adjust:exact;print-color-adjust:exact;`
  const sec = (title) => `<div style="${secStyle}">${title}</div>`
  // Destaca em negrito maiúsculas; classificações recebem suas cores padrão
  const boldUpper = (text) => text.replace(
    /\b([A-ZÁÉÍÓÚÀÃÕÂÊÎÔÛÇÑ]{4,}(?:[-\s][A-ZÁÉÍÓÚÀÃÕÂÊÎÔÛÇÑ]{2,})*)/g,
    (match) => {
      const u = match.toUpperCase()
      let color = '#000000'
      if (u.includes('PRESERVAD')) color = '#1F3864'
      else if (u.includes('LIMÍTROFE') || u.includes('LIMITROFE')) color = '#E8821A'
      else if (u.includes('COMPROMETID')) color = '#C00000'
      return `<strong style="color:${color};">${match}</strong>`
    }
  )
  const p = (text) => `<p style="${paraStyle}">${boldUpper(text)}</p>`

  const obsTexto = [
    ad?.observacoes_comportamentais,
    ad?.humor        ? `Humor aparente: ${ad.humor}.`          : null,
    ad?.cooperacao   ? `Cooperação: ${ad.cooperacao}.`         : null,
    ad?.nivel_alerta ? `Nível de alerta: ${ad.nivel_alerta}.`  : null,
  ].filter(Boolean).join(' ') || '[Registrar o comportamento do paciente durante a avaliação]'

  const conclusaoPreFE = [
    blocos.discurso, blocos.inteligencia, blocos.orientacao, blocos.atencao,
    blocos.memoria, blocos.funcoesExecutivas,
  ].filter(Boolean).map(t => p(t)).join('\n')

  const conclusaoPosFE = [
    blocos.linguagem, blocos.percepcao, blocos.praxia,
    blocos.depressaoAnsiedade, blocos.declinioAVD,
  ].filter(Boolean).map(t => p(t)).join('\n')

  const conclusaoBlocks = conclusaoPreFE
    + (buildDEXFriasQuentesTable(td) ? '\n' + buildDEXFriasQuentesTable(td) : '')
    + (conclusaoPosFE ? '\n' + conclusaoPosFE : '')

  // ANÁLISE DAS QUEIXAS — popula com dados reais da anamnese quando disponíveis
  const objetivo = ad?.objetivo_avaliacao || ad?.motivo_encaminhamento || ''
  const queixas  = ad?.queixas || ad?.queixas_cognitivas_emocionais || ''
  const doencas  = Array.isArray(ad?.doencas_preexistentes)
    ? ad.doencas_preexistentes.join(', ')
    : (ad?.doencas_preexistentes || '')
  const analiseQueixasParts = [
    objetivo ? `<p style="${paraStyle}"><strong>Motivo da avaliação:</strong> ${objetivo}</p>` : null,
    queixas  ? `<p style="${paraStyle}"><strong>Queixas principais:</strong> ${queixas}</p>`   : null,
    doencas  ? `<p style="${paraStyle}"><strong>Histórico clínico:</strong> ${doencas}</p>`    : null,
  ].filter(Boolean)
  const analiseQueixasHtml = analiseQueixasParts.length > 0
    ? analiseQueixasParts.join('')
    : p('[A ser preenchido com os dados da anamnese clínica do paciente — use o botão EDITAR.]')

  return `
<div style="margin-bottom:20px;">
  ${sec('OBSERVAÇÕES COMPORTAMENTAIS')}
  ${p(obsTexto)}
</div>

<div style="margin-bottom:20px;">
  ${sec('CONCLUSÃO')}
  ${conclusaoBlocks}
</div>

<div style="margin-bottom:20px;">
  ${sec('ENFIM')}
  ${p('[Síntese diagnóstica — inserir hipótese diagnóstica principal e código CID-10 — use o botão EDITAR.]')}
</div>

<div style="margin-bottom:20px;">
  ${sec('ENCAMINHAMENTOS')}
  ${p('Com base nos resultados, sugere-se:')}
  <ul style="margin:8px 0 12px 24px;font-size:11pt;">
    <li style="margin-bottom:4px;">Retorno ao médico solicitante com este laudo</li>
    <li style="margin-bottom:4px;">Exercícios cognitivos (mínimo 2x/semana)</li>
    <li style="margin-bottom:4px;">Treino de memória, função executiva e atenção</li>
    <li style="margin-bottom:4px;">Psicoterapia (modalidade adequada ao caso)</li>
    <li style="margin-bottom:4px;">Exercícios físicos regulares</li>
    <li style="margin-bottom:4px;"><em><strong>Reavaliação neuropsicológica após 1 ano</strong></em></li>
  </ul>
</div>`
}

// ── Atualiza informante/medicamentos no HTML com dados frescos do Firestore ───
function patchAnamneseFields(html, ad) {
  if (!html || !ad) return html
  const informante = [ad.acompanhante, ad.responsavel].filter(Boolean).join(', ') || ad.informante || ''
  const parentesco = ad.parentesco_acompanhante ? ` (${ad.parentesco_acompanhante})` : ''
  const medicamentos = ad.medicamentos || ''
  let result = html
  if (informante) {
    result = result.replace(
      /(<strong>Informante\(s\)<\/strong><\/td>\s*<td[^>]*>)[^<]*/,
      `$1${informante + parentesco}`
    )
  }
  if (medicamentos) {
    result = result.replace(
      /(<strong>Medicamentos<\/strong><\/td>\s*<td[^>]*>)[^<]*/,
      `$1${medicamentos}`
    )
  }
  return result
}

// ── Gera aiBody deterministicamente — blocos validados da planilha Protocolo_Prevent ──
function buildAiBodyFromData(patient, ad, td) {
  try {
    const lbl = z => z == null ? 'N/A' : parseFloat(z) >= -1.0 ? 'PRESERVADO' : parseFloat(z) >= -1.5 ? 'LIMÍTROFE' : 'COMPROMETIDO'
    const age = patient?.birth_date
      ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null
    const np = td?.NEUPSILIN
    let npZscores = {}
    if (np) {
      if (np.zScores) {
        npZscores = np.zScores
      } else {
        const nAge = npAgeGroup(np.age || age)
        const nEdu = npEduGroup(np.education_years || patient?.education)
        const orientT = (Number(np.orientation_time_total)||0) + (Number(np.orientation_space_total)||0)
        const attT    = (Number(np.attention_reverse_count)||0) + (Number(np.attention_digit_sequence)||0)
        const percT   = (Number(np.perception_line_equality)||0) + (Number(np.perception_visual_hemineglect)||0) + (Number(np.perception_face_perception)||0) + (Number(np.perception_face_recognition)||0)
        const episT   = (Number(np.memory_episodic_immediate)||0) + (Number(np.memory_episodic_delayed)||0) + (Number(np.memory_episodic_recognition)||0)
        const memT    = (Number(np.memory_working)||0) + (Number(np.memory_span_auditory)||0) + episT + (Number(np.memory_semantic_long)||0) + (Number(np.memory_visual_short)||0) + (Number(np.memory_prospective)||0)
        const langO   = (Number(np.lang_nomeacao)||0) + (Number(np.lang_repeticao)||0) + (Number(np.lang_automatica)||0) + (Number(np.lang_compreensao_oral)||0) + (Number(np.lang_inferencias)||0)
        const langE   = (Number(np.lang_leitura)||0) + (Number(np.lang_compreensao_escrita)||0) + (Number(np.lang_escrita_espontanea)||0) + (Number(np.lang_escrita_copiada)||0) + (Number(np.lang_ditada)||0)
        const praxT   = (Number(np.praxis_ideomotor)||0) + (Number(np.praxis_constructive)||0) + (Number(np.praxis_reflexive)||0)
        const execT   = (Number(np.executive_problem_solving)||0) + (fluencyWordsToScore(np.executive_verbal_fluency) || 0)
        npZscores = {
          orientation:       npCalcZ(orientT, 'orientation', nAge, nEdu),
          orientation_time:  npCalcZ(Number(np.orientation_time_total)||0,  'orientation_time',  nAge, nEdu),
          orientation_space: npCalcZ(Number(np.orientation_space_total)||0, 'orientation_space', nAge, nEdu),
          attention:   npCalcZ(attT,    'attention',   nAge, nEdu),
          perception:  npCalcZ(percT,   'perception',  nAge, nEdu),
          memory:      npCalcZ(memT,    'memory',      nAge, nEdu),
          arithmetic:  npCalcZ(np.arithmetic, 'arithmetic', nAge, nEdu),
          language:    npCalcZ(langO + langE, 'language',   nAge, nEdu),
          praxis:                   npCalcZ(praxT,   'praxis',                   nAge, nEdu),
          praxis_ideomotor:         npCalcZ(Number(np.praxis_ideomotor)||0,       'praxis_ideomotor',         nAge, nEdu),
          praxis_reflexive:         npCalcZ(Number(np.praxis_reflexive)||0,       'praxis_reflexive',         nAge, nEdu),
          executive:                npCalcZ(execT,   'executive',                 nAge, nEdu),
          executive_verbal_fluency: (np.executive_verbal_fluency != null && np.executive_verbal_fluency !== '')
            ? npCalcZ(Number(np.executive_verbal_fluency)||0, 'executive_verbal_fluency', nAge, nEdu)
            : null,
        }
      }
    }
    const initials = patient?.full_name
      ? patient.full_name.split(' ').filter(Boolean).map(w => w[0].toUpperCase() + '.').join('')
      : 'N.P.'
    const dadosPaciente = mapToDadosPaciente(patient, ad, td, npZscores, lbl, initials)
    const blocos = generateTextoConclusao(dadosPaciente)
    return buildConclusaoHtml(blocos, ad, td)
  } catch (_) {
    return null
  }
}

// ── PROCEDIMENTO — texto estruturado por grupos de instrumentos ───────────────
function buildProcedimentoText(selectedTests) {
  const has = k => selectedTests.includes(k)
  const join = items => {
    if (items.length === 0) return ''
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} e ${items[1]}`
    return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
  }
  const P = 'font-size:11pt;margin:6px 0 10px 0;text-align:justify;'

  const quantItems = [
    has('NEUPSILIN') && 'Instrumento de Avaliação Neuropsicológica Breve Adulto (NEUPSILIN)',
    has('BAMS')      && 'Bateria de Avaliação da Memória Semântica (BAMS)',
    has('RAVLT')     && 'Teste de Aprendizagem Auditivo-Verbal de Rey (RAVLT)',
  ].filter(Boolean)

  const qualItems = [
    has('WCST-N') && 'Teste Wisconsin de Classificação de Cartas — Versão Nelson (WCST-N)',
    has('TOKEN')  && 'Token Test versão reduzida',
  ].filter(Boolean)

  const escalItems = [
    has('GDS-15') && 'Escala de Depressão Geriátrica (GDS)',
    has('GAI')    && 'Escala de Ansiedade Geriátrica (GAI)',
    has('DEX')    && 'Questionário de Disfunção Executiva (DEX — versões paciente e familiar)',
    has('MEMIMP') && 'Questionário de Memória Prospectiva e Retrospectiva (versões paciente e familiar)',
    has('IQCODE') && 'Informant Questionnaire on Cognitive Decline in the Elderly (IQCODE)',
    has('B-ADL')  && 'Escala Bayer de Atividades da Vida Diária (B-ADL)',
    has('Pfeffer')&& 'Questionário de Atividades Funcionais de Pfeffer',
  ].filter(Boolean)

  let html = `<p style="${P}">Foram realizadas consultas para entrevista de anamnese e para aplicação de instrumentos neuropsicológicos, visando à investigação de Atenção, Memória, Funções Executivas, Habilidades Visuoespaciais e Linguagem.</p>`
  if (quantItems.length)
    html += `<p style="${P}">Para avaliação quantitativa foram utilizados: ${join(quantItems)}.</p>`
  if (qualItems.length)
    html += `<p style="${P}">Para avaliação qualitativa foram utilizados: ${join(qualItems)}.</p>`
  if (escalItems.length)
    html += `<p style="${P}">Para investigação de personalidade, funcionamento psicossocial, prejuízos funcionais e humor foram aplicados: ${join(escalItems)}.</p>`
  return html
}

// ── Documento completo ────────────────────────────────────────────────────────
function buildFullDocument({ patient, selectedTests, appliedBy, user, ad, td, aiBody, dataFormatada, approvalInfo = null }) {
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

  // PROCEDIMENTO — texto estruturado por grupos
  const procedimentoHtml = buildProcedimentoText(selectedTests)

  // ESCALAS — tabela simples (GDS→GAI→IQCODE→B-ADL→Pfeffer→…) + MEMIMP + DEX
  const escalasTable = buildEscalasSection(td)
  const memimpHtml   = buildMEMIMPSection(td)
  const dexHtml      = buildDEXSection(td)
  const escalasSection = (escalasTable || memimpHtml || dexHtml)
    ? secHead('TABELA DE RESULTADOS – ESCALAS') + escalasTable + memimpHtml + dexHtml
    : ''

  // TESTES — ordem: TOKEN → TRIACOG → NEUPSILIN → BAMS → RAVLT → WASI → WCST-N
  const hasNeupsilin = !!td?.NEUPSILIN
  const hasTRIACOG   = !!td?.TRIACOG && td.TRIACOG.total_score != null
  const hasRAVLT     = !!td?.RAVLT
  const hasWASI      = !!(td?.WASI || td?.['WASI-III'])
  const hasBAMS      = !!td?.BAMS
  const hasWCST      = !!(td?.['WCST-N'] || td?.WCST)
  const hasTOKEN     = !!td?.TOKEN

  const testesSection = (hasTOKEN || hasTRIACOG || hasNeupsilin || hasBAMS || hasRAVLT || hasWASI || hasWCST)
    ? secHead('TABELA DE RESULTADOS – TESTES') +
      buildTOKENSection(td) +
      buildTRIACOGSection(td) +
      buildNeupsilinSection(td, patient) +
      buildBAMSSection(td, patient) +
      buildRAVLTSection(td) +
      buildWASISection(td, selectedTests) +
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

  // ── ANAMNESE — 6 seções para o laudo ────────────────────────────────────────
  const AP = 'font-size:11pt;margin:8px 0;text-align:justify;line-height:1.8;'

  // 1. Objetivo da avaliação
  const objAval = ad?.objetivoAvaliacao || objetivo

  // 2. Descrição da demanda — queixas + história clínica + sintomas pontuados da anamnese
  const _symptomGroups = [
    { label: 'Memória',                     key: 'sintomas_memoria_idoso' },
    { label: 'Atenção',                     key: 'sintomas_atencao_idoso' },
    { label: 'Função executiva',            key: 'sintomas_funcao_executiva_idoso' },
    { label: 'Resolução de problemas',      key: 'sintomas_resolucao_problemas' },
    { label: 'Linguagem/Matemática',        key: 'sintomas_linguagem_matematica' },
    { label: 'Habilidades visuoespaciais',  key: 'sintomas_hab_nao_verbais' },
    { label: 'Humor/Comportamento',         key: 'sintomas_humor_comportamento' },
    { label: 'Desinibição/Agitação',        key: 'sintomas_desinibicao_agitacao_idoso' },
    { label: 'Físico/Motor',                key: 'sintomas_fisicos_motores_idoso' },
    { label: 'Sensorial',                   key: 'sintomas_sensoriais_idoso' },
  ]
  const symptomsText = _symptomGroups
    .map(({ label, key }) => {
      const items = ad?.[key]
      if (!Array.isArray(items) || items.length === 0) return null
      return `${label}: ${items.join(', ')}`
    })
    .filter(Boolean)
    .join('. ')
  const descDemanda = ad?.descricaoDemanda || [
    ad?.queixas,
    ad?.queixas_cognitivas_emocionais,
    ad?.desenvolvimento_sintomas,
    symptomsText,
  ].filter(Boolean).join('. ') || ''

  // 3. Informações gerais — prosa automática
  const igPartes = []
  if (age != null)                igPartes.push(`${age} anos de idade`)
  if (ad?.estado_civil)           igPartes.push(ad.estado_civil)
  if (ad?.quantidade_filhos_netos)igPartes.push(`${ad.quantidade_filhos_netos} filhos/netos`)
  const eduStr = fmtEducation(patient?.education || ad?.escolaridade)
  if (eduStr && eduStr !== '—')   igPartes.push(`escolaridade ${eduStr.toLowerCase()}`)
  if (ad?.reside_com)             igPartes.push(`reside com ${ad.reside_com}`)
  if (ad?.rotina)                 igPartes.push(`rotina: ${ad.rotina}`)
  const lat = ad?.lateralidade || patient?.lateralidade
  if (lat)                        igPartes.push(`lateralidade ${lat}`)
  if (informante && informante !== '—') igPartes.push(`informante: ${informante}`)
  const infoGeraisProsa = ad?.infoGerais || (igPartes.length > 0 ? `Paciente com ${igPartes.join(', ')}.` : '')

  // Saúde e antecedentes familiares (sem medicamentos no laudo)
  const histSaude = ad?.historicoSaude || ''
  const antecFam  = ad?.antecedenteFamiliar || ''
  const saudeParts = [
    histSaude,
    antecFam ? `Antecedentes familiares: ${antecFam}` : '',
  ].filter(Boolean)
  const saudeProsa = ad?.saudeAntecedentes || saudeParts.join(' ')

  // Campos adicionais do laudo
  const histClinica    = ad?.historiaClinicaAtual    || ad?.desenvolvimento_sintomas || ''
  const habitosVida    = ad?.habitosVida             || ''
  const histNeuropsico = ad?.historiaNeuropsicologica || ''
  const queixasCogn    = ad?.queixasCognitivas       || ad?.queixas_cognitivas_emocionais || ''
  const comportObs     = ad?.comportamentoObservacional || ''

  const anamneseSections = [
    objAval         && `<p style="${AP}"><strong>Objetivo da avaliação:</strong> ${objAval}</p>`,
    descDemanda     && `<p style="${AP}"><strong>Descrição da demanda:</strong> ${descDemanda}</p>`,
    infoGeraisProsa && `<p style="${AP}"><strong>Informações gerais:</strong> ${infoGeraisProsa}</p>`,
    saudeProsa      && `<p style="${AP}"><strong>Saúde e antecedentes familiares:</strong> ${saudeProsa}</p>`,
    histClinica     && `<p style="${AP}"><strong>História clínica atual:</strong> ${histClinica}</p>`,
    habitosVida     && `<p style="${AP}"><strong>Hábitos de vida:</strong> ${habitosVida}</p>`,
    histNeuropsico  && `<p style="${AP}"><strong>História neuropsicológica:</strong> ${histNeuropsico}</p>`,
    queixasCogn     && `<p style="${AP}"><strong>Queixas cognitivas relatadas:</strong> ${queixasCogn}</p>`,
    comportObs      && `<p style="${AP}"><strong>Comportamento observacional:</strong> ${comportObs}</p>`,
  ].filter(Boolean)
  const anamneseHtml = anamneseSections.join('')

  return `
<div style="font-family:Arial,sans-serif;color:#1a1a2e;line-height:1.7;max-width:760px;margin:0 auto;">

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
        ${tdCell(fmtEducation(patient?.education || ad?.escolaridade))}
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
        <td colspan="3" style="border:1px solid #c8dfc8;padding:6px 10px;">${informante + parentesco}</td>
      </tr>
      <tr>
        ${tdCell('<strong>Medicamentos</strong>', 'font-weight:bold;')}
        <td colspan="3" style="border:1px solid #c8dfc8;padding:6px 10px;">${medicamentos}</td>
      </tr>
    </tbody>
  </table>

  <!-- ANAMNESE — 6 seções -->
  ${anamneseHtml ? secHead('ANAMNESE') + anamneseHtml : ''}

  <!-- EXAMES IMAGIOLÓGICOS -->
  ${secHead('EXAMES IMAGIOLÓGICOS')}
  <p style="font-size:11pt;margin:8px 0;text-align:justify;">${exames}</p>

  <!-- PROCEDIMENTO -->
  ${secHead('PROCEDIMENTO')}
  ${procedimentoHtml}

  <!-- TABELAS DE RESULTADOS -->
  ${escalasSection}
  ${testesSection}

  <!-- Análise elaborada pelo supervisor -->
  <p style="font-size:9pt;color:#555;font-style:italic;text-align:right;margin:20px 0 4px;">
    Análise elaborada pelo supervisor: ${SUPERVISOR.name} — ${SUPERVISOR.crp}
  </p>
  <div style="font-size:11pt;line-height:1.8;color:#1a1a2e;">
    ${stripMdFences(aiBody)}
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

      <!-- Responsável técnico -->
      <div style="text-align:center;min-width:240px;">
        <img src="/images/sig-002.png" alt="Assinatura" style="max-width:160px;max-height:90px;display:block;margin:0 auto 4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;" />
        <div style="border-top:2px solid #1a1a2e;padding-top:10px;margin-top:4px;">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e;">${SUPERVISOR.name}</div>
          <div style="font-size:11px;color:#555;margin-top:2px;">Neuropsicólogo · Responsável Técnico</div>
          <div style="font-size:11px;color:#555;">${SUPERVISOR.crp}</div>
          <div style="font-size:10px;color:#777;margin-top:2px;">CNES 707604276735994</div>
        </div>
      </div>

      <!-- Carimbo da clínica -->
      <div style="text-align:center;min-width:240px;">
        <img src="/images/sig-002.png" alt="Carimbo" style="max-width:160px;max-height:90px;display:block;margin:0 auto 4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;" />
        <div style="border-top:2px solid ${H};padding-top:10px;margin-top:4px;">
          <div style="font-size:13px;font-weight:700;color:${H};">NEUROAVALIAÇÃO ME</div>
          <div style="font-size:11px;color:#555;margin-top:2px;">CRPJ 06/6481 &nbsp;/&nbsp; CNES 49795</div>
          <div style="font-size:11px;color:#555;">CNPJ 29.313.355/0001-12</div>
        </div>
      </div>

    </div>
  </div>

  <!-- APROVAÇÃO DO SUPERVISOR -->
  ${approvalInfo?.approved ? `
  <div contenteditable="false" style="margin-top:28px;border:2px solid #2E7D32;border-radius:6px;padding:18px 24px;text-align:center;background:rgba(46,125,50,0.04);-webkit-print-color-adjust:exact;print-color-adjust:exact;user-select:none;cursor:default;">
    <div style="font-size:10px;font-weight:800;color:#1A3D2B;letter-spacing:0.12em;margin-bottom:10px;text-transform:uppercase;">✓ Laudo Aprovado pelo Supervisor Técnico</div>
    <div style="font-size:14px;font-weight:800;color:#1A3D2B;">${approvalInfo.supervisor_name || SUPERVISOR.name}</div>
    <div style="font-size:11px;color:#555;margin-top:3px;">${SUPERVISOR.crp} — Neuropsicólogo · Supervisor Técnico · Diretor Clínico</div>
    <div style="font-size:11px;color:#555;margin-top:2px;">Aprovado em: ${approvalInfo.approval_date ? new Date(approvalInfo.approval_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
    <div style="margin-top:10px;display:inline-block;border:1.5px solid #2E7D32;border-radius:4px;padding:6px 18px;">
      <div style="font-size:10px;font-weight:800;color:#2E7D32;letter-spacing:0.06em;">NEUROAVALIAÇÃO ME</div>
      <div style="font-size:9px;color:#666;margin-top:2px;">CRPJ 06/6481 &nbsp;|&nbsp; CNES 49795 &nbsp;|&nbsp; CNPJ 29.313.355/0001-12</div>
    </div>
  </div>
  ` : ''}

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

function FormatToolbar() {
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false })

  const update = () => setFmt({
    bold:      document.queryCommandState('bold'),
    italic:    document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
  })

  useEffect(() => {
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [])

  const exec = (cmd) => { document.execCommand(cmd, false, null); update() }

  const btn = (active) => ({
    background: active ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
    color: active ? '#60A5FA' : 'rgba(255,255,255,0.75)',
    borderRadius: 5, width: 30, height: 26,
    cursor: 'pointer', fontSize: 13, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  })

  return (
    <div style={{
      padding: '5px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'rgba(0,0,0,0.15)', flexShrink: 0,
    }}>
      <button onMouseDown={e => { e.preventDefault(); exec('bold') }}      style={btn(fmt.bold)}      title="Negrito (Ctrl+B)"><strong>B</strong></button>
      <button onMouseDown={e => { e.preventDefault(); exec('italic') }}    style={btn(fmt.italic)}    title="Itálico (Ctrl+I)"><em style={{ fontStyle: 'italic' }}>I</em></button>
      <button onMouseDown={e => { e.preventDefault(); exec('underline') }} style={btn(fmt.underline)} title="Sublinhado (Ctrl+U)"><span style={{ textDecoration: 'underline' }}>U</span></button>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 6px' }} />
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', userSelect: 'none' }}>Ctrl+B · Ctrl+I · Ctrl+U</span>
    </div>
  )
}

function ReportBody({ html, editMode, reportRef, onEdit }) {
  const prevEditMode = useRef(editMode)

  useEffect(() => {
    if (!reportRef.current) return
    const justEntered = editMode && !prevEditMode.current
    const notEditing  = !editMode
    // Only update DOM when: entering edit mode (load once) or not editing (display mode)
    // NEVER update while actively editing — would reset cursor position and content
    if (justEntered || notEditing) {
      reportRef.current.innerHTML = html
    }
    prevEditMode.current = editMode
  }, [html, editMode])

  return (
    <div
      ref={reportRef}
      contentEditable={editMode}
      suppressContentEditableWarning
      onInput={onEdit}
      style={{
        background: '#fff', color: '#111', borderRadius: 6, padding: '32px 28px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
        outline: editMode ? '2px solid rgba(96,165,250,0.5)' : 'none',
        cursor: editMode ? 'text' : 'default',
        minHeight: 200,
      }}
    />
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
const GAS_URL_PAINEL = 'https://script.google.com/macros/s/AKfycbyFjC5joHY6rVZ3mG1OvREuiO3zlh75q8LhhhQ5s2boDOb6CNC1IqFgsGq9L4ttQApU/exec'

export default function Reports() {
  const { user } = useAuth()
  const location = useLocation()
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
  const [approvalLoading,setApprovalLoading]= useState(false)
  const [editMode,       setEditMode]       = useState(false)
  const [showEditConfirm,setShowEditConfirm]= useState(false)
  const [aiBodyState,    setAiBodyState]    = useState('')
  const [reportDate,     setReportDate]     = useState('')

  const [autoSaveStatus, setAutoSaveStatus] = useState('idle') // 'idle'|'saving'|'saved'
  const [validationErrors, setValidationErrors] = useState([])
  const [reopenModal,    setReopenModal]    = useState(false)
  const [reopenPassword, setReopenPassword] = useState('')
  const [reopenError,    setReopenError]    = useState('')
  const [reopenLoading,  setReopenLoading]  = useState(false)
  const [reportLoading,  setReportLoading]  = useState(false)
  const autoSaveTimer = useRef(null)
  const [anamneseStatus, setAnamneseStatus] = useState('idle') // 'idle'|'loading'|'found'|'empty'
  const [quickAnamnese,  setQuickAnamnese]  = useState({
    objetivoAvaliacao: '', descricaoDemanda: '', infoGerais: '',
    relacionamentos: '', vidaAcademicaLaboral: '', saudeAntecedentes: '',
    historiaClinicaAtual: '', habitosVida: '', historiaNeuropsicologica: '',
    queixasCognitivas: '', comportamentoObservacional: '',
  })
  const [savingQuick, setSavingQuick] = useState(false)
  const reportRef = useRef(null)

  const isSupervisor   = user?.role === 'admin' || user?.role === 'supervisor'
  const isEntregador   = user?.role === 'entregador'
  const isProfessional = user?.role === 'professional' || user?.role === 'entregador'

  const [corrSaving, setCorrSaving] = useState(false)

  const session = useTestSession(patientId)

  useEffect(() => {
    if (!user) return
    const canViewAll = user.role === 'admin' || user.role === 'supervisor' || user.role === 'entregador'
    const isProfRole = user.role === 'professional'
    const base = collection(db, 'patients')

    if (isProfRole) {
      // Busca pacientes via correcoes; se não houver vínculo, mostra todos (busca livre)
      getDocs(query(collection(db, 'correcoes'), where('profissionalUid', '==', user.id)))
        .then(async corrSnap => {
          const codes = [...new Set(corrSnap.docs.map(d => d.data().pacienteCodigo).filter(Boolean))]
          if (codes.length === 0) {
            // Sem vínculo via correcoes — carrega todos os pacientes para busca livre
            const snap = await getDocs(query(base, orderBy('createdAt', 'desc')))
              .catch(() => getDocs(base))
            setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            return
          }
          const all = []
          for (let i = 0; i < codes.length; i += 30) {
            const snap = await getDocs(query(base, where('prodoctor_id', 'in', codes.slice(i, i + 30))))
            all.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })))
          }
          setPatients(all)
        })
        .catch(() => setPatients([]))
      return
    }

    const q = canViewAll
      ? query(base, orderBy('createdAt', 'desc'))
      : query(base, where('createdBy', '==', user.id), orderBy('createdAt', 'desc'))
    getDocs(q)
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {
        const qFallback = canViewAll ? base : query(base, where('createdBy', '==', user.id))
        getDocs(qFallback).then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      })
  }, [user])

  // ── Auto-seleciona paciente quando vem do PainelLaudos ──────────────────────
  useEffect(() => {
    const pid = location.state?.patientId
    if (!pid) return
    setPatientId(pid)
    getDoc(doc(db, 'patients', pid)).then(snap => {
      if (!snap.exists()) return
      setPatients(prev => prev.some(p => p.id === pid) ? prev : [{ id: snap.id, ...snap.data() }, ...prev])
    }).catch(() => {})
  }, [location.state?.patientId])

  // ── Detecção de anamnese ao trocar de paciente ───────────────────────────────
  useEffect(() => {
    if (!patientId || (!isSupervisor && !isProfessional)) { setAnamneseStatus('idle'); return }
    setAnamneseStatus('loading')
    getDoc(doc(db, 'anamneses', patientId))
      .then(snap => {
        const data = snap.exists() ? snap.data() : {}
        const hasContent = !!(
          data.objetivoAvaliacao || data.objetivo_avaliacao || data.motivo_encaminhamento ||
          data.descricaoDemanda  || data.queixas || data.queixas_cognitivas_emocionais ||
          data.relacionamentos   || data.vidaAcademicaLaboral || data.historicoSaude ||
          data.estado_civil      || data.profissao || data.doencas_preexistentes?.length
        )
        if (hasContent) {
          setAnamneseStatus('found')
        } else {
          setAnamneseStatus('empty')
          // Pré-popula com o que existir no Firestore — nunca deixa em branco
          setQuickAnamnese({
            objetivoAvaliacao:         data.objetivoAvaliacao || data.objetivo_avaliacao || data.motivo_encaminhamento || '',
            descricaoDemanda:          data.descricaoDemanda  || data.queixas || data.queixas_cognitivas_emocionais || '',
            infoGerais:                data.infoGerais || '',
            relacionamentos:           data.relacionamentos || '',
            vidaAcademicaLaboral:      data.vidaAcademicaLaboral || '',
            saudeAntecedentes:         data.saudeAntecedentes || data.historicoSaude || '',
            historiaClinicaAtual:      data.historiaClinicaAtual || data.desenvolvimento_sintomas || '',
            habitosVida:               data.habitosVida || '',
            historiaNeuropsicologica:  data.historiaNeuropsicologica || '',
            queixasCognitivas:         data.queixasCognitivas || data.queixas_cognitivas_emocionais || '',
            comportamentoObservacional: data.comportamentoObservacional || data.observacoes_comportamentais || '',
          })
        }
      })
      .catch(() => setAnamneseStatus('empty'))
  }, [patientId, isSupervisor])

  useEffect(() => {
    if (!patientId || !user) return
    session.loadSession()
    // Resetar estado antes de carregar novo paciente
    setReport(''); setReportStatus('rascunho'); setSaved(false)
    setSavedReportId(null); setApprovalInfo(null); setReportLoading(true)
    // Carrega o laudo mais recente salvo para este paciente
    ;(async () => {
      try {
        const base = collection(db, 'reports')
        const q = query(base, where('patientId', '==', patientId), limit(20))
        const snap = await getDocs(q)
        if (!snap.empty) {
          // Para entregador: filtra apenas aprovados localmente (evita índice composto)
          const sorted = snap.docs
            .filter(d => !d.data().deleted && (!isEntregador || d.data().status === 'aprovado'))
            .sort((a, b) => {
              const aData = a.data()
              const bData = b.data()
              const aApproved = aData.status === 'aprovado' ? 1 : 0
              const bApproved = bData.status === 'aprovado' ? 1 : 0
              if (bApproved !== aApproved) return bApproved - aApproved
              const aT = aData.updatedAt?.seconds ?? aData.createdAt?.seconds ?? 0
              const bT = bData.updatedAt?.seconds ?? bData.createdAt?.seconds ?? 0
              return bT - aT
            })
          if (sorted.length > 0) {
            const d = sorted[0]
            const data = d.data()
            setReport(data.reportHtml || '')
            setSelectedTests(data.selectedTests || [])
            setReportStatus(data.status || 'rascunho')
            setSavedReportId(d.id)
            setSaved(true)
            if (data.aiBodyHtml)  setAiBodyState(stripMdFences(data.aiBodyHtml))
            if (data.appliedBy)   setAppliedBy(data.appliedBy)
            if (data.reportDate)  setReportDate(data.reportDate)
            if (data.supervisor_approval) setApprovalInfo(data.supervisor_approval)
          }
        }
      } catch (e) {
        console.error('[loadLatestReport]', e)
      } finally {
        setReportLoading(false)
      }
    })()
  }, [patientId, user])

  const toggleTest = (key) =>
    setSelectedTests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const patient = patients.find(p => p.id === patientId)

  const saveQuickAnamnese = async () => {
    if (!patientId) return
    setSavingQuick(true)
    try {
      await setDoc(doc(db, 'anamneses', patientId), {
        ...quickAnamnese,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setAnamneseStatus('found')
    } catch (e) { console.error('[saveQuickAnamnese]', e) }
    finally { setSavingQuick(false) }
  }

  const generate = async () => {
    if (!patientId)               return setError('Selecione um paciente.')
    if (selectedTests.length === 0) return setError('Selecione ao menos um teste.')
    setError('')
    setLoading(true)
    setSaved(false)
    setReport('')

    try {
      setStep(0)
      // Fonte de dados — SEMPRE lê do Firestore pelo patientId selecionado
      // NUNCA usar session.session?.tests — pode conter dados de outro paciente carregado antes
      let ad = {}
      let td = {}
      // Fonte 1: sessão legada do usuário (menor prioridade)
      if (patientId && user?.id) {
        try {
          const snap = await getDoc(doc(db, 'sessions', `${patientId}_${user.id}`))
          if (snap.exists()) td = mergeTests(td, snap.data().tests || {})
        } catch (_) {}
      }
      // Fonte 2: sessão principal (prioridade máxima — sobrescreve legado)
      if (patientId) {
        try {
          const mainSnap = await getDoc(doc(db, 'sessions', patientId))
          if (mainSnap.exists()) {
            const mainData = mainSnap.data()
            td = mergeTests(td, mainData.tests || {})
            if (mainData.anamnesis && Object.keys(mainData.anamnesis).length > 0) {
              ad = { ...ad, ...mainData.anamnesis }
            }
          }
        } catch (_) {}
      }
      setStep(1)
      // Coleção anamneses/{patientId} — prioridade máxima se existir
      if (patientId) {
        try {
          const aSnap = await getDoc(doc(db, 'anamneses', patientId))
          if (aSnap.exists()) ad = { ...ad, ...aSnap.data() }
        } catch (_) {}
      }
      console.log('[generate] td keys:', Object.keys(td))
      const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      const professional  = appliedBy || user?.full_name || 'Profissional responsável'

      setStep(2)
      // Geração determinística — blocos validados da planilha via generateTextoConclusao
      setStep(3)
      const aiBody = buildAiBodyFromData(patient, ad, td) || ''
      setAiBodyState(aiBody)
      setReportDate(dataFormatada)

      setStep(4)
      const fullDoc = buildFullDocument({ patient, selectedTests, appliedBy, user, ad, td, aiBody, dataFormatada })
      setReport(fullDoc)
      const reportId = await session.saveReport(fullDoc, selectedTests)
      if (reportId) {
        setSaved(true)
        setSavedReportId(reportId)
        setReportStatus('rascunho')
        setApprovalInfo(null)
        updateDoc(doc(db, 'reports', reportId), {
          aiBodyHtml: aiBody,
          appliedBy: professional,
          reportDate: dataFormatada,
          testsData: td,
        }).catch(() => {})
        logAction(user, 'laudo_gerado', { patientId, reportId, testes: selectedTests })
      } else {
        // Save falhou — avisa o usuário para não fechar a página
        setError('⚠️ Laudo gerado mas NÃO SALVO no servidor. Não feche esta página. Tente clicar em "Salvar rascunho" ou recarregue e gere novamente.')
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

  const validateLaudo = (html) => {
    const errors = []
    const textOf = (start, end) =>
      html.substring(start, end > start ? end : start + 2000)
        .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

    if (!html.includes('DADOS DO PACIENTE'))
      errors.push({ section: 'Dados do Paciente', msg: 'seção ausente' })

    const aIdx = html.indexOf('ANAMNESE')
    const procIdx = html.indexOf('PROCEDIMENTO')
    if (aIdx === -1) {
      errors.push({ section: 'Anamnese', msg: 'seção ausente — preencha os dados clínicos do paciente' })
    } else {
      const aText = textOf(aIdx, procIdx > aIdx ? procIdx : 0).replace(/ANAMNESE/g, '').trim()
      if (aText.length < 80)
        errors.push({ section: 'Anamnese', msg: 'sem conteúdo — preencha os campos da anamnese' })
    }

    if (!html.includes('PROCEDIMENTO'))
      errors.push({ section: 'Procedimento', msg: 'seção ausente — selecione os testes aplicados' })

    const hasAnalise = ['ANÁLISE DAS QUEIXAS', 'cognitiv', 'funções executiv', 'memória', 'atenção']
      .some(m => html.toLowerCase().includes(m.toLowerCase()))
    if (!hasAnalise)
      errors.push({ section: 'Análise Neuropsicológica', msg: 'texto clínico ausente — gere o laudo com IA' })

    const cIdx = html.indexOf('CONCLUS')
    if (cIdx === -1) {
      errors.push({ section: 'Conclusão', msg: 'seção ausente' })
    } else {
      const refsIdx = html.indexOf('REFERÊNCI', cIdx)
      const cText = textOf(cIdx, refsIdx > cIdx ? refsIdx : 0)
        .replace(/CONCLUS[ÃA]O/gi, '').trim()
      if (cText.length < 80)
        errors.push({ section: 'Conclusão', msg: 'seção vazia — adicione o texto de conclusão' })
    }

    return errors
  }

  const handleReportEdit = () => {
    if (!reportRef.current) return
    const newHtml = reportRef.current.innerHTML
    // Backup imediato no localStorage (sem re-render — zero risco de apagar conteúdo)
    try { localStorage.setItem('neuroclin_report_draft_' + (savedReportId || patientId), newHtml) } catch (_) {}
    // Debounce Firestore — só altera autoSaveStatus (re-render leve, não toca em html nem editMode)
    setAutoSaveStatus('saving')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      if (savedReportId) {
        try {
          await updateDoc(doc(db, 'reports', savedReportId), {
            reportHtml: newHtml,
            updatedAt: serverTimestamp(),
          })
        } catch (e) { console.warn('[autosave]', e) }
      }
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2500)
    }, 1200)
  }

  // Captura conteúdo ao sair; carrega do Firestore ao entrar para garantir edições salvas
  const handleToggleEditMode = async () => {
    if (editMode && reportRef.current) {
      const captured = reportRef.current.innerHTML
      setReport(captured)
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      if (savedReportId) {
        updateDoc(doc(db, 'reports', savedReportId), {
          reportHtml: captured,
          updatedAt: serverTimestamp(),
        }).catch(e => console.warn('[save-on-exit]', e))
      }
      setEditMode(false)
    } else {
      // Ao entrar: carrega conteúdo mais recente do Firestore para não perder edições
      if (savedReportId) {
        try {
          const snap = await getDoc(doc(db, 'reports', savedReportId))
          if (snap.exists() && snap.data().reportHtml && snap.data().reportHtml.length > 100) {
            setReport(snap.data().reportHtml)
          }
        } catch (_) {}
      }
      setEditMode(true)
    }
  }

  const print = async (contentOverride) => {
    // contentOverride pode ser um MouseEvent se chamado via onClick={print} — ignorar nesse caso
    const isValidHtml = typeof contentOverride === 'string' && contentOverride.length > 100
    let content = isValidHtml ? contentOverride : getReportContent()
    // Laudo APROVADO: Firestore é a fonte de verdade — nunca usa estado local
    if (!isValidHtml && reportStatus === 'aprovado' && savedReportId) {
      try {
        const snap = await getDoc(doc(db, 'reports', savedReportId))
        if (snap.exists() && snap.data().reportHtml && snap.data().reportHtml.length > 100)
          content = snap.data().reportHtml
      } catch (_) {}
    }
    // Fallback Firestore se conteúdo local estiver vazio
    if (!content || content.length < 100) {
      if (savedReportId) {
        try {
          const snap = await getDoc(doc(db, 'reports', savedReportId))
          if (snap.exists()) content = snap.data().reportHtml || ''
        } catch (_) {}
      }
    }
    // Fallback localStorage como último recurso
    if (!content || content.length < 100) {
      try {
        const lsDraft = localStorage.getItem('neuroclin_report_draft_' + (savedReportId || patientId))
        if (lsDraft && lsDraft.length > 100) content = lsDraft
      } catch (_) {}
    }
    if (!content || content.length < 100) {
      alert('Conteúdo do laudo não encontrado. Tente recarregar a página.')
      return
    }
    // Atualiza informante/medicamentos com dados frescos do Firestore antes de imprimir
    if (patientId) {
      try {
        const aSnap = await getDoc(doc(db, 'anamneses', patientId))
        if (aSnap.exists()) content = patchAnamneseFields(content, aSnap.data())
      } catch (_) {}
    }
    // Validação obrigatória antes de imprimir
    const errors = validateLaudo(content)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8">
  <base href="${window.location.origin}/">
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

  const requestApproval = async () => {
    if (!savedReportId) return
    try {
      await updateDoc(doc(db, 'reports', savedReportId), {
        status: 'aguardando_aprovacao',
        updatedAt: serverTimestamp(),
      })
      setReportStatus('aguardando_aprovacao')
      // Se veio do PainelLaudos, atualiza status lá para 'aguardando_supervisao'
      const painelData = location.state?.painelData
      if (painelData?.paciente && painelData?.data) {
        const payload = encodeURIComponent(JSON.stringify({
          paciente: painelData.paciente,
          data:     painelData.data,
          status:   'aguardando_supervisao',
          updatedBy: user?.email || 'neuroclin',
        }))
        fetch(`${GAS_URL_PAINEL}?action=savelaudostatus&data=${payload}`).catch(() => {})
      }
    } catch (e) {
      console.error(e)
    }
  }

  const confirmCorrectionEntrega = async () => {
    if (!savedReportId) return
    setCorrSaving(true)
    try {
      const content = getReportContent() || report
      await updateDoc(doc(db, 'reports', savedReportId), { reportHtml: content, updatedAt: serverTimestamp() })
      setReport(content)
      setEditMode(false)
      logAction(user, 'laudo_corrigido_entrega',  { patientId, reportId: savedReportId })
      logAction(user, 'laudo_aprovado_entregador', { patientId, reportId: savedReportId })
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setCorrSaving(false)
    }
  }

  const reopenReport = async () => {
    if (!savedReportId || !isSupervisor) return
    setReopenLoading(true)
    try {
      const u = auth.currentUser
      if (!u?.email) { setReopenError('Sessão inválida. Faça login novamente.'); setReopenLoading(false); return }
      const cred = EmailAuthProvider.credential(u.email, reopenPassword)
      await reauthenticateWithCredential(u, cred)
      await updateDoc(doc(db, 'reports', savedReportId), {
        status: 'rascunho',
        supervisor_approval: null,
        reopenedAt: serverTimestamp(),
        reopenedBy: user?.id || '',
        updatedAt: serverTimestamp(),
      })
      setReportStatus('rascunho')
      setApprovalInfo(null)
      setEditMode(true)
      setReopenModal(false)
      setReopenPassword('')
      setReopenError('')
      logAction(user, 'laudo_reaberto', {
        patientId,
        reportId: savedReportId,
        authorizedBy: user?.full_name || user?.id,
      })
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials') {
        setReopenError('Senha incorreta.')
      } else {
        setReopenError('Erro ao verificar: ' + e.message)
      }
    } finally {
      setReopenLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!isSupervisor) return
    // Cancela autosave pendente para não sobrescrever o laudo aprovado no Firestore
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setApprovalLoading(true)
    try {
      const now = new Date()
      const approval = {
        approved: true,
        supervisor_name: user?.full_name || SUPERVISOR.name,
        supervisor_id: user?.id || '',
        approval_date: now.toISOString(),
      }

      // Rebuild document HTML with approval stamp embedded
      const patient   = patients.find(p => p.id === patientId)
      let ad          = session.session?.anamnesis || {}
      if (patientId) {
        try {
          const aSnap = await getDoc(doc(db, 'anamneses', patientId))
          if (aSnap.exists()) ad = { ...ad, ...aSnap.data() }
        } catch (_) {}
      }

      // Carrega td de múltiplas fontes com deep merge por teste (preserva itens individuais)
      let td = session.session?.tests || {}
      if (patientId && user?.id) {
        try {
          const snap = await getDoc(doc(db, 'sessions', `${patientId}_${user.id}`))
          if (snap.exists()) td = mergeTests(snap.data().tests || {}, td)
        } catch (_) {}
      }
      if (patientId) {
        try {
          const mainSnap = await getDoc(doc(db, 'sessions', patientId))
          if (mainSnap.exists()) td = mergeTests(mainSnap.data().tests || {}, td)
        } catch (_) {}
      }
      let isReapproval = false
      if (savedReportId) {
        try {
          const repSnap = await getDoc(doc(db, 'reports', savedReportId))
          if (repSnap.exists()) {
            if (repSnap.data().testsData) td = mergeTests(repSnap.data().testsData, td)
            isReapproval = !!repSnap.data().reopenedAt
          }
        } catch (_) {}
      }

      // Usar o HTML atual do laudo como base (preserva edições do admin)
      // Injetar o carimbo de aprovação em vez de reconstruir do zero
      let baseHtml = getReportContent() || report || ''
      // Fallback Firestore se conteúdo local estiver vazio
      if ((!baseHtml || baseHtml.length < 100) && savedReportId) {
        try {
          const baseSnap = await getDoc(doc(db, 'reports', savedReportId))
          if (baseSnap.exists()) baseHtml = baseSnap.data().reportHtml || ''
        } catch (_) {}
      }
      // Atualiza informante/medicamentos com dados frescos do Firestore
      baseHtml = patchAnamneseFields(baseHtml, ad)

      const stampHtml = `
<div contenteditable="false" style="margin-top:28px;border:2px solid #2E7D32;border-radius:6px;padding:18px 24px;text-align:center;background:rgba(46,125,50,0.04);-webkit-print-color-adjust:exact;print-color-adjust:exact;user-select:none;cursor:default;">
  <div style="font-size:10px;font-weight:800;color:#1A3D2B;letter-spacing:0.12em;margin-bottom:10px;text-transform:uppercase;">✓ Laudo Aprovado pelo Supervisor Técnico</div>
  <div style="font-size:14px;font-weight:800;color:#1A3D2B;">${approval.supervisor_name || SUPERVISOR.name}</div>
  <div style="font-size:11px;color:#555;margin-top:3px;">${SUPERVISOR.crp} — Neuropsicólogo · Supervisor Técnico · Diretor Clínico</div>
  <div style="font-size:11px;color:#555;margin-top:2px;">Aprovado em: ${new Date(approval.approval_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  <div style="margin-top:10px;display:inline-block;border:1.5px solid #2E7D32;border-radius:4px;padding:6px 18px;">
    <div style="font-size:10px;font-weight:800;color:#2E7D32;letter-spacing:0.06em;">NEUROAVALIAÇÃO ME</div>
    <div style="font-size:9px;color:#666;margin-top:2px;">CRPJ 06/6481 &nbsp;|&nbsp; CNES 49795 &nbsp;|&nbsp; CNPJ 29.313.355/0001-12</div>
  </div>
</div>`

      let updatedDoc
      const approvalMarker = '<!-- APROVAÇÃO DO SUPERVISOR -->'
      const refsMarker     = '<!-- REFERÊNCIAS -->'
      if (baseHtml.includes(approvalMarker) && baseHtml.includes(refsMarker)) {
        // Injeta carimbo preservando edições — substitui seção inteira entre os marcadores
        updatedDoc = baseHtml.replace(
          new RegExp(approvalMarker + '[\\s\\S]*?' + refsMarker),
          approvalMarker + '\n' + stampHtml + '\n\n' + refsMarker
        )
      } else {
        // Fallback: reconstrói do zero (laudo antigo sem marcadores)
        updatedDoc = buildFullDocument({
          patient, selectedTests, appliedBy, user, ad, td,
          aiBody: aiBodyState,
          dataFormatada: reportDate || new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
          approvalInfo: approval,
        })
      }
      setReport(updatedDoc)

      if (savedReportId) {
        await updateDoc(doc(db, 'reports', savedReportId), {
          status: 'aprovado',
          supervisor_approval: approval,
          reportHtml: updatedDoc,
          reopenedAt: null,
          reopenedBy: null,
          updatedAt: serverTimestamp(),
        })
      }
      setApprovalInfo(approval)
      setReportStatus('aprovado')
      logAction(user, isReapproval ? 'laudo_reaprovado' : 'laudo_aprovado', { patientId, reportId: savedReportId })
      setTimeout(() => print(updatedDoc), 500)
    } catch (e) {
      console.error('[handleApprove]', e)
      const msg = typeof e?.message === 'string' ? e.message : (e?.code || String(e) || 'erro desconhecido')
      alert('Erro ao aprovar: ' + msg)
    } finally {
      setApprovalLoading(false)
    }
  }

  const groups = [...new Set(TESTS_LIST.map(t => t.group))]

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>LAUDOS</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>
          {isEntregador ? 'Laudos aprovados para entrega' : 'Geração de laudos clínicos neuropsicológicos'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.7fr', gap: 16 }}>

        {/* Painel esquerdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {!isEntregador && (
            <div style={{ background: S.cardG, borderRadius: 10, border: '1px solid rgba(46,125,50,0.3)', padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>SUPERVISÃO</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{SUPERVISOR.name}</div>
              <div style={{ fontSize: 11, color: S.greenL, marginTop: 2 }}>{SUPERVISOR.crp}</div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>{SUPERVISOR.clinic}</div>
            </div>
          )}

          <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
            <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>1. PACIENTE</div>
            <PatientSearchInput
              patients={patients}
              value={patientId}
              onChange={id => setPatientId(id)}
            />
            {patient && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(46,125,50,0.1)', borderRadius: 6, fontSize: 11, color: S.greenL }}>
                {patient.birth_date && `${new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos`}
                {patient.sex ? ` · ${patient.sex}` : ''}
                {patient.education ? ` · ${patient.education}` : ''}
              </div>
            )}
          </div>

          {patientId && !isEntregador && <TestStatusPanel sessionTests={session.session?.tests} patientName={patient?.full_name} />}

          {/* ── Painel de anamnese ─────────────────────────────────────────── */}
          {patientId && (isSupervisor || isProfessional) && anamneseStatus !== 'idle' && (
            <div style={{
              background: S.card, borderRadius: 10, padding: '12px 14px',
              border: `1px solid ${anamneseStatus === 'found' ? 'rgba(46,125,50,0.4)' : anamneseStatus === 'empty' ? 'rgba(245,158,11,0.4)' : S.border}`,
            }}>
              {anamneseStatus === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: S.muted }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Verificando anamnese...
                </div>
              )}
              {anamneseStatus === 'found' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: S.greenL, fontWeight: 700 }}>
                  <CheckCircle2 size={13} /> Anamnese completa encontrada — será incluída no laudo
                </div>
              )}
              {anamneseStatus === 'empty' && (
                <div>
                  <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>
                    ⚠ ANAMNESE NÃO ENCONTRADA — preencha rapidamente para o laudo
                  </div>
                  {[
                    ['Objetivo da avaliação', 'objetivoAvaliacao'],
                    ['Descrição da demanda', 'descricaoDemanda'],
                    ['Informações gerais (texto corrido)', 'infoGerais'],
                    ['Saúde e antecedentes familiares', 'saudeAntecedentes'],
                    ['História clínica atual', 'historiaClinicaAtual'],
                    ['Hábitos de vida', 'habitosVida'],
                    ['História neuropsicológica', 'historiaNeuropsicologica'],
                    ['Queixas cognitivas relatadas', 'queixasCognitivas'],
                    ['Comportamento observacional', 'comportamentoObservacional'],
                  ].map(([label, key]) => (
                    <div key={key} style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 10, color: S.muted, fontWeight: 700, display: 'block', marginBottom: 3 }}>
                        {label.toUpperCase()}
                      </label>
                      <textarea
                        value={quickAnamnese[key]}
                        onChange={e => setQuickAnamnese(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical', fontSize: 12 }}
                        placeholder={`${label}...`}
                      />
                    </div>
                  ))}
                  <button
                    onClick={saveQuickAnamnese}
                    disabled={savingQuick}
                    style={{
                      width: '100%', padding: '8px', borderRadius: 7, border: 'none',
                      background: savingQuick ? 'rgba(46,125,50,0.4)' : S.green,
                      color: '#fff', fontSize: 12, fontWeight: 700, cursor: savingQuick ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {savingQuick
                      ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                      : <><CheckCircle2 size={12} /> Salvar anamnese</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {isEntregador && patientId && reportLoading && (
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${S.border}`, borderRadius: 10, fontSize: 12, color: S.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Buscando laudo aprovado...
            </div>
          )}
          {isEntregador && patientId && !reportLoading && reportStatus !== 'aprovado' && (
            <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, fontSize: 12, color: '#F59E0B' }}>
              Nenhum laudo aprovado encontrado para este paciente.
            </div>
          )}

          {!isEntregador && <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px' }}>
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
          </div>}

          {!isEntregador && error && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!isEntregador && <button onClick={generate} disabled={loading} style={{
            padding: '13px', borderRadius: 10, border: 'none',
            background: loading ? 'rgba(46,125,50,0.4)' : S.green,
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: '0.04em',
          }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {STEPS[step]}</>
              : <><FileText size={16} /> GERAR LAUDO</>}
          </button>}
        </div>

        {/* Painel direito — laudo */}
        <div style={{
          background: S.card,
          border: `1px solid ${S.border}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...(editMode
            ? { position: 'fixed', inset: 0, zIndex: 999, borderRadius: 0 }
            : { borderRadius: 10 }),
        }}>
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
              {/* Indicador de autosave */}
              {editMode && autoSaveStatus === 'saving' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: S.muted }}>
                  <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...
                </span>
              )}
              {editMode && autoSaveStatus === 'saved' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: S.greenL }}>
                  <CheckCircle2 size={10} /> Salvo ✓
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Editar na tela — oculto quando laudo está aprovado */}
              {report && reportStatus !== 'aprovado' && (
                <button onMouseDown={e => { e.preventDefault(); handleToggleEditMode() }} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: `1px solid ${editMode ? 'rgba(96,165,250,0.7)' : S.border}`, background: editMode ? 'rgba(96,165,250,0.18)' : 'transparent', cursor: 'pointer', color: editMode ? '#60A5FA' : S.muted }}>
                  <Pencil size={12} /> {editMode ? '✕  SAIR DA EDIÇÃO' : 'EDITAR'}
                </button>
              )}
              {/* Indicador de somente leitura — laudo aprovado aguardando autorização */}
              {report && reportStatus === 'aprovado' && !editMode && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: S.muted, padding: '5px 10px', borderRadius: 7, border: `1px solid ${S.border}` }}>
                  <Lock size={11} /> SOMENTE LEITURA
                </span>
              )}
              {/* Enviar para aprovação — professional */}
              {savedReportId && isProfessional && reportStatus === 'rascunho' && (
                <button onClick={requestApproval} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#2E7D32', cursor: 'pointer', color: '#fff' }}>
                  <Send size={12} /> ENVIAR PARA APROVAÇÃO
                </button>
              )}
              {/* Solicitar aprovação — demais não-supervisores (exceto professional e entregador) */}
              {savedReportId && !isSupervisor && !isProfessional && !isEntregador && reportStatus === 'rascunho' && (
                <button onClick={requestApproval} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', cursor: 'pointer', color: '#F59E0B' }}>
                  <Send size={12} /> SOLICITAR APROVAÇÃO
                </button>
              )}
              {/* Aprovar — supervisor, laudo aguardando ou em rascunho — aprovação direta sem modal */}
              {savedReportId && isSupervisor && reportStatus !== 'aprovado' && (
                <button onClick={handleApprove} disabled={approvalLoading} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(46,125,50,0.4)', background: approvalLoading ? 'rgba(46,125,50,0.05)' : 'rgba(46,125,50,0.1)', cursor: approvalLoading ? 'not-allowed' : 'pointer', color: S.greenL }}>
                  {approvalLoading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Aprovando...</> : <><ShieldCheck size={13} /> APROVAR LAUDO</>}
                </button>
              )}
              {/* Entregador — botão CORRIGIR (abre modo edição) */}
              {report && savedReportId && isEntregador && reportStatus === 'aprovado' && !editMode && (
                <button onClick={() => handleToggleEditMode()} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.1)', cursor: 'pointer', color: '#FBBF24' }}>
                  <Pencil size={12} /> CORRIGIR LAUDO
                </button>
              )}
              {/* Entregador — confirmação após editar */}
              {isEntregador && editMode && (
                <button onClick={confirmCorrectionEntrega} disabled={corrSaving} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: 'none', background: corrSaving ? 'rgba(46,125,50,0.4)' : '#2E7D32', cursor: 'pointer', color: '#fff' }}>
                  {corrSaving ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><CheckCircle2 size={12} /> CONFIRMAR CORREÇÃO</>}
                </button>
              )}
              {/* Reabrir laudo aprovado — apenas admin/supervisor, exige senha */}
              {savedReportId && isSupervisor && reportStatus === 'aprovado' && (
                <button onClick={() => { setReopenModal(true); setReopenPassword(''); setReopenError('') }} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)', cursor: 'pointer', color: '#F59E0B' }}>
                  <LockOpen size={13} /> REABRIR LAUDO
                </button>
              )}
              {/* Imprimir — oculto para professional */}
              {report && !isProfessional && (
                <button onClick={() => print()} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: `1px solid ${S.border}`, background: 'transparent', cursor: 'pointer', color: S.greenL }}>
                  <Download size={13} /> IMPRIMIR / PDF
                </button>
              )}
            </div>
          </div>

          {/* Modal — reabrir laudo aprovado com senha */}
          {reopenModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(4,44,83,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ background: '#1A2744', borderRadius: 14, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LockOpen size={15} /> Reabrir laudo aprovado
                  </span>
                  <button onClick={() => setReopenModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, marginBottom: 18, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                    <strong style={{ color: '#F59E0B' }}>Atenção:</strong> Este laudo já foi aprovado e entregue. O conteúdo atual será preservado. Para realizar alterações, é necessária autorização do Administrador.
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                      <Lock size={11} /> SUA SENHA DE LOGIN
                    </label>
                    <input
                      type="password"
                      value={reopenPassword}
                      onChange={e => { setReopenPassword(e.target.value); setReopenError('') }}
                      onKeyDown={e => e.key === 'Enter' && reopenReport()}
                      placeholder="Digite a senha para autorizar..."
                      autoFocus
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${reopenError ? '#EF4444' : 'rgba(255,255,255,0.12)'}`, background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                    {reopenError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 5 }}>{reopenError}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setReopenModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={reopenReport} disabled={reopenLoading || !reopenPassword} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: reopenLoading ? 'rgba(245,158,11,0.4)' : '#F59E0B', color: '#1A2744', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: !reopenPassword ? 0.5 : 1 }}>
                      {reopenLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Autorizando...</> : <><LockOpen size={12} /> Autorizar e reabrir</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Erros de validação — bloqueia PDF */}
          {validationErrors.length > 0 && (
            <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.09)', borderBottom: '1px solid rgba(239,68,68,0.28)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <AlertCircle size={13} color='#EF4444' />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>PDF bloqueado — seções obrigatórias incompletas:</span>
              </div>
              {validationErrors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: '#EF4444', paddingLeft: 19, marginBottom: 2 }}>
                  • <strong>{e.section}</strong> — {e.msg}
                </div>
              ))}
            </div>
          )}

          {editMode && <FormatToolbar />}

          <div style={{ flex: 1, padding: editMode ? '20px 60px' : 20, overflowY: 'auto', ...(editMode ? {} : { maxHeight: '70vh' }) }}>
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
              <ReportBody html={report} editMode={editMode} reportRef={reportRef} onEdit={handleReportEdit} />
            )}
          </div>
        </div>
      </div>


      <style>{`@keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(46,125,50,0.6) !important; }
      `}</style>
    </div>
  )
}
