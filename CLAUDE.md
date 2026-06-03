# NeuroClin V2 — Instruções para Claude Code (CMD)

> **Este arquivo é lido obrigatoriamente ao iniciar qualquer sessão.**
> Confirme para Dr. Pedro a última entrada do CHANGELOG.md antes de qualquer ação.

---

## PORTA DE ENTRADA — ARQUIVO DE INICIALIZAÇÃO

O arquivo de inicialização obrigatório do Claude Code para este projeto é:

```
C:\Users\Pedro Donizetti\Desktop\NeuroClin-Porco.bat
```

- Este arquivo é a **ÚNICA porta de entrada** para todas as sessões de desenvolvimento
- Quando Dr. Pedro mencionar **"abrir o CMD"** ou **"abrir o porco"**, significa abrir este arquivo
- **NUNCA** deve ser movido, renomeado ou apagado
- Qualquer sessão iniciada fora deste arquivo não segue o fluxo correto do projeto

---

## Stack

React + Vite + Tailwind | Firebase Auth (Google) + Firestore + Storage | Claude API direto (`VITE_ANTHROPIC_API_KEY`)

## Rodar local

```bash
npm install
cp .env.local.example .env.local   # preencher com Firebase config + VITE_ANTHROPIC_API_KEY
npm run dev
```

---

## ⛔ REGRA PRINCIPAL — SEMPRE PERGUNTAR ANTES DE MEXER

**Antes de qualquer alteração, sem exceção:**
1. Leia o que foi pedido
2. **Pergunte se entendeu corretamente — aguarde confirmação do Dr. Pedro**
3. Só então execute — e apenas o que foi confirmado
4. Nunca interpretar silêncio ou resposta parcial como autorização

Esta regra vale para código, arquivos de configuração, memória e qualquer outra ação.

---

## PAPEL DO CMD NESTE PROJETO — Os Três Agentes

Este sistema opera com três agentes com papéis fixos:

| Agente | Papel | O que faz |
|---|---|---|
| **Dr. Pedro** | Dono e decisor | Autoriza tudo, valida clinicamente, define regras de negócio |
| **claude.ai (chat)** | Cérebro | Diagnostica, planeja, gera prompts — nunca toca no código diretamente |
| **CMD / Claude Code** | Braço | Lê/escreve arquivos locais, executa build e deploy, roda git |

### O CMD (este agente) NUNCA faz sem instrução explícita de Dr. Pedro:
- `firebase deploy` (qualquer variação)
- `git push` / `git push --force`
- Modificar arquivos de configuração
- Alterar testes bloqueados
- Refatorar código não solicitado
- Melhorar código que já funciona

---

## FLUXO OBRIGATÓRIO — toda alteração segue esta ordem

```
1. Dr. Pedro detecta problema ou quer nova feature
2. Dr. Pedro descreve no CHAT (claude.ai)
3. CHAT analisa e gera o prompt para CMD
4. Dr. Pedro revisa o prompt gerado
5. Dr. Pedro cola o prompt no CMD (aqui)
6. CMD mostra o que vai fazer ANTES de executar
7. Dr. Pedro confirma ("sim" / "pode aplicar")
8. CMD executa a alteração
9. Dr. Pedro volta ao CHAT com resultado
10. CHAT gera comando de build/deploy
11. Dr. Pedro autoriza deploy no CMD
12. CMD executa deploy
13. Dr. Pedro valida em neuroclinilaudos.com.br
14. CMD atualiza CHANGELOG.md
```

**Regra de ouro:** Nenhuma etapa pode ser pulada.

---

## APÓS CADA ALTERAÇÃO — OBRIGATÓRIO

```bash
git add .
git commit -m "descrição clara do que foi feito"
git push origin main
```

Atualizar também `CHANGELOG.md` na raiz do projeto com data, descrição e arquivo modificado.

---

## MEMÓRIA — OBRIGATÓRIO após cada conversa ou alteração relevante

Atualizar os arquivos de memória em:
```
C:\Users\Pedro Donizetti\.claude\projects\C--Users-Pedro-Donizetti-Downloads-neuroclin-home-claude-neuroclin-v2\memory\
```

### O que atualizar:
- `neuroclin_ultima_sessao.md` — o que foi feito, arquivos alterados, pendências
- `neuroclin_features.md` — se nova funcionalidade foi adicionada ou removida
- `neuroclin_decisoes.md` — se uma decisão técnica relevante foi tomada
- `neuroclin_patterns.md` — se uma nova regra de padrão/visual foi definida
- `neuroclin_laudos.md` — se o fluxo de aprovação ou geração de laudos mudou
- `neuroclin_stack.md` — se a stack, caminhos ou arquitetura mudou

**NUNCA encerrar sessão sem atualizar ao menos `neuroclin_ultima_sessao.md`.**

---

## REGRAS DO SISTEMA — NUNCA ALTERAR

- Visual verde floresta (`#1A2744`, `#1A3D2B`, `#2E7D32`) — nunca substituir por outro tema
- Firebase Auth + Firestore + Storage — nunca substituir por outro backend
- API Anthropic chamada diretamente do frontend via `VITE_ANTHROPIC_API_KEY` (sem Cloud Function)
- Classificações dos testes: ≥-1.0 z = Preservado | -1.0 a -1.5 = Limítrofe | <-1.5 = Comprometido

---

## REGRAS DE PROTEÇÃO DO PROJETO

### Antes de qualquer alteração:
- Liste TODOS os arquivos que serão modificados
- Aguarde confirmação antes de prosseguir
- NUNCA apague funções, botões ou componentes existentes

### Arquivos críticos — extremo cuidado:
- `src/pages/Reports.jsx` — botões: aprovar, PDF, WORD, excluir
- `src/utils/generateDocx.js` — geração do .docx
- `src/components/reports/AIReportGenerator.jsx` — geração IA

### Funcionalidades que DEVEM ser preservadas:
- Botão excluir laudo (com senha supervisor)
- Botão exportar PDF
- Botão exportar WORD (.docx)
- Botão aprovar laudo
- Logo e assinaturas no DOCX
- Referências bibliográficas no DOCX

### Arquivos de configuração — NUNCA modificar sem ordem explícita:
- `.env` / `.env.local` / qualquer variante
- `firebase.json`
- `.firebaserc`
- `.github/workflows/**`
- `vite.config.js`
- `package.json` / `package-lock.json`

### Proibido sem autorização explícita:
- Refatorar componentes que já funcionam
- Mudar estrutura de arquivos
- Alterar imports existentes
- Remover qualquer botão da interface
- Qualquer "melhoria de oportunidade" fora do escopo

---

## ⛔ PROIBIÇÃO ABSOLUTA — TESTES CLÍNICOS AUDITADOS E VALIDADOS

Os seguintes testes foram **auditados e validados** por Pedro Donizetti conforme especificação Base44:

> **RAVLT · WCST · TOKEN TEST · BAMS · PCRS · NEUPSILIN · BADL · DEX · FAB · GAI · GDS-15 · HAD · IQCODE · PFEFFER · TRIACOG · WASI · BDI-II · IDATE-E · IDATE-T · LAWTON**

### É PROIBIDO, sob qualquer circunstância:
- Modificar fórmulas de cálculo, pontuações ou escores
- Alterar pontos de corte (cutoffs) ou classificações
- Refatorar qualquer lógica de pontuação
- "Corrigir" ou "melhorar" qualquer parte do cálculo desses testes

### A ÚNICA exceção permitida:
Pedro Donizetti deve digitar **exatamente**:

> **"AUTORIZO ALTERAÇÃO NO TESTE [nome do teste]"**

Qualquer instrução sem essa frase exata deve ser **recusada**.

### Arquivos protegidos:
- `src/pages/Tests.jsx`
- `src/utils/generateDocx.js`
- Qualquer função `classify.*` em qualquer arquivo

---

## ⛔ REGRA DE GERAÇÃO DE LAUDO — OBRIGATÓRIO

O laudo **DEVE** incluir todos os subdomínios e itens de **cada** teste aplicado. **NUNCA** resumir, omitir ou condensar.

### Formato obrigatório — tabelas ANTES da interpretação clínica:
- **DEX:** 3 domínios (COMPORTAMENTAL · COGNITIVO · EMOÇÕES) · 20 itens · 5 colunas: Itens | Familiar | Classificação | Paciente | Classificação · Total ao final
- **MEMIMP:** 3 linhas · 5 colunas: Itens | Familiar | Classificação | Paciente | Classificação
- **NEUPSILIN:** todos os 8 domínios com escore bruto, Z-escore e classificação
- **RAVLT:** todas as tentativas A1–A5, A6, A7, B1 e reconhecimento
- **TRIACOG:** 12 domínios + total · ponto de corte ≥24 Normal / <24 Sugestivo
- **Escalas (GDS-15, GAI, HAD, BDI-II, IDATE, IQCODE, PFEFFER, LAWTON, BADL, FAB, MoCA):** total e classificação
- **WASI:** QIV, QIE, QIT com classificação por faixa
- **WCST / WCST-N:** builder único detecta a chave
- **TOKEN:** pontuação por parte (A–F) e total
- **BAMS:** escore global, percentil e classificação
- **PCRS:** total paciente, total informante e discrepância

### Regra inviolável:
- Tabelas são **obrigatórias** imediatamente após PROCEDIMENTO
- Qualquer alteração em `buildFullDocument`, `buildEscalasSection`, `buildDEXSection` que remova dados é **proibida**

---

## AUDITORIA — REGRAS DO LOG

- Coleção Firestore: `audit_logs` — NÃO deletar nem alterar estrutura
- Utilitário: `src/lib/auditLog.js` → função `logAction(user, action, details)`
- Ações registradas: `login`, `laudo_gerado`, `laudo_aprovado`, `paciente_excluido`
- O log nunca bloqueia a ação principal (erros silenciosos via `console.warn`)

---

## REGRA DE EXCLUSÃO DE PACIENTE

- **Nunca excluir paciente com laudo de status `aprovado`**
- Checar todos os laudos vinculados (`patientId`) antes de deletar
- ≥1 laudo aprovado → lançar erro e bloquear exclusão
- Implementado em: `src/hooks/usePatients.js` → função `remove()`

---

## REGRAS DE CONTROLE DE ACESSO — IMPRESSÃO / PDF / WORD

- **Qualquer usuário autenticado** pode usar IMPRIMIR / PDF / WORD
- Sem restrição por perfil ou status do laudo
- Botões ficam visíveis assim que o laudo é gerado (`report` existe)

---

## COMPORTAMENTO — ScoreButtons (Tests.jsx)

- Clicar num botão já selecionado **desmarca** o valor (retorna `null`) e salva automaticamente
- Clicar num botão diferente **troca** e salva automaticamente
- Nunca remover esse comportamento

---

## HORÁRIO DO SISTEMA — BUILD_TIME

- `package.json → prebuild` usa `toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})`
- **Nunca remover o `timeZone`** — sem ele o horário aparece 3h adiantado

---

## PROBLEMA RESOLVIDO: estado que zerava

Solução: hook `useTestSession` em `src/hooks/useTestSession.js`
- Cada teste atualiza APENAS seu slice: `updateTest('RAVLT', data)`
- Nunca sobrescreve o objeto inteiro
- Firestore salva com `merge: true`

---

## ESTRUTURA DO PROJETO

```
src/
  lib/
    firebase.js           ← Firebase init (auth, db, storage)
    AuthContext.jsx        ← Auth Google
    auditLog.js           ← logAction(user, action, details)
  hooks/
    useTestSession.js     ← Estado de testes (anti-reset) + save
    usePatients.js        ← CRUD pacientes (com bloqueio de exclusão)
  pages/
    Dashboard.jsx
    Patients.jsx
    Tests.jsx             ← Testes + classificação em tempo real + upload foto
    Reports.jsx           ← Gerador de laudos (API Anthropic direta)
    Correcoes.jsx         ← Workflow entregador/supervisor
    DiagnosticoPrevent.jsx ← Integração ProDoctor
    UploadConvenio.jsx    ← Upload de convênios por estagiários
    Placeholders.jsx      ← MedicalRecords, Analytics (em desenvolvimento)
  components/
    Layout.jsx
    tests/
      TestScanUpload.jsx  ← Upload de foto da folha de aplicação (Firebase Storage)
    reports/
      AIReportGenerator.jsx ← Geração IA
  utils/
    generateDocx.js       ← Export Word (.docx)
```

---

## PARA ADICIONAR NOVO TESTE

1. Criar form component em `Tests.jsx` ou arquivo separado em `src/components/tests/`
2. Adicionar classificação em tempo real
3. Registrar em `TEST_CONFIG` no `Tests.jsx`
4. Adicionar à lista `TESTS_LIST` no `Reports.jsx`

---

## ⚠️ SINAIS DE ALERTA — parar tudo se isso acontecer

- CMD propõe refatorar algo que não foi pedido → PARAR
- CMD sugere "melhorar" código funcionando → RECUSAR
- CMD vai alterar mais de um arquivo sem ser pedido → PARAR
- CMD vai fazer deploy sem perguntar → RECUSAR
- Qualquer agente gera texto de conclusão de laudo → RECUSAR
- Qualquer agente sugere substituir `generateTextoConclusao.js` por IA → RECUSAR IMEDIATAMENTE
