# Atividades 5 e 6 — atividades em "Gerenciar PFCs" e campos de entrega

## O que foi feito
- **5:** a criação/edição/remoção de atividades vive só em `/gestao`; o menu e a rota `/atividades` foram removidos. README atualizado.
- **6:** toda atividade tem um formulário de entrega (`campos`). Nasce com 1 campo ("Arquivo da entrega", obrigatório); o orientador/admin inclui e exclui campos ao editar a atividade. Não é possível excluir o último.

## Arquivos
- `core/models/atividade.model.ts` — `CampoEntrega`, `TipoCampoEntrega` (ARQUIVO, TEXTO, TEXTO_LONGO, LINK), `Atividade.campos`.
- `core/services/atividade.service.ts` — `adicionarCampo`, `removerCampo` (+ `memoria.store.ts`, `dados-mock.ts`).
- `features/professor/gestao-pfc.component.ts` — editor "Campos de entrega" na linha de edição da atividade.

## Como testar
`npm start`, entrar como orientador/admin, `/gestao` → lápis numa atividade → adicionar/remover campos. Com 1 campo, o botão de excluir fica desabilitado.

## Backend e formulário do aluno (complemento)
- **Backend** (`PFC.Backend/internal/atividade`): CRUD de atividades, campos (máx. 20, nunca zero) e entregas, validadas contra os campos. Rotas na tabela do README do backend; mesma tabela DynamoDB (`ACTIVITY#`, `ENTREGA#`), sem mudança de Terraform.
- **Frontend:** `AtividadeHttpService` e `EntregaHttpService` no lugar dos mocks (`app.config.ts`); `/materiais` monta o formulário a partir dos campos da atividade (arquivo, texto, texto longo, link; obrigatórios validados).
- Testar: `go test ./internal/atividade`; no app, criar atividade em `/gestao`, editar campos, entrar como aluno com projeto e entregar em `/materiais`.

## Pendências
- Campo de arquivo guarda só o **nome** (sem upload/S3).
- Sem testes de integração com o DynamoDB real; a rota nova ainda não foi exercitada na AWS.
- Atividades antigas só existiam em memória: não há migração.
