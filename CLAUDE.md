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
