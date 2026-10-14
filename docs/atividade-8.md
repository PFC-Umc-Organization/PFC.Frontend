# Atividade 8 — Convite e aceite de integrantes

## O que foi feito
Ninguém vira integrante de um grupo sem aceitar. Em `/meu-pfc`, quem cria o PFC entra na hora; cada colega informado recebe um **convite** e só entra no grupo quando aceita.

Como não temos SES, o convite aparece **dentro do app**, na tela Meu PFC. O envio de e-mail ficou como um ponto único no backend (`notificarConvite`), que hoje só registra no log.

Na tela Meu PFC:
- **Aluno sem grupo:** vê "Convites recebidos", com Aceitar e Recusar (Recusar pede confirmação). Ao aceitar, entra no grupo e os outros convites dele somem.
- **Aluno com grupo:** vê "Convites pendentes" (quem ainda não respondeu), pode cancelar um convite e convidar mais um colega pelo RGM.
- Enquanto uma resposta está a caminho, os botões de convite ficam travados (evita duplo clique e aceitar dois grupos ao mesmo tempo).

Regras (validadas no backend):
- Convidado precisa estar pré-autorizado **na turma do grupo** e sem outro projeto (as mesmas regras do `/meu-pfc`).
- Limite de 10 por grupo, contando os convites pendentes.
- Ao aceitar, o backend confere tudo de novo (o aluno pode ter mudado de turma ou entrado em outro grupo desde o convite).
- Só integrantes convidam e cancelam; admin e orientador só consultam os convites do grupo.

## Rotas (backend)
| Método | Rota | Quem |
| ------ | ---- | ---- |
| GET | `/meus-convites` | aluno |
| POST | `/meus-convites/:projetoId/aceitar` | aluno |
| POST | `/meus-convites/:projetoId/recusar` | aluno |
| GET | `/projetos/:projetoId/convites` | integrantes, admin, orientador |
| POST | `/projetos/:projetoId/convites` (`{ rgm }`) | integrantes |
| DELETE | `/projetos/:projetoId/convites/:rgm` | integrantes |

## Arquivos
- Backend: `internal/projeto/convite.go` (rotas), `convite_dynamo.go` (PK `PROJECT#<id>`, SK `CONVITE#<rgm>`, GSI1 `CONVITE#<rgm>`), `convite_test.go`; `aluno.go` (o `/meu-pfc` passou a gerar convites); rotas em `main.go`; README.
- Frontend: `ConviteService` (`core/services/convite.service.ts`, versões Http e Mock), interface `Convite` em `projeto.model.ts`, registro em `app.config.ts` e a tela `meu-pfc.component.ts`.

## Como testar
- Backend: `go test ./internal/projeto`.
- Frontend: `ng build`.
- No app, depois do deploy do backend:
  1. Aluno A (sem projeto) cria o PFC em `/meu-pfc` com o RGM do aluno B.
  2. A vê B em "Convites pendentes".
  3. B entra, vê o convite em "Convites recebidos" e aceita: passa a ver o grupo.
  4. Também testar: recusar, cancelar, convidar alguém de outra turma (400), alguém que já tem grupo (409) e o grupo cheio (409).

## Pendências
- Ainda não exercitado na AWS (precisa do deploy do backend).
- Se o aluno aceitar convites de dois grupos no mesmo instante (duas abas), pode entrar nos dois. A tela trava os botões, mas a correção completa é uma transação no DynamoDB com uma trava por aluno.
- Apagar um projeto não apaga os convites dele. O aceite trata esse caso (apaga o convite e responde 404), mas o convite continua aparecendo para o aluno até ele tentar aceitar.
- E-mail de convite: depende de SES ou outro provedor; basta trocar `notificarConvite`.
- Modo de demonstração (Mock): `ProjetoMockService.criarDoAluno` ainda põe os colegas direto no grupo, sem gerar convite. Não afeta o app com a API real.
- O frontend só foi verificado com `ng build` (não há testes automáticos nem teste clicando na tela). O primeiro teste de verdade é o roteiro acima, depois do deploy.
