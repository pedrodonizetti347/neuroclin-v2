import React, { useState } from 'react'
import { listProfessionals, getProfessional } from '@/services/prodoctorApi'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { CloudDownload, Loader2, AlertCircle, CheckCircle2, Users } from 'lucide-react'

export default function Settings() {
  const [professionals, setProfessionals] = useState([])
  const [loadingList,   setLoadingList]   = useState(false)
  const [error,         setError]         = useState('')
  const [selected,      setSelected]      = useState(new Set())
  const [importing,     setImporting]     = useState(false)
  const [importLog,     setImportLog]     = useState([])
  const [done,          setDone]          = useState(false)

  const fetchList = async () => {
    setLoadingList(true); setError(''); setProfessionals([])
    setSelected(new Set()); setImportLog([]); setDone(false)
    try {
      const list = await listProfessionals()
      if (list.length === 0) { setError('Nenhum profissional encontrado no ProDoctor.'); return }
      setProfessionals(list)
      setSelected(new Set(list.map(u => String(u.codigo))))
    } catch (e) {
      setError(`Erro ProDoctor (${e.status || 'rede'}): ${e.message}`)
    } finally {
      setLoadingList(false)
    }
  }

  const toggleAll = () => {
    setSelected(prev =>
      prev.size === professionals.length
        ? new Set()
        : new Set(professionals.map(u => String(u.codigo)))
    )
  }

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true); setImportLog([]); setDone(false)
    for (const id of [...selected]) {
      try {
        const detail = await getProfessional(id)
        await setDoc(doc(db, 'professionals', id), {
          ...detail,
          imported_at: serverTimestamp(),
        }, { merge: true })
        setImportLog(prev => [...prev, { id, name: detail.name, ok: true }])
      } catch (e) {
        const nome = professionals.find(u => String(u.codigo) === id)?.nome || id
        setImportLog(prev => [...prev, { id, name: nome, ok: false, err: e.message }])
      }
    }
    setImporting(false); setDone(true)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#042C53', margin: 0 }}>Configurações</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Gerenciamento do sistema</p>
      </div>

      {/* Card — Importar Profissionais */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF0', overflow: 'hidden', marginBottom: 20 }}>

        {/* Card header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F0F2F5', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(46,125,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={19} color="#2E7D32" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#042C53' }}>Importar Profissionais do ProDoctor</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Sincronize os profissionais cadastrados no ProDoctor com o NeuroClin
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: 24 }}>
          <button onClick={fetchList} disabled={loadingList || importing} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: (loadingList || importing) ? 'not-allowed' : 'pointer',
            opacity: (loadingList || importing) ? 0.7 : 1, marginBottom: 16,
          }}>
            {loadingList
              ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Buscando...</>
              : <><CloudDownload size={15} /> Buscar profissionais no ProDoctor</>
            }
          </button>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#DC2626', padding: '10px 14px', background: '#FEF2F2', borderRadius: 9, marginBottom: 16 }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {professionals.length > 0 && (
            <>
              {/* Contagem + toggle all */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {professionals.length} profissional(is) encontrado(s) — <strong style={{ color: '#042C53' }}>{selected.size} selecionado(s)</strong>
                </span>
                <button onClick={toggleAll} style={{ fontSize: 12, color: '#2E7D32', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {selected.size === professionals.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              {/* Lista */}
              <div style={{ border: '1px solid #E8ECF0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                {professionals.map((u, i) => {
                  const id  = String(u.codigo)
                  const chk = selected.has(id)
                  return (
                    <div key={id} onClick={() => toggle(id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                      borderBottom: i < professionals.length - 1 ? '1px solid #F5F6F8' : 'none',
                      cursor: 'pointer',
                      background: chk ? 'rgba(46,125,50,0.04)' : '#fff',
                      transition: 'background 0.1s',
                    }}>
                      <input
                        type="checkbox" checked={chk} readOnly
                        onClick={e => { e.stopPropagation(); toggle(id) }}
                        style={{ width: 15, height: 15, accentColor: '#2E7D32', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e' }}>{u.nome}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>Código ProDoctor: {u.codigo}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Botão importar */}
              <button onClick={handleImport} disabled={importing || selected.size === 0} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                background: selected.size === 0 ? '#CBD5E0' : '#185FA5',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                cursor: (importing || selected.size === 0) ? 'not-allowed' : 'pointer',
                opacity: importing ? 0.7 : 1,
              }}>
                {importing
                  ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Importando...</>
                  : <><CloudDownload size={15} /> Importar {selected.size} profissional(is)</>
                }
              </button>
            </>
          )}

          {/* Log de importação */}
          {importLog.length > 0 && (
            <div style={{ marginTop: 20, padding: '16px 18px', background: '#F8FAFB', borderRadius: 10, border: '1px solid #E8ECF0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#042C53', marginBottom: 10, letterSpacing: '0.04em' }}>
                {done ? '✓ IMPORTAÇÃO CONCLUÍDA' : 'IMPORTANDO...'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {importLog.map(entry => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                    {entry.ok
                      ? <CheckCircle2 size={14} color="#2E7D32" style={{ flexShrink: 0, marginTop: 1 }} />
                      : <AlertCircle  size={14} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    }
                    <span style={{ color: entry.ok ? '#1a1a2e' : '#DC2626', fontWeight: 500 }}>{entry.name}</span>
                    {!entry.ok && <span style={{ color: '#999' }}>— {entry.err}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
