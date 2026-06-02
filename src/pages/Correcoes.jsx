import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { searchPatients, listProfessionals } from '@/services/prodoctorApi'
import { sincronizarFluxoPrevent } from '@/services/fluxoAvaliacaoService'
import { fetchDevolutivas } from '@/services/devolutivasProxy'
import {
  ClipboardList, Plus, X, Check, RefreshCw,
  Clock, Search, Loader2, AlertCircle,
  CheckCircle2, FileText, UserCheck, RotateCcw,
  User, Calendar, Shield, Zap, Trash2,
} from 'lucide-react'

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
  purple: '#8B5CF6',
  orange: '#F97316',
}

// Fluxo legado (status)
const STATUS_LEGADO = {
  aguardando: {
    label: 'Aguardando', color: '#EF4444',
    bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)',
    icon: AlertCircle, ordem: 10,
  },
  corrigindo: {
    label: 'Corrigindo', color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',
    icon: Clock, ordem: 11,
  },
  finalizado: {
    label: 'Finalizado', color: '#4CAF50',
    bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.3)',
    icon: CheckCircle2, ordem: 12,
  },
  retirado: {
    label: 'Retirado', color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)',
    icon: UserCheck, ordem: 13,
  },
}

// Novo fluxo (etapaAtual)
const ETAPA = {
  aguardando_correcao: {
    label: 'Ag. Correção', color: '#EF4444',
    bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)',
    icon: AlertCircle, ordem: 1,
  },
  em_correcao: {
    label: 'Em Correção', color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',
    icon: Clock, ordem: 2,
  },
  correcao_concluida: {
    label: 'Correção Concluída', color: '#4CAF50',
    bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.3)',
    icon: CheckCircle2, ordem: 3,
  },
  aguardando_aprovacao: {
    label: 'Ag. Aprovação', color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)',
    icon: Shield, ordem: 4,
  },
  pronto_devolutiva: {
    label: 'Pronto p/ Dev.', color: '#2DD4BF',
    bg: 'rgba(45,212,191,0.15)', border: 'rgba(45,212,191,0.3)',
    icon: CheckCircle2, ordem: 5,
  },
}

const ALL_STATUS = { ...ETAPA, ...STATUS_LEGADO }

function getEfetivo(item) {
  return item.etapaAtual || item.status || 'aguardando'
}

function getCfg(item) {
  return ALL_STATUS[getEfetivo(item)] || STATUS_LEGADO.aguardando
}

function fmtDate(val) {
  if (!val) return '—'
  if (val?.toDate) return val.toDate().toLocaleDateString('pt-BR')
  if (val instanceof Date) return val.toLocaleDateString('pt-BR')
  return String(val)
}

function toInputDate(val) {
  if (!val) return ''
  let d
  if (val?.toDate) d = val.toDate()
  else if (val instanceof Date) d = val
  else return ''
  return d.toISOString().split('T')[0]
}

function inputStyle(extra = {}) {
  return {
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid rgba(255,255,255,0.08)`,
    color: '#fff', borderRadius: 8,
    padding: '8px 12px', fontSize: 13,
    width: '100%', outline: 'none',
    boxSizing: 'border-box', ...extra,
  }
}

function btnStyle(color, bg) {
  return {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 7,
    border: `1px solid ${color}`, background: bg,
    color: color, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.5)', marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

function StatusBadge({ item }) {
  const cfg = getCfg(item)
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

function ConvenioBadge({ convenio }) {
  if (!convenio) return null
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
      background: 'rgba(13,148,136,0.2)', color: '#2DD4BF',
      border: '1px solid rgba(45,212,191,0.3)', whiteSpace: 'nowrap',
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {convenio === 'prevent_senior' ? 'Prevent Sênior' : convenio}
    </span>
  )
}

function AnamneseBadge({ preenchida }) {
  if (preenchida) return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: 'rgba(76,175,80,0.15)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)' }}>
      Anamnese OK
    </span>
  )
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
      Anamnese Pendente
    </span>
  )
}

function CorrecaoCard({ item, onChangeStatus, onMudarEtapa, onAssumir, onAssumirEstag, onDelete, onClickCard, isEstagiario, isBeliane, isAdmin, isProfissional, isEntregador, onGerarLaudo, onAtribuirEstagiario, estagiarios, userId }) {
  const cfg = getCfg(item)
  const etapa = item.etapaAtual
  const status = item.status
  const temEtapa = !!etapa
  const [confirmando, setConfirmando] = useState(false)
  const [hovered, setHovered] = useState(false)

  function renderAcoes() {
    const btns = []

    if (temEtapa) {
      // Estagiário — novo fluxo
      if (isEstagiario && etapa === 'aguardando_correcao' && item.estagiarioId === userId) {
        btns.push(
          <button key="iniciar" onClick={() => onMudarEtapa(item.id, 'em_correcao')}
            style={btnStyle('#F59E0B', 'rgba(245,158,11,0.15)')}>
            <Clock size={11} /> Iniciar correção
          </button>
        )
      }
      if (isEstagiario && etapa === 'em_correcao' && item.estagiarioId === userId) {
        btns.push(
          <button key="finalizar" onClick={() => onMudarEtapa(item.id, 'aguardando_aprovacao')}
            style={btnStyle('#8B5CF6', 'rgba(139,92,246,0.15)')}>
            <Check size={11} /> Finalizar correção
          </button>
        )
      }
      // Estagiário/entregador — assumir card sem dono
      if ((isEstagiario || isEntregador) && etapa === 'aguardando_correcao' && !item.estagiarioId) {
        btns.push(
          <button key="assumir-estag" onClick={() => onAssumirEstag(item.id)}
            style={btnStyle('#3B82F6', 'rgba(59,130,246,0.15)')}>
            <UserCheck size={11} /> Assumir correção
          </button>
        )
      }
      // Estagiário OU entregador — marcar correção como concluída
      if (isEntregador && etapa === 'aguardando_correcao') {
        btns.push(
          <button key="concluir-entregador" onClick={() => onMudarEtapa(item.id, 'correcao_concluida')}
            style={btnStyle('#4CAF50', 'rgba(76,175,80,0.2)')}>
            <CheckCircle2 size={11} /> Correção Concluída
          </button>
        )
      }
      if (isEstagiario && etapa === 'aguardando_correcao' && item.estagiarioId === userId) {
        btns.push(
          <button key="concluir-estag" onClick={() => onMudarEtapa(item.id, 'correcao_concluida')}
            style={btnStyle('#4CAF50', 'rgba(76,175,80,0.2)')}>
            <CheckCircle2 size={11} /> Correção Concluída
          </button>
        )
      }
      // Profissional — notificação quando correção está concluída
      if (isProfissional && etapa === 'correcao_concluida') {
        btns.push(
          <button key="gerar-laudo" onClick={e => { e.stopPropagation(); onGerarLaudo() }}
            style={{ ...btnStyle('#4CAF50', 'rgba(76,175,80,0.25)'), fontWeight: 800, boxShadow: '0 0 0 1px rgba(76,175,80,0.4)' }}>
            <FileText size={11} /> Gerar Laudo
          </button>
        )
      }
      // Admin — atribuição rápida de estagiário direto no card
      if (isAdmin && temEtapa && etapa === 'aguardando_correcao' && !item.estagiarioId && estagiarios?.length > 0) {
        btns.push(
          <select
            key="atribuir-estag"
            defaultValue=""
            onChange={e => {
              if (!e.target.value) return
              onAtribuirEstagiario(item.id, e.target.value)
              e.target.selectedIndex = 0
            }}
            style={{
              background: '#1E3A5F', border: '1px solid rgba(59,130,246,0.4)',
              color: '#93C5FD', borderRadius: 6, padding: '5px 10px', fontSize: 11,
              cursor: 'pointer', outline: 'none', maxWidth: 180, fontWeight: 600,
            }}
          >
            <option value="">Atribuir estagiário...</option>
            {estagiarios.map(e => (
              <option key={e.id} value={e.id}>{nomeDisplay(e)}</option>
            ))}
          </select>
        )
      }
      // Admin/supervisor — aprovação
      if (isAdmin && etapa === 'aguardando_aprovacao') {
        btns.push(
          <button key="aprovar" onClick={() => onMudarEtapa(item.id, 'pronto_devolutiva')}
            style={btnStyle('#4CAF50', 'rgba(76,175,80,0.15)')}>
            <CheckCircle2 size={11} /> Aprovar
          </button>
        )
        btns.push(
          <button key="devolver" onClick={() => onMudarEtapa(item.id, 'em_correcao')}
            style={btnStyle('rgba(255,255,255,0.35)', 'rgba(255,255,255,0.06)')}>
            <RotateCcw size={11} /> Devolver
          </button>
        )
      }
      // Profissional — auto-atribuição
      if (isProfissional && !item.profissionalUid) {
        btns.push(
          <button key="assumir" onClick={() => onAssumir(item.id)}
            style={btnStyle('#3B82F6', 'rgba(59,130,246,0.15)')}>
            <User size={11} /> Assumir caso
          </button>
        )
      }
    } else {
      // Admin — exclusão (somente fluxo legado)
      if (isAdmin && !temEtapa) {
        if (confirmando) {
          btns.push(
            <div key="confirm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Excluir?</span>
              <button onClick={() => { onDelete(item.id); setConfirmando(false) }}
                style={btnStyle('#EF4444', 'rgba(239,68,68,0.15)')}>
                <Check size={11} /> Sim
              </button>
              <button onClick={() => setConfirmando(false)}
                style={btnStyle('rgba(255,255,255,0.35)', 'rgba(255,255,255,0.06)')}>
                <X size={11} /> Não
              </button>
            </div>
          )
        } else {
          btns.push(
            <button key="delete" onClick={() => setConfirmando(true)}
              title="Excluir registro"
              style={btnStyle('rgba(239,68,68,0.6)', 'rgba(239,68,68,0.06)')}>
              <Trash2 size={11} />
            </button>
          )
        }
      }

      // Fluxo legado
      if (isEstagiario && status === 'aguardando' && item.estagiarioId === userId) {
        btns.push(
          <button key="iniciar" onClick={() => onChangeStatus(item.id, 'corrigindo')}
            style={btnStyle('#F59E0B', 'rgba(245,158,11,0.15)')}>
            <Clock size={11} /> Iniciar correção
          </button>
        )
      }
      if (isEstagiario && status === 'corrigindo' && item.estagiarioId === userId) {
        btns.push(
          <button key="finalizar" onClick={() => onChangeStatus(item.id, 'finalizado')}
            style={btnStyle('#4CAF50', 'rgba(76,175,80,0.15)')}>
            <Check size={11} /> Finalizar
          </button>
        )
      }
      if (isBeliane && status === 'finalizado') {
        btns.push(
          <button key="retirado" onClick={() => onChangeStatus(item.id, 'retirado')}
            style={btnStyle('#3B82F6', 'rgba(59,130,246,0.15)')}>
            <UserCheck size={11} /> Marcar retirado
          </button>
        )
      }
      if (isBeliane && status === 'retirado') {
        btns.push(
          <button key="desfazer" onClick={() => onChangeStatus(item.id, 'finalizado')}
            style={btnStyle('rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)')}>
            <RotateCcw size={11} /> Desfazer
          </button>
        )
      }
    }
    return btns
  }

  return (
    <div
      onClick={onClickCard}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(30,50,80,0.95)' : S.card,
        border: `1px solid ${hovered ? cfg.color : cfg.border}`,
        borderRadius: 10, padding: '14px 16px', marginBottom: 8,
        display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
        cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ minWidth: 120 }}><StatusBadge item={item} /></div>

      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.paciente || '—'}</div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>
          Prof: {item.profissionalNome || item.profissional || '—'}
          {item.profissionalUid && <span style={{ color: '#4CAF50', marginLeft: 4 }}>✓ atribuído</span>}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
          {item.convenio && <ConvenioBadge convenio={item.convenio} />}
          {temEtapa && <AnamneseBadge preenchida={item.anamnese_preenchida} />}
        </div>
      </div>

      <div style={{ minWidth: 120 }}>
        <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Estagiário</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: item.estagiarioNome ? '#fff' : S.muted }}>
          {item.estagiarioNome || 'Não atribuído'}
        </div>
      </div>

      <div style={{ minWidth: 200, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            {temEtapa ? 'Data de corte' : 'Entregue em'}
          </div>
          <div style={{ fontSize: 12, color: '#fff' }}>
            {fmtDate(item.dataCorte || item.dataEntrega)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Devolutiva</div>
          <div style={{ fontSize: 12, color: item.dataDevolutiva ? '#8B5CF6' : S.muted, fontStyle: item.dataDevolutiva ? 'normal' : 'italic' }}>
            {item.dataDevolutiva ? fmtDate(item.dataDevolutiva) : 'A agendar'}
          </div>
        </div>
        {item.finalizadoEm && (
          <div>
            <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Corrigido</div>
            <div style={{ fontSize: 12, color: '#4CAF50' }}>{fmtDate(item.finalizadoEm)}</div>
          </div>
        )}
        {item.dataFinalizacao && !item.finalizadoEm && (
          <div>
            <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Corrigido</div>
            <div style={{ fontSize: 12, color: '#4CAF50' }}>{fmtDate(item.dataFinalizacao)}</div>
          </div>
        )}
      </div>

      <div
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        {renderAcoes()}
      </div>
    </div>
  )
}

function nomeDisplay(u) {
  return u.full_name || u.nome || u.name || u.email || u.id
}

function ModalDetalhe({ item, profissionaisFirestore, estagiarios, devsProDoctor = [],
                        onSave, onAssumir, onClose, isEstagiario, isAdmin, isBeliane }) {
  const cfg = getCfg(item)
  const etapa = item.etapaAtual

  const [profissionalUid,  setProfissionalUid]  = useState(item.profissionalUid  || '')
  const [estagiarioId,     setEstagiarioId]     = useState(item.estagiarioId     || '')
  const [dataDevolutiva,   setDataDevolutiva]   = useState(toInputDate(item.dataDevolutiva))
  const [saving,           setSaving]           = useState(false)
  const [assumindo,        setAssumindo]        = useState(false)

  const devMatch = devsProDoctor.find(d => {
    if (!d.paciente || !item.paciente) return false
    const primeiroNome = item.paciente.split(' ')[0].toLowerCase()
    return d.paciente.toLowerCase().includes(primeiroNome)
  })

  useEffect(() => {
    if (!devMatch || dataDevolutiva) return
    const parts = devMatch.data.split('/')
    if (parts.length === 3) setDataDevolutiva(`${parts[2]}-${parts[1]}-${parts[0]}`)
  }, [devMatch?.data])

  const podeAssumir = isEstagiario && (etapa === 'aguardando_correcao' || !item.estagiarioId)

  async function salvar() {
    setSaving(true)
    try {
      const prof  = profissionaisFirestore.find(p => p.id === profissionalUid)
      const estag = estagiarios.find(e => e.id === estagiarioId)
      await onSave(item.id, {
        profissionalUid:  profissionalUid  || null,
        profissionalNome: prof  ? nomeDisplay(prof)  : (item.profissionalNome || null),
        estagiarioId:     estagiarioId     || null,
        estagiarioNome:   estag ? nomeDisplay(estag) : null,
        dataDevolutiva:   dataDevolutiva ? new Date(dataDevolutiva + 'T12:00:00') : null,
      })
    } finally {
      setSaving(false)
    }
  }

  async function assumir() {
    setAssumindo(true)
    try { await onAssumir(item.id) }
    finally { setAssumindo(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex' }} onClick={onClose}>
      {/* backdrop */}
      <div style={{ flex: 1, background: 'rgba(4,44,83,0.55)', backdropFilter: 'blur(3px)' }} />

      {/* painel lateral */}
      <div
        style={{ width: 390, background: '#1A2744', borderLeft: '1px solid rgba(255,255,255,0.08)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1A2744', zIndex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Detalhes do prontuário</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>

          {/* Info do paciente */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px', border: `1px solid ${cfg.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{item.paciente || '—'}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: item.dataCorte ? 8 : 0 }}>
              <StatusBadge item={item} />
              {item.convenio && <ConvenioBadge convenio={item.convenio} />}
              {item.etapaAtual && <AnamneseBadge preenchida={item.anamnese_preenchida} />}
            </div>
            {item.dataCorte && (
              <div style={{ fontSize: 11, color: S.muted }}>Data de corte: {fmtDate(item.dataCorte)}</div>
            )}
          </div>

          {/* ATRIBUIR PROFISSIONAL */}
          {(isBeliane || isAdmin) && (
            <div>
              <label style={labelStyle}>Atribuir profissional</label>
              <select value={profissionalUid} onChange={e => setProfissionalUid(e.target.value)} style={inputStyle()}>
                <option value="">Não atribuído</option>
                {profissionaisFirestore.map(p => (
                  <option key={p.id} value={p.id}>{nomeDisplay(p)}</option>
                ))}
              </select>
              {item.profissionalNome && !profissionalUid && (
                <div style={{ fontSize: 11, color: S.muted, marginTop: 5 }}>
                  Profissional ProDoctor: {item.profissionalNome}
                </div>
              )}
            </div>
          )}

          {/* ATRIBUIR ESTAGIÁRIO */}
          {(isBeliane || isAdmin) && (
            <div>
              <label style={labelStyle}>Atribuir estagiário</label>
              <select value={estagiarioId} onChange={e => setEstagiarioId(e.target.value)} style={inputStyle()}>
                <option value="">Não atribuído</option>
                {estagiarios.map(e => <option key={e.id} value={e.id}>{nomeDisplay(e)}</option>)}
              </select>
            </div>
          )}

          {/* DATA DA DEVOLUTIVA */}
          <div>
            <label style={labelStyle}>Data da devolutiva</label>
            {(isBeliane || isAdmin) ? (
              <>
                <input type="date" value={dataDevolutiva} onChange={e => setDataDevolutiva(e.target.value)} style={inputStyle()} />
                {devMatch && (
                  <div style={{ fontSize: 11, color: '#8B5CF6', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={11} />
                    ProDoctor: {devMatch.data}{devMatch.hora ? ` · ${devMatch.hora}` : ''} · {devMatch.profissional?.split(' ').slice(0, 2).join(' ')}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, padding: '8px 0', color: item.dataDevolutiva ? '#8B5CF6' : S.muted, fontStyle: item.dataDevolutiva ? 'normal' : 'italic' }}>
                {item.dataDevolutiva ? fmtDate(item.dataDevolutiva) : 'A agendar'}
              </div>
            )}
          </div>

          {/* Leitura para não-admin */}
          {!isBeliane && !isAdmin && (
            <>
              <div>
                <label style={labelStyle}>Profissional responsável</label>
                <div style={{ fontSize: 13, color: '#fff', padding: '8px 0' }}>{item.profissionalNome || item.profissional || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Estagiário</label>
                <div style={{ fontSize: 13, color: item.estagiarioNome ? '#fff' : S.muted, padding: '8px 0' }}>{item.estagiarioNome || 'Não atribuído'}</div>
              </div>
            </>
          )}

          {/* ASSUMIR CORREÇÃO — estagiário */}
          {podeAssumir && (
            <button onClick={assumir} disabled={assumindo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 9, border: 'none', background: assumindo ? 'rgba(59,130,246,0.4)' : '#3B82F6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: assumindo ? 'not-allowed' : 'pointer', marginTop: 4 }}>
              {assumindo
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Assumindo...</>
                : <><UserCheck size={14} /> Assumir correção</>}
            </button>
          )}

          {/* SALVAR — admin/secretaria */}
          {(isBeliane || isAdmin) && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 8 }}>
              <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: saving ? 'rgba(46,125,50,0.5)' : '#2E7D32', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                  : <><Check size={13} /> Salvar atribuições</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalCadastro({ estagiarios, devsProDoctor = [], onSave, onClose }) {
  const [form, setForm] = useState({
    pacienteNome:     '',
    pacienteCodigo:   '',
    profissionalId:   '',
    profissionalNome: '',
    estagiarioId:     '',
    convenio:         'prevent_senior',
    dataCorte:        new Date().toISOString().split('T')[0],
    dataDevolutiva:   '',
  })

  const [buscaPaciente,       setBuscaPaciente]       = useState('')
  const [resultadosPac,       setResultadosPac]        = useState([])
  const [buscandoPac,         setBuscandoPac]          = useState(false)
  const [pacienteSelecionado, setPacienteSelecionado]  = useState(false)
  const [profissionais,       setProfissionais]        = useState([])
  const [carregandoProfs,     setCarregandoProfs]      = useState(true)
  const [saving,              setSaving]               = useState(false)
  const [error,               setError]                = useState('')
  const buscaRef = useRef(null)

  useEffect(() => {
    listProfessionals()
      .then(lista => setProfissionais(lista.map(p => ({
        id: String(p.codigo ?? p.id ?? ''), nome: p.nome ?? p.nomeCivil ?? '',
      })).filter(p => p.id && p.nome)))
      .catch(() => setProfissionais([]))
      .finally(() => setCarregandoProfs(false))
  }, [])

  useEffect(() => {
    if (pacienteSelecionado) return
    if (buscaPaciente.length < 2) { setResultadosPac([]); return }
    const timer = setTimeout(async () => {
      setBuscandoPac(true)
      try { setResultadosPac((await searchPatients(buscaPaciente)).slice(0, 8)) }
      catch { setResultadosPac([]) }
      finally { setBuscandoPac(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [buscaPaciente, pacienteSelecionado])

  function selecionarPaciente(p) {
    setBuscaPaciente(p.full_name)

    const updates = { pacienteNome: p.full_name, pacienteCodigo: p.prodoctor_id }

    // Convenio vindo do objeto paciente ProDoctor
    if (p.convenio) updates.convenio = p.convenio

    // Busca devolutiva pelo primeiro nome do paciente
    const primeiroNome = p.full_name.split(' ')[0].toLowerCase()
    const devMatch = devsProDoctor.find(d =>
      d.paciente?.toLowerCase().includes(primeiroNome)
    )
    if (devMatch) {
      const parts = devMatch.data?.split('/')
      if (parts?.length === 3) {
        updates.dataDevolutiva = `${parts[2]}-${parts[1]}-${parts[0]}`
      }
      if (!updates.convenio && devMatch.convenio) {
        updates.convenio = devMatch.convenio
      }
    }

    setForm(f => ({ ...f, ...updates }))
    setResultadosPac([])
    setPacienteSelecionado(true)
  }

  function limparPaciente() {
    setBuscaPaciente('')
    setForm(f => ({ ...f, pacienteNome: '', pacienteCodigo: '' }))
    setPacienteSelecionado(false)
    setTimeout(() => buscaRef.current?.focus(), 50)
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function salvar() {
    if (!form.pacienteNome)     return setError('Selecione o paciente.')
    if (!form.profissionalNome) return setError('Selecione o profissional.')
    if (!form.dataCorte)        return setError('Informe a data de corte (5ª consulta).')
    setSaving(true); setError('')
    const estag = estagiarios.find(e => e.id === form.estagiarioId)
    await onSave({
      paciente:             form.pacienteNome,
      pacienteCodigo:       form.pacienteCodigo || null,
      profissionalId:       form.profissionalId,
      profissionalNome:     form.profissionalNome,
      profissional:         form.profissionalNome, // compat legado
      profissionalUid:      null,
      estagiarioId:         form.estagiarioId || null,
      estagiarioNome:       estag ? nomeDisplay(estag) : null,
      convenio:             form.convenio || 'prevent_senior',
      dataCorte:            new Date(form.dataCorte + 'T12:00:00'),
      dataDevolutiva:       form.dataDevolutiva ? new Date(form.dataDevolutiva + 'T12:00:00') : null,
      etapaAtual:           'aguardando_correcao',
      anamnese_preenchida:  false,
      entregueEmCorrecaoEm: null,
      assumidoEm:           null,
      finalizadoEm:         null,
      aprovadoEm:           null,
      criadoEm:             serverTimestamp(),
      origem:               'manual',
    })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(4,44,83,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#1A2744', borderRadius: 14, width: '100%', maxWidth: 540, border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#1A2744', zIndex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} color="#4CAF50" /> Novo prontuário para correção
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Paciente */}
          <div>
            <label style={labelStyle}>Paciente (ProDoctor)</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                <input
                  ref={buscaRef}
                  value={buscaPaciente}
                  onChange={e => { setBuscaPaciente(e.target.value); setPacienteSelecionado(false) }}
                  placeholder="Digite o nome do paciente..."
                  disabled={pacienteSelecionado}
                  style={inputStyle({ paddingLeft: 30, paddingRight: pacienteSelecionado ? 36 : 12, opacity: pacienteSelecionado ? 0.8 : 1 })}
                />
                {buscandoPac && <Loader2 size={13} style={{ position: 'absolute', right: 10, color: '#4CAF50', animation: 'spin 1s linear infinite' }} />}
                {pacienteSelecionado && (
                  <button onClick={limparPaciente} title="Limpar" style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {resultadosPac.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#1A2744', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  {resultadosPac.map(p => (
                    <button key={p.prodoctor_id} onClick={() => selecionarPaciente(p)} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 2 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.full_name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Cód: {p.prodoctor_id}{p.birth_date ? ` · Nasc: ${new Date(p.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {!buscandoPac && buscaPaciente.length >= 2 && resultadosPac.length === 0 && !pacienteSelecionado && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#1A2744', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, marginTop: 4, padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  Nenhum paciente encontrado
                </div>
              )}
            </div>
          </div>

          {/* Profissional */}
          <div>
            <label style={labelStyle}>Profissional responsável (ProDoctor)</label>
            {carregandoProfs ? (
              <div style={{ ...inputStyle(), display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Carregando...
              </div>
            ) : (
              <select value={form.profissionalId} onChange={e => {
                const prof = profissionais.find(p => p.id === e.target.value)
                set('profissionalId', e.target.value)
                set('profissionalNome', prof?.nome || '')
              }} style={inputStyle()}>
                <option value="">Selecione...</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            )}
          </div>

          {/* Convênio */}
          <div>
            <label style={labelStyle}>Convênio</label>
            <select value={form.convenio} onChange={e => set('convenio', e.target.value)} style={inputStyle()}>
              <option value="prevent_senior">Prevent Sênior</option>
            </select>
            {pacienteSelecionado && form.convenio && form.convenio !== 'prevent_senior' && (
              <div style={{ fontSize: 11, color: '#2DD4BF', marginTop: 5 }}>
                ProDoctor: {form.convenio}
              </div>
            )}
          </div>

          {/* Estagiário */}
          <div>
            <label style={labelStyle}>Estagiário <span style={{ color: 'rgba(255,255,255,0.4)' }}>(opcional)</span></label>
            <select value={form.estagiarioId} onChange={e => set('estagiarioId', e.target.value)} style={inputStyle()}>
              <option value="">Atribuir depois...</option>
              {estagiarios.map(e => <option key={e.id} value={e.id}>{nomeDisplay(e)}</option>)}
            </select>
          </div>

          {/* Datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Data corte (5ª consulta)</label>
              <input type="date" value={form.dataCorte} onChange={e => set('dataCorte', e.target.value)} style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle}>Devolutiva (6ª consulta) <span style={{ color: '#8B5CF6' }}>●</span></label>
              <input type="date" value={form.dataDevolutiva} onChange={e => set('dataDevolutiva', e.target.value)} style={inputStyle()} />
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={12} /> {error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={salvar} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: saving ? 'rgba(46,125,50,0.5)' : '#2E7D32', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Check size={13} /> Cadastrar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Correcoes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin      = user?.role === 'admin' || user?.role === 'supervisor'
  const isBeliane    = isAdmin || user?.role === 'secretaria'
  const isEstagiario = user?.role === 'estagiario'
  const isEntregador = user?.role === 'entregador'
  const isProfissional = user?.role === 'profissional' || user?.role === 'professional'

  function handleGerarLaudo(item) {
    navigate('/laudos', { state: { pacienteNome: item.paciente } })
  }

  const [itens,                setItens]                = useState([])
  const [estagiarios,          setEstagiarios]          = useState([])
  const [profissionaisFirestore, setProfissionaisFirestore] = useState([])
  const [loading,              setLoading]              = useState(true)
  const [syncing,              setSyncing]              = useState(false)
  const [syncResult,           setSyncResult]           = useState(null)
  const [modalAberto,          setModalAberto]          = useState(false)
  const [itemSelecionado,      setItemSelecionado]      = useState(null)
  const [filtroEtapa,          setFiltroEtapa]          = useState('todos')
  const [filtroBusca,          setFiltroBusca]          = useState('')
  const [filtroEstag,          setFiltroEstag]          = useState('todos')

  async function carregar() {
    setLoading(true)
    try {
      const base = collection(db, 'correcoes')
      let docs = []

      if ((isEstagiario || isEntregador) && !isAdmin && !isBeliane) {
        // Estagiário: seus atribuídos + não atribuídos
        const [s1, s2] = await Promise.all([
          getDocs(query(base, where('estagiarioId', '==', user.id))).catch(() => ({ docs: [] })),
          getDocs(query(base, where('estagiarioId', '==', null))).catch(() => ({ docs: [] })),
        ])
        const seen = new Set()
        docs = [...s1.docs, ...s2.docs].filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true })
      } else if (isProfissional && !isAdmin && !isBeliane) {
        // Profissional: apenas seus prontuários vinculados (concluídos ou não)
        const s1 = await getDocs(query(base, where('profissionalUid', '==', user.id))).catch(() => ({ docs: [] }))
        docs = s1.docs
      } else {
        const snap = await getDocs(query(base, orderBy('criadoEm', 'desc')))
        docs = snap.docs
      }
      setItens(docs.map(d => ({ id: d.id, ...d.data() })))

      // Usuários: só admin/beliane consegue listar todos
      if (isAdmin || isBeliane) {
        const profSnap = await getDocs(collection(db, 'users'))
        const todos = profSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setEstagiarios(todos.filter(u => u.role === 'estagiario' || u.role === 'entregador'))
        setProfissionaisFirestore(todos.filter(u => u.role === 'profissional' || u.role === 'professional'))
      }
    } catch (e) {
      console.error('[Correcoes]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [user])

  const [devsProDoctor, setDevsProDoctor] = useState([])
  useEffect(() => {
    if (isProfissional) return
    fetchDevolutivas()
      .then(setDevsProDoctor)
      .catch(() => {})
  }, [])

  async function salvarNova(dados) {
    await addDoc(collection(db, 'correcoes'), dados)
    setModalAberto(false)
    await carregar()
  }

  // Fluxo legado
  async function mudarStatus(id, novoStatus) {
    const extra = {}
    if (novoStatus === 'finalizado') extra.dataFinalizacao    = new Date()
    if (novoStatus === 'corrigindo') extra.dataInicioCorrecao = new Date()
    if (novoStatus === 'retirado')   extra.dataRetirada       = new Date()
    await updateDoc(doc(db, 'correcoes', id), { status: novoStatus, ...extra })
    setItens(prev => prev.map(i => i.id === id ? { ...i, status: novoStatus, ...extra } : i))
  }

  // Novo fluxo
  async function mudarEtapa(id, novaEtapa) {
    const extra = {}
    if (novaEtapa === 'em_correcao')          extra.assumidoEm           = new Date()
    if (novaEtapa === 'correcao_concluida')   extra.finalizadoEm         = new Date()
    if (novaEtapa === 'aguardando_aprovacao')  extra.finalizadoEm         = new Date()
    if (novaEtapa === 'pronto_devolutiva')     extra.aprovadoEm           = new Date()
    if (novaEtapa === 'aguardando_correcao')   extra.entregueEmCorrecaoEm = new Date()
    await updateDoc(doc(db, 'correcoes', id), { etapaAtual: novaEtapa, ...extra })
    setItens(prev => prev.map(i => i.id === id ? { ...i, etapaAtual: novaEtapa, ...extra } : i))
  }

  // Estagiário/entregador se auto-atribui pelo card (sem mudar etapa)
  async function assumirCorrecaoCard(id) {
    const updates = {
      estagiarioId:   user.id,
      estagiarioNome: user.full_name || user.nome || user.email || 'Estagiário',
      assumidoEm:     new Date(),
    }
    await updateDoc(doc(db, 'correcoes', id), updates)
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  // Atribuição rápida de estagiário pelo admin (dropdown no card)
  async function atribuirEstagiario(id, estagiarioId) {
    const estag = estagiarios.find(e => e.id === estagiarioId)
    const updates = {
      estagiarioId,
      estagiarioNome: estag ? nomeDisplay(estag) : null,
    }
    await updateDoc(doc(db, 'correcoes', id), updates)
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  // Exclusão (apenas fluxo legado, apenas admin)
  async function deletarCorrecao(id) {
    await deleteDoc(doc(db, 'correcoes', id))
    setItens(prev => prev.filter(i => i.id !== id))
  }

  // Auto-atribuição de profissional (botão "Assumir caso" no card)
  async function assumirCaso(id) {
    const updates = {
      profissionalUid:  user.id,
      profissionalNome: user.full_name || user.email || 'Profissional',
    }
    await updateDoc(doc(db, 'correcoes', id), updates)
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  // Estagiário assume correção pelo modal
  async function assumirCorrecao(id) {
    const updates = {
      estagiarioId:   user.id,
      estagiarioNome: user.full_name || user.email || 'Estagiário',
      etapaAtual:     'em_correcao',
      assumidoEm:     new Date(),
    }
    await updateDoc(doc(db, 'correcoes', id), updates)
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    setItemSelecionado(null)
  }

  // Salvar atribuições pelo modal de detalhe
  async function salvarAtribuicoes(id, dados) {
    await updateDoc(doc(db, 'correcoes', id), dados)
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...dados } : i))
    setItemSelecionado(null)
  }

  // Sincronização ProDoctor
  async function sincronizar() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await sincronizarFluxoPrevent()
      setSyncResult(res)
      await carregar()
    } catch (e) {
      setSyncResult({ erro: e.message })
    } finally {
      setSyncing(false)
    }
  }

  // Filtro de visibilidade por role
  const itensFiltrados = itens.filter(i => {
    // Visibilidade por role
    if ((isEstagiario || isEntregador) && !isBeliane && !isAdmin) {
      // vê seus cards atribuídos + cards sem dono (para poder se auto-atribuir)
      if (i.estagiarioId !== user?.id && i.estagiarioId != null) return false
    }
    if (isProfissional && !isBeliane && !isAdmin) {
      if (i.profissionalUid !== user?.id && i.profissionalUid != null) return false
    }
    // Filtro de etapa/status
    if (filtroEtapa !== 'todos' && getEfetivo(i) !== filtroEtapa) return false
    // Filtro por estagiário
    if (filtroEstag !== 'todos' && i.estagiarioId !== filtroEstag) return false
    // Busca textual
    if (filtroBusca) {
      const q = filtroBusca.toLowerCase()
      if (!i.paciente?.toLowerCase().includes(q) &&
          !i.profissionalNome?.toLowerCase().includes(q) &&
          !i.profissional?.toLowerCase().includes(q) &&
          !i.estagiarioNome?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Contadores
  const contadores = {}
  Object.keys(ALL_STATUS).forEach(k => {
    contadores[k] = itens.filter(i => getEfetivo(i) === k).length
  })
  const total = itens.length

  // Agrupamento para exibição
  const grupos = {}
  itensFiltrados.forEach(i => {
    const key = getEfetivo(i)
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(i)
  })
  const gruposOrdenados = Object.entries(grupos).sort((a, b) => {
    const ordA = ALL_STATUS[a[0]]?.ordem ?? 99
    const ordB = ALL_STATUS[b[0]]?.ordem ?? 99
    return ordA - ordB
  })

  // Chips de filtro — novo fluxo primeiro, depois legado
  const CHIPS_NOVO   = Object.entries(ETAPA)
  const CHIPS_LEGADO = Object.entries(STATUS_LEGADO)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#4CAF50" /> CONTROLE DE CORREÇÕES
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            Gestão do fluxo de avaliação neuropsicológica — Prevent Sênior
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={carregar} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
          </button>
          {isBeliane && (
            <button onClick={sincronizar} disabled={syncing} title="Buscar pacientes no ProDoctor que atingiram a 5ª consulta" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(13,148,136,0.4)', background: 'rgba(13,148,136,0.1)', color: '#2DD4BF', fontSize: 12, fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer' }}>
              <Zap size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Sincronizando...' : 'Sincronizar ProDoctor'}
            </button>
          )}
          {isBeliane && (
            <button onClick={() => setModalAberto(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2E7D32', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Novo prontuário
            </button>
          )}
        </div>
      </div>

      {/* Resultado da sincronização */}
      {syncResult && (
        <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: syncResult.erro ? 'rgba(239,68,68,0.1)' : 'rgba(76,175,80,0.1)', border: `1px solid ${syncResult.erro ? 'rgba(239,68,68,0.3)' : 'rgba(76,175,80,0.3)'}`, fontSize: 12, color: syncResult.erro ? '#EF4444' : '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}>
          {syncResult.erro
            ? <><AlertCircle size={13} /> Erro: {syncResult.erro}</>
            : <>
                <CheckCircle2 size={13} />
                <span>
                  Sincronização concluída — {syncResult.criados} criados, {syncResult.atualizados} atualizados, {syncResult.ignorados} ignorados
                  {syncResult.aviso && <span style={{ color: S.amber, marginLeft: 6 }}>({syncResult.aviso})</span>}
                </span>
                {syncResult.intervalo && (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 8 }}>
                    · {syncResult.intervalo} · {syncResult.totalAgendamentos} agendamentos · {syncResult.totalPrevent} pacientes Prevent
                  </span>
                )}
              </>
          }
          <button onClick={() => setSyncResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={13} /></button>
        </div>
      )}

      {/* Chips de filtro — novo fluxo */}
      {!loading && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Fluxo atual</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {CHIPS_NOVO.map(([key, cfg]) => {
              const Icon = cfg.icon
              const ativo = filtroEtapa === key
              return (
                <button key={key} onClick={() => setFiltroEtapa(ativo ? 'todos' : key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: ativo ? cfg.bg : '#1A2744', border: `1px solid ${ativo ? cfg.color : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
                  <Icon size={12} color={cfg.color} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{contadores[key] || 0}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cfg.label}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Chips legado (só se houver) */}
          {Object.values(STATUS_LEGADO).some((_,i) => contadores[Object.keys(STATUS_LEGADO)[i]] > 0) && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Fluxo legado</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {CHIPS_LEGADO.map(([key, cfg]) => {
                  if (!contadores[key]) return null
                  const Icon = cfg.icon
                  const ativo = filtroEtapa === key
                  return (
                    <button key={key} onClick={() => setFiltroEtapa(ativo ? 'todos' : key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: ativo ? cfg.bg : '#1A2744', border: `1px solid ${ativo ? cfg.color : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', opacity: 0.75 }}>
                      <Icon size={12} color={cfg.color} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{contadores[key]}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cfg.label}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Total */}
          <button onClick={() => setFiltroEtapa('todos')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: filtroEtapa === 'todos' ? 'rgba(255,255,255,0.08)' : '#1A2744', border: `1px solid ${filtroEtapa === 'todos' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', fontSize: 11, color: '#fff' }}>
            Total: <strong>{total}</strong>
          </button>
        </div>
      )}

      {/* Filtros de busca */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
          <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} placeholder="Buscar paciente, profissional ou estagiário..." style={inputStyle({ paddingLeft: 30 })} />
        </div>
        {(isBeliane || isAdmin) && (
          <select value={filtroEstag} onChange={e => setFiltroEstag(e.target.value)} style={inputStyle({ width: 'auto', minWidth: 180 })}>
            <option value="todos">Todos os estagiários</option>
            {estagiarios.map(e => <option key={e.id} value={e.id}>{nomeDisplay(e)}</option>)}
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ background: '#1A2744', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: 60, textAlign: 'center' }}>
          <Loader2 size={28} color="#4CAF50" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Carregando correções...</div>
        </div>
      )}

      {/* Lista vazia */}
      {!loading && itensFiltrados.length === 0 && (
        <div style={{ background: '#1A2744', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: 60, textAlign: 'center' }}>
          <ClipboardList size={40} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Nenhum prontuário encontrado</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            {isBeliane ? 'Cadastre manualmente ou sincronize com o ProDoctor.' : 'Nenhum prontuário atribuído a você no momento.'}
          </div>
        </div>
      )}

      {/* Lista agrupada */}
      {!loading && itensFiltrados.length > 0 && (
        <div>
          {gruposOrdenados.map(([statusKey, grupo]) => {
            const cfg = ALL_STATUS[statusKey]
            if (!cfg) return null
            const Icon = cfg.icon
            return (
              <div key={statusKey} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={12} /> {cfg.label}
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>· {grupo.length} prontuário{grupo.length !== 1 ? 's' : ''}</span>
                </div>
                {grupo.map(item => (
                  <CorrecaoCard
                    key={item.id}
                    item={item}
                    onChangeStatus={mudarStatus}
                    onMudarEtapa={mudarEtapa}
                    onAssumir={assumirCaso}
                    onAssumirEstag={assumirCorrecaoCard}
                    onDelete={deletarCorrecao}
                    onClickCard={() => setItemSelecionado(item)}
                    isEstagiario={isEstagiario}
                    isBeliane={isBeliane}
                    isAdmin={isAdmin}
                    isProfissional={isProfissional}
                    isEntregador={isEntregador}
                    onGerarLaudo={() => handleGerarLaudo(item)}
                    onAtribuirEstagiario={atribuirEstagiario}
                    estagiarios={estagiarios}
                    userId={user?.id}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ModalCadastro
          estagiarios={estagiarios}
          devsProDoctor={devsProDoctor}
          onSave={salvarNova}
          onClose={() => setModalAberto(false)}
        />
      )}

      {itemSelecionado && (
        <ModalDetalhe
          item={itemSelecionado}
          profissionaisFirestore={profissionaisFirestore}
          estagiarios={estagiarios}
          devsProDoctor={devsProDoctor}
          onSave={salvarAtribuicoes}
          onAssumir={assumirCorrecao}
          onClose={() => setItemSelecionado(null)}
          isEstagiario={isEstagiario}
          isAdmin={isAdmin}
          isBeliane={isBeliane}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus, select:focus { border-color: rgba(46,125,50,0.6) !important; }
        select option { background: #1A2744; color: #fff; }
      `}</style>
    </div>
  )
}
