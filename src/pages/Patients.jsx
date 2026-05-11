import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePatients } from '@/hooks/usePatients'
import { Plus, Search, User, Phone, Mail, Pencil, Trash2, X, Loader2 } from 'lucide-react'

const EMPTY = {
  full_name: '', cpf: '', birth_date: '', sex: '',
  education: '', phone: '', email: '', notes: ''
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1
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

export default function Patients() {
  const { patients, loading, create, update, remove } = usePatients()
  const [search,  setSearch]  = useState('')
  const [dialog,  setDialog]  = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)

  const filtered = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search) || p.email?.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setEditing(null); setForm(EMPTY); setDialog(true) }
  const openEdit = (p) => { setEditing(p); setForm(p); setDialog(true) }
  const closeDialog = () => { setDialog(false); setEditing(null); setForm(EMPTY) }

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

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

  const handleDelete = async (p) => {
    if (!confirm(`Excluir ${p.full_name}? Esta ação não pode ser desfeita.`)) return
    await remove(p.id)
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
        <button onClick={openNew} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#185FA5', color: '#fff', border: 'none',
          padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer'
        }}>
          <Plus size={16} /> Novo paciente
        </button>
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
              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: '#E6F1FB', color: '#0C447C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600
              }}>{initials(p.full_name)}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e' }}>{p.full_name}</div>
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

              {/* Actions */}
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
                <button onClick={() => handleDelete(p)} style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid #FFE0E0',
                  background: '#FFF5F5', cursor: 'pointer', color: '#E53E3E', display: 'flex', alignItems: 'center'
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      <Modal open={dialog} onClose={closeDialog} title={editing ? 'Editar paciente' : 'Novo paciente'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Nome completo *">
              <input style={inputStyle} value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="Nome do paciente" />
            </Field>
          </div>
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
              <option value="analfabeto">Analfabeto</option>
              <option value="fundamental_incompleto">Fundamental incompleto</option>
              <option value="fundamental_completo">Fundamental completo</option>
              <option value="medio_incompleto">Médio incompleto</option>
              <option value="medio_completo">Médio completo</option>
              <option value="superior_incompleto">Superior incompleto</option>
              <option value="superior_completo">Superior completo</option>
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
