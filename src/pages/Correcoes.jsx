import React, { useState, useEffect, useRef } from 'react'
import {
  collection, getDocs, addDoc, updateDoc, doc,
  query, orderBy, serverTimestamp, where
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { searchPatients, listProfessionals } from '@/services/prodoctorApi'
import {
  ClipboardList, Plus, X, Check, RefreshCw,
  User, Calendar, Clock, Search, Loader2,
  AlertCircle, CheckCircle2, FileText, UserCheck, RotateCcw
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
}

const STATUS = {
  aguardando: {
    label: 'Aguardando', color: '#EF4444',
    bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)',
    icon: AlertCircle, ordem: 1,
  },
  corrigindo: {
    label: 'Corrigindo', color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',
    icon: Clock, ordem: 2,
  },
  finalizado: {
    label: 'Finalizado', color: '#4CAF50',
    bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.3)',
    icon: CheckCircle2, ordem: 3,
  },
  retirado: {
    label: 'Retirado', color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)',
    icon: UserCheck, ordem: 4,
  },
}

function fmtDate(val) {
  if (!val) return '—'
  if (val?.toDate) return val.toDate().toLocaleDateString('pt-BR')
  if (val instanceof Date) return val.toLocaleDateString('pt-BR')
  return String(val)
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

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.aguardando
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

function CorrecaoCard({ item, onChangeStatus, isEstagiario, isBeliane }) {
  const cfg = STATUS[item.status] || STATUS.aguardando

  function renderAcoes() {
    const btns = []
    if (isEstagiario && item.status === 'aguardando' && item.estagiarioId === item._uid) {
      btns.push(
        <button key="iniciar" onClick={() => onChangeStatus(item.id, 'corrigindo')}
          style={btnStyle('#F59E0B', 'rgba(245,158,11,0.15)')}>
          <Clock size={11} /> Iniciar correção
        </button>
      )
    }
    if (isEstagiario && item.status === 'corrigindo' && item.estagiarioId === item._uid) {
      btns.push(
        <button key="finalizar" onClick={() => onChangeStatus(item.id, 'finalizado')}
          style={btnStyle('#4CAF50', 'rgba(76,175,80,0.15)')}>
          <Check size={11} /> Finalizar correção
        </button>
      )
    }
    if (isBeliane && item.status === 'finalizado') {
      btns.push(
        <button key="retirado" onClick={() => onChangeStatus(item.id, 'retirado')}
          style={btnStyle('#3B82F6', 'rgba(59,130,246,0.15)')}>
          <UserCheck size={11} /> Marcar como retirado
        </button>
      )
    }
    if (isBeliane && item.status === 'retirado') {
      btns.push(
        <button key="desfazer" onClick={() => onChangeStatus(item.id, 'finalizado')}
          style={btnStyle('rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)')}>
          <RotateCcw size={11} /> Desfazer retirada
        </button>
      )
    }
    return btns
  }

  return (
    <div style={{
      background: S.card, border: `1px solid ${cfg.border}`,
      borderRadius: 10, padding: '14px 16px', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 120 }}><StatusBadge status={item.status} /></div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.paciente || '—'}</div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>Prof: {item.profissional || '—'}</div>
      </div>
      <div style={{ minWidth: 120 }}>
        <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Estagiário</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: item.estagiarioNome ? '#fff' : S.muted }}>
          {item.estagiarioNome || 'Não atribuído'}
        </div>
      </div>
      <div style={{ minWidth: 200, display: 'flex', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Entregue em</div>
          <div style={{ fontSize: 12, color: '#fff' }}>{fmtDate(item.dataEntrega)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Devolutiva</div>
          <div style={{ fontSize: 12, color: '#8B5CF6' }}>{fmtDate(item.dataDevolutiva)}</div>
        </div>
        {item.dataFinalizacao && (
          <div>
            <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Corrigido em</div>
            <div style={{ fontSize: 12, color: '#4CAF50' }}>{fmtDate(item.dataFinalizacao)}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{renderAcoes()}</div>
    </div>
  )
}

function ModalCadastro({ estagiarios, onSave, onClose }) {
  const [form, setForm] = useState({
    pacienteNome: '',
    pacienteCodigo: '',
    profissionalId: '',
    profissionalNome: '',
    estagiarioId: '',
    dataEntrega: new Date().toISOString().split('T')[0],
    dataDevolutiva: '',
  })

  const [buscaPaciente,       setBuscaPaciente]       = useState('')
  const [resultadosPac,       setResultadosPac]        = useState([])
  const [buscandoPac,         setBuscandoPac]          = useState(false)
  const [pacienteSelecionado, setPacienteSelecionado]  = useState(false)

  const [profissionais,     setProfissionais]    = useState([])
  const [carregandoProfs,   setCarregandoProfs]  = useState(true)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const buscaRef = useRef(null)

  useEffect(() => {
    listProfessionals()
      .then(lista => {
        setProfissionais(lista.map(p => ({
          id:   String(p.codigo ?? p.id ?? ''),
          nome: p.nome ?? p.nomeCivil ?? '',
        })).filter(p => p.id && p.nome))
      })
      .catch(() => setProfissionais([]))
      .finally(() => setCarregandoProfs(false))
  }, [])

  useEffect(() => {
    if (pacienteSelecionado) return
    if (buscaPaciente.length < 2) { setResultadosPac([]); return }
    const timer = setTimeout(async () => {
      setBuscandoPac(true)
      try {
        const res = await searchPatients(buscaPaciente)
        setResultadosPac(res.slice(0, 8))
      } catch {
        setResultadosPac([])
      } finally {
        setBuscandoPac(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [buscaPaciente, pacienteSelecionado])

  function selecionarPaciente(p) {
    setBuscaPaciente(p.full_name)
    setForm(f => ({ ...f, pacienteNome: p.full_name, pacienteCodigo: p.prodoctor_id }))
    setResultadosPac([])
    setPacienteSelecionado(true)
  }

  function limparPaciente() {
    setBuscaPaciente('')
    setForm(f => ({ ...f, pacienteNome: '', pacienteCodigo: '' }))
    setPacienteSelecionado(false)
    setResultadosPac([])
    setTimeout(() => buscaRef.current?.focus(), 50)
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function salvar() {
    if (!form.pacienteNome)     return setError('Selecione o paciente.')
    if (!form.profissionalNome) return setError('Selecione o profissional.')
    if (!form.dataEntrega)      return setError('Informe a data de entrega.')
    setSaving(true); setError('')
    const estag = estagiarios.find(e => e.id === form.estagiarioId)
    await onSave({
      paciente:       form.pacienteNome,
      pacienteCodigo: form.pacienteCodigo,
      profissionalId: form.profissionalId,
      profissional:   form.profissionalNome,
      estagiarioId:   form.estagiarioId || null,
      estagiarioNome: estag?.nome || estag?.name || estag?.full_name || null,
      dataEntrega:    new Date(form.dataEntrega + 'T12:00:00'),
      dataDevolutiva: form.dataDevolutiva ? new Date(form.dataDevolutiva + 'T12:00:00') : null,
      status:         'aguardando',
      criadoEm:       serverTimestamp(),
    })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(4,44,83,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ background: '#1A2744', borderRadius: 14, width: '100%', maxWidth: 520, border: '1px solid rgba(255,255,255,0.08)' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} color="#4CAF50" /> Novo prontuário para correção
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Busca de paciente */}
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
                {buscandoPac && (
                  <Loader2 size={13} style={{ position: 'absolute', right: 10, color: '#4CAF50', animation: 'spin 1s linear infinite' }} />
                )}
                {pacienteSelecionado && (
                  <button onClick={limparPaciente} title="Limpar" style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {resultadosPac.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#1A2744', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {resultadosPac.map(p => (
                    <button key={p.prodoctor_id} onClick={() => selecionarPaciente(p)} style={{
                      width: '100%', textAlign: 'left', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.full_name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        Cód: {p.prodoctor_id}
                        {p.birth_date ? ` · Nasc: ${new Date(p.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!buscandoPac && buscaPaciente.length >= 2 && resultadosPac.length === 0 && !pacienteSelecionado && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#1A2744', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, marginTop: 4, padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  Nenhum paciente encontrado no ProDoctor
                </div>
              )}
            </div>
          </div>

          {/* Profissional do ProDoctor */}
          <div>
            <label style={labelStyle}>Profissional que aplicou (ProDoctor)</label>
            {carregandoProfs ? (
              <div style={{ ...inputStyle(), display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Carregando profissionais...
              </div>
            ) : (
              <select
                value={form.profissionalId}
                onChange={e => {
                  const prof = profissionais.find(p => p.id === e.target.value)
                  set('profissionalId', e.target.value)
                  set('profissionalNome', prof?.nome || '')
                }}
                style={inputStyle()}
              >
                <option value="">Selecione...</option>
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            )}
          </div>

          {/* Estagiário (do Firebase) */}
          <div>
            <label style={labelStyle}>Estagiário responsável <span style={{ color: 'rgba(255,255,255,0.4)' }}>(opcional)</span></label>
            <select value={form.estagiarioId} onChange={e => set('estagiarioId', e.target.value)} style={inputStyle()}>
              <option value="">Atribuir depois...</option>
              {estagiarios.map(e => <option key={e.id} value={e.id}>{e.nome || e.name || e.full_name}</option>)}
            </select>
          </div>

          {/* Datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Data de entrega</label>
              <input type="date" value={form.dataEntrega} onChange={e => set('dataEntrega', e.target.value)} style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle}>Data da devolutiva <span style={{ color: '#8B5CF6' }}>●</span></label>
              <input type="date" value={form.dataDevolutiva} onChange={e => set('dataDevolutiva', e.target.value)} style={inputStyle()} />
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={12} /> {error}
            </div>
          )}

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
  const isAdmin     = user?.role === 'admin' || user?.role === 'supervisor'
  const isBeliane   = isAdmin || user?.role === 'secretaria'
  const isEstagiario = user?.role === 'estagiario'

  const [itens,         setItens]         = useState([])
  const [profissionais, setProfissionais] = useState([])
  const [estagiarios,   setEstagiarios]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modalAberto,   setModalAberto]   = useState(false)
  const [filtroStatus,  setFiltroStatus]  = useState('todos')
  const [filtroBusca,   setFiltroBusca]   = useState('')
  const [filtroEstag,   setFiltroEstag]   = useState('todos')

  async function carregar() {
    setLoading(true)
    try {
      const q    = query(collection(db, 'correcoes'), orderBy('dataEntrega', 'desc'))
      const snap = await getDocs(q)
      setItens(snap.docs.map(d => ({ id: d.id, _uid: user?.uid, ...d.data() })))

      const profSnap = await getDocs(collection(db, 'users'))
      const todos = profSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProfissionais(todos.filter(u => ['profissional','supervisor','admin'].includes(u.role)))
      setEstagiarios(todos.filter(u => u.role === 'estagiario'))
    } catch (e) {
      console.error('[Correcoes]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [user])

  async function salvarNova(dados) {
    await addDoc(collection(db, 'correcoes'), dados)
    setModalAberto(false)
    await carregar()
  }

  async function mudarStatus(id, novoStatus) {
    const extra = {}
    if (novoStatus === 'finalizado') extra.dataFinalizacao = new Date()
    if (novoStatus === 'corrigindo') extra.dataInicioCorrecao = new Date()
    if (novoStatus === 'retirado')   extra.dataRetirada = new Date()
    await updateDoc(doc(db, 'correcoes', id), { status: novoStatus, ...extra })
    setItens(prev => prev.map(i => i.id === id ? { ...i, status: novoStatus, ...extra } : i))
  }

  const itensFiltrados = itens.filter(i => {
    if (filtroStatus !== 'todos' && i.status !== filtroStatus) return false
    if (filtroEstag  !== 'todos' && i.estagiarioId !== filtroEstag) return false
    if (filtroBusca) {
      const q = filtroBusca.toLowerCase()
      if (!i.paciente?.toLowerCase().includes(q) &&
          !i.profissional?.toLowerCase().includes(q) &&
          !i.estagiarioNome?.toLowerCase().includes(q)) return false
    }
    if (isEstagiario && !isBeliane && !isAdmin) return i.estagiarioId === user?.uid
    return true
  })

  const contadores = {
    aguardando: itens.filter(i => i.status === 'aguardando').length,
    corrigindo: itens.filter(i => i.status === 'corrigindo').length,
    finalizado: itens.filter(i => i.status === 'finalizado').length,
    retirado:   itens.filter(i => i.status === 'retirado').length,
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#4CAF50" /> CONTROLE DE CORREÇÕES
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            Gestão do fluxo de prontuários entre profissionais e estagiários
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={carregar} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
          </button>
          {(isBeliane || isAdmin) && (
            <button onClick={() => setModalAberto(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2E7D32', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Novo prontuário
            </button>
          )}
        </div>
      </div>

      {/* Contadores / filtro rápido */}
      {!loading && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(STATUS).map(([key, cfg]) => {
            const Icon = cfg.icon
            const ativo = filtroStatus === key
            return (
              <button key={key} onClick={() => setFiltroStatus(ativo ? 'todos' : key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: ativo ? cfg.bg : '#1A2744', border: `1px solid ${ativo ? cfg.color : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
                <Icon size={14} color={cfg.color} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{contadores[key]}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cfg.label}</div>
                </div>
              </button>
            )
          })}
          <button onClick={() => setFiltroStatus('todos')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: filtroStatus === 'todos' ? 'rgba(255,255,255,0.08)' : '#1A2744', border: `1px solid ${filtroStatus === 'todos' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{itens.length}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
            </div>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
          <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} placeholder="Buscar paciente, profissional ou estagiário..." style={inputStyle({ paddingLeft: 30 })} />
        </div>
        {(isBeliane || isAdmin) && (
          <select value={filtroEstag} onChange={e => setFiltroEstag(e.target.value)} style={inputStyle({ width: 'auto', minWidth: 180 })}>
            <option value="todos">Todos os estagiários</option>
            {estagiarios.map(e => <option key={e.id} value={e.id}>{e.nome || e.name || e.full_name}</option>)}
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
            {isBeliane ? 'Clique em "Novo prontuário" para cadastrar.' : 'Nenhum prontuário atribuído a você no momento.'}
          </div>
        </div>
      )}

      {/* Lista agrupada por status */}
      {!loading && itensFiltrados.length > 0 && (
        <div>
          {Object.entries(STATUS).sort((a,b) => a[1].ordem - b[1].ordem).map(([statusKey, cfg]) => {
            const grupo = itensFiltrados.filter(i => i.status === statusKey)
            if (grupo.length === 0) return null
            const Icon = cfg.icon
            return (
              <div key={statusKey} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={12} /> {cfg.label}
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>· {grupo.length} prontuário{grupo.length !== 1 ? 's' : ''}</span>
                </div>
                {grupo.map(item => (
                  <CorrecaoCard key={item.id} item={item} onChangeStatus={mudarStatus} isEstagiario={isEstagiario} isBeliane={isBeliane || isAdmin} />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ModalCadastro estagiarios={estagiarios} onSave={salvarNova} onClose={() => setModalAberto(false)} />
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
