import React, { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ChevronDown, ChevronUp, CheckCircle2, Loader2 } from 'lucide-react'

const S = {
  card: '#1A2744', green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
}
const inp = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none', boxSizing: 'border-box',
}
const SN = ['Sim', 'Não']
const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 12 }
const FULL = { gridColumn: '1 / -1' }

function Fld({ label, name, value, onChange, type = 'text', opts = [], rows = 2 }) {
  const v = value ?? ''
  const lbl = <label style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
  if (type === 'select') return <div>{lbl}<select value={v} onChange={e => onChange(name, e.target.value)} style={inp}><option value="">—</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
  if (type === 'textarea') return <div>{lbl}<textarea value={v} onChange={e => onChange(name, e.target.value)} rows={rows} style={{ ...inp, resize: 'vertical' }} /></div>
  if (type === 'date') return <div>{lbl}<input type="date" value={v} onChange={e => onChange(name, e.target.value)} style={inp} /></div>
  if (type === 'number') return <div>{lbl}<input type="number" value={v} onChange={e => onChange(name, e.target.value)} style={inp} /></div>
  return <div>{lbl}<input type="text" value={v} onChange={e => onChange(name, e.target.value)} style={inp} /></div>
}

function ChkArr({ label, name, items, value = [], onChange }) {
  const cur = value || []
  const toggle = item => onChange(name, cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item])
  return (
    <div>
      <label style={{ fontSize: 10, color: S.muted, fontWeight: 700, letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{label.toUpperCase()}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {items.map(item => (
          <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: cur.includes(item) ? S.greenL : 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
            <input type="checkbox" checked={cur.includes(item)} onChange={() => toggle(item)} style={{ accentColor: S.greenL, width: 13, height: 13 }} />
            {item}
          </label>
        ))}
      </div>
    </div>
  )
}

function Sec({ title, children, open: initOpen = false }) {
  const [open, setOpen] = useState(initOpen)
  return (
    <div style={{ border: `1px solid ${S.border}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
        {title}
        {open ? <ChevronUp size={14} color={S.muted} /> : <ChevronDown size={14} color={S.muted} />}
      </button>
      {open && <div style={{ padding: 16 }}><div style={GRID}>{children}</div></div>}
    </div>
  )
}

export default function AnamneseForm({ patientId }) {
  const [form, setForm] = useState({ patient_type: 'adulto' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const formRef = useRef(form)
  formRef.current = form

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    getDoc(doc(db, 'anamneses', patientId))
      .then(snap => { if (snap.exists()) setForm(snap.data()) })
      .finally(() => setLoading(false))
  }, [patientId])

  const save = useCallback(async (data) => {
    if (!patientId) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'anamneses', patientId), { ...data, updatedAt: serverTimestamp() }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }, [patientId])

  const ch = useCallback((key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      clearTimeout(timer.current)
      timer.current = setTimeout(() => save(next), 1000)
      return next
    })
    setSaved(false)
  }, [save])

  const t = form.patient_type || 'adulto'
  const isI = t === 'idoso'
  const isA = t === 'adulto'
  const isC = t === 'infantil'
  const isAI = isA || isI

  if (!patientId) return <p style={{ color: S.muted, fontSize: 13, textAlign: 'center', padding: 40 }}>Selecione um paciente para preencher a anamnese.</p>
  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={22} color={S.greenL} style={{ animation: 'spin 1s linear infinite' }} /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {saving && <><Loader2 size={12} color={S.muted} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 11, color: S.muted }}>Salvando...</span></>}
        {saved && !saving && <><CheckCircle2 size={12} color={S.greenL} /><span style={{ fontSize: 11, color: S.greenL }}>Salvo</span></>}
      </div>

      {/* Cabeçalho */}
      <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={GRID}>
          <Fld label="Tipo de Paciente" name="patient_type" value={form.patient_type} onChange={ch} type="select" opts={['adulto', 'idoso', 'infantil']} />
          <Fld label="Data da Avaliação" name="data_avaliacao" value={form.data_avaliacao} onChange={ch} type="date" />
          <Fld label="Encaminhado por" name="encaminhado_por" value={form.encaminhado_por} onChange={ch} />
          <Fld label="Profissional de saúde prévio" name="profissional_saude_previo" value={form.profissional_saude_previo} onChange={ch} />
          <Fld label="Médico — nome" name="medico_nome" value={form.medico_nome} onChange={ch} />
          <Fld label="Médico — CRM" name="medico_crm" value={form.medico_crm} onChange={ch} />
          <Fld label="Especialidade" name="medico_especialidade" value={form.medico_especialidade} onChange={ch} />
          <Fld label="Convênio" name="convenio_medico" value={form.convenio_medico} onChange={ch} />
          <div style={FULL}><Fld label="Motivo do encaminhamento" name="motivo_encaminhamento" value={form.motivo_encaminhamento} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Objetivo da avaliação" name="objetivo_avaliacao" value={form.objetivo_avaliacao} onChange={ch} type="textarea" rows={2} /></div>
        </div>
      </div>

      {/* 1. Dados pessoais */}
      <Sec title="1. DADOS PESSOAIS" open>
        <Fld label="Sexo" name="sexo" value={form.sexo} onChange={ch} type="select" opts={['masculino', 'feminino']} />
        <Fld label="Lateralidade" name="lateralidade" value={form.lateralidade} onChange={ch} type="select" opts={['destro', 'canhoto', 'ambidestro']} />
        <Fld label="Data de nascimento" name="data_nascimento" value={form.data_nascimento} onChange={ch} type="date" />
        <Fld label="Idade" name="idade" value={form.idade} onChange={ch} type="number" />
        <Fld label="Estado civil" name="estado_civil" value={form.estado_civil} onChange={ch} type="select" opts={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável', 'Separado(a)']} />
        <Fld label="Escolaridade" name="escolaridade" value={form.escolaridade} onChange={ch} />
        <Fld label="Profissão" name="profissao" value={form.profissao} onChange={ch} />
        <Fld label="Telefone" name="telefone" value={form.telefone} onChange={ch} />
        <Fld label="Endereço" name="endereco" value={form.endereco} onChange={ch} />
        <Fld label="Reside com" name="reside_com" value={form.reside_com} onChange={ch} />
        <Fld label="Responsável" name="responsavel" value={form.responsavel} onChange={ch} />
        <Fld label="Parentesco do responsável" name="parentesco_responsavel" value={form.parentesco_responsavel} onChange={ch} />
        <Fld label="Acompanhante" name="acompanhante" value={form.acompanhante} onChange={ch} />
        <Fld label="Parentesco do acompanhante" name="parentesco_acompanhante" value={form.parentesco_acompanhante} onChange={ch} />
        {isA && <Fld label="Local de nascimento" name="local_nascimento_adulto" value={form.local_nascimento_adulto} onChange={ch} />}
        {isI && <Fld label="Local de nascimento" name="local_nascimento" value={form.local_nascimento} onChange={ch} />}
        {isI && <Fld label="Qtd. filhos / netos" name="quantidade_filhos_netos" value={form.quantidade_filhos_netos} onChange={ch} />}
      </Sec>

      {/* 2. Queixas */}
      <Sec title="2. QUEIXAS">
        <div style={FULL}><Fld label="Queixas" name="queixas" value={form.queixas} onChange={ch} type="textarea" rows={3} /></div>
        <div style={FULL}><Fld label="Queixas cognitivas / emocionais" name="queixas_cognitivas_emocionais" value={form.queixas_cognitivas_emocionais} onChange={ch} type="textarea" rows={2} /></div>
        {isA && <div style={FULL}><Fld label="Queixas cognitivas / emocionais (adulto)" name="queixas_cognitivas_emocionais_adulto" value={form.queixas_cognitivas_emocionais_adulto} onChange={ch} type="textarea" rows={2} /></div>}
        {isI && <>
          <Fld label="Início dos sintomas" name="inicio_sintomas_data" value={form.inicio_sintomas_data} onChange={ch} />
          <div style={FULL}><Fld label="Desenvolvimento dos sintomas" name="desenvolvimento_sintomas" value={form.desenvolvimento_sintomas} onChange={ch} type="textarea" rows={2} /></div>
          <Fld label="Frequência dos sintomas" name="frequencia_sintomas" value={form.frequencia_sintomas} onChange={ch} />
          <Fld label="Evolução nos últimos 6 meses" name="evolucao_sintomas_6meses" value={form.evolucao_sintomas_6meses} onChange={ch} />
          <Fld label="Fatores que aliviam" name="fatores_alivio_sintomas" value={form.fatores_alivio_sintomas} onChange={ch} />
        </>}
        {isC && <>
          <Fld label="Quando a queixa foi identificada" name="queixa_quando_identificada" value={form.queixa_quando_identificada} onChange={ch} />
          <Fld label="Mudança na queixa" name="queixa_mudanca" value={form.queixa_mudanca} onChange={ch} />
          <Fld label="Reação da criança" name="queixa_reacao_crianca" value={form.queixa_reacao_crianca} onChange={ch} />
          <Fld label="Parecido com familiar?" name="queixa_parecido_familia" value={form.queixa_parecido_familia} onChange={ch} />
        </>}
      </Sec>

      {/* 3. Funcionalidade — adulto/idoso */}
      {isAI && <Sec title="3. FUNCIONALIDADE">
        <Fld label="Trabalha atualmente" name="trabalha_atualmente" value={form.trabalha_atualmente} onChange={ch} type="select" opts={SN} />
        <Fld label="Atividades externas sozinho" name="executa_atividades_externas" value={form.executa_atividades_externas} onChange={ch} type="select" opts={SN} />
        <Fld label="Cuida do próprio dinheiro" name="cuida_proprio_dinheiro" value={form.cuida_proprio_dinheiro} onChange={ch} type="select" opts={SN} />
        <Fld label="Desde quando não cuida do dinheiro" name="desde_quando_nao_cuida_dinheiro" value={form.desde_quando_nao_cuida_dinheiro} onChange={ch} />
        {isI && <Fld label="Administra a casa" name="administra_casa_idoso" value={form.administra_casa_idoso} onChange={ch} type="select" opts={SN} />}
        {isA && <Fld label="Administra a casa" name="administra_casa_adulto" value={form.administra_casa_adulto} onChange={ch} type="select" opts={SN} />}
        <Fld label="Quem administra a casa" name="quem_administra_casa" value={form.quem_administra_casa} onChange={ch} />
        <Fld label="Desde quando não administra" name="desde_quando_nao_administra" value={form.desde_quando_nao_administra} onChange={ch} />
        {isI && <Fld label="Erra na preparação de refeições" name="erra_preparacao_refeicoes" value={form.erra_preparacao_refeicoes} onChange={ch} type="select" opts={SN} />}
        <Fld label="Dirige" name="dirige" value={form.dirige} onChange={ch} type="select" opts={SN} />
        <Fld label="Por que não dirige" name="porque_nao_dirige" value={form.porque_nao_dirige} onChange={ch} />
        {isA && <Fld label="Dificuldade em AVDs" name="dificuldade_avds" value={form.dificuldade_avds} onChange={ch} />}
        {isA && <Fld label="Executa trabalhos domésticos" name="executa_trabalhos_domesticos" value={form.executa_trabalhos_domesticos} onChange={ch} type="select" opts={SN} />}
        {isI && <div style={FULL}><Fld label="Mudanças de socialização" name="mudancas_socializacao" value={form.mudancas_socializacao} onChange={ch} type="textarea" rows={2} /></div>}
        <div style={FULL}><ChkArr label="AVDs realizadas independentemente" name="avds_independentes"
          items={['Banho', 'Vestuário', 'Alimentação', 'Higiene pessoal', 'Transferência', 'Continência', 'Telefone', 'Compras', 'Cozinhar', 'Tarefas domésticas', 'Lavanderia', 'Transporte', 'Medicamentos', 'Finanças']}
          value={form.avds_independentes} onChange={ch} /></div>
        {isI && <div style={FULL}><ChkArr label="Preocupações físicas" name="preocupacoes_fisicas"
          items={['Dor crônica', 'Problemas cardíacos', 'Hipertensão', 'Diabetes', 'Problemas respiratórios', 'Osteoporose', 'Problemas renais', 'Outros']}
          value={form.preocupacoes_fisicas} onChange={ch} /></div>}
        {isI && <>
          <Fld label="Quedas" name="quedas" value={form.quedas} onChange={ch} type="select" opts={SN} />
          <Fld label="Mobilidade" name="mobilidade" value={form.mobilidade} onChange={ch} />
          <Fld label="Auxiliares de locomoção" name="uso_auxiliares_locomocao" value={form.uso_auxiliares_locomocao} onChange={ch} />
        </>}
      </Sec>}

      {/* 4. Escolaridade & Trabalho */}
      {isAI && <Sec title="4. ESCOLARIDADE & TRABALHO">
        <Fld label="Última série concluída" name="ultima_serie_concluida" value={form.ultima_serie_concluida} onChange={ch} />
        <Fld label="Quando estudou pela última vez" name="quando_estudou_ultima_vez" value={form.quando_estudou_ultima_vez} onChange={ch} />
        {isA && <>
          <Fld label="Idade que começou a estudar" name="idade_comecou_estudar" value={form.idade_comecou_estudar} onChange={ch} />
          <Fld label="Escola pública ou particular" name="escola_publica_particular" value={form.escola_publica_particular} onChange={ch} type="select" opts={['Pública', 'Particular', 'Ambas']} />
          <Fld label="Houve reprovação" name="houve_repetencia" value={form.houve_repetencia} onChange={ch} type="select" opts={SN} />
          <Fld label="Dificuldades escolares" name="dificuldades_escolares" value={form.dificuldades_escolares} onChange={ch} />
          <Fld label="Solicitava ajuda para estudar" name="solicitava_ajuda" value={form.solicitava_ajuda} onChange={ch} type="select" opts={SN} />
          <Fld label="Cursos extracurriculares" name="cursos_extra_curriculares" value={form.cursos_extra_curriculares} onChange={ch} />
        </>}
        <Fld label="Ocupação atual" name="ocupacao_atual" value={form.ocupacao_atual} onChange={ch} />
        <div style={FULL}><Fld label="Trabalhos anteriores" name="trabalhos_anteriores" value={form.trabalhos_anteriores} onChange={ch} type="textarea" rows={2} /></div>
        {isA && <div style={FULL}><Fld label="Queixas relacionadas ao trabalho" name="queixas_trabalho" value={form.queixas_trabalho} onChange={ch} type="textarea" rows={2} /></div>}
        <Fld label="Aposentadoria" name="aposentadoria" value={form.aposentadoria} onChange={ch} type="select" opts={SN} />
        <Fld label="Reação à aposentadoria" name="reacao_aposentadoria" value={form.reacao_aposentadoria} onChange={ch} />
      </Sec>}

      {/* 5. Social & Rotina */}
      {isAI && <Sec title="5. SOCIAL & ROTINA">
        <Fld label="Família (frequência)" name="familia" value={form.familia} onChange={ch} />
        <Fld label="Amigos (frequência)" name="amigos" value={form.amigos} onChange={ch} />
        <Fld label="Grupo de afinidade" name="grupo_afinidade" value={form.grupo_afinidade} onChange={ch} />
        {isA && <>
          <Fld label="Namora" name="namora" value={form.namora} onChange={ch} type="select" opts={SN} />
          <Fld label="Queixa de relacionamentos" name="queixa_relacionamentos" value={form.queixa_relacionamentos} onChange={ch} />
          <Fld label="Costumava sair" name="costumava_sair" value={form.costumava_sair} onChange={ch} />
          <Fld label="Tem algum vício" name="tem_vicio" value={form.tem_vicio} onChange={ch} type="select" opts={SN} />
          <Fld label="Histórico de depressão" name="historico_depressao" value={form.historico_depressao} onChange={ch} type="select" opts={SN} />
          <Fld label="Demência" name="demencia" value={form.demencia} onChange={ch} type="select" opts={SN} />
          <Fld label="Concorda com cuidador" name="concorda_cuidador" value={form.concorda_cuidador} onChange={ch} type="select" opts={SN} />
          <div style={FULL}><Fld label="Mudanças de rotina" name="mudancas_rotina_adulto" value={form.mudancas_rotina_adulto} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Como envelheceram os pais" name="como_envelheceram_pais_adulto" value={form.como_envelheceram_pais_adulto} onChange={ch} type="textarea" rows={2} /></div>
          <Fld label="Lembra do médico que encaminhou" name="lembra_medico_encaminhou" value={form.lembra_medico_encaminhou} onChange={ch} type="select" opts={SN} />
        </>}
        <div style={FULL}><Fld label="Relacionamentos" name="relacionamentos" value={form.relacionamentos} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Lazer" name="lazer" value={form.lazer} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Rotina" name="rotina" value={form.rotina} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Relação com familiares" name="relacao_familiares" value={form.relacao_familiares} onChange={ch} type="textarea" rows={2} /></div>
        {isI && <div style={FULL}><ChkArr label="Atividades de estímulo cognitivo" name="atividades_estimulo_cognitivo"
          items={['Leitura', 'Palavras cruzadas', 'Jogos de tabuleiro', 'Música', 'Artesanato', 'Jardinagem', 'Culinária', 'Viagens', 'Grupos sociais', 'Dança', 'Meditação', 'Outras']}
          value={form.atividades_estimulo_cognitivo} onChange={ch} /></div>}
      </Sec>}

      {/* 6. Memória */}
      {isAI && <Sec title="6. MEMÓRIA">
        {[
          ['Esquece onde coloca objetos', 'memoria_esquece_objetos'],
          ['Troca objetos de lugar', 'memoria_troca_objetos'],
          ['Esquece nomes de pessoas', 'memoria_esquece_nomes'],
          ['Dificuldade para encontrar palavras', 'memoria_dificuldade_palavras'],
          ['Esquece o que aconteceu hoje', 'memoria_esquece_hoje'],
          ['Consegue relatar seu dia', 'memoria_relato_dia'],
          ['Esquece compromissos', 'memoria_esquece_compromissos'],
          ['Usa recursos para lembrar', 'memoria_recursos_lembrar'],
          ['Esquece eventos do passado', 'memoria_esquece_passado'],
          ['Conta a mesma história repetidamente', 'memoria_conta_repetido'],
          ['Família acha que é esquecido', 'memoria_familia_acha_esquecido'],
          ['Já se perdeu em lugar conhecido', 'memoria_perdeu_lugar_conhecido'],
        ].map(([label, name]) => (
          <Fld key={name} label={label} name={name} value={form[name]} onChange={ch} type="select" opts={['Sim', 'Não', 'Às vezes']} />
        ))}
      </Sec>}

      {/* 7. Sono */}
      {isAI && <Sec title="7. SONO">
        <Fld label="Sono" name="sono" value={form.sono} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
        <div style={FULL}><Fld label="Como é o sono" name="sono_como_e" value={form.sono_como_e} onChange={ch} type="textarea" rows={2} /></div>
        {isA && <Fld label="Duração" name="sono_duracao_adulto" value={form.sono_duracao_adulto} onChange={ch} />}
        {isA && <Fld label="Sono contínuo" name="sono_continuo_adulto" value={form.sono_continuo_adulto} onChange={ch} type="select" opts={SN} />}
        <Fld label="Dificuldade para dormir" name="sono_dificuldade_dormir" value={form.sono_dificuldade_dormir} onChange={ch} type="select" opts={SN} />
        <Fld label="Dificuldade iniciar/manter" name="sono_dificuldade_iniciar_manter" value={form.sono_dificuldade_iniciar_manter} onChange={ch} type="select" opts={SN} />
        <Fld label="Duração do sono" name="sono_duracao" value={form.sono_duracao} onChange={ch} />
        <Fld label="Com interrupções" name="sono_continuo_interrupcoes" value={form.sono_continuo_interrupcoes} onChange={ch} type="select" opts={SN} />
        <Fld label="Fala / movimenta durante o sono" name="sono_fala_movimenta" value={form.sono_fala_movimenta} onChange={ch} type="select" opts={SN} />
        <Fld label="Acorda fatigado" name="sono_acorda_fatigado" value={form.sono_acorda_fatigado} onChange={ch} type="select" opts={SN} />
        <Fld label="Sonolência diurna" name="sono_sonolencia_diurna" value={form.sono_sonolencia_diurna} onChange={ch} type="select" opts={SN} />
        <Fld label="Sonhos vívidos / pesadelos" name="sono_sonhos_vividos_pesadelos" value={form.sono_sonhos_vividos_pesadelos} onChange={ch} type="select" opts={SN} />
      </Sec>}

      {/* 8. Apetite */}
      {isAI && <Sec title="8. APETITE">
        <Fld label="Apetite" name="apetite" value={form.apetite} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
        <div style={FULL}><Fld label="Como é o apetite" name="apetite_como_e" value={form.apetite_como_e} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Apetite voraz / perda" name="apetite_voraz_perda" value={form.apetite_voraz_perda} onChange={ch} type="select" opts={['Voraz', 'Perda', 'Normal']} />
        <Fld label="Mudança de hábitos" name="apetite_mudanca_habitos" value={form.apetite_mudanca_habitos} onChange={ch} type="select" opts={SN} />
        <Fld label="Mudança de peso" name="apetite_mudanca_peso" value={form.apetite_mudanca_peso} onChange={ch} />
        <Fld label="Mudança de preferência" name="apetite_mudanca_preferencia" value={form.apetite_mudanca_preferencia} onChange={ch} type="select" opts={SN} />
      </Sec>}

      {/* 9. Saúde */}
      <Sec title="9. SAÚDE">
        <Fld label="Dificuldade auditiva" name="audicao_dificuldade" value={form.audicao_dificuldade} onChange={ch} type="select" opts={SN} />
        <Fld label="Qual ouvido" name="audicao_qual_ouvido" value={form.audicao_qual_ouvido} onChange={ch} />
        <Fld label="Dificuldade visual" name="visao_dificuldade" value={form.visao_dificuldade} onChange={ch} type="select" opts={SN} />
        <Fld label="Qual olho" name="visao_qual_olho" value={form.visao_qual_olho} onChange={ch} />
        <Fld label="Usa óculos" name="visao_usa_oculos" value={form.visao_usa_oculos} onChange={ch} type="select" opts={SN} />
        <Fld label="Dificuldade de fala" name="fono_dificuldade_fala" value={form.fono_dificuldade_fala} onChange={ch} type="select" opts={SN} />
        <Fld label="Dificuldade motora" name="motricidade_dificuldade" value={form.motricidade_dificuldade} onChange={ch} type="select" opts={SN} />
        <Fld label="Sensação de estar atrapalhado" name="neurologico_atrapalhado" value={form.neurologico_atrapalhado} onChange={ch} type="select" opts={SN} />
        <Fld label="Bateu a cabeça" name="neurologico_bateu_cabeca" value={form.neurologico_bateu_cabeca} onChange={ch} type="select" opts={SN} />
        <Fld label="Traumatismo craniano" name="neurologico_traumatismo" value={form.neurologico_traumatismo} onChange={ch} type="select" opts={SN} />
        <Fld label="Atividade física" name="atividade_fisica" value={form.atividade_fisica} onChange={ch} />
        <Fld label="Uso de álcool" name="uso_alcool" value={form.uso_alcool} onChange={ch} type="select" opts={SN} />
        <Fld label="Álcool — frequência/quantidade" name="alcool_frequencia_quantidade" value={form.alcool_frequencia_quantidade} onChange={ch} />
        <Fld label="Uso de drogas" name="uso_drogas" value={form.uso_drogas} onChange={ch} type="select" opts={SN} />
        <Fld label="Drogas — frequência/quantidade" name="drogas_frequencia_quantidade" value={form.drogas_frequencia_quantidade} onChange={ch} />
        <Fld label="Drogas — em tratamento" name="drogas_tratamento" value={form.drogas_tratamento} onChange={ch} type="select" opts={SN} />
        {isAI && <>
          <Fld label="Flutuações no estado geral" name="flutuacoes_estado_geral" value={form.flutuacoes_estado_geral} onChange={ch} type="select" opts={SN} />
          <Fld label="Comprometimento trabalho/social" name="comprometimento_trabalho_social" value={form.comprometimento_trabalho_social} onChange={ch} type="select" opts={SN} />
          <Fld label="Alteração de humor/comportamento" name="alteracao_humor_comportamento" value={form.alteracao_humor_comportamento} onChange={ch} type="select" opts={SN} />
          <Fld label="Percepções diferentes" name="percepcoes_diferentes" value={form.percepcoes_diferentes} onChange={ch} type="select" opts={SN} />
        </>}
        {isA && <Fld label="Desmaios" name="desmaios_adulto" value={form.desmaios_adulto} onChange={ch} type="select" opts={SN} />}
        {isC && <>
          <Fld label="Queda com perda de consciência" name="queda_perda_consciencia" value={form.queda_perda_consciencia} onChange={ch} type="select" opts={SN} />
          <Fld label="Desmaios" name="desmaios" value={form.desmaios} onChange={ch} type="select" opts={SN} />
          <Fld label="Operação / cirurgia" name="operacao_cirurgia" value={form.operacao_cirurgia} onChange={ch} type="select" opts={SN} />
          <Fld label="Motivo da operação" name="operacao_motivo" value={form.operacao_motivo} onChange={ch} />
          <div style={FULL}><Fld label="Atendimentos com especialistas" name="atendimentos_especialistas" value={form.atendimentos_especialistas} onChange={ch} type="textarea" rows={2} /></div>
        </>}
        <div style={FULL}><ChkArr label="Doenças preexistentes" name="doencas_preexistentes"
          items={['Hipertensão', 'Diabetes mellitus', 'AVC', 'Parkinson', 'Alzheimer', 'Epilepsia', 'Depressão', 'Ansiedade', 'TDAH', 'Hipotireoidismo', 'Doença renal', 'Doença cardíaca', 'Câncer', 'HIV', 'Outras']}
          value={form.doencas_preexistentes} onChange={ch} /></div>
      </Sec>

      {/* 10. Medicamentos & Exames */}
      <Sec title="10. MEDICAMENTOS & EXAMES">
        <div style={FULL}><Fld label="Medicamentos em uso" name="medicamentos" value={form.medicamentos} onChange={ch} type="textarea" rows={3} /></div>
        <div style={FULL}><Fld label="Finalidade dos medicamentos" name="medicamentos_finalidade" value={form.medicamentos_finalidade} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Uso prolongado" name="medicamentos_uso_prolongado" value={form.medicamentos_uso_prolongado} onChange={ch} type="select" opts={SN} />
        <Fld label="Tomografia" name="exame_tomografia" value={form.exame_tomografia} onChange={ch} type="select" opts={[...SN, 'Não solicitado']} />
        <Fld label="Ressonância" name="exame_ressonancia" value={form.exame_ressonancia} onChange={ch} type="select" opts={[...SN, 'Não solicitado']} />
        <Fld label="EEG" name="exame_eeg" value={form.exame_eeg} onChange={ch} type="select" opts={[...SN, 'Não solicitado']} />
        <div style={FULL}><Fld label="Outros exames" name="exames" value={form.exames} onChange={ch} type="textarea" rows={2} /></div>
      </Sec>

      {/* 11. Epilepsia */}
      <Sec title="11. EPILEPSIA">
        <Fld label="Epilepsia" name="epilepsia" value={form.epilepsia} onChange={ch} type="select" opts={SN} />
        {form.epilepsia === 'Sim' && <>
          <Fld label="Início das crises" name="epilepsia_quando_iniciaram_crises" value={form.epilepsia_quando_iniciaram_crises} onChange={ch} />
          <Fld label="Fatores precipitantes" name="epilepsia_fatores_precipitantes" value={form.epilepsia_fatores_precipitantes} onChange={ch} />
          <Fld label="Aura" name="epilepsia_aura" value={form.epilepsia_aura} onChange={ch} type="select" opts={SN} />
          <Fld label="Área do corpo afetada" name="epilepsia_area_corpo" value={form.epilepsia_area_corpo} onChange={ch} />
          <Fld label="Progressão" name="epilepsia_progressao" value={form.epilepsia_progressao} onChange={ch} />
          <Fld label="Duração das crises" name="epilepsia_duracao" value={form.epilepsia_duracao} onChange={ch} />
          <Fld label="Momento do dia" name="epilepsia_momento_dia" value={form.epilepsia_momento_dia} onChange={ch} />
          <Fld label="O que sentiu durante" name="epilepsia_sentiu_durante" value={form.epilepsia_sentiu_durante} onChange={ch} />
          <Fld label="Frequência" name="epilepsia_frequencia" value={form.epilepsia_frequencia} onChange={ch} />
          <Fld label="Fatores para evitar/induzir" name="epilepsia_evitar_induzir" value={form.epilepsia_evitar_induzir} onChange={ch} />
          <div style={FULL}><Fld label="Dificuldades cognitivas associadas" name="epilepsia_dificuldades_cognitivas" value={form.epilepsia_dificuldades_cognitivas} onChange={ch} type="textarea" rows={2} /></div>
        </>}
      </Sec>

      {/* 12. Histórico Familiar */}
      <Sec title="12. HISTÓRICO FAMILIAR">
        <Fld label="Memória" name="historico_familiar_memoria" value={form.historico_familiar_memoria} onChange={ch} type="select" opts={SN} />
        <Fld label="Pressão alta" name="historico_familiar_pressao_alta" value={form.historico_familiar_pressao_alta} onChange={ch} type="select" opts={SN} />
        <Fld label="Psiquiátrico" name="historico_familiar_psiquiatrico" value={form.historico_familiar_psiquiatrico} onChange={ch} type="select" opts={SN} />
        <Fld label="Neurológico" name="historico_familiar_neurologico" value={form.historico_familiar_neurologico} onChange={ch} type="select" opts={SN} />
        <Fld label="Dependência química" name="historico_familiar_dependencia" value={form.historico_familiar_dependencia} onChange={ch} type="select" opts={SN} />
        <div style={FULL}><Fld label="Outras condições" name="historico_familiar_outras" value={form.historico_familiar_outras} onChange={ch} type="textarea" rows={2} /></div>
      </Sec>

      {/* 13. Sintomas — adulto/idoso */}
      {isAI && <Sec title="13. SINTOMAS">
        <div style={FULL}><ChkArr label="Sintomas cognitivos" name="sintomas_cognitivos" items={['Esquecimento', 'Desorientação', 'Confusão mental', 'Dificuldade de concentração', 'Lentidão de raciocínio', 'Dificuldade de planejamento', 'Dificuldade de linguagem']} value={form.sintomas_cognitivos} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Sintomas emocionais" name="sintomas_emocionais" items={['Tristeza', 'Ansiedade', 'Irritabilidade', 'Apatia', 'Labilidade emocional', 'Agitação', 'Agressividade', 'Euforia', 'Medo excessivo']} value={form.sintomas_emocionais} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Sintomas motores" name="sintomas_motoros" items={['Tremor', 'Rigidez', 'Bradicinesia', 'Discinesia', 'Marcha instável', 'Quedas frequentes', 'Fraqueza muscular']} value={form.sintomas_motoros} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Sintomas sensoriais" name="sintomas_sensoriais" items={['Perda auditiva', 'Perda visual', 'Parestesias', 'Dor crônica', 'Alteração de olfato/paladar']} value={form.sintomas_sensoriais} onChange={ch} /></div>
        {isI && <>
          <div style={FULL}><ChkArr label="Memória (idoso)" name="sintomas_memoria_idoso" items={['Esquece nomes', 'Perde objetos', 'Repete perguntas', 'Esquece compromissos', 'Esquece eventos recentes', 'Não reconhece pessoas', 'Desorientação temporal', 'Desorientação espacial']} value={form.sintomas_memoria_idoso} onChange={ch} /></div>
          <div style={FULL}><ChkArr label="Atenção (idoso)" name="sintomas_atencao_idoso" items={['Distração fácil', 'Dificuldade de concentração', 'Não consegue fazer duas coisas ao mesmo tempo']} value={form.sintomas_atencao_idoso} onChange={ch} /></div>
          <div style={FULL}><ChkArr label="Função executiva (idoso)" name="sintomas_funcao_executiva_idoso" items={['Dificuldade de planejamento', 'Dificuldade de organização', 'Impulsividade', 'Tomada de decisão prejudicada', 'Dificuldade em tarefas complexas']} value={form.sintomas_funcao_executiva_idoso} onChange={ch} /></div>
          <div style={FULL}><ChkArr label="Humor / comportamento (idoso)" name="sintomas_humor_comportamento" items={['Depressão', 'Ansiedade', 'Apatia', 'Irritabilidade', 'Paranoia', 'Alucinações', 'Comportamento repetitivo']} value={form.sintomas_humor_comportamento} onChange={ch} /></div>
          <div style={FULL}><ChkArr label="Desinibição / agitação (idoso)" name="sintomas_desinibicao_agitacao_idoso" items={['Desinibição sexual', 'Linguagem inapropriada', 'Agitação noturna', 'Wandering', 'Agressividade verbal', 'Agressividade física']} value={form.sintomas_desinibicao_agitacao_idoso} onChange={ch} /></div>
          <div style={FULL}><ChkArr label="Físico / motor (idoso)" name="sintomas_fisicos_motores_idoso" items={['Tremor', 'Rigidez', 'Marcha instável', 'Quedas', 'Fraqueza', 'Incontinência urinária', 'Incontinência fecal']} value={form.sintomas_fisicos_motores_idoso} onChange={ch} /></div>
          <div style={FULL}><ChkArr label="Sensorial (idoso)" name="sintomas_sensoriais_idoso" items={['Baixa visão', 'Perda auditiva', 'Alteração de olfato', 'Alteração de paladar', 'Dor crônica']} value={form.sintomas_sensoriais_idoso} onChange={ch} /></div>
        </>}
        <div style={FULL}><ChkArr label="Memória" name="memoria" items={['Imediata prejudicada', 'Trabalho prejudicada', 'Episódica prejudicada', 'Semântica prejudicada', 'Procedural prejudicada', 'Confabulação']} value={form.memoria} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Atenção" name="atencao" items={['Sustentada prejudicada', 'Seletiva prejudicada', 'Dividida prejudicada', 'Alternada prejudicada']} value={form.atencao} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Função executiva" name="funcao_executiva" items={['Planejamento prejudicado', 'Flexibilidade cognitiva reduzida', 'Controle inibitório reduzido', 'Memória de trabalho reduzida', 'Fluência verbal reduzida']} value={form.funcao_executiva} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Humor / personalidade" name="humor_personalidade" items={['Depressão', 'Ansiedade', 'Apatia', 'Irritabilidade', 'Labilidade emocional', 'Paranoia', 'Euforia', 'Impulsividade', 'Desinibição']} value={form.humor_personalidade} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Resolução de problemas" name="sintomas_resolucao_problemas" items={['Dificuldade para resolver problemas simples', 'Não consegue planejar', 'Erros em atividades habituais']} value={form.sintomas_resolucao_problemas} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Linguagem / matemática" name="sintomas_linguagem_matematica" items={['Dificuldade de leitura', 'Dificuldade de escrita', 'Dificuldade de cálculo', 'Dificuldade de nomeação', 'Dificuldade de compreensão']} value={form.sintomas_linguagem_matematica} onChange={ch} /></div>
      </Sec>}

      {/* 14. Observações clínicas */}
      {isAI && <Sec title="14. OBSERVAÇÕES CLÍNICAS">
        <div style={FULL}><Fld label="Como o paciente se vê" name="observacoes_psicologicas_como_se_ve" value={form.observacoes_psicologicas_como_se_ve} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Consegue fazer o que deseja" name="observacoes_consegue_fazer_deseja" value={form.observacoes_consegue_fazer_deseja} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Proativo ou passivo" name="observacoes_proativo_passivo" value={form.observacoes_proativo_passivo} onChange={ch} type="select" opts={['Proativo', 'Passivo', 'Misto']} />
        <div style={FULL}><Fld label="Estado emocional" name="observacoes_emocional" value={form.observacoes_emocional} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Reação à privação / perda" name="observacoes_reacao_privacao" value={form.observacoes_reacao_privacao} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Observações gerais" name="observacoes_gerais" value={form.observacoes_gerais} onChange={ch} type="textarea" rows={3} /></div>
      </Sec>}

      {/* ===== INFANTIL ===== */}
      {isC && <>
        <Sec title="15. DADOS DOS PAIS">
          <Fld label="Nome do pai" name="pai_nome" value={form.pai_nome} onChange={ch} />
          <Fld label="Idade do pai" name="pai_idade" value={form.pai_idade} onChange={ch} />
          <Fld label="Ocupação do pai" name="pai_ocupacao" value={form.pai_ocupacao} onChange={ch} />
          <Fld label="Escolaridade do pai" name="pai_escolaridade" value={form.pai_escolaridade} onChange={ch} />
          <Fld label="Descendência do pai" name="pai_descendencia" value={form.pai_descendencia} onChange={ch} />
          <Fld label="Nome da mãe" name="mae_nome" value={form.mae_nome} onChange={ch} />
          <Fld label="Idade da mãe" name="mae_idade" value={form.mae_idade} onChange={ch} />
          <Fld label="Ocupação da mãe" name="mae_ocupacao" value={form.mae_ocupacao} onChange={ch} />
          <Fld label="Escolaridade da mãe" name="mae_escolaridade" value={form.mae_escolaridade} onChange={ch} />
          <Fld label="Descendência da mãe" name="mae_descendencia" value={form.mae_descendencia} onChange={ch} />
          <Fld label="Estado civil dos pais" name="estado_civil_pais" value={form.estado_civil_pais} onChange={ch} />
          <Fld label="Separação — idade da criança" name="separacao_idade_crianca" value={form.separacao_idade_crianca} onChange={ch} />
          <Fld label="Custódia legal" name="custodia_legal" value={form.custodia_legal} onChange={ch} />
          <Fld label="Não mora com os pais — motivo" name="nao_mora_pais_motivo" value={form.nao_mora_pais_motivo} onChange={ch} />
          <Fld label="Responsável legal" name="responsavel_legal_nome" value={form.responsavel_legal_nome} onChange={ch} />
          <Fld label="Pais consanguíneos" name="pais_consanguineos" value={form.pais_consanguineos} onChange={ch} type="select" opts={SN} />
          <Fld label="Grau de parentesco" name="pais_grau_parentesco" value={form.pais_grau_parentesco} onChange={ch} />
          <div style={FULL}><Fld label="Relacionamento dos pais entre si" name="relacionamento_pais" value={form.relacionamento_pais} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Relacionamento mãe / criança" name="relacionamento_mae_crianca" value={form.relacionamento_mae_crianca} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Relacionamento pai / criança" name="relacionamento_pai_crianca" value={form.relacionamento_pai_crianca} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Relacionamento com irmãos" name="relacionamento_irmaos" value={form.relacionamento_irmaos} onChange={ch} type="textarea" rows={2} /></div>
        </Sec>

        <Sec title="16. GESTAÇÃO">
          <Fld label="Criança foi desejada" name="crianca_foi_desejada" value={form.crianca_foi_desejada} onChange={ch} type="select" opts={SN} />
          <Fld label="Posição nas gestações" name="posicao_gestacoes" value={form.posicao_gestacoes} onChange={ch} />
          <Fld label="Abortos naturais" name="abortos_naturais" value={form.abortos_naturais} onChange={ch} />
          <Fld label="Abortos provocados" name="abortos_provocados" value={form.abortos_provocados} onChange={ch} />
          <Fld label="Natimortos" name="natimortos" value={form.natimortos} onChange={ch} type="select" opts={SN} />
          <Fld label="Causa — natimortos" name="natimortos_causa" value={form.natimortos_causa} onChange={ch} />
          <Fld label="Duração (semanas)" name="gestacao_duracao" value={form.gestacao_duracao} onChange={ch} />
          <Fld label="Gestação planejada" name="gestacao_planejada" value={form.gestacao_planejada} onChange={ch} type="select" opts={SN} />
          <Fld label="Gestação desejada" name="gestacao_desejada" value={form.gestacao_desejada} onChange={ch} type="select" opts={SN} />
          <Fld label="Pré-natal" name="gestacao_pre_natal" value={form.gestacao_pre_natal} onChange={ch} type="select" opts={SN} />
          <Fld label="Doenças na gestação" name="gestacao_doencas" value={form.gestacao_doencas} onChange={ch} />
          <Fld label="Medicações na gestação" name="gestacao_medicacoes" value={form.gestacao_medicacoes} onChange={ch} />
          <Fld label="Enjoo" name="gestacao_enjoo" value={form.gestacao_enjoo} onChange={ch} type="select" opts={SN} />
          <Fld label="Traumatismos" name="gestacao_traumatismos" value={form.gestacao_traumatismos} onChange={ch} type="select" opts={SN} />
          <Fld label="Mãe fumou" name="gestacao_mae_cigarro" value={form.gestacao_mae_cigarro} onChange={ch} type="select" opts={SN} />
          <Fld label="Mãe usou álcool" name="gestacao_mae_alcool" value={form.gestacao_mae_alcool} onChange={ch} type="select" opts={SN} />
          <Fld label="Mãe usou drogas" name="gestacao_mae_drogas" value={form.gestacao_mae_drogas} onChange={ch} type="select" opts={SN} />
          <Fld label="Quando sentiu mexer" name="gestacao_quando_mexeu" value={form.gestacao_quando_mexeu} onChange={ch} />
          <Fld label="Participação do pai" name="gestacao_participacao_pai" value={form.gestacao_participacao_pai} onChange={ch} />
          <div style={FULL}><Fld label="Intercorrências na gestação" name="gestacao_intercorrencias" value={form.gestacao_intercorrencias} onChange={ch} type="textarea" rows={2} /></div>
        </Sec>

        <Sec title="17. PARTO & NASCIMENTO">
          <Fld label="Tipo de parto" name="parto_tipo" value={form.parto_tipo} onChange={ch} type="select" opts={['Normal', 'Cesárea', 'Fórceps', 'Vácuo extrator']} />
          <Fld label="Local do parto" name="parto_local" value={form.parto_local} onChange={ch} type="select" opts={['Hospital', 'Casa', 'UBS', 'Outro']} />
          <Fld label="Duração do parto" name="parto_duracao" value={form.parto_duracao} onChange={ch} />
          <Fld label="Nasceu a termo" name="parto_nasceu_termo" value={form.parto_nasceu_termo} onChange={ch} type="select" opts={SN} />
          <Fld label="Chorou logo" name="parto_chorou_logo" value={form.parto_chorou_logo} onChange={ch} type="select" opts={SN} />
          <Fld label="Berçário — dias" name="parto_bercario_dias" value={form.parto_bercario_dias} onChange={ch} />
          <Fld label="Berçário — motivo" name="parto_bercario_motivo" value={form.parto_bercario_motivo} onChange={ch} />
          <Fld label="Peso ao nascer" name="peso_nascimento" value={form.peso_nascimento} onChange={ch} />
          <Fld label="Altura ao nascer" name="altura_nascimento" value={form.altura_nascimento} onChange={ch} />
          <Fld label="APGAR" name="apgar" value={form.apgar} onChange={ch} />
          <Fld label="Primeira mamada — quando" name="primeira_mamada_quando" value={form.primeira_mamada_quando} onChange={ch} />
          <Fld label="Primeira mamada — como" name="primeira_mamada_como" value={form.primeira_mamada_como} onChange={ch} />
          <div style={FULL}><Fld label="Intercorrências no parto" name="parto_intercorrencias" value={form.parto_intercorrencias} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><ChkArr label="Condição ao nascer" name="parto_condicao_nascer" items={['Cianose', 'Icterícia', 'Convulsão', 'UTI neonatal', 'Ventilação mecânica', 'Anóxia', 'Sepse', 'Normal']} value={form.parto_condicao_nascer} onChange={ch} /></div>
          <div style={FULL}><ChkArr label="Condições nos primeiros anos" name="primeiros_anos_condicoes" items={['Convulsões febris', 'Meningite', 'Encefalite', 'Hospitalizações frequentes', 'Problemas alimentares', 'Alergias graves', 'Normal']} value={form.primeiros_anos_condicoes} onChange={ch} /></div>
        </Sec>

        <Sec title="18. DESENVOLVIMENTO">
          <Fld label="Sorriu" name="desenvolvimento_sorriu" value={form.desenvolvimento_sorriu} onChange={ch} />
          <Fld label="Virou sozinho" name="desenvolvimento_virou_sozinho" value={form.desenvolvimento_virou_sozinho} onChange={ch} />
          <Fld label="Sentou" name="desenvolvimento_motor_sentou" value={form.desenvolvimento_motor_sentou} onChange={ch} />
          <Fld label="Engatinhou" name="desenvolvimento_motor_engatinhou" value={form.desenvolvimento_motor_engatinhou} onChange={ch} />
          <Fld label="Andou" name="desenvolvimento_motor_andou" value={form.desenvolvimento_motor_andou} onChange={ch} />
          <Fld label="Correu" name="desenvolvimento_motor_correu" value={form.desenvolvimento_motor_correu} onChange={ch} />
          <Fld label="Tico-tico" name="desenvolvimento_motor_tico_tico" value={form.desenvolvimento_motor_tico_tico} onChange={ch} />
          <Fld label="Bicicleta" name="desenvolvimento_motor_bicicleta" value={form.desenvolvimento_motor_bicicleta} onChange={ch} />
          <Fld label="Dentição" name="desenvolvimento_denticao" value={form.desenvolvimento_denticao} onChange={ch} />
          <Fld label="Balbuciou" name="desenvolvimento_balbuciou" value={form.desenvolvimento_balbuciou} onChange={ch} />
          <Fld label="Primeiras palavras" name="desenvolvimento_linguagem_primeiras_palavras" value={form.desenvolvimento_linguagem_primeiras_palavras} onChange={ch} />
          <Fld label="Frases" name="desenvolvimento_linguagem_frases" value={form.desenvolvimento_linguagem_frases} onChange={ch} />
          <div style={FULL}><Fld label="Linguagem atual" name="desenvolvimento_linguagem_atual" value={form.desenvolvimento_linguagem_atual} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Dificuldades de linguagem" name="desenvolvimento_linguagem_dificuldade" value={form.desenvolvimento_linguagem_dificuldade} onChange={ch} type="textarea" rows={2} /></div>
          <Fld label="Amarrou o sapato" name="desenvolvimento_amarrou_sapato" value={form.desenvolvimento_amarrou_sapato} onChange={ch} />
          <Fld label="Vestiu sozinho" name="desenvolvimento_vestiu_sozinho" value={form.desenvolvimento_vestiu_sozinho} onChange={ch} />
          <Fld label="Comeu sozinho" name="desenvolvimento_comeu_sozinho" value={form.desenvolvimento_comeu_sozinho} onChange={ch} />
          <Fld label="Banho sozinho" name="desenvolvimento_banho_sozinho" value={form.desenvolvimento_banho_sozinho} onChange={ch} />
          <Fld label="Escolheu roupa" name="desenvolvimento_escolheu_roupa" value={form.desenvolvimento_escolheu_roupa} onChange={ch} />
          <Fld label="Conhece direita/esquerda" name="desenvolvimento_conhece_direita_esquerda" value={form.desenvolvimento_conhece_direita_esquerda} onChange={ch} type="select" opts={SN} />
          <Fld label="Organizado" name="desenvolvimento_organizado" value={form.desenvolvimento_organizado} onChange={ch} type="select" opts={SN} />
          <Fld label="Rói unhas" name="desenvolvimento_roi_unhas" value={form.desenvolvimento_roi_unhas} onChange={ch} type="select" opts={SN} />
          <Fld label="Morde lábios" name="desenvolvimento_morde_labios" value={form.desenvolvimento_morde_labios} onChange={ch} type="select" opts={SN} />
          <Fld label="Controle esfincteriano diurno" name="controle_esfincteriano_diurno" value={form.controle_esfincteriano_diurno} onChange={ch} />
          <Fld label="Parou de fazer xixi na cama" name="controle_parou_xixi_cama" value={form.controle_parou_xixi_cama} onChange={ch} />
          <Fld label="Controle esfincteriano noturno" name="controle_esfincteriano_noturno" value={form.controle_esfincteriano_noturno} onChange={ch} />
          <div style={FULL}><ChkArr label="Desenvolvimento social" name="desenvolvimento_social" items={['Contato visual adequado', 'Responde ao nome', 'Imita gestos', 'Brinca com outras crianças', 'Faz amizades facilmente', 'Jogo simbólico', 'Apego seletivo', 'Timidez excessiva', 'Isolamento']} value={form.desenvolvimento_social} onChange={ch} /></div>
        </Sec>

        <Sec title="19. SONO (INFANTIL)">
          <Fld label="Sono" name="sono_infantil" value={form.sono_infantil} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
          <Fld label="Horário de dormir" name="sono_infantil_horario_dormir" value={form.sono_infantil_horario_dormir} onChange={ch} />
          <Fld label="Horário de acordar" name="sono_infantil_horario_acordar" value={form.sono_infantil_horario_acordar} onChange={ch} />
          <Fld label="Dorme sozinho" name="sono_infantil_sozinho" value={form.sono_infantil_sozinho} onChange={ch} type="select" opts={SN} />
          <Fld label="Cama separada" name="sono_infantil_cama_separada" value={form.sono_infantil_cama_separada} onChange={ch} type="select" opts={SN} />
          <Fld label="Ficou com os pais até quando" name="sono_infantil_ate_quando_pais" value={form.sono_infantil_ate_quando_pais} onChange={ch} />
          <Fld label="Objeto específico" name="sono_infantil_objeto_especifico" value={form.sono_infantil_objeto_especifico} onChange={ch} type="select" opts={SN} />
          <div style={FULL}><ChkArr label="Características do sono" name="sono_infantil_caracteristicas" items={['Insônia', 'Pesadelos', 'Terror noturno', 'Sonambulismo', 'Bruxismo', 'Ronco', 'Apneia', 'Enurese noturna', 'Sono agitado']} value={form.sono_infantil_caracteristicas} onChange={ch} /></div>
        </Sec>

        <Sec title="20. ESCOLA">
          <Fld label="Nome da escola" name="escola_nome" value={form.escola_nome} onChange={ch} />
          <Fld label="Tipo" name="escola_tipo" value={form.escola_tipo} onChange={ch} type="select" opts={['Pública', 'Particular', 'Especial']} />
          <Fld label="Ano / série" name="escola_ano" value={form.escola_ano} onChange={ch} />
          <Fld label="Período" name="escola_periodo" value={form.escola_periodo} onChange={ch} type="select" opts={['Manhã', 'Tarde', 'Integral']} />
          <Fld label="Professor — nome" name="escola_professor_nome" value={form.escola_professor_nome} onChange={ch} />
          <Fld label="Professor — telefone" name="escola_professor_telefone" value={form.escola_professor_telefone} onChange={ch} />
          <Fld label="Idade de entrada" name="escola_idade_entrada" value={form.escola_idade_entrada} onChange={ch} />
          <Fld label="Adaptação" name="escola_adaptacao" value={form.escola_adaptacao} onChange={ch} type="select" opts={['Boa', 'Regular', 'Difícil']} />
          <Fld label="Alfabetizado" name="escola_alfabetizado" value={form.escola_alfabetizado} onChange={ch} type="select" opts={SN} />
          <Fld label="Idade de início da leitura" name="escola_idade_leitura" value={form.escola_idade_leitura} onChange={ch} />
          <Fld label="Bom desempenho" name="escola_bom_desempenho" value={form.escola_bom_desempenho} onChange={ch} type="select" opts={SN} />
          <Fld label="Repetência" name="escola_repetencia" value={form.escola_repetencia} onChange={ch} type="select" opts={SN} />
          <Fld label="Gosta de estudar" name="escola_gosta_estudar" value={form.escola_gosta_estudar} onChange={ch} type="select" opts={SN} />
          <Fld label="Pais ajudam" name="escola_pais_ajudam" value={form.escola_pais_ajudam} onChange={ch} type="select" opts={SN} />
          <Fld label="Matéria melhor" name="escola_materia_melhor" value={form.escola_materia_melhor} onChange={ch} />
          <Fld label="Matéria pior" name="escola_materia_pior" value={form.escola_materia_pior} onChange={ch} />
          <Fld label="Relacionamento com colegas" name="escola_relacionamento_colegas" value={form.escola_relacionamento_colegas} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
          <Fld label="Relacionamento com professores" name="escola_relacionamento_professores" value={form.escola_relacionamento_professores} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
          <Fld label="Desempenho geral" name="escola_desempenho" value={form.escola_desempenho} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
          <Fld label="Dificuldade de escrita" name="escola_dificuldade_escrita" value={form.escola_dificuldade_escrita} onChange={ch} type="select" opts={SN} />
          <Fld label="Dificuldade de leitura" name="escola_dificuldade_leitura" value={form.escola_dificuldade_leitura} onChange={ch} type="select" opts={SN} />
          <Fld label="Dificuldade de matemática" name="escola_dificuldade_matematica" value={form.escola_dificuldade_matematica} onChange={ch} type="select" opts={SN} />
          <div style={FULL}><Fld label="Queixa escolar" name="escola_queixa" value={form.escola_queixa} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Outras dificuldades" name="escola_dificuldade_outras" value={form.escola_dificuldade_outras} onChange={ch} type="textarea" rows={2} /></div>
        </Sec>

        <Sec title="21. ALIMENTAÇÃO & COMPORTAMENTO">
          <Fld label="Mamadeira" name="alimentacao_mamadeira" value={form.alimentacao_mamadeira} onChange={ch} type="select" opts={SN} />
          <Fld label="Parou a mamadeira" name="alimentacao_mamadeira_parou" value={form.alimentacao_mamadeira_parou} onChange={ch} />
          <Fld label="Chupeta" name="alimentacao_chupeta" value={form.alimentacao_chupeta} onChange={ch} type="select" opts={SN} />
          <Fld label="Come sozinho" name="alimentacao_come_sozinho" value={form.alimentacao_come_sozinho} onChange={ch} type="select" opts={SN} />
          <Fld label="Almoça onde" name="alimentacao_almoca_onde" value={form.alimentacao_almoca_onde} onChange={ch} />
          <Fld label="Janta onde" name="alimentacao_janta_onde" value={form.alimentacao_janta_onde} onChange={ch} />
          <Fld label="Assiste TV" name="assiste_tv" value={form.assiste_tv} onChange={ch} type="select" opts={SN} />
          <Fld label="Uso de telas" name="uso_telas" value={form.uso_telas} onChange={ch} />
          <Fld label="Comportamento desde a idade" name="comportamento_desde_idade" value={form.comportamento_desde_idade} onChange={ch} />
          <Fld label="Parecido com familiar" name="comportamento_familia_semelhante" value={form.comportamento_familia_semelhante} onChange={ch} type="select" opts={SN} />
          <div style={FULL}><Fld label="Rotina do dia de semana" name="rotina_dia_semana" value={form.rotina_dia_semana} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Brincadeiras preferidas" name="brincadeiras_preferidas" value={form.brincadeiras_preferidas} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Atividades extracurriculares" name="atividades_extra_escolares" value={form.atividades_extra_escolares} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><Fld label="Comportamento geral" name="comportamento_infantil" value={form.comportamento_infantil} onChange={ch} type="textarea" rows={2} /></div>
          <div style={FULL}><ChkArr label="Comportamento (checklist)" name="comportamento_geral" items={['Agitado', 'Impulsivo', 'Agressivo', 'Ansioso', 'Tímido', 'Irritável', 'Opositivo', 'Hiperativo', 'Distraído', 'Dependente', 'Chora muito', 'Tiques', 'Birras frequentes', 'Calmo', 'Sociável', 'Obediente']} value={form.comportamento_geral} onChange={ch} /></div>
        </Sec>
      </>}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
