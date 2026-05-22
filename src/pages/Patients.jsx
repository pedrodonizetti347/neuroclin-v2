import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePatients } from '@/hooks/usePatients'
import { useAuth } from '@/lib/AuthContext'
import { searchPatients, clearPatientsCache, getCachedCount } from '@/services/prodoctorApi'
import { Plus, Search, User, Phone, Mail, Pencil, Trash2, X, Loader2, CloudDownload, CheckCircle2, RefreshCw, AlertTriangle, Lock } from 'lucide-react'

const EMPTY = {
  full_name: '', cpf: '', birth_date: '', sex: '',
  education: '', phone: '', email: '', address: '',
  card_number: '', notes: '', prodoctor_id: ''
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(4,44,83,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#042C53' }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#aaa' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #E8ECF0', fontSize: 14, color: '#1a1a2e',
  outline: 'none', boxSizing: 'border-box'
}

// Busca ProDoctor com debounce — exibe dropdown de sugestões
// birthDate (YYYY-MM-DD): quando preenchido, filtra resultados por data de nascimento
function ProDoctorSearch({ value, onChange, onSelect, birthDate }) {
  const [results,    setResults]    = useState([])
  const [searching,  setSearching]  = useState(false)
  const [showList,   setShowList]   = useState(false)
  const [pdError,    setPdError]    = useState('')
  const [cachedQty,  setCachedQty]  = useState(() => getCachedCount())
  const debounce     = useRef(null)
  const wrapRef      = useRef(null)
  const birthDateRef = useRef(birthDate)
  birthDateRef.current = birthDate  // sempre aponta para o valor mais recente

  useEffect(() => {
    const hide = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowList(false) }
    document.addEventListener('mousedown', hide)
    return () => document.removeEventListener('mousedown', hide)
  }, [])

  // Executa a busca de fato (separado para reuso)
  const runSearch = (termo, force = false) => {
    setSearching(true)
    searchPatients(termo, force, birthDateRef.current)
      .then(list => {
        setCachedQty(getCachedCount())
        setResults(list)
        setShowList(true)
        if (list.length === 0)
          setPdError(`Nenhum paciente encontrado para "${termo}"${birthDateRef.current ? ' com a data de nascimento informada' : ''}.`)
        else
          setPdError('')
      })
      .catch(() => {
        setPdError('ProDoctor indisponível — preencha manualmente.')
        setShowList(false)
      })
      .finally(() => setSearching(false))
  }

  const doSearch = (v, force = false) => {
    onChange(v)
    setPdError('')
    clearTimeout(debounce.current)
    if (!force && v.length < 3) { setResults([]); setShowList(false); return }
    const termo = force ? (value || v) : v
    if (termo.length < 2) return
    debounce.current = setTimeout(() => runSearch(termo, force), force ? 0 : 500)
  }

  // Re-filtra automaticamente quando a data de nascimento muda (filtro local, sem nova chamada à API)
  useEffect(() => {
    if (value?.length >= 2) {
      clearTimeout(debounce.current)
      debounce.current = setTimeout(() => runSearch(value.trim()), 0)
    }
  }, [birthDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    clearPatientsCache()
    setCachedQty(0)
    doSearch(value, true)
  }

  const pick = (p) => {
    onSelect(p)
    setResults([])
    setShowList(false)
    setPdError('')
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          style={{ ...inputStyle, paddingRight: 68 }}
          value={value}
          onChange={e => doSearch(e.target.value)}
          placeholder="Digite o nome para buscar no ProDoctor..."
          autoComplete="off"
        />
        <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {searching && (
            <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', color: '#185FA5' }} />
          )}
          <button
            type="button"
            title={cachedQty > 0 ? `${cachedQty} pacientes em cache — clique para atualizar` : 'Carregar pacientes do ProDoctor'}
            onClick={handleRefresh}
            style={{
              border: 'none', background: searching ? 'rgba(24,95,165,0.05)' : 'rgba(24,95,165,0.1)',
              borderRadius: 5, padding: '3px 5px', cursor: searching ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 3, color: '#185FA5',
            }}
          >
            <RefreshCw size={13} style={searching ? { animation: 'spin 1s linear infinite' } : {}} />
            {cachedQty > 0 && <span style={{ fontSize: 10, fontWeight: 700 }}>{cachedQty}</span>}
          </button>
        </div>
      </div>

      {pdError && (
        <div style={{ fontSize: 11, color: '#E53E3E', marginTop: 4, paddingLeft: 2 }}>
          {pdError}
        </div>
      )}

      {showList && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', borderRadius: 10, border: '1.5px solid #E8ECF0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 260, overflow: 'auto',
          marginTop: 4,
        }}>
          {results.map((p, i) => (
            <div
              key={p.prodoctor_id || i}
              onClick={() => pick(p)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: i < results.length - 1 ? '1px solid #F5F6F8' : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0F7FF'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: '#E6F1FB', color: '#185FA5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700
              }}>
                {p.full_name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#042C53' }}>{p.full_name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 1, display: 'flex', gap: 8 }}>
                  {p.birth_date && <span>{new Date(p.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                  {p.sex && <span>{p.sex}</span>}
                  {p.cpf && <span>CPF: {p.cpf}</span>}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: '#185FA5', fontWeight: 600, background: '#E6F1FB', padding: '2px 8px', borderRadius: 20 }}>
                ProDoctor
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Patients() {
  const { patients, loading, create, update, remove } = usePatients()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor'

  const [search,        setSearch]        = useState('')
  const [dialog,        setDialog]        = useState(false)
  const [editing,       setEditing]       = useState(null)
  const [form,          setForm]          = useState(EMPTY)
  const [saving,        setSaving]        = useState(false)
  const [pdImported,    setPdImported]    = useState(false)
  const [pdRefreshing,  setPdRefreshing]  = useState(false)
  const [pdCacheQty,    setPdCacheQty]    = useState(() => getCachedCount())

  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deletePassword,setDeletePassword]= useState('')
  const [deleteError,   setDeleteError]   = useState('')
  const [deleting,      setDeleting]      = useState(false)

  const handlePdRefresh = async () => {
    setPdRefreshing(true)
    clearPatientsCache()
    try {
      await searchPatients('a', true)
    } catch { /* ignora */ }
    setPdCacheQty(getCachedCount())
    setPdRefreshing(false)
  }

  const filtered = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search) || p.email?.toLowerCase().includes(search.toLowerCase())
  )

  const openNew  = () => { setEditing(null); setForm(EMPTY); setPdImported(false); setDialog(true) }
  const openEdit = (p) => { setEditing(p); setForm(p); setPdImported(false); setDialog(true) }
  const closeDialog = () => { setDialog(false); setEditing(null); setForm(EMPTY); setPdImported(false) }

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // Preenche o formulário com dados vindos do ProDoctor
  const handleProDoctorSelect = (p) => {
    setForm({
      full_name:    p.full_name    || '',
      cpf:          p.cpf         || '',
      birth_date:   p.birth_date  || '',
      sex:          p.sex         || '',
      education:    p.education   || '',
      phone:        p.phone       || '',
      email:        p.email       || '',
      address:      p.address     || '',
      card_number:  p.card_number || '',
      notes:        '',
      prodoctor_id: p.prodoctor_id || '',
    })
    setPdImported(true)
  }

  const handleSave = async () => {
    if (!form.full_name?.trim()) return alert('Nome é obrigatório')
    setSaving(true)
    try {
      if (editing) await update(editing.id, form)
      else await create(form)
      closeDialog()
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const openDelete = (p) => {
    setDeleteTarget(p)
    setDeletePassword('')
    setDeleteError('')
  }

  const handleDeleteConfirm = async () => {
    const correct = import.meta.env.VITE_ADMIN_DELETE_PASSWORD
    if (deletePassword !== correct) {
      setDeleteError('Senha incorreta.')
      return
    }
    setDeleting(true)
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const initials = (name) =>
    name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#042C53', margin: 0 }}>Pacientes</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} cadastrado{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handlePdRefresh}
            disabled={pdRefreshing}
            title="Recarregar lista de pacientes do ProDoctor"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: pdRefreshing ? 'rgba(24,95,165,0.05)' : '#EBF4FF',
              color: '#185FA5', border: '1.5px solid #C3DAFA', borderRadius: 10,
              padding: '9px 14px', fontSize: 13, fontWeight: 500,
              cursor: pdRefreshing ? 'not-allowed' : 'pointer', opacity: pdRefreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} style={pdRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {pdRefreshing
              ? 'Atualizando...'
              : pdCacheQty > 0
                ? `ProDoctor (${pdCacheQty})`
                : 'Atualizar ProDoctor'}
          </button>
          <button onClick={openNew} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#185FA5', color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer'
          }}>
            <Plus size={16} /> Novo paciente
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF ou e-mail..."
          style={{ ...inputStyle, paddingLeft: 38, background: '#fff' }}
        />
      </div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <User size={36} color="#ddd" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#aaa', fontSize: 14 }}>
              {search ? 'Nenhum paciente encontrado.' : 'Cadastre o primeiro paciente.'}
            </p>
          </div>
        ) : (
          filtered.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid #F5F6F8' : 'none',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: '#E6F1FB', color: '#0C447C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600
              }}>{initials(p.full_name)}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e' }}>{p.full_name}</span>
                  {p.prodoctor_id && (
                    <span style={{ fontSize: 10, color: '#185FA5', background: '#E6F1FB', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>
                      ProDoctor
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                  {p.birth_date && (
                    <span style={{ fontSize: 12, color: '#888' }}>
                      {new Date().getFullYear() - new Date(p.birth_date).getFullYear()} anos
                    </span>
                  )}
                  {p.phone && (
                    <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Phone size={11} /> {p.phone}
                    </span>
                  )}
                  {p.email && (
                    <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Mail size={11} /> {p.email}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <Link to={`/pacientes/${p.id}`} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: '#E6F1FB', color: '#185FA5', textDecoration: 'none'
                }}>
                  Prontuário
                </Link>
                <button onClick={() => openEdit(p)} style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid #E8ECF0',
                  background: '#fff', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center'
                }}>
                  <Pencil size={14} />
                </button>
                {isAdmin && (
                  <button onClick={() => openDelete(p)} style={{
                    padding: '6px 10px', borderRadius: 8, border: '1px solid #FFE0E0',
                    background: '#FFF5F5', cursor: 'pointer', color: '#E53E3E', display: 'flex', alignItems: 'center'
                  }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmação de delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir paciente">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color="#E53E3E" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
              Excluir <span style={{ color: '#E53E3E' }}>{deleteTarget?.full_name}</span>?
            </div>
            <div style={{ fontSize: 13, color: '#888' }}>
              Esta ação não pode ser desfeita. Digite a senha de administrador para confirmar.
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 6 }}>
            <Lock size={12} /> Senha de administrador
          </label>
          <input
            type="password"
            value={deletePassword}
            onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
            onKeyDown={e => e.key === 'Enter' && handleDeleteConfirm()}
            placeholder="Digite a senha..."
            style={{ ...inputStyle, borderColor: deleteError ? '#FC8181' : '#E8ECF0' }}
            autoFocus
          />
          {deleteError && (
            <div style={{ fontSize: 12, color: '#E53E3E', marginTop: 6 }}>{deleteError}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setDeleteTarget(null)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #E8ECF0',
            background: '#fff', color: '#666', fontSize: 13, cursor: 'pointer'
          }}>
            Cancelar
          </button>
          <button onClick={handleDeleteConfirm} disabled={deleting || !deletePassword} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: deleting ? '#FC8181' : '#E53E3E', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, opacity: !deletePassword ? 0.5 : 1
          }}>
            {deleting ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Excluindo...</> : 'Excluir paciente'}
          </button>
        </div>
      </Modal>

      {/* Dialog */}
      <Modal open={dialog} onClose={closeDialog} title={editing ? 'Editar paciente' : 'Novo paciente'}>

        {/* Busca ProDoctor — só no cadastro novo */}
        {!editing && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#185FA5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CloudDownload size={14} /> BUSCAR NO PRODOCTOR
            </div>
            {pdImported ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FFF4', border: '1.5px solid #9AE6B4', borderRadius: 8, fontSize: 13, color: '#276749' }}>
                <CheckCircle2 size={15} color="#38A169" />
                Dados importados do ProDoctor — confira e salve abaixo.
                <button onClick={() => { setForm(EMPTY); setPdImported(false) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 11 }}>
                  Limpar
                </button>
              </div>
            ) : (
              <ProDoctorSearch
                value={form.full_name}
                onChange={v => setField('full_name', v)}
                onSelect={handleProDoctorSelect}
                birthDate={form.birth_date || null}
              />
            )}
            <div style={{ borderBottom: '1px solid #F0F2F5', margin: '20px 0 4px' }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {/* Nome — só aparece para edição ou após limpar busca */}
          {(editing || pdImported) && (
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Nome completo *">
                <input style={inputStyle} value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="Nome do paciente" />
              </Field>
            </div>
          )}
          <Field label="CPF">
            <input style={inputStyle} value={form.cpf} onChange={e => setField('cpf', e.target.value)} placeholder="000.000.000-00" />
          </Field>
          <Field label="Data de nascimento">
            <input style={inputStyle} type="date" value={form.birth_date} onChange={e => setField('birth_date', e.target.value)} />
          </Field>
          <Field label="Sexo">
            <select style={inputStyle} value={form.sex} onChange={e => setField('sex', e.target.value)}>
              <option value="">Selecionar</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </Field>
          <Field label="Escolaridade">
            <select style={inputStyle} value={form.education} onChange={e => setField('education', e.target.value)}>
              <option value="">Selecionar</option>
              <option value="1-4 anos">1–4 anos</option>
              <option value="5-8 anos">5–8 anos</option>
              <option value="9+ anos">9+ anos</option>
              <option value="Ensino Fundamental">Ensino Fundamental</option>
              <option value="Ensino Médio">Ensino Médio</option>
              <option value="Ensino Superior">Ensino Superior</option>
              <option value="pos_graduacao">Pós-graduação</option>
            </select>
          </Field>
          <Field label="Telefone">
            <input style={inputStyle} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="E-mail">
            <input style={inputStyle} type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@exemplo.com" />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Endereço">
              <input style={inputStyle} value={form.address || ''} onChange={e => setField('address', e.target.value)} placeholder="Rua, número, bairro, cidade..." />
            </Field>
          </div>
          <Field label="Nº Carteirinha (plano de saúde)">
            <input style={inputStyle} value={form.card_number || ''} onChange={e => setField('card_number', e.target.value)} placeholder="número da carteirinha" />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Observações">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Observações gerais..." />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={closeDialog} style={{
            padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E8ECF0',
            background: '#fff', fontSize: 14, cursor: 'pointer', color: '#666'
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: '#185FA5', color: '#fff', fontSize: 14, fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar paciente'}
          </button>
        </div>
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
