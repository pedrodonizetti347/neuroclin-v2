import React, { useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'
import { useSearchParams } from 'react-router-dom'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { useTestSession } from '@/hooks/useTestSession'
import TestScanUpload from '@/components/tests/TestScanUpload'
import TestStatusPanel from '@/components/tests/TestStatusPanel'
import { FlaskConical, CheckCircle2, Save, Camera, Lock, LockOpen } from 'lucide-react'

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

// ─── Badge ────────────────────────────────────────────────────────────────────
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

// ─── Classify ─────────────────────────────────────────────────────────────────
const classify = {
  fab: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 15) return { label: 'PRESERVADO', type: 'preserved' }
    if (v >= 12) return { label: 'LIMÍTROFE', type: 'borderline' }
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
    if (v <= 10) return { label: 'LEVE', type: 'borderline' }
    if (v <= 14) return { label: 'MODERADO', type: 'impaired' }
    return { label: 'GRAVE', type: 'impaired' }
  },
  gai: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v <= 9) return { label: 'NORMAL', type: 'preserved' }
    return { label: 'PROVÁVEL ANSIEDADE', type: 'impaired' }
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
    if (v <= 3.38) return { label: 'SEM DECLÍNIO', type: 'preserved' }
    if (v <= 3.6)  return { label: 'INDETERMINADO', type: 'borderline' }
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
    if (v <= 4) return { label: 'NORMAL', type: 'preserved' }
    return { label: 'COMPROMETIMENTO FUNCIONAL', type: 'impaired' }
  },
  lawton: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v === 27) return { label: 'INDEPENDENTE', type: 'preserved' }
    if (v >= 18)  return { label: 'DEPENDÊNCIA LEVE', type: 'borderline' }
    if (v >= 9)   return { label: 'DEPENDÊNCIA MODERADA/GRAVE', type: 'impaired' }
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
    if (v >= -1.0) return { label: 'PRESERVADO', type: 'preserved' }
    if (v >= -1.5) return { label: 'LIMÍTROFE', type: 'borderline' }
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
  wcst_pe: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v <= 10) return { label: 'PRESERVADO', type: 'preserved' }
    if (v <= 16) return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'COMPROMETIDO', type: 'impaired' }
  },
  wcst_break: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v === 0) return { label: 'PRESERVADO', type: 'preserved' }
    if (v <= 2)  return { label: 'LIMÍTROFE', type: 'borderline' }
    return { label: 'COMPROMETIDO', type: 'impaired' }
  },
  dex: (n) => {
    if (n === '' || n == null) return null
    const mean = Number(n) / 20
    if (mean <= 1.5) return { label: 'SEM ALTERAÇÃO', type: 'preserved' }
    if (mean <= 2.5) return { label: 'COMPROMETIMENTO LEVE', type: 'borderline' }
    return { label: 'COMPROMETIMENTO SIGNIFICATIVO', type: 'impaired' }
  },
  token: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 29) return { label: 'NORMAL', type: 'preserved' }
    if (v >= 25) return { label: 'LEVE', type: 'borderline' }
    if (v >= 20) return { label: 'MODERADO', type: 'impaired' }
    return { label: 'GRAVE', type: 'impaired' }
  },
  triacog: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 24) return { label: 'NORMAL', type: 'preserved' }
    return { label: 'SUGESTIVO DE COMPROMETIMENTO', type: 'impaired' }
  },
  bams_pct: (n) => {
    if (n === '' || n == null) return null
    const v = Number(n)
    if (v >= 25) return { label: 'PRESERVADO',             type: 'preserved',  interpretation: 'Normal' }
    if (v >= 10) return { label: 'LIMÍTROFE',              type: 'borderline', interpretation: 'Limítrofe' }
    if (v >= 5)  return { label: 'COMPROMETIMENTO LEVE',   type: 'impaired',   interpretation: 'Comprometimento leve' }
    if (v >= 2)  return { label: 'COMPROMETIMENTO MODERADO', type: 'impaired', interpretation: 'Comprometimento moderado' }
    return       { label: 'COMPROMETIMENTO GRAVE',         type: 'impaired',   interpretation: 'Comprometimento grave' }
  },
}

// ─── ScoreButtons — seletor min–max por item ─────────────────────────────────
function ScoreButtons({ value, onChange, max = 3, min = 0 }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(v => (
        <button key={v} type="button"
          onClick={() => onChange(value != null && Number(value) === v ? null : v)}
          style={{
          width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700,
          background: (value != null && Number(value) === v) ? S.green : 'rgba(255,255,255,0.08)',
          color:      (value != null && Number(value) === v) ? '#fff'  : S.muted,
        }}>{v}</button>
      ))}
    </div>
  )
}

// ─── NumField ─────────────────────────────────────────────────────────────────
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

// ─── RAVLT — lista padrão de reconhecimento (50 palavras) ────────────────────
// Lista de reconhecimento oficial — Vetor/Giunti, 50 palavras na ordem da folha de aplicação
// categoria: A=alvo, B=Lista B, SA=similar A, SB=similar B, FA=falso alarme, FB=falso alarme B
const DEFAULT_RAVLT_RECOGNITION = [
  // Coluna 1
  { palavra: 'LUA',    categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'GALO',   categoria: 'SB',    correta: false, marcada: false },
  { palavra: 'FOGO',   categoria: 'B',     correta: false, marcada: false },
  { palavra: 'CHAPÉU', categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'VASO',   categoria: 'B',     correta: false, marcada: false },
  { palavra: 'MESA',   categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'LAGO',   categoria: 'SB',    correta: false, marcada: false },
  { palavra: 'PORTA',  categoria: 'B',     correta: false, marcada: false },
  { palavra: 'DENTE',  categoria: 'SA',    correta: false, marcada: false },
  { palavra: 'RIO',    categoria: 'B',     correta: false, marcada: false },
  // Coluna 2
  { palavra: 'COR',    categoria: 'FA',    correta: false, marcada: false },
  { palavra: 'ÍNDIO',  categoria: 'B',     correta: false, marcada: false },
  { palavra: 'BALÃO',  categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'RUA',    categoria: 'FA',    correta: false, marcada: false },
  { palavra: 'PLANTA', categoria: 'SA/SB', correta: false, marcada: false },
  { palavra: 'ROUPA',  categoria: 'B',     correta: false, marcada: false },
  { palavra: 'CORPO',  categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'PATO',   categoria: 'B',     correta: false, marcada: false },
  { palavra: 'CESTA',  categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'LIVRO',  categoria: 'B',     correta: false, marcada: false },
  // Coluna 3
  { palavra: 'PONTO',  categoria: 'B',     correta: false, marcada: false },
  { palavra: 'FLOR',   categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'ISCA',   categoria: 'SA',    correta: false, marcada: false },
  { palavra: 'BOCA',   categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'CHUVA',  categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'CAIXA',  categoria: 'B',     correta: false, marcada: false },
  { palavra: 'ROSA',   categoria: 'SA',    correta: false, marcada: false },
  { palavra: 'CIRCO',  categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'CARRO',  categoria: 'B',     correta: false, marcada: false },
  { palavra: 'LÁPIS',  categoria: 'A',     correta: true,  marcada: false },
  // Coluna 4
  { palavra: 'VACA',   categoria: 'B',     correta: false, marcada: false },
  { palavra: 'SALA',   categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'FILHO',  categoria: 'SA/FA', correta: false, marcada: false },
  { palavra: 'BOLA',   categoria: 'SA',    correta: false, marcada: false },
  { palavra: 'AULA',   categoria: 'SA',    correta: false, marcada: false },
  { palavra: 'MILHO',  categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'BOLO',   categoria: 'SB',    correta: false, marcada: false },
  { palavra: 'PEIXE',  categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'BOTÃO',  categoria: 'FA',    correta: false, marcada: false },
  { palavra: 'LEITE',  categoria: 'SA',    correta: false, marcada: false },
  // Coluna 5
  { palavra: 'MEIA',   categoria: 'B',     correta: false, marcada: false },
  { palavra: 'JARDIM', categoria: 'SA',    correta: false, marcada: false },
  { palavra: 'SOFÁ',   categoria: 'B',     correta: false, marcada: false },
  { palavra: 'FESTA',  categoria: 'FA',    correta: false, marcada: false },
  { palavra: 'DOCE',   categoria: 'B',     correta: false, marcada: false },
  { palavra: 'SOL',    categoria: 'SA',    correta: false, marcada: false },
  { palavra: 'MÃE',    categoria: 'A',     correta: true,  marcada: false },
  { palavra: 'PAPEL',  categoria: 'FA',    correta: false, marcada: false },
  { palavra: 'MAR',    categoria: 'SB',    correta: false, marcada: false },
  { palavra: 'VENTO',  categoria: 'FB',    correta: false, marcada: false },
]

// ─── RAVLT — Normas por Faixa Etária (Manual RAVLT, Tabelas 15–26) ─────────
const RAVLT_NORMAS = {
  idade_6_8:    { faixa:'6–8 anos',   media:{a1:4.5,  a2:6.0,  a3:7.0,  a4:7.9,  a5:8.4,  b1:4.3,  a6:7.2,  a7:7.6,  reconhecimento:10.3, escoreTotal:33.7,  ALT:11.2,  velEsquecimento:1.09, intProativa:1.09, intRetroativa:0.87}, dp:{a1:1.9, a2:2.1, a3:2.5, a4:2.8, a5:2.8, b1:1.6, a6:2.7, a7:2.7, reconhecimento:6.9,  escoreTotal:9.9,  ALT:8.2, velEsquecimento:0.37, intProativa:0.55, intRetroativa:0.24} },
  idade_9_11:   { faixa:'9–11 anos',  media:{a1:5.4,  a2:7.1,  a3:8.2,  a4:9.2,  a5:10.0, b1:5.0,  a6:8.7,  a7:8.7,  reconhecimento:11.7, escoreTotal:39.9,  ALT:12.8,  velEsquecimento:1.03, intProativa:1.00, intRetroativa:0.91}, dp:{a1:1.8, a2:2.2, a3:2.8, a4:2.8, a5:2.7, b1:1.5, a6:2.7, a7:2.7, reconhecimento:5.5,  escoreTotal:10.1, ALT:8.1, velEsquecimento:0.25, intProativa:0.46, intRetroativa:0.38} },
  idade_12_14:  { faixa:'12–14 anos', media:{a1:6.3,  a2:8.1,  a3:9.5,  a4:10.0, a5:10.9, b1:5.6,  a6:9.6,  a7:9.6,  reconhecimento:12.5, escoreTotal:44.8,  ALT:13.3,  velEsquecimento:1.01, intProativa:0.92, intRetroativa:0.91}, dp:{a1:1.7, a2:2.6, a3:2.9, a4:2.7, a5:2.5, b1:1.7, a6:2.2, a7:3.0, reconhecimento:5.0,  escoreTotal:9.6,  ALT:7.8, velEsquecimento:0.29, intProativa:0.28, intRetroativa:0.29} },
  idade_15_17:  { faixa:'15–17 anos', media:{a1:6.1,  a2:8.1,  a3:9.6,  a4:11.1, a5:11.6, b1:5.4,  a6:10.6, a7:10.5, reconhecimento:12.6, escoreTotal:46.4,  ALT:16.1,  velEsquecimento:1.01, intProativa:0.91, intRetroativa:0.93}, dp:{a1:1.4, a2:2.2, a3:2.4, a4:2.4, a5:2.3, b1:1.7, a6:2.5, a7:2.9, reconhecimento:3.1,  escoreTotal:8.6,  ALT:7.3, velEsquecimento:0.25, intProativa:0.27, intRetroativa:0.17} },
  idade_18_20:  { faixa:'18–20 anos', media:{a1:6.8,  a2:9.5,  a3:11.0, a4:11.8, a5:12.2, b1:6.3,  a6:11.1, a7:11.0, reconhecimento:10.0, escoreTotal:51.4,  ALT:17.3,  velEsquecimento:1.00, intProativa:0.96, intRetroativa:0.96}, dp:{a1:1.7, a2:2.2, a3:2.2, a4:2.4, a5:2.4, b1:1.8, a6:2.5, a7:2.7, reconhecimento:5.7,  escoreTotal:8.7,  ALT:7.3, velEsquecimento:0.20, intProativa:0.33, intRetroativa:0.68} },
  idade_21_30:  { faixa:'21–30 anos', media:{a1:6.5,  a2:8.9,  a3:10.4, a4:11.4, a5:12.2, b1:5.7,  a6:10.9, a7:10.7, reconhecimento:11.4, escoreTotal:49.3,  ALT:16.8,  velEsquecimento:1.00, intProativa:0.92, intRetroativa:0.89}, dp:{a1:1.7, a2:2.2, a3:2.4, a4:2.4, a5:2.2, b1:1.8, a6:2.6, a7:2.7, reconhecimento:4.7,  escoreTotal:8.6,  ALT:6.5, velEsquecimento:0.27, intProativa:0.37, intRetroativa:0.17} },
  idade_31_40:  { faixa:'31–40 anos', media:{a1:6.1,  a2:8.7,  a3:10.3, a4:11.4, a5:12.2, b1:5.3,  a6:10.8, a7:10.3, reconhecimento:11.1, escoreTotal:48.6,  ALT:17.9,  velEsquecimento:0.97, intProativa:0.91, intRetroativa:0.94}, dp:{a1:1.6, a2:2.0, a3:2.1, a4:2.1, a5:2.2, b1:1.6, a6:2.4, a7:2.4, reconhecimento:4.7,  escoreTotal:8.0,  ALT:7.0, velEsquecimento:0.19, intProativa:0.33, intRetroativa:0.74} },
  idade_41_50:  { faixa:'41–50 anos', media:{a1:6.0,  a2:8.5,  a3:9.8,  a4:10.7, a5:11.7, b1:4.9,  a6:9.8,  a7:9.6,  reconhecimento:9.9,  escoreTotal:46.7,  ALT:16.5,  velEsquecimento:1.01, intProativa:0.86, intRetroativa:0.84}, dp:{a1:1.6, a2:2.0, a3:2.5, a4:2.7, a5:2.6, b1:1.6, a6:2.8, a7:2.8, reconhecimento:5.6,  escoreTotal:9.6,  ALT:7.3, velEsquecimento:0.34, intProativa:0.31, intRetroativa:0.18} },
  idade_51_60:  { faixa:'51–60 anos', media:{a1:6.0,  a2:8.2,  a3:9.6,  a4:10.6, a5:11.3, b1:4.8,  a6:9.4,  a7:9.5,  reconhecimento:10.9, escoreTotal:45.7,  ALT:15.6,  velEsquecimento:1.02, intProativa:0.82, intRetroativa:0.82}, dp:{a1:1.9, a2:2.3, a3:2.5, a4:2.4, a5:2.3, b1:1.7, a6:3.1, a7:3.2, reconhecimento:5.2,  escoreTotal:9.7,  ALT:7.4, velEsquecimento:0.19, intProativa:0.29, intRetroativa:0.19} },
  idade_61_70:  { faixa:'61–70 anos', media:{a1:5.5,  a2:7.8,  a3:9.1,  a4:10.3, a5:11.3, b1:4.7,  a6:9.5,  a7:9.4,  reconhecimento:10.4, escoreTotal:44.0,  ALT:16.4,  velEsquecimento:1.01, intProativa:0.92, intRetroativa:0.84}, dp:{a1:1.6, a2:1.9, a3:2.0, a4:1.9, a5:2.0, b1:1.4, a6:2.6, a7:2.6, reconhecimento:3.8,  escoreTotal:7.6,  ALT:6.1, velEsquecimento:0.24, intProativa:0.61, intRetroativa:0.16} },
  idade_71_79:  { faixa:'71–79 anos', media:{a1:5.09, a2:6.96, a3:7.98, a4:9.19, a5:10.27,b1:4.05, a6:8.29, a7:8.05, reconhecimento:7.72, escoreTotal:39.48, ALT:14.04, velEsquecimento:0.84, intProativa:0.81, intRetroativa:1.00}, dp:{a1:1.46,a2:1.74,a3:1.99,a4:2.30,a5:2.16,b1:1.75,a6:2.37,a7:2.39,reconhecimento:3.99, escoreTotal:8.23, ALT:5.70,velEsquecimento:0.39, intProativa:0.19, intRetroativa:0.29} },
  idade_80mais: { faixa:'80+ anos',   media:{a1:4.1,  a2:6.0,  a3:6.9,  a4:7.9,  a5:9.6,  b1:3.2,  a6:7.5,  a7:6.7,  reconhecimento:5.8,  escoreTotal:34.5,  ALT:13.9,  velEsquecimento:0.91, intProativa:0.81, intRetroativa:0.79}, dp:{a1:1.4, a2:1.5, a3:1.7, a4:1.6, a5:2.1, b1:1.7, a6:2.2, a7:2.0, reconhecimento:5.4,  escoreTotal:6.3,  ALT:5.5, velEsquecimento:0.23, intProativa:0.41, intRetroativa:0.22} },
}
function ravltGetFaixaId(age) {
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

// ─── RAVLT (Base44-compliant) ─────────────────────────────────────────────────
function RAVLTForm({ data, onChange }) {
  const d = data || {}
  const [tab, setTab] = React.useState('tentativas')

  const update = (changes) => {
    const n = { ...d, ...changes }
    const a = (k) => (n[k] != null && n[k] !== '') ? Number(n[k]) : null
    const a1 = a('a1_score'), a2 = a('a2_score'), a3 = a('a3_score'), a4 = a('a4_score'), a5 = a('a5_score')
    const a6 = a('a6_score'), a7 = a('a7_score')
    const rawUpdRL = n.recognition_list || []
    const updRL = (() => {
      if (!rawUpdRL.length) return rawUpdRL
      // Sempre re-aplica correta/categoria do DEFAULT (fonte de verdade); só marcada vem do Firestore
      if (rawUpdRL[0].palavra !== undefined)
        return DEFAULT_RAVLT_RECOGNITION.map((def, i) => ({ ...def, marcada: rawUpdRL[i]?.marcada ?? false }))
      if (rawUpdRL[0].correct !== undefined)
        return DEFAULT_RAVLT_RECOGNITION.map((def, i) => ({ ...def, marcada: rawUpdRL[i]?.marked ?? false }))
      return DEFAULT_RAVLT_RECOGNITION.map(w => ({ ...w }))
    })()
    const hasUpdRL = updRL.length > 0
    const rHits = hasUpdRL ? updRL.filter(w => w.correta && w.marcada).length : a('recognition_hits')
    const rFP   = hasUpdRL ? updRL.filter(w => !w.correta && w.marcada).length : a('recognition_false')

    const total_score                = (a1!=null&&a2!=null&&a3!=null&&a4!=null&&a5!=null) ? a1+a2+a3+a4+a5 : null
    const alt_score                  = (a1!=null&&a5!=null) ? a5-a1 : null
    const forgetting_speed           = (a6!=null&&a6>0&&a7!=null) ? Math.round((a7/a6)*100)/100 : null
    const proactive_interference     = (a('b1_score')!=null&&a1!=null&&a1>0) ? Math.round((a('b1_score')/a1)*100)/100 : null
    const retroactive_interference   = (a6!=null&&a5!=null&&a5>0) ? Math.round((a6/a5)*100)/100 : null
    const recognition_hits           = rHits ?? a('recognition_hits')
    const recognition_false          = rFP   ?? a('recognition_false')
    const recognition_score          = (recognition_hits!=null&&recognition_false!=null) ? recognition_hits-recognition_false : null
    const allFilled = a1!=null && a2!=null && a3!=null && a4!=null && a5!=null && a('b1_score')!=null && a6!=null && a7!=null
    const classification = allFilled ? (classify.ravlt_a7(a7)?.label || '') : ''

    const faixaId = n.age ? ravltGetFaixaId(n.age) : null
    const normaR  = faixaId ? RAVLT_NORMAS[faixaId] : null
    let autoZ = {}
    if (normaR) {
      const zOf = (score, key) => (score != null && normaR.dp[key] > 0) ? ((Number(score) - normaR.media[key]) / normaR.dp[key]).toFixed(2) : null
      const zA7  = zOf(a7, 'a7')
      const zA6  = zOf(a6, 'a6')
      const zTot = zOf(total_score, 'escoreTotal')
      const zRec = recognition_score != null ? zOf(recognition_score, 'reconhecimento') : null
      const zALT = zOf(alt_score, 'ALT')
      const pct  = zA7 != null ? bamsZToPercentil(Number(zA7)) : null
      autoZ = {
        a7_zscore:          zA7  != null ? zA7  : (n.a7_zscore || ''),
        a6_zscore:          zA6  != null ? zA6  : (n.a6_zscore || ''),
        total_zscore:       zTot != null ? zTot : (n.total_zscore || ''),
        recognition_zscore: zRec != null ? zRec : (n.recognition_zscore || ''),
        alt_zscore:         zALT != null ? zALT : (n.alt_zscore || ''),
        percentile:         pct  != null ? pct  : (n.percentile || ''),
      }
    }
    onChange({ ...n, ...autoZ, total_score, alt_score, forgetting_speed, proactive_interference, retroactive_interference, recognition_hits, recognition_false, recognition_score, classification })
  }

  const gn = (k) => (d[k] != null && d[k] !== '') ? Number(d[k]) : null
  const a1s = gn('a1_score'), a5s = gn('a5_score'), a6s = gn('a6_score'), a7s = gn('a7_score')
  const totalScore = [gn('a1_score'),gn('a2_score'),gn('a3_score'),gn('a4_score'),gn('a5_score')].every(v=>v!=null)
    ? [gn('a1_score'),gn('a2_score'),gn('a3_score'),gn('a4_score'),gn('a5_score')].reduce((s,v)=>s+v,0) : null
  const a7c = classify.ravlt_a7(a7s)

  // Migração: Base44={word,origin,correct,marked} → preserva marked
  //           NeuroClin antigo={word,origin,marked} sem correct → reseta (palavras eram erradas)
  const migrateRL = (raw) => {
    if (!raw || !raw.length) return raw
    if (raw[0].palavra !== undefined) return raw            // já no novo formato
    if (raw[0].correct !== undefined)                        // formato Base44 — preserva marcas
      return DEFAULT_RAVLT_RECOGNITION.map((def, i) => ({ ...def, marcada: raw[i]?.marked ?? false }))
    return DEFAULT_RAVLT_RECOGNITION.map(w => ({ ...w }))   // NeuroClin antigo — reseta
  }
  const rawRL = d.recognition_list || []
  const isOldFormat = rawRL.length > 0 && rawRL[0].palavra === undefined
  React.useEffect(() => {
    if (isOldFormat) update({ recognition_list: migrateRL(rawRL) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Sempre re-aplica correta/categoria do DEFAULT para garantir que valores corrigidos no código
  // se reflitam mesmo em listas já salvas no Firestore com valores antigos/errados
  const rl = rawRL.length === 0
    ? rawRL
    : rawRL[0].palavra !== undefined
      ? DEFAULT_RAVLT_RECOGNITION.map((def, i) => ({ ...def, marcada: rawRL[i]?.marcada ?? false }))
      : migrateRL(rawRL)
  const hasRL   = rl.length > 0
  const rlHits  = hasRL ? rl.filter(w => w.correta && w.marcada).length : null
  const rlFP    = hasRL ? rl.filter(w => !w.correta && w.marcada).length : null
  const rlScore = rlHits !== null ? rlHits - rlFP : null
  const toggleWord = (idx) => {
    const newRL = rl.map((w, i) => i === idx ? { ...w, marcada: !w.marcada } : w)
    update({ recognition_list: newRL })
  }
  const initList   = () => update({ recognition_list: DEFAULT_RAVLT_RECOGNITION.map(w => ({ ...w })) })
  const clearMarks = () => update({ recognition_list: rl.map(w => ({ ...w, marcada: false })) })

  const tabStyle = (t) => ({
    padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11,
    fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Nascimento</div>
          <input type="date" value={d.birth_date||''} onChange={e => update({ birth_date: e.target.value })} style={inputStyle} />
        </div>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex||''} onChange={e => update({ sex: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <input value={d.education||''} onChange={e => update({ education: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Local de Nascimento</div>
          <input value={d.birth_place||''} onChange={e => update({ birth_place: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>CPF</div>
          <input value={d.cpf||''} onChange={e => update({ cpf: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="000.000.000-00" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        <button style={tabStyle('tentativas')} onClick={() => setTab('tentativas')}>Tentativas</button>
        <button style={tabStyle('reconhecimento')} onClick={() => setTab('reconhecimento')}>Reconhecimento</button>
        <button style={tabStyle('indices')} onClick={() => setTab('indices')}>Índices</button>
        <button style={tabStyle('resultado')} onClick={() => setTab('resultado')}>Resultado</button>
      </div>

      {tab === 'tentativas' && (
        <div>
          {/* Lista A1-A5 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lista A — Aprendizagem</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 4 }}>
              {[1,2,3,4,5].map(i => (
                <NumField key={i} label={`A${i} — Acertos`} value={d[`a${i}_score`]} onChange={v => update({ [`a${i}_score`]: v })} min={0} max={15} hint="0-15" />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 6 }}>
              {[1,2,3,4,5].map(i => (
                <NumField key={i} label={`A${i} — Intrusões`} value={d[`a${i}_intrusions`]} onChange={v => update({ [`a${i}_intrusions`]: v })} min={0} max={30} />
              ))}
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: S.muted, marginBottom: 4, fontStyle: 'italic' }}>Palavras recordadas — opcional (separar por vírgula)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i}>
                    <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>A{i}</div>
                    <textarea
                      rows={3}
                      value={(d[`a${i}_words`] || []).join(', ')}
                      onChange={e => update({ [`a${i}_words`]: e.target.value.split(',').map(w => w.trim()).filter(Boolean) })}
                      style={{ ...inputStyle, textAlign: 'left', padding: '4px 6px', resize: 'vertical', fontSize: 11, lineHeight: 1.4, width: '100%', boxSizing: 'border-box' }}
                      placeholder="p1, p2..."
                    />
                  </div>
                ))}
              </div>
            </div>
            {a1s != null && a5s != null && (
              <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>
                Ganho A1→A5: <span style={{ color: a5s-a1s >= 0 ? S.greenL : S.red, fontWeight: 700 }}>{a5s-a1s >= 0 ? '+' : ''}{a5s-a1s}</span>
                {' '}| Total A1–A5: <span style={{ color: S.greenL, fontWeight: 700 }}>{totalScore ?? '—'}/75</span>
              </div>
            )}
          </div>
          {/* B1 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lista B — Interferência</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxWidth: 260 }}>
              <NumField label="B1 — Acertos" value={d.b1_score} onChange={v => update({ b1_score: v })} min={0} max={15} hint="0-15" />
              <NumField label="B1 — Intrusões" value={d.b1_intrusions} onChange={v => update({ b1_intrusions: v })} min={0} max={30} />
            </div>
            <div style={{ marginTop: 6, maxWidth: 260 }}>
              <div style={{ fontSize: 10, color: S.muted, marginBottom: 2, fontStyle: 'italic' }}>Palavras B1</div>
              <textarea
                rows={2}
                value={(d.b1_words || []).join(', ')}
                onChange={e => update({ b1_words: e.target.value.split(',').map(w => w.trim()).filter(Boolean) })}
                style={{ ...inputStyle, textAlign: 'left', padding: '4px 6px', resize: 'vertical', fontSize: 11, lineHeight: 1.4, width: '100%', boxSizing: 'border-box' }}
                placeholder="p1, p2..."
              />
            </div>
          </div>
          {/* A6 + A7 */}
          <div>
            <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evocação Pós-Interferência</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <NumField label="A6 — Acertos (imediata)" value={d.a6_score} onChange={v => update({ a6_score: v })} min={0} max={15} hint="0-15" />
                <NumField label="A6 — Intrusões" value={d.a6_intrusions} onChange={v => update({ a6_intrusions: v })} min={0} max={30} />
                <div style={{ fontSize: 10, color: S.muted, marginBottom: 2, marginTop: 4, fontStyle: 'italic' }}>Palavras A6</div>
                <textarea
                  rows={2}
                  value={(d.a6_words || []).join(', ')}
                  onChange={e => update({ a6_words: e.target.value.split(',').map(w => w.trim()).filter(Boolean) })}
                  style={{ ...inputStyle, textAlign: 'left', padding: '4px 6px', resize: 'vertical', fontSize: 11, lineHeight: 1.4, width: '100%', boxSizing: 'border-box' }}
                  placeholder="p1, p2..."
                />
              </div>
              <div>
                <NumField label="A7 — Acertos (evocação tardia)" value={d.a7_score} onChange={v => update({ a7_score: v })} min={0} max={15} hint="0-15" />
                {a7c && <div style={{ marginTop: 4 }}><Badge {...a7c} /></div>}
                <NumField label="A7 — Intrusões" value={d.a7_intrusions} onChange={v => update({ a7_intrusions: v })} min={0} max={30} />
                <div style={{ fontSize: 10, color: S.muted, marginBottom: 2, marginTop: 4, fontStyle: 'italic' }}>Palavras A7</div>
                <textarea
                  rows={2}
                  value={(d.a7_words || []).join(', ')}
                  onChange={e => update({ a7_words: e.target.value.split(',').map(w => w.trim()).filter(Boolean) })}
                  style={{ ...inputStyle, textAlign: 'left', padding: '4px 6px', resize: 'vertical', fontSize: 11, lineHeight: 1.4, width: '100%', boxSizing: 'border-box' }}
                  placeholder="p1, p2..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'reconhecimento' && (
        <div>
          {/* Totalizadores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 10px', background: 'rgba(46,125,50,0.12)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: S.muted, marginBottom: 2, fontWeight: 700 }}>ACERTOS (HITS)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: S.greenL }}>{hasRL ? rlHits : (d.recognition_hits ?? '—')}</div>
            </div>
            <div style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.12)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: S.muted, marginBottom: 2, fontWeight: 700 }}>FALSOS POSITIVOS</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: S.red }}>{hasRL ? rlFP : (d.recognition_false ?? '—')}</div>
            </div>
            <div style={{ padding: '8px 10px', background: 'rgba(59,130,246,0.12)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: S.muted, marginBottom: 2, fontWeight: 700 }}>ESCORE (H−FP)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: S.blue }}>{hasRL ? rlScore : (d.recognition_score ?? '—')}</div>
            </div>
          </div>

          {!hasRL ? (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0 10px' }}>
                <p style={{ fontSize: 12, color: S.muted, marginBottom: 10 }}>Lista de reconhecimento não iniciada</p>
                <button onClick={initList} style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${S.green}`, background: 'rgba(46,125,50,0.15)', color: S.greenL, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Inicializar Lista Padrão (50 palavras)
                </button>
              </div>
              <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 10, color: S.muted, marginBottom: 6, fontStyle: 'italic' }}>Ou registrar manualmente:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <NumField label="Acertos (hits)" value={d.recognition_hits} onChange={v => update({ recognition_hits: v })} min={0} max={15} hint="0-15" />
                  <NumField label="Falsos Positivos" value={d.recognition_false} onChange={v => update({ recognition_false: v })} min={0} max={30} hint="0-30" />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: S.muted }}>
                  Leia cada palavra e marque <strong style={{ color: S.greenL }}>SIM</strong> se o paciente reconhecer como sendo da Lista A
                </span>
                <button onClick={clearMarks} style={{ padding: '3px 10px', borderRadius: 5, border: `1px solid ${S.border}`, background: 'transparent', color: S.muted, fontSize: 10, cursor: 'pointer' }}>
                  Limpar
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {[rl.slice(0, 25), rl.slice(25)].map((col, colIdx) => (
                  <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {col.map((item, i) => {
                      const idx = colIdx * 25 + i
                      const isHit = item.correta && item.marcada
                      const catColor = item.categoria === 'A' ? S.greenL : item.categoria === 'B' ? '#FCD34D' : item.categoria?.startsWith('S') ? '#F97316' : '#9CA3AF'
                      return (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '4px 8px', borderRadius: 6,
                          border: `1px solid ${item.marcada ? (isHit ? 'rgba(76,175,80,0.5)' : 'rgba(239,68,68,0.4)') : S.border}`,
                          background: item.marcada ? (isHit ? 'rgba(76,175,80,0.1)' : 'rgba(239,68,68,0.08)') : 'rgba(255,255,255,0.03)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                            <span style={{ fontSize: 10, color: S.muted, minWidth: 18, textAlign: 'right' }}>{idx + 1}.</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.palavra}</span>
                            <span style={{ fontSize: 9, color: catColor, opacity: 0.7 }}>({item.categoria})</span>
                          </div>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            <button onClick={() => { if (!item.marcada) toggleWord(idx) }} style={{
                              padding: '3px 10px', borderRadius: 4, border: 'none',
                              cursor: 'pointer',
                              fontSize: 11, fontWeight: 700,
                              background: item.marcada ? '#2E7D32' : 'rgba(46,125,50,0.18)',
                              color: item.marcada ? '#fff' : S.greenL,
                            }}>SIM</button>
                            <button onClick={() => { if (item.marcada) toggleWord(idx) }} style={{
                              padding: '3px 10px', borderRadius: 4, border: 'none',
                              cursor: 'pointer',
                              fontSize: 11, fontWeight: 700,
                              background: !item.marcada ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)',
                              color: !item.marcada ? S.red : '#9CA3AF',
                            }}>NÃO</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'indices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Total A1–A5', value: totalScore, suffix: '/75', hint: 'soma das 5 tentativas' },
            { label: 'ALT (A5 − A1)', value: d.alt_score, hint: 'aprendizagem ao longo das tentativas' },
            { label: 'Velocidade de esquecimento (A7/A6)', value: d.forgetting_speed, hint: '≈1 = sem esquecimento' },
            { label: 'Interferência proativa (B1/A1)', value: d.proactive_interference, hint: 'efeito de B1 sobre A1' },
            { label: 'Interferência retroativa (A6/A5)', value: d.retroactive_interference, hint: 'quanto B1 afetou A6' },
            { label: 'Reconhecimento (hits − FP)', value: d.recognition_score, hint: '≥13 = preservado' },
          ].map(({ label, value, suffix, hint }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <div>
                <div style={{ fontSize: 12, color: '#fff' }}>{label}</div>
                {hint && <div style={{ fontSize: 10, color: S.muted }}>{hint}</div>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: S.greenL }}>
                {value != null ? `${value}${suffix || ''}` : '—'}
              </span>
            </div>
          ))}
          <p style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Índices calculados automaticamente após preenchimento das tentativas</p>
        </div>
      )}

      {tab === 'resultado' && (
        <div>
          {/* ── Resumo automático dos índices ── */}
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:S.muted, letterSpacing:'0.06em', marginBottom:8 }}>CLASSIFICAÇÕES AUTOMÁTICAS</div>
            {[
              { label:'A7 — Evocação Tardia',    val:a7s,                        suffix:'/15', c: classify.ravlt_a7(a7s) },
              { label:'A6 — Evocação Imediata',  val:a6s,                        suffix:'/15', c: classify.ravlt_a7(a6s) },
              { label:'Total A1–A5',             val:totalScore,                 suffix:'/75', c: totalScore!=null ? classify.zscore(d.total_zscore) : null },
              { label:'Reconhecimento',          val:d.recognition_score != null ? d.recognition_score : null, suffix:'', c: d.recognition_score!=null ? (Number(d.recognition_score)>=13?{label:'PRESERVADO',type:'preserved'}:Number(d.recognition_score)>=10?{label:'LIMÍTROFE',type:'borderline'}:{label:'COMPROMETIDO',type:'impaired'}) : null },
            ].map(({ label, val, suffix, c }) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:`1px solid ${S.border}` }}>
                <span style={{ fontSize:12, color:S.muted }}>{label}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{val != null ? `${val}${suffix}` : '—'}</span>
                  {c && <Badge {...c} />}
                </div>
              </div>
            ))}
          </div>

          {/* ── Z-scores → classificação normativa ── */}
          {(() => {
            const fId = d.age ? ravltGetFaixaId(d.age) : null
            const normaDisp = fId ? RAVLT_NORMAS[fId] : null
            const zItems = [
              { label:'z A7',        key:'a7_zscore' },
              { label:'z A6',        key:'a6_zscore' },
              { label:'z Total',     key:'total_zscore' },
              { label:'z Reconhec.', key:'recognition_zscore' },
              { label:'z ALT',       key:'alt_zscore' },
            ]
            return normaDisp ? (
              <>
                <div style={{ fontSize:10, fontWeight:700, color:S.muted, letterSpacing:'0.06em', marginBottom:4 }}>Z-SCORES — Faixa: {normaDisp.faixa}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:12 }}>
                  {zItems.map(item => {
                    const zv = (d[item.key] !== '' && d[item.key] != null) ? Number(d[item.key]) : null
                    const col = zv == null ? S.muted : zv >= -1 ? S.greenL : zv >= -1.5 ? '#FFC107' : '#F44336'
                    return (
                      <div key={item.key} style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'8px 6px', textAlign:'center' }}>
                        <div style={{ fontSize:10, color:S.muted, marginBottom:2 }}>{item.label}</div>
                        <div style={{ fontSize:16, fontWeight:700, color: col }}>{zv != null ? zv.toFixed(2) : '—'}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:10, fontWeight:700, color:S.muted, letterSpacing:'0.06em', marginBottom:6 }}>Z-SCORES (manual — informe a idade para cálculo automático)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  {[
                    { label:'Z-score A7',            key:'a7_zscore' },
                    { label:'Z-score A6',            key:'a6_zscore' },
                    { label:'Z-score Total A1-A5',   key:'total_zscore' },
                    { label:'Z-score Reconhecimento',key:'recognition_zscore' },
                  ].map(({ label, key }) => {
                    const c = classify.zscore(d[key])
                    return (
                      <div key={key}>
                        <NumField label={label} value={d[key]} onChange={v => update({ [key]: v })} min={-5} max={3} step={0.01} hint="-5 a 3" />
                        {c && <div style={{ marginTop:2 }}><Badge {...c} /></div>}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}

          {/* ── Percentil e Classificação geral ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            {(d.age && ravltGetFaixaId(d.age)) ? (
              <div>
                <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Percentil A7 (calculado)</div>
                <div style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${S.border}`, borderRadius:6, padding:'8px 10px', fontSize:20, fontWeight:700, color:S.greenL }}>{d.percentile || '—'}</div>
              </div>
            ) : (
              <NumField label="Percentil (A7)" value={d.percentile} onChange={v => update({ percentile: v })} min={0} max={100} hint="0-100" />
            )}
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Classificação Geral</div>
              <input value={a7c ? a7c.label : (d.classification||'')} onChange={e => update({ classification: e.target.value })}
                style={{ ...inputStyle, textAlign:'left', paddingLeft:8 }} placeholder="Ex: Abaixo da média" />
              {a7c && <div style={{ marginTop:4 }}><Badge {...a7c} /></div>}
            </div>
          </div>

          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Interpretação</div>
            <textarea rows={3} value={d.interpretation||''} onChange={e => update({ interpretation: e.target.value })}
              style={{ ...inputStyle, textAlign:'left', resize:'vertical', padding:'8px 10px', lineHeight:1.5 }} />
          </div>
          <div>
            <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Observações</div>
            <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign:'left', resize:'vertical', padding:'8px 10px', lineHeight:1.5 }} />
          </div>
        </div>
      )}
    </div>
  )
}

// Converte número de vocábulos (fluência verbal NEUPSILIN) para pontuação (1–11)
function fluencyWordsToScore(w) {
  if (w == null || w === '') return null
  const v = Number(w)
  if (isNaN(v) || v < 0) return null
  return Math.min(11, Math.floor(v / 3) + 1)
}

// ─── NEUPSILIN ────────────────────────────────────────────────────────────────
function NEUPSILINForm({ data, onChange }) {
  const d = data || {}
  const [tab, setTab] = React.useState('orientacao')

  const update = (changes) => {
    const n = { ...d, ...changes }
    const tTimeKeys  = ['orientation_day_week','orientation_day_month','orientation_month','orientation_year']
    const tSpaceKeys = ['orientation_place','orientation_city','orientation_state','orientation_country']
    const orientation_time_total  = tTimeKeys.reduce((s, k)  => s + (Number(n[k])||0), 0)
    const orientation_space_total = tSpaceKeys.reduce((s, k) => s + (Number(n[k])||0), 0)
    const attention_total     = (Number(n.attention_reverse_count)||0) + (Number(n.attention_digit_sequence)||0)
    const perception_total    = (Number(n.perception_line_equality)||0) + (Number(n.perception_visual_hemineglect)||0) + (Number(n.perception_face_perception)||0) + (Number(n.perception_face_recognition)||0)
    const memory_episodic_subtotal = (Number(n.memory_episodic_immediate)||0) + (Number(n.memory_episodic_delayed)||0) + (Number(n.memory_episodic_recognition)||0)
    const memory_total        = (Number(n.memory_working)||0) + (Number(n.memory_span_auditory)||0) + memory_episodic_subtotal + (Number(n.memory_semantic_long)||0) + (Number(n.memory_visual_short)||0) + (Number(n.memory_prospective)||0)
    const language_oral_total = (Number(n.lang_nomeacao)||0) + (Number(n.lang_repeticao)||0) + (Number(n.lang_automatica)||0) + (Number(n.lang_compreensao_oral)||0) + (Number(n.lang_inferencias)||0)
    const language_written_total = (Number(n.lang_leitura)||0) + (Number(n.lang_compreensao_escrita)||0) + (Number(n.lang_escrita_espontanea)||0) + (Number(n.lang_escrita_copiada)||0) + (Number(n.lang_ditada)||0)
    const language_total      = language_oral_total + language_written_total
    const praxis_total        = (Number(n.praxis_ideomotor)||0) + (Number(n.praxis_constructive)||0) + (Number(n.praxis_reflexive)||0)
    const executive_total     = (Number(n.executive_problem_solving)||0) + (fluencyWordsToScore(n.executive_verbal_fluency) || 0)
    onChange({ ...n, orientation_time_total, orientation_space_total, attention_total, perception_total, memory_total, language_oral_total, language_written_total, language_total, praxis_total, executive_total })
  }

  const orientTimeTotal  = ['orientation_day_week','orientation_day_month','orientation_month','orientation_year'].reduce((s,k) => s+(Number(d[k])||0), 0)
  const orientSpaceTotal = ['orientation_place','orientation_city','orientation_state','orientation_country'].reduce((s,k) => s+(Number(d[k])||0), 0)
  const orientTotal = orientTimeTotal + orientSpaceTotal
  const attTotal    = (Number(d.attention_reverse_count)||0) + (Number(d.attention_digit_sequence)||0)
  const percTotal   = (Number(d.perception_line_equality)||0) + (Number(d.perception_visual_hemineglect)||0) + (Number(d.perception_face_perception)||0) + (Number(d.perception_face_recognition)||0)
  const episTotal   = (Number(d.memory_episodic_immediate)||0) + (Number(d.memory_episodic_delayed)||0) + (Number(d.memory_episodic_recognition)||0)
  const memTotal    = (Number(d.memory_working)||0) + (Number(d.memory_span_auditory)||0) + episTotal + (Number(d.memory_semantic_long)||0) + (Number(d.memory_visual_short)||0) + (Number(d.memory_prospective)||0)
  const langOral    = (Number(d.lang_nomeacao)||0) + (Number(d.lang_repeticao)||0) + (Number(d.lang_automatica)||0) + (Number(d.lang_compreensao_oral)||0) + (Number(d.lang_inferencias)||0)
  const langEsc     = (Number(d.lang_leitura)||0) + (Number(d.lang_compreensao_escrita)||0) + (Number(d.lang_escrita_espontanea)||0) + (Number(d.lang_escrita_copiada)||0) + (Number(d.lang_ditada)||0)
  const langTotal   = langOral + langEsc
  const praxTotal   = (Number(d.praxis_ideomotor)||0) + (Number(d.praxis_constructive)||0) + (Number(d.praxis_reflexive)||0)
  const execTotal   = (Number(d.executive_problem_solving)||0) + (fluencyWordsToScore(d.executive_verbal_fluency) || 0)

  const tabs = [
    { id: 'orientacao', label: '1.Orient.',  tot: orientTotal, max: 8  },
    { id: 'atencao',    label: '2.Atenção',  tot: attTotal,    max: 27 },
    { id: 'percepcao',  label: '3.Percep.',  tot: percTotal,   max: 12 },
    { id: 'memoria',    label: '4.Memória',  tot: memTotal              },
    { id: 'aritmetica', label: '5.Aritmét.', tot: Number(d.arithmetic)||0, max: 8 },
    { id: 'linguagem',  label: '6.Ling.',    tot: langTotal             },
    { id: 'praxias',    label: '7.Praxias',  tot: praxTotal,   max: 20 },
    { id: 'executivas', label: '8.Exec.',    tot: execTotal             },
    { id: 'resultado',  label: 'Resultado'                              },
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
  const orientItem = (key, label) => (
    <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '5px 0' }}>
      <div style={{ fontSize: 12, color: d[key] != null ? '#fff' : S.muted }}>{label}</div>
      <ScoreButtons value={d[key]} onChange={v => update({ [key]: v })} max={1} />
    </div>
  )

  return (
    <div>
      {/* Dados de normatização */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10, padding: '10px 14px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <NumField label="Idade (anos)" value={d.age} onChange={v => update({ age: v })} min={18} max={100} />
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <select value={d.education_years||''} onChange={e => update({ education_years: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">— selecionar —</option>
            <option value="1-4">1–4 anos</option>
            <option value="5-8">5–8 anos</option>
            <option value="9+">9+ anos</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex||''} onChange={e => update({ sex: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">— selecionar —</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Lateralidade</div>
          <select value={d.laterality||''} onChange={e => update({ laterality: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">— selecionar —</option>
            <option value="destro">Destro</option>
            <option value="canhoto">Canhoto</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Naturalidade</div>
          <input value={d.naturality||''} onChange={e => update({ naturality: e.target.value })}
            placeholder="cidade de nascimento" style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Início</div>
            <input type="time" value={d.start_time||''} onChange={e => update({ start_time: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Fim</div>
            <input type="time" value={d.end_time||''} onChange={e => update({ end_time: e.target.value })} style={inputStyle} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '4px 9px', borderRadius: 5, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
            background: tab === t.id ? S.green : 'rgba(255,255,255,0.06)',
            color: tab === t.id ? '#fff' : S.muted,
          }}>
            {t.label} {t.tot !== undefined ? (t.max ? `(${t.tot}/${t.max})` : `(${t.tot})`) : ''}
          </button>
        ))}
      </div>

      {tab === 'orientacao' && <div style={secBox}>
        {subHead('Orientação Temporal')}
        {orientItem('orientation_day_week',  'Dia da semana')}
        {orientItem('orientation_day_month', 'Dia do mês')}
        {orientItem('orientation_month',     'Mês')}
        {orientItem('orientation_year',      'Ano')}
        <div style={{ fontSize: 11, color: S.greenL, fontWeight: 700, marginTop: 6 }}>Temporal: {orientTimeTotal}/4</div>
        {subHead('Orientação Espacial')}
        {orientItem('orientation_place',   'Local')}
        {orientItem('orientation_city',    'Cidade')}
        {orientItem('orientation_state',   'Estado')}
        {orientItem('orientation_country', 'País')}
        <div style={{ fontSize: 11, color: S.greenL, fontWeight: 700, marginTop: 6 }}>Espacial: {orientSpaceTotal}/4</div>
        {totLine(orientTotal, 8)}
      </div>}

      {tab === 'atencao' && <div style={secBox}>
        <NumField label="Contagem Inversa 50–30 (/20)"  value={d.attention_reverse_count}  onChange={v => update({ attention_reverse_count:  v })} min={0} max={20} />
        <NumField label="Tempo de Execução Contagem (seg)" value={d.attention_execution_time} onChange={v => update({ attention_execution_time: v })} min={0} hint="seg" />
        <NumField label="Sequência de Dígitos (/7)"     value={d.attention_digit_sequence} onChange={v => update({ attention_digit_sequence: v })} min={0} max={7}  />
        {totLine(attTotal, 27)}
      </div>}

      {tab === 'percepcao' && <div style={secBox}>
        <NumField label="Julgamento de Linhas (/6)"      value={d.perception_line_equality}       onChange={v => update({ perception_line_equality:       v })} min={0} max={6} />
        <NumField label="Heminegligência Visual (/1)"    value={d.perception_visual_hemineglect}  onChange={v => update({ perception_visual_hemineglect:  v })} min={0} max={1} />
        <NumField label="Percepção de Faces (/3)"        value={d.perception_face_perception}     onChange={v => update({ perception_face_perception:     v })} min={0} max={3} />
        <NumField label="Reconhecimento de Faces (/2)"   value={d.perception_face_recognition}    onChange={v => update({ perception_face_recognition:    v })} min={0} max={2} />
        {totLine(percTotal, 12)}
      </div>}

      {tab === 'memoria' && <div style={secBox}>
        {subHead('Memória de Trabalho')}
        <NumField label="Ordenamento de Dígitos — total (/10)" value={d.memory_working}       onChange={v => update({ memory_working:       v })} min={0} max={10} />
        <NumField label="Span de Dígitos — máx sequência"      value={d.memory_working_digit} onChange={v => update({ memory_working_digit: v })} min={0} max={10} />
        {subHead('Span Auditivo')}
        <NumField label="Span Auditivo — Frases (/28)"   value={d.memory_span_auditory} onChange={v => update({ memory_span_auditory: v })} min={0} max={28} />
        {subHead('Memória Episódica')}
        <NumField label="Evocação Imediata (/9)"          value={d.memory_episodic_immediate}   onChange={v => update({ memory_episodic_immediate:   v })} min={0} max={9}  />
        <NumField label="Evocação Tardia (/9)"            value={d.memory_episodic_delayed}     onChange={v => update({ memory_episodic_delayed:     v })} min={0} max={9}  />
        <NumField label="Reconhecimento (/18)"            value={d.memory_episodic_recognition} onChange={v => update({ memory_episodic_recognition: v })} min={0} max={18} />
        {subHead('Outras Memórias')}
        <NumField label="Memória Semântica de Longo Prazo (/5)" value={d.memory_semantic_long}  onChange={v => update({ memory_semantic_long:  v })} min={0} max={5} />
        <NumField label="Memória Visual de Curto Prazo (/3)"    value={d.memory_visual_short}   onChange={v => update({ memory_visual_short:   v })} min={0} max={3} />
        <NumField label="Memória Prospectiva (/2)"              value={d.memory_prospective}    onChange={v => update({ memory_prospective:    v })} min={0} max={2} />
        {totLine(memTotal)}
      </div>}

      {tab === 'aritmetica' && <div style={secBox}>
        <NumField label="Habilidades Aritméticas (/8)" value={d.arithmetic} onChange={v => update({ arithmetic: v })} min={0} max={8} />
        {totLine(Number(d.arithmetic)||0, 8)}
      </div>}

      {tab === 'linguagem' && <div style={secBox}>
        {subHead('Linguagem Oral')}
        <NumField label="Nomeação (/4)"             value={d.lang_nomeacao}         onChange={v => update({ lang_nomeacao:         v })} min={0} max={4}  />
        <NumField label="Repetição (/10)"           value={d.lang_repeticao}        onChange={v => update({ lang_repeticao:        v })} min={0} max={10} />
        <NumField label="Linguagem Automática (/2)" value={d.lang_automatica}       onChange={v => update({ lang_automatica:       v })} min={0} max={2}  />
        <NumField label="Compreensão Oral (/3)"     value={d.lang_compreensao_oral} onChange={v => update({ lang_compreensao_oral: v })} min={0} max={3}  />
        <NumField label="Inferências (/3)"          value={d.lang_inferencias}      onChange={v => update({ lang_inferencias:      v })} min={0} max={3}  />
        {subHead('Linguagem Escrita')}
        <NumField label="Leitura (/12)"             value={d.lang_leitura}              onChange={v => update({ lang_leitura:             v })} min={0} max={12} />
        <NumField label="Compreensão Escrita (/3)"  value={d.lang_compreensao_escrita}  onChange={v => update({ lang_compreensao_escrita: v })} min={0} max={3}  />
        <NumField label="Escrita Espontânea (/2)"   value={d.lang_escrita_espontanea}   onChange={v => update({ lang_escrita_espontanea:  v })} min={0} max={2}  />
        <NumField label="Escrita Copiada (/2)"      value={d.lang_escrita_copiada}      onChange={v => update({ lang_escrita_copiada:     v })} min={0} max={2}  />
        <NumField label="Escrita Ditada (/12)"      value={d.lang_ditada}               onChange={v => update({ lang_ditada:              v })} min={0} max={12} />
        <div style={{ marginTop: 8, fontSize: 11, color: S.muted, borderTop: `1px solid ${S.border}`, paddingTop: 8 }}>
          Oral: {langOral} | Escrita: {langEsc}
        </div>
        {totLine(langTotal)}
      </div>}

      {tab === 'praxias' && <div style={secBox}>
        <NumField label="Ideomotora (/3)"   value={d.praxis_ideomotor}    onChange={v => update({ praxis_ideomotor:    v })} min={0} max={3}  />
        <NumField label="Construtiva (/16)" value={d.praxis_constructive} onChange={v => update({ praxis_constructive: v })} min={0} max={16} />
        <NumField label="Reflexiva (/3)"    value={d.praxis_reflexive}    onChange={v => update({ praxis_reflexive:    v })} min={0} max={3}  />
        {totLine(praxTotal, 20)}
      </div>}

      {tab === 'executivas' && <div style={secBox}>
        <NumField label="Resolução de Problemas (/2)"    value={d.executive_problem_solving} onChange={v => update({ executive_problem_solving: v })} min={0} max={2} />
        <NumField label="Fluência Verbal (nº vocábulos)" value={d.executive_verbal_fluency}  onChange={v => update({ executive_verbal_fluency:  v })} min={0} hint="nº palavras" />
        {totLine(execTotal)}
      </div>}

      {tab === 'resultado' && (
        <div style={secBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Resumo dos Domínios</div>
          {[
            ['Orientação', orientTotal, 8],
            ['Atenção', attTotal, 27],
            ['Percepção', percTotal, 12],
            ['Memória', memTotal, null],
            ['Aritmética', Number(d.arithmetic)||0, 8],
            ['Linguagem Oral', langOral, null],
            ['Linguagem Escrita', langEsc, null],
            ['Praxias', praxTotal, 20],
            ['Funções Executivas', execTotal, null],
          ].map(([lbl, val, max]) => (
            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${S.border}` }}>
              <span style={{ fontSize: 12, color: '#fff' }}>{lbl}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: S.greenL }}>{val}{max != null ? `/${max}` : ''}</span>
            </div>
          ))}
          {d.age && <div style={{ marginTop: 8, fontSize: 10, color: S.muted }}>Normatização: {d.age} anos · {d.education_years || '—'} esc. · {d.sex || '—'}</div>}
        </div>
      )}
    </div>
  )
}

// ─── FAB (Base44-compliant) ───────────────────────────────────────────────────
const FAB_FIELDS = [
  { key: 'conceptualization_score',       label: 'Semelhanças',              hint: 'Banana-Laranja' },
  { key: 'mental_flexibility_score',      label: 'Fluência Verbal',          hint: 'letra S' },
  { key: 'motor_programming_score',       label: 'Séries Motoras',           hint: 'Luria' },
  { key: 'sensitivity_interference_score',label: 'Instruções Conflitantes',  hint: '' },
  { key: 'inhibitory_control_score',      label: 'Go-No Go',                 hint: '' },
  { key: 'prehension_behavior_score',     label: 'Comportamento de Preensão',hint: '' },
]

function FABForm({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const next = { ...d, ...changes }
    const hasAny    = FAB_FIELDS.some(f => next[f.key] != null)
    const allFilled = FAB_FIELDS.every(f => next[f.key] != null)
    const total  = FAB_FIELDS.reduce((sum, f) => sum + (Number(next[f.key]) || 0), 0)
    onChange({ ...next, total_score: hasAny ? total : null, classification: allFilled ? (classify.fab(total)?.label || '') : '' })
  }

  const hasAny = FAB_FIELDS.some(f => d[f.key] != null)
  const total  = FAB_FIELDS.reduce((sum, f) => sum + (Number(d[f.key]) || 0), 0)
  const c = hasAny ? classify.fab(total) : null

  return (
    <div>
      {/* 6 subtestes com ScoreButtons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {FAB_FIELDS.map(f => (
          <div key={f.key} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
            padding: '7px 10px', borderRadius: 6,
            background: d[f.key] != null ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize: 12, color: d[f.key] != null ? '#fff' : S.muted }}>
              {f.label}
              {f.hint && <span style={{ color: S.muted, fontSize: 10, marginLeft: 6 }}>({f.hint})</span>}
            </div>
            <ScoreButtons value={d[f.key]} onChange={v => update({ [f.key]: v })} max={3} />
          </div>
        ))}
      </div>

      {/* Total */}
      {hasAny && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/18</span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: ≥15 Preservado · 13-14 Limítrofe · ≤12 Comprometido</p>

      {/* Campos clínicos */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
          <input type="text" value={d.interpretation || ''} onChange={e => update({ interpretation: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} placeholder="Texto livre..." />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Hipótese Diagnóstica</div>
          <input type="text" value={d.diagnostic_hypothesis || ''} onChange={e => update({ diagnostic_hypothesis: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} placeholder="Hipótese baseada nos resultados..." />
        </div>
      </div>

      {/* Metadados */}
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} />
        </div>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex || ''} onChange={e => update({ sex: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <input type="text" value={d.education || ''} onChange={e => update({ education: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} placeholder="Ex: 12 anos" />
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
          <textarea rows={2} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── GDS-15 (Base44-compliant — 15 itens Sim/Não com chave de pontuação) ──────
// "depressivo" = Não para q1,q5,q7,q11,q13 | Sim para os demais
const GDS15_ITEMS = [
  { key: 'q1',  label: 'Você está satisfeito com a sua vida?',                                    depKey: 'Não' },
  { key: 'q2',  label: 'Você tem perdido interesse por muitas de suas atividades?',               depKey: 'Sim' },
  { key: 'q3',  label: 'Você sente sua vida vazia?',                                              depKey: 'Sim' },
  { key: 'q4',  label: 'Você se aborrece com facilidade?',                                        depKey: 'Sim' },
  { key: 'q5',  label: 'Você está de bem com a vida a maior parte do tempo?',                     depKey: 'Não' },
  { key: 'q6',  label: 'Você tem a sensação de que algo ruim está para acontecer?',               depKey: 'Sim' },
  { key: 'q7',  label: 'Você se sente alegre a maior parte do tempo?',                            depKey: 'Não' },
  { key: 'q8',  label: 'Você se sente desamparado com frequência?',                               depKey: 'Sim' },
  { key: 'q9',  label: 'Você prefere ficar em casa a sair e fazer coisas novas?',                 depKey: 'Sim' },
  { key: 'q10', label: 'Você acha que tem mais problemas de memória do que a maioria?',           depKey: 'Sim' },
  { key: 'q11', label: 'Você acha que é bom estar vivo agora?',                                   depKey: 'Não' },
  { key: 'q12', label: 'Você se sente inútil da maneira que se encontra?',                        depKey: 'Sim' },
  { key: 'q13', label: 'Você se sente cheio de energia?',                                         depKey: 'Não' },
  { key: 'q14', label: 'Você sente que a sua situação tem solução?',                              depKey: 'Não' },
  { key: 'q15', label: 'Você acha que a maioria das pessoas está em melhor situação que você?',   depKey: 'Sim' },
]

function GDS15Form({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const n = { ...d, ...changes }
    const answered = GDS15_ITEMS.filter(it => n[it.key] != null).length
    const total    = GDS15_ITEMS.filter(it => n[it.key] === it.depKey).length
    onChange({ ...n, total_score: answered > 0 ? total : null, classification: answered === GDS15_ITEMS.length ? (classify.gds15(total)?.label || '') : '' })
  }

  const answered = GDS15_ITEMS.filter(it => d[it.key] != null).length
  const total    = GDS15_ITEMS.filter(it => d[it.key] === it.depKey).length
  const c        = answered > 0 ? classify.gds15(total) : null

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex||''} onChange={e => update({ sex: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Nº Prontuário</div>
          <input value={d.medical_record||''} onChange={e => update({ medical_record: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="opcional" />
        </div>
      </div>

      {/* 15 itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {GDS15_ITEMS.map((it, i) => {
          const isDepressive = d[it.key] === it.depKey
          return (
            <div key={it.key} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
              padding: '6px 10px', borderRadius: 6,
              background: d[it.key] != null ? (isDepressive ? 'rgba(239,68,68,0.06)' : 'rgba(46,125,50,0.06)') : 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: 12, color: d[it.key] != null ? '#fff' : S.muted }}>
                <span style={{ color: S.muted, marginRight: 5 }}>{i + 1}.</span>{it.label}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['Sim', 'Não'].map(opt => {
                  const isSelected = d[it.key] === opt
                  const isThisDepressive = opt === it.depKey
                  return (
                    <button key={opt} type="button" onClick={() => update({ [it.key]: opt })}
                      style={{
                        padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700,
                        background: isSelected ? (isThisDepressive ? 'rgba(239,68,68,0.5)' : S.green) : 'rgba(255,255,255,0.08)',
                        color: isSelected ? '#fff' : S.muted,
                      }}>{opt}</button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Resultado */}
      {answered > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/15 ({answered} respondidos)</span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: 0-4 Normal · 5-10 Leve/Moderada · 11-15 Grave</p>

      {/* Observações + Status */}
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
          <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── BDI-II (Base44-compliant, 21 itens com labels) ──────────────────────────
const BDII_ITEMS = [
  { key: 'q1',  label: 'Tristeza' },
  { key: 'q2',  label: 'Pessimismo' },
  { key: 'q3',  label: 'Fracasso Passado' },
  { key: 'q4',  label: 'Perda de Prazer' },
  { key: 'q5',  label: 'Sentimentos de Culpa' },
  { key: 'q6',  label: 'Sentimentos de Punição' },
  { key: 'q7',  label: 'Autoaversão' },
  { key: 'q8',  label: 'Autocrítica' },
  { key: 'q9',  label: 'Pensamentos Suicidas', alert: true },
  { key: 'q10', label: 'Choro' },
  { key: 'q11', label: 'Agitação' },
  { key: 'q12', label: 'Perda de Interesse' },
  { key: 'q13', label: 'Indecisão' },
  { key: 'q14', label: 'Desvalorização' },
  { key: 'q15', label: 'Perda de Energia' },
  { key: 'q16', label: 'Alterações no Sono' },
  { key: 'q17', label: 'Irritabilidade' },
  { key: 'q18', label: 'Alterações no Apetite' },
  { key: 'q19', label: 'Dificuldade de Concentração' },
  { key: 'q20', label: 'Cansaço ou Fadiga' },
  { key: 'q21', label: 'Perda de Interesse Sexual' },
]

function BDI2Form({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const next = { ...d, ...changes }
    const total      = BDII_ITEMS.reduce((sum, it) => sum + (Number(next[it.key]) || 0), 0)
    const answered   = BDII_ITEMS.filter(it => next[it.key] != null).length
    onChange({ ...next, total_score: total, classification: answered === BDII_ITEMS.length ? (classify.bdi2(total)?.label || '') : '' })
  }

  const total = BDII_ITEMS.reduce((sum, it) => sum + (Number(d[it.key]) || 0), 0)
  const answered = BDII_ITEMS.filter(it => d[it.key] != null).length
  const c = answered > 0 ? classify.bdi2(total) : null

  return (
    <div>
      <p style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>Pontue cada item de 0 a 3.</p>

      {/* 21 itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {BDII_ITEMS.map((item, i) => {
          const isAlert = item.alert && d[item.key] != null && Number(d[item.key]) > 0
          return (
            <div key={item.key} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
              padding: '5px 10px', borderRadius: 6,
              background: isAlert
                ? 'rgba(239,68,68,0.12)'
                : d[item.key] != null ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.02)',
              border: isAlert ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
            }}>
              <div style={{ fontSize: 12, color: d[item.key] != null ? '#fff' : S.muted }}>
                <span style={{ color: S.muted, fontSize: 10, marginRight: 6 }}>{i + 1}</span>
                {item.label}
                {isAlert && <span style={{ color: S.red, fontSize: 10, marginLeft: 6 }}>⚠ atenção</span>}
              </div>
              <ScoreButtons value={d[item.key]} onChange={v => update({ [item.key]: v })} max={3} />
            </div>
          )
        })}
      </div>

      {/* Resultado */}
      {answered > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            Total: {total}/63
            <span style={{ color: S.muted, fontSize: 11, marginLeft: 8 }}>({answered}/21 itens)</span>
          </span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: 0-13 Mínimo · 14-19 Leve · 20-28 Moderado · ≥29 Grave</p>

      {/* Campos adicionais */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
          <input type="text" value={d.interpretation || ''} onChange={e => update({ interpretation: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} placeholder="Texto livre..." />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Hipótese Diagnóstica</div>
          <input type="text" value={d.diagnostic_hypothesis || ''} onChange={e => update({ diagnostic_hypothesis: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} placeholder="Hipótese baseada nos resultados..." />
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} />
        </div>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex || ''} onChange={e => update({ sex: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── HAD (Base44-compliant — 7 itens Ansiedade + 7 Depressão, 0–3 cada) ──────
const HAD_ANXIETY_ITEMS = [
  { key: 'a1', label: 'Sinto-me tenso ou contraído' },
  { key: 'a2', label: 'Tenho uma sensação de medo, como se algo ruim fosse acontecer' },
  { key: 'a3', label: 'Estou com a cabeça cheia de preocupações' },
  { key: 'a4', label: 'Consigo ficar sentado à vontade e me sentir relaxado' },
  { key: 'a5', label: 'Tenho uma sensação ruim no estômago, como se fossem "borboletas"' },
  { key: 'a6', label: 'Sinto-me inquieto, como se precisasse ficar andando' },
  { key: 'a7', label: 'De repente, tenho a sensação de entrar em pânico' },
]
const HAD_DEPRESSION_ITEMS = [
  { key: 'd1', label: 'Ainda sinto prazer nas mesmas coisas de antes' },
  { key: 'd2', label: 'Sou capaz de rir e achar graça nas coisas' },
  { key: 'd3', label: 'Sinto-me alegre' },
  { key: 'd4', label: 'Estou mais lento e preciso de mais tempo para fazer as coisas' },
  { key: 'd5', label: 'Perdi o interesse em cuidar da minha aparência' },
  { key: 'd6', label: 'Fico esperando animado as coisas boas que estão por vir' },
  { key: 'd7', label: 'Consigo apreciar um bom livro ou programa de rádio/TV' },
]

function HADForm({ data, onChange }) {
  const d = data || {}
  const [tab, setTab] = React.useState('ansiedade')

  const update = (changes) => {
    const n = { ...d, ...changes }
    const aKeys = HAD_ANXIETY_ITEMS.map(i => i.key)
    const dKeys = HAD_DEPRESSION_ITEMS.map(i => i.key)
    const anxiety_answered    = aKeys.filter(k => n[k] != null).length
    const depression_answered = dKeys.filter(k => n[k] != null).length
    const anxiety_score    = anxiety_answered    > 0 ? aKeys.reduce((s, k) => s + (Number(n[k])||0), 0) : null
    const depression_score = depression_answered > 0 ? dKeys.reduce((s, k) => s + (Number(n[k])||0), 0) : null
    onChange({
      ...n,
      anxiety_score,
      depression_score,
      anxiety_classification:    anxiety_answered    === HAD_ANXIETY_ITEMS.length    ? (classify.had(anxiety_score)?.label    || '') : '',
      depression_classification: depression_answered === HAD_DEPRESSION_ITEMS.length ? (classify.had(depression_score)?.label || '') : '',
      classification: '',
    })
  }

  const aAnswered = HAD_ANXIETY_ITEMS.filter(i => d[i.key] != null).length
  const dAnswered = HAD_DEPRESSION_ITEMS.filter(i => d[i.key] != null).length
  const aScore = aAnswered > 0 ? HAD_ANXIETY_ITEMS.reduce((s, i) => s + (Number(d[i.key])||0), 0) : null
  const dScore = dAnswered > 0 ? HAD_DEPRESSION_ITEMS.reduce((s, i) => s + (Number(d[i.key])||0), 0) : null
  const ca = aScore != null ? classify.had(aScore) : null
  const cd = dScore != null ? classify.had(dScore) : null

  const tabStyle = (t) => ({
    padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  const itemRow = (item) => (
    <div key={item.key} style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
      padding: '7px 10px', borderRadius: 6, marginBottom: 3,
      background: d[item.key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ fontSize: 12, color: d[item.key] != null ? '#fff' : S.muted }}>{item.label}</div>
      <ScoreButtons value={d[item.key]} onChange={v => update({ [item.key]: v })} max={3} />
    </div>
  )

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex||''} onChange={e => update({ sex: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button style={tabStyle('ansiedade')} onClick={() => setTab('ansiedade')}>
          Ansiedade {aScore != null ? `(${aScore}/21)` : ''}
        </button>
        <button style={tabStyle('depressao')} onClick={() => setTab('depressao')}>
          Depressão {dScore != null ? `(${dScore}/21)` : ''}
        </button>
        <button style={tabStyle('resultado')} onClick={() => setTab('resultado')}>Resultado</button>
      </div>

      {tab === 'ansiedade' && (
        <div>
          {HAD_ANXIETY_ITEMS.map(itemRow)}
          {aScore != null && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ansiedade: {aScore}/21</span>
              {ca && <Badge {...ca} />}
            </div>
          )}
        </div>
      )}

      {tab === 'depressao' && (
        <div>
          {HAD_DEPRESSION_ITEMS.map(itemRow)}
          {dScore != null && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Depressão: {dScore}/21</span>
              {cd && <Badge {...cd} />}
            </div>
          )}
        </div>
      )}

      {tab === 'resultado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ansiedade: {aScore != null ? `${aScore}/21` : '—'}</span>
            {ca ? <Badge {...ca} /> : <span style={{ fontSize: 11, color: S.muted }}>não respondido</span>}
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Depressão: {dScore != null ? `${dScore}/21` : '—'}</span>
            {cd ? <Badge {...cd} /> : <span style={{ fontSize: 11, color: S.muted }}>não respondido</span>}
          </div>
          <p style={{ fontSize: 11, color: S.muted }}>Ref: 0-7 Normal · 8-10 Limítrofe · 11-14 Moderado · ≥15 Grave</p>
          <div>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
            <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
            <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8, width: 'auto' }}>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── GAI (Base44-compliant — 20 itens Sim/Não) ───────────────────────────────
const GAI_ITEMS = [
  { key: 'q1',  label: 'Eu me preocupo em grande parte do tempo' },
  { key: 'q2',  label: 'Eu acho difícil tomar uma decisão' },
  { key: 'q3',  label: 'Sinto-me agitado com frequência' },
  { key: 'q4',  label: 'Eu acho difícil relaxar' },
  { key: 'q5',  label: 'Frequentemente não consigo aproveitar as coisas por causa das minhas preocupações' },
  { key: 'q6',  label: 'Pequenas coisas me aborrecem muito' },
  { key: 'q7',  label: 'Frequentemente sinto como se tivesse um frio na barriga' },
  { key: 'q8',  label: 'Eu penso que sou preocupado' },
  { key: 'q9',  label: 'Eu não consigo parar de me preocupar' },
  { key: 'q10', label: 'Frequentemente me sinto nervoso' },
  { key: 'q11', label: 'Frequentemente sinto que algo ruim vai acontecer' },
  { key: 'q12', label: 'Frequentemente tenho tremores ou sensação de estremecimento no corpo' },
  { key: 'q13', label: 'Eu considero que sou uma pessoa bastante ansiosa' },
  { key: 'q14', label: 'Eu acho difícil controlar minha ansiedade' },
  { key: 'q15', label: 'Frequentemente me sinto como se estivesse com os nervos à flor da pele' },
  { key: 'q16', label: 'Acho que minha preocupação interfere em minhas atividades' },
  { key: 'q17', label: 'Eu me sinto bastante nervoso com frequência' },
  { key: 'q18', label: 'Minhas preocupações frequentemente me impedem de dormir à noite' },
  { key: 'q19', label: 'Eu fico muito tenso com frequência' },
  { key: 'q20', label: 'Quando fico tenso, às vezes sinto um aperto no estômago' },
]

function GAIForm({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const n = { ...d, ...changes }
    const total = GAI_ITEMS.filter(it => n[it.key] === 'Sim').length
    const answered = GAI_ITEMS.filter(it => n[it.key] != null).length
    onChange({ ...n, total_score: answered > 0 ? total : null, classification: answered === GAI_ITEMS.length ? (classify.gai(total)?.label || '') : '' })
  }

  const answered = GAI_ITEMS.filter(it => d[it.key] != null).length
  const total    = GAI_ITEMS.filter(it => d[it.key] === 'Sim').length
  const c        = answered > 0 ? classify.gai(total) : null

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex||''} onChange={e => update({ sex: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* 20 itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {GAI_ITEMS.map((it, i) => (
          <div key={it.key} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
            padding: '6px 10px', borderRadius: 6,
            background: d[it.key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize: 12, color: d[it.key] != null ? '#fff' : S.muted }}>
              <span style={{ color: S.muted, marginRight: 5 }}>{i + 1}.</span>{it.label}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Sim', 'Não'].map(opt => (
                <button key={opt} type="button" onClick={() => update({ [it.key]: opt })}
                  style={{
                    padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    background: d[it.key] === opt ? (opt === 'Sim' ? S.green : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.08)',
                    color:      d[it.key] === opt ? '#fff' : S.muted,
                  }}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Resultado */}
      {answered > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/20 ({answered} respondidos)</span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: 0-9 Normal · ≥10 Sintomas de ansiedade</p>

      {/* Observações */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── IDATE (Base44-compliant — 20 itens 1–4) ─────────────────────────────────
const IDATE_LABELS = {
  estado: [
    'Sinto-me calmo(a)',
    'Sinto-me seguro(a)',
    'Estou tenso(a)',
    'Estou arrependido(a)',
    'Sinto-me à vontade',
    'Sinto-me perturbado(a)',
    'Preocupo-me com possíveis infortúnios',
    'Sinto-me descansado(a)',
    'Sinto-me ansioso(a)',
    'Sinto-me em boa forma',
    'Sinto-me confiante',
    'Sinto-me nervoso(a)',
    'Estou agitado(a)',
    'Sinto-me indeciso(a)',
    'Estou relaxado(a)',
    'Sinto-me satisfeito(a)',
    'Estou preocupado(a)',
    'Sinto-me confuso(a)',
    'Sinto-me tranquilo(a)',
    'Sinto-me bem',
  ],
  traco: [
    'Sinto-me bem',
    'Fico cansado(a) rapidamente',
    'Tenho vontade de chorar',
    'Gostaria de ser tão feliz quanto os outros parecem ser',
    'Perco oportunidades por não me decidir rapidamente',
    'Sinto-me descansado(a)',
    'Sou calmo(a), ponderado(a) e senhor(a) de mim mesmo(a)',
    'Sinto que dificuldades se acumulam e não consigo enfrentá-las',
    'Preocupo-me com coisas sem importância',
    'Sou feliz',
    'Deixo-me afetar muito pelas coisas',
    'Não tenho muita confiança em mim mesmo(a)',
    'Sinto-me seguro(a)',
    'Evito ter que enfrentar crises e problemas',
    'Sinto-me melancólico(a)',
    'Estou satisfeito(a)',
    'Alguma ideia sem importância me pertuba e fica rondando minha cabeça',
    'Levo os desapontamentos tão a sério que não consigo esquecê-los',
    'Sou uma pessoa estável',
    'Fico tenso(a) e perturbado(a) quando penso nos meus problemas',
  ],
}

// Itens invertidos IDATE (escala 1-4 → score = 5 - valor): padrão Spielberger/Biaggio
const IDATE_REV_ESTADO = new Set([1, 2, 5, 8, 10, 11, 15, 16, 19, 20])
const IDATE_REV_TRACO  = new Set([1, 6, 7, 10, 13, 16, 19])

function idateTotal(n, isTraco) {
  const revSet = isTraco ? IDATE_REV_TRACO : IDATE_REV_ESTADO
  const keys   = Array.from({ length: 20 }, (_, i) => `q${i + 1}`)
  const answered = keys.filter(k => n[k] != null && n[k] !== '').length
  if (answered === 0) return null
  return keys.reduce((s, k, i) => {
    const raw = n[k]
    if (raw == null || raw === '') return s
    const v   = Number(raw)
    return s + (revSet.has(i + 1) ? (5 - v) : v)
  }, 0)
}

function IDATEForm({ data, onChange, label }) {
  const d = data || {}
  const isTraco   = label?.toLowerCase().includes('traço') || label?.toLowerCase().includes('traco') || label?.toLowerCase().includes('-t')
  const items     = isTraco ? IDATE_LABELS.traco : IDATE_LABELS.estado
  const scaleHint = isTraco
    ? '1 = Quase nunca · 2 = Às vezes · 3 = Frequentemente · 4 = Quase sempre'
    : '1 = Absolutamente não · 2 = Um pouco · 3 = Bastante · 4 = Muitíssimo'

  const update = (changes) => {
    const n        = { ...d, ...changes }
    const total    = idateTotal(n, isTraco)
    const answered = Array.from({ length: 20 }, (_, i) => `q${i + 1}`).filter(k => n[k] != null && n[k] !== '').length
    onChange({ ...n, total_score: total, classification: answered === 20 ? (classify.idate(total)?.label || '') : '' })
  }

  const total    = idateTotal(d, isTraco)
  const answered = Array.from({ length: 20 }, (_, i) => `q${i + 1}`).filter(k => d[k] != null && d[k] !== '').length
  const c        = total != null ? classify.idate(total) : null

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex||''} onChange={e => update({ sex: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Estado Civil</div>
          <input value={d.marital_status||''} onChange={e => update({ marital_status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="solteiro, casado..." />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Ocupação</div>
          <input value={d.occupation||''} onChange={e => update({ occupation: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <input value={d.education||''} onChange={e => update({ education: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Informante / Relação</div>
          <input value={d.informant||''} onChange={e => update({ informant: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="Nome" />
        </div>
      </div>

      {/* Escala */}
      <div style={{ fontSize: 10, color: S.muted, marginBottom: 8, fontStyle: 'italic' }}>{scaleHint}</div>

      {/* 20 itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map((lbl, i) => {
          const key = `q${i + 1}`
          return (
            <div key={key} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
              padding: '6px 10px', borderRadius: 6,
              background: d[key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: 12, color: d[key] != null ? '#fff' : S.muted }}>
                <span style={{ color: S.muted, marginRight: 5 }}>{i + 1}.</span>{lbl}
              </div>
              <ScoreButtons value={d[key]} onChange={v => update({ [key]: v })} min={1} max={4} />
            </div>
          )
        })}
      </div>

      {/* Resultado */}
      {total != null && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/80 ({answered}/20 respondidos)</span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: {'<'}40 Baixo · 40–59 Médio · ≥60 Alto</p>

      {/* Interpretação e observações */}
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
          <input value={d.interpretation||''} onChange={e => update({ interpretation: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="texto livre..." />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── IQCODE (Base44-compliant — 26 itens 1–5) ────────────────────────────────
const IQCODE_ITEMS = [
  'Reconhecer amigos e familiares',
  'Lembrar-se do nome de amigos e familiares',
  'Lembrar-se de coisas sobre os amigos e familiares, p.ex., profissão, aniversário, ocupação',
  'Lembrar-se de coisas que aconteceram recentemente',
  'Lembrar-se do que conversou nos últimos dias',
  'Esquecer o que ele(a) queria dizer no meio da conversa',
  'Lembrar-se do seu endereço e telefone',
  'Lembrar-se do dia e mês correntes',
  'Lembrar-se onde as coisas são guardadas usualmente',
  'Lembrar-se onde foram guardadas coisas que foram colocadas em locais diferentes do usual',
  'Adaptar-se às mudanças em sua rotina diária',
  'Saber como os aparelhos da casa funcionam',
  'Aprender como usar novos aparelhos em casa',
  'Aprender coisas novas em geral',
  'Lembrar-se de coisas que aconteceram quando ele(a) era jovem',
  'Lembrar-se de coisas que ele(a) aprendeu quando era jovem',
  'Entender o significado de palavras pouco comuns',
  'Entender artigos de revista ou jornais',
  'Acompanhar uma história em um livro ou televisão',
  'Escrever uma carta para um amigo ou uma proposta de trabalho',
  'Conhecer sobre eventos históricos importantes do passado',
  'Tomar decisões em problemas do dia-a-dia',
  'Manusear dinheiro para as compras',
  'Lidar com problemas financeiros',
  'Lidar com outros problemas do dia-a-dia, p.ex., saber quanta comida comprar, saber quanto tempo passou entre visitas de amigos e familiares',
  'Usar a sua inteligência para entender qual o sentido das coisas',
]

function IQCODEForm({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const n = { ...d, ...changes }
    const keys     = Array.from({ length: 26 }, (_, i) => `q${i + 1}`)
    const answered = keys.filter(k => n[k] != null).length
    const total    = answered > 0 ? keys.reduce((s, k) => s + (Number(n[k]) || 0), 0) : null
    const mean     = total != null ? Math.round((total / 26) * 100) / 100 : null
    onChange({ ...n, total_score: total, mean_score: mean, classification: answered === 26 ? (classify.iqcode(mean)?.label || '') : '' })
  }

  const keys     = Array.from({ length: 26 }, (_, i) => `q${i + 1}`)
  const answered = keys.filter(k => d[k] != null).length
  const total    = answered > 0 ? keys.reduce((s, k) => s + (Number(d[k]) || 0), 0) : null
  const mean     = total != null ? Math.round((total / 26) * 100) / 100 : null
  const c        = mean != null ? classify.iqcode(mean) : null

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <NumField label="Ano de referência (10 anos atrás)" value={d.reference_year} onChange={v => update({ reference_year: v })} min={1900} max={2030} hint="ano" />
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Informante</div>
          <input value={d.informant||''} onChange={e => update({ informant: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="nome" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Relação com o paciente</div>
          <input value={d.informant_relationship||''} onChange={e => update({ informant_relationship: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="filho, cônjuge..." />
        </div>
      </div>

      {/* Escala */}
      <div style={{ fontSize: 10, color: S.muted, marginBottom: 8, fontStyle: 'italic' }}>
        1 = Melhorou muito · 2 = Melhorou um pouco · 3 = Não mudou · 4 = Piorou um pouco · 5 = Piorou muito
      </div>

      {/* 26 itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {IQCODE_ITEMS.map((lbl, i) => {
          const key = `q${i + 1}`
          return (
            <div key={key} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
              padding: '6px 10px', borderRadius: 6,
              background: d[key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: 12, color: d[key] != null ? '#fff' : S.muted }}>
                <span style={{ color: S.muted, marginRight: 5 }}>{i + 1}.</span>{lbl}
              </div>
              <ScoreButtons value={d[key]} onChange={v => update({ [key]: v })} min={1} max={5} />
            </div>
          )
        })}
      </div>

      {/* Resultado */}
      {mean != null && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Média: {mean.toFixed(2)} ({answered}/26 itens)</span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: {'<'}3,31 Sem declínio · 3,31–3,6 Indeterminado · {'>'}3,6 Sugestivo de declínio</p>

      {/* Interpretação e Observações */}
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
          <input value={d.interpretation||''} onChange={e => update({ interpretation: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="texto livre..." />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── B-ADL (Base44-compliant, 25 itens com nomes descritivos) ────────────────
const BADL_ITEMS = [
  { key: 'q1_daily_activities',        label: 'Atividades cotidianas' },
  { key: 'q2_self_care',               label: 'Autocuidado' },
  { key: 'q3_medication',              label: 'Medicação' },
  { key: 'q4_hygiene',                 label: 'Higiene' },
  { key: 'q5_remember_dates',          label: 'Lembrar datas' },
  { key: 'q6_reading_concentration',   label: 'Leitura / Concentração' },
  { key: 'q7_describe_events',         label: 'Descrever eventos' },
  { key: 'q8_conversation',            label: 'Conversação' },
  { key: 'q9_telephone',               label: 'Telefone' },
  { key: 'q10_give_message',           label: 'Transmitir recado' },
  { key: 'q11_walk_without_getting_lost', label: 'Caminhar sem se perder' },
  { key: 'q12_shopping',               label: 'Compras' },
  { key: 'q13_prepare_food',           label: 'Preparar refeição' },
  { key: 'q14_count_money',            label: 'Contar dinheiro' },
  { key: 'q15_manage_finances',        label: 'Gerenciar finanças' },
  { key: 'q16_give_directions',        label: 'Dar direções' },
  { key: 'q17_use_appliances',         label: 'Usar eletrodomésticos' },
  { key: 'q18_orientation_new_places', label: 'Orientação em lugares novos' },
  { key: 'q19_use_transportation',     label: 'Usar transporte' },
  { key: 'q20_leisure_activities',     label: 'Atividades de lazer' },
  { key: 'q21_resume_activity',        label: 'Retomar atividade interrompida' },
  { key: 'q22_multitask',              label: 'Múltiplas tarefas' },
  { key: 'q23_unfamiliar_situations',  label: 'Situações não familiares' },
  { key: 'q24_safety',                 label: 'Segurança' },
  { key: 'q25_under_pressure',         label: 'Sob pressão' },
]

function BADLForm({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const next = { ...d, ...changes }
    const answered = BADL_ITEMS.filter(it => next[it.key] != null && next[it.key] !== '' && Number(next[it.key]) >= 1)
    const meanVal  = answered.length > 0
      ? answered.reduce((sum, it) => sum + Number(next[it.key]), 0) / answered.length
      : null
    onChange({
      ...next,
      items_answered: answered.length,
      total_score:    meanVal != null ? parseFloat(meanVal.toFixed(2)) : null,
      classification: answered.length === BADL_ITEMS.length ? (classify.badl(meanVal)?.label || '') : '',
    })
  }

  const answered = BADL_ITEMS.filter(it => d[it.key] != null && d[it.key] !== '' && Number(d[it.key]) >= 1)
  const meanVal  = answered.length > 0
    ? answered.reduce((sum, it) => sum + Number(d[it.key]), 0) / answered.length
    : null
  const meanStr = meanVal != null ? meanVal.toFixed(2) : null
  const c = meanStr ? classify.badl(meanStr) : null

  return (
    <div>
      <p style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>
        Pontue de 1 (sem dificuldade) a 10 (máxima dificuldade). Use 0 para "não se aplica / não sei". Deixe em branco se não respondido.
      </p>

      {/* Itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {BADL_ITEMS.map((item, i) => (
          <div key={item.key} style={{
            display: 'grid', gridTemplateColumns: '1fr 72px', gap: 10, alignItems: 'center',
            padding: '5px 10px', borderRadius: 6,
            background: d[item.key] ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize: 12, color: d[item.key] ? '#fff' : S.muted }}>
              <span style={{ color: S.muted, fontSize: 10, marginRight: 6 }}>Q{i + 1}</span>
              {item.label}
            </div>
            <input
              type="number" min={0} max={10}
              value={d[item.key] ?? ''}
              onChange={e => update({ [item.key]: e.target.value === '' ? null : Number(e.target.value) })}
              style={{ ...inputStyle, textAlign: 'center' }}
            />
          </div>
        ))}
      </div>

      {/* Resultado */}
      {meanStr && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#fff' }}>
            Média: <strong>{meanStr}</strong>
            <span style={{ color: S.muted, fontSize: 11, marginLeft: 8 }}>({answered.length}/25 itens)</span>
          </span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: {'<'}3,5 Normal · 3,5-4,9 Leve · 5-7,4 Moderado · ≥7,5 Grave</p>

      {/* Interpretação e Observações */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
          <input type="text" value={d.interpretation || ''} onChange={e => update({ interpretation: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} placeholder="Texto livre..." />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: S.muted }}>Status:</span>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, width: 'auto', flex: 1, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Nascimento</div>
          <input type="date" value={d.birth_date || ''} onChange={e => update({ birth_date: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left' }} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── Pfeffer (Base44-compliant — 10 itens 0–3) ───────────────────────────────
const PFEFFER_ITEMS = [
  { key: 'q1',  label: 'Manuseia próprio dinheiro (pagar contas, controlar finanças)' },
  { key: 'q2',  label: 'Faz compras sozinho (supermercado, roupas)' },
  { key: 'q3',  label: 'Esquenta água, apaga o fogo e desliga eletrodomésticos' },
  { key: 'q4',  label: 'Prepara refeição completa' },
  { key: 'q5',  label: 'Mantém-se atualizado sobre acontecimentos' },
  { key: 'q6',  label: 'Presta atenção e compreende TV, rádio ou jornal' },
  { key: 'q7',  label: 'Lembra compromissos, acontecimentos recentes e familiar' },
  { key: 'q8',  label: 'Toma medicamentos corretamente' },
  { key: 'q9',  label: 'Passeia pelo bairro e encontra o caminho de volta' },
  { key: 'q10', label: 'Fica sozinho em casa com segurança' },
]

function PfefferForm({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const n = { ...d, ...changes }
    const answered = PFEFFER_ITEMS.filter(it => n[it.key] != null).length
    const total    = answered > 0 ? PFEFFER_ITEMS.reduce((s, it) => s + (Number(n[it.key]) || 0), 0) : null
    onChange({ ...n, total_score: total, classification: answered === PFEFFER_ITEMS.length ? (classify.pfeffer(total)?.label || '') : '' })
  }

  const answered = PFEFFER_ITEMS.filter(it => d[it.key] != null).length
  const total    = answered > 0 ? PFEFFER_ITEMS.reduce((s, it) => s + (Number(d[it.key]) || 0), 0) : null
  const c        = total != null ? classify.pfeffer(total) : null

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Informante</div>
          <input value={d.informant||''} onChange={e => update({ informant: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="nome" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Grau de parentesco</div>
          <input value={d.informant_relationship||''} onChange={e => update({ informant_relationship: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="filho, cônjuge..." />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Escala */}
      <div style={{ fontSize: 10, color: S.muted, marginBottom: 8, fontStyle: 'italic' }}>
        0 = Capaz / nunca precisou de ajuda · 1 = Com dificuldade, mas capaz · 2 = Precisa de ajuda · 3 = Incapaz
      </div>

      {/* 10 itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {PFEFFER_ITEMS.map((it, i) => (
          <div key={it.key} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
            padding: '7px 10px', borderRadius: 6,
            background: d[it.key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize: 12, color: d[it.key] != null ? '#fff' : S.muted }}>
              <span style={{ color: S.muted, marginRight: 5 }}>{i + 1}.</span>{it.label}
            </div>
            <ScoreButtons value={d[it.key]} onChange={v => update({ [it.key]: v })} max={3} />
          </div>
        ))}
      </div>

      {/* Resultado */}
      {total != null && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/30 ({answered}/10 itens)</span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: 0–5 Normal · 6–10 Limítrofe · ≥11 Comprometimento funcional</p>

      {/* Interpretação e Observações */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
        <input value={d.interpretation||''} onChange={e => update({ interpretation: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="texto livre..." />
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── Lawton (Base44-compliant — 9 itens 1–3) ─────────────────────────────────
const LAWTON_ITEMS = [
  { key: 'q1_telephone',    label: 'Habilidade para usar o telefone' },
  { key: 'q2_shopping',     label: 'Capacidade de fazer compras' },
  { key: 'q3_meal_prep',    label: 'Preparação de refeições' },
  { key: 'q4_housekeeping', label: 'Cuidados da casa' },
  { key: 'q5_laundry',      label: 'Lavagem de roupas' },
  { key: 'q6_handwork',     label: 'Trabalhos manuais domésticos' },
  { key: 'q7_transportation',label: 'Meios de transporte' },
  { key: 'q8_medication',   label: 'Responsabilidade com medicamentos' },
  { key: 'q9_finances',     label: 'Capacidade para cuidar do dinheiro' },
]

function LawtonForm({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const n = { ...d, ...changes }
    const answered = LAWTON_ITEMS.filter(it => n[it.key] != null).length
    const total    = answered > 0 ? LAWTON_ITEMS.reduce((s, it) => s + (Number(n[it.key]) || 0), 0) : null
    onChange({ ...n, total_score: total, classification: answered === LAWTON_ITEMS.length ? (classify.lawton(total)?.label || '') : '' })
  }

  const answered = LAWTON_ITEMS.filter(it => d[it.key] != null).length
  const total    = answered > 0 ? LAWTON_ITEMS.reduce((s, it) => s + (Number(d[it.key]) || 0), 0) : null
  const c        = total != null ? classify.lawton(total) : null

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Escala */}
      <div style={{ fontSize: 10, color: S.muted, marginBottom: 8, fontStyle: 'italic' }}>
        1 = Dependente · 2 = Necessita de ajuda · 3 = Independente
      </div>

      {/* 9 itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {LAWTON_ITEMS.map((it, i) => (
          <div key={it.key} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
            padding: '7px 10px', borderRadius: 6,
            background: d[it.key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize: 12, color: d[it.key] != null ? '#fff' : S.muted }}>
              <span style={{ color: S.muted, marginRight: 5 }}>{i + 1}.</span>{it.label}
            </div>
            <ScoreButtons value={d[it.key]} onChange={v => update({ [it.key]: v })} min={1} max={3} />
          </div>
        ))}
      </div>

      {/* Resultado */}
      {total != null && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/27 ({answered}/9 itens)</span>
          {c && <Badge {...c} />}
        </div>
      )}
      <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>Ref: 27 Independente · 18–26 Dep. leve · 9–17 Dep. moderada/grave</p>

      {/* Interpretação e Observações */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
        <input value={d.interpretation||''} onChange={e => update({ interpretation: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="texto livre..." />
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── WASI / WASI-III (Base44-compliant) ──────────────────────────────────────
function WASIForm({ data, onChange, version }) {
  const d = data || {}
  const isIII = version === 'WASI-III'
  const [tab, setTab] = React.useState('subtestes')
  const [showVocabItems,   setShowVocabItems]   = React.useState(false)
  const [showSimilItems,   setShowSimilItems]   = React.useState(false)
  const [showMatrixItems,  setShowMatrixItems]  = React.useState(false)

  // Versão-específica: contagens e maximos
  const cfg = isIII
    ? { vocabCount: 32, vocabMax: 64, similCount: 24, similMax: 48, hasInstType: true, hasClassif: true }
    : { vocabCount: 42, vocabMax: 84, similCount: 26, similMax: 52, hasInstType: false, hasClassif: false }

  const update = (changes) => {
    const n = { ...d, ...changes }
    if (Array.isArray(n.vocabulary_items))
      n.vocabulary_score = n.vocabulary_items.reduce((s, v) => s + (Number(v) || 0), 0)
    if (Array.isArray(n.similarities_items))
      n.similarities_score = n.similarities_items.reduce((s, v) => s + (Number(v) || 0), 0)
    if (!isIII && Array.isArray(n.matrix_items))
      n.matrix_score = n.matrix_items.reduce((s, v) => s + (Number(v) || 0), 0)
    const wasiComplete = n.qit_2 != null && n.qit_2 !== '' && n.qiv != null && n.qiv !== ''
    n.classification     = wasiComplete ? (classify.wasi(n.qit_2)?.label || '') : ''
    if (n.qiv   != null && n.qiv   !== '') n.qiv_classification  = classify.wasi(n.qiv)?.label   || ''
    if (n.qie   != null && n.qie   !== '') n.qie_classification  = classify.wasi(n.qie)?.label   || ''
    onChange(n)
  }

  const tabStyle = (t) => ({
    padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11,
    fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  const cqit2 = classify.wasi(d.qit_2)
  const cqiv  = classify.wasi(d.qiv)
  const cqie  = classify.wasi(d.qie)
  const cqit4 = classify.wasi(d.qit_4)

  // Grid de itens 0–2 (vocabulário / semelhanças)
  const itemGrid02 = (items, count, fieldKey) => {
    const arr = Array.from({ length: count }, (_, i) =>
      Array.isArray(items) && items[i] != null ? Number(items[i]) : null
    )
    const total = arr.reduce((s, v) => s + (v != null ? v : 0), 0)
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 4px' }}>
        {arr.map((v, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: 9, color: S.muted, lineHeight: 1 }}>{i + 1}</span>
            <ScoreButtons value={v} max={2} onChange={nv => {
              const a = [...(Array.isArray(items) ? items : Array(count).fill(null))]
              a[i] = nv
              update({ [fieldKey]: a })
            }} />
          </div>
        ))}
        <span style={{ alignSelf: 'center', marginLeft: 8, fontSize: 13, fontWeight: 700, color: S.greenL }}>= {total}</span>
      </div>
    )
  }

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <select value={d.education_level || ''} onChange={e => update({ education_level: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            {['1-4 anos','5-8 anos','9+ anos','Ensino Fundamental','Ensino Médio','Ensino Superior','Pós-graduação'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        {cfg.hasInstType ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Instituição</div>
            <select value={d.institution_type || ''} onChange={e => update({ institution_type: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
              <option value="">—</option>
              <option value="publica">Pública</option>
              <option value="privada">Privada</option>
            </select>
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de nascimento</div>
            <input type="date" value={d.birth_date || ''} onChange={e => update({ birth_date: e.target.value })} style={inputStyle} />
          </div>
        )}
        {cfg.hasInstType && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de nascimento</div>
            <input type="date" value={d.birth_date || ''} onChange={e => update({ birth_date: e.target.value })} style={inputStyle} />
          </div>
        )}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de aplicação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        <button style={tabStyle('subtestes')} onClick={() => setTab('subtestes')}>Subtestes</button>
        <button style={tabStyle('qis')} onClick={() => setTab('qis')}>QIs Compostos</button>
        <button style={tabStyle('resultado')} onClick={() => setTab('resultado')}>Resultado</button>
        <button style={tabStyle('obs')} onClick={() => setTab('obs')}>Observações</button>
      </div>

      {/* ── Tab: Subtestes ─────────────────────────────────────────────────────── */}
      {tab === 'subtestes' && (
        <div>
          {/* Vocabulário */}
          <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Vocabulário — {cfg.vocabCount} itens (0–2)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumField label={`Escore bruto (0–${cfg.vocabMax})`} value={d.vocabulary_score}
                onChange={v => update({ vocabulary_score: v })} min={0} max={cfg.vocabMax} />
              <NumField label="Escore T" value={d.vocabulary_t_score}
                onChange={v => update({ vocabulary_t_score: v })} min={20} max={100} hint="T" />
            </div>
            <button type="button" onClick={() => setShowVocabItems(!showVocabItems)}
              style={{ fontSize: 11, color: S.blue, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
              {showVocabItems ? '▲ Ocultar itens' : `▶ Registrar ${cfg.vocabCount} itens`}
            </button>
            {showVocabItems && itemGrid02(d.vocabulary_items, cfg.vocabCount, 'vocabulary_items')}
          </div>

          {/* Semelhanças */}
          <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Semelhanças — {cfg.similCount} itens (0–2)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumField label={`Escore bruto (0–${cfg.similMax})`} value={d.similarities_score}
                onChange={v => update({ similarities_score: v })} min={0} max={cfg.similMax} />
              <NumField label="Escore T" value={d.similarities_t_score}
                onChange={v => update({ similarities_t_score: v })} min={20} max={100} hint="T" />
            </div>
            <button type="button" onClick={() => setShowSimilItems(!showSimilItems)}
              style={{ fontSize: 11, color: S.blue, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
              {showSimilItems ? '▲ Ocultar itens' : `▶ Registrar ${cfg.similCount} itens`}
            </button>
            {showSimilItems && itemGrid02(d.similarities_items, cfg.similCount, 'similarities_items')}
          </div>

          {/* Cubos */}
          <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Cubos — 13 itens</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumField label="Escore bruto" value={d.blocks_score}
                onChange={v => update({ blocks_score: v })} min={0} max={71} />
              <NumField label="Escore T" value={d.blocks_t_score}
                onChange={v => update({ blocks_t_score: v })} min={20} max={100} hint="T" />
            </div>
          </div>

          {/* Raciocínio Matricial */}
          <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Raciocínio Matricial — 35 itens{!isIII ? ' (0–1)' : ''}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NumField label="Escore bruto (0–35)" value={d.matrix_score}
                onChange={v => update({ matrix_score: v })} min={0} max={35} />
              <NumField label="Escore T" value={d.matrix_t_score}
                onChange={v => update({ matrix_t_score: v })} min={20} max={100} hint="T" />
            </div>
            {!isIII && (
              <>
                <button type="button" onClick={() => setShowMatrixItems(!showMatrixItems)}
                  style={{ fontSize: 11, color: S.blue, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                  {showMatrixItems ? '▲ Ocultar itens' : '▶ Registrar 35 itens (0/1)'}
                </button>
                {showMatrixItems && (
                  <div style={{ paddingTop: 6 }}>
                    <ItemGrid
                      values={d.matrix_items || []}
                      count={35}
                      onChangeFn={v => update({ matrix_items: v })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: QIs Compostos ─────────────────────────────────────────────────── */}
      {tab === 'qis' && (
        <div>
          {[
            { label: 'QI Verbal (Vocabulário + Semelhanças)',      qiKey: 'qiv',   percKey: 'qiv_percentile', classKey: cfg.hasClassif ? 'qiv_classification' : null, badge: cqiv  },
            { label: 'QI de Execução (Cubos + Raciocínio Matricial)', qiKey: 'qie', percKey: 'qie_percentile', classKey: cfg.hasClassif ? 'qie_classification' : null, badge: cqie  },
            { label: 'QI Total — 2 subtestes',                     qiKey: 'qit_2', percKey: 'qit_percentile', classKey: cfg.hasClassif ? 'qit_classification' : null, badge: cqit2 },
            { label: 'QI Total — 4 subtestes',                     qiKey: 'qit_4', percKey: null,             classKey: null, badge: cqit4 },
          ].map(({ label, qiKey, percKey, classKey, badge }) => (
            <div key={qiKey} style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: percKey ? (classKey ? 'repeat(3,1fr)' : '1fr 1fr') : '1fr', gap: 8 }}>
                <div>
                  <NumField label="QI" value={d[qiKey]} onChange={v => update({ [qiKey]: v })} min={40} max={160} />
                  {badge && <div style={{ marginTop: 4 }}><Badge {...badge} /></div>}
                </div>
                {percKey && (
                  <NumField label="Percentil" value={d[percKey]} onChange={v => update({ [percKey]: v })} min={1} max={99} hint="1-99" />
                )}
                {classKey && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Classificação</div>
                    <input value={d[classKey] || ''} onChange={e => update({ [classKey]: e.target.value })}
                      style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="Ex: Médio" />
                  </div>
                )}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>Ref QI: ≥130 Muito Superior · 120–129 Superior · 110–119 Médio Alto · 90–109 Médio · 80–89 Médio Baixo · 70–79 Limítrofe · &lt;70 Extremamente Baixo</p>
        </div>
      )}

      {/* ── Tab: Resultado ─────────────────────────────────────────────────────── */}
      {tab === 'resultado' && (
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Resumo WASI</div>
          {[
            ['QIV (Verbal)', d.qiv, cqiv],
            ['QIE (Execução)', d.qie, cqie],
            ['QIT-2 (2 subtestes)', d.qit_2, cqit2],
            ['QIT-4 (4 subtestes)', d.qit_4, cqit4],
          ].map(([lbl, val, cls]) => val != null && (
            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
              <span style={{ fontSize: 12, color: '#fff' }}>{lbl}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: S.greenL }}>{val}</span>
                {cls && <Badge {...cls} />}
              </div>
            </div>
          ))}
          {!d.qiv && !d.qie && !d.qit_2 && !d.qit_4 && (
            <p style={{ fontSize: 12, color: S.muted }}>Nenhum QI preenchido ainda.</p>
          )}
        </div>
      )}

      {/* ── Tab: Observações ───────────────────────────────────────────────────── */}
      {tab === 'obs' && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações comportamentais</div>
            <textarea rows={3} value={d.behavioral_observations || ''} onChange={e => update({ behavioral_observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
            <textarea rows={3} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>URL do scan</div>
            <input value={d.scan_url || ''} onChange={e => update({ scan_url: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="https://..." />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WCST-N (Base44-compliant) ────────────────────────────────────────────────
const WCST_COLORS = {
  C: { bg: 'rgba(59,130,246,0.35)', text: '#93C5FD' },
  F: { bg: 'rgba(46,125,50,0.45)',  text: '#4CAF50' },
  N: { bg: 'rgba(245,158,11,0.35)', text: '#FCD34D' },
  O: { bg: 'rgba(239,68,68,0.35)',  text: '#F87171' },
  '': { bg: 'rgba(255,255,255,0.05)', text: '#9CA3AF' },
}

// Tabela normativa WCST-N — Zimmermann et al. (2015)
// Percentis: [p95, p90, p75, p50, p25, p10, p5]
const WCST_N_NORMAS = {
  categorias:        { jovens: { baixa:[5,5,5,4,3,2,2],   alta:[6,6,6,6,6,5,4] }, intermediaria:{ baixa:[6,6,5,4,2,2,2],   alta:[6,6,6,6,4,3,2] }, idosos:{ baixa:[6,6,5,3,2,2,2],   alta:[6,6,6,6,6,5,5] } },
  ensaios:           { jovens: { baixa:[39,48,48,48,48,48,48], alta:[36,36,37,42,48,48,48] }, intermediaria:{ baixa:[43,46,48,48,48,48,48], alta:[36,37,37,43,48,48,48] }, idosos:{ baixa:[39,40,48,48,48,48,48], alta:[36,38,40,44,48,48,48] } },
  acertos:           { jovens: { baixa:[38,38,34,32,28,20,19], alta:[43,42,39,36,36,35,26] }, intermediaria:{ baixa:[40,40,37,29,25,20,19], alta:[40,40,37,36,34,30,26] }, idosos:{ baixa:[36,36,34,27,23,20,19], alta:[42,41,39,37,36,34,32] } },
  erros:             { jovens: { baixa:[1,8,14,16,20,28,28],  alta:[0,0,0,4,8,13,22]  }, intermediaria:{ baixa:[6,7,10,19,23,28,28],  alta:[0,1,1,3,14,19,19] }, idosos:{ baixa:[3,4,14,21,25,28,28],  alta:[0,2,4,6,9,14,16] } },
  perseverativos:    { jovens: { baixa:[0,4,8,12,18,20,20],  alta:[0,0,0,3,5,7,9]   }, intermediaria:{ baixa:[5,5,6,14,17,22,22],  alta:[0,0,1,2,11,14,14] }, idosos:{ baixa:[2,3,11,16,17,24,24],  alta:[0,1,2,3,6,8,13] } },
  naoPerseverativos: { jovens: { baixa:[1,2,3,6,7,9,9],   alta:[0,0,2,4,7,14,14] }, intermediaria:{ baixa:[1,1,2,3,7,9,9],   alta:[0,0,0,1,3,7,7] }, idosos:{ baixa:[1,1,2,4,7,9,9],   alta:[0,0,1,2,4,5,6] } },
  rupturas:          { jovens: { baixa:[0,0,0,1,1,2,2],   alta:[0,0,0,0,1,2,3] }, intermediaria:{ baixa:[0,0,0,1,1,2,2],   alta:[0,0,0,0,1,2,2] }, idosos:{ baixa:[0,0,0,1,1,3,3],   alta:[0,0,0,0,1,1,2] } },
}
const WCST_N_PCTS = [95, 90, 75, 50, 25, 10, 5]

function wcstGetGrupo(age) {
  const a = Number(age)
  if (a <= 39) return 'jovens'
  if (a <= 59) return 'intermediaria'
  return 'idosos'
}
function wcstGetEsc(edu) {
  if (!edu) return 'alta'
  return (String(edu).includes('baixa') || String(edu).includes('2-7')) ? 'baixa' : 'alta'
}
function wcstCalcPct(score, normArray, inverse) {
  if (score == null || score === '' || !normArray) return null
  const s = Number(score)
  if (!inverse) {
    for (let i = 0; i < WCST_N_PCTS.length; i++) { if (s >= normArray[i]) return WCST_N_PCTS[i] }
    return 1
  } else {
    for (let i = 0; i < WCST_N_PCTS.length; i++) { if (s <= normArray[i]) return WCST_N_PCTS[i] }
    return 1
  }
}
function wcstClassFromPct(pct) {
  if (pct == null) return null
  if (pct >= 95) return { label: 'MUITO SUPERIOR', type: 'preserved'  }
  if (pct >= 90) return { label: 'SUPERIOR',        type: 'preserved'  }
  if (pct >= 75) return { label: 'MÉDIA SUPERIOR',  type: 'preserved'  }
  if (pct >  25) return { label: 'MÉDIA',            type: 'preserved'  }
  if (pct >= 10) return { label: 'MÉDIA INFERIOR',  type: 'borderline' }
  if (pct >= 5)  return { label: 'LIMÍTROFE',        type: 'impaired'   }
  return               { label: 'INFERIOR',          type: 'impaired'   }
}

function initWCSTTrials(existing) {
  if (Array.isArray(existing) && existing.length > 0) {
    return existing.map((t, i) => ({
      number: i + 1, response: t.response || '',
      isCorrect: t.isCorrect ?? null, isPerseverative: t.isPerseverative ?? false,
      isNewCategory: t.isNewCategory ?? (i === 0), cardType: t.cardType ?? '',
    }))
  }
  return Array.from({ length: 48 }, (_, i) => ({
    number: i + 1, response: '', isCorrect: null, isPerseverative: false,
    isNewCategory: i === 0, cardType: '',
  }))
}

function calcWCSTScores(trials) {
  let ta = 0, cc = 0, tc = 0, te = 0, tb = 0, pe = 0
  let consec = 0, catCorrects = 0
  trials.forEach((t, i) => {
    if (t.isNewCategory && i > 0) { catCorrects = 0; consec = 0 }
    if (t.response && t.response !== '') {
      ta++
      if (t.isCorrect === true)  { tc++; catCorrects++; consec++; if (catCorrects === 6) { cc++; catCorrects = 0 } }
      if (t.isCorrect === false) { te++; if (t.isPerseverative) pe++; if (consec >= 5) tb++; consec = 0; catCorrects = 0 }
    }
  })
  return {
    trials_administered: ta || null, categories_completed: cc || null,
    total_correct: tc || null, total_errors: te || null, total_breaks: tb || null,
    perseverative_errors: pe || null, non_perseverative_errors: te > 0 ? te - pe : null,
  }
}

function WCSTForm({ data, onChange }) {
  const d = data || {}
  const [tab, setTab] = React.useState('tentativas')

  const trials = initWCSTTrials(d.trials)
  const auto   = calcWCSTScores(trials)

  const update = (changes) => {
    const n = { ...d, ...changes }
    if (changes.trials) {
      const a = calcWCSTScores(changes.trials)
      if (a.trials_administered != null) Object.assign(n, a)
    } else {
      const pe = n.perseverative_errors != null && n.perseverative_errors !== '' ? Number(n.perseverative_errors) : null
      const te = n.total_errors != null && n.total_errors !== '' ? Number(n.total_errors) : null
      if (pe != null && te != null) n.non_perseverative_errors = Math.max(0, te - pe)
      const ta = n.trials_administered != null && n.trials_administered !== '' ? Number(n.trials_administered) : null
      if (ta != null && te != null) n.total_correct = Math.max(0, ta - te)
    }
    const allTrials = n.trials_administered != null && n.trials_administered >= 48
    const cat48 = allTrials ? (n.categories_completed !== null && n.categories_completed !== undefined ? n.categories_completed : 0) : null
    n.classification = allTrials ? (classify.wcst_cat(cat48)?.label || 'COMPROMETIDO') : ''
    onChange(n)
  }

  const setTrialResponse = (i, resp) => {
    const arr = [...trials]
    arr[i] = { ...arr[i], response: resp }
    if (resp === 'O') { arr[i].isCorrect = false }
    else if (resp && arr[i].cardType) { arr[i].isCorrect = resp === arr[i].cardType }
    else if (!resp) { arr[i].isCorrect = null; arr[i].isPerseverative = false }
    update({ trials: arr })
  }

  const toggleCorrect = (i) => {
    const arr = [...trials]
    const t = arr[i]
    if (t.isCorrect === null)  arr[i] = { ...t, isCorrect: true }
    else if (t.isCorrect === true) arr[i] = { ...t, isCorrect: false }
    else arr[i] = { ...t, isCorrect: null, isPerseverative: false }
    update({ trials: arr })
  }

  const togglePerseverative = (i) => {
    const arr = [...trials]
    arr[i] = { ...arr[i], isPerseverative: !arr[i].isPerseverative }
    update({ trials: arr })
  }

  const toggleNewCategory = (i) => {
    const arr = [...trials]
    const was = arr[i].isNewCategory
    arr[i] = { ...arr[i], isNewCategory: !was, cardType: was ? '' : arr[i].cardType }
    update({ trials: arr })
  }

  const setCardType = (i, ct) => {
    const arr = [...trials]
    arr[i] = { ...arr[i], cardType: ct }
    for (let j = i; j < arr.length; j++) {
      if (j > i && arr[j].isNewCategory) break
      if (arr[j].response && arr[j].response !== 'O')
        arr[j] = { ...arr[j], isCorrect: arr[j].response === ct }
    }
    update({ trials: arr })
  }

  const tabStyle = (t) => ({
    padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11,
    fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  const answered = trials.filter(t => t.response !== '').length
  const grupo = wcstGetGrupo(d.age)
  const esc   = wcstGetEsc(d.education)
  const NR    = WCST_N_NORMAS
  const getVal = (key) => d[key] != null && d[key] !== '' ? d[key] : auto[key]
  const pctCat  = wcstCalcPct(getVal('categories_completed'), NR.categorias[grupo][esc],        false)
  const pctEns  = wcstCalcPct(getVal('trials_administered'),  NR.ensaios[grupo][esc],            true)
  const pctAce  = wcstCalcPct(getVal('total_correct'),         NR.acertos[grupo][esc],            false)
  const pctErr  = wcstCalcPct(getVal('total_errors'),          NR.erros[grupo][esc],              true)
  const pctPe   = wcstCalcPct(getVal('perseverative_errors'),  NR.perseverativos[grupo][esc],     true)
  const pctNPe  = wcstCalcPct(getVal('non_perseverative_errors'), NR.naoPerseverativos[grupo][esc], true)
  const pctRupt = wcstCalcPct(getVal('total_breaks'),          NR.rupturas[grupo][esc],           true)
  const grupoLabel = { jovens:'Jovens (≤39)', intermediaria:'Intermediária (40–59)', idosos:'Idosos (60+)' }[grupo]

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <select value={d.education || ''} onChange={e => update({ education: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">Selecione</option>
            <option value="baixa">Baixa (2–7 anos)</option>
            <option value="alta">Alta (8+ anos)</option>
          </select>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de nascimento</div>
          <input type="date" value={d.birth_date || ''} onChange={e => update({ birth_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de aplicação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        <button style={tabStyle('tentativas')} onClick={() => setTab('tentativas')}>Tentativas ({answered}/48)</button>
        <button style={tabStyle('pontuacao')}  onClick={() => setTab('pontuacao')}>Pontuação</button>
        <button style={tabStyle('resultado')}  onClick={() => setTab('resultado')}>Resultado</button>
      </div>

      {/* ── Tab: Tentativas ────────────────────────────────────────────────────── */}
      {tab === 'tentativas' && (
        <div>
          <div style={{ fontSize: 10, color: S.muted, marginBottom: 8 }}>
            Resp: <span style={{color:'#93C5FD'}}>C</span>or · <span style={{color:'#4CAF50'}}>F</span>orma · <span style={{color:'#FCD34D'}}>N</span>úm · <span style={{color:'#F87171'}}>O</span>utro &nbsp;|&nbsp;
            ✓/✗ correto/erro &nbsp;|&nbsp; <span style={{color:'#FB923C'}}>⚠Pers</span> = erro perseverativo &nbsp;|&nbsp; 🔄 nova categoria
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {trials.map((trial, i) => {
              return (
                <div key={i}>
                  {trial.isNewCategory && (
                    <div style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 5, padding: '3px 8px', margin: '4px 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD' }}>NOVA CATEGORIA</span>
                      {i > 0 && (
                        <button type="button" onClick={() => toggleNewCategory(i)}
                          style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: S.red, cursor: 'pointer' }}>
                          ✕
                        </button>
                      )}
                      <span style={{ fontSize: 10, color: S.muted }}>Tipo:</span>
                      {['C','F','N'].map(ct => (
                        <button key={ct} type="button" onClick={() => setCardType(i, trial.cardType === ct ? '' : ct)}
                          style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 3, cursor: 'pointer', border: 'none',
                            background: trial.cardType === ct ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                            color: trial.cardType === ct ? '#fff' : '#93C5FD' }}>
                          {ct}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px', borderRadius: 3, background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <span style={{ fontSize: 10, color: S.muted, width: 20, textAlign: 'right', flexShrink: 0 }}>{String(i+1).padStart(2,'0')}</span>
                    {!trial.isNewCategory && i > 0 && (
                      <button type="button" onClick={() => toggleNewCategory(i)} title="Nova categoria"
                        style={{ fontSize: 10, padding: '1px 3px', borderRadius: 3, border: `1px solid ${S.border}`, background: 'transparent', color: S.muted, cursor: 'pointer', flexShrink: 0 }}>
                        🔄
                      </button>
                    )}
                    {['C','F','N','O'].map(opt => {
                      const c = WCST_COLORS[opt]
                      return (
                        <button key={opt} type="button" onClick={() => setTrialResponse(i, trial.response === opt ? '' : opt)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3, border: 'none', cursor: 'pointer',
                            background: trial.response === opt ? c.bg : 'rgba(255,255,255,0.05)',
                            color: trial.response === opt ? c.text : S.muted,
                            outline: trial.response === opt ? `1px solid ${c.text}` : 'none' }}>
                          {opt}
                        </button>
                      )
                    })}
                    {trial.response && (
                      <button type="button" onClick={() => toggleCorrect(i)}
                        style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 3, border: 'none', cursor: 'pointer', minWidth: 26,
                          background: trial.isCorrect === true ? 'rgba(46,125,50,0.35)' : trial.isCorrect === false ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)',
                          color: trial.isCorrect === true ? '#4CAF50' : trial.isCorrect === false ? '#F87171' : S.muted }}>
                        {trial.isCorrect === true ? '✓' : trial.isCorrect === false ? '✗' : '?'}
                      </button>
                    )}
                    {trial.isCorrect === false && (
                      <button type="button" onClick={() => togglePerseverative(i)}
                        style={{ fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 3, border: 'none', cursor: 'pointer',
                          background: trial.isPerseverative ? 'rgba(251,146,60,0.45)' : 'rgba(255,255,255,0.05)',
                          color: trial.isPerseverative ? '#FB923C' : S.muted }}>
                        {trial.isPerseverative ? '⚠Pers' : 'Pers?'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: S.muted, flexWrap: 'wrap', padding: '6px 4px', borderTop: `1px solid ${S.border}` }}>
            {['C','F','N','O'].map(r => <span key={r} style={{ color: WCST_COLORS[r].text }}>{r}: {trials.filter(t => t.response === r).length}</span>)}
            <span>Total: {answered}</span>
            <span style={{ color: S.greenL }}>Cat.: {auto.categories_completed ?? 0}</span>
            <span style={{ color: '#F87171' }}>Erros: {auto.total_errors ?? 0}</span>
            <span style={{ color: '#FB923C' }}>Persev.: {auto.perseverative_errors ?? 0}</span>
          </div>
        </div>
      )}

      {/* ── Tab: Pontuação ─────────────────────────────────────────────────────── */}
      {tab === 'pontuacao' && (
        <div>
          <div style={{ fontSize: 11, color: '#93C5FD', marginBottom: 8, padding: '5px 10px', background: 'rgba(59,130,246,0.07)', borderRadius: 6 }}>
            Valores calculados automaticamente das tentativas. Edite só se precisar corrigir manualmente.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <NumField label="Categorias completadas" value={getVal('categories_completed')} onChange={v => update({ categories_completed: v })} min={0} max={6} hint="0-6" />
            <NumField label="Ensaios administrados"  value={getVal('trials_administered')}  onChange={v => update({ trials_administered: v })}  min={0} max={48} hint="0-48" />
            <NumField label="Total de acertos"        value={getVal('total_correct')}         onChange={v => update({ total_correct: v })}         min={0} hint="total" />
            <NumField label="Total de erros"          value={getVal('total_errors')}          onChange={v => update({ total_errors: v })}          min={0} hint="total" />
            <NumField label="Erros perseverativos"    value={getVal('perseverative_errors')}  onChange={v => update({ perseverative_errors: v })}  min={0} hint="total" />
            <div>
              <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Erros não-perseverativos</div>
              <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, textAlign: 'center', fontSize: 14, fontWeight: 700, color: S.greenL }}>
                {getVal('non_perseverative_errors') ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>auto (erros − persev.)</div>
            </div>
            <NumField label="Total de rupturas" value={getVal('total_breaks')} onChange={v => update({ total_breaks: v })} min={0} hint="total" />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
            <textarea rows={3} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
        </div>
      )}

      {/* ── Tab: Resultado ─────────────────────────────────────────────────────── */}
      {tab === 'resultado' && (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontSize: 10, color: '#93C5FD', marginBottom: 8, padding: '5px 10px', background: 'rgba(59,130,246,0.07)', borderRadius: 6 }}>
            Zimmermann et al. (2015) · {grupoLabel} · Escolaridade {wcstGetEsc(d.education) === 'baixa' ? 'Baixa (2–7 anos)' : 'Alta (8+ anos)'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: 4, padding: '5px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px 6px 0 0', fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase' }}>
            <span>Variável</span>
            <span style={{ textAlign: 'center' }}>Escore</span>
            <span style={{ textAlign: 'center' }}>Percentil</span>
            <span style={{ textAlign: 'center' }}>Classificação</span>
          </div>
          {[
            { label: 'Categorias completadas',  val: getVal('categories_completed'),     pct: pctCat,  bold: true  },
            { label: 'Ensaios administrados',    val: getVal('trials_administered'),      pct: pctEns,  bold: false },
            { label: 'Total de acertos',         val: getVal('total_correct'),             pct: pctAce,  bold: false },
            { label: 'Total de erros',           val: getVal('total_errors'),             pct: pctErr,  bold: false },
            { label: 'Erros perseverativos',     val: getVal('perseverative_errors'),     pct: pctPe,   bold: true  },
            { label: 'Erros não perseverativos', val: getVal('non_perseverative_errors'), pct: pctNPe,  bold: false },
            { label: 'Rupturas de set',          val: getVal('total_breaks'),             pct: pctRupt, bold: false },
          ].map(({ label, val, pct, bold }, i) => {
            const cls = wcstClassFromPct(pct)
            const badgeColor = !cls ? S.muted : cls.type === 'preserved' ? S.greenL : cls.type === 'borderline' ? '#FCD34D' : S.red
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: 4, padding: '6px 8px', borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: bold ? 700 : 400, color: '#fff' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: S.greenL, textAlign: 'center' }}>{val ?? '—'}</span>
                <span style={{ fontSize: 12, color: S.muted, textAlign: 'center' }}>{pct ?? '—'}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor, textAlign: 'center' }}>{cls?.label ?? '—'}</span>
              </div>
            )
          })}
          {d.observations && (
            <div style={{ marginTop: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, fontSize: 11, color: S.muted }}>
              {d.observations}
            </div>
          )}
          {!d.age && <p style={{ fontSize: 11, color: S.muted, marginTop: 8, fontStyle: 'italic' }}>Preencha a idade e escolaridade para calcular percentis.</p>}
        </div>
      )}
    </div>
  )
}

// ─── WCST completo (Base44-compliant) ────────────────────────────────────────
function WCSTFullForm({ data, onChange }) {
  const d = data || {}
  const [tab, setTab] = React.useState('escores')

  const update = (changes) => {
    const n = { ...d, ...changes }
    const num = k => (n[k] != null && n[k] !== '') ? Number(n[k]) : null
    const pe = num('perseverative_errors'), te = num('total_errors')
    if (pe != null && te != null) n.non_perseverative_errors = Math.max(0, te - pe)
    const ta = num('total_trials')
    if (ta != null && te != null) n.total_correct = Math.max(0, ta - te)
    const catComp = num('categories_completed')
    const wcstAllFilled = catComp != null && num('total_trials') != null && num('total_errors') != null && num('perseverative_errors') != null
    n.classification = wcstAllFilled ? (classify.wcst_cat(catComp)?.label || '') : ''
    onChange(n)
  }

  const tabStyle = (t) => ({
    padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11,
    fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  const cc = classify.wcst_cat(d.categories_completed)

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex || ''} onChange={e => update({ sex: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <input value={d.education || ''} onChange={e => update({ education: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="Ex: 12 anos" />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de nascimento</div>
          <input type="date" value={d.birth_date || ''} onChange={e => update({ birth_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de aplicação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        <button style={tabStyle('escores')} onClick={() => setTab('escores')}>Escores</button>
        <button style={tabStyle('percentis')} onClick={() => setTab('percentis')}>Percentis</button>
        <button style={tabStyle('resultado')} onClick={() => setTab('resultado')}>Resultado</button>
        <button style={tabStyle('interpretacao')} onClick={() => setTab('interpretacao')}>Interpretação</button>
      </div>

      {/* ── Tab: Escores ───────────────────────────────────────────────────────── */}
      {tab === 'escores' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <div>
              <NumField label="Categorias completadas" value={d.categories_completed}
                onChange={v => update({ categories_completed: v })} min={0} max={6} hint="0-6" />
              {cc && <div style={{ marginTop: 4 }}><Badge {...cc} /></div>}
            </div>
            <NumField label="Total de ensaios" value={d.total_trials}
              onChange={v => update({ total_trials: v })} min={0} max={128} hint="0-128" />
            <NumField label="Total de acertos" value={d.total_correct}
              onChange={v => update({ total_correct: v })} min={0} />
            <NumField label="Total de erros" value={d.total_errors}
              onChange={v => update({ total_errors: v })} min={0} />
            <NumField label="Erros perseverativos" value={d.perseverative_errors}
              onChange={v => update({ perseverative_errors: v })} min={0} />
            <div>
              <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Erros não-perseverativos</div>
              <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, textAlign: 'center', fontSize: 14, fontWeight: 700, color: d.non_perseverative_errors != null ? S.greenL : S.muted }}>
                {d.non_perseverative_errors ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>auto (erros − persev.)</div>
            </div>
            <NumField label="Respostas perseverativas" value={d.perseverative_responses}
              onChange={v => update({ perseverative_responses: v })} min={0} />
            <NumField label="Respostas nível conceitual" value={d.conceptual_level_responses}
              onChange={v => update({ conceptual_level_responses: v })} min={0} />
            <NumField label="Falha em manter contexto" value={d.failure_to_maintain_set}
              onChange={v => update({ failure_to_maintain_set: v })} min={0} />
            <NumField label="Aprendendo a aprender" value={d.learning_to_learn}
              onChange={v => update({ learning_to_learn: v })} min={0} />
          </div>
          <p style={{ fontSize: 11, color: S.muted, marginTop: 8 }}>Ref categorias: ≥5 Preservado · 3–4 Limítrofe · ≤2 Comprometido</p>
        </div>
      )}

      {/* ── Tab: Percentis ─────────────────────────────────────────────────────── */}
      {tab === 'percentis' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          <NumField label="Percentil — Categorias" value={d.percentile_categories}
            onChange={v => update({ percentile_categories: v })} min={1} max={99} hint="1-99" />
          <NumField label="Percentil — Ensaios" value={d.percentile_trials}
            onChange={v => update({ percentile_trials: v })} min={1} max={99} hint="1-99" />
          <NumField label="Percentil — Erros" value={d.percentile_errors}
            onChange={v => update({ percentile_errors: v })} min={1} max={99} hint="1-99" />
          <NumField label="Percentil — Erros perseverativos" value={d.percentile_perseverative}
            onChange={v => update({ percentile_perseverative: v })} min={1} max={99} hint="1-99" />
        </div>
      )}

      {/* ── Tab: Interpretação ─────────────────────────────────────────────────── */}
      {tab === 'resultado' && (
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Resumo WCST</div>
          {[
            ['Total de ensaios', d.total_trials, '/128', null],
            ['Categorias completadas', d.categories_completed, '/6', cc],
            ['Total de acertos', d.total_correct, null, null],
            ['Total de erros', d.total_errors, null, null],
            ['Erros perseverativos', d.perseverative_errors, null, null],
            ['Erros não-perseverativos', d.non_perseverative_errors, null, null],
            ['Respostas nível conceitual', d.conceptual_level_responses, null, null],
            ['Falha em manter contexto', d.failure_to_maintain_set, null, null],
          ].map(([lbl, val, suffix, cls]) => val != null && (
            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${S.border}` }}>
              <span style={{ fontSize: 12, color: '#fff' }}>{lbl}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: S.greenL }}>{val}{suffix || ''}</span>
                {cls && <Badge {...cls} />}
              </div>
            </div>
          ))}
          {!d.categories_completed && !d.total_trials && (
            <p style={{ fontSize: 12, color: S.muted }}>Nenhum dado preenchido ainda.</p>
          )}
        </div>
      )}

      {tab === 'interpretacao' && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Classificação</div>
            <input value={d.classification || ''} onChange={e => update({ classification: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="Ex: Comprometimento leve em FE" />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
            <textarea rows={3} value={d.interpretation || ''} onChange={e => update({ interpretation: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Hipótese diagnóstica</div>
            <textarea rows={3} value={d.diagnostic_hypothesis || ''} onChange={e => update({ diagnostic_hypothesis: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
            <textarea rows={2} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ItemGrid — botões 0/1 por item ──────────────────────────────────────────
function ItemGrid({ values, count, onChangeFn }) {
  const arr = Array.from({ length: count }, (_, i) =>
    Array.isArray(values) && values[i] != null ? Number(values[i]) : 0
  )
  const total = arr.reduce((s, x) => s + x, 0)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginBottom: 4 }}>
      {arr.map((v, i) => (
        <button key={i} type="button"
          onClick={() => { const n = [...arr]; n[i] = v === 1 ? 0 : 1; onChangeFn(n) }}
          style={{
            width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700,
            background: v === 1 ? S.green : 'rgba(255,255,255,0.08)',
            color: v === 1 ? '#fff' : S.muted,
          }}>{i + 1}</button>
      ))}
      <span style={{ marginLeft: 6, color: S.greenL, fontWeight: 700, fontSize: 13 }}>{total}/{count}</span>
    </div>
  )
}

// ─── BAMS — Normas por Escolaridade (Manual BAMS, Apêndice 1) ───────────────
const BAMS_NORMAS_EDU = {
  analfabeto:  { lexico:{media:27.47,dp:6.46},  categorizacao:{media:44.88,dp:14.27}, conceitualizacao:{media:3.53,dp:2.22},  BAMS:{media:75.88,dp:19.80} },
  anos_1_4:    { lexico:{media:33.66,dp:3.70},  categorizacao:{media:56.95,dp:12.68}, conceitualizacao:{media:5.97,dp:2.44},  BAMS:{media:96.58,dp:16.24} },
  anos_5_8:    { lexico:{media:35.49,dp:2.72},  categorizacao:{media:59.92,dp:10.90}, conceitualizacao:{media:9.41,dp:3.48},  BAMS:{media:104.82,dp:14.55} },
  anos_9_11:   { lexico:{media:36.15,dp:2.89},  categorizacao:{media:67.00,dp:15.65}, conceitualizacao:{media:11.07,dp:3.68}, BAMS:{media:113.81,dp:16.00} },
  anos_12mais: { lexico:{media:36.92,dp:1.77},  categorizacao:{media:73.28,dp:13.11}, conceitualizacao:{media:14.33,dp:3.34}, BAMS:{media:124.48,dp:15.95} },
}
function bamsZ(score, media, dp) {
  if (score == null || score === '' || !dp) return null
  return (Number(score) - media) / dp
}
function bamsZToPercentil(z) {
  if (z == null) return null
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  const pct = z >= 0 ? Math.round((1 - p) * 100) : Math.round(p * 100)
  return Math.max(1, Math.min(99, pct))
}

// ─── BAMS (Base44-compliant) ──────────────────────────────────────────────────
function BAMSForm({ data, onChange }) {
  const d = data || {}
  const [tab, setTab] = React.useState('fv')

  // Recalcula todos os campos derivados e chama onChange
  const update = (changes) => {
    const next = { ...d, ...changes }
    const fvTotal = (Number(next.fv_animals_hits)||0)+(Number(next.fv_fruits_hits)||0)
                  +(Number(next.fv_utensils_hits)||0)+(Number(next.fv_clothes_hits)||0)
    const ndArr  = Array.isArray(next.nd_scores)       ? next.nd_scores       : []
    const niNArr = Array.isArray(next.ni_nouns)         ? next.ni_nouns        : []
    const niVArr = Array.isArray(next.ni_verbs)         ? next.ni_verbs        : []
    const niPArr = Array.isArray(next.ni_professions)   ? next.ni_professions  : []
    const cgArr  = Array.isArray(next.cg_scores)        ? next.cg_scores       : []
    const dpArr  = Array.isArray(next.dp_scores)        ? next.dp_scores       : []
    const ciArr  = Array.isArray(next.ci_scores)        ? next.ci_scores       : []
    const cvArr  = Array.isArray(next.cv_scores)        ? next.cv_scores       : []
    const ndTotal   = ndArr.reduce((s,x)=>s+(x||0),0)
    const niNounsTot= niNArr.reduce((s,x)=>s+(x||0),0)
    const niVerbsTot= niVArr.reduce((s,x)=>s+(x||0),0)
    const niProfTot = niPArr.reduce((s,x)=>s+(x||0),0)
    const niTotal   = niNounsTot+niVerbsTot+niProfTot
    const cgTotal=cgArr.reduce((s,x)=>s+(x||0),0), dpTotal=dpArr.reduce((s,x)=>s+(x||0),0)
    const ciTotal=ciArr.reduce((s,x)=>s+(x||0),0), cvTotal=cvArr.reduce((s,x)=>s+(x||0),0)
    const lexicoScore=ndTotal+niTotal, catScore=fvTotal+ciTotal+cvTotal
    const concScore=cgTotal+dpTotal,  globalScore=lexicoScore+catScore+concScore
    const norma = BAMS_NORMAS_EDU[next.edu_group]
    let autoNorm = {}
    if (norma && globalScore > 0) {
      const zB = bamsZ(globalScore, norma.BAMS.media, norma.BAMS.dp)
      const zL = bamsZ(lexicoScore, norma.lexico.media, norma.lexico.dp)
      const zC = bamsZ(catScore, norma.categorizacao.media, norma.categorizacao.dp)
      const zK = bamsZ(concScore, norma.conceitualizacao.media, norma.conceitualizacao.dp)
      const pct = bamsZToPercentil(zB)
      const cls = classify.bams_pct(pct)
      const bamsAllSections =
        next.fv_animals_hits != null && next.fv_fruits_hits != null &&
        next.fv_utensils_hits != null && next.fv_clothes_hits != null &&
        Array.isArray(next.nd_scores)     && next.nd_scores.length     >= 10 &&
        Array.isArray(next.ni_nouns)      && next.ni_nouns.length      >= 14 &&
        Array.isArray(next.ni_verbs)      && next.ni_verbs.length      >= 7  &&
        Array.isArray(next.ni_professions)&& next.ni_professions.length>= 7  &&
        Array.isArray(next.cg_scores)     && next.cg_scores.length     >= 10 &&
        Array.isArray(next.dp_scores)     && next.dp_scores.length     >= 10 &&
        Array.isArray(next.ci_scores)     && next.ci_scores.length     >= 10 &&
        Array.isArray(next.cv_scores)     && next.cv_scores.length     >= 10
      autoNorm = {
        z_bams: zB != null ? zB.toFixed(2) : '',
        z_lexico: zL != null ? zL.toFixed(2) : '',
        z_categorizacao: zC != null ? zC.toFixed(2) : '',
        z_conceitualizacao: zK != null ? zK.toFixed(2) : '',
        percentile: pct != null ? pct : (next.percentile || ''),
        classification: bamsAllSections && cls ? cls.label : '',
        interpretation: bamsAllSections && cls ? cls.interpretation : '',
      }
    }
    onChange({
      ...next, ...autoNorm,
      fv_total: fvTotal, nd_total: ndTotal,
      ni_nouns_total: niNounsTot, ni_verbs_total: niVerbsTot, ni_professions_total: niProfTot,
      ni_total: niTotal, cg_total: cgTotal, dp_total: dpTotal, ci_total: ciTotal, cv_total: cvTotal,
      lexico_score: lexicoScore, categorization_score: catScore,
      conceptualization_score: concScore, global_score: globalScore,
    })
  }

  // Arrays atuais (default zeros)
  const ndArr  = Array.isArray(d.nd_scores)       ? d.nd_scores       : Array(10).fill(0)
  const niNArr = Array.isArray(d.ni_nouns)         ? d.ni_nouns        : Array(14).fill(0)
  const niVArr = Array.isArray(d.ni_verbs)         ? d.ni_verbs        : Array(7).fill(0)
  const niPArr = Array.isArray(d.ni_professions)   ? d.ni_professions  : Array(7).fill(0)
  const cgArr  = Array.isArray(d.cg_scores)        ? d.cg_scores       : Array(10).fill(0)
  const dpArr  = Array.isArray(d.dp_scores)        ? d.dp_scores       : Array(10).fill(0)
  const ciArr  = Array.isArray(d.ci_scores)        ? d.ci_scores       : Array(10).fill(0)
  const cvArr  = Array.isArray(d.cv_scores)        ? d.cv_scores       : Array(10).fill(0)

  // Escores para display nas tabs
  const fvTot  = (Number(d.fv_animals_hits)||0)+(Number(d.fv_fruits_hits)||0)+(Number(d.fv_utensils_hits)||0)+(Number(d.fv_clothes_hits)||0)
  const ndTot  = ndArr.reduce((s,x)=>s+(x||0),0)
  const niTot  = [...niNArr,...niVArr,...niPArr].reduce((s,x)=>s+(x||0),0)
  const cgTot=cgArr.reduce((s,x)=>s+(x||0),0), dpTot=dpArr.reduce((s,x)=>s+(x||0),0)
  const ciTot=ciArr.reduce((s,x)=>s+(x||0),0), cvTot=cvArr.reduce((s,x)=>s+(x||0),0)
  const lexTot=ndTot+niTot, catTot=fvTot+ciTot+cvTot, concTot=cgTot+dpTot
  const global=lexTot+catTot+concTot

  const cp = classify.bams_pct(d.percentile)

  const ts = (a) => ({ padding:'4px 9px', borderRadius:5, border:'none', cursor:'pointer', fontSize:11,
    fontWeight:a?700:400, background:a?S.green:'rgba(255,255,255,0.06)', color:a?'#fff':S.muted })
  const sec = (t) => <div style={{ fontSize:10, color:S.muted, fontWeight:700, letterSpacing:'0.06em',
    textTransform:'uppercase', margin:'10px 0 5px', borderTop:`1px solid ${S.border}`, paddingTop:8 }}>{t}</div>

  const tabs = [
    { id:'fv',    label:`FV (${fvTot})` },
    { id:'nd',    label:`ND (${ndTot}/10)` },
    { id:'ni',    label:`NI (${niTot}/28)` },
    { id:'sem',   label:`Semântica` },
    { id:'result',label:'Resultado' },
    { id:'dados', label:'Dados' },
  ]

  return (
    <div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
        {tabs.map(t => <button key={t.id} type="button" onClick={()=>setTab(t.id)} style={ts(tab===t.id)}>{t.label}</button>)}
      </div>

      {/* ── FV ── */}
      {tab==='fv' && (
        <div>
          <p style={{ fontSize:11, color:S.muted, marginBottom:10 }}>Acertos, Erros e Repetições por categoria</p>
          {[
            {key:'animals',label:'Animais'},{key:'fruits',label:'Frutas'},
            {key:'utensils',label:'Utensílios'},{key:'clothes',label:'Roupas'},
          ].map(cat => (
            <div key={cat.key} style={{ marginBottom:10, padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:8 }}>{cat.label}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                <NumField label="Acertos"     value={d[`fv_${cat.key}_hits`]}        onChange={v=>update({[`fv_${cat.key}_hits`]:v})}        min={0} hint="nº" />
                <NumField label="Erros"       value={d[`fv_${cat.key}_errors`]}      onChange={v=>update({[`fv_${cat.key}_errors`]:v})}      min={0} hint="nº" />
                <NumField label="Repetições"  value={d[`fv_${cat.key}_repetitions`]} onChange={v=>update({[`fv_${cat.key}_repetitions`]:v})} min={0} hint="nº" />
              </div>
            </div>
          ))}
          <div style={{ padding:'8px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, fontSize:12 }}>
            Total FV (acertos): <span style={{ color:S.greenL, fontWeight:700 }}>{fvTot}</span>
          </div>
        </div>
      )}

      {/* ── ND ── */}
      {tab==='nd' && (
        <div>
          <p style={{ fontSize:11, color:S.muted, marginBottom:8 }}>Clique para marcar acerto (verde) ou erro</p>
          <ItemGrid values={ndArr} count={10} onChangeFn={arr=>update({nd_scores:arr})} />
          {sec('Subcategorias (seres vivos vs artefatos)')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <NumField label="Seres Vivos (/5)" value={d.nd_living_total}    onChange={v=>update({nd_living_total:v})}    min={0} max={5} hint="0-5" />
            <NumField label="Artefatos (/5)"   value={d.nd_artifacts_total} onChange={v=>update({nd_artifacts_total:v})} min={0} max={5} hint="0-5" />
          </div>
          <div style={{ marginTop:8, padding:'8px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, fontSize:12 }}>
            Total ND: <span style={{ color:S.greenL, fontWeight:700 }}>{ndTot}/10</span>
          </div>
        </div>
      )}

      {/* ── NI ── */}
      {tab==='ni' && (
        <div>
          <p style={{ fontSize:11, color:S.muted, marginBottom:8 }}>Clique para marcar acerto (verde) ou erro</p>
          {sec(`Substantivos (${niNArr.reduce((s,x)=>s+(x||0),0)}/14)`)}
          <ItemGrid values={niNArr} count={14} onChangeFn={arr=>update({ni_nouns:arr})} />
          {sec(`Verbos (${niVArr.reduce((s,x)=>s+(x||0),0)}/7)`)}
          <ItemGrid values={niVArr} count={7} onChangeFn={arr=>update({ni_verbs:arr})} />
          {sec(`Profissões (${niPArr.reduce((s,x)=>s+(x||0),0)}/7)`)}
          <ItemGrid values={niPArr} count={7} onChangeFn={arr=>update({ni_professions:arr})} />
          {sec('Subcategorias (seres vivos vs artefatos)')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <NumField label="Seres Vivos" value={d.ni_living_total}    onChange={v=>update({ni_living_total:v})}    min={0} hint="nº" />
            <NumField label="Artefatos"   value={d.ni_artifacts_total} onChange={v=>update({ni_artifacts_total:v})} min={0} hint="nº" />
          </div>
          <div style={{ marginTop:8, padding:'8px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, fontSize:12 }}>
            Total NI: <span style={{ color:S.greenL, fontWeight:700 }}>{niTot}/28</span>
          </div>
        </div>
      )}

      {/* ── Semântica ── */}
      {tab==='sem' && (
        <div>
          <p style={{ fontSize:11, color:S.muted, marginBottom:8 }}>Clique para marcar acerto (verde) ou erro</p>
          {sec(`CG — Conhecimentos Gerais (${cgTot}/10)`)}
          <ItemGrid values={cgArr} count={10} onChangeFn={arr=>update({cg_scores:arr})} />
          {sec(`DP — Definição de Palavras (${dpTot}/10)`)}
          <ItemGrid values={dpArr} count={10} onChangeFn={arr=>update({dp_scores:arr})} />
          {sec(`CI — Categorização de Imagens (${ciTot}/10)`)}
          <ItemGrid values={ciArr} count={10} onChangeFn={arr=>update({ci_scores:arr})} />
          {sec(`CV — Correspondência Visual (${cvTot}/10)`)}
          <ItemGrid values={cvArr} count={10} onChangeFn={arr=>update({cv_scores:arr})} />
        </div>
      )}

      {/* ── Resultado ── */}
      {tab==='result' && (
        <div>
          {/* Escores por domínio */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10,
            padding:'10px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, fontSize:12 }}>
            <div><span style={{ color:S.muted }}>Léxico:</span> <span style={{ color:'#fff', fontWeight:700 }}>{lexTot}</span></div>
            <div><span style={{ color:S.muted }}>Categoriz.:</span> <span style={{ color:'#fff', fontWeight:700 }}>{catTot}</span></div>
            <div><span style={{ color:S.muted }}>Concept.:</span> <span style={{ color:'#fff', fontWeight:700 }}>{concTot}</span></div>
            <div><span style={{ color:S.muted }}>Global:</span> <span style={{ color:S.greenL, fontWeight:700 }}>{global}</span></div>
          </div>
          {/* Z-scores por domínio (visível apenas quando escolaridade selecionada) */}
          {d.edu_group && d.z_bams && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
              {[
                { label:'z Léxico',     val: d.z_lexico },
                { label:'z Categoriz.', val: d.z_categorizacao },
                { label:'z Concept.',   val: d.z_conceitualizacao },
                { label:'z BAMS Total', val: d.z_bams },
              ].map(item => {
                const zv = Number(item.val)
                const col = zv >= -1 ? S.greenL : zv >= -1.5 ? '#FFC107' : '#F44336'
                return (
                  <div key={item.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:10, color:S.muted, marginBottom:2 }}>{item.label}</div>
                    <div style={{ fontSize:18, fontWeight:700, color: col }}>{item.val}</div>
                  </div>
                )
              })}
            </div>
          )}
          {!d.edu_group && (
            <p style={{ fontSize:11, color:S.muted, marginBottom:12 }}>Selecione a escolaridade na aba Dados para calcular z-scores e percentil automaticamente.</p>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              {d.edu_group ? (
                <>
                  <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Percentil (calculado)</div>
                  <div style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${S.border}`, borderRadius:6, padding:'8px 10px', fontSize:20, fontWeight:700, color:S.greenL }}>{d.percentile || '—'}</div>
                </>
              ) : (
                <NumField label="Percentil" value={d.percentile}
                  onChange={v => { const c = classify.bams_pct(v); update({ percentile: v, interpretation: c ? c.interpretation : (d.interpretation || ''), classification: c ? c.label : (d.classification || '') }) }}
                  min={1} max={99} hint="1-99" />
              )}
              {cp && <div style={{ marginTop:4 }}><Badge {...cp} /></div>}
            </div>
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Interpretação</div>
              {cp ? (
                <div style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${S.border}`, borderRadius:6, padding:'8px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:'#fff', fontWeight:600 }}>{cp.interpretation}</span>
                  <Badge {...cp} />
                </div>
              ) : (
                <select value={d.interpretation||''} onChange={e=>update({interpretation:e.target.value})}
                  style={{ ...inputStyle, textAlign:'left', paddingLeft:8 }}>
                  <option value="">— selecionar —</option>
                  <option>Normal</option><option>Limítrofe</option>
                  <option>Comprometimento leve</option><option>Comprometimento moderado</option>
                  <option>Comprometimento grave</option>
                </select>
              )}
            </div>
          </div>
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Observações</div>
            <textarea rows={3} value={d.observations||''} onChange={e=>update({observations:e.target.value})}
              style={{ ...inputStyle, textAlign:'left', resize:'vertical', padding:'8px 10px', lineHeight:1.5 }} />
          </div>
        </div>
      )}

      {/* ── Dados ── */}
      {tab==='dados' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Data de Aplicação</div>
              <input type="date" value={d.application_date||''} onChange={e=>update({application_date:e.target.value})}
                style={{ ...inputStyle, textAlign:'left' }} />
            </div>
            <NumField label="Duração (min)" value={d.duration} onChange={v=>update({duration:v})} min={0} hint="minutos" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
            <NumField label="Idade" value={d.age} onChange={v=>update({age:v})} min={0} max={120} hint="anos" />
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Escolaridade</div>
              <select value={d.edu_group||''} onChange={e=>update({edu_group:e.target.value})}
                style={{ ...inputStyle, textAlign:'left', paddingLeft:8 }}>
                <option value="">— selecionar —</option>
                <option value="analfabeto">Analfabeto</option>
                <option value="anos_1_4">1–4 anos</option>
                <option value="anos_5_8">5–8 anos</option>
                <option value="anos_9_11">9–11 anos</option>
                <option value="anos_12mais">12+ anos</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Profissão</div>
              <input type="text" value={d.profession||''} onChange={e=>update({profession:e.target.value})}
                style={{ ...inputStyle, textAlign:'left' }} />
            </div>
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Região</div>
              <input type="text" value={d.region||''} onChange={e=>update({region:e.target.value})}
                style={{ ...inputStyle, textAlign:'left' }} />
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:10 }}>
            <label style={{ fontSize:12, color:S.muted, display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input type="checkbox" checked={!!d.retired} onChange={e=>update({retired:e.target.checked})} />
              Aposentado
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:S.muted }}>Status:</span>
              <select value={d.status||'em_andamento'} onChange={e=>update({status:e.target.value})}
                style={{ ...inputStyle, width:'auto', textAlign:'left', paddingLeft:8 }}>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>
        </div>
      )}
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
      {/* Resultado */}
      {d.total_score != null && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Resultado</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: S.muted }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: S.greenL }}>{d.total_score}<span style={{ fontSize: 12 }}>/30</span></div>
            </div>
            {c && <Badge {...c} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DEX (Base44-compliant, 20 itens × 2 respondentes) ───────────────────────
const DEX_ITEMS = [
  { n: 1,  label: 'Abstração' },
  { n: 2,  label: 'Impulsividade' },
  { n: 3,  label: 'Confabulação' },
  { n: 4,  label: 'Planejamento' },
  { n: 5,  label: 'Euforia' },
  { n: 6,  label: 'Sequência temporal' },
  { n: 7,  label: 'Autocrítica' },
  { n: 8,  label: 'Apatia' },
  { n: 9,  label: 'Desinibição' },
  { n: 10, label: 'Memória' },
  { n: 11, label: 'Embotamento' },
  { n: 12, label: 'Descontrole' },
  { n: 13, label: 'Autocrítica' },
  { n: 14, label: 'Inquietude/Perseveração' },
  { n: 15, label: 'Inquietação' },
  { n: 16, label: 'Dissociação' },
  { n: 17, label: 'Distração' },
  { n: 18, label: 'Concentração' },
  { n: 19, label: 'Tomada de decisão' },
  { n: 20, label: 'Cognição social' },
]
// Itens 1, 4, 10, 17 são perguntas controle — não entram no total
const DEX_SCORE_ITEMS = DEX_ITEMS.filter(it => ![1, 4, 10, 17].includes(it.n))

function DEXForm({ data, onChange, onSave }) {
  const d = data || {}
  const [tab, setTab] = React.useState('patient')
  const switchTab = (t) => { if (onSave) onSave(); setTab(t) }

  const update = (changes) => {
    const next = { ...d, ...changes }
    const patTotal = DEX_SCORE_ITEMS.reduce((s, it) => s + (Number(next[`patient_q${it.n}`]) || 0), 0)
    const famTotal = DEX_SCORE_ITEMS.reduce((s, it) => s + (Number(next[`family_q${it.n}`])  || 0), 0)
    const patAns = DEX_SCORE_ITEMS.filter(it => next[`patient_q${it.n}`] != null).length
    const famAns = DEX_SCORE_ITEMS.filter(it => next[`family_q${it.n}`]  != null).length
    onChange({
      ...next,
      patient_total: patTotal,
      family_total:  famTotal,
      patient_mean:  patAns > 0 ? parseFloat((patTotal / patAns).toFixed(2)) : null,
      family_mean:   famAns > 0 ? parseFloat((famTotal / famAns).toFixed(2)) : null,
      patient_classification: patAns > 0 ? (classify.dex(patTotal)?.label || '') : (next.patient_classification || ''),
      family_classification:  famAns > 0 ? (classify.dex(famTotal)?.label || '') : (next.family_classification  || ''),
      classification: patAns === DEX_SCORE_ITEMS.length ? (classify.dex(patTotal)?.label || '') : '',
    })
  }

  const patTotal = DEX_SCORE_ITEMS.reduce((s, it) => s + (Number(d[`patient_q${it.n}`]) || 0), 0)
  const famTotal = DEX_SCORE_ITEMS.reduce((s, it) => s + (Number(d[`family_q${it.n}`])  || 0), 0)
  const patAns = DEX_SCORE_ITEMS.filter(it => d[`patient_q${it.n}`] != null).length
  const famAns = DEX_SCORE_ITEMS.filter(it => d[`family_q${it.n}`]  != null).length
  const cPat = patAns > 0 ? classify.dex(patTotal) : null
  const cFam = famAns > 0 ? classify.dex(famTotal) : null
  const disc = patAns > 0 && famAns > 0 ? patTotal - famTotal : null

  const ts = (a) => ({ padding:'4px 9px', borderRadius:5, border:'none', cursor:'pointer',
    fontSize:11, fontWeight:a?700:400, background:a?S.green:'rgba(255,255,255,0.06)', color:a?'#fff':S.muted })

  const ItemList = ({ prefix }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      {DEX_ITEMS.map(it => {
        const key = `${prefix}_q${it.n}`
        const val = d[key]
        return (
          <div key={key} style={{
            display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center',
            padding:'5px 10px', borderRadius:6,
            background: val != null ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ fontSize:12, color: val != null ? '#fff' : S.muted }}>
              <span style={{ color:S.muted, fontSize:10, marginRight:6 }}>{it.n}</span>{it.label}
            </div>
            <ScoreButtons value={val} onChange={v => update({ [key]: v })} max={4} />
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
        <button type="button" onClick={()=>switchTab('patient')} style={ts(tab==='patient')}>
          Paciente ({patAns}/20)
        </button>
        <button type="button" onClick={()=>switchTab('family')} style={ts(tab==='family')}>
          Familiar/Informante ({famAns}/20)
        </button>
        <button type="button" onClick={()=>switchTab('result')} style={ts(tab==='result')}>
          Resultado
        </button>
        <button type="button" onClick={()=>switchTab('dados')} style={ts(tab==='dados')}>
          Dados
        </button>
      </div>

      {/* Paciente */}
      {tab === 'patient' && (
        <div>
          <p style={{ fontSize:11, color:S.muted, marginBottom:8 }}>
            0 = Nunca · 1 = Raramente · 2 = Às vezes · 3 = Frequentemente · 4 = Muito frequentemente
          </p>
          <ItemList prefix="patient" />
          {patAns > 0 && (
            <div style={{ marginTop:10, padding:'8px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'#fff', fontWeight:700 }}>Total: {patTotal}/80</span>
              {cPat && <Badge {...cPat} />}
            </div>
          )}
        </div>
      )}

      {/* Familiar */}
      {tab === 'family' && (
        <div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Nome do Informante</div>
            <input type="text" value={d.informant||''} onChange={e=>update({informant:e.target.value})}
              style={{ ...inputStyle, textAlign:'left' }} placeholder="Nome completo" />
          </div>
          <p style={{ fontSize:11, color:S.muted, marginBottom:8 }}>
            0 = Nunca · 1 = Raramente · 2 = Às vezes · 3 = Frequentemente · 4 = Muito frequentemente
          </p>
          <ItemList prefix="family" />
          {famAns > 0 && (
            <div style={{ marginTop:10, padding:'8px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'#fff', fontWeight:700 }}>Total: {famTotal}/80</span>
              {cFam && <Badge {...cFam} />}
            </div>
          )}
        </div>
      )}

      {/* Resultado */}
      {tab === 'result' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:14 }}>
            <div style={{ padding:'12px', background:'rgba(255,255,255,0.04)', borderRadius:8 }}>
              <div style={{ fontSize:11, color:S.muted, marginBottom:6 }}>PACIENTE</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{patTotal}<span style={{ fontSize:13, color:S.muted }}>/80</span></div>
              <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>Média/item: {patAns>0?(patTotal/patAns).toFixed(2):'—'}</div>
              {cPat && <div style={{ marginTop:6 }}><Badge {...cPat} /></div>}
            </div>
            <div style={{ padding:'12px', background:'rgba(255,255,255,0.04)', borderRadius:8 }}>
              <div style={{ fontSize:11, color:S.muted, marginBottom:6 }}>FAMILIAR / INFORMANTE</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{famTotal}<span style={{ fontSize:13, color:S.muted }}>/80</span></div>
              <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>Média/item: {famAns>0?(famTotal/famAns).toFixed(2):'—'}</div>
              {cFam && <div style={{ marginTop:6 }}><Badge {...cFam} /></div>}
            </div>
          </div>

          {disc !== null && (
            <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, fontSize:12, marginBottom:12 }}>
              Discrepância (paciente − familiar):{' '}
              <span style={{ color: Math.abs(disc)>10 ? S.amber : S.greenL, fontWeight:700 }}>
                {disc>=0?'+':''}{disc}
              </span>
              {Math.abs(disc)>10 && <span style={{ marginLeft:8, color:S.amber, fontSize:11 }}>⚠ Clinicamente relevante (&gt;10)</span>}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Interpretação</div>
              <input type="text" value={d.interpretation||''} onChange={e=>update({interpretation:e.target.value})}
                style={{ ...inputStyle, textAlign:'left' }} placeholder="Texto livre..." />
            </div>
            <div>
              <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Status</div>
              <select value={d.status||'em_andamento'} onChange={e=>update({status:e.target.value})}
                style={{ ...inputStyle, textAlign:'left', paddingLeft:8 }}>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Observações</div>
            <textarea rows={2} value={d.observations||''} onChange={e=>update({observations:e.target.value})}
              style={{ ...inputStyle, textAlign:'left', resize:'vertical', padding:'8px 10px', lineHeight:1.5 }} />
          </div>
          <p style={{ fontSize:11, color:S.muted, marginTop:8 }}>Ref: média/item ≤1,5 Sem alteração · ≤2,5 Leve · &gt;2,5 Significativo</p>
        </div>
      )}

      {/* Dados */}
      {tab === 'dados' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Data de Aplicação</div>
            <input type="date" value={d.application_date||''} onChange={e=>update({application_date:e.target.value})}
              style={{ ...inputStyle, textAlign:'left' }} />
          </div>
          <div>
            <div style={{ fontSize:11, color:S.muted, marginBottom:3 }}>Data de Nascimento</div>
            <input type="date" value={d.birth_date||''} onChange={e=>update({birth_date:e.target.value})}
              style={{ ...inputStyle, textAlign:'left' }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TRIACOG (Base44-compliant) ──────────────────────────────────────────────
function TRIACOGForm({ data, onChange }) {
  const d = data || {}
  const [tab, setTab] = React.useState('cognitivo')

  const update = (changes) => {
    const n = { ...d, ...changes }
    const num = k => Number(n[k]) || 0

    n.orientacao_total = num('orientacao_idade') + num('orientacao_ano')
    n.atencao_total    = num('atencao_span_direto') + num('atencao_span_inverso')

    const cfArr = n.praxia_copia_figura_items || []
    n.praxia_copia_figura_total = cfArr.reduce((s, v) => s + (Number(v) || 0), 0)
    const relArr = n.praxia_relogio_items || []
    n.praxia_relogio_total = relArr.reduce((s, v) => s + (Number(v) || 0), 0)

    n.fe_fluencia_verbal_total = num('fe_fluencia_verbal_15s') + num('fe_fluencia_verbal_30s')
    n.fe_nsr_total_acertos = num('fe_nsr_a_acertos') + num('fe_nsr_b_acertos') + num('fe_nsr_c_acertos')
    n.fe_nsr_total_erros   = num('fe_nsr_a_erros')   + num('fe_nsr_b_erros')   + num('fe_nsr_c_erros')

    n.linguagem_nomeacao_total  = num('linguagem_nomeacao_acao') + num('linguagem_nomeacao_objeto')
    n.linguagem_repeticao_total = num('linguagem_repeticao_terra') + num('linguagem_repeticao_prazer') +
      num('linguagem_repeticao_sossego') + num('linguagem_repeticao_nupo')
    n.linguagem_escrita_total   = num('linguagem_escrita_terra') + num('linguagem_escrita_prazer') +
      num('linguagem_escrita_sossego') + num('linguagem_escrita_nupo')

    n.processamento_numerico_total = num('processamento_numerico_a') + num('processamento_numerico_b_27') +
      num('processamento_numerico_b_menos') + num('processamento_numerico_b_18') + num('processamento_numerico_c')

    // Total TRIACOG — soma dos domínios com pontuação fixa (fluência verbal excluída)
    // Só computa se pelo menos um campo primário foi preenchido
    const hasData = [
      n.orientacao_idade, n.orientacao_ano,
      n.atencao_span_direto, n.atencao_span_inverso,
      n.memoria_evocacao_imediata, n.memoria_evocacao_tardia,
    ].every(v => v != null && v !== '')
    const raw = k => (n[k] != null && n[k] !== '') ? Number(n[k]) : 0
    n.total_score = hasData ? (
      num('orientacao_total') +
      raw('memoria_evocacao_imediata') +
      raw('memoria_evocacao_tardia') +
      num('atencao_total') +
      raw('memoria_visual_total') +
      num('praxia_copia_figura_total') +
      num('praxia_relogio_total') +
      num('fe_nsr_total_acertos') +
      num('processamento_numerico_total') +
      num('linguagem_nomeacao_total') +
      num('linguagem_repeticao_total') +
      num('linguagem_escrita_total')
    ) : null
    n.classification = n.total_score != null ? (classify.triacog(n.total_score)?.label || '') : ''

    onChange(n)
  }

  const tabStyle = (t) => ({
    padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11,
    fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  const sectionTitle = (label) => (
    <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, marginTop: 10 }}>{label}</div>
  )

  const scoreRow = (label, value, max) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: `1px solid ${S.border}` }}>
      <span style={{ fontSize: 12, color: S.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{value ?? '—'}/{max}</span>
    </div>
  )

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} hint="anos" />
        <NumField label="Anos de estudo" value={d.education_years} onChange={v => update({ education_years: v })} min={0} max={30} />
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Lateralidade</div>
          <select value={d.laterality || ''} onChange={e => update({ laterality: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="direita">Direita</option>
            <option value="esquerda">Esquerda</option>
            <option value="ambidestro">Ambidestro</option>
          </select>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de aplicação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Horário início</div>
          <input type="time" value={d.start_time || ''} onChange={e => update({ start_time: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Horário término</div>
          <input type="time" value={d.end_time || ''} onChange={e => update({ end_time: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })} style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {[['cognitivo','Cognitivo'],['praxia','Praxia + Visual'],['fe','FE + Numérico'],['linguagem','Linguagem']].map(([k, lbl]) => (
          <button key={k} style={tabStyle(k)} onClick={() => setTab(k)}>{lbl}</button>
        ))}
      </div>

      {/* ── Tab: Cognitivo ─────────────────────────────────────────────────────── */}
      {tab === 'cognitivo' && (
        <div>
          {sectionTitle('Orientação (máx 2)')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <span style={{ fontSize: 12, color: S.muted }}>Qual a sua idade?</span>
              <ScoreButtons value={d.orientacao_idade} onChange={v => update({ orientacao_idade: v })} max={1} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <span style={{ fontSize: 12, color: S.muted }}>Em que ano estamos?</span>
              <ScoreButtons value={d.orientacao_ano} onChange={v => update({ orientacao_ano: v })} max={1} />
            </div>
          </div>
          {(d.orientacao_total != null) && (
            <div style={{ fontSize: 12, color: S.greenL, fontWeight: 700, marginTop: 4 }}>Total orientação: {d.orientacao_total}/2</div>
          )}

          {sectionTitle('Memória')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            <NumField label="Evocação Imediata (lista palavras)" value={d.memoria_evocacao_imediata}
              onChange={v => update({ memoria_evocacao_imediata: v })} min={0} max={6} hint="0-6" />
            <NumField label="Evocação Tardia (lista palavras)" value={d.memoria_evocacao_tardia}
              onChange={v => update({ memoria_evocacao_tardia: v })} min={0} max={6} hint="0-6" />
          </div>

          {sectionTitle('Atenção — Span de Dígitos (máx 10)')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            <NumField label="Span Direto" value={d.atencao_span_direto}
              onChange={v => update({ atencao_span_direto: v })} min={0} max={5} hint="0-5" />
            <NumField label="Span Inverso" value={d.atencao_span_inverso}
              onChange={v => update({ atencao_span_inverso: v })} min={0} max={5} hint="0-5" />
          </div>
          {(d.atencao_total != null) && (
            <div style={{ fontSize: 12, color: S.greenL, fontWeight: 700, marginTop: 4 }}>Total atenção: {d.atencao_total}/10</div>
          )}
        </div>
      )}

      {/* ── Tab: Praxia + Visual ───────────────────────────────────────────────── */}
      {tab === 'praxia' && (
        <div>
          {sectionTitle('Memória Visual — Evocação Tardia da Figura (máx 24)')}
          <NumField label="Memória Visual Total" value={d.memoria_visual_total}
            onChange={v => update({ memoria_visual_total: v })} min={0} max={24} hint="0-24" />

          {sectionTitle('Cópia de Figura — 8 itens (0–3 cada, máx 24)')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {Array.from({ length: 8 }, (_, i) => {
              const arr = d.praxia_copia_figura_items || []
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center', padding: '5px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 5 }}>
                  <span style={{ fontSize: 12, color: S.muted }}>Item {i + 1}</span>
                  <ScoreButtons value={arr[i] != null ? Number(arr[i]) : null} max={3} onChange={v => {
                    const a = [...(d.praxia_copia_figura_items || Array(8).fill(null))]
                    a[i] = v
                    update({ praxia_copia_figura_items: a })
                  }} />
                </div>
              )
            })}
          </div>
          {(d.praxia_copia_figura_total != null) && (
            <div style={{ fontSize: 12, color: S.greenL, fontWeight: 700, marginTop: 5 }}>Total cópia: {d.praxia_copia_figura_total}/24</div>
          )}

          {sectionTitle('Desenho do Relógio — 9 critérios (0/1)')}
          <ItemGrid
            values={d.praxia_relogio_items || []}
            count={9}
            onChangeFn={v => update({ praxia_relogio_items: v })}
          />
          {(d.praxia_relogio_total != null) && (
            <div style={{ fontSize: 12, color: S.greenL, fontWeight: 700, marginTop: 3 }}>Total relógio: {d.praxia_relogio_total}/9</div>
          )}

          {sectionTitle('Praxia Ideomotora')}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, maxWidth: 320 }}>
            <span style={{ fontSize: 12, color: S.muted }}>Uso do garfo</span>
            <ScoreButtons value={d.praxia_ideomotora} onChange={v => update({ praxia_ideomotora: v })} max={1} />
          </div>
        </div>
      )}

      {/* ── Tab: FE + Numérico ────────────────────────────────────────────────── */}
      {tab === 'fe' && (
        <div>
          {sectionTitle('Fluência Verbal')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <NumField label="15 segundos" value={d.fe_fluencia_verbal_15s}
              onChange={v => update({ fe_fluencia_verbal_15s: v })} min={0} />
            <NumField label="30 segundos" value={d.fe_fluencia_verbal_30s}
              onChange={v => update({ fe_fluencia_verbal_30s: v })} min={0} />
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Total</div>
              <div style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, textAlign: 'center', fontSize: 14, fontWeight: 700, color: S.greenL }}>{d.fe_fluencia_verbal_total ?? '—'}</div>
            </div>
          </div>

          {sectionTitle('NSR — Nomeação Serial Reversa (8 acertos/parte, máx 24)')}
          {[['a','A'],['b','B'],['c','C']].map(([k, lbl]) => (
            <div key={k} style={{ marginBottom: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 5 }}>Parte {lbl}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                <NumField label="Acertos" value={d[`fe_nsr_${k}_acertos`]}
                  onChange={v => update({ [`fe_nsr_${k}_acertos`]: v })} min={0} max={8} hint="0-8" />
                <NumField label="Erros" value={d[`fe_nsr_${k}_erros`]}
                  onChange={v => update({ [`fe_nsr_${k}_erros`]: v })} min={0} />
                <NumField label="Tempo (s)" value={d[`fe_nsr_${k}_tempo`]}
                  onChange={v => update({ [`fe_nsr_${k}_tempo`]: v })} min={0} />
              </div>
            </div>
          ))}
          {d.fe_nsr_total_acertos != null && (
            <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 12, color: S.greenL, fontWeight: 700 }}>
              <span>Total acertos NSR: {d.fe_nsr_total_acertos}/24</span>
              <span style={{ color: S.amber }}>Total erros: {d.fe_nsr_total_erros}</span>
            </div>
          )}

          {sectionTitle('Processamento Numérico (máx 7)')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 5 }}>
              <span style={{ fontSize: 12, color: S.muted }}>91 × 12 — cálculo mental (0–3)</span>
              <ScoreButtons value={d.processamento_numerico_a} onChange={v => update({ processamento_numerico_a: v })} max={3} />
            </div>
            {[
              ['processamento_numerico_b_27',    '27 — transcrição'],
              ['processamento_numerico_b_menos', '< — transcrição do sinal'],
              ['processamento_numerico_b_18',    '18 — transcrição'],
              ['processamento_numerico_c',       '27 − 18 = resultado'],
            ].map(([fk, flbl]) => (
              <div key={fk} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 5 }}>
                <span style={{ fontSize: 12, color: S.muted }}>{flbl}</span>
                <ScoreButtons value={d[fk]} onChange={v => update({ [fk]: v })} max={1} />
              </div>
            ))}
          </div>
          {d.processamento_numerico_total != null && (
            <div style={{ fontSize: 12, color: S.greenL, fontWeight: 700, marginTop: 5 }}>Total proc. numérico: {d.processamento_numerico_total}/7</div>
          )}
        </div>
      )}

      {/* ── Tab: Linguagem ────────────────────────────────────────────────────── */}
      {tab === 'linguagem' && (
        <div>
          {sectionTitle('Compreensão e Nomeação')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              ['linguagem_compreensao_oral',    'Compreensão oral', 1],
              ['linguagem_compreensao_escrita', 'Compreensão escrita', 1],
            ].map(([fk, flbl, fmax]) => (
              <div key={fk} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 5 }}>
                <span style={{ fontSize: 12, color: S.muted }}>{flbl} (0–{fmax})</span>
                <ScoreButtons value={d[fk]} onChange={v => update({ [fk]: v })} max={fmax} />
              </div>
            ))}
            {[
              ['linguagem_nomeacao_acao',   'Nomeação — ação', 2],
              ['linguagem_nomeacao_objeto', 'Nomeação — objeto', 2],
            ].map(([fk, flbl, fmax]) => (
              <div key={fk} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 5 }}>
                <span style={{ fontSize: 12, color: S.muted }}>{flbl} (0–{fmax})</span>
                <ScoreButtons value={d[fk]} onChange={v => update({ [fk]: v })} max={fmax} />
              </div>
            ))}
          </div>
          {d.linguagem_nomeacao_total != null && (
            <div style={{ fontSize: 11, color: S.greenL, marginTop: 3 }}>Total nomeação: {d.linguagem_nomeacao_total}/4</div>
          )}

          {sectionTitle('Vocabulário e Leitura')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            <NumField label="Vocabulário" value={d.linguagem_vocabulario}
              onChange={v => update({ linguagem_vocabulario: v })} min={0} max={2} hint="0-2" />
            <NumField label="Leitura" value={d.linguagem_leitura}
              onChange={v => update({ linguagem_leitura: v })} min={0} max={14} hint="0-14" />
            <NumField label="Inferências" value={d.linguagem_inferencias}
              onChange={v => update({ linguagem_inferencias: v })} min={0} max={2} hint="0-2" />
          </div>

          {sectionTitle('Repetição (0–2 cada, máx 8)')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {['terra','prazer','sossego','nupo'].map(w => (
              <div key={w} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 5 }}>
                <span style={{ fontSize: 12, color: S.muted }}>{w.charAt(0).toUpperCase() + w.slice(1)}</span>
                <ScoreButtons value={d[`linguagem_repeticao_${w}`]} onChange={v => update({ [`linguagem_repeticao_${w}`]: v })} max={2} />
              </div>
            ))}
          </div>
          {d.linguagem_repeticao_total != null && (
            <div style={{ fontSize: 11, color: S.greenL, marginTop: 3 }}>Total repetição: {d.linguagem_repeticao_total}/8</div>
          )}

          {sectionTitle('Escrita (0–1 cada, máx 4)')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {['terra','prazer','sossego','nupo'].map(w => (
              <div key={w} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '5px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 5 }}>
                <span style={{ fontSize: 12, color: S.muted }}>{w.charAt(0).toUpperCase() + w.slice(1)}</span>
                <ScoreButtons value={d[`linguagem_escrita_${w}`]} onChange={v => update({ [`linguagem_escrita_${w}`]: v })} max={1} />
              </div>
            ))}
          </div>
          {d.linguagem_escrita_total != null && (
            <div style={{ fontSize: 11, color: S.greenL, marginTop: 3 }}>Total escrita: {d.linguagem_escrita_total}/4</div>
          )}

          {/* Resumo por domínio */}
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Resumo por Domínio</div>
            {scoreRow('Orientação', d.orientacao_total, 2)}
            {scoreRow('Mem. Imediata', d.memoria_evocacao_imediata, 6)}
            {scoreRow('Mem. Tardia', d.memoria_evocacao_tardia, 6)}
            {scoreRow('Atenção (span)', d.atencao_total, 10)}
            {scoreRow('Mem. Visual', d.memoria_visual_total, 24)}
            {scoreRow('Praxia — Cópia', d.praxia_copia_figura_total, 24)}
            {scoreRow('Praxia — Relógio', d.praxia_relogio_total, 9)}
            {scoreRow('FE — NSR acertos', d.fe_nsr_total_acertos, 24)}
            {scoreRow('FE — Fluência', d.fe_fluencia_verbal_total, null)}
            {scoreRow('Proc. Numérico', d.processamento_numerico_total, 7)}
            {scoreRow('Lgg — Nomeação', d.linguagem_nomeacao_total, 4)}
            {scoreRow('Lgg — Repetição', d.linguagem_repeticao_total, 8)}
            {scoreRow('Lgg — Escrita', d.linguagem_escrita_total, 4)}
            {/* Total geral */}
            {d.total_score != null && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>TOTAL TRIACOG</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: S.greenL }}>{d.total_score}</span>
                  {d.classification && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                      background: d.classification === 'NORMAL' ? 'rgba(46,125,50,0.2)' : 'rgba(198,40,40,0.2)',
                      color: d.classification === 'NORMAL' ? S.greenL : '#ef9a9a',
                      border: `1px solid ${d.classification === 'NORMAL' ? 'rgba(46,125,50,0.4)' : 'rgba(198,40,40,0.4)'}`,
                    }}>{d.classification}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
            <textarea rows={3} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TOKEN — Tabela Normativa EPI (Fonte: Tabela 2 – Escores padronizados por idade) ─
const TOKEN_CLASSIFICACAO_ST = [
  { min: 0,   max: 30,  label: 'Deficitário',    type: 'impaired' },
  { min: 31,  max: 36,  label: 'Limítrofe',      type: 'borderline' },
  { min: 37,  max: 43,  label: 'Média Inferior', type: 'borderline' },
  { min: 44,  max: 56,  label: 'Média',          type: 'preserved' },
  { min: 57,  max: 63,  label: 'Média Superior', type: 'preserved' },
  { min: 64,  max: 69,  label: 'Superior',       type: 'preserved' },
  { min: 70,  max: 999, label: 'Muito Superior', type: 'preserved' },
]
const TOKEN_TABELA_EPI = [
  { epi:  2, percentil: '<1',    tScore: '<25',   escores: { '63_67': '≤14', '68_72': '≤14', '73_77': '≤18', '78_82': '≤18',     '83mais': '≤15' } },
  { epi:  3, percentil: '1',     tScore: '25–28', escores: { '63_67': 15,    '68_72': 15,    '73_77': 19,    '78_82': null,       '83mais': null  } },
  { epi:  4, percentil: '2',     tScore: '28–31', escores: { '63_67': 19,    '68_72': 19,    '73_77': null,  '78_82': 19,         '83mais': null  } },
  { epi:  5, percentil: '3–5',   tScore: '32–35', escores: { '63_67': 23,    '68_72': 23,    '73_77': 23,    '78_82': 22,         '83mais': 16    } },
  { epi:  6, percentil: '6–10',  tScore: '35–38', escores: { '63_67': 24,    '68_72': null,  '73_77': 24,    '78_82': 23,         '83mais': 22    } },
  { epi:  7, percentil: '11–18', tScore: '39–42', escores: { '63_67': '25–26', '68_72': '24–25', '73_77': 25, '78_82': 24,       '83mais': 23    } },
  { epi:  8, percentil: '19–28', tScore: '42–45', escores: { '63_67': 27,    '68_72': '26–28', '73_77': 26,  '78_82': '25–26',   '83mais': 24    } },
  { epi:  9, percentil: '29–40', tScore: '45–48', escores: { '63_67': 29,    '68_72': 29,    '73_77': '27–28', '78_82': 27,      '83mais': 26    } },
  { epi: 10, percentil: '41–59', tScore: '49–51', escores: { '63_67': 30,    '68_72': 30,    '73_77': '29–30', '78_82': '28–29', '83mais': 28    } },
  { epi: 11, percentil: '60–71', tScore: '52–55', escores: { '63_67': 31,    '68_72': 31,    '73_77': 31,    '78_82': 30,         '83mais': '29–30' } },
  { epi: 12, percentil: '72–81', tScore: '55–58', escores: { '63_67': '32–33', '68_72': 32,  '73_77': 32,    '78_82': 31,         '83mais': 31    } },
  { epi: 13, percentil: '82–89', tScore: '58–61', escores: { '63_67': null,  '68_72': 33,    '73_77': null,  '78_82': null,       '83mais': null  } },
  { epi: 14, percentil: '90–94', tScore: '62–65', escores: { '63_67': 34,    '68_72': 34,    '73_77': 33,    '78_82': 32,         '83mais': null  } },
  { epi: 15, percentil: '95–97', tScore: '65–68', escores: { '63_67': 35,    '68_72': null,  '73_77': null,  '78_82': null,       '83mais': 32    } },
  { epi: 16, percentil: '98',    tScore: '69–72', escores: { '63_67': null,  '68_72': 35,    '73_77': 34,    '78_82': 33,         '83mais': null  } },
  { epi: 17, percentil: '99',    tScore: '72–75', escores: { '63_67': null,  '68_72': null,  '73_77': null,  '78_82': null,       '83mais': null  } },
  { epi: 18, percentil: '>99',   tScore: '>75',   escores: { '63_67': 36,    '68_72': 36,    '73_77': 35,    '78_82': 34,         '83mais': 33    } },
]
function tokenParseTScore(ts) {
  if (typeof ts === 'number') return ts
  if (ts.startsWith('<')) return parseInt(ts.replace('<', '')) - 1
  if (ts.startsWith('>')) return parseInt(ts.replace('>', '')) + 1
  const p = ts.split('–')
  return p.length === 2 ? Math.round((parseInt(p[0]) + parseInt(p[1])) / 2) : parseInt(ts)
}
function tokenGetFaixaId(age) {
  const a = Number(age)
  if (a >= 63 && a <= 67) return '63_67'
  if (a >= 68 && a <= 72) return '68_72'
  if (a >= 73 && a <= 77) return '73_77'
  if (a >= 78 && a <= 82) return '78_82'
  if (a >= 83) return '83mais'
  return null
}
function tokenClassificarPorPercentil(percentilStr) {
  if (!percentilStr) return null
  let val
  if (percentilStr === '<1') val = 0
  else if (percentilStr === '>99') val = 100
  else {
    const parts = percentilStr.split('–')
    val = parts.length === 2 ? Math.round((parseInt(parts[0]) + parseInt(parts[1])) / 2) : parseInt(percentilStr)
  }
  if (isNaN(val)) return null
  if (val <= 5)  return { label: 'Muito Inferior', type: 'impaired' }
  if (val <= 10) return { label: 'Inferior',       type: 'impaired' }
  if (val <= 25) return { label: 'Média Inferior', type: 'borderline' }
  if (val <= 75) return { label: 'Média',          type: 'preserved' }
  if (val <= 90) return { label: 'Média Superior', type: 'preserved' }
  if (val <= 95) return { label: 'Superior',       type: 'preserved' }
  return { label: 'Muito Superior', type: 'preserved' }
}
function tokenBuscarEPI(bruto, faixaId) {
  for (let i = TOKEN_TABELA_EPI.length - 1; i >= 0; i--) {
    const row = TOKEN_TABELA_EPI[i]
    const val = row.escores[faixaId]
    if (val === null || val === undefined) continue
    let lim
    let isLeq = false
    if (typeof val === 'string') {
      if (val.startsWith('≤')) { lim = parseInt(val.replace('≤', '')); isLeq = true }
      else { lim = parseInt(val.split('–')[1] ?? val) }
    } else { lim = val }
    if (isLeq ? bruto <= lim : bruto >= lim) {
      const cl = tokenClassificarPorPercentil(row.percentil)
      return { epi: row.epi, percentil: row.percentil, tScore: row.tScore, classificacao: cl?.label || '—', type: cl?.type || 'info' }
    }
  }
  return null
}

const TOKEN_PARTS = [
  { key: 'part_a', label: 'Parte A', desc: 'Todas as peças', count: 7 },
  { key: 'part_b', label: 'Parte B', desc: 'Somente peças grandes', count: 4 },
  { key: 'part_c', label: 'Parte C', desc: 'Todas as peças, sem repetir instruções', count: 4 },
  { key: 'part_d', label: 'Parte D', desc: 'Somente peças grandes, sem repetir instruções', count: 4 },
  { key: 'part_e', label: 'Parte E', desc: 'Todas as peças, sem repetir instruções', count: 4 },
  { key: 'part_f', label: 'Parte F', desc: 'Todas as peças, sem repetir instruções', count: 13 },
]
const TOKEN_MAX = 36

function TOKENForm({ data, onChange }) {
  const d = data || {}

  const update = (changes) => {
    const n = { ...d, ...changes }
    let totalScore = 0
    TOKEN_PARTS.forEach(p => {
      const arr = n[`${p.key}_items`] || []
      const score = arr.reduce((s, v) => s + (Number(v) || 0), 0)
      n[`${p.key}_score`] = score
      totalScore += score
    })
    n.total_score = totalScore
    n.errors = TOKEN_MAX - totalScore
    const faixaId = tokenGetFaixaId(n.age)
    n.classification = ''
    if (faixaId && totalScore > 0) {
      const epi = tokenBuscarEPI(totalScore, faixaId)
      if (epi) {
        n.epi        = epi.epi
        n.percentile = epi.percentil
        n.t_score    = epi.tScore
        n.classification = epi.classificacao
      }
    }
    onChange(n)
  }

  const total = d.total_score ?? TOKEN_PARTS.reduce((s, p) => {
    const arr = d[`${p.key}_items`] || []
    return s + arr.reduce((ss, v) => ss + (Number(v) || 0), 0)
  }, 0)
  const hasAny   = total > 0 || TOKEN_PARTS.some(p => (d[`${p.key}_items`] || []).some(v => v != null && v !== 0))
  const faixaId  = tokenGetFaixaId(d.age)
  const epiResult = (faixaId && total > 0) ? tokenBuscarEPI(total, faixaId) : null

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
        <NumField label="Idade" value={d.age} onChange={v => update({ age: v })} min={0} max={120} />
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Sexo</div>
          <select value={d.sex || ''} onChange={e => update({ sex: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Escolaridade</div>
          <select value={d.education || ''} onChange={e => update({ education: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="">—</option>
            {['1-4 anos','5-8 anos','9+ anos','Ensino Fundamental','Ensino Médio','Ensino Superior','Pós-graduação'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de nascimento</div>
          <input type="date" value={d.birth_date || ''} onChange={e => update({ birth_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de avaliação</div>
          <input type="date" value={d.application_date || ''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
          <select value={d.status || 'em_andamento'} onChange={e => update({ status: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }}>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
      </div>

      {/* Partes A–F */}
      {TOKEN_PARTS.map(p => {
        const arr = d[`${p.key}_items`] || []
        const score = d[`${p.key}_score`] ?? arr.reduce((s, v) => s + (Number(v) || 0), 0)
        return (
          <div key={p.key} style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.label}</span>
              <span style={{ fontSize: 10, color: S.muted }}>{p.desc}</span>
            </div>
            <ItemGrid values={arr} count={p.count} onChangeFn={v => update({ [`${p.key}_items`]: v })} />
          </div>
        )
      })}

      {/* Resultado */}
      {hasAny && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: epiResult ? 10 : 0 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total: {total}/{TOKEN_MAX}</span>
              <span style={{ fontSize: 12, color: S.muted, marginLeft: 14 }}>Erros: {d.errors ?? TOKEN_MAX - total}</span>
            </div>
            {epiResult && <Badge label={epiResult.classificacao} type={epiResult.type} />}
          </div>
          {epiResult ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>EPI</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{epiResult.epi}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>Percentil</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{epiResult.percentil}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: S.muted, marginBottom: 2 }}>T-score (sT)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{epiResult.tScore}</div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>
              {faixaId ? 'Preencha as partes para calcular o EPI.' : 'Informe a idade (63–83+) para calcular EPI e T-score.'}
            </p>
          )}
        </div>
      )}

      {/* Classificação / Interpretação */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Classificação</div>
          <input value={d.classification || ''} onChange={e => update({ classification: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="Ex: Média" />
        </div>
        <NumField label="Percentil" value={d.percentile} onChange={v => update({ percentile: v })} min={0} max={100} />
      </div>
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Interpretação</div>
        <textarea rows={2} value={d.interpretation || ''} onChange={e => update({ interpretation: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
        <textarea rows={2} value={d.observations || ''} onChange={e => update({ observations: e.target.value })}
          style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

// ─── MEMIMP / MemoryTest (Base44-compliant — 16 itens × 2 respondentes, 1–5) ──
const MEMIMP_ITEMS = [
  'Decide fazer alguma coisa daqui a alguns minutos e depois esquece-se de a fazer?',
  'Não consegue reconhecer um lugar que já visitou antes?',
  'Esquece-se de fazer alguma coisa que era suposto fazer dali a alguns minutos mesmo que esteja à sua frente, como tomar um comprimido ou desligar a cafeteira?',
  'Esquece-se de alguma coisa que lhe foi dita alguns minutos antes?',
  'Esquece-se dos compromissos se não for lembrado para os fazer por outra pessoa ou por um lembrete como um calendário ou uma agenda?',
  'Não consegue reconhecer uma personagem num programa de rádio ou de televisão de uma cena para a outra?',
  'Esquece-se de comprar alguma coisa que planeou comprar, como um cartão de aniversário, mesmo quando vê a loja?',
  'Não consegue recordar coisas que lhe aconteceram nos últimos dias?',
  'Repete a mesma história à mesma pessoa em ocasiões diferentes?',
  'Quando está de saída de uma sala ou de casa, esquece-se de levar alguma coisa que tencionava levar mesmo que ela esteja à sua frente?',
  'Perde alguma coisa que acabou de pousar, como uma revista ou os óculos?',
  'Esquece-se de dar um recado ou entregar algo a alguém quando lhe pedem?',
  'Olha para alguma coisa sem se aperceber que a viu momentos antes?',
  'Quando tenta contactar um/a amigo/a ou familiar e não consegue, esquece-se de tentar mais tarde?',
  'Esquece-se do que viu na televisão no dia anterior?',
  'Esquece-se de dizer a alguém algo que queria dizer alguns minutos antes?',
]

function computeMemimp(n, prefix) {
  const keys = Array.from({ length: 16 }, (_, i) => `${prefix}_q${i + 1}`)
  const answered = keys.filter(k => n[k] != null).length
  if (answered === 0) return { prospective: null, retrospective: null, total: null, mean: null, sd: null }
  const vals = keys.map(k => Number(n[k]) || 0)
  const pmIdx = [0,2,4,6,9,11,13,15]
  const rmIdx = [1,3,5,7,8,10,12,14]
  const prospective    = pmIdx.reduce((s,i) => s + (vals[i]||0), 0)
  const retrospective  = rmIdx.reduce((s,i) => s + (vals[i]||0), 0)
  const total          = prospective + retrospective
  const mean           = Math.round((total / 16) * 100) / 100
  const variance       = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 16
  const sd             = Math.round(Math.sqrt(variance) * 100) / 100
  return { prospective, retrospective, total, mean, sd }
}

function MEMIMPForm({ data, onChange, onSave }) {
  const d = data || {}
  const [tab, setTab] = React.useState('paciente')
  const switchTab = (t) => { if (onSave) onSave(); setTab(t) }

  const update = (changes) => {
    const n = { ...d, ...changes }
    const p = computeMemimp(n, 'patient')
    const f = computeMemimp(n, 'family')
    onChange({
      ...n,
      patient_prospective: p.prospective, patient_retrospective: p.retrospective,
      patient_total: p.total, patient_mean: p.mean, patient_sd: p.sd,
      family_prospective:  f.prospective, family_retrospective:  f.retrospective,
      family_total:  f.total, family_mean:  f.mean,  family_sd:  f.sd,
      classification: '',
    })
  }

  const p = computeMemimp(d, 'patient')
  const f = computeMemimp(d, 'family')

  const tabStyle = (t) => ({
    padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  const itemList = (prefix) => MEMIMP_ITEMS.map((lbl, i) => {
    const key = `${prefix}_q${i + 1}`
    const isProsp = i < 8
    return (
      <div key={key} style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
        padding: '6px 10px', borderRadius: 6, marginBottom: 3,
        background: d[key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
        borderLeft: `3px solid ${isProsp ? 'rgba(59,130,246,0.4)' : 'rgba(245,158,11,0.4)'}`,
      }}>
        <div style={{ fontSize: 12, color: d[key] != null ? '#fff' : S.muted }}>
          <span style={{ fontSize: 9, color: isProsp ? S.blue : S.amber, marginRight: 5, fontWeight: 700 }}>
            {isProsp ? 'PM' : 'RM'}
          </span>
          <span style={{ color: S.muted, marginRight: 4 }}>{i + 1}.</span>{lbl}
        </div>
        <ScoreButtons value={d[key]} onChange={v => update({ [key]: v })} min={1} max={5} />
      </div>
    )
  })

  const scoreBox = (label, stats) => stats.total != null && (
    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          ['Prospectiva', stats.prospective, 40],
          ['Retrospectiva', stats.retrospective, 40],
          ['Total', stats.total, 80],
          ['Média', stats.mean, null],
        ].map(([k, v, mx]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: S.muted }}>{k}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.greenL }}>{v != null ? v : '—'}{mx ? `/${mx}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Informante</div>
          <input value={d.informant||''} onChange={e => update({ informant: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="nome" />
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 10, color: S.muted }}>
        <span><span style={{ color: S.blue, fontWeight: 700 }}>PM</span> = Prospectiva (q1–q8) — intenções futuras</span>
        <span><span style={{ color: S.amber, fontWeight: 700 }}>RM</span> = Retrospectiva (q9–q16) — eventos passados</span>
        <span>1=Nunca · 2=Raramente · 3=Às vezes · 4=Frequentemente · 5=Quase sempre</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button style={tabStyle('paciente')} onClick={() => switchTab('paciente')}>
          Paciente {p.total != null ? `(${p.total}/80)` : ''}
        </button>
        <button style={tabStyle('familiar')} onClick={() => switchTab('familiar')}>
          Familiar {f.total != null ? `(${f.total}/80)` : ''}
        </button>
        <button style={tabStyle('resultado')} onClick={() => switchTab('resultado')}>Resultado</button>
      </div>

      {tab === 'paciente' && <div>{itemList('patient')}</div>}
      {tab === 'familiar' && <div>{itemList('family')}</div>}

      {tab === 'resultado' && (
        <div>
          {scoreBox('Paciente', p)}
          {scoreBox('Familiar', f)}
          {p.total != null && f.total != null && (
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: S.muted }}>Discrepância Paciente − Familiar:</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: p.total - f.total > 0 ? S.amber : S.greenL }}>
                {p.total - f.total > 0 ? '+' : ''}{p.total - f.total}
              </div>
              <div style={{ fontSize: 10, color: S.muted }}>{'>'} 0 = Paciente relata mais falhas que familiar</div>
            </div>
          )}
          <p style={{ fontSize: 11, color: S.muted }}>Escores maiores = mais falhas percebidas de memória</p>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Hipótese Diagnóstica</div>
            <input value={d.diagnostic_hypothesis||''} onChange={e => update({ diagnostic_hypothesis: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="texto livre..." />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
            <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
            <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8, width: 'auto' }}>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PCRS (Base44-compliant — 17 itens × 2 respondentes, 1–5) ────────────────
const PCRS_ITEMS = [
  'Lembrar onde colocou coisas',
  'Lembrar nomes de pessoas',
  'Orientar-se em lugares novos',
  'Ler para obter informações',
  'Concentrar-se em uma tarefa',
  'Planejar o que precisa fazer',
  'Reagir adequadamente em situações sociais',
  'Ser irritável',
  'Sentir-se deprimido(a)',
  'Ter energia para fazer coisas',
  'Controlar o temperamento',
  'Deslocar-se / usar transporte',
  'Lidar com dinheiro',
  'Seguir instruções',
  'Manter-se atualizado(a) sobre acontecimentos',
  'Desempenhar tarefas de trabalho ou estudo',
  'Manter bons relacionamentos com amigos e família',
]

function PCRSForm({ data, onChange, onSave }) {
  const d = data || {}
  const [tab, setTab] = React.useState('paciente')
  const switchTab = (t) => { if (onSave) onSave(); setTab(t) }

  const update = (changes) => {
    const n = { ...d, ...changes }
    const pKeys = PCRS_ITEMS.map((_, i) => `patient_q${i + 1}`)
    const iKeys = PCRS_ITEMS.map((_, i) => `informant_q${i + 1}`)
    const pAnswered = pKeys.filter(k => n[k] != null).length
    const iAnswered = iKeys.filter(k => n[k] != null).length
    const patient_total   = pAnswered > 0 ? pKeys.reduce((s, k) => s + (Number(n[k]) || 0), 0) : null
    const informant_total = iAnswered > 0 ? iKeys.reduce((s, k) => s + (Number(n[k]) || 0), 0) : null

    const discrepancies = PCRS_ITEMS.map((_, i) => {
      const pv = n[`patient_q${i+1}`], iv = n[`informant_q${i+1}`]
      return (pv != null && iv != null) ? Number(pv) - Number(iv) : null
    })
    const validDisc = discrepancies.filter(v => v != null)
    const total_discrepancy     = validDisc.length > 0 ? validDisc.reduce((s, v) => s + Math.abs(v), 0) : null
    const percentage_discrepant = validDisc.length > 0
      ? Math.round(validDisc.filter(v => Math.abs(v) >= 2).length / 17 * 100)
      : null

    onChange({ ...n, patient_total, informant_total, discrepancies, total_discrepancy, percentage_discrepant, classification: '' })
  }

  const pKeys = PCRS_ITEMS.map((_, i) => `patient_q${i + 1}`)
  const iKeys = PCRS_ITEMS.map((_, i) => `informant_q${i + 1}`)
  const pTotal = pKeys.filter(k => d[k] != null).length > 0 ? pKeys.reduce((s, k) => s + (Number(d[k]) || 0), 0) : null
  const iTotal = iKeys.filter(k => d[k] != null).length > 0 ? iKeys.reduce((s, k) => s + (Number(d[k]) || 0), 0) : null
  const discrepancy = pTotal != null && iTotal != null ? pTotal - iTotal : null

  const tabStyle = (t) => ({
    padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: tab === t ? 700 : 400,
    background: tab === t ? S.green : 'rgba(255,255,255,0.06)',
    color: tab === t ? '#fff' : S.muted,
  })

  const itemList = (prefix) => PCRS_ITEMS.map((lbl, i) => {
    const key = `${prefix}_q${i + 1}`
    return (
      <div key={key} style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
        padding: '6px 10px', borderRadius: 6, marginBottom: 3,
        background: d[key] != null ? 'rgba(46,125,50,0.06)' : 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ fontSize: 12, color: d[key] != null ? '#fff' : S.muted }}>
          <span style={{ color: S.muted, marginRight: 5 }}>{i + 1}.</span>{lbl}
        </div>
        <ScoreButtons value={d[key]} onChange={v => update({ [key]: v })} min={1} max={5} />
      </div>
    )
  })

  return (
    <div>
      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'rgba(46,125,50,0.08)', borderRadius: 8, border: '1px solid rgba(46,125,50,0.2)' }}>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Data de Aplicação</div>
          <input type="date" value={d.application_date||''} onChange={e => update({ application_date: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Informante</div>
          <input value={d.informant||''} onChange={e => update({ informant: e.target.value })}
            style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="nome" />
        </div>
      </div>

      {/* Escala */}
      <div style={{ fontSize: 10, color: S.muted, marginBottom: 8, fontStyle: 'italic' }}>
        1 = Não consigo fazer · 3 = Consigo com dificuldade · 5 = Consigo facilmente
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button style={tabStyle('paciente')} onClick={() => switchTab('paciente')}>
          Paciente {pTotal != null ? `(${pTotal}/85)` : ''}
        </button>
        <button style={tabStyle('informante')} onClick={() => switchTab('informante')}>
          Informante {iTotal != null ? `(${iTotal}/85)` : ''}
        </button>
        <button style={tabStyle('resultado')} onClick={() => switchTab('resultado')}>Resultado</button>
      </div>

      {tab === 'paciente'   && <div>{itemList('patient')}</div>}
      {tab === 'informante' && <div>{itemList('informant')}</div>}

      {tab === 'resultado' && (
        <div>
          {/* Totais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[['Paciente', pTotal], ['Informante', iTotal]].map(([lbl, v]) => (
              <div key={lbl} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: S.muted }}>{lbl}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: S.greenL }}>{v != null ? `${v}/85` : '—'}</div>
              </div>
            ))}
          </div>

          {/* Discrepância */}
          {discrepancy !== null && (
            <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: S.muted }}>Discrepância total (Paciente − Informante)</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: Math.abs(discrepancy) > 10 ? S.amber : S.greenL }}>
                  {discrepancy >= 0 ? '+' : ''}{discrepancy}
                </span>
              </div>
              {d.percentage_discrepant != null && (
                <div style={{ fontSize: 11, color: S.muted }}>
                  {d.percentage_discrepant}% dos itens com discrepância ≥ 2 pontos
                </div>
              )}
              {Math.abs(discrepancy) > 10 && (
                <div style={{ marginTop: 6, fontSize: 11, color: S.amber, fontWeight: 600 }}>
                  ⚠ Discrepância clinicamente relevante — avaliar insight / anosognosia
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: 10, color: S.muted }}>
                Positiva = paciente superestima competências · Negativa = paciente subestima
              </div>
            </div>
          )}

          {/* Per-item discrepancies */}
          {Array.isArray(d.discrepancies) && d.discrepancies.some(v => v != null) && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: S.muted, marginBottom: 6 }}>Discrepâncias por item</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {d.discrepancies.map((v, i) => v != null && (
                  <div key={i} style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                    background: Math.abs(v) >= 2 ? 'rgba(245,158,11,0.2)' : 'rgba(46,125,50,0.15)',
                    color: Math.abs(v) >= 2 ? S.amber : S.greenL,
                    border: `1px solid ${Math.abs(v) >= 2 ? S.amber : S.green}`,
                  }}>
                    Q{i+1}: {v >= 0 ? '+' : ''}{v}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: 11, color: S.muted, marginBottom: 10 }}>
            Ref: Discrepância &gt;10 pts total ou ≥2 pts em vários itens = sugestivo de falta de insight
          </p>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Hipótese Diagnóstica</div>
            <input value={d.diagnostic_hypothesis||''} onChange={e => update({ diagnostic_hypothesis: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8 }} placeholder="texto livre..." />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Observações</div>
            <textarea rows={2} value={d.observations||''} onChange={e => update({ observations: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', resize: 'vertical', padding: '8px 10px', lineHeight: 1.5 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: S.muted, marginBottom: 3 }}>Status</div>
            <select value={d.status||'em_andamento'} onChange={e => update({ status: e.target.value })}
              style={{ ...inputStyle, textAlign: 'left', paddingLeft: 8, width: 'auto' }}>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

function isTestFilled(testData) {
  if (!testData) return false
  const SKIP = new Set(['scan_urls', '_savedAt'])
  return Object.entries(testData)
    .filter(([k]) => !SKIP.has(k))
    .some(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
}

// ─── Configuração dos testes ──────────────────────────────────────────────────
const TEST_CONFIG = [
  { group: 'Rastreio Cognitivo', items: [
    { key: 'MoCA',      label: 'MoCA',      Form: MoCAForm },
  ]},
  { group: 'Bateria Cognitiva', items: [
    { key: 'NEUPSILIN', label: 'NEUPSILIN', Form: NEUPSILINForm },
    { key: 'TRIACOG',   label: 'TRIACOG',   Form: TRIACOGForm },
  ]},
  { group: 'Memória', items: [
    { key: 'RAVLT',     label: 'RAVLT',     Form: RAVLTForm },
    { key: 'BAMS',      label: 'BAMS',      Form: BAMSForm },
    { key: 'MEMIMP',    label: 'MEMIMP',    Form: MEMIMPForm },
  ]},
  { group: 'Funções Executivas', items: [
    { key: 'FAB',       label: 'FAB',       Form: FABForm },
    { key: 'WCST',      label: 'WCST',      Form: WCSTFullForm },
    { key: 'WCST-N',    label: 'WCST-N',    Form: WCSTForm },
    { key: 'DEX',       label: 'DEX',       Form: DEXForm },
  ]},
  { group: 'Linguagem', items: [
    { key: 'TOKEN',     label: 'Token',     Form: TOKENForm },
  ]},
  { group: 'Inteligência', items: [
    { key: 'WASI',      label: 'WASI',      Form: (p) => <WASIForm {...p} version="WASI" /> },
    { key: 'WASI-III',  label: 'WASI-III',  Form: (p) => <WASIForm {...p} version="WASI-III" /> },
  ]},
  { group: 'Humor', items: [
    { key: 'GDS-15',    label: 'GDS-15',    Form: GDS15Form },
    { key: 'BDI-II',    label: 'BDI-II',    Form: BDI2Form },
    { key: 'HAD',       label: 'HAD',       Form: HADForm },
  ]},
  { group: 'Ansiedade', items: [
    { key: 'GAI',       label: 'GAI',       Form: GAIForm },
    { key: 'IDATE-E',   label: 'IDATE-E',   Form: (p) => <IDATEForm {...p} label="Estado (IDATE-E)" /> },
    { key: 'IDATE-T',   label: 'IDATE-T',   Form: (p) => <IDATEForm {...p} label="Traço (IDATE-T)" /> },
  ]},
  { group: 'Funcional / Informante', items: [
    { key: 'IQCODE',    label: 'IQCODE',    Form: IQCODEForm },
    { key: 'B-ADL',     label: 'B-ADL',     Form: BADLForm },
    { key: 'Pfeffer',   label: 'Pfeffer',   Form: PfefferForm },
    { key: 'Lawton',    label: 'Lawton',    Form: LawtonForm },
    { key: 'PCRS',      label: 'PCRS',      Form: PCRSForm },
  ]},
]

// ─── Verifica se teste está genuinamente 100% preenchido ─────────────────────
function isTrulyComplete(key, data) {
  if (!data) return false
  const d = data
  switch (key) {
    case 'GDS-15':   return GDS15_ITEMS.every(it => d[it.key] != null)
    case 'GAI':      return GAI_ITEMS.every(it => d[it.key] != null)
    case 'FAB':      return FAB_FIELDS.every(f => d[f.key] != null)
    case 'BDI-II':   return BDII_ITEMS.every(it => d[it.key] != null)
    case 'IDATE-E':
    case 'IDATE-T':  return Array.from({length:20},(_,i)=>`q${i+1}`).every(k => d[k] != null && d[k] !== '')
    case 'IQCODE':   return Array.from({length:26},(_,i)=>`q${i+1}`).every(k => d[k] != null)
    case 'B-ADL':    return BADL_ITEMS.every(it => d[it.key] != null)
    case 'Pfeffer':  return PFEFFER_ITEMS.every(it => d[it.key] != null)
    case 'Lawton':   return LAWTON_ITEMS.every(it => d[it.key] != null)
    case 'HAD':      return HAD_ANXIETY_ITEMS.every(i => d[i.key] != null) && HAD_DEPRESSION_ITEMS.every(i => d[i.key] != null)
    case 'DEX':      return DEX_SCORE_ITEMS.every(it => d[`patient_q${it.n}`] != null)
    case 'MEMIMP':   return MEMIMP_ITEMS.every((_,i) => d[`patient_q${i+1}`] != null)
    case 'PCRS':     return PCRS_ITEMS.every((_,i) => d[`patient_q${i+1}`] != null)
    case 'MoCA':     return d.total_score != null && d.total_score !== ''
    case 'RAVLT':    return ['a1_score','a2_score','a3_score','a4_score','a5_score','b1_score','a6_score','a7_score'].every(k => d[k] != null && d[k] !== '')
    case 'WCST':     return (
      d.categories_completed != null && d.categories_completed !== '' &&
      d.total_trials != null && d.total_trials !== '' &&
      d.total_errors != null && d.total_errors !== '' &&
      d.perseverative_errors != null && d.perseverative_errors !== ''
    )
    case 'WCST-N':   return Number(d.trials_administered) >= 48
    case 'WASI':
    case 'WASI-III': return d.qit_2 != null && d.qit_2 !== '' && d.qiv != null && d.qiv !== ''
    case 'BAMS':     return !!(d.edu_group) && d.z_bams != null && d.z_bams !== '' &&
      d.fv_animals_hits != null && d.fv_fruits_hits != null &&
      d.fv_utensils_hits != null && d.fv_clothes_hits != null &&
      Array.isArray(d.nd_scores)      && d.nd_scores.length      >= 10 &&
      Array.isArray(d.ni_nouns)       && d.ni_nouns.length       >= 14 &&
      Array.isArray(d.ni_verbs)       && d.ni_verbs.length       >= 7  &&
      Array.isArray(d.ni_professions) && d.ni_professions.length >= 7  &&
      Array.isArray(d.cg_scores)      && d.cg_scores.length      >= 10 &&
      Array.isArray(d.dp_scores)      && d.dp_scores.length      >= 10 &&
      Array.isArray(d.ci_scores)      && d.ci_scores.length      >= 10 &&
      Array.isArray(d.cv_scores)      && d.cv_scores.length      >= 10
    default:         return false
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Tests() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const urlPatient = searchParams.get('paciente') || ''
  const [patients,  setPatients]  = useState([])
  const [patientId, setPatientId] = useState(urlPatient || localStorage.getItem('neuroclin_last_patient') || '')
  const [activeKey, setActiveKey] = useState('')
  const [justSaved, setJustSaved] = useState({})

  const session    = useTestSession(patientId)
  const sessionRef = useRef(session)
  sessionRef.current = session  // sempre aponta para a versão mais recente
  // Rastreia testes já bloqueados nesta sessão — impede re-lock causado por estado intermediário
  // vazio de NumFields (ex: apagar "5" e digitar "6" passa brevemente por '', zerando wasAlreadyComplete)
  const wasCompleteRef = useRef({})

  useEffect(() => {
    const base = collection(db, 'patients')
    getDocs(query(base, orderBy('createdAt', 'desc')))
      .then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => getDocs(base).then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })))))
  }, [user])

  const activeConf     = TEST_CONFIG.flatMap(g => g.items).find(t => t.key === activeKey)
  const patient        = patients.find(p => p.id === patientId)
  const isProfessional = user?.role === 'professional'
  const _testData      = session.getTest(activeKey) || {}
  const isConcluded     = _testData.status === 'concluido'
  const isEstagiario   = user?.role === 'estagiario'
  const formBlocked    = isProfessional
  const canManageStatus = !isProfessional

  // Ao montar/trocar paciente: envia dados do localStorage backup ao Firestore imediatamente
  useEffect(() => {
    if (patientId) session.flushBackup()
  }, [patientId])

  // Inicializa wasCompleteRef quando a sessão carrega — testes já 'concluido' no Firestore
  useEffect(() => {
    if (!session.sessionLoaded) return
    const tests = session.session?.tests || {}
    const init = {}
    Object.entries(tests).forEach(([k, v]) => { if (v?.status === 'concluido') init[k] = true })
    wasCompleteRef.current = init
  }, [session.sessionLoaded])

  // Pré-preenche campos demográficos ao abrir um teste (só preenche campos ainda vazios)
  useEffect(() => {
    if (!activeKey || !patient || !session.sessionLoaded) return
    const cur = sessionRef.current.getTest(activeKey)

    const birthDate = patient.birth_date || ''
    const birthYear = birthDate ? new Date(birthDate + 'T00:00:00').getFullYear() : null
    const age       = birthYear ? new Date().getFullYear() - birthYear : null
    const edu       = patient.education || ''

    const prefill = {}
    if (!cur.age && age)              prefill.age = age
    if (!cur.sex && patient.sex)      prefill.sex = patient.sex
    if (!cur.birth_date && birthDate) prefill.birth_date = birthDate

    if (edu) {
      if (activeKey === 'NEUPSILIN') {
        if (!cur.education_years)
          prefill.education_years = edu === 'Ensino Fundamental' ? '5-8' : '9+'
      } else if (activeKey === 'WCST') {
        if (!cur.education)
          prefill.education = edu === 'Ensino Fundamental' ? 'baixa' : 'alta'
      } else if (activeKey === 'WCST-N') {
        if (!cur.education_level) prefill.education_level = edu
      } else {
        if (!cur.education) prefill.education = edu
      }
    }

    if (Object.keys(prefill).length > 0) {
      sessionRef.current.updateTest(activeKey, prefill)
    }
  }, [activeKey, patient?.id, session.sessionLoaded])

  // Salva imediatamente ao desmontar a página — sessionRef evita stale closure
  useEffect(() => {
    return () => { sessionRef.current?.flushSave() }
  }, [])

  const handleChange = (key, data) => {
    const trulyDone = isTrulyComplete(key, data)
    // wasAlreadyComplete: usa ref (imune a estado intermediário vazio de NumFields)
    // OU checa o estado atual do hook (caso o ref ainda não tenha sido setado)
    const wasAlreadyComplete = wasCompleteRef.current[key] === true
      || isTrulyComplete(key, session.getTest(key))
    let autoData
    if (trulyDone && !wasAlreadyComplete && (!data.status || data.status === 'em_andamento')) {
      wasCompleteRef.current = { ...wasCompleteRef.current, [key]: true }
      autoData = { ...data, status: 'concluido' }
    } else {
      autoData = data
    }
    session.updateTest(key, autoData)
    setJustSaved(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setJustSaved(prev => ({ ...prev, [key]: false })), 2000)
  }


  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
    <TestStatusPanel sessionTests={session.session?.tests} patientName={patient?.full_name} />
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>TESTES</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Registro e classificação automática em tempo real</p>
      </div>

      <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <FlaskConical size={16} color={S.greenL} />
        <select
          value={patientId} onChange={e => { setPatientId(e.target.value); if (e.target.value) localStorage.setItem('neuroclin_last_patient', e.target.value) }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TEST_CONFIG.map(group => (
            <div key={group.group}>
              <div style={{ fontSize: 9, color: S.muted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 8px 4px' }}>
                {group.group}
              </div>
              {group.items.map(item => {
                const itemData    = patientId ? session.getTest(item.key) : null
                const hasData     = !!itemData && Object.keys(itemData).filter(k => k !== '_savedAt' && k !== 'scan_urls').length > 0
                const doneInList  = itemData?.status === 'concluido'
                return (
                  <button
                    key={item.key}
                    onClick={() => { session.flushSave(); setActiveKey(item.key) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px',
                      borderRadius: 7, border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      background: activeKey === item.key ? 'rgba(46,125,50,0.25)' : doneInList ? 'rgba(46,125,50,0.07)' : 'transparent',
                      color: activeKey === item.key ? '#fff' : doneInList ? S.greenL : S.muted,
                      fontWeight: activeKey === item.key || doneInList ? 700 : 400,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    {item.label}
                    {doneInList
                      ? <CheckCircle2 size={11} color={S.greenL} />
                      : (hasData && <CheckCircle2 size={11} color='rgba(255,255,255,0.25)' />)
                    }
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ background: S.card, borderRadius: 10, border: `1px solid ${S.border}`, padding: '20px 24px' }}>
          {!patientId ? (
            <div style={{ textAlign: 'center', padding: 40, color: S.muted }}>
              <FlaskConical size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Selecione um paciente para começar</p>
            </div>
          ) : !session.sessionLoaded ? (
            <div style={{ textAlign: 'center', padding: 40, color: S.muted }}>
              <div style={{ width: 28, height: 28, border: `3px solid rgba(46,125,50,0.3)`, borderTopColor: S.greenL, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 12 }}>Carregando dados do paciente...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : activeConf ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{activeConf.label}</h2>
                  {patient && (
                    <p style={{ fontSize: 12, color: S.greenL, marginTop: 2, fontWeight: 600 }}>{patient.full_name}</p>
                  )}
                  <p style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>Classificação automática ao digitar</p>
                </div>
                {justSaved[activeKey] && (
                  <span style={{ fontSize: 11, color: S.greenL, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Save size={12} /> Salvo
                  </span>
                )}
              </div>
              {/* Banner somente leitura — profissional */}
              {isProfessional && (
                <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={14} color={S.blue} />
                  <span style={{ fontSize: 12, color: S.blue, fontWeight: 600 }}>Somente leitura — visualização sem edição.</span>
                </div>
              )}
              {/* Banner de status — concluído */}
              {isConcluded && (
                <div style={{
                  background: 'rgba(46,125,50,0.10)',
                  border: '1px solid rgba(46,125,50,0.40)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color={S.greenL} />
                    <span style={{ fontSize: 12, color: S.greenL, fontWeight: 600 }}>
                      Teste marcado como concluído — edição ainda permitida
                    </span>
                  </div>
                  {canManageStatus && (
                    <button
                      onClick={() => {
                        wasCompleteRef.current = { ...wasCompleteRef.current, [activeKey]: false }
                        session.updateTest(activeKey, { ...session.getTest(activeKey), status: 'em_andamento' })
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '5px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <LockOpen size={12} /> Reabrir teste
                    </button>
                  )}
                </div>
              )}

              {/* Formulário */}
              <div style={{ opacity: formBlocked ? 0.65 : 1, pointerEvents: formBlocked ? 'none' : 'auto' }}>
                <activeConf.Form
                  data={session.getTest(activeKey)}
                  onChange={(data) => handleChange(activeKey, data)}
                  onSave={() => session.flushSave()}
                />
              </div>
              {/* Botão MARCAR COMO CONCLUÍDO */}
              {canManageStatus && !isConcluded && isTestFilled(session.getTest(activeKey)) && (
                <button
                  onClick={() => {
                    wasCompleteRef.current = { ...wasCompleteRef.current, [activeKey]: true }
                    session.updateTest(activeKey, { ...session.getTest(activeKey), status: 'concluido' })
                  }}
                  style={{
                    width: '100%', marginTop: 16, padding: '10px',
                    borderRadius: 8, border: `1.5px solid ${S.green}`,
                    background: 'rgba(46,125,50,0.15)',
                    color: S.greenL, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                >
                  <CheckCircle2 size={15} /> Marcar como concluído
                </button>
              )}

              {isTestFilled(session.getTest(activeKey)) ? (
                <TestScanUpload
                  key={activeKey + '-scan'}
                  patientId={patientId}
                  testKey={activeKey}
                  existingUrls={session.getTest(activeKey)?.scan_urls || []}
                  onUrlsChange={(urls) => handleChange(activeKey, { ...session.getTest(activeKey), scan_urls: urls })}
                  maxPhotos={activeKey === 'NEUPSILIN' ? 6 : 5}
                />
              ) : (
                <div style={{ marginTop: 16, padding: '18px 16px', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <Lock size={20} color={S.muted} style={{ margin: '0 auto 8px', opacity: 0.35, display: 'block' }} />
                  <p style={{ fontSize: 12, color: S.muted, margin: 0 }}>
                    Preencha o teste <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{activeConf.label}</strong> para liberar o anexo de fotos
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
