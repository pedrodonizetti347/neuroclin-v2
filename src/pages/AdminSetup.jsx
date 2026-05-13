// Página de uso único — remover após criar os documentos necessários
import React, { useState } from 'react'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const USERS_TO_CREATE = [
  {
    uid:       'i5nwg569WabTUk69wzCWV5PRw9E3',
    email:     'pedrodonizettipalestrante@gmail.com',
    full_name: 'Dr. Pedro Donizetti',
    role:      'admin',
  },
  {
    uid:       'rNxtVUIqeJainAJDWb72ezlnfQh2',
    email:     'oliveiraldebora@gmail.com',
    full_name: 'Débora Oliveira',
    role:      'professional',
  },
]

const S = {
  card: '#1A2744', green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
}

export default function AdminSetup() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)

  const createAll = async () => {
    setLoading(true)
    const res = {}

    for (const u of USERS_TO_CREATE) {
      try {
        const ref  = doc(db, 'users', u.uid)
        const snap = await getDoc(ref)

        await setDoc(ref, {
          email:      u.email,
          full_name:  u.full_name,
          role:       u.role,
          ...(snap.exists() ? {} : { createdAt: serverTimestamp(), last_login: serverTimestamp() }),
        }, { merge: true })

        res[u.uid] = {
          status: snap.exists() ? 'created' : 'created',
          msg: snap.exists() ? `Role atualizado para "${u.role}".` : 'Documento criado com sucesso.',
        }
      } catch (e) {
        res[u.uid] = { status: 'error', msg: e.message }
      }
    }

    setResults(res)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 600, margin: '60px auto' }}>
      <div style={{ background: S.card, borderRadius: 14, border: `1px solid ${S.border}`, padding: 28 }}>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
            Configuração de Usuários
          </h2>
          <p style={{ fontSize: 12, color: S.muted }}>
            Cria documentos na coleção <code style={{ color: S.greenL }}>users/</code> para profissionais cadastrados.
            Esta página pode ser removida após o uso.
          </p>
        </div>

        {/* Lista de usuários a criar */}
        <div style={{ marginBottom: 20 }}>
          {USERS_TO_CREATE.map(u => {
            const r = results[u.uid]
            return (
              <div key={u.uid} style={{
                padding: '12px 14px', borderRadius: 8, marginBottom: 8,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${S.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.full_name}</div>
                  <div style={{ fontSize: 11, color: S.muted }}>{u.email}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2, fontFamily: 'monospace' }}>{u.uid}</div>
                </div>
                {r && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {r.status === 'created' && <CheckCircle2 size={16} color={S.greenL} />}
                    {r.status === 'exists'  && <CheckCircle2 size={16} color={S.muted} />}
                    {r.status === 'error'   && <AlertCircle  size={16} color="#EF4444" />}
                    <span style={{ fontSize: 11, color: r.status === 'created' ? S.greenL : r.status === 'error' ? '#EF4444' : S.muted }}>
                      {r.msg}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button onClick={createAll} disabled={loading || Object.keys(results).length > 0} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: Object.keys(results).length > 0 ? 'rgba(46,125,50,0.3)' : S.green,
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Criando documentos...</>
            : Object.keys(results).length > 0
              ? <><CheckCircle2 size={15} /> Concluído</>
              : 'Criar documentos no Firestore'
          }
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
