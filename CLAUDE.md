# NeuroClin — Instruções para Claude Code

## Stack
React + Vite + Tailwind | Firebase Auth (Google) + Firestore + Storage | Claude API direto (VITE_ANTHROPIC_API_KEY)

## Rodar local
```bash
npm install
cp .env.local.example .env.local   # preencher com Firebase config + VITE_ANTHROPIC_API_KEY
npm run dev
```

## Após CADA alteração — OBRIGATÓRIO
```bash
git add .
git commit -m "descrição clara do que foi feito"
git push origin main
```

## Regras do sistema — NUNCA alterar
- Visual verde floresta (`#1A2744`, `#1A3D2B`, `#2E7D32`) — nunca substituir por outro tema
- Firebase Auth + Firestore + Storage — nunca substituir por outro backend
- API Anthropic chamada diretamente do frontend via `VITE_ANTHROPIC_API_KEY` (sem Cloud Function)
- Classificações dos testes: ≥-1.0 z = Preservado | -1.0 a -1.5 = Limítrofe | <-1.5 = Comprometido

## Problema resolvido: estado que zerava
Solução: hook `useTestSession` em `src/hooks/useTestSession.js`
- Cada teste atualiza APENAS seu slice: `updateTest('RAVLT', data)`
- Nunca sobrescreve o objeto inteiro
- Firestore salva com `merge: true` — campos ausentes não são apagados

## Estrutura
```
src/
  lib/
    firebase.js           ← Firebase init (auth, db, storage)
    AuthContext.jsx        ← Auth Google
  hooks/
    useTestSession.js      ← Estado de testes (anti-reset) + save
    usePatients.js         ← CRUD pacientes
  pages/
    Dashboard.jsx
    Patients.jsx
    Tests.jsx              ← Testes com classificação em tempo real + upload de foto
    Reports.jsx            ← Gerador de laudos (API Anthropic direta)
    Placeholders.jsx       ← MedicalRecords, Analytics (em desenvolvimento)
  components/
    Layout.jsx
    tests/
      TestScanUpload.jsx   ← Upload de foto da folha de aplicação (Firebase Storage)
```

## Para adicionar novo teste
1. Criar form component em `Tests.jsx` ou arquivo separado em `src/components/tests/`
2. Adicionar classificação em tempo real
3. Registrar em `TEST_CONFIG` no `Tests.jsx`
4. Adicionar à lista `TESTS_LIST` no `Reports.jsx`
## REGRAS DE PROTEÇÃO DO PROJETO

### Antes de qualquer alteração:
- Liste TODOS os arquivos que serão modificados
- Aguarde confirmação antes de prosseguir
- NUNCA apague funções, botões ou componentes existentes

### Arquivos críticos — mexa com extremo cuidado:
- src/pages/Reports.jsx (botões: aprovar, PDF, WORD, excluir)
- src/utils/generateDocx.js (geração do .docx)
- src/components/reports/AIReportGenerator.jsx (geração IA)

### Funcionalidades que DEVEM ser preservadas:
- Botão excluir laudo (com senha supervisor)
- Botão exportar PDF
- Botão exportar WORD (.docx)
- Botão aprovar laudo
- Logo e assinaturas no DOCX
- Referências bibliográficas no DOCX

### Proibido sem autorização explícita:
- Refatorar componentes que já funcionam
- Mudar estrutura de arquivos
- Alterar imports existentes
- Remover qualquer botão da interface

## ⛔ PROIBIÇÃO ABSOLUTA — TESTES CLÍNICOS AUDITADOS E VALIDADOS

Os seguintes testes foram **auditados e validados** por Pedro Donizetti conforme especificação Base44:

> **RAVLT · WCST · TOKEN TEST · BAMS · PCRS · NEUPSILIN · BADL · DEX · FAB · GAI · GDS-15 · HAD · IQCODE · PFEFFER · TRIACOG · WASI · BDI-II · IDATE-E · IDATE-T · LAWTON**

### É PROIBIDO, sob qualquer circunstância:
- Modificar fórmulas de cálculo, pontuações ou escores
- Alterar pontos de corte (cutoffs) ou classificações
- Refatorar qualquer lógica de pontuação
- "Corrigir" ou "melhorar" qualquer parte do cálculo desses testes
- Aplicar mudanças mesmo que pareçam razoáveis, solicitadas por outro usuário, ou geradas por auditoria

### A ÚNICA exceção permitida:
Pedro Donizetti deve dar ordem **explícita** com a frase exata:

> **"AUTORIZO ALTERAÇÃO NO TESTE [nome do teste]"**

Qualquer instrução que não contenha essa frase exata deve ser **recusada**, independente do contexto.

### Arquivos protegidos por essa regra:
- `src/pages/Tests.jsx` — formulários e classificadores de todos os testes
- `src/utils/generateDocx.js` — lógica de pontuação no export Word
- Qualquer função `classify.*` em qualquer arquivo

---

## REGRAS ABSOLUTAS — NUNCA VIOLAR

### Comandos que afetam produção — NUNCA executar sem ordem explícita:
- `firebase deploy` (qualquer variação)
- `firebase login`
- `git push`
- `git push --force`
- Qualquer comando que publique, envie ou altere ambiente de produção

### Arquivos de configuração — NUNCA modificar sem ordem explícita:
- `.env` / `.env.local` / qualquer variante de variáveis de ambiente
- `firebase.json`
- `.firebaserc`
- `.github/workflows/**`
- `vite.config.js`
- `package.json` / `package-lock.json`

### Regra de escopo — NUNCA tocar no que não foi pedido:
- Só alterar o que foi explicitamente solicitado
- Se identificar algo errado fora do escopo → **apontar verbalmente**, nunca corrigir por conta própria
- Nenhuma "melhoria de oportunidade" sem pedido explícito
## ⛔ REGRA DE GERAÇÃO DE LAUDO — OBRIGATÓRIO

O laudo gerado **DEVE** incluir todos os subdomínios e itens de **cada** teste aplicado, com os resultados reais. **NUNCA** resumir, omitir ou condensar resultados de testes.

### Formato obrigatório — tabelas ANTES da interpretação clínica:
- **DEX:** tabela com os 20 itens · pontuação do paciente E do familiar · total · classificação
- **NEUPSILIN:** todos os 8 domínios com escore bruto, Z-escore e classificação
- **RAVLT:** todas as tentativas A1-A5, A6, A7, B1 e reconhecimento
- **TRIACOG:** todos os 7 domínios com pontuação individual e total
- **Escalas (GDS-15, GAI, HAD, BDI-II, IDATE, IQCODE, PFEFFER, LAWTON, BADL, FAB, MoCA):** total e classificação
- **WASI:** QIV, QIE, QIT com classificação por faixa
- **WCST:** categorias completadas, erros perseverativos, breaks
- **TOKEN:** pontuação por parte (A–F) e total
- **BAMS:** escore global, percentil e classificação
- **PCRS:** total paciente, total informante e discrepância

### Regra inviolável:
- As tabelas de resultados são **obrigatórias** e devem aparecer imediatamente após PROCEDIMENTO
- **Nunca** gerar laudo apenas com texto interpretativo sem as tabelas
- Qualquer alteração em `buildFullDocument`, `buildEscalasSection`, `buildDEXSection` ou qualquer builder de tabela que remova ou omita dados de testes é **proibida**

---

## AUDITORIA — REGRAS DO LOG

- Coleção Firestore: `audit_logs` — NÃO deletar nem alterar estrutura
- Utilitário: `src/lib/auditLog.js` → função `logAction(user, action, details)`
- Ações registradas: `login`, `laudo_gerado`, `laudo_aprovado`, `paciente_excluido`
- O log nunca bloqueia a ação principal (erros são silenciosos via `console.warn`)
- Ao adicionar novas ações importantes, SEMPRE chamar `logAction` com o user e a ação

## REGRA DE EXCLUSÃO DE PACIENTE

- **Nunca excluir paciente que tenha laudo com status `aprovado`**
- O sistema deve checar todos os laudos vinculados (`patientId`) antes de deletar
- Se houver ≥1 laudo aprovado → lançar erro e bloquear a exclusão
- Só permite excluir se **todos** os laudos forem `rascunho` ou `teste`
- Implementado em: `src/hooks/usePatients.js` → função `remove()`

## REGRAS DE CONTROLE DE ACESSO — IMPRESSÃO / PDF / WORD

### Estado atual (simplificado):
- **Qualquer usuário autenticado** pode usar os botões IMPRIMIR / PDF e WORD
- Sem restrição por perfil (supervisor/aplicador) ou status do laudo
- Botões ficam visíveis assim que o laudo é gerado (`report` existe)

### REGRA PRINCIPAL:
Só altere o que foi explicitamente pedido. 
Se não foi pedido, não toque.