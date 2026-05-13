import React, { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore'
import { useParams, useSearchParams } from 'react-router-dom'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import {
  BookOpen, User, FileText, FlaskConical, Clock, Save,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, Plus
} from 'lucide-react'

const S = {
  card: '#1A2744', cardG: '#1A3D2B', green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
  amber: '#F59E0B', blue: '#60A5FA', danger: '#EF4444',
}

const inputSt = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`,
  color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none',
}

const TEST_LABELS = {
  RAVLT: 'RAVLT', NEUPSILIN: 'NEUPSILIN', 'WASI-III': 'WASI-III',
  'WCST-N': 'WCST-N', FAB: 'FAB', 'GDS-15': 'GDS-15',
  GAI: 'GAI', 'BDI-II': 'BDI-II', HAD: 'HAD', IDATE: 'IDATE',
  BAMS: 'BAMS', TRIACOG: 'TRIACOG', LAWTON: 'Lawton',
  BADL: 'BADL', PCRS: 'PCRS', TOKEN: 'Token Test',
}

function TestCard({ testKey, data }) {
  const [open, setOpen] = useState(false)
  const fields = Object.entries(data).filter(([k]) => k !== '_appliedAt' && k !== 'obs')

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${S.border}`, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(46,125,50,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlaskConical size={12} color={S.greenL} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', flex: 1 }}>
          {TEST_LABELS[testKey] || testKey}
        </span>
        {data._appliedAt && (
          <span style={{ fontSize: 10, color: S.muted }}>
            {new Date(data._appliedAt).toLocaleDateString('pt-BR')}
          </span>
        )}
        {open ? <ChevronUp size={14} color={S.muted} /> : <ChevronDown size={14} color={S.muted} />}
      </div>

      {open && (
        <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '4px 16px' }}>
          {fields.map(([k, v]) => v !== '' && v !== undefined && (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <span style={{ color: S.muted }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{String(v)}</span>
            </div>
          ))}
          {data.obs && (
            <div style={{ gridColumn: '1 / -1', marginTop: 6, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11, color: S.muted }}>
              <span style={{ fontWeight: 700 }}>Obs: </span>{data.obs}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportCard({ report }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid rgba(46,125,50,0.2)`, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(46,125,50,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={12} color={S.greenL} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Laudo Neuropsicológico</span>
          {report.selectedTests?.length > 0 && (
            <span style={{ fontSize: 10, color: S.muted, marginLeft: 8 }}>{report.selectedTests.join(', ')}</span>
          )}
        </div>
        {report.createdAt?.toDate && (
          <span style={{ fontSize: 10, color: S.muted }}>{report.createdAt.toDate().toLocaleDateString('pt-BR')}</span>
        )}
        {open ? <ChevronUp size={14} color={S.muted} /> : <ChevronDown size={14} color={S.muted} />}
      </div>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', maxHeight: 300, overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: report.reportHtml || '<p>Sem conteúdo</p>' }} />
        </div>
      )}
    </div>
  )
}

function NoteEditor({ patientId }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!patientId) return
    try {
      const snap = await getDoc(doc(db, 'notes', patientId))
      if (snap.exists()) setNotes(snap.data().entries || [])
    } catch {}
  }, [patientId])

  useEffect(() => { load() }, [load])

  const addNote = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    const entry = {
      text: newNote.trim(),
      author: user?.full_name || 'Profissional',
      date: new Date().toISOString(),
    }
    const updated = [entry, ...notes]
    try {
      await setDoc(doc(db, 'notes', patientId), { entries: updated, updatedAt: serverTimestamp() }, { merge: true })
      setNotes(updated)
      setNewNote('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Nova observação clínica..."
          rows={2}
          style={{ ...inputSt, resize: 'vertical', flex: 1 }}
        />
        <button onClick={addNote} disabled={saving || !newNote.trim()} style={{
          padding: '0 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: saved ? S.cardG : S.green, color: saved ? S.greenL : '#fff',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, flexShrink: 0, alignSelf: 'stretch',
        }}>
          {saved ? <CheckCircle2 size={14} /> : <Plus size={14} />}
          {saved ? 'Salvo' : 'Adicionar'}
        </button>
      </div>
      <div style={{ maxHeight: 280, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {notes.length === 0 ? (
          <p style={{ fontSize: 12, color: S.muted, textAlign: 'center', padding: '20px 0' }}>Nenhuma observação registrada.</p>
        ) : (
          notes.map((n, i) => (
            <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${S.border}` }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: 4 }}>{n.text}</div>
              <div style={{ fontSize: 10, color: S.muted }}>
                {n.author} · {new Date(n.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function MedicalRecords() {
  const { user } = useAuth()
  const { id: paramId } = useParams()
  const [searchParams] = useSearchParams()
  const urlId = paramId || searchParams.get('id') || ''

  const [patients, setPatients] = useState([])
  const [patientId, setPatientId] = useState(urlId)
  const [session, setSession] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('testes')

  useEffect(() => {
    if (!user) return
    const isAdmin = user.role === 'admin' || user.role === 'supervisor'
    const base = collection(db, 'patients')
    const q = isAdmin ? base : query(base, where('createdBy', '==', user.id))
    getDocs(q).then(snap => setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [user])

  useEffect(() => {
    if (!patientId) return
    setLoading(true)

    Promise.all([
      // Busca todas as sessões deste paciente
      getDocs(collection(db, 'sessions')),
      // Busca todos os laudos
      getDocs(collection(db, 'reports')),
    ]).then(([sessSnap, repSnap]) => {
      const patSessions = sessSnap.docs
        .filter(d => d.id.startsWith(patientId + '_'))
        .map(d => ({ id: d.id, ...d.data() }))

      const merged = patSessions.reduce((acc, s) => ({
        tests: { ...acc.tests, ...(s.tests || {}) },
        anamnesis: { ...acc.anamnesis, ...(s.anamnesis || {}) },
      }), { tests: {}, anamnesis: {} })

      setSession(merged)

      const patReports = repSnap.docs
        .filter(d => d.data().patientId === patientId)
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setReports(patReports)
    }).finally(() => setLoading(false))
  }, [patientId])

  const patient = patients.find(p => p.id === patientId)
  const testEntries = session ? Object.entries(session.tests).filter(([, v]) => v && Object.keys(v).length > 0) : []

  const age = patient?.birth_date
    ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
    : null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>PRONTUÁRIO</h1>
        <p style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>Histórico clínico completo do paciente</p>
      </div>

      {/* Seletor de paciente */}
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>SELECIONAR PACIENTE</div>
        <select value={patientId} onChange={e => setPatientId(e.target.value)} style={{ ...inputSt, maxWidth: 420 }}>
          <option value="">— Buscar paciente —</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>

      {!patientId && (
        <div style={{ textAlign: 'center', padding: 60, color: S.muted }}>
          <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.15 }} />
          <p style={{ fontSize: 13 }}>Selecione um paciente para visualizar o prontuário.</p>
        </div>
      )}

      {patientId && (
        <>
          {/* Info do paciente */}
          {patient && (
            <div style={{ background: S.cardG, borderRadius: 12, border: '1px solid rgba(46,125,50,0.3)', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: S.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {patient.full_name?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{patient.full_name}</div>
                <div style={{ fontSize: 11, color: S.greenL, marginTop: 2 }}>
                  {age ? `${age} anos` : ''}{patient.sex ? ` · ${patient.sex}` : ''}{patient.education ? ` · ${patient.education}` : ''}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{testEntries.length}</div>
                  <div style={{ fontSize: 10, color: S.muted }}>TESTES</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{reports.length}</div>
                  <div style={{ fontSize: 10, color: S.muted }}>LAUDOS</div>
                </div>
              </div>
            </div>
          )}

          {/* Abas */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
            {[
              { key: 'testes', label: 'Testes', icon: FlaskConical },
              { key: 'laudos', label: 'Laudos', icon: FileText },
              { key: 'notas', label: 'Notas clínicas', icon: BookOpen },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: tab === key ? S.green : 'transparent',
                color: tab === key ? '#fff' : S.muted,
              }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, padding: 16 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Loader2 size={24} color={S.greenL} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : (
              <>
                {tab === 'testes' && (
                  testEntries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: S.muted, fontSize: 13 }}>
                      Nenhum teste registrado para este paciente.
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12 }}>
                        {testEntries.length} TESTE{testEntries.length !== 1 ? 'S' : ''} REGISTRADO{testEntries.length !== 1 ? 'S' : ''}
                      </div>
                      {testEntries.map(([key, data]) => (
                        <TestCard key={key} testKey={key} data={data} />
                      ))}
                    </div>
                  )
                )}

                {tab === 'laudos' && (
                  reports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: S.muted, fontSize: 13 }}>
                      Nenhum laudo gerado para este paciente.
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12 }}>
                        {reports.length} LAUDO{reports.length !== 1 ? 'S' : ''} GERADO{reports.length !== 1 ? 'S' : ''}
                      </div>
                      {reports.map(r => <ReportCard key={r.id} report={r} />)}
                    </div>
                  )
                )}

                {tab === 'notas' && <NoteEditor patientId={patientId} />}
              </>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
