# CHECKLIST — Verificações Obrigatórias Antes de Cada Deploy

> Executar na ordem. Nenhuma etapa pode ser pulada.
> Deploy só ocorre após Dr. Pedro dizer **"autorizo firebase deploy"**.

---

## 1. BUILD

- [ ] `npm run build` executado sem erros
- [ ] Avisos de chunk size são pré-existentes e podem ser ignorados
- [ ] Nenhum erro de TypeScript / JSX no output

---

## 2. TESTES PRÉ-DEPLOY AUTOMÁTICOS

Executados automaticamente pelo `prebuild` e `predeploy`:

- [ ] `generateTextoConclusao` importado em Reports.jsx
- [ ] Claude API **não** usada para gerar texto da conclusão
- [ ] Fallback determinístico garantido
- [ ] Anamnese buscada do Firestore por `patientId`
- [ ] `validateLaudo` chamada dentro de `print()`
- [ ] 5 seções obrigatórias verificadas antes do PDF

---

## 3. VALIDAÇÃO EM LOCALHOST

Servidor: `npm run dev` → `http://localhost:3000`

### Perfil: Admin / Supervisor
- [ ] Login funciona
- [ ] Pode aprovar laudo
- [ ] Pode reabrir laudo (senha)
- [ ] Botões PDF / WORD / IMPRIMIR visíveis

### Perfil: Profissional (`professional`)
- [ ] Vê painel MEUS LAUDOS
- [ ] Pode gerar laudo
- [ ] Pode salvar rascunho e enviar para aprovação
- [ ] **NÃO** vê botão IMPRIMIR / PDF
- [ ] Laudo aprovado = somente leitura (sem edição)

### Perfil: Entregador (`entregador`)
- [ ] Vê painel MEUS LAUDOS
- [ ] Pode gerar laudo
- [ ] Pode salvar rascunho e enviar para aprovação
- [ ] **Vê** botão IMPRIMIR / PDF
- [ ] Pode editar anamnese mesmo em laudo aprovado
- [ ] Botão CORRIGIR LAUDO visível em laudo aprovado
- [ ] Botão EXPANDIR visível em laudo aprovado

### Perfil: Estagiário
- [ ] Acesso à página Convênios/Upload
- [ ] **Não** vê testes nem laudos de outros usuários
- [ ] Fluxo de correções funcionando

---

## 4. FUNCIONALIDADES CRÍTICAS

- [ ] Botão **EXCLUIR laudo** exige senha de supervisor
- [ ] Botão **EXPORTAR PDF** funciona
- [ ] Botão **EXPORTAR WORD (.docx)** funciona
- [ ] Botão **APROVAR LAUDO** funciona
- [ ] Logo e assinaturas aparecem no DOCX
- [ ] Referências bibliográficas presentes no DOCX
- [ ] Tabelas de testes no laudo (NEUPSILIN, RAVLT, DEX, etc.) completas

---

## 5. TESTES AUDITADOS — NÃO ALTERAR

Verificar que nenhum dos seguintes foi modificado acidentalmente:

- [ ] `src/pages/Tests.jsx` — nenhuma fórmula ou cutoff alterado
- [ ] `src/utils/generateDocx.js` — nenhuma seção removida
- [ ] Funções `classify.*` intactas
- [ ] Classificações: ≥-1.0z = Preservado | -1.0 a -1.5z = Limítrofe | <-1.5z = Comprometido

---

## 6. ARQUIVOS PROTEGIDOS — CONFERIR SE NÃO FORAM TOCADOS

- [ ] `.env` / `.env.local` — inalterados
- [ ] `firebase.json` — inalterado
- [ ] `.firebaserc` — inalterado
- [ ] `vite.config.js` — inalterado
- [ ] `package.json` — inalterado (exceto se atualização foi solicitada)

---

## 7. GIT

- [ ] `git status` limpo (sem arquivos esquecidos)
- [ ] Commit realizado com mensagem descritiva
- [ ] `git push origin main` executado
- [ ] CHANGELOG.md atualizado com a data e descrição da alteração

---

## 8. AUTORIZAÇÃO

- [ ] Dr. Pedro testou em `localhost:3000` com os perfis relevantes
- [ ] Dr. Pedro disse **"autorizo firebase deploy"**

---

## COMANDO DE DEPLOY

```bash
npx firebase deploy --only hosting --project neuroclin-f55a5
```

---

## PÓS-DEPLOY

- [ ] Validar em **neuroclinilaudos.com.br**
- [ ] Confirmar que o sinal verde de atualização apareceu para usuários conectados
- [ ] Atualizar `CHANGELOG.md` se ainda não foi feito
