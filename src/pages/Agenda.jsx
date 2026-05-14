import React, { useState, useEffect, useCallback } from 'react'
import { getAgenda, ProDoctorError } from '@/services/prodoctorApi'
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw,
  Clock, User, Stethoscope, AlertCircle, Loader2, Info,
} from 'lucide-react'

const S = {
  card:   '#1A2744',
  cardG:  '#1A3D2B',
  green:  '#2E7D32',
  greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.45)',
  amber:  '#F59E0B',
  red:    '#EF4444',
  blue:   '#60A5FA',
}

const STATUS_COLOR = {
  confirmado: S.greenL,
  agendado:   S.blue,
  cancelado:  S.red,
  realizado:  'rgba(255,255,255,0.3)',
  faltou:     S.amber,
}

function statusColor(s = '') {
  const k = s.toLowerCase().trim()
  return STATUS_COLOR[k] ?? S.muted
}

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().substring(0, 10)
}

function todayIso() {
  return new Date().toISOString().substring(0, 10)
}

export default function Agenda() {
  const [date, setDate]       = useState(todayIso)
  const [items, setItems]     = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [rawDebug, setRawDebug] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  const load = useCallback(async (d) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAgenda({ dataInicial: d, dataFinal: d })
      setItems(result.items)
      setTotal(result.total)
      setRawDebug(result._raw)
      if (result.items.length === 0 && result._raw) setShowDebug(true)
    } catch (e) {
      setError(e instanceof ProDoctorError
        ? `ProDoctor ${e.status}: ${e.body}`
        : e.message)
      setRawDebug(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(date) }, [date, load])

  const nav = (n) => setDate(d => addDays(d, n))

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>AGENDA</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Consultas do ProDoctor</p>
      </div>

      {/* Controles de data */}
      <div style={{
        background: S.card, borderRadius: 12, border: `1px solid ${S.border}`,
        padding: '12px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <button onClick={() => nav(-1)} style={btnSt}>
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} color={S.greenL} />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`,
              color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none',
            }}
          />
          <span style={{ fontSize: 13, color: S.muted }}>{fmtDate(date)}</span>
        </div>

        <button onClick={() => nav(1)} style={btnSt}>
          <ChevronRight size={16} />
        </button>

        <button onClick={() => setDate(todayIso())} style={{
          ...btnSt, fontSize: 11, padding: '6px 14px', borderRadius: 20,
          background: date === todayIso() ? S.green : 'rgba(255,255,255,0.06)',
          color: date === todayIso() ? '#fff' : S.muted,
        }}>
          Hoje
        </button>

        <button onClick={() => load(date)} disabled={loading} style={{ ...btnSt, marginLeft: 'auto' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertCircle size={16} color={S.red} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.red, marginBottom: 2 }}>Erro ao carregar agenda</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={28} color={S.greenL} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 12, color: S.muted }}>Carregando agenda...</p>
        </div>
      )}

      {/* Lista */}
      {!loading && !error && (
        <>
          <div style={{
            fontSize: 11, color: S.muted, fontWeight: 700,
            letterSpacing: '0.06em', marginBottom: 10,
          }}>
            {total > 0
              ? `${items.length} DE ${total} CONSULTA${total !== 1 ? 'S' : ''}`
              : items.length > 0
              ? `${items.length} CONSULTA${items.length !== 1 ? 'S' : ''}`
              : 'NENHUMA CONSULTA'}
          </div>

          {items.length === 0 && !showDebug && (
            <div style={{
              background: S.card, borderRadius: 12, border: `1px solid ${S.border}`,
              padding: 48, textAlign: 'center', color: S.muted,
            }}>
              <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.15 }} />
              <p style={{ fontSize: 13 }}>Nenhuma consulta para {fmtDate(date)}.</p>
            </div>
          )}

          {items.map((item, i) => (
            <div key={item.codigo || i} style={{
              background: S.card, borderRadius: 10,
              border: `1px solid ${S.border}`,
              padding: '12px 16px', marginBottom: 8,
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              {/* Hora */}
              <div style={{
                minWidth: 52, textAlign: 'center',
                background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                padding: '6px 4px', flexShrink: 0,
              }}>
                <Clock size={11} color={S.greenL} style={{ margin: '0 auto 2px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {item.hora || '—'}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {item.paciente || 'Paciente não informado'}
                  </span>
                  {item.status && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: `${statusColor(item.status)}22`,
                      color: statusColor(item.status),
                      border: `1px solid ${statusColor(item.status)}44`,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {item.status}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                  {item.profissional && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Stethoscope size={10} color={S.muted} />
                      <span style={{ fontSize: 11, color: S.muted }}>{item.profissional}</span>
                    </div>
                  )}
                  {item.tipo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={10} color={S.muted} />
                      <span style={{ fontSize: 11, color: S.muted }}>{item.tipo}</span>
                    </div>
                  )}
                </div>

                {item.obs && (
                  <div style={{ fontSize: 11, color: S.muted, marginTop: 4, fontStyle: 'italic' }}>
                    {item.obs}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Debug — aparece quando retorno vier vazio ou com estrutura inesperada */}
          {rawDebug && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowDebug(d => !d)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${S.border}`,
                  borderRadius: 8, padding: '6px 12px', color: S.muted, fontSize: 11,
                  cursor: 'pointer', width: '100%',
                }}
              >
                <Info size={12} />
                {showDebug ? 'Ocultar' : 'Ver'} resposta bruta da API ProDoctor
              </button>
              {showDebug && (
                <pre style={{
                  marginTop: 8, padding: 12, borderRadius: 8,
                  background: 'rgba(0,0,0,0.4)', border: `1px solid ${S.border}`,
                  fontSize: 10, color: 'rgba(255,255,255,0.5)',
                  overflowX: 'auto', maxHeight: 400, overflowY: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {JSON.stringify(rawDebug, null, 2)}
                </pre>
              )}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const btnSt = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 8, border: `1px solid rgba(255,255,255,0.1)`,
  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer', flexShrink: 0,
}
