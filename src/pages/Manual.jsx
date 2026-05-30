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

function NewBadge() {
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, fontWeight: 800,
      padding: '1px 7px', borderRadius: 6, marginLeft: 8,
      background: 'rgba(74,222,128,0.15)', color: '#4ade80',
      border: '1px solid rgba(74,222,128,0.3)', verticalAlign: 'middle',
      letterSpacing: '0.06em',
    }}>NOVO</span>
  )
}

function ManualEstagiario() {
  return (
    <>
      <Section title="🆕 O que há de novo" icon={Info} color="#065f46">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { item: 'Cards na tela Correções agora são clicáveis — abre painel com detalhes do protocolo.' },
            { item: 'Botão "ASSUMIR CORREÇÃO" no painel: registra seu nome automaticamente e muda o status para "Em Correção".' },
          ].map(({ item }) => (
            <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(74,222,128,0.07)', borderRadius: 8, border: '1px solid rgba(74,222,128,0.15)' }}>
              <span style={{ color: '#4ade80', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: 13, color: S.text }}>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="O que você pode fazer" icon={ClipboardList}>
        <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12,
          display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: 12 }}>
          <span>MÓDULO</span><span>ACESSO</span><span>OBSERVAÇÃO</span>
        </div>
        <PermRow label="Pacientes — ver e cadastrar"   status="ok"   obs="Não pode editar ou excluir" />
        <PermRow label="Testes — preencher e salvar"   status="ok"   obs="Todos os testes disponíveis" />
        <PermRow label="Anamnese"                      status="ok"   obs="Acesso livre a qualquer paciente" />
        <PermRow label="Prontuário"                    status="ok"   obs="Abas: Anamnese e Testes Aplicados" />
        <PermRow label="Correções — ver seus casos"    status="ok"   obs="Apenas protocolos atribuídos a você" />
        <PermRow label="Dashboard"                     status="ok"   obs="Resumo geral da clínica" />
        <PermRow label="Laudos"                        status="no"   obs="Reservado ao supervisor" />
        <PermRow label="Relatórios"                    status="no"   obs="—" />
        <PermRow label="Devolutivas"                   status="no"   obs="—" />
        <PermRow label="Administrador"                 status="no"   obs="—" />
      </Section>

      <Section title="Correções — Assumir e Corrigir um Protocolo" icon={ClipboardList}>
        <InfoBox color="#4ade80">
          <strong>Novidade:</strong> os cards na tela Correções agora são clicáveis. Ao clicar em qualquer card de paciente, um painel lateral se abre com as informações completas e o botão de ação.
        </InfoBox>
        <Step n={1}>Clique em <strong>Correções</strong> no menu lateral.</Step>
        <Step n={2}>Você verá apenas os protocolos atribuídos ao seu nome. Clique em qualquer card.</Step>
        <Step n={3}>No painel lateral que abrir, clique em <strong>"Assumir Correção"</strong> (botão azul). Seu nome é registrado automaticamente e o status muda para <strong>"Em Correção"</strong>.</Step>
        <Step n={4}>Corrija o protocolo físico normalmente.</Step>
        <Step n={5}>Ao terminar, clique no card novamente e use <strong>"Finalizar Correção"</strong> para enviar para aprovação do supervisor.</Step>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Etapas do fluxo</div>
          {[
            { cor: '#EF4444', label: 'Ag. Correção',    desc: 'Protocolo chegou — aguardando você assumir' },
            { cor: '#F59E0B', label: 'Em Correção',     desc: 'Você assumiu — está corrigindo' },
            { cor: '#8B5CF6', label: 'Ag. Aprovação',   desc: 'Você finalizou — supervisor vai revisar' },
            { cor: '#4CAF50', label: 'Pronto p/ Dev.',  desc: 'Aprovado — pronto para devolutiva' },
          ].map(({ cor, label, desc }) => (
            <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0 }} />
              <span style={{ color: cor, fontWeight: 700, fontSize: 12, minWidth: 110 }}>{label}</span>
              <span style={{ color: S.muted, fontSize: 12 }}>{desc}</span>
            </div>
          ))}
        </div>
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
          { q: 'Não vejo o botão "Assumir Correção".', a: 'O botão aparece apenas se o status do protocolo for "Ag. Correção" E o protocolo estiver atribuído a você. Se não aparecer, fale com a secretaria para verificar a atribuição.' },
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
      <Section title="🆕 O que há de novo" icon={Info} color="#065f46">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { item: 'Devolutivas agora mostra os próximos 30 dias (antes eram 7 dias).' },
            { item: 'Dashboard exibe card de Correções — protocolos atribuídos a você ficam visíveis.' },
            { item: 'Cards na tela Correções são clicáveis: veja detalhes do protocolo e data da devolutiva.' },
          ].map(({ item }) => (
            <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(74,222,128,0.07)', borderRadius: 8, border: '1px solid rgba(74,222,128,0.15)' }}>
              <span style={{ color: '#4ade80', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: 13, color: S.text }}>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="O que você pode fazer" icon={ClipboardList} color="#5b21b6">
        <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12,
          display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: 12 }}>
          <span>MÓDULO</span><span>ACESSO</span><span>OBSERVAÇÃO</span>
        </div>
        <PermRow label="Pacientes — ver e cadastrar"   status="ok"   obs="Não pode editar ou excluir" />
        <PermRow label="Testes"                        status="cond" obs="Somente visualização — sem edição" />
        <PermRow label="Anamnese"                      status="cond" obs="Editável se você foi designado ao paciente" />
        <PermRow label="Prontuário"                    status="ok"   obs="Abas: Anamnese e Testes Aplicados" />
        <PermRow label="Correções — seus casos"        status="ok"   obs="Ver protocolos onde você é o profissional responsável" />
        <PermRow label="Devolutivas (30 dias)"         status="ok"   obs="Retornos agendados via ProDoctor" />
        <PermRow label="Dashboard"                     status="ok"   obs="Cards de fluxo Prevent Sênior" />
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
          Você pode editar a anamnese <strong>apenas</strong> dos pacientes aos quais foi designado pela secretaria ou administrador. Para outros pacientes, a anamnese fica em modo leitura.
        </InfoBox>
        <Step n={1}>Clique em <strong>Prontuário</strong> no menu lateral.</Step>
        <Step n={2}>Selecione o paciente — a aba Anamnese abre automaticamente.</Step>
        <Step n={3}>Se você tiver permissão, edite normalmente. O sistema salva automaticamente.</Step>
      </Section>

      <Section title="Correções — Seus Protocolos" icon={ClipboardList} color="#5b21b6">
        <p style={{ color: S.text, fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>
          No Dashboard e na tela <strong>Correções</strong> você verá os protocolos Prevent Sênior onde seu nome aparece como profissional responsável pela anamnese.
        </p>
        <Step n={1}>Clique em <strong>Correções</strong> no menu lateral.</Step>
        <Step n={2}>Você verá apenas os protocolos atribuídos a você. Clique em qualquer card para ver os detalhes.</Step>
        <Step n={3}>O painel lateral mostra o status do protocolo, a data de devolutiva e o estagiário responsável pela correção.</Step>
        <InfoBox color={S.blue}>Se seu nome não aparecer em nenhum protocolo, a secretaria ainda não fez a atribuição. Fale com ela para ser vinculado aos seus pacientes.</InfoBox>
      </Section>

      <Section title="Devolutivas — Próximos 30 dias" icon={CalendarClock} color="#5b21b6">
        <Step n={1}>Clique em <strong>Devolutivas</strong> no menu lateral.</Step>
        <Step n={2}>Visualize todos os retornos agendados no ProDoctor para os <strong>próximos 30 dias</strong>.</Step>
        <Step n={3}>Use o filtro de busca para localizar um paciente específico.</Step>
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
      <Section title="🆕 O que há de novo" icon={Info} color="#065f46">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { item: 'Dashboard: 7 cards de fluxo Prevent Sênior — incluindo novo card laranja "5ª Consultas próximos 7 dias".' },
            { item: 'Devolutivas agora cobre os próximos 30 dias (antes eram 7). Maria Tegazzini e outros retornos distantes agora aparecem.' },
            { item: 'Cards nas Correções clicáveis: painel lateral para atribuir profissional, estagiário e data de devolutiva.' },
            { item: 'Página de diagnóstico /diagnostico: relatório completo dos 93 pacientes Prevent com contagem de testagens e devolutivas.' },
          ].map(({ item }) => (
            <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(74,222,128,0.07)', borderRadius: 8, border: '1px solid rgba(74,222,128,0.15)' }}>
              <span style={{ color: '#4ade80', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: 13, color: S.text }}>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Visão Geral do Sistema" icon={Info} color="#1e40af">
        <p style={{ color: S.text, fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}>
          O NeuroClin é o sistema de gestão de avaliações neuropsicológicas da <strong>Neuroavaliação</strong>.
          Gerencia o ciclo completo: <strong>cadastro de pacientes → aplicação de testes → geração de laudos → aprovação e exportação</strong>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: Users,        label: 'Pacientes',    desc: 'Cadastro completo com busca e histórico' },
            { icon: FlaskConical, label: 'Testes',        desc: '20+ instrumentos neuropsicológicos validados' },
            { icon: FileText,     label: 'Laudos',        desc: 'Geração pelo sistema Neuroavaliação + aprovação supervisor' },
            { icon: ShieldCheck,  label: 'Administrador', desc: 'Gestão de equipe, logs e configurações' },
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

      <Section title="Dashboard — Fluxo Prevent Sênior (7 cards)" icon={BarChart3} color="#1e40af">
        <p style={{ color: S.text, fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
          O Dashboard exibe 7 cards de acompanhamento em tempo real do ciclo Prevent Sênior. Clique em qualquer card para ir à tela correspondente.
        </p>
        {[
          { cor: '#F59E0B', label: 'Aguardando Anamnese',        desc: 'Profissional ainda não preencheu a anamnese do paciente.' },
          { cor: '#EF4444', label: 'Aguardando Correção',        desc: 'Protocolo chegou, nenhum estagiário assumiu ainda.' },
          { cor: '#3B82F6', label: 'Em Correção',                desc: 'Estagiário está corrigindo o protocolo.' },
          { cor: '#8B5CF6', label: 'Aguardando Aprovação',       desc: 'Estagiário finalizou, supervisão pendente.' },
          { cor: '#10B981', label: 'Prontos para Devolutiva',    desc: 'Laudos aprovados, aguardando retorno com paciente.' },
          { cor: '#0D9488', label: 'Devolutivas próximos 30 dias', desc: 'Retornos agendados no ProDoctor (janela expandida).' },
          { cor: '#D97706', label: '5ª Consultas próximos 7 dias', desc: 'Pacientes prestes a concluir a coleta — protocol a caminho.' },
        ].map(({ cor, label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${S.border}`, alignItems: 'flex-start' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: cor, flexShrink: 0, marginTop: 3 }} />
            <div>
              <span style={{ color: cor, fontWeight: 700, fontSize: 13 }}>{label}</span>
              <span style={{ color: S.muted, fontSize: 12, marginLeft: 8 }}>{desc}</span>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Correções — Modal de Atribuição" icon={ClipboardList} color="#1e40af">
        <InfoBox color="#4ade80">
          <strong>Novidade:</strong> clique em qualquer card de paciente na tela Correções para abrir o painel de atribuição.
        </InfoBox>
        <Step n={1}>Acesse <strong>Correções</strong> no menu lateral.</Step>
        <Step n={2}>Clique sobre o card do paciente desejado. Um painel desliza pela direita.</Step>
        <Step n={3}>Selecione o <strong>Profissional responsável</strong> no dropdown (lista usuários com role "profissional" cadastrados no sistema).</Step>
        <Step n={4}>Selecione o <strong>Estagiário</strong> no dropdown.</Step>
        <Step n={5}>Confirme ou ajuste a <strong>Data da Devolutiva</strong>.</Step>
        <Step n={6}>Clique em <strong>Salvar Atribuições</strong>. Os dados são gravados no Firestore imediatamente.</Step>
        <InfoBox color={S.amber}>O botão "Assumir Correção" no painel é exclusivo para estagiários. Como administrador, você usa o painel para atribuir — o estagiário usa o painel para assumir.</InfoBox>
      </Section>

      <Section title="Perfis de Acesso (Roles)" icon={Users} color="#1e40af">
        {[
          { role: 'Administrador',         cor: '#ef4444', desc: 'Acesso total. Cria usuários, aprova laudos, vê logs, configura senha de aprovação, atribui protocolos.' },
          { role: 'Supervisor',            cor: '#f59e0b', desc: 'Igual ao Administrador, exceto criação de outros admins.' },
          { role: 'Estagiário',            cor: '#60a5fa', desc: 'Preenche testes e anamnese. Assume e corrige protocolos. Não acessa Laudos, Devolutivas nem Admin.' },
          { role: 'Profissional',          cor: '#a78bfa', desc: 'Leitura de testes. Anamnese editável se designado. Vê seus protocolos. Acessa Devolutivas 30 dias.' },
          { role: 'Secretaria/Entregador', cor: '#0D9488', desc: 'Gerencia o fluxo de correção: atribui estagiários e profissionais, monitora dashboard, sincroniza ProDoctor.' },
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
        <Step n={4}><strong>Desativar:</strong> usuários com <em>Ativo = false</em> são bloqueados no login automaticamente.</Step>
        <InfoBox color={S.amber}>Para mudar o role de um usuário, edite no painel Admin e salve. O usuário precisa dar <strong>F5</strong> para o novo role entrar em vigor.</InfoBox>
      </Section>

      <Section title="Fluxo Completo de Avaliação" icon={ChevronRight} color="#1e40af">
        <Step n={1}><strong>Cadastro do paciente</strong> — em Pacientes → Novo Paciente.</Step>
        <Step n={2}><strong>Anamnese</strong> — em Prontuário → aba Anamnese. Preencher dados clínicos.</Step>
        <Step n={3}><strong>Aplicação dos testes</strong> — em Testes. Estagiários fazem esta etapa.</Step>
        <Step n={4}><strong>Geração do laudo</strong> — em Laudos. Selecionar paciente + profissional + testes → clicar "Gerar Laudo". O sistema Neuroavaliação produz o texto completo com tabelas e classificações.</Step>
        <Step n={5}><strong>Revisão e edição</strong> — botão EDITAR ativa edição direta no texto do laudo.</Step>
        <Step n={6}><strong>Aprovação</strong> — supervisor clica "Aprovar". Laudo recebe status "aprovado" e fica bloqueado. O log de auditoria registra a ação.</Step>
        <Step n={7}><strong>Exportação</strong> — botão IMPRIMIR / PDF disponível após aprovação do laudo.</Step>
      </Section>

      <Section title="Página de Diagnóstico Prevent" icon={Info} color="#1e40af">
        <InfoBox color={S.blue}>
          Acesse <strong>neuroclinilaudos.com.br/diagnostico</strong> para ver o relatório completo de todos os pacientes Prevent Sênior: testagens realizadas, agendadas, e data da devolutiva. Útil para entender por que pacientes estão ou não no fluxo.
        </InfoBox>
        <Step n={1}>Acesse o endereço acima estando logado como administrador.</Step>
        <Step n={2}>Clique em <strong>▶ Executar diagnóstico</strong> (leva alguns minutos).</Step>
        <Step n={3}>A tabela mostrará todos os pacientes com status e devolutiva agendada.</Step>
        <Step n={4}>Abra o console do navegador (F12) para o relatório completo copiável.</Step>
      </Section>

      <Section title="Painel Administrador" icon={ShieldCheck} color="#1e40af">
        {[
          { label: 'Log de Auditoria',    desc: 'Últimas 80 ações: login, laudo_gerado, laudo_aprovado, paciente_excluido. Nunca deletável.' },
          { label: 'Verificar Auth',      desc: 'Checa status de autenticação de cada profissional (sem auth / email / Google).' },
          { label: 'Limpar laudos órfãos',desc: 'Remove laudos cujo paciente foi excluído.' },
          { label: 'Senha de aprovação',  desc: 'Senha do supervisor usada na aprovação de laudos. Salva em clinic_settings/main.' },
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
          <strong>Paciente com laudo aprovado não pode ser excluído.</strong> O sistema bloqueia se houver ≥ 1 laudo aprovado vinculado.
        </InfoBox>
        <InfoBox color={S.amber}>
          <strong>Testes auditados e validados são protegidos.</strong> Fórmulas, pontos de corte e classificações de RAVLT, NEUPSILIN, GDS-15, WCST e outros 17 instrumentos não podem ser alterados sem autorização explícita do Dr. Pedro.
        </InfoBox>
        <InfoBox color={S.greenL}>
          <strong>Salvamento automático:</strong> debounce de 2 segundos + flush imediato ao trocar de teste ou sair da página. Nenhum dado é perdido em operações normais.
        </InfoBox>
      </Section>
    </>
  )
}

function ManualSecretaria() {
  return (
    <>
      <Section title="🆕 O que há de novo" icon={Info} color="#065f46">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { item: 'Cards nas Correções são clicáveis: painel lateral para atribuir profissional, estagiário e data de devolutiva.' },
            { item: 'Dashboard: novo card laranja "5ª Consultas próximos 7 dias" — antecipação dos protocolos que chegam.' },
            { item: 'Devolutivas cobre os próximos 30 dias. Todos os retornos ProDoctor agora visíveis com antecedência.' },
          ].map(({ item }) => (
            <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(74,222,128,0.07)', borderRadius: 8, border: '1px solid rgba(74,222,128,0.15)' }}>
              <span style={{ color: '#4ade80', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: 13, color: S.text }}>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sua função no fluxo Prevent Sênior" icon={ClipboardList} color="#0D9488">
        <p style={{ color: S.text, fontSize: 13, lineHeight: 1.8, marginBottom: 12 }}>
          Você é responsável por <strong>coordenar a entrega e atribuição</strong> dos protocolos de correção.
          O sistema monitora o ProDoctor automaticamente e alerta quando um paciente conclui a 5ª consulta de testagem.
        </p>
        {[
          { n: '1', label: 'Monitorar o Dashboard', desc: 'Os 7 cards mostram o status de todos os protocolos Prevent Sênior em tempo real.' },
          { n: '2', label: 'Sincronizar ProDoctor', desc: 'Na tela Correções, clique "Sincronizar ProDoctor" para buscar novos pacientes que concluíram a 5ª consulta.' },
          { n: '3', label: 'Atribuir estagiário e profissional', desc: 'Clique no card do paciente → painel lateral → selecione estagiário e profissional → Salvar.' },
          { n: '4', label: 'Acompanhar 5ª consultas próximas', desc: 'O card laranja no Dashboard mostra quem vai concluir a coleta em 7 dias — prepare-se com antecedência.' },
          { n: '5', label: 'Devolutivas 30 dias', desc: 'Veja todos os retornos agendados no ProDoctor para as próximas 4 semanas.' },
        ].map(({ n, label, desc }) => (
          <div key={n} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${S.border}` }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0D9488', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{n}</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{label}</div>
              <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Como atribuir um protocolo" icon={Users} color="#0D9488">
        <Step n={1}>Acesse <strong>Correções</strong> no menu lateral.</Step>
        <Step n={2}>Clique sobre o card do paciente com status <span style={{ color: '#EF4444', fontWeight: 700 }}>Ag. Correção</span>.</Step>
        <Step n={3}>No painel que abre à direita, selecione o <strong>Profissional responsável</strong> no primeiro dropdown.</Step>
        <Step n={4}>Selecione o <strong>Estagiário</strong> que vai corrigir no segundo dropdown.</Step>
        <Step n={5}>Confirme a <strong>Data da Devolutiva</strong> — ela vem do ProDoctor, mas pode ser ajustada manualmente.</Step>
        <Step n={6}>Clique em <strong>"Salvar Atribuições"</strong>. O estagiário já pode ver o protocolo e clicar em "Assumir Correção".</Step>
        <InfoBox color={S.amber}>Se o profissional ou estagiário não aparecer no dropdown, verifique se o role deles está correto na página Administrador. O role deve ser exatamente "profissional" ou "estagiario".</InfoBox>
      </Section>

      <Section title="Sincronizar ProDoctor" icon={CalendarClock} color="#0D9488">
        <Step n={1}>Acesse <strong>Correções</strong> no menu lateral.</Step>
        <Step n={2}>Clique em <strong>"Sincronizar ProDoctor"</strong> (botão teal no canto superior direito).</Step>
        <Step n={3}>O sistema busca todos os pacientes Prevent Sênior com 5 ou mais consultas de testagem desde 28/02/2026.</Step>
        <Step n={4}>Novos pacientes são criados com status "Ag. Correção". Pacientes existentes têm a devolutiva atualizada.</Step>
        <Step n={5}>Uma mensagem confirma: "X criados, Y atualizados, Z ignorados".</Step>
        <InfoBox color={S.blue}>A sincronização demora alguns minutos (busca a agenda de todos os profissionais nos últimos 3 meses). Aguarde a mensagem de conclusão.</InfoBox>
      </Section>

      <Section title="Dashboard — 7 cards de monitoramento" icon={BarChart3} color="#0D9488">
        {[
          { cor: '#F59E0B', label: 'Aguardando Anamnese',          desc: 'Profissional designado ainda não preencheu a anamnese.' },
          { cor: '#EF4444', label: 'Aguardando Correção',          desc: 'Protocolo aguardando ser atribuído e assumido.' },
          { cor: '#3B82F6', label: 'Em Correção',                  desc: 'Estagiário está corrigindo.' },
          { cor: '#8B5CF6', label: 'Aguardando Aprovação',         desc: 'Correção concluída, supervisor vai revisar.' },
          { cor: '#10B981', label: 'Prontos para Devolutiva',      desc: 'Aprovados — prontos para o retorno com o paciente.' },
          { cor: '#0D9488', label: 'Devolutivas — 30 dias',        desc: 'Retornos agendados no ProDoctor para as próximas 4 semanas.' },
          { cor: '#D97706', label: '5ª Consultas — 7 dias',        desc: 'Pacientes que concluirão a coleta em breve. Prepare-se.' },
        ].map(({ cor, label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${S.border}` }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: cor, flexShrink: 0, marginTop: 3 }} />
            <div>
              <span style={{ color: cor, fontWeight: 700, fontSize: 13 }}>{label}</span>
              <span style={{ color: S.muted, fontSize: 12, marginLeft: 8 }}>{desc}</span>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Dúvidas Frequentes" icon={Info} color="#0D9488">
        {[
          { q: 'O protocolo não aparece na sincronização.', a: 'Verifique se o paciente tem exatamente 5 ou mais consultas de testagem a partir de 28/02/2026 no ProDoctor. Consultas do tipo "Retorno" não contam. Se necessário, cadastre o protocolo manualmente com o botão "Novo Prontuário".' },
          { q: 'O profissional não aparece no dropdown de atribuição.', a: 'O sistema busca usuários com role "profissional" cadastrados na página Admin. Verifique se o usuário tem o role correto e está marcado como Ativo.' },
          { q: 'A data da devolutiva está errada.', a: 'Abra o card do paciente, edite o campo "Data da Devolutiva" e clique em Salvar. O sistema aceita a data manual sobrepondo o valor do ProDoctor.' },
        ].map(({ q, a }) => (
          <div key={q} style={{ marginBottom: 12, padding: '10px 14px', background: S.card2, borderRadius: 8 }}>
            <div style={{ color: '#2DD4BF', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{q}</div>
            <div style={{ color: S.text, fontSize: 12, lineHeight: 1.7 }}>{a}</div>
          </div>
        ))}
      </Section>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
//  PÁGINA PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  estagiario:   { label: 'Estagiário',           color: '#60a5fa', Manual: ManualEstagiario },
  professional: { label: 'Profissional',          color: '#a78bfa', Manual: ManualProfissional },
  profissional: { label: 'Profissional',          color: '#a78bfa', Manual: ManualProfissional },
  admin:        { label: 'Administrador',         color: '#4ade80', Manual: ManualAdmin },
  supervisor:   { label: 'Supervisor',            color: '#4ade80', Manual: ManualAdmin },
  secretaria:   { label: 'Secretaria/Entregador', color: '#2DD4BF', Manual: ManualSecretaria },
  entregador:   { label: 'Entregador',            color: '#2DD4BF', Manual: ManualSecretaria },
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
