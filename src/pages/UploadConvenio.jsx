import React, { useState, useRef } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { usePatients } from '@/hooks/usePatients'
import { Upload, CheckCircle2, Loader2, X, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import PatientSearchInput from '@/components/PatientSearchInput'

// ─── Paleta visual idêntica ao AnamneseForm ───────────────────────────────────
const S = {
  green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
  amber: '#F59E0B', amberL: 'rgba(245,158,11,0.15)',
  red: '#EF4444', redL: 'rgba(239,68,68,0.15)',
}

const inp = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none', boxSizing: 'border-box',
}

// ─── Convênios disponíveis ────────────────────────────────────────────────────
const CONVENIOS = [
  'Particular',
  'Hapvida Notredame Intermedica',
  'Cassi',
  'Cabesp',
  'Plan Assist',
  'Prevent Sênior',
]

// ─── Testes que NÃO estão no sistema (apenas esses aparecem para upload) ──────
const TESTES_CONVENIO = [
  { categoria: 'Atenção / Rastreio', testes: ['BPA', 'TAVIS', 'TEACO', 'TEADI', 'TEALTI', 'TB', 'TPB'] },
  { categoria: 'Inteligência', testes: ['WISC-IV', 'WAIS-III', 'SON-R 2½-7', 'SON-R 6-40'] },
  { categoria: 'Linguagem', testes: ['BOSTON', 'PROLEC', 'NOMEAÇÃO INFANTIL', 'TISD'] },
  { categoria: 'Comportamento / Personalidade', testes: ['BFP', 'BDEFS', 'BPQ', 'BRIEF 2', 'ABAS', 'SSRS', 'SRS-2', 'SNAP-IV', 'E-TDAH', 'EPF-TDAH', 'EPQJ', 'DIVA', 'RAADS-R', 'SCQ', 'SCARED'] },
  { categoria: 'Memória / Aprendizagem', testes: ['BVMT-R', 'NEPSY-2', 'MEMÓRIA PROSPECTIVA E RETROSPECTIVA'] },
  { categoria: 'Funções Executivas', testes: ['TORRE DE Londres', 'FAM (TFV)', 'FAS', 'FBI', 'FDT'] },
  { categoria: 'Humor / Ansiedade', testes: ['EBADEP-A', 'EBADEP-IJ', 'COLUMBIA', 'LIEBOWITZ', 'ESCALA DE HUMOR IJ', 'ESAVI-A', 'ESCALA COMPORTAMENTO DISRUPTIVO'] },
  { categoria: 'Funcional / Informante', testes: ['PDQ39', 'UPDRS', 'QA', 'QHS', 'PFISTER', 'VINELAND 3', 'IDADI', 'IHS2', 'PROTEA', 'THCP', "TIAH'S"] },
  { categoria: 'Outras Escalas', testes: ['EFS', 'YBOCS', 'STROOP'] },
]

// ─── Configuração de fotos esperadas por teste ────────────────────────────────
export const TESTES_FOTOS_CONFIG = [
  // Atenção / Rastreio
  { nome: 'BPA',      totalFotos: 6 },
  { nome: 'TAVIS',    totalFotos: null },
  { nome: 'TEACO',    totalFotos: null },  // conjunto com TEADI+TEALTI = 6 — split indefinido
  { nome: 'TEADI',    totalFotos: null },
  { nome: 'TEALTI',   totalFotos: null },
  { nome: 'TB',       totalFotos: null },  // conjunto com TPB = 4 — split indefinido
  { nome: 'TPB',      totalFotos: null },
  // Inteligência
  { nome: 'WISC-IV',    totalFotos: 30 },
  { nome: 'WAIS-III',   totalFotos: 24 },
  { nome: 'SON-R 2½-7', totalFotos: 20 },
  { nome: 'SON-R 6-40', totalFotos: 30 },
  // Linguagem
  { nome: 'BOSTON',            totalFotos: 2 },
  { nome: 'PROLEC',            totalFotos: null },  // Fund I=4 / Fund II=7 — entrada única no sistema
  { nome: 'NOMEAÇÃO INFANTIL', totalFotos: 2 },
  { nome: 'TISD',              totalFotos: 3 },
  // Comportamento / Personalidade
  { nome: 'BFP',      totalFotos: 2 },
  { nome: 'BDEFS',    totalFotos: 4 },
  { nome: 'BPQ',      totalFotos: null },
  { nome: 'BRIEF 2',  totalFotos: null },  // PAIS=3 / PROFESSORES=3 — entrada única no sistema
  { nome: 'ABAS',     totalFotos: 15 },
  { nome: 'SSRS',     totalFotos: null },
  { nome: 'SRS-2',    totalFotos: 2 },
  { nome: 'SNAP-IV',  totalFotos: 3 },
  { nome: 'E-TDAH',   totalFotos: null },  // AD=3 / PAIS=2 — entrada única no sistema
  { nome: 'EPF-TDAH', totalFotos: 7 },
  { nome: 'EPQJ',     totalFotos: 3 },
  { nome: 'DIVA',     totalFotos: 11 },
  { nome: 'RAADS-R',  totalFotos: 12 },
  { nome: 'SCQ',      totalFotos: 1 },
  { nome: 'SCARED',   totalFotos: 1 },
  // Memória / Aprendizagem
  { nome: 'BVMT-R',                             totalFotos: 5 },
  { nome: 'NEPSY-2',                             totalFotos: 20 },
  { nome: 'MEMÓRIA PROSPECTIVA E RETROSPECTIVA', totalFotos: null },
  // Funções Executivas
  { nome: 'TORRE DE Londres', totalFotos: 4 },
  { nome: 'FAM (TFV)',        totalFotos: 1 },
  { nome: 'FAS',              totalFotos: null },
  { nome: 'FBI',              totalFotos: 2 },
  { nome: 'FDT',              totalFotos: 2 },
  // Humor / Ansiedade
  { nome: 'EBADEP-A',                        totalFotos: 4 },
  { nome: 'EBADEP-IJ',                       totalFotos: 2 },
  { nome: 'COLUMBIA',                        totalFotos: 2 },
  { nome: 'LIEBOWITZ',                       totalFotos: 1 },
  { nome: 'ESCALA DE HUMOR IJ',              totalFotos: 10 },
  { nome: 'ESAVI-A',                         totalFotos: 1 },
  { nome: 'ESCALA COMPORTAMENTO DISRUPTIVO', totalFotos: 7 },
  // Funcional / Informante
  { nome: 'PDQ39',      totalFotos: 3 },
  { nome: 'UPDRS',      totalFotos: 3 },
  { nome: 'QA',         totalFotos: 4 },
  { nome: 'QHS',        totalFotos: 11 },
  { nome: 'PFISTER',    totalFotos: 1 },
  { nome: 'VINELAND 3', totalFotos: 7 },
  { nome: 'IDADI',      totalFotos: 18 },
  { nome: 'IHS2',       totalFotos: 1 },
  { nome: 'PROTEA',     totalFotos: 8 },
  { nome: 'THCP',       totalFotos: 7 },
  { nome: "TIAH'S",     totalFotos: 6 },
  // Outras Escalas
  { nome: 'EFS',    totalFotos: null },
  { nome: 'YBOCS',  totalFotos: 5 },
  { nome: 'STROOP', totalFotos: null },
  // Testes adicionais (fora do TESTES_CONVENIO, com valor fornecido)
  { nome: 'FAZ',              totalFotos: 1 },
  { nome: 'IPSF',             totalFotos: 2 },
  { nome: 'TDE-2',            totalFotos: 7 },
  { nome: 'TRIAGEM INFANTIL', totalFotos: 8 },
]

// ─── Compressor de imagem (igual ao TestScanUpload) ──────────────────────────
function comprimirImagem(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1600
      let { width: w, height: h } = img
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

// ─── Componente de upload por teste ──────────────────────────────────────────
function TesteUploadItem({ nome, patientId, patientName, convenio, onStatusChange }) {
  const [arquivos, setArquivos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef(null)

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    setErro('')
    try {
      const novos = []
      for (const file of files) {
        let blob = file
        if (file.type.startsWith('image/')) {
          blob = await comprimirImagem(file)
        }
        const nomeArquivo = `${Date.now()}_${file.name}`
        const storageRef = ref(storage, `sessions/${patientId}/convenio/${nome}/${nomeArquivo}`)
        await uploadBytes(storageRef, blob)
        const url = await getDownloadURL(storageRef)
        novos.push({ name: file.name, url, uploadedAt: new Date().toISOString() })
      }
      const atualizados = [...arquivos, ...novos]
      setArquivos(atualizados)

      // Salva metadados no Firestore — merge:true, não sobrescreve nada existente
      const chaveDoc = `${patientId}_${convenio.replace(/\s/g, '_')}`
      const docRef = doc(db, 'convenio_uploads', chaveDoc)
      await setDoc(docRef, {
        patientId,
        patientName,
        convenio,
        testes: { [nome]: atualizados },
        updatedAt: serverTimestamp(),
      }, { merge: true })

      onStatusChange(nome, atualizados.length)
    } catch (err) {
      setErro('Erro no upload. Tente novamente.')
      console.error(err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemover = async (idx) => {
    const atualizados = arquivos.filter((_, i) => i !== idx)
    setArquivos(atualizados)
    const chaveDoc = `${patientId}_${convenio.replace(/\s/g, '_')}`
    const docRef = doc(db, 'convenio_uploads', chaveDoc)
    await setDoc(docRef, {
      testes: { [nome]: atualizados },
      updatedAt: serverTimestamp(),
    }, { merge: true })
    onStatusChange(nome, atualizados.length)
  }

  // Semáforo: sem arquivo = vermelho, com arquivo(s) = amarelo
  const cor = arquivos.length === 0 ? S.red : S.amber
  const corBg = arquivos.length === 0 ? S.redL : S.amberL

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`,
      borderRadius: 8, padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: arquivos.length ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: cor, display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{nome}</span>
          {arquivos.length > 0 && (
            <span style={{
              background: corBg, color: cor, borderRadius: 20,
              padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>
              {arquivos.length} {arquivos.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            background: 'rgba(255,255,255,0.07)', border: `1px solid ${S.border}`,
            color: '#fff', borderRadius: 6, padding: '5px 12px',
            fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {uploading
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <Upload size={13} />}
          {uploading ? 'Enviando...' : 'Anexar'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFiles}
          style={{ display: 'none' }}
        />
      </div>

      {erro && <p style={{ color: S.red, fontSize: 12, margin: '4px 0 0' }}>{erro}</p>}

      {arquivos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {arquivos.map((arq, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.05)', borderRadius: 6,
              padding: '3px 8px', fontSize: 11,
            }}>
              <FileText size={11} style={{ color: S.muted }} />
              <a href={arq.url} target="_blank" rel="noreferrer"
                style={{
                  color: S.greenL, textDecoration: 'none',
                  maxWidth: 160, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                {arq.name}
              </a>
              <button onClick={() => handleRemover(idx)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: S.muted, padding: 0, display: 'flex', alignItems: 'center',
              }}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function UploadConvenio() {
  const { patients } = usePatients()
  const [paciente, setPaciente] = useState('')
  const [convenio, setConvenio] = useState('')
  const [testesSelecionados, setTestesSelecionados] = useState([])
  const [statusTestes, setStatusTestes] = useState({})
  const [categoriasAbertas, setCategoriasAbertas] = useState({})
  const [etapa, setEtapa] = useState(1)

  const pacienteObj = patients?.find(p => p.id === paciente)

  const toggleTeste = (nome) => {
    setTestesSelecionados(prev =>
      prev.includes(nome) ? prev.filter(t => t !== nome) : [...prev, nome]
    )
  }

  const toggleCategoria = (cat) => {
    setCategoriasAbertas(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const handleStatusChange = (nome, qtd) => {
    setStatusTestes(prev => ({ ...prev, [nome]: qtd }))
  }

  const totalComArquivo = Object.values(statusTestes).filter(v => v > 0).length
  const totalSelecionados = testesSelecionados.length
  const podeAvancar = paciente && convenio && testesSelecionados.length > 0

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Cabeçalho */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
          Upload de Testes — Convênio / Particular
        </h1>
        <p style={{ color: S.muted, fontSize: 13, marginTop: 4 }}>
          Documentação das folhas de testes aplicados para auditoria
        </p>
      </div>

      {/* ETAPA 1 — Seleção */}
      {etapa === 1 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`,
          borderRadius: 12, padding: 24,
        }}>

          {/* Paciente */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: S.muted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              PACIENTE
            </label>
            <PatientSearchInput
              patients={patients}
              value={paciente}
              onChange={setPaciente}
            />
          </div>

          {/* Convênio */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: S.muted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              TIPO DE ATENDIMENTO / CONVÊNIO
            </label>
            <select value={convenio} onChange={e => setConvenio(e.target.value)} style={inp}>
              <option value="">Selecionar...</option>
              {CONVENIOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Seleção de testes por categoria */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: S.muted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 12 }}>
              TESTES APLICADOS — selecione os que foram realizados
            </label>

            {TESTES_CONVENIO.map(({ categoria, testes }) => {
              const aberta = categoriasAbertas[categoria]
              const selecionadosNaCategoria = testes.filter(t => testesSelecionados.includes(t)).length
              return (
                <div key={categoria} style={{
                  border: `1px solid ${S.border}`, borderRadius: 8,
                  marginBottom: 8, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => toggleCategoria(categoria)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: 'none', cursor: 'pointer', padding: '10px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                      {categoria}
                      {selecionadosNaCategoria > 0 && (
                        <span style={{
                          marginLeft: 8, background: S.amberL, color: S.amber,
                          borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600,
                        }}>
                          {selecionadosNaCategoria}
                        </span>
                      )}
                    </span>
                    {aberta
                      ? <ChevronUp size={14} color={S.muted} />
                      : <ChevronDown size={14} color={S.muted} />}
                  </button>

                  {aberta && (
                    <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {testes.map(teste => {
                        const sel = testesSelecionados.includes(teste)
                        return (
                          <button
                            key={teste}
                            onClick={() => toggleTeste(teste)}
                            style={{
                              background: sel ? 'rgba(46,125,50,0.2)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${sel ? S.green : S.border}`,
                              color: sel ? S.greenL : '#fff',
                              borderRadius: 6, padding: '5px 12px',
                              fontSize: 12, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 5,
                            }}
                          >
                            {sel && <CheckCircle2 size={12} />}
                            {teste}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Resumo dos testes selecionados */}
          {testesSelecionados.length > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: `1px solid ${S.amberL}`,
              borderRadius: 8, padding: '12px 16px', marginBottom: 16,
            }}>
              <p style={{ color: S.amber, fontSize: 13, margin: 0 }}>
                <strong>{testesSelecionados.length}</strong> teste(s) selecionado(s):&nbsp;
                {testesSelecionados.join(', ')}
              </p>
            </div>
          )}

          <button
            onClick={() => setEtapa(2)}
            disabled={!podeAvancar}
            style={{
              background: podeAvancar ? S.green : 'rgba(255,255,255,0.08)',
              color: podeAvancar ? '#fff' : S.muted,
              border: 'none', borderRadius: 8, padding: '10px 24px',
              fontSize: 14, fontWeight: 600,
              cursor: podeAvancar ? 'pointer' : 'not-allowed',
              width: '100%',
            }}
          >
            Avançar para Upload →
          </button>
        </div>
      )}

      {/* ETAPA 2 — Upload das folhas */}
      {etapa === 2 && (
        <div>
          {/* Cabeçalho resumo */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${S.border}`,
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>
                {pacienteObj?.full_name || 'Paciente'}
              </p>
              <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>
                {convenio} · {testesSelecionados.length} testes selecionados
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {totalComArquivo > 0 && (
                <span style={{
                  background: S.amberL, color: S.amber,
                  borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {totalComArquivo}/{totalSelecionados} com arquivo
                </span>
              )}
              <button
                onClick={() => setEtapa(1)}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: `1px solid ${S.border}`,
                  color: S.muted, borderRadius: 6, padding: '5px 12px',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                ← Voltar
              </button>
            </div>
          </div>

          {/* Um item de upload por teste selecionado */}
          {testesSelecionados.map(nome => (
            <TesteUploadItem
              key={nome}
              nome={nome}
              patientId={paciente}
              patientName={pacienteObj?.full_name || ''}
              convenio={convenio}
              onStatusChange={handleStatusChange}
            />
          ))}

          {/* Legenda */}
          <div style={{
            marginTop: 20, padding: '14px 16px',
            background: 'rgba(255,255,255,0.02)', borderRadius: 8,
            border: `1px solid ${S.border}`,
          }}>
            <p style={{ color: S.muted, fontSize: 12, margin: 0, textAlign: 'center' }}>
              🟡 Amarelo = arquivo(s) enviado(s) · 🔴 Vermelho = sem arquivos
              · Contagem de folhas será configurada na próxima etapa
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
