// hooks/usePatients.js — CRUD de pacientes no Firestore

import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc,
  doc, getDocs, getDoc, query, orderBy, where, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { logAction } from '@/lib/auditLog'

export function usePatients() {
  const { user }                = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const base = collection(db, 'patients')
      const snap = await getDocs(query(base, orderBy('createdAt', 'desc')))
      setPatients(snap.docs.filter(d => !d.data().deleted).map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      try {
        const snap = await getDocs(collection(db, 'patients'))
        setPatients(snap.docs.filter(d => !d.data().deleted).map(d => ({ id: d.id, ...d.data() })))
      } catch (e2) { setError(e2.message) }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user])

  const create = async (data) => {
    const ref = await addDoc(collection(db, 'patients'), {
      ...data,
      createdBy: user?.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const newPatient = { id: ref.id, ...data, createdBy: user?.id }
    setPatients(prev => [newPatient, ...prev])
    return newPatient
  }

  const update = async (id, data) => {
    await updateDoc(doc(db, 'patients', id), { ...data, updatedAt: serverTimestamp() })
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }

  const remove = async (id) => {
    const batch = writeBatch(db)
    const patientName = patients.find(p => p.id === id)?.full_name || id

    // Metadados de soft-delete — dados permanecem recuperáveis no Firestore
    const deletedMeta = {
      deleted:         true,
      deletedAt:       serverTimestamp(),
      deletedBy:       user?.id       || 'unknown',
      deletedByName:   user?.full_name || 'Desconhecido',
    }

    // Busca laudos do paciente e bloqueia se houver qualquer laudo aprovado
    const reportsSnap = await getDocs(query(collection(db, 'reports'), where('patientId', '==', id)))
    const aprovados = reportsSnap.docs.filter(d => d.data().status === 'aprovado')
    if (aprovados.length > 0) {
      throw new Error(
        `Exclusão bloqueada: este paciente possui ${aprovados.length} laudo(s) aprovado(s). ` +
        `Só é possível excluir pacientes cujos laudos estejam em rascunho ou teste.`
      )
    }
    // Soft-delete laudos (rascunho/teste) — dados preservados no Firestore
    reportsSnap.docs.forEach(d => batch.update(d.ref, deletedMeta))

    // Soft-delete sessões legadas (IDs com prefixo patientId_)
    const sessionsSnap = await getDocs(collection(db, 'sessions'))
    sessionsSnap.docs
      .filter(d => d.id.startsWith(id + '_'))
      .forEach(d => batch.update(d.ref, deletedMeta))

    // Soft-delete sessão principal (sessions/{patientId}) — usa set+merge pois pode não existir
    batch.set(doc(db, 'sessions', id), deletedMeta, { merge: true })

    // Soft-delete paciente — dados preservados, apenas marcado como excluído
    batch.update(doc(db, 'patients', id), deletedMeta)

    await batch.commit()
    setPatients(prev => prev.filter(p => p.id !== id))
    logAction(user, 'paciente_excluido', { patientId: id, patientName, softDelete: true })
  }

  const merge = async (primaryId, secondaryId) => {
    const primaryName   = patients.find(p => p.id === primaryId)?.full_name   || primaryId
    const secondaryName = patients.find(p => p.id === secondaryId)?.full_name || secondaryId

    const mergedMeta = {
      deleted:       true,
      deletedAt:     serverTimestamp(),
      deletedBy:     user?.id       || 'unknown',
      deletedByName: user?.full_name || 'Desconhecido',
      mergedInto:    primaryId,
    }

    // Migrar laudos: atualiza patientId de secundário → primário
    const reportsSnap = await getDocs(query(collection(db, 'reports'), where('patientId', '==', secondaryId)))
    const batch = writeBatch(db)
    reportsSnap.docs.forEach(d => batch.update(d.ref, { patientId: primaryId, updatedAt: serverTimestamp() }))

    // Migrar anamnese se primário não tiver
    const primaryAnamRef   = doc(db, 'anamneses', primaryId)
    const secondaryAnamRef = doc(db, 'anamneses', secondaryId)
    const [primaryAnam, secondaryAnam] = await Promise.all([getDoc(primaryAnamRef), getDoc(secondaryAnamRef)])
    if (!primaryAnam.exists() && secondaryAnam.exists()) {
      batch.set(primaryAnamRef, { ...secondaryAnam.data(), patientId: primaryId, updatedAt: serverTimestamp() })
    }
    if (secondaryAnam.exists()) batch.update(secondaryAnamRef, mergedMeta)

    // Migrar testes: campos do secundário que não existem no primário
    const primarySessRef   = doc(db, 'sessions', primaryId)
    const secondarySessRef = doc(db, 'sessions', secondaryId)
    const [primarySess, secondarySess] = await Promise.all([getDoc(primarySessRef), getDoc(secondarySessRef)])
    if (secondarySess.exists()) {
      const primData = primarySess.exists() ? primarySess.data() : {}
      const secData  = secondarySess.data()
      const toMerge  = {}
      const skip     = new Set(['deleted', 'deletedAt', 'deletedBy', 'deletedByName', 'mergedInto'])
      Object.keys(secData).forEach(k => { if (!skip.has(k) && !primData[k]) toMerge[k] = secData[k] })
      if (Object.keys(toMerge).length > 0) batch.set(primarySessRef, toMerge, { merge: true })
      batch.set(secondarySessRef, mergedMeta, { merge: true })
    }

    // Soft-delete paciente secundário
    batch.update(doc(db, 'patients', secondaryId), mergedMeta)

    await batch.commit()
    setPatients(prev => prev.filter(p => p.id !== secondaryId))
    logAction(user, 'paciente_mesclado', { primaryId, secondaryId, primaryName, secondaryName, laudosMigrados: reportsSnap.docs.length })
  }

  return { patients, loading, error, create, update, remove, merge, reload: load }
}
