# NeuroClin v2 — Estado do Projeto (12/05/2026)

## Stack
React + Vite + Tailwind | Firebase Auth (Google) + Firestore | Claude API via Cloud Functions (us-central1)

## Deploy
- **Frontend**: GitHub Pages → `https://pedrodonizetti347.github.io/Neuroclin/`
- **Domínio customizado**: `neuroclinlaudos.com.br` (CNAME configurado em `public/CNAME`)
- **Cloud Functions**: Firebase `neuroclin-f55a5` / us-central1
  - `prodoctorProxy` — proxy autenticado para ProDoctor Open API
  - `generateReport` — gera laudo com Claude API (claude-opus-4-5)

## O que foi feito hoje (12/05/2026)

### Correções críticas
- **Analytics.jsx**: removida chamada direta à API da Anthropic (VITE_ANTHROPIC_API_KEY).
  Página "Relatórios" agora usa a Cloud Function `generateReport` com token Firebase Auth,
  igual ao Reports.jsx. O aviso vermelho foi eliminado.
- **functions/src/index.js**: cliente Anthropic movido para dentro de `generateReport`
  (evita erro de inicialização quando a variável de ambiente não existe).
- **functions/.env**: chave `ANTHROPIC_API_KEY` configurada no ambiente das Cloud Functions.
- **lbl()**: corrigida para aceitar tanto z-scores numéricos quanto strings classificatórias
  ('PRESERVADO' / 'LIMÍTROFE' / 'COMPROMETIDO') — compatível com NEUPSILIN.

### Implementação completa dos testes neuropsicológicos (Tests.jsx)
Todos os 16 testes solicitados implementados com:
- Campos de entrada corretos por instrumento
- **Classificação automática** (GDS-15, BDI-II, HAD, FAB, GAI, Lawton, BADL, IQCODE)
- **Valores derivados** calculados no save (`total_score`, `classification`, etc.)
- Nomes de campo alinhados com o que a Cloud Function espera no prompt

| Teste       | Grupo              | Classificação automática |
|-------------|-------------------|--------------------------|
| RAVLT       | Memória            | Curva + total A1-A5      |
| BAMS        | Memória            | global_score derivado     |
| MEMIMP      | Memória            | Total                    |
| NEUPSILIN   | Bateria Cognitiva  | Dropdowns por domínio (→ neupsilinZScores) |
| TRIACOG     | Bateria Cognitiva  | Total                    |
| WASI-III    | Inteligência       | Dropdown classificação   |
| WCST-N      | Funções Executivas | —                        |
| FAB         | Funções Executivas | Auto: ≥12 Preservado     |
| DEX         | Funções Executivas | —                        |
| GDS-15      | Humor              | Auto (3 faixas)          |
| BDI-II      | Humor              | Auto (4 faixas)          |
| HAD         | Humor              | Auto por subescala       |
| IDATE       | Ansiedade          | —                        |
| GAI         | Ansiedade          | Auto: ≥10 clínico        |
| Lawton      | Funcional          | Auto (3 faixas)          |
| B-ADL       | Funcional          | Auto (4 faixas)          |
| PCRS        | Funcional          | Discrepância             |
| IQCODE      | Funcional          | Auto: ≥3,31              |
| TOKEN       | Linguagem          | Total                    |

### Nomes de campo alinhados com Cloud Function
| Teste     | Campo corrigido                                  |
|-----------|--------------------------------------------------|
| RAVLT     | `recognition` (era `reconhecimento`)             |
| WCST-N    | `categories_completed`, `perseverative_errors`   |
| FAB       | `total_score`, `classification` (derivados)      |
| GDS-15    | `total_score` (era `score_total`)                |
| BDI-II    | `total_score` (era `score_total`)                |
| GAI       | `total_score` (era `score_total`)                |
| HAD       | `anxiety_score`, `depression_score`, `*_classification` |
| Lawton    | chave `Lawton` (era `LAWTON`), `total_score`, `classification` |
| BADL/Katz | chave `B-ADL` (era `BADL`), `total_score`, `classification` |
| BAMS      | `global_score`, `percentile`, `interpretation`   |
| WASI-III  | `qit_2`, `qit_percentile`, `classification`      |

### Reports.jsx — integração NEUPSILIN
`neupsilinZScores` extraído das classificações do NEUPSILIN (`orientation_z`,
`attention_z`, etc.) e enviado para a Cloud Function no payload.

### Domínio customizado
- Arquivo `public/CNAME` criado com `neuroclinlaudos.com.br`
- Build + deploy efetuados

## Estrutura de dados no Firestore

```
sessions/{patientId}_{userId}
  .tests.RAVLT.a1...a7, recognition, total_a1_a5
  .tests.BAMS.mem_infancia...global_score, percentile, interpretation
  .tests.NEUPSILIN.{escores brutos} + orientation_z...executive_z
  .tests.FAB.{itens} + total_score, classification
  .tests['GDS-15'].total_score, classification
  .tests['BDI-II'].total_score, classification
  .tests.HAD.anxiety_score, anxiety_classification, depression_score, depression_classification
  .tests.GAI.total_score, classification
  .tests.Lawton.{itens} + total_score, classification
  .tests['B-ADL'].{itens} + total_score, classification
  .tests.IQCODE.total_score, classification
  .tests.TOKEN.{partes} + total_score
  .tests.WASI-III.qit_2, qit_percentile, classification
  .tests['WCST-N'].categories_completed, perseverative_errors
  .anamnesis.{campos}

reports/{patientId}_{timestamp}
  .patientId, professionalId, professionalName
  .selectedTests[], reportHtml, status, createdAt

patients/{patientId}
  .full_name, birth_date, sex, education, ...
```

## Variáveis de ambiente

### Frontend (.env.local)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=neuroclin-f55a5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neuroclin-f55a5
VITE_FIREBASE_STORAGE_BUCKET=neuroclin-f55a5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1030643229452
VITE_FIREBASE_APP_ID=...
VITE_FUNCTIONS_URL=https://us-central1-neuroclin-f55a5.cloudfunctions.net
```

### Cloud Functions (functions/.env)
```
ANTHROPIC_API_KEY=sk-ant-...
PRODOCTOR_KEY=...
PRODOCTOR_PASS=...
```

## Rotas
| Path            | Página         |
|----------------|----------------|
| /               | Dashboard      |
| /pacientes      | Patients       |
| /laudos         | Reports (laudo via Cloud Function) |
| /testes         | Tests (todos os 16 testes) |
| /prontuario     | MedicalRecords |
| /relatorios     | Analytics (laudo via Cloud Function) |
| /configuracoes  | Settings       |
| /admin-setup    | AdminSetup     |
