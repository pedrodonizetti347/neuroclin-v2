import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import {
  BookOpen, CheckCircle2, XCircle, AlertCircle,
  ClipboardList, Users, FileText, ShieldCheck,
  FlaskConical, BookMarked, BarChart3, Key,
  Info, ChevronRight, Circle, CalendarClock,
} from 'lucide-react'

const S = {
  bg:      '#0D1117',
  card:    '#1A2744',
  card2:   '#0F1B2D',
  green:   '#2E7D32',
  greenL:  '#4CAF50',
  blue:    '#60a5fa',
  amber:   '#f59e0b',
  red:     '#ef4444',
  border:  'rgba(255,255,255,0.07)',
  muted:   'rgba(255,255,255,0.45)',
  text:    '#e2e8f0',
}

function Section({ title, icon: Icon, children, color }) {
  return (
    <div style={{
      background: S.card,
      border: `1px solid ${S.border}`,
      borderRadius: 14,
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      <div style={{
        background: color || S.green,
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {Icon && <Icon size={18} color="#fff" />}
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '0.02em' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '18px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function PermRow({ label, status, obs }) {
  const cfg = {
    ok:   { icon: CheckCircle2, color: '#4ade80', text: 'Permitido' },
    no:   { icon: XCircle,      color: '#f87171', text: 'Bloqueado' },
    cond: { icon: AlertCircle,  color: '#fbbf24', text: 'Condicional' },
  }[status]
  const Icon = cfg.icon
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 140px 1fr',
      gap: 12, padding: '9px 0',
      borderBottom: `1px solid ${S.border}`,
      alignItems: 'center', fontSize: 13,
    }}>
      <span style={{ color: S.text, fontWeight: 500 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: cfg.color, fontWeight: 700 }}>
        <Icon size={14} /> {cfg.text}
      </span>
      <span style={{ color: S.muted, fontSize: 12 }}>{obs}</span>
    </div>
  )
}

function Step({ n, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: S.green, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 12, flexShrink: 0, marginTop: 1,
      }}>{n}</div>
      <span style={{ color: S.text, fontSize: 13, lineHeight: 1.7 }}>{children}</span>
    </div>
  )
}

function InfoBox({ children, color }) {
  return (
    <div style={{
      background: `${color || S.blue}18`,
      border: `1px solid ${color || S.blue}40`,
      borderRadius: 8,
      padding: '10px 14px',
      margin: '12px 0',
      fontSize: 13,
      color: S.text,
      lineHeight: 1.7,
      display: 'flex', gap: 10,
    }}>
      <Info size={16} color={color || S.blue} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  )
}

function ColorChip({ color, label, desc }) {
  return (
    <div style={{
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div>
        <div style={{ color, fontWeight: 700, fontSize: 13 }}>{label}</div>
        <div style={{ color: S.muted, fontSize: 11 }}>{desc}</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
//  CONTEÚDO POR ROLE
// ──────────────────────────────────────────────────────────────────────────────

function ManualEstagiario() {
  return (
    <>
      <Section title="O que você pode fazer" icon={ClipboardList}>
        <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12,
          display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: 12 }}>
          <span>MÓDULO</span><span>ACESSO</span><span>OBSERVAÇÃO</span>
        </div>
        <PermRow label="Pacientes — ver e cadastrar"   status="ok"   obs="Não pode editar ou excluir" />
        <PermRow label="Testes — preencher e salvar"   status="ok"   obs="Todos os testes disponíveis" />
        <PermRow label="Anamnese"                      status="ok"   obs="Acesso livre a qualquer paciente" />
        <PermRow label="Prontuário"                    status="ok"   obs="Abas: Anamnese e Testes Aplicados" />
        <PermRow label="Dashboard"                     status="ok"   obs="Resumo geral da clínica" />
        <PermRow label="Laudos"                        status="no"   obs="Reservado ao supervisor" />
        <PermRow label="Relatórios"                    status="no"   obs="—" />
        <PermRow label="Devolutivas"                   status="no"   obs="—" />
        <PermRow label="Administrador"                 status="no"   obs="—" />
      </Section>

      <Section title="Como preencher um Teste" icon={FlaskConical}>
        <Step n={1}>Clique em <strong>Testes</strong> no menu lateral esquerdo.</Step>
        <Step n={2}>Selecione o <strong>paciente</strong> no campo de busca no topo da página.</Step>
        <Step n={3}>Clique no nome do teste no painel esquerdo (ex: RAVLT, GDS-15, NEUPSILIN, TOKEN).</Step>
        <Step n={4}>Preencha os campos. O sistema <strong>salva automaticamente a cada 2 segundos</strong> — o ícone "Salvo" confirma.</Step>
        <Step n={5}>Acesse a aba <strong>Resultado</strong> dentro do teste para ver totais e classificações.</Step>
        <InfoBox>Se o teste mostrar um banner âmbar "Teste concluído — edição bloqueada", o supervisor já encerrou aquele teste. Fale com Dr. Pedro para reabrir.</InfoBox>
      </Section>

      <Section title="Como preencher a Anamnese" icon={BookMarked}>
        <Step n={1}>Clique em <strong>Prontuário</strong> no menu lateral.</Step>
        <Step n={2}>Selecione o paciente no campo de busca.</Step>
        <Step n={3}>A aba <strong>Anamnese</strong> abrirá automaticamente.</Step>
        <Step n={4}>Preencha os campos. O sistema salva com merge — dados anteriores nunca são perdidos ao salvar.</Step>
      </Section>

      <Section title="Cores de Classificação dos Resultados" icon={BarChart3}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <ColorChip color="#1F3864" label="PRESERVADO"   desc="Z-escore ≥ −1,0" />
          <ColorChip color="#E8821A" label="LIMÍTROFE"    desc="Z entre −1,0 e −1,5" />
          <ColorChip color="#C00000" label="COMPROMETIDO" desc="Z-escore < −1,5" />
        </div>
        <span style={{ color: S.muted, fontSize: 12 }}>
          As cores aparecem automaticamente na aba Resultado e nos laudos gerados. Nenhuma ação necessária.
        </span>
      </Section>

      <Section title="Dúvidas Frequentes" icon={Info}>
        {[
          { q: 'O sistema salvou meu trabalho?', a: 'Sim. O texto "Salvo" aparece no topo do formulário. O sistema salva automaticamente enquanto você preenche e imediatamente ao trocar de teste.' },
          { q: 'Meu cargo aparece errado na tela.', a: 'Pressione F5 (atualizar página). O sistema vai reler seu perfil do Firestore e corrigir o label e as permissões automaticamente.' },
          { q: 'Esqueci minha senha.', a: 'Na tela de login, clique em "Esqueci minha senha" e informe seu e-mail. Se não tiver e-mail cadastrado, entre em contato com Dr. Pedro.' },
        ].map(({ q, a }) => (
          <div key={q} style={{ marginBottom: 12, padding: '10px 14px', background: S.card2, borderRadius: 8 }}>
            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{q}</div>
            <div style={{ color: S.text, fontSize: 12, lineHeight: 1.7 }}>{a}</div>
          </div>
        ))}
      </Section>
    </>
  )
}

function ManualProfissional() {
  return (
    <>
      <Section title="O que você pode fazer" icon={ClipboardList} color="#5b21b6">
        <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12,
          display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: 12 }}>
          <span>MÓDULO</span><span>ACESSO</span><span>OBSERVAÇÃO</span>
        </div>
        <PermRow label="Pacientes — ver e cadastrar"   status="ok"   obs="Não pode editar ou excluir" />
        <PermRow label="Testes"                        status="cond" obs="Somente visualização — sem edição" />
        <PermRow label="Anamnese"                      status="cond" obs="Editável se você cadastrou ou foi designado ao paciente" />
        <PermRow label="Prontuário"                    status="ok"   obs="Abas: Anamnese e Testes Aplicados" />
        <PermRow label="Devolutivas"                   status="ok"   obs="Acesso completo" />
        <PermRow label="Dashboard"                     status="ok"   obs="Resumo geral da clínica" />
        <PermRow label="Laudos"                        status="no"   obs="—" />
        <PermRow label="Relatórios"                    status="no"   obs="—" />
        <PermRow label="Administrador"                 status="no"   obs="—" />
      </Section>

      <Section title="Testes — Somente Leitura" icon={FlaskConical} color="#5b21b6">
        <InfoBox color={S.blue}>
          Seu perfil permite <strong>visualizar</strong> todos os resultados dos testes, mas não editá-los.
          Um banner azul "Somente leitura" aparece no topo do formulário quando você acessa um teste.
          Se precisar preencher testes, fale com Dr. Pedro para ajustar seu perfil.
        </InfoBox>
        <Step n={1}>Clique em <strong>Testes</strong> no menu lateral.</Step>
        <Step n={2}>Selecione o paciente e o teste desejado.</Step>
        <Step n={3}>Visualize os dados preenchidos e os resultados na aba <strong>Resultado</strong>.</Step>
      </Section>

      <Section title="Anamnese — Acesso Condicional" icon={BookMarked} color="#5b21b6">
        <InfoBox color={S.amber}>
          Você pode editar a anamnese <strong>apenas</strong> de pacientes que você mesmo cadastrou
          ou aos quais foi designado pelo administrador. Para outros pacientes, a anamnese estará em modo leitura
          com o aviso: "Você pode visualizar mas não editar a anamnese deste paciente."
        </InfoBox>
        <Step n={1}>Clique em <strong>Prontuário</strong> no menu lateral.</Step>
        <Step n={2}>Selecione o paciente — a aba Anamnese abre automaticamente.</Step>
        <Step n={3}>Se você tiver permissão, edite normalmente. O sistema salva automaticamente.</Step>
      </Section>

      <Section title="Devolutivas" icon={CalendarClock} color="#5b21b6">
        <Step n={1}>Clique em <strong>Devolutivas</strong> no menu lateral.</Step>
        <Step n={2}>Visualize os pacientes com devolutivas agendadas nos próximos 7 dias.</Step>
        <Step n={3}>Gerencie os agendamentos e registre observações de acompanhamento.</Step>
      </Section>

      <Section title="Cores de Classificação dos Resultados" icon={BarChart3} color="#5b21b6">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <ColorChip color="#1F3864" label="PRESERVADO"   desc="Z-escore ≥ −1,0" />
          <ColorChip color="#E8821A" label="LIMÍTROFE"    desc="Z entre −1,0 e −1,5" />
          <ColorChip color="#C00000" label="COMPROMETIDO" desc="Z-escore < −1,5" />
        </div>
      </Section>
    </>
  )
}

function ManualAdmin() {
  return (
    <>
      <Section title="Visão Geral do Sistema" icon={Info} color="#1e40af">
        <p style={{ color: S.text, fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}>
          O NeuroClin é o sistema de gestão de avaliações neuropsicológicas da <strong>Neuroavaliação</strong>.
          Gerencia o ciclo completo: <strong>cadastro de pacientes → aplicação de testes → geração de laudos → aprovação e exportação</strong>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: Users,        label: 'Pacientes',   desc: 'Cadastro completo com busca e histórico' },
            { icon: FlaskConical, label: 'Testes',       desc: '20+ instrumentos neuropsicológicos validados' },
            { icon: FileText,     label: 'Laudos',       desc: 'Geração por IA + aprovação supervisor' },
            { icon: ShieldCheck,  label: 'Administrador',desc: 'Gestão de equipe, logs e configurações' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{ background: S.card2, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <Icon size={16} color={S.greenL} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{label}</div>
                <div style={{ color: S.muted, fontSize: 11, marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Perfis de Acesso (Roles)" icon={Users} color="#1e40af">
        {[
          { role: 'Administrador', cor: '#ef4444', desc: 'Acesso total. Cria e gerencia usuários, aprova laudos, vê logs de auditoria, configura senha de aprovação.' },
          { role: 'Supervisor',    cor: '#f59e0b', desc: 'Igual ao Administrador, exceto criação de outros admins.' },
          { role: 'Estagiário',    cor: '#60a5fa', desc: 'Preenche testes e anamnese. Não acessa Laudos, Relatórios, Devolutivas nem Admin.' },
          { role: 'Profissional',  cor: '#a78bfa', desc: 'Somente leitura nos testes. Anamnese editável só se for dono do paciente. Acesso a Devolutivas.' },
        ].map(({ role, cor, desc }) => (
          <div key={role} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${S.border}` }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0, marginTop: 4 }} />
            <div>
              <span style={{ color: cor, fontWeight: 700, fontSize: 13 }}>{role}</span>
              <span style={{ color: S.text, fontSize: 12, marginLeft: 8 }}>{desc}</span>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Gestão de Usuários" icon={ShieldCheck} color="#1e40af">
        <p style={{ color: S.muted, fontSize: 12, marginBottom: 14 }}>Acesse via <strong style={{color:S.text}}>Administrador → seção de profissionais</strong>.</p>
        <Step n={1}><strong>Criar:</strong> clique em "Novo Profissional", preencha nome, e-mail e senha temporária. O sistema cria a conta no Firebase Auth sem deslogar o admin.</Step>
        <Step n={2}><strong>Primeiro acesso do funcionário:</strong> ele entra com e-mail + senha temporária. Um banner âmbar aparece orientando a troca de senha.</Step>
        <Step n={3}><strong>Editar:</strong> clique no ícone de lápis ao lado do nome. É possível alterar nome, role e status ativo/inativo.</Step>
        <Step n={4}><strong>Desativar:</strong> usuários com <em>Ativo = false</em> são bloqueados no login automaticamente com a mensagem "Seu acesso está desativado."</Step>
        <InfoBox color={S.amber}>Para mudar o role de um usuário (ex: de Profissional para Estagiário), edite no painel Admin e salve. O usuário precisa dar <strong>F5</strong> para o novo role entrar em vigor.</InfoBox>
      </Section>

      <Section title="Fluxo Completo de Avaliação" icon={ChevronRight} color="#1e40af">
        <Step n={1}><strong>Cadastro do paciente</strong> — em Pacientes → Novo Paciente. Campos essenciais: nome, data de nascimento, escolaridade, sexo.</Step>
        <Step n={2}><strong>Anamnese</strong> — em Prontuário → aba Anamnese. Preencher dados clínicos do idoso.</Step>
        <Step n={3}><strong>Aplicação dos testes</strong> — em Testes. Selecionar o paciente e preencher cada instrumento. Estagiários podem fazer esta etapa.</Step>
        <Step n={4}><strong>Geração do laudo</strong> — em Laudos. Selecionar paciente + profissional aplicador + testes usados → clicar "Gerar Laudo". A IA (Claude Opus) produz o texto completo com tabelas e classificações.</Step>
        <Step n={5}><strong>Revisão e edição</strong> — o botão EDITAR ativa edição direta no texto do laudo gerado.</Step>
        <Step n={6}><strong>Aprovação</strong> — supervisor clica "Aprovar". Laudo recebe status "aprovado" e fica bloqueado para edição. O log de auditoria registra a ação.</Step>
        <Step n={7}><strong>Exportação</strong> — botões IMPRIMIR, PDF e WORD disponíveis para qualquer usuário autenticado assim que o laudo existe.</Step>
      </Section>

      <Section title="Painel Administrador" icon={ShieldCheck} color="#1e40af">
        {[
          { label: 'Log de Auditoria', desc: 'Últimas 80 ações: login, laudo_gerado, laudo_aprovado, paciente_excluido. Nunca deletável.' },
          { label: 'Verificar Auth', desc: 'Botão que checa o status de autenticação de cada profissional (sem auth / email / Google).' },
          { label: 'Limpar laudos órfãos', desc: 'Remove laudos cujo paciente foi excluído. Exibe total verificado e total removido.' },
          { label: 'Senha de aprovação', desc: 'Campo para configurar a senha do supervisor usada na aprovação de laudos. Salva em clinic_settings/main.' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ padding: '9px 0', borderBottom: `1px solid ${S.border}`, display: 'flex', gap: 10 }}>
            <Circle size={7} color={S.greenL} style={{ flexShrink: 0, marginTop: 5 }} />
            <div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{label}:</span>
              <span style={{ color: S.muted, fontSize: 12, marginLeft: 6 }}>{desc}</span>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Regras Importantes do Sistema" icon={Key} color="#1e40af">
        <InfoBox color={S.red}>
          <strong>Paciente com laudo aprovado não pode ser excluído.</strong> O sistema verifica todos os laudos vinculados antes de deletar e bloqueia se houver ≥ 1 laudo aprovado.
        </InfoBox>
        <InfoBox color={S.amber}>
          <strong>Testes auditados e validados são protegidos.</strong> As fórmulas de cálculo, pontos de corte e classificações de RAVLT, NEUPSILIN, GDS-15, WCST e outros 17 instrumentos não podem ser alterados sem autorização explícita do Dr. Pedro.
        </InfoBox>
        <InfoBox color={S.blue}>
          <strong>API Anthropic (Claude Opus)</strong> é chamada diretamente do frontend via chave configurada no ambiente. Sem Cloud Functions. O laudo gerado sempre inclui tabelas completas de todos os testes aplicados antes da interpretação clínica.
        </InfoBox>
        <InfoBox color={S.greenL}>
          <strong>Salvamento automático:</strong> debounce de 2 segundos + flushSave imediato ao trocar de teste, sair da página ou trocar aba interna. Nenhum dado é perdido em operações normais.
        </InfoBox>
      </Section>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
//  PÁGINA PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  estagiario:   { label: 'Estagiário',    color: '#60a5fa', Manual: ManualEstagiario },
  professional: { label: 'Profissional',  color: '#a78bfa', Manual: ManualProfissional },
  admin:        { label: 'Administrador', color: '#4ade80', Manual: ManualAdmin },
  supervisor:   { label: 'Supervisor',    color: '#4ade80', Manual: ManualAdmin },
}

export default function Manual() {
  const { user } = useAuth()

  useEffect(() => {
    sessionStorage.setItem('neuroclin_manual_shown', '1')
  }, [])

  const role   = user?.role || 'professional'
  const cfg    = ROLE_CONFIG[role] || ROLE_CONFIG.professional
  const { Manual: ManualContent } = cfg

  return (
    <div style={{
      minHeight: '100vh',
      background: S.bg,
      padding: '32px 32px 48px',
      maxWidth: 900,
      margin: '0 auto',
    }}>
      {/* Cabeçalho */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 36,
        paddingBottom: 28, borderBottom: `2px solid ${S.border}`,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: S.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BookOpen size={28} color="#fff" />
        </div>
        <div>
          <div style={{
            fontSize: 32, fontWeight: 900, color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.1,
            textTransform: 'uppercase',
          }}>
            MANUAL DE INFORMAÇÕES
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: `${cfg.color}22`,
              border: `1px solid ${cfg.color}55`,
              color: cfg.color,
              padding: '3px 12px', borderRadius: 20,
              fontSize: 12, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {cfg.label}
            </span>
            <span style={{ color: S.muted, fontSize: 12 }}>
              Olá, <strong style={{ color: S.text }}>{user?.full_name || user?.email}</strong>. Este manual foi personalizado para o seu perfil de acesso.
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <ManualContent />

      {/* Rodapé */}
      <div style={{
        marginTop: 32, paddingTop: 20,
        borderTop: `1px solid ${S.border}`,
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: S.muted,
      }}>
        <span>NeuroClin · Neuroavaliação · Dr. Pedro Donizetti de Oliveira</span>
        <span>Dúvidas: pedrodonizettipalestrante@gmail.com</span>
      </div>
    </div>
  )
}
