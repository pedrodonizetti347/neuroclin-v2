# NeuroClin — Instruções para Claude Code

## Stack
React + Vite + Tailwind | Firebase Auth (Google) + Firestore | Claude API via Cloud Functions

## Rodar local
```bash
npm install
cp .env.local.example .env.local   # preencher com Firebase config
npm run dev
```

## Problema resolvido: estado que zerava
Solução: hook `useTestSession` em `src/hooks/useTestSession.js`
- Cada teste atualiza APENAS seu slice: `updateTest('RAVLT', data)`
- Nunca sobrescreve o objeto inteiro
- Firestore salva com `merge: true` — campos ausentes não são apagados

## Estrutura
src/
  lib/firebase.js          ← Firebase init
  lib/AuthContext.jsx      ← Auth Google
  hooks/useTestSession.js  ← Estado de testes (anti-reset)
  hooks/usePatients.js     ← CRUD pacientes
  pages/                   ← Dashboard, Patients, Reports, Tests...
  components/              ← Layout, forms, UI reutilizável

## Para adicionar novo teste
1. Criar src/components/tests/MeuTesteForm.jsx
2. Chamar updateTest('MEU_TESTE', dados) ao salvar
3. Adicionar rota em App.jsx
