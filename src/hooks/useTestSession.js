// hooks/useTestSession.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOLUÇÃO para o problema de "mexeu num prompt, zerou outro"
//
// Como funciona:
// - Cada teste tem seu próprio "slice" isolado no estado
// - updateTest('RAVLT', dados) → atualiza SÓ o RAVLT, preserva todo o resto
// - Firestore salva com merge:true → campos ausentes NÃO são apagados
// - Ao recarregar a sessão, todos os testes voltam exatamente como foram salvos
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useCallback, useRef } from 'react'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'

export function useTestSession(patientId) {
  const { user } = useAuth()

  // Estado central: { RAVLT: {...}, NEUPSILIN: {...}, GDS15: {...}, ... }
  const [session, setSession] = useState({
    patientId,
    anamnesis: {},
    tests: {},       // ← cada teste tem seu próprio espaço aqui
    metadata: {},
  })
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const saveTimer = useRef(null)
  const pendingSave = useRef(null) // { testName, data } — para flushSave

  // ─── Atualiza UM teste sem tocar nos outros ───────────────────────────────
  const updateTest = useCallback((testName, data) => {
    setSession(prev => ({
      ...prev,
      tests: {
        ...prev.tests,          // ← preserva TODOS os outros testes
        [testName]: {
          ...prev.tests[testName],  // ← preserva campos anteriores do mesmo teste
          ...data,                  // ← só atualiza o que mudou
        }
      }
    }))

    // Armazena save pendente e agenda debounce de 2s
    pendingSave.current = { testName, data }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTestToFirestore(testName, data)
      pendingSave.current = null
    }, 2000)
  }, [patientId])

  // ─── Atualiza anamnese sem tocar nos testes ───────────────────────────────
  const updateAnamnesis = useCallback((data) => {
    setSession(prev => ({
      ...prev,
      anamnesis: { ...prev.anamnesis, ...data }  // merge, nunca sobrescreve
    }))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveAnamnesisToFirestore(data)
    }, 2000)
  }, [patientId])

  // ─── Salva NO Firestore com merge:true (chave do anti-reset) ─────────────
  const saveTestToFirestore = useCallback(async (testName, data) => {
    if (!patientId || !user) return
    setSaving(true)
    try {
      const ref = doc(db, 'sessions', `${patientId}_${user.id}`)
      await setDoc(ref, {
        patientId,
        professionalId: user.id,
        tests: { [testName]: { ...data, _savedAt: serverTimestamp() } },
        updatedAt: serverTimestamp(),
      }, { merge: true })  // ← merge:true = não apaga os outros testes
      setLastSaved(new Date())
    } catch (e) {
      console.error('[useTestSession] Erro ao salvar:', e)
    } finally {
      setSaving(false)
    }
  }, [patientId, user])

  const saveAnamnesisToFirestore = useCallback(async (data) => {
    if (!patientId || !user) return
    try {
      const ref = doc(db, 'sessions', `${patientId}_${user.id}`)
      await setDoc(ref, {
        patientId,
        anamnesis: data,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    } catch (e) {
      console.error('[useTestSession] Erro ao salvar anamnese:', e)
    }
  }, [patientId, user])

  // ─── Carrega sessão existente do Firestore ────────────────────────────────
  const loadSession = useCallback(async () => {
    if (!patientId || !user) return
    try {
      const ref  = doc(db, 'sessions', `${patientId}_${user.id}`)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setSession(prev => ({
          ...prev,
          anamnesis: data.anamnesis || {},
          tests:     data.tests     || {},
        }))
      }
    } catch (e) {
      console.error('[useTestSession] Erro ao carregar sessão:', e)
    }
  }, [patientId, user])

  // ─── Salva imediatamente (sem esperar debounce) ───────────────────────────
  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (pendingSave.current) {
      const { testName, data } = pendingSave.current
      pendingSave.current = null
      await saveTestToFirestore(testName, data)
    }
  }, [saveTestToFirestore])

  // ─── Salva o laudo finalizado ─────────────────────────────────────────────
  const saveReport = useCallback(async (reportHtml, selectedTests) => {
    if (!patientId || !user) return null
    try {
      const ref = doc(db, 'reports', `${patientId}_${Date.now()}`)
      await setDoc(ref, {
        patientId,
        professionalId:   user.id,
        professionalName: user.full_name,
        selectedTests,
        reportHtml,
        status:    'rascunho',
        createdAt: serverTimestamp(),
      })
      return ref.id
    } catch (e) {
      console.error('[useTestSession] Erro ao salvar laudo:', e)
      return null
    }
  }, [patientId, user])

  return {
    session,
    saving,
    lastSaved,
    updateTest,
    updateAnamnesis,
    loadSession,
    flushSave,
    saveReport,
    // atalho para ler dados de um teste específico
    getTest: (name) => session.tests[name] || {},
  }
}
