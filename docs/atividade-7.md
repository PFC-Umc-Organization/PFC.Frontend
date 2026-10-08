# Atividade 7 — Criação de projeto pelo aluno

## O que foi feito
O aluno pré-autorizado cria o PFC do próprio grupo em `/meu-pfc` (nome, descrição e RGM dos colegas). Ele entra no grupo automaticamente. O admin continua criando/editando PFCs em `/gestao`.

Regras (validadas no backend):
- Só ALUNO usa a rota; o RGM precisa estar pré-autorizado e vinculado a uma turma que já tenha programa de PFC.
- Um aluno participa de um único projeto (vale para o criador e para os colegas).
- Colegas precisam estar pré-autorizados **na mesma turma**.
- Limite de 10 integrantes. Integrantes entram direto; o convite por e-mail é a atividade 8.

## Arquivos
- Backend: `internal/projeto/aluno.go` (`POST /meu-pfc`) e `aluno_test.go`; `programa.IDDoCurso`; rota em `main.go`; tabela no README.
- Frontend: `meu-pfc.component.ts` (formulário quando o aluno não tem projeto), `ProjetoService.criarDoAluno`, `NovoProjetoDoAluno`.

## Como testar
`go test ./internal/projeto`. No app: entrar como aluno pré-autorizado sem projeto, `/meu-pfc` → preencher e criar. Erros esperados: RGM sem turma (403), turma sem PFC iniciado (409), colega de outra turma (400), integrante já em projeto (409).

## Pendências
- Ainda não exercitado na AWS (precisa do deploy do backend).
- Consultas de "RGM já em projeto" usam Scan (mesmo padrão dos outros domínios; ok para o volume atual).
- Dois alunos criando ao mesmo tempo com o mesmo colega podem passar pela checagem (sem transação); improvável, e o admin corrige em `/gestao`.
