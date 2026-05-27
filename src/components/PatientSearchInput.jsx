import React, { useState, useEffect, useRef } from 'react'

const T = {
  bg:          'rgba(255,255,255,0.05)',
  bgDropdown:  '#1A2744',
  border:      'rgba(255,255,255,0.10)',
  borderFocus: 'rgba(255,255,255,0.28)',
  color:       '#fff',
  muted:       'rgba(255,255,255,0.45)',
  hover:       'rgba(255,255,255,0.08)',
  selected:    'rgba(76,175,80,0.12)',
  green:       '#4CAF50',
}

export default function PatientSearchInput({ patients = [], value, onChange, style, placeholder }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef(null)
  const inputRef          = useRef(null)

  const selected = patients.find(p => p.id === value)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const handleKeyDown = (e) => { if (e.key === 'Escape') setOpen(false) }

  const filtered = (() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? patients.filter(p => p.full_name?.toLowerCase().includes(q))
      : patients
    return list.slice(0, 10)
  })()

  const handleSelect = (p) => {
    onChange(p.id)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  const toggleOpen = () => {
    setOpen(o => !o)
    setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }} onKeyDown={handleKeyDown}>
      {/* trigger */}
      <div
        onClick={toggleOpen}
        style={{
          background: T.bg,
          border: `1px solid ${open ? T.borderFocus : T.border}`,
          color: selected ? T.color : T.muted,
          borderRadius: 6, padding: '6px 36px 6px 10px',
          fontSize: 13, width: '100%', cursor: 'pointer',
          userSelect: 'none', boxSizing: 'border-box',
          minHeight: 32, display: 'flex', alignItems: 'center',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.full_name : (placeholder || '— Selecionar paciente —')}
        </span>
        {selected && (
          <span
            onClick={handleClear}
            title="Limpar"
            style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)', color: T.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
          >×</span>
        )}
        <span style={{
          position: 'absolute', right: 10, top: '50%',
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          transition: 'transform 0.15s', color: T.muted, fontSize: 9, pointerEvents: 'none',
        }}>▼</span>
      </div>

      {/* dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, zIndex: 2000,
          background: T.bgDropdown,
          border: `1px solid ${T.borderFocus}`,
          borderRadius: 6,
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '7px 8px', borderBottom: `1px solid ${T.border}` }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Buscar por nome..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${T.border}`, borderRadius: 4,
                color: T.color, padding: '5px 8px', fontSize: 12,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12, color: T.muted, textAlign: 'center' }}>
                Nenhum paciente encontrado
              </div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  style={{
                    padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                    color: p.id === value ? T.green : T.color,
                    background: p.id === value ? T.selected : 'transparent',
                    fontWeight: p.id === value ? 600 : 400,
                    borderBottom: `1px solid ${T.border}`,
                  }}
                  onMouseEnter={e => { if (p.id !== value) e.currentTarget.style.background = T.hover }}
                  onMouseLeave={e => { if (p.id !== value) e.currentTarget.style.background = 'transparent' }}
                >
                  {p.full_name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
