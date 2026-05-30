# NeuroClin — Status em 30/05/2026 (01h30)

## O que está funcionando ✅

- **Estagiário (Dayane)**: vê prontuários não atribuídos + os seus em Correções. Botão "Correção Concluída" aparece para todos os cards em `aguardando_correcao`
- **Profissional (Magno)**: vê prontuários onde `profissionalUid == user.uid` em Correções
- **Sincronização ProDoctor**: cria registros em `correcoes` para pacientes com 5ª sessão desde 28/02/2026
- **Vínculo automático**: `profissionalUid` preenchido em `correcoes` via cruzamento de e-mail ProDoctor × Firebase
- **DiagnosticoPrevent** (`/diagnostico`): tabela com todos os 93 pacientes Prevent, coluna Profissional, exportação CSV, tipos de procedimento visíveis na tela
- **PainelLaudos → Laudos**: ao clicar "Gerar Laudo", abre `/laudos` com paciente já selecionado

## Pendências urgentes (próxima sessão) 🔴

### 1. Profissional não vê aba Laudos em Prontuário
- **Arquivo**: `MedicalRecords.jsx` linha 382
- **Problema**: `if (isProfessional) return ['anamnese', 'testes'].includes(t.key)` — exclui 'laudos'
- **Fix**: mudar para `['anamnese', 'testes', 'laudos']`
- **Dentro da aba**: mostrar Anamnese Rápida (textarea livre) + botão "Salvar e gerar laudo"
- **Ao salvar**: salvar em `anamneses/{patientId}`, navegar para `/laudos` com `{ state: { patientId } }`

### 2. Coluna Devolutiva vazia no DiagnosticoPrevent
- **Causa**: o ProDoctor pode estar usando um tipo de consulta diferente de "retorno" ou "devolutiva"
- **Como diagnosticar**: rodar o diagnóstico em `/diagnostico` → bloco "TIPOS DE PROCEDIMENTO — PRODOCTOR" aparece na tela mostrando TODOS os tipos retornados
- **Fix**: ajustar `isRetornoFinal()` em `DiagnosticoPrevent.jsx` e `fluxoAvaliacaoService.js` com o termo correto

### 3. Geração automática de laudo (após Anamnese Rápida salva)
- Quando `etapaAtual == 'correcao_concluida'` AND anamnese salva → laudo gerado automaticamente
- Implementar em `Reports.jsx`: `useEffect` que detecta condição e chama `generate()` automaticamente

## Fluxo completo desejado (para referência)

```
Estagiário → Correções → "Correção Concluída"
    ↓
Profissional → Correções → vê prontuário com etapaAtual='correcao_concluida'
    ↓
Profissional → Prontuário → aba Laudos → preenche Anamnese Rápida → salva
    ↓
Sistema → /laudos → laudo gerado automaticamente
    ↓
Profissional → edita laudo → "Enviar para Aprovação"
    ↓
Admin/Supervisor → aprova → PDF final gerado
```

## Dados no Firestore (verificado 30/05)

- **8 registros em `correcoes`**, todos `aguardando_correcao`
- Rosa Maria: `estagiarioId = Dayane.uid`, profissionalNome = AGNES CATARINO MOURA
- Outros 7: `estagiarioId = null`, profissionalNome = AGNES CATARINO MOURA
- `profissionalUid` preenchido para todos (Agnes)

## Observação importante

O `profissionalUid` nos registros está com o UID da **Agnes**, não do **Magno**. Se Magno precisar ver pacientes que estão vinculados à Agnes, será necessário:
1. Re-sincronizar depois que o e-mail do Magno for importado em Settings
2. OU o admin reatribuir manualmente via modal de detalhes

## Último commit

`cfc26fa` — fix: professional vê seus prontuários em Correções
