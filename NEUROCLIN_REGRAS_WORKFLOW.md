# 📋 NeuroClin V2 — Regras de Workflow
# Quem faz o que, onde cada um mexe
# Versão: 03/06/2026

---

## 🧠 OS TRÊS AGENTES — papéis fixos

---

### 1. DR. PEDRO
**Papel:** Dono do sistema, decisor clínico e técnico

**O que só ele faz:**
- Autoriza qualquer alteração antes de executar
- Autoriza deploy ("pode fazer o deploy agora?")
- Escreve "AUTORIZO ALTERAÇÃO NO TESTE [nome]" para liberar mudança em teste bloqueado
- Valida textos de conclusão de laudos (nunca delegado a IA)
- Define regras de negócio clínicas (critérios Prevent, roles, permissões)
- Decide se nova funcionalidade vai em arquivo novo ou modifica existente

**Onde atua:**
- Este chat (claude.ai) — diagnóstico, planejamento, decisões
- Firebase Console — visualização de dados de produção
- neuroclinilaudos.com.br — validação pós-deploy

---

### 2. ESTE CHAT (claude.ai)
**Papel:** Cérebro — diagnóstico, planejamento e geração de prompts

**O que faz:**
- Analisa problemas e propõe soluções
- Gera o prompt/comando exato para o CMD executar
- Busca histórico de conversas anteriores quando necessário
- Mantém contexto clínico e técnico do projeto
- Atualiza memória e registros do projeto
- NUNCA escreve diretamente no código do projeto
- NUNCA faz deploy
- NUNCA acessa GitHub, Firebase ou o projeto diretamente

**Como receber o melhor resultado:**
Sempre iniciar com:
> "NeuroClin — [descreva o problema ou o que quer fazer]"

---

### 3. CMD / CLAUDE CODE (o porco)
**Papel:** Braço — executa no projeto local

**O que faz:**
- Lê e escreve arquivos no projeto local Windows
- Executa build e deploy
- Roda git commit e git push
- Aplica mudanças no código após instrução do chat

**O que NUNCA faz sem instrução explícita:**
- firebase deploy
- git push
- Modificar arquivos de configuração
- Alterar testes bloqueados
- Refatorar código não solicitado

**Caminho de trabalho:**
`C:\Users\Pedro Donizetti\Downloads\neuroclin\home\claude\neuroclin-v2`

**Como iniciar o CMD:**
Abrir via: `C:\Users\Pedro Donizetti\Desktop\NeuroClin-Porco.bat`

---

## 🔄 FLUXO OBRIGATÓRIO — toda alteração segue esta ordem

```
1. Dr. Pedro detecta problema ou quer nova feature
        ↓
2. Dr. Pedro descreve no CHAT (claude.ai)
        ↓
3. CHAT analisa, diagnostica, gera o prompt para o CMD
        ↓
4. Dr. Pedro revisa o prompt gerado pelo CHAT
        ↓
5. Dr. Pedro cola o prompt no CMD
        ↓
6. CMD mostra o que vai fazer ANTES de executar
        ↓
7. Dr. Pedro confirma ("sim" / "pode aplicar")
        ↓
8. CMD executa a alteração
        ↓
9. Dr. Pedro volta ao CHAT com print do resultado
        ↓
10. CHAT analisa e gera comando de build/deploy
        ↓
11. Dr. Pedro autoriza deploy no CMD
        ↓
12. CMD executa deploy
        ↓
13. Dr. Pedro valida em neuroclinilaudos.com.br
        ↓
14. CHAT atualiza CHANGELOG.md
```

**Regra de ouro:** Nenhuma etapa pode ser pulada. Em urgência, o fluxo continua igual — só a velocidade muda.

---

## 🚦 REGRAS POR SITUAÇÃO

### Situação: Bug urgente em produção
```
1. Dr. Pedro descreve o erro no CHAT com print do console (F12)
2. CHAT identifica arquivo e linha exata — nunca chuta
3. CHAT gera prompt cirúrgico para CMD
4. CMD aplica APENAS a linha identificada
5. Deploy imediato após confirmação
6. CHANGELOG atualizado mesmo em urgência
```

### Situação: Nova funcionalidade
```
1. Dr. Pedro descreve a necessidade no CHAT
2. CHAT propõe: arquivo novo isolado (preferido) ou modificação mínima
3. Dr. Pedro aprova a abordagem
4. CHAT gera o código completo do arquivo novo
5. CHAT gera o prompt para CMD criar e integrar
6. CMD cria o arquivo e adiciona apenas as linhas de integração necessárias
7. Build + deploy após confirmação
```

### Situação: Alteração em teste neuropsicológico
```
OBRIGATÓRIO: Dr. Pedro digitar exatamente:
"AUTORIZO ALTERAÇÃO NO TESTE [nome do teste]"

Sem essa frase → CMD e CHAT recusam a alteração.
```

### Situação: Alteração no generateTextoConclusao.js
```
1. Dr. Pedro descreve a correção clínica com o critério exato
2. CHAT lê o arquivo completo antes de propor qualquer mudança
3. CHAT propõe apenas a linha/bloco específico a alterar
4. Dr. Pedro valida clinicamente (não é decisão técnica)
5. CMD aplica somente o trecho aprovado
6. JAMAIS substituir por lógica de IA/LLM
```

---

## 🗃️ ONDE FICA CADA COISA — referência rápida

| O que | Onde | Quem mexe |
|---|---|---|
| Código-fonte | GitHub pedrodonizetti347/Neuroclin | CMD (via push) |
| Site em produção | neuroclinilaudos.com.br (Firebase Hosting) | CMD (via deploy) |
| Banco de dados | Firebase Firestore — neuroclin-f55a5 | CMD (via regras) / Dr. Pedro (Console) |
| Arquivos de pacientes | Firebase Storage — neuroclin-f55a5 | Sistema (upload automático) |
| Status de laudos | Google Sheets LaudoStatus (Apps Script) | PainelLaudos.jsx (automático) |
| Agenda externa | ProDoctor API | DiagnosticoPrevent.jsx (leitura) |
| Projeto local | `C:\Users\Pedro Donizetti\Downloads\neuroclin\home\claude\neuroclin-v2` | CMD |
| Planejamento/decisões | Este chat (claude.ai) | Dr. Pedro + CHAT |

---

## 📌 INICIAR SESSÃO — script de abertura por ambiente

### Abrindo o CHAT (claude.ai)
Digitar sempre:
```
NeuroClin — [descrever o que precisa].
Última alteração confirmada: 02/06/2026 — UploadConvenio.jsx.
```

### Abrindo o CMD (Claude Code)
Colar sempre ao iniciar:
```
Leia o CLAUDE.md e o CHANGELOG.md na raiz do projeto em 
C:\Users\Pedro Donizetti\Downloads\neuroclin\home\claude\neuroclin-v2
Me confirme: qual foi a última alteração em produção, data e arquivo.
Aguarde instrução antes de qualquer ação.
```

### Abrindo o Noworking
Colar ao iniciar:
```
Você está trabalhando no projeto NeuroClin V2.
Leia obrigatoriamente o arquivo CLAUDE.md na raiz do projeto antes de qualquer ação.
Confirme para Dr. Pedro a última alteração registrada no CHANGELOG.md.
Só então pergunte o que precisa ser feito.
```

---

## ⚠️ SINAIS DE ALERTA — parar tudo se isso acontecer

- CMD propõe refatorar algo que não foi pedido → PARAR
- CMD sugere "melhorar" código funcionando → RECUSAR
- CMD vai alterar mais de um arquivo sem ser pedido → PARAR
- CMD vai fazer deploy sem perguntar → RECUSAR
- CHAT gera texto de conclusão de laudo → RECUSAR
- Qualquer agente sugere substituir generateTextoConclusao.js por IA → RECUSAR IMEDIATAMENTE

