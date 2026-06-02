import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { CalendarClock, RefreshCw, AlertTriangle, Loader2, Search } from 'lucide-react'
import { fetchDevolutivas } from '@/services/devolutivasProxy'

const S = {
  card:   '#1A2744',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  red:    '#EF4444',
}

function formatDateBR(dateStr) {
  if (!dateStr) return '—'
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) return dateStr.substring(0, 10)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }
  return dateStr
}

function parseDate(dateStr) {
  if (!dateStr) return null
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/')
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  return new Date(dateStr)
}

export default function Devolutivas() {
  const { user } = useAuth()
  const [items,          setItems]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [lastUpdated,    setLastUpdated]    = useState(null)
  const [filtroConvenio, setFiltroConvenio] = useState('')
  const [busca,          setBusca]          = useState('')

  const canView = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'estagiario'
  if (!canView) return null

  async function load() {
    setLoading(true)
    setError('')
    try {
      const list = await fetchDevolutivas()
      setItems(list)
      setLastUpdated(new Date())
    } catch (e) {
      setError('Erro ao buscar devolutivas: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Convênios únicos
  const convenios = [...new Set(
    items.map(i => i.convenio || i.plano || '—')
  )].sort()

  // Filtragem e ordenação
  const filtered = filtroConvenio
    ? items.filter(i => (i.convenio || i.plano || '—') === filtroConvenio)
    : items
  const sorted = [...filtered].sort((a, b) => {
    const da = parseDate(a.data || a.dataRetorno || a.date)
    const db = parseDate(b.data || b.dataRetorno || b.date)
    if (!da || !db) return 0
    return da - db
  })

  const finalList = busca
    ? sorted.filter(i =>
        (i.paciente || i.nomePaciente || i.patient || '')
          .toLowerCase().includes(busca.toLowerCase())
      )
    : sorted

  // Totais por convênio para os cards
  const byConvenio = {}
  items.forEach(i => {
    const c = i.convenio || i.plano || '—'
    byConvenio[c] = (byConvenio[c] || 0) + 1
  })
  const convenioCards = Object.entries(byConvenio).sort((a, b) => b[1] - a[1])

  const btnFiltro = (label, ativo, onClick) => (
    <button key={label} onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      cursor: 'pointer', border: `1px solid ${ativo ? 'rgba(46,125,50,0.5)' : S.border}`,
      background: ativo ? 'rgba(46,125,50,0.2)' : 'transparent',
      color: ativo ? S.greenL : S.muted,
    }}>{label}</button>
  )

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={18} color={S.greenL} /> DEVOLUTIVAS / RETORNOS
          </h1>
          <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>
            Retornos de todos os convênios · próximos 90 dias
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
          borderRadius: 8, border: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.05)',
          color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* Cards por convênio */}
      {!loading && convenioCards.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {convenioCards.map(([conv, total]) => (
            <div key={conv} onClick={() => setFiltroConvenio(filtroConvenio === conv ? '' : conv)} style={{
              background: filtroConvenio === conv ? 'rgba(46,125,50,0.2)' : S.card,
              border: `1px solid ${filtroConvenio === conv ? 'rgba(46,125,50,0.5)' : S.border}`,
              borderRadius: 10, padding: '12px 20px', cursor: 'pointer', minWidth: 130, textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: filtroConvenio === conv ? S.greenL : '#fff' }}>{total}</div>
              <div style={{ fontSize: 11, color: S.muted, marginTop: 3, fontWeight: 600 }}>{conv}</div>
            </div>
          ))}
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 20px', minWidth: 100, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{items.length}</div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 3, fontWeight: 600 }}>TOTAL</div>
          </div>
        </div>
      )}

      {/* Filtro por convênio */}
      {!loading && convenios.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: S.muted, fontWeight: 700 }}>FILTRAR:</span>
          {btnFiltro('Todos', !filtroConvenio, () => setFiltroConvenio(''))}
          {convenios.map(c => btnFiltro(c, filtroConvenio === c, () => setFiltroConvenio(filtroConvenio === c ? '' : c)))}
          {lastUpdated && (
            <span style={{ fontSize: 11, color: S.muted, marginLeft: 'auto' }}>
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* Busca por nome */}
      {!loading && items.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={13} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome do paciente..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: S.card, border: `1px solid ${S.border}`,
              borderRadius: 8, color: '#fff',
              padding: '9px 12px 9px 34px', fontSize: 13, outline: 'none',
            }}
          />
          {busca && (
            <button onClick={() => setBusca('')} style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', fontSize: 16, lineHeight: 1,
            }}>×</button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 60, textAlign: 'center' }}>
          <Loader2 size={28} color={S.greenL} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, color: S.muted }}>Buscando retornos/devolutivas nos próximos 90 dias...</div>
        </div>
      )}

      {/* Erro */}
      {!loading && error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '16px 20px', color: S.red, fontSize: 13 }}>
          <AlertTriangle size={14} style={{ display: 'inline', marginRight: 8 }} />{error}
        </div>
      )}

      {/* Sem resultados */}
      {!loading && !error && finalList.length === 0 && (
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 60, textAlign: 'center' }}>
          <CalendarClock size={40} color={S.muted} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Nenhuma devolutiva encontrada</div>
          <div style={{ fontSize: 12, color: S.muted }}>
            Nenhum retorno nos próximos 90 dias
            {busca ? ` para "${busca}"` : filtroConvenio ? ` no convênio "${filtroConvenio}"` : ''}.
          </div>
        </div>
      )}

      {/* Lista */}
      {!loading && finalList.length > 0 && (
        <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 160px', padding: '10px 20px', borderBottom: `1px solid ${S.border}`, background: 'rgba(255,255,255,0.03)' }}>
            {['Data', 'Paciente', 'Profissional', 'Convênio'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: S.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {finalList.map((item, i) => {
            const data     = item.data     || item.dataRetorno || item.date || '—'
            const paciente = item.paciente || item.nomePaciente || item.patient || '—'
            const prof     = item.profissional || item.nomeProfissional || item.professional || '—'
            const convenio = item.convenio || item.plano || '—'
            const hora     = item.hora     || item.horario || ''
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 1fr 160px',
                padding: '12px 20px', alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                borderBottom: i < sorted.length - 1 ? `1px solid ${S.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{formatDateBR(data)}</div>
                  {hora && <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{hora}</div>}
                </div>
                <div style={{ fontSize: 13, color: '#fff', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{paciente}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prof}</div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>
                    {convenio}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
