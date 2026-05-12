# NeuroClin v2 — Estado do Projeto

> **Regra:** Atualizar este arquivo ao final de cada sessão de trabalho.
> Registrar: data, o que foi feito, o que está pendente, commits realizados.

---

## Stack
React + Vite + Tailwind | Firebase Auth (Google) + Firestore | Claude API via Cloud Functions (us-central1)

## Deploy atual
- **Frontend**: GitHub Pages → `https://pedrodonizetti347.github.io/Neuroclin/`
- **Domínio customizado**: `neuroclinlaudos.com.br`
  - CNAME em `public/CNAME` ✅
  - DNS no registro.br pendente (registros A + CNAME `www` — ver seção DNS abaixo)
  - HTTPS ativado via GitHub Pages Settings → Custom domain
- **Cloud Functions**: Firebase `neuroclin-f55a5` / us-central1 ✅ em produção
  - `prodoctorProxy` — proxy autenticado para ProDoctor Open API
  - `generateReport` — gera laudo com Claude API (`claude-opus-4-5`)

---

## Sessão 12/05/2026

### Commits desta sessão
| Hash     | Descrição |
|----------|-----------|
| `bd04a40` | fix: Analytics usa Cloud Function em vez de chamar Anthropic direto |
| `40a31cc` | feat: testes completos + CNAME neuroclinlaudos.com.br + estado documentado |

### O que foi feito

#### 1. Aviso VITE_ANTHROPIC_API_KEY removido
- **Analytics.jsx** tinha chamada direta à API da Anthropic com `apiKey` indefinido,
  exibindo aviso vermelho "VITE_ANTHROPIC_API_KEY não configurado no .env.local".
- Removidas as duas linhas responsáveis pelo aviso e pela chamada direta.
- Página "Relatórios" (`/relatorios`) agora usa a Cloud Function `generateReport`
  com token Firebase Auth — igual ao Reports.jsx. Aviso eliminado.

#### 2. Chave Anthropic nas Cloud Functions
- `ANTHROPIC_API_KEY` configurada em `functions/.env` e deployada nas Cloud Functions.
- Cliente Anthropic inicializado dentro de `generateReport` (não no escopo global),
  evitando erro quando a variável não existe localmente.
- Cloud Functions deployadas e funcionando em produção.

#### 3. Tests.jsx — 19 testes neuropsicológicos implementados
Design preservado (tema escuro `#0D1117`, cards `#1A2744`, verde `#2E7D32/#4CAF50`).
Base44 usado apenas como referência de campos — visual não alterado.

**Testes implementados:**

| Teste     | Grupo              | Classificação automática               |
|-----------|--------------------|----------------------------------------|
| RAVLT     | Memória            | Total A1–A5, curva de aprendizagem     |
| BAMS      | Memória            | `global_score` derivado                |
| MEMIMP    | Memória            | Total prospectivo + retrospectivo      |
| NEUPSILIN | Bateria Cognitiva  | Dropdowns por domínio → `neupsilinZScores` |
| TRIACOG   | Bateria Cognitiva  | Total (≥24 normal)                     |
| WASI-III  | Inteligência       | Dropdown classificação intelectual     |
| WCST-N    | Funções Executivas | —                                      |
| FAB       | Funções Executivas | Auto: ≥12 Preservado / <12 Comprometido |
| DEX       | Funções Executivas | —                                      |
| GDS-15    | Humor              | Auto: 3 faixas (sem / leve / grave)    |
| BDI-II    | Humor              | Auto: 4 faixas (mínima / leve / moderada / grave) |
| HAD       | Humor              | Auto por subescala (normal/leve/moderado/grave) |
| IDATE     | Ansiedade          | — (ponto de corte por sexo/idade)      |
| GAI       | Ansiedade          | Auto: ≥10 ansiedade clínica            |
| Lawton    | Funcional          | Auto: 3 faixas de independência        |
| B-ADL     | Funcional          | Auto: 4 faixas (independente → grave)  |
| PCRS      | Funcional          | Discrepância paciente − informante     |
| IQCODE    | Funcional          | Auto: ≥3,31 sugestivo de declínio      |
| TOKEN     | Linguagem          | Total (≥54 normal)                     |

**Nomes de campo corrigidos para alinhar com Cloud Function:**

| Teste     | Campo antigo          | Campo novo                                    |
|-----------|-----------------------|-----------------------------------------------|
| RAVLT     | `reconhecimento`      | `recognition`                                 |
| WCST-N    | `categorias`          | `categories_completed`                        |
| WCST-N    | `erros_perseverativos`| `perseverative_errors`                        |
| FAB       | (computado apenas UI) | `total_score`, `classification` (no Firestore)|
| GDS-15    | `score_total`         | `total_score`                                 |
| BDI-II    | `score_total`         | `total_score`                                 |
| GAI       | `score_total`         | `total_score`                                 |
| HAD       | `ansiedade`           | `anxiety_score` + `anxiety_classification`    |
| HAD       | `depressao`           | `depression_score` + `depression_classification` |
| Lawton    | chave `LAWTON`        | chave `Lawton`                                |
| BADL/Katz | chave `BADL`          | chave `B-ADL`                                 |
| BAMS      | —                     | `global_score`, `percentile`, `interpretation` |
| WASI-III  | `qi_total`            | `qit_2`, `qit_percentile`, `classification`   |

#### 4. Reports.jsx — integração NEUPSILIN
Extrai `neupsilinZScores` dos dropdowns de classificação do NEUPSILIN
(`orientation_z`, `attention_z`, `perception_z`, `memory_z`, `arithmetic_z`,
`language_z`, `praxis_z`, `executive_z`) e envia para a Cloud Function.

#### 5. functions/src/index.js — lbl() corrigida
Aceita tanto z-scores numéricos (uso antigo) quanto strings classificatórias
(`'PRESERVADO'`, `'LIMÍTROFE'`, `'COMPROMETIDO'`) vindas dos dropdowns do NEUPSILIN.

#### 6. Domínio customizado neuroclinlaudos.com.br
- `public/CNAME` criado com conteúdo `neuroclinlaudos.com.br`
- Build + deploy no GitHub Pages efetuados
- **Pendente**: configurar DNS no registro.br (ver seção abaixo)

---

## DNS — neuroclinlaudos.com.br

**Status (12/05/2026):** ✅ Configurado no registro.br | ⏳ Aguardando propagação | 🔒 HTTPS pendente

- Registro A configurado: `185.199.108.153` (IP GitHub Pages)
- GitHub Pages ainda mostra "DNS check unsuccessful" — normal durante propagação (pode levar até 48h)
- **Próximo passo:** quando o check verde aparecer no GitHub Pages → marcar **Enforce HTTPS**

Registros configurados no registro.br:

| Tipo  | Nome   | Valor                             | Status        |
|-------|--------|-----------------------------------|---------------|
| A     | `@`    | `185.199.108.153`                 | ✅ configurado |
| A     | `@`    | `185.199.109.153`                 | (recomendado) |
| A     | `@`    | `185.199.110.153`                 | (recomendado) |
| A     | `@`    | `185.199.111.153`                 | (recomendado) |
| CNAME | `www`  | `pedrodonizetti347.github.io`     | (recomendado) |

---

## Estrutura de dados no Firestore

```
sessions/{patientId}_{userId}
  patientId, professionalId, updatedAt
  tests:
    RAVLT:      a1..a7, b1, recognition, total_a1_a5, _appliedAt
    BAMS:       mem_infancia, mem_adulto, mem_recente, semantica_pessoal,
                global_score, percentile, interpretation
    MEMIMP:     score_prospectivo, score_retrospectivo
    NEUPSILIN:  {escores brutos por domínio}
                orientation_z, attention_z, perception_z, memory_z,
                arithmetic_z, language_z, praxis_z, executive_z
    TRIACOG:    orientacao, memoria_imediata, atencao, evocacao,
                linguagem, praxia_construtiva, total_score
    WASI-III:   vocab/cubos/matrices/semelhancas (bruto+ponderado),
                qi_verbal, qi_execucao, qit_2, qit_percentile, classification
    WCST-N:     categories_completed, perseverative_errors,
                non_perseverative_errors, total_errors, total_trials
    FAB:        semelhancas, fluencia_lexical, serie_motora,
                instrucoes_conflitantes, go_no_go, comportamento_preensao,
                total_score, classification
    DEX:        versao, informante_nome, score_total
    GDS-15:     total_score, classification
    BDI-II:     total_score, subtotal_cognitivo, subtotal_somatico, classification
    HAD:        anxiety_score, anxiety_classification,
                depression_score, depression_classification
    IDATE:      estado, traco
    GAI:        total_score, classification
    Lawton:     telefone, compras, cozinhar, tarefas_domesticas, lavanderia,
                transporte, medicamentos, financas, total_score, classification
    B-ADL:      banho, vestuario, higiene_pessoal, transferencia,
                continencia, alimentacao, total_score, classification
    PCRS:       auto_total, informante_total
    IQCODE:     informante_nome, informante_relacao, total_score, classification
    TOKEN:      parte1..parte5, total_score
  anamnesis:
    objetivo_avaliacao, queixas, queixas_cognitivas_emocionais,
    inicio_sintomas_data, desenvolvimento_sintomas, medicamentos,
    doencas_preexistentes, escolaridade, profissao, sono_como_e,
    apetite_como_e, atividade_fisica, lazer, historico_familiar_memoria

reports/{patientId}_{timestamp}
  patientId, professionalId, professionalName
  selectedTests[], reportHtml, status, createdAt

patients/{patientId}
  full_name, birth_date, sex, education, createdAt, ...
```

---

## Variáveis de ambiente

### Frontend (`src/.env.local`)
```
VITE_FIREBASE_API_KEY=AIzaSyDf8HwaCXPwY_lldz84fp14x2rddarvKfE
VITE_FIREBASE_AUTH_DOMAIN=neuroclin-f55a5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neuroclin-f55a5
VITE_FIREBASE_STORAGE_BUCKET=neuroclin-f55a5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1030643229452
VITE_FIREBASE_APP_ID=1:1030643229452:web:8940ff2406ee3ca5a65f29
VITE_FUNCTIONS_URL=https://us-central1-neuroclin-f55a5.cloudfunctions.net
```

### Cloud Functions (`functions/.env`)
```
ANTHROPIC_API_KEY=sk-ant-...   ← configurada e deployada em 12/05/2026
PRODOCTOR_KEY=...
PRODOCTOR_PASS=...
```

---

## Rotas

| Path              | Componente      | Descrição                                  |
|-------------------|-----------------|--------------------------------------------|
| `/`               | Dashboard       | Visão geral                                |
| `/pacientes`      | Patients        | CRUD de pacientes                          |
| `/testes`         | Tests           | 19 testes neuropsicológicos                |
| `/laudos`         | Reports         | Geração de laudo via Cloud Function        |
| `/relatorios`     | Analytics       | Geração alternativa de laudo (simplificada)|
| `/prontuario`     | MedicalRecords  | Prontuário do paciente                     |
| `/configuracoes`  | Settings        | Importar profissionais do ProDoctor        |
| `/admin-setup`    | AdminSetup      | Configuração inicial de admin              |

---

## Pendências / próximas sessões
- [x] Configurar DNS neuroclinlaudos.com.br no registro.br ✅ feito em 12/05/2026
- [ ] Ativar HTTPS no GitHub Pages após propagação do DNS (aguardando)
- [ ] Implementar Anamnese completa em MedicalRecords.jsx
- [ ] Dashboard com métricas reais (laudos gerados, pacientes cadastrados)
- [ ] Pfeffer e outros testes adicionais se necessário
