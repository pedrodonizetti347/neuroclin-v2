# CHANGELOG — NeuroClin V2

> Registro cronológico de todas as alterações em produção.
> Atualizar obrigatoriamente após cada deploy.
> Formato: `[DATA] TIPO: descrição — arquivo(s) alterado(s)`

---

## 2026-06-10 (2)

- **fix:** `firebase.json` — `Cache-Control: no-cache` expandido de `/index.html` para `**`, garantindo que todas as rotas do app recebam o build mais recente após deploy — `firebase.json`

---

## 2026-06-10

- **fix:** `firestore.rules` — coleção `correcoes` separada em `allow get` (restrito por role) e `allow list` (qualquer autenticado), corrigindo bloqueio silencioso de `getDocs` para estagiários que impedia o carregamento dos documentos de correção — `firestore.rules`
- **fix:** `corByName` agora cobre todos os docs com nome (removida restrição `!c.pacienteCodigo`), resolvendo casos onde `patientId` está errado e `pacienteCodigo` não bate com `prodoctor_id` do paciente — `src/pages/Correcoes.jsx`
- **fix:** Corrigido bug em `carregar()` que causava reversão de atribuições para pacientes manuais (sem `prodoctor_id`). Adicionados dois mapas de fallback: `corByPatientId` (por `patientId`) e `corByName` (por nome, para docs legados). Todas as funções que criam docs para pacientes `_noCor` passam a salvar `patientId` — `src/pages/Correcoes.jsx`

---

## 2026-06-09 (noite 6)

- **fix:** 2 correções finais no texto de conclusão confirmadas pelo laudo PDF Valter Novais Carvalho:
  1. `escoreGlobal` (BAMS Memória Semântica): substituído `toMemLbl` por inline que retorna 'MÉDIO' — "desempenho" é substantivo masculino, exige MÉDIO não MÉDIA — `src/pages/Reports.jsx`
  2. `ravltA7Desc`: corrigido `ravltA7 === 'PRESERVADA' ? 'CAPACIDADE' : 'DIFICULDADE'` → `ravltA7 === 'Déficit' ? 'DIFICULDADE' : 'CAPACIDADE'` — `ravltFromZOrRaw` nunca retorna 'PRESERVADA', então desc era sempre DIFICULDADE; agora só Déficit → DIFICULDADE, demais níveis → CAPACIDADE — `src/pages/Reports.jsx`

---

## 2026-06-09 (noite 5)

- **fix:** 3 correções no texto de conclusão confirmadas pelo documento protocolo Word:
  1. BAMS Escore Global (Memória Semântica): `escoreGlobal` agora passa por `toMemLbl` — PRESERVADA→MÉDIA — `src/pages/Reports.jsx`
  2. Fluência Fonêmica (NEUPSILIN): removido `toLangLabel` — valor COMPROMETIDA/LIMÍTROFE/PRESERVADA passa direto, sem converter para DEFICITÁRIO — `src/utils/generateTextoConclusao.js`
  3. `toLangLabel` corrigida: PRESERVADA→'MÉDIA' (antes era 'MÉDIO') — afeta Fluência Semântica e TOKEN — `src/utils/generateTextoConclusao.js`

---

## 2026-06-09 (noite 4)

- **fix:** Labels RAVLT no texto de memória agora mapeiam para palavras corretas do protocolo: COMPROMETIDA → DEFICITÁRIO, PRESERVADA → MÉDIO (análogo ao `toLangLabel` já existente em gerarLinguagem). Adicionada função `toMemLbl` em `mapToDadosPaciente`. Afeta: `ravltA1`, `ravltB1`, `ravltA6`, `ravltA7`, `reconhecimento`. Campos `*Desc` preservados usando o valor original — sem toque em Tests.jsx nem em cálculos — `src/pages/Reports.jsx`

---

## 2026-06-09 (noite 3)

- **fix/feat:** Ajustes em `TESTES_FOTOS_CONFIG` — NOMEAÇÃO INFANTIL 2→1 folha, YBOCS 5→4 folhas. Adicionados: ETDAH-PAIS (2), TRIAGEM TDAH INFANTIL (8), VINELAND PAIS (7), VINELAND ESCOLA (7), ESCALA ENGLAND (1), TRIACOG (5) — `src/pages/UploadConvenio.jsx`

---

## 2026-06-09 (noite 2)

- **fix urgente:** Profissional (Agnes) não via EDELVITA COSTA ARAUJO no dropdown — `useEffect` de laudos buscava pacientes mas só salvava nome em `patientNamesMap`, nunca adicionava ao estado `patients`. Agora adiciona todos os pacientes dos laudos ao dropdown. Removido `patients` das deps para evitar loop — `src/pages/Reports.jsx`

- **feat:** Botão "Assumir correção" exibe spinner + toast verde fixo no topo ("✓ [PACIENTE] atribuído com sucesso!") por 5s — `src/pages/Correcoes.jsx`

---

## 2026-06-09 (noite)

- **fix:** Botão "Assumir correção" travava para estagiário em itens virtuais (_noCor) — regra Firestore `allow create: if isBeliane()` bloqueava silenciosamente o addDoc. Adicionada exceção: estagiário pode criar doc de correcoes se e somente se estiver se auto-atribuindo (`estagiarioId == request.auth.uid && etapaAtual == 'em_correcao'`) — `firestore.rules`

---

## 2026-06-09 (tarde)

- **fix:** Botão "Salvar anamnese" parecia não reagir para Vitor (entregador) — causa: sucesso era silencioso (só sumia o aviso amarelo, sem confirmação explícita) e erros eram completamente ocultos pela condição `!isEntregador && error`. Adicionado estado `anamneseMsg` com mensagem verde "✓ Anamnese salva! Agora clique em GERAR LAUDO." (6s) e vermelha com código do erro. Mensagem visível para TODOS os papéis incluindo entregador e profOnly — `src/pages/Reports.jsx` (+4 pontos: estado, reset no useEffect, success/error em saveQuickAnamnese, JSX no painel de anamnese)

---

## 2026-06-09

- **fix:** Botão "Assumir correção" no card do dashboard agora muda `etapaAtual` para `em_correcao` em um único clique (antes só atribuía `estagiarioId` sem mudar a etapa) — `src/pages/Correcoes.jsx` (função `assumirCorrecaoCard`)

- **fix urgente:** PDF bloqueado ("Conclusão — seção ausente") — catch block de `buildAiBodyFromData` engolia erro silenciosamente e retornava `null`; agora expõe erro no `console.error` e faz fallback com `buildConclusaoHtml({})` garantindo que 'CONCLUSÃO' sempre esteja presente no HTML gerado — `src/pages/Reports.jsx` (linha 1754)

- **fix:** Dashboard da estagiária agora exibe card "Aguardando Correção" e carrega casos sem estagiário atribuído — permite auto-atribuição diretamente pelo dashboard sem precisar ir ao prontuário do paciente — `src/pages/Dashboard.jsx` (linhas 172 e 340)

- **fix:** Corrige inconsistências entre texto de conclusão e tabelas do laudo — `src/pages/Reports.jsx`, `src/utils/generateTextoConclusao.js`
  - NEUPSILIN: LIMÍTROFE substituído por COMPROMETIDA em todas as variáveis de texto (nova função `toFemNP`)
  - Memória Visual de Curto Prazo: passa a usar z-score de `memory_visual_short` (antes usava z-score geral de memória)
  - Memória de Trabalho: passa a usar z-score de `memory_working` (antes usava z-score geral de memória)
  - Fluência Semântica (BAMS): passa a usar z-score real da soma dos acertos de fluência (`fv_animals + fv_fruits + fv_utensils + fv_clothes`) — antes usava z-score de categorização
  - Controle Inibitório: corrige variável de descrição (`errosPersDesc` em vez de `errosNaoPersDesc`)

## 2026-06-08

- **fix:** Chips de testes na seção "Convênios e Particular" do Analytics ficam verdes (🟢 X/X) quando arquivos foram enviados para testes sem totalFotos definido (TEACO, TEADI, TEALTI, E-TDAH, etc.) — lógica: `total = cfg?.totalFotos ?? cnt` — `src/pages/Analytics.jsx`

---

## 2026-06-05

- **feat:** `searchPatientsByTerm` adicionada em `prodoctorApi.js` — busca direta na API ProDoctor pelo termo antes de recorrer ao cache local — `src/services/prodoctorApi.js`, `src/pages/Patients.jsx`

---

## 2026-06-04

- **feat:** Permissões do `entregador` equiparadas ao `professional`: lista MEUS LAUDOS, botão GERAR LAUDO, gerar sem selecionar testes, botão IMPRIMIR/PDF, botão EXPANDIR — `src/pages/Reports.jsx` (7 condições de role)

---

## 2026-06-03

- **docs:** CLAUDE.md reescrito com blindagem completa e seção de workflow dos três agentes
- **docs:** CHANGELOG.md criado na raiz do projeto
- **docs:** NEUROCLIN_REGRAS_WORKFLOW.md adicionado à raiz do projeto

---

## 2026-05-28

- **feat:** Sinal verde via Firestore `onSnapshot` — detecção de atualização sem depender de CDN — `src/version.js`, `src/components/Layout.jsx`
- **fix:** URL do `version.json` corrigida para caminho absoluto `/version.json` — `src/version.js`
- **feat:** Página `UploadConvenio` para estagiários — `src/pages/UploadConvenio.jsx`, `src/components/Layout.jsx`
- **fix:** Intervalo de verificação de atualização reduzido de 30s para 10s — `src/version.js`
- **fix:** URL do `version.json` usando BASE_URL errada (gerava 404) — `src/version.js`
- **fix:** Botão SOMENTE LEITURA oculto para entregador; exibe apenas botão CORRIGIR — `src/pages/Correcoes.jsx`
- **fix:** Anamnese rápida sempre aparece no laudo; relacionamentos e vidaAcademicaLaboral adicionados — `src/utils/generateDocx.js`
- **feat:** Profissional pode gerar laudo; busca de pacientes corrigida — `src/pages/Reports.jsx`
- **fix:** Storage liberado para anamneses-docs; Firestore rules para profissional — `firestore.rules`, `storage.rules`

---

## 2026-05-27

- **feat:** Devolutivas ProDoctor + acesso profissional + uploads anamnese — `src/pages/DiagnosticoPrevent.jsx`
- **fix:** Botão SALVAR com feedback visual; `setDoc merge` garante persistência — `src/pages/Reports.jsx`
- **fix crítico:** Salvar rascunho + `requestApproval` cria documento se não existir — `src/pages/Reports.jsx`
- **fix crítico:** Backup localStorage + 3 tentativas ao salvar laudo — `src/hooks/useTestSession.js`
- **fix:** Aviso explícito quando laudo não é salvo no Firestore — `src/pages/Reports.jsx`

---

## 2026-05-26

- **fix:** Profissional vê seus prontuários em Correções — `src/pages/Correcoes.jsx`
- **fix crítico:** `where` não importado em Correções; regras update estagiário — `src/pages/Correcoes.jsx`, `firestore.rules`
- **fix urgente:** Correções carrega corretamente para estagiário — `src/pages/Correcoes.jsx`
- **fix:** `user.uid` → `user.id` em Correções + fallback pacientes para professional — `src/pages/Correcoes.jsx`
- **fix:** Estagiário vê correções não atribuídas + tipos procedimento na tela — `src/pages/Correcoes.jsx`
- **fix:** Reabrir laudo usa senha de login Firebase (`reauthenticate`) em vez de env var — `src/pages/Reports.jsx`

---

## 2026-05-25

- **feat:** Filtro por profissional no diagnóstico + busca paciente filtra por prof — `src/pages/DiagnosticoPrevent.jsx`
- **feat:** Exportar CSV no DiagnosticoPrevent; remove aviso F12 — `src/pages/DiagnosticoPrevent.jsx`
- **feat:** Estagiário vê prontuários sem dono, pode assumir e marcar concluído — `src/pages/Correcoes.jsx`
- **feat:** Coluna Profissional no DiagnosticoPrevent — `src/pages/DiagnosticoPrevent.jsx`
- **fix:** Dropdown atribuir estagiário no card — uncontrolled select com auto-save — `src/pages/Correcoes.jsx`
- **fix:** DATA_CORTE 2026-02-28 para incluir pacientes do ciclo atual — `src/pages/DiagnosticoPrevent.jsx`

---

## Convenções

| Tipo | Significado |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `fix crítico` | Correção de falha que impedia funcionamento |
| `fix urgente` | Correção aplicada em regime de urgência em produção |
| `docs` | Documentação apenas (sem alteração de código) |
| `chore` | Manutenção interna (version bump, build, sem impacto funcional) |
| `refactor` | Refatoração sem mudança de comportamento (exige autorização) |
