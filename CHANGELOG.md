# CHANGELOG — NeuroClin V2

> Registro cronológico de todas as alterações em produção.
> Atualizar obrigatoriamente após cada deploy.
> Formato: `[DATA] TIPO: descrição — arquivo(s) alterado(s)`

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
