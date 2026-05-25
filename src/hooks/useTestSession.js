// hooks/useTestSession.js
import { useState, useCallback, useRef, useEffect } from 'react'
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'

// Verifica se um valor é "real" (não zero, não nulo, não vazio)
function isReal(v) {
  return v !== null && v !== undefined && v !== 0 && v !== ''
}

export function useTestSession(patientId) {
  const { user } = useAuth()
  const userId = user?.id

  const [session, setSession] = useState({
    patientId,
    anamnesis: {},
    tests: {},
    metadata: {},
  })
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const saveTimer    = useRef(null)
  const pendingSave  = useRef(null)
  // Snapshot do que foi carregado do Firestore — usado para proteger valores reais
  const loadedTestsRef = useRef({})

  // ─── Salva com retry automático + proteção anti-zeragem ──────────────────
  const saveTestToFirestore = useCallback(async (testName, data) => {
    if (!patientId || !userId) return
    setSaving(true)
    const ref = doc(db, 'sessions', patientId)

    // Proteção: nunca sobrescrever campo com valor real por zero/nulo/vazio
    // Exceção: campos de controle (status, classification, interpretation) sempre são salvos
    const loaded = loadedTestsRef.current[testName] || {}
    const safeData = {}
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) { safeData[k] = v; continue }  // metadados: sempre passa
      const isControlField = k === 'status' || k === 'classification' || k === 'interpretation'
        || k.endsWith('_classification')
      if (isControlField) { safeData[k] = v; continue }     // status/classification sempre salvos
      const loadedIsReal = isReal(loaded[k])
      const newIsReal    = isReal(v)
      if (loadedIsReal && !newIsReal) continue  // protege valor real de ser zerado
      safeData[k] = v
    }

    // Atualiza o snapshot com os valores que serão salvos
    loadedTestsRef.current[testName] = { ...loaded, ...safeData }

    const payload = {
      patientId,
      lastUpdatedBy: userId,
      tests: { [testName]: { ...safeData, _savedAt: serverTimestamp(), _savedBy: userId } },
      updatedAt: serverTimestamp(),
    }
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await setDoc(ref, payload, { merge: true })
        setLastSaved(new Date())
        localStorage.removeItem(`neuroclin_backup_${patientId}_${testName}`)
        setSaving(false)
        return
      } catch (e) {
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000))
        else console.error('[useTestSession] Falha ao salvar após 3 tentativas:', e)
      }
    }
    setSaving(false)
  }, [patientId, userId])

  const saveAnamnesisToFirestore = useCallback(async (data) => {
    if (!patientId || !userId) return
    try {
      const ref = doc(db, 'sessions', patientId)
      await setDoc(ref, {
        patientId,
        lastUpdatedBy: userId,
        anamnesis: data,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    } catch (e) {
      console.error('[useTestSession] Erro ao salvar anamnese:', e)
    }
  }, [patientId, userId])

  // ─── Atualiza teste: backup localStorage imediato + debounce 800ms ─────────
  const updateTest = useCallback((testName, data) => {
    setSession(prev => ({
      ...prev,
      tests: {
        ...prev.tests,
        [testName]: {
          ...prev.tests[testName],
          ...data,
        }
      }
    }))

    // Backup local imediato — garante dado mesmo se aba fechar antes do save
    if (patientId) {
      localStorage.setItem(
        `neuroclin_backup_${patientId}_${testName}`,
        JSON.stringify({ data, timestamp: Date.now() })
      )
    }

    pendingSave.current = { testName, data }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTestToFirestore(testName, data)
      pendingSave.current = null
    }, 800)
  }, [patientId])

  // ─── Atualiza anamnese sem tocar nos testes ───────────────────────────────
  const updateAnamnesis = useCallback((data) => {
    setSession(prev => ({
      ...prev,
      anamnesis: { ...prev.anamnesis, ...data }
    }))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveAnamnesisToFirestore(data)
    }, 800)
  }, [patientId])

  // ─── Carrega sessão + migração legacy + flush do backup localStorage ───────
  const loadSession = useCallback(async () => {
    if (!patientId || !userId) return
    // Reseta snapshot ao trocar de paciente
    loadedTestsRef.current = {}
    try {
      const ref = doc(db, 'sessions', patientId)
      const snap = await getDoc(ref)

      let baseTests = {}
      let baseAnamnesis = {}

      if (snap.exists() && snap.data()?._migratedAt) {
        // Já migrado com sucesso — carrega diretamente
        const data = snap.data()
        baseTests = data.tests || {}
        baseAnamnesis = data.anamnesis || {}
      } else {
        // Doc sem _migratedAt (ou inexistente): captura base e faz migração completa
        if (snap.exists()) {
          baseTests = snap.data().tests || {}
          baseAnamnesis = snap.data().anamnesis || {}
        }

        // Busca docs legados sessions/{patientId}_{userId}
        const colSnap = await getDocs(collection(db, 'sessions'))
        const legacy = colSnap.docs.filter(d => d.id.startsWith(`${patientId}_`))
        let legacyTests = {}
        let legacyAnamnesis = {}
        for (const d of legacy) {
          const dd = d.data()
          legacyTests = { ...legacyTests, ...(dd.tests || {}) }
          legacyAnamnesis = { ...legacyAnamnesis, ...(dd.anamnesis || {}) }
        }
        // Legacy preenche lacunas; dados do doc novo têm prioridade
        baseTests = { ...legacyTests, ...baseTests }
        baseAnamnesis = { ...legacyAnamnesis, ...baseAnamnesis }

        await setDoc(ref, {
          patientId,
          lastUpdatedBy: userId,
          anamnesis: baseAnamnesis,
          tests: baseTests,
          updatedAt: serverTimestamp(),
          _migratedAt: serverTimestamp(),
        }, { merge: true })
      }

      // Verifica localStorage backup (dados não salvos antes de fechar a aba)
      const prefix = `neuroclin_backup_${patientId}_`
      const backupKeys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
      const backupTests = {}
      for (const bk of backupKeys) {
        const testName = bk.replace(prefix, '')
        try {
          const backup = JSON.parse(localStorage.getItem(bk) || '')
          if (backup?.data) {
            baseTests[testName] = backup.data
            backupTests[testName] = { ...backup.data, _savedAt: serverTimestamp(), _savedBy: userId }
          }
        } catch {}
      }

      // Salva backups ao Firestore imediatamente e limpa localStorage
      if (Object.keys(backupTests).length > 0) {
        try {
          await setDoc(ref, { tests: backupTests, updatedAt: serverTimestamp() }, { merge: true })
          backupKeys.forEach(bk => localStorage.removeItem(bk))
        } catch {}
      }

      // Registra snapshot do que foi carregado (base para proteção anti-zeragem)
      loadedTestsRef.current = { ...baseTests }

      setSession(prev => ({
        ...prev,
        anamnesis: baseAnamnesis,
        tests: baseTests,
      }))
    } catch (e) {
      console.error('[useTestSession] Erro ao carregar sessão:', e?.code, e)
    }
  }, [patientId, userId])

  // ─── Disparo automático ao mudar paciente ou usuário ─────────────────────
  useEffect(() => {
    if (!patientId || !userId) {
      setSessionLoaded(true)
      return
    }
    setSessionLoaded(false)
    loadSession().finally(() => setSessionLoaded(true))
  }, [loadSession])

  // ─── Flush imediato (sem esperar debounce) ────────────────────────────────
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

  // ─── Flush explícito do localStorage backup ao Firestore ─────────────────
  const flushBackup = useCallback(async () => {
    if (!patientId || !userId) return
    const prefix = `neuroclin_backup_${patientId}_`
    const backupKeys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
    if (backupKeys.length === 0) return
    const ref = doc(db, 'sessions', patientId)
    const backupTests = {}
    for (const bk of backupKeys) {
      const testName = bk.replace(prefix, '')
      try {
        const backup = JSON.parse(localStorage.getItem(bk) || '')
        if (backup?.data) {
          backupTests[testName] = { ...backup.data, _savedAt: serverTimestamp(), _savedBy: userId }
        }
      } catch {}
    }
    if (Object.keys(backupTests).length === 0) return
    try {
      await setDoc(ref, { tests: backupTests, updatedAt: serverTimestamp() }, { merge: true })
      backupKeys.forEach(bk => localStorage.removeItem(bk))
    } catch (e) {
      console.error('[useTestSession] Erro ao fazer flush do backup:', e)
    }
  }, [patientId, userId])

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
    sessionLoaded,
    updateTest,
    updateAnamnesis,
    loadSession,
    flushSave,
    flushBackup,
    saveReport,
    getTest: (name) => session.tests[name] || {},
  }
}
