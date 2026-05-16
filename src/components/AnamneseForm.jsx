import React, { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ChevronDown, ChevronUp, CheckCircle2, Loader2 } from 'lucide-react'

const S = {
  green: '#2E7D32', greenL: '#4CAF50',
  border: 'rgba(255,255,255,0.08)', muted: 'rgba(255,255,255,0.45)',
}
const inp = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none', boxSizing: 'border-box',
}
const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 12 }
const FULL = { gridColumn: '1 / -1' }
const SN = ['Sim', 'Não']

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
  const [form, setForm] = useState({ patient_type: 'idoso' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    getDoc(doc(db, 'anamneses', patientId))
      .then(snap => { if (snap.exists()) setForm({ patient_type: 'idoso', ...snap.data() }) })
      .finally(() => setLoading(false))
  }, [patientId])

  const save = useCallback(async (data) => {
    if (!patientId) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'anamneses', patientId), { ...data, patient_type: 'idoso', updatedAt: serverTimestamp() }, { merge: true })
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

  if (!patientId) return <p style={{ color: S.muted, fontSize: 13, textAlign: 'center', padding: 40 }}>Selecione um paciente para preencher a anamnese.</p>
  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={22} color={S.greenL} style={{ animation: 'spin 1s linear infinite' }} /></div>

  return (
    <div>
      {/* Indicador de salvamento */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {saving && <><Loader2 size={12} color={S.muted} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 11, color: S.muted }}>Salvando...</span></>}
        {saved && !saving && <><CheckCircle2 size={12} color={S.greenL} /><span style={{ fontSize: 11, color: S.greenL }}>Salvo</span></>}
      </div>

      {/* Cabeçalho */}
      <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.2)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={GRID}>
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
        <Fld label="Local de nascimento" name="local_nascimento" value={form.local_nascimento} onChange={ch} />
        <Fld label="Qtd. filhos / netos" name="quantidade_filhos_netos" value={form.quantidade_filhos_netos} onChange={ch} />
        <Fld label="Reside com" name="reside_com" value={form.reside_com} onChange={ch} />
        <Fld label="Responsável" name="responsavel" value={form.responsavel} onChange={ch} />
        <Fld label="Parentesco do responsável" name="parentesco_responsavel" value={form.parentesco_responsavel} onChange={ch} />
        <Fld label="Acompanhante" name="acompanhante" value={form.acompanhante} onChange={ch} />
        <Fld label="Parentesco do acompanhante" name="parentesco_acompanhante" value={form.parentesco_acompanhante} onChange={ch} />
      </Sec>

      {/* 2. Queixas */}
      <Sec title="2. QUEIXAS">
        <div style={FULL}><Fld label="Queixas" name="queixas" value={form.queixas} onChange={ch} type="textarea" rows={3} /></div>
        <div style={FULL}><Fld label="Queixas cognitivas / emocionais" name="queixas_cognitivas_emocionais" value={form.queixas_cognitivas_emocionais} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Início dos sintomas" name="inicio_sintomas_data" value={form.inicio_sintomas_data} onChange={ch} />
        <div style={FULL}><Fld label="Desenvolvimento dos sintomas" name="desenvolvimento_sintomas" value={form.desenvolvimento_sintomas} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Frequência dos sintomas" name="frequencia_sintomas" value={form.frequencia_sintomas} onChange={ch} />
        <Fld label="Evolução nos últimos 6 meses" name="evolucao_sintomas_6meses" value={form.evolucao_sintomas_6meses} onChange={ch} />
        <Fld label="Fatores que aliviam" name="fatores_alivio_sintomas" value={form.fatores_alivio_sintomas} onChange={ch} />
      </Sec>

      {/* 3. Funcionalidade */}
      <Sec title="3. FUNCIONALIDADE">
        <Fld label="Trabalha atualmente" name="trabalha_atualmente" value={form.trabalha_atualmente} onChange={ch} type="select" opts={SN} />
        <Fld label="Atividades externas sozinho" name="executa_atividades_externas" value={form.executa_atividades_externas} onChange={ch} type="select" opts={SN} />
        <Fld label="Cuida do próprio dinheiro" name="cuida_proprio_dinheiro" value={form.cuida_proprio_dinheiro} onChange={ch} type="select" opts={SN} />
        <Fld label="Desde quando não cuida do dinheiro" name="desde_quando_nao_cuida_dinheiro" value={form.desde_quando_nao_cuida_dinheiro} onChange={ch} />
        <Fld label="Administra a casa" name="administra_casa_idoso" value={form.administra_casa_idoso} onChange={ch} type="select" opts={SN} />
        <Fld label="Quem administra a casa" name="quem_administra_casa" value={form.quem_administra_casa} onChange={ch} />
        <Fld label="Desde quando não administra" name="desde_quando_nao_administra" value={form.desde_quando_nao_administra} onChange={ch} />
        <Fld label="Erra na preparação de refeições" name="erra_preparacao_refeicoes" value={form.erra_preparacao_refeicoes} onChange={ch} type="select" opts={SN} />
        <Fld label="Dirige" name="dirige" value={form.dirige} onChange={ch} type="select" opts={SN} />
        <Fld label="Por que não dirige" name="porque_nao_dirige" value={form.porque_nao_dirige} onChange={ch} />
        <div style={FULL}><Fld label="Mudanças de socialização" name="mudancas_socializacao" value={form.mudancas_socializacao} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Quedas" name="quedas" value={form.quedas} onChange={ch} type="select" opts={SN} />
        <Fld label="Mobilidade" name="mobilidade" value={form.mobilidade} onChange={ch} />
        <Fld label="Auxiliares de locomoção" name="uso_auxiliares_locomocao" value={form.uso_auxiliares_locomocao} onChange={ch} />
        <div style={FULL}><ChkArr label="AVDs realizadas independentemente" name="avds_independentes"
          items={['Banho', 'Vestuário', 'Alimentação', 'Higiene pessoal', 'Transferência', 'Continência', 'Telefone', 'Compras', 'Cozinhar', 'Tarefas domésticas', 'Lavanderia', 'Transporte', 'Medicamentos', 'Finanças']}
          value={form.avds_independentes} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Preocupações físicas" name="preocupacoes_fisicas"
          items={['Dor crônica', 'Problemas cardíacos', 'Hipertensão', 'Diabetes', 'Problemas respiratórios', 'Osteoporose', 'Problemas renais', 'Outros']}
          value={form.preocupacoes_fisicas} onChange={ch} /></div>
      </Sec>

      {/* 4. Escolaridade & Trabalho */}
      <Sec title="4. ESCOLARIDADE & TRABALHO">
        <Fld label="Última série concluída" name="ultima_serie_concluida" value={form.ultima_serie_concluida} onChange={ch} />
        <Fld label="Quando estudou pela última vez" name="quando_estudou_ultima_vez" value={form.quando_estudou_ultima_vez} onChange={ch} />
        <Fld label="Ocupação atual" name="ocupacao_atual" value={form.ocupacao_atual} onChange={ch} />
        <div style={FULL}><Fld label="Trabalhos anteriores" name="trabalhos_anteriores" value={form.trabalhos_anteriores} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Aposentadoria" name="aposentadoria" value={form.aposentadoria} onChange={ch} type="select" opts={SN} />
        <Fld label="Reação à aposentadoria" name="reacao_aposentadoria" value={form.reacao_aposentadoria} onChange={ch} />
      </Sec>

      {/* 5. Social & Rotina */}
      <Sec title="5. SOCIAL & ROTINA">
        <Fld label="Família (frequência)" name="familia" value={form.familia} onChange={ch} />
        <Fld label="Amigos (frequência)" name="amigos" value={form.amigos} onChange={ch} />
        <Fld label="Grupo de afinidade" name="grupo_afinidade" value={form.grupo_afinidade} onChange={ch} />
        <div style={FULL}><Fld label="Relacionamentos" name="relacionamentos" value={form.relacionamentos} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Lazer" name="lazer" value={form.lazer} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Rotina" name="rotina" value={form.rotina} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Relação com familiares" name="relacao_familiares" value={form.relacao_familiares} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><ChkArr label="Atividades de estímulo cognitivo" name="atividades_estimulo_cognitivo"
          items={['Leitura', 'Palavras cruzadas', 'Jogos de tabuleiro', 'Música', 'Artesanato', 'Jardinagem', 'Culinária', 'Viagens', 'Grupos sociais', 'Dança', 'Meditação', 'Outras']}
          value={form.atividades_estimulo_cognitivo} onChange={ch} /></div>
      </Sec>

      {/* 6. Memória */}
      <Sec title="6. MEMÓRIA">
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
      </Sec>

      {/* 7. Sono */}
      <Sec title="7. SONO">
        <Fld label="Sono" name="sono" value={form.sono} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
        <div style={FULL}><Fld label="Como é o sono" name="sono_como_e" value={form.sono_como_e} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Dificuldade para dormir" name="sono_dificuldade_dormir" value={form.sono_dificuldade_dormir} onChange={ch} type="select" opts={SN} />
        <Fld label="Dificuldade iniciar/manter" name="sono_dificuldade_iniciar_manter" value={form.sono_dificuldade_iniciar_manter} onChange={ch} type="select" opts={SN} />
        <Fld label="Duração do sono" name="sono_duracao" value={form.sono_duracao} onChange={ch} />
        <Fld label="Com interrupções" name="sono_continuo_interrupcoes" value={form.sono_continuo_interrupcoes} onChange={ch} type="select" opts={SN} />
        <Fld label="Fala / movimenta durante o sono" name="sono_fala_movimenta" value={form.sono_fala_movimenta} onChange={ch} type="select" opts={SN} />
        <Fld label="Acorda fatigado" name="sono_acorda_fatigado" value={form.sono_acorda_fatigado} onChange={ch} type="select" opts={SN} />
        <Fld label="Sonolência diurna" name="sono_sonolencia_diurna" value={form.sono_sonolencia_diurna} onChange={ch} type="select" opts={SN} />
        <Fld label="Sonhos vívidos / pesadelos" name="sono_sonhos_vividos_pesadelos" value={form.sono_sonhos_vividos_pesadelos} onChange={ch} type="select" opts={SN} />
      </Sec>

      {/* 8. Apetite */}
      <Sec title="8. APETITE">
        <Fld label="Apetite" name="apetite" value={form.apetite} onChange={ch} type="select" opts={['Bom', 'Regular', 'Ruim']} />
        <div style={FULL}><Fld label="Como é o apetite" name="apetite_como_e" value={form.apetite_como_e} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Apetite voraz / perda" name="apetite_voraz_perda" value={form.apetite_voraz_perda} onChange={ch} type="select" opts={['Voraz', 'Perda', 'Normal']} />
        <Fld label="Mudança de hábitos" name="apetite_mudanca_habitos" value={form.apetite_mudanca_habitos} onChange={ch} type="select" opts={SN} />
        <Fld label="Mudança de peso" name="apetite_mudanca_peso" value={form.apetite_mudanca_peso} onChange={ch} />
        <Fld label="Mudança de preferência alimentar" name="apetite_mudanca_preferencia" value={form.apetite_mudanca_preferencia} onChange={ch} type="select" opts={SN} />
      </Sec>

      {/* 9. Saúde */}
      <Sec title="9. SAÚDE">
        <Fld label="Dificuldade auditiva" name="audicao_dificuldade" value={form.audicao_dificuldade} onChange={ch} type="select" opts={SN} />
        <Fld label="Qual ouvido" name="audicao_qual_ouvido" value={form.audicao_qual_ouvido} onChange={ch} />
        <Fld label="Dificuldade visual" name="visao_dificuldade" value={form.visao_dificuldade} onChange={ch} type="select" opts={SN} />
        <Fld label="Qual olho" name="visao_qual_olho" value={form.visao_qual_olho} onChange={ch} />
        <Fld label="Usa óculos" name="visao_usa_oculos" value={form.visao_usa_oculos} onChange={ch} type="select" opts={SN} />
        <Fld label="Dificuldade de fala" name="fono_dificuldade_fala" value={form.fono_dificuldade_fala} onChange={ch} type="select" opts={SN} />
        <Fld label="Dificuldade motora" name="motricidade_dificuldade" value={form.motricidade_dificuldade} onChange={ch} type="select" opts={SN} />
        <Fld label="Bateu a cabeça / traumatismo" name="neurologico_traumatismo" value={form.neurologico_traumatismo} onChange={ch} type="select" opts={SN} />
        <Fld label="Atividade física" name="atividade_fisica" value={form.atividade_fisica} onChange={ch} />
        <Fld label="Uso de álcool" name="uso_alcool" value={form.uso_alcool} onChange={ch} type="select" opts={SN} />
        <Fld label="Álcool — frequência/quantidade" name="alcool_frequencia_quantidade" value={form.alcool_frequencia_quantidade} onChange={ch} />
        <Fld label="Flutuações no estado geral" name="flutuacoes_estado_geral" value={form.flutuacoes_estado_geral} onChange={ch} type="select" opts={SN} />
        <Fld label="Comprometimento trabalho/social" name="comprometimento_trabalho_social" value={form.comprometimento_trabalho_social} onChange={ch} type="select" opts={SN} />
        <Fld label="Alteração de humor/comportamento" name="alteracao_humor_comportamento" value={form.alteracao_humor_comportamento} onChange={ch} type="select" opts={SN} />
        <Fld label="Percepções diferentes" name="percepcoes_diferentes" value={form.percepcoes_diferentes} onChange={ch} type="select" opts={SN} />
        <div style={FULL}><ChkArr label="Doenças preexistentes" name="doencas_preexistentes"
          items={['Hipertensão', 'Diabetes mellitus', 'AVC', 'Parkinson', 'Alzheimer', 'Epilepsia', 'Depressão', 'Ansiedade', 'Hipotireoidismo', 'Doença renal', 'Doença cardíaca', 'Câncer', 'Outras']}
          value={form.doencas_preexistentes} onChange={ch} /></div>
      </Sec>

      {/* 10. Medicamentos & Exames */}
      <Sec title="10. MEDICAMENTOS & EXAMES">
        <div style={FULL}><Fld label="Medicamentos em uso" name="medicamentos" value={form.medicamentos} onChange={ch} type="textarea" rows={3} /></div>
        <div style={FULL}><Fld label="Finalidade dos medicamentos" name="medicamentos_finalidade" value={form.medicamentos_finalidade} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Tomografia" name="exame_tomografia" value={form.exame_tomografia} onChange={ch} type="select" opts={[...SN, 'Não solicitado']} />
        <Fld label="Ressonância" name="exame_ressonancia" value={form.exame_ressonancia} onChange={ch} type="select" opts={[...SN, 'Não solicitado']} />
        <Fld label="EEG" name="exame_eeg" value={form.exame_eeg} onChange={ch} type="select" opts={[...SN, 'Não solicitado']} />
        <div style={FULL}><Fld label="Outros exames" name="exames" value={form.exames} onChange={ch} type="textarea" rows={2} /></div>
      </Sec>

      {/* 11. Histórico Familiar */}
      <Sec title="11. HISTÓRICO FAMILIAR">
        <Fld label="Memória" name="historico_familiar_memoria" value={form.historico_familiar_memoria} onChange={ch} type="select" opts={SN} />
        <Fld label="Pressão alta" name="historico_familiar_pressao_alta" value={form.historico_familiar_pressao_alta} onChange={ch} type="select" opts={SN} />
        <Fld label="Psiquiátrico" name="historico_familiar_psiquiatrico" value={form.historico_familiar_psiquiatrico} onChange={ch} type="select" opts={SN} />
        <Fld label="Neurológico" name="historico_familiar_neurologico" value={form.historico_familiar_neurologico} onChange={ch} type="select" opts={SN} />
        <Fld label="Dependência química" name="historico_familiar_dependencia" value={form.historico_familiar_dependencia} onChange={ch} type="select" opts={SN} />
        <div style={FULL}><Fld label="Outras condições" name="historico_familiar_outras" value={form.historico_familiar_outras} onChange={ch} type="textarea" rows={2} /></div>
      </Sec>

      {/* 12. Sintomas */}
      <Sec title="12. SINTOMAS">
        <div style={FULL}><ChkArr label="Memória" name="sintomas_memoria_idoso"
          items={['Esquece nomes', 'Perde objetos', 'Repete perguntas', 'Esquece compromissos', 'Esquece eventos recentes', 'Não reconhece pessoas', 'Desorientação temporal', 'Desorientação espacial']}
          value={form.sintomas_memoria_idoso} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Atenção" name="sintomas_atencao_idoso"
          items={['Distração fácil', 'Dificuldade de concentração', 'Não consegue fazer duas coisas ao mesmo tempo']}
          value={form.sintomas_atencao_idoso} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Função executiva" name="sintomas_funcao_executiva_idoso"
          items={['Dificuldade de planejamento', 'Dificuldade de organização', 'Impulsividade', 'Tomada de decisão prejudicada', 'Dificuldade em tarefas complexas']}
          value={form.sintomas_funcao_executiva_idoso} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Humor / comportamento" name="sintomas_humor_comportamento"
          items={['Depressão', 'Ansiedade', 'Apatia', 'Irritabilidade', 'Paranoia', 'Alucinações', 'Comportamento repetitivo']}
          value={form.sintomas_humor_comportamento} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Desinibição / agitação" name="sintomas_desinibicao_agitacao_idoso"
          items={['Desinibição sexual', 'Linguagem inapropriada', 'Agitação noturna', 'Wandering', 'Agressividade verbal', 'Agressividade física']}
          value={form.sintomas_desinibicao_agitacao_idoso} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Físico / motor" name="sintomas_fisicos_motores_idoso"
          items={['Tremor', 'Rigidez', 'Marcha instável', 'Quedas', 'Fraqueza', 'Incontinência urinária', 'Incontinência fecal']}
          value={form.sintomas_fisicos_motores_idoso} onChange={ch} /></div>
        <div style={FULL}><ChkArr label="Sensorial" name="sintomas_sensoriais_idoso"
          items={['Baixa visão', 'Perda auditiva', 'Alteração de olfato', 'Alteração de paladar', 'Dor crônica']}
          value={form.sintomas_sensoriais_idoso} onChange={ch} /></div>
      </Sec>

      {/* 13. Observações clínicas */}
      <Sec title="13. OBSERVAÇÕES CLÍNICAS">
        <div style={FULL}><Fld label="Como o paciente se vê" name="observacoes_psicologicas_como_se_ve" value={form.observacoes_psicologicas_como_se_ve} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Consegue fazer o que deseja" name="observacoes_consegue_fazer_deseja" value={form.observacoes_consegue_fazer_deseja} onChange={ch} type="textarea" rows={2} /></div>
        <Fld label="Proativo ou passivo" name="observacoes_proativo_passivo" value={form.observacoes_proativo_passivo} onChange={ch} type="select" opts={['Proativo', 'Passivo', 'Misto']} />
        <div style={FULL}><Fld label="Estado emocional" name="observacoes_emocional" value={form.observacoes_emocional} onChange={ch} type="textarea" rows={2} /></div>
        <div style={FULL}><Fld label="Observações gerais" name="observacoes_gerais" value={form.observacoes_gerais} onChange={ch} type="textarea" rows={3} /></div>
      </Sec>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
