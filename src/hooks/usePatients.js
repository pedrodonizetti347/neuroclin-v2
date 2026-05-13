// hooks/usePatients.js — CRUD de pacientes no Firestore

import { useState, useEffect } from 'react'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, orderBy, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'

export function usePatients() {
  const { user }                = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor'

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      // Admin/supervisor vê todos; profissional só vê os seus
      const base = collection(db, 'patients')
      const q = isAdmin
        ? query(base, orderBy('createdAt', 'desc'))
        : query(base, where('createdBy', '==', user.id), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      try {
        const base = collection(db, 'patients')
        const q = isAdmin
          ? base
          : query(base, where('createdBy', '==', user.id))
        const snap = await getDocs(q)
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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
    await deleteDoc(doc(db, 'patients', id))
    setPatients(prev => prev.filter(p => p.id !== id))
  }

  return { patients, loading, error, create, update, remove, reload: load }
}
