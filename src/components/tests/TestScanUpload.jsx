import React, { useState, useRef, useEffect } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, auth } from '@/lib/firebase'
import { Camera, CheckCircle2, Loader2, X, ZoomIn, Plus } from 'lucide-react'

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX_PX = 1600
    const img = new Image()
    const url = URL.createObjectURL(file)

    const cleanup = () => URL.revokeObjectURL(url)

    img.onerror = () => {
      cleanup()
      reject(new Error('Não foi possível carregar a imagem. Verifique o formato do arquivo.'))
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > MAX_PX || height > MAX_PX) {
          if (width > height) { height = Math.round(height * MAX_PX / width); width = MAX_PX }
          else { width = Math.round(width * MAX_PX / height); height = MAX_PX }
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          cleanup()
          resolve(blob || file)
        }, 'image/jpeg', 0.80)
      } catch (e) {
        cleanup()
        reject(e)
      }
    }

    img.src = url
  })
}

// Props:
//   patientId: string
//   testKey: string (ex: 'RAVLT', 'FAB')
//   existingUrls: string[]
//   onUrlsChange: (urls: string[]) => void
//   maxPhotos: number (default 5)
export default function TestScanUpload({ patientId, testKey, existingUrls = [], onUrlsChange, maxPhotos = 5 }) {
  const [previews, setPreviews]       = useState(existingUrls)
  const [uploading, setUploading]     = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [error, setError]             = useState('')
  const inputRef = useRef()

  useEffect(() => {
    if (!uploading && existingUrls.length > 0) {
      setPreviews(existingUrls)
    }
  }, [existingUrls])

  const uploadFile = async (file) => {
    const user = auth.currentUser
    if (!user) throw new Error('Sessão expirada. Recarregue a página e tente novamente.')
    const blob = await compressImage(file)
    const path = `test-scans/${patientId}/${testKey}/${user.uid}_${Date.now()}.jpg`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
    return getDownloadURL(storageRef)
  }

  const withTimeout = (promise, ms = 45000) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.')), ms)
      ),
    ])

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      const remaining = maxPhotos - previews.length
      const toProcess = files.slice(0, remaining)
      const newUrls = await Promise.all(toProcess.map(f => withTimeout(uploadFile(f))))
      const updated = [...previews, ...newUrls]
      setPreviews(updated)
      onUrlsChange?.(updated)
    } catch (err) {
      setError('Erro ao enviar imagem. Tente novamente.')
      console.error('[TestScanUpload]', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemove = (idx) => {
    const updated = previews.filter((_, i) => i !== idx)
    setPreviews(updated)
    onUrlsChange?.(updated)
  }

  const S = {
    border:  'rgba(255,255,255,0.12)',
    muted:   'rgba(255,255,255,0.45)',
    greenL:  '#4CAF50',
    amber:   '#F59E0B',
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>
        FOTOS DA FOLHA DE APLICAÇÃO
      </div>

      {previews.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          {previews.map((url, idx) => (
            <div key={idx} style={{ position: 'relative', width: 88, height: 88 }}>
              <img
                src={url} alt={`Scan ${idx + 1}`}
                onClick={() => setLightboxIdx(idx)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: `1px solid ${S.greenL}`, cursor: 'pointer' }}
              />
              <button
                onClick={() => handleRemove(idx)}
                style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
              >
                <X size={10} />
              </button>
              <div style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(46,125,50,0.85)', borderRadius: 4, padding: '1px 4px', display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle2 size={9} color="#fff" />
                <span style={{ fontSize: 9, color: '#fff' }}>{idx + 1}</span>
              </div>
            </div>
          ))}

          {previews.length < maxPhotos && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ width: 88, height: 88, borderRadius: 8, border: `2px dashed ${S.amber}`, background: 'rgba(245,158,11,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: S.amber }}
            >
              {uploading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={20} /><span style={{ fontSize: 10, fontWeight: 700 }}>Adicionar</span></>}
            </button>
          )}
        </div>
      )}

      {previews.length === 0 && (
        <div style={{ border: `2px dashed ${S.amber}`, borderRadius: 10, padding: '20px 16px', textAlign: 'center', background: 'rgba(245,158,11,0.06)' }}>
          <Camera size={28} color={S.amber} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: S.amber, marginBottom: 4 }}>Foto da folha de aplicação</p>
          <p style={{ fontSize: 11, color: S.muted, marginBottom: 12 }}>Tire foto com o celular ou selecione arquivo</p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading || !patientId}
            style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${S.amber}`, background: 'transparent', color: S.amber, fontSize: 12, fontWeight: 700, cursor: patientId ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</> : <><Camera size={14} /> Anexar foto(s)</>}
          </button>
          {!patientId && <p style={{ fontSize: 10, color: S.muted, marginTop: 6 }}>Selecione um paciente primeiro</p>}
        </div>
      )}

      {error && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>{error}</p>}

      {previews.length > 0 && (
        <p style={{ fontSize: 11, color: S.greenL, marginTop: 4 }}>
          <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />
          {previews.length} foto{previews.length > 1 ? 's' : ''} salva{previews.length > 1 ? 's' : ''}
          {previews.length < maxPhotos && ` · pode adicionar mais ${maxPhotos - previews.length}`}
        </p>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple capture="environment"
        style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <img src={previews[lightboxIdx]} alt="Scan ampliado"
              style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 10, boxShadow: '0 0 40px rgba(0,0,0,0.5)' }} />
            <button onClick={() => setLightboxIdx(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <X size={16} />
            </button>
            {previews.length > 1 && (
              <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                {previews.map((_, i) => (
                  <button key={i} onClick={() => setLightboxIdx(i)}
                    style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === lightboxIdx ? '#fff' : 'rgba(255,255,255,0.35)' }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
