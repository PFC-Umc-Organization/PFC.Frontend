# Ajustes da orientação de 16/10 — itens 6 e 9

Itens do plano de ajustes (`cronograma-ajustes-professor.html`). Só frontend; o backend e o contrato da API não mudaram.

## Item 9 — Pré-autorizar: ano e semestre

### O que foi feito
- Em Usuários > Pré-autorizar alunos, a lista de turmas mostra **só as do semestre corrente** (jan–jun = `.1`, jul–dez = `.2`), com o rótulo **"Curso - Turno - 2026.2"**.
- Sem turma do semestre corrente, a seção avisa e aponta para Turmas.
- A lista de RGMs pré-autorizados e o "editar turma" do aluno continuam com **todas** as turmas (inclusive as antigas), agora com o período no rótulo.
- O período da turma é texto livre no cadastro; o filtro compara só ano e semestre, então `2026.2`, `2026/2` e `2026-2` valem igual.

### Arquivos
- `core/models/curso.model.ts`: `rotuloTurma`, `periodoAtual`, `ehDoPeriodo` (o `rotuloCurso`, usado em outras telas, não mudou).
- `features/professor/usuarios.component.ts`.

## Item 6 — Aluno: criar PFC

### O que foi feito
Em Meu PFC, o aluno sem grupo só vê o formulário quando pode criar. Nos outros casos, um aviso no lugar:
- **RGM sem turma**: fale com a coordenação; se acabou de ser liberado, saia e entre de novo (a turma vem da sessão, gravada no login).
- **Turma sem programa de PFC**: aguarde a coordenação criar o programa.
- Se a consulta de programas falhar, o formulário aparece mesmo assim e o backend decide no envio.

O formulário valida antes de enviar, com os mesmos limites do backend (`internal/groups/domain.go`): nome de 3 a 150 caracteres, descrição até 2.000, RGMs só com números, no máximo 9 colegas (10 contando quem cria). Repetidos e o próprio RGM são ignorados.

### Arquivos
- `core/models/projeto.model.ts`: `LIMITES_PROJETO` e `colegasDoFormulario`.
- `features/aluno/meu-pfc.component.ts`.

## Como testar
- `npm run build` (sem erros nem avisos).
- As funções novas (`periodoAtual`, `ehDoPeriodo`, `rotuloTurma`, `colegasDoFormulario`) foram conferidas com casos de teste fora do repositório, porque o front não tem testes automáticos.
- No app, depois do deploy:
  - **Item 9**: como admin, cadastre uma turma 2026.1 e uma 2026.2; em Pré-autorizar só a 2026.2 aparece; na lista de RGMs, as duas.
  - **Item 6**: como aluno sem pré-autorização → aviso de turma; pré-autorizado numa turma sem programa → aviso de programa; numa turma com programa → formulário. Tente um RGM com letra e 10 colegas para ver as mensagens.

## Pendências
- Nada foi testado clicando no navegador nem contra a API real.
- A turma do aluno só atualiza no próximo login (limitação já existente da sessão).
- O "aceitar convite" não verifica a turma antes no front; o backend recusa com a mensagem certa.
