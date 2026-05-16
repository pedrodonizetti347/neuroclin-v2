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
## REGRAS DE CONTROLE DE ACESSO — IMPRESSÃO / PDF / WORD

### Quem pode imprimir e exportar:
- **Apenas supervisores** (Pedro Donizetti ou Débora) têm acesso ao botão IMPRIMIR / PDF e EXPORTAR WORD
- **Aplicadores NÃO têm acesso** a imprimir nem baixar PDF — eles apenas editam e submetem o laudo para aprovação
- Impressão e exportação só ficam disponíveis **após o laudo ser aprovado** pelo supervisor

### Regra de permissão:
```
isSupervisor && reportStatus === 'aprovado' → mostra botões IMPRIMIR e EXPORTAR WORD
!isSupervisor → nunca mostra botão de impressão, mesmo após aprovação
```

### REGRA PRINCIPAL:
Só altere o que foi explicitamente pedido. 
Se não foi pedido, não toque.