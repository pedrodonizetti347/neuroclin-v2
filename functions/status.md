# 📋 STATUS DO PROJETO NEUROCLIN
> Sempre envie este arquivo ao iniciar uma nova conversa com Claude

## 👤 Responsável
- **Dr. Pedro Donizetti** — Neuropsicólogo clínico (CRP 06/82.060)

## 📁 Projeto ativo
- **Nome:** neuroclin-v2 (ignorar versão antiga "Neuroclin")
- **Caminho local:** `C:\Users\Pedro Donizetti\Desktop\NEUROCLIN\home\claude\neuroclin-v2`

## 🔗 Links importantes
- **Site Firebase (principal):** https://neuroclin-f55a5.web.app ✅
- **GitHub Pages:** https://pedrodonizetti347.github.io/Neuroclin/ ✅
- **GitHub v2 (código fonte):** https://github.com/pedrodonizetti347/neuroclin-v2.git (branch main)
- **Firebase Console:** https://console.firebase.google.com/project/neuroclin-f55a5
- **Domínio:** neuroclinilaudos.com.br (DNS no Cloudflare)

## ⚙️ Firebase
- **Projeto:** neuroclin-f55a5
- **Functions deployadas:**
  - `generateReport` ✅ — gera laudos com IA (Claude claude-opus-4-5, max 4096 tokens)
  - `prodoctorProxy` ✅ — proxy para ProDoctor Open API
  - `anthropicProxy` ✅ — proxy para Anthropic API (chave fica no servidor, não no frontend)
- **Credenciais ProDoctor:** `functions/.env` (NUNCA commitar)
  - `PRODOCTOR_APIKEY=3993d9a13cf8973e88e151dece5a8902`
  - `PRODOCTOR_APIPASSWORD=698600Pp@1`
  - Base URL: `https://open-api.prodoctor.net`
- **Chave Anthropic:** APENAS no Firebase via `process.env.ANTHROPIC_API_KEY` (NUNCA no frontend)

## 🔐 Variáveis de ambiente (.env.local)
```
VITE_FIREBASE_API_KEY=AIzaSyDf8HwaCXPwY_lldz84fp14x2rddarvKfE
VITE_FIREBASE_AUTH_DOMAIN=neuroclin-f55a5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neuroclin-f55a5
VITE_FIREBASE_STORAGE_BUCKET=neuroclin-f55a5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1030643229452
VITE_FIREBASE_APP_ID=1:1030643229452:web:8940ff2406ee3ca5a65f29
VITE_FUNCTIONS_URL=https://us-central1-neuroclin-f55a5.cloudfunctions.net
VITE_ADMIN_DELETE_PASSWORD=698600Pp@1
```
⚠️ VITE_ANTHROPIC_API_KEY foi REMOVIDA do frontend — API chamada via anthropicProxy

## 🏗️ Stack
- React + Vite + Tailwind | Firebase Auth (Google) + Firestore + Storage
- Visual: verde floresta (`#1A2744`, `#1A3D2B`, `#2E7D32`) — nunca alterar tema

## 📄 Estrutura de páginas
| Rota | Arquivo | Descrição |
|---|---|---|
| `/` | Dashboard.jsx | Painel — contadores em tempo real via onSnapshot |
| `/pacientes` | Patients.jsx | Lista e cadastro de pacientes |
| `/pacientes/:id` | MedicalRecords.jsx | Prontuário do paciente |
| `/laudos` | Reports.jsx | Gerador de laudos com IA via anthropicProxy |
| `/testes` | Tests.jsx | Aplicação de testes neuropsicológicos |
| `/prontuario` | MedicalRecords.jsx | Prontuário (acesso direto) |
| `/relatorios` | Analytics.jsx | Relatórios |
| `/admin` | Admin.jsx | Administração (admin/supervisor) |
| `/configuracoes` | Settings.jsx | Configurações |

## 🗑️ Deletar paciente (admin)
- Botão lixeira visível APENAS para role `admin` ou `supervisor` na lista `/pacientes`
- Abre modal com campo de senha — verifica contra `VITE_ADMIN_DELETE_PASSWORD`
- Delete em cascata: deleta paciente + laudos (`reports`) + sessões (`sessions`) via writeBatch
- Senha atual: `698600Pp@1`

## 🧹 Limpar laudos órfãos (Admin)
- Menu **Admin** → seção **Manutenção de dados** → botão **Limpar laudos**
- Remove laudos cujo `patientId` não existe mais na coleção `patients`
- Usa writeBatch (suporta até 499 deletes por lote)
- Útil para limpar laudos de pacientes deletados antes da cascata ser implementada

## 📊 Dashboard
- Contadores (pacientes, laudos, testes) usam `onSnapshot` — atualizam em tempo real
- Não precisa recarregar a página após deletar paciente

## 🔌 Integração ProDoctor
- Todas as chamadas passam pela Cloud Function `prodoctorProxy`
- Serviço: `src/services/prodoctorApi.js`
- Busca por paginação completa + cache local (10 min TTL) + filtro client-side
- Funções: `searchPatients(termo, forceRefresh?)`, `clearPatientsCache()`, `getCachedCount()`
- Botão refresh no campo de busca para forçar recarga do cache
- **Atenção:** campo de busca ProDoctor usa `termo` (não `nome`) — conforme OpenAPI spec

## 📝 Textos clínicos validados
- Arquivo: `functions/src/textos_laudo.json`
- 17 domínios cognitivos com textos do protocolo Prevent
- Carregado no `generateReport` e injetado obrigatoriamente na seção CONCLUSÃO do laudo

## 🚀 Comandos essenciais

### Build + deploy completo:
```powershell
cd "C:\Users\Pedro Donizetti\Desktop\NEUROCLIN\home\claude\neuroclin-v2"
npm run build
firebase deploy --only hosting,functions --project neuroclin-f55a5
npx gh-pages -d dist --repo https://github.com/pedrodonizetti347/Neuroclin.git
git add .
git commit -m "descrição"
git push origin main
```

### Só frontend (Firebase + GitHub Pages):
```powershell
npm run build
firebase deploy --only hosting --project neuroclin-f55a5
npx gh-pages -d dist --repo https://github.com/pedrodonizetti347/Neuroclin.git
```

### Só functions:
```powershell
firebase deploy --only functions --project neuroclin-f55a5
```

## ✅ Histórico (14/05/2026)
- [x] Firebase Auth + Firestore + Storage configurados
- [x] Functions: generateReport, prodoctorProxy, anthropicProxy deployadas
- [x] VITE_ANTHROPIC_API_KEY removida do frontend (segurança)
- [x] ProDoctor: URL corrigida (open-api.prodoctor.net), campo `termo`, APIKEY atualizada
- [x] Dashboard com onSnapshot (contadores em tempo real)
- [x] Deletar paciente: botão admin + modal senha + cascade delete
- [x] Admin: botão Limpar laudos órfãos (Manutenção de dados)
- [x] GitHub Pages funcionando (sem bloqueio de secret scanning)
- [x] Domínio neuroclinilaudos.com.br registrado + DNS Cloudflare + Firebase Hosting
