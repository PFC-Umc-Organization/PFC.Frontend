# Athena — O Portal do PFC (frontend)

Frontend Angular do gerenciador de TCC/PFC. Portado do protótipo feito no
Lovable (React + Tailwind) para **Angular standalone + SCSS puro**, conforme
definido na documentação do TCC.

## Rodando

Requer Node 20+.

```bash
npm install
npm start          # http://localhost:4200
```

Outros comandos:

```bash
npm run build      # build de produção em dist/athena-front
npm run watch      # build incremental
```

### Entrando no ambiente de demonstração

A autenticação está mockada. Use:

| Perfil                | E-mail                        | Senha       |
| --------------------- | ----------------------------- | ----------- |
| Aluno                 | `pedro.silva@athena.edu`      | `athena123` |
| Aluno                 | `ana.costa@athena.edu`        | `athena123` |
| Professor/coordenador | `alessandro.horas@athena.edu` | `athena123` |

## Telas

| Rota           | Perfil    | Conteúdo                                                             |
| -------------- | --------- | --------------------------------------------------------------------- |
| `/entrar`      | público   | Login (tela branca, cartão centralizado)                              |
| `/criar-conta` | público   | Cadastro com seleção de perfil                                        |
| `/`            | ambos     | Hero + Timeline de Entregas; professor também vê o status por aluno   |
| `/gestao`      | orientador/admin | PFCs por turma (criar, editar, excluir, grupo por RGM, orientador) + atividades e seus campos de entrega |
| `/usuarios`    | professor | Pré-autorização de RGMs (allowlist) + tabela de contas já cadastradas |
| `/meu-pfc`     | aluno     | Visão só leitura do PFC do aluno (grupo e orientador)                 |
| `/materiais`   | ambos     | Materiais de apoio (professor publica, aluno consulta)                |
| `/referencias` | ambos     | Aluno busca artigos (OpenAlex/Crossref) e monta a lista ABNT do grupo; professor acompanha por PFC |

Não existe mais alternância de visão pelo header — cada perfil só vê o que é
seu. `/meu-pfc` é só leitura porque, no backend, quem cria o PFC e monta o
grupo é o **coordenador** (perfil `COORDENADOR`, hoje representado no
frontend pelo campo `Usuario.coordenadorPfc`), na tela `/gestao` — o aluno
não tem escrita nesse domínio.

## Estrutura

```
src/app/
├── core/
│   ├── models/       # tipos de domínio (Usuario, Atividade, Entrega, Material…)
│   ├── services/     # contratos (classes abstratas) + implementações mock
│   └── guards/       # authGuard, visitanteGuard, perfilGuard([...])
├── shared/
│   ├── components/   # header, hero, friso grego, ícones, badges, layout
│   └── pipes/        # prazo (formata "20/08 às 23:59")
└── features/
    ├── auth/         # login e cadastro
    ├── aluno/        # timeline e card de entregável
    ├── professor/    # gestão de PFC e usuários
    ├── materiais/
    ├── inicio/
    └── erros/
```

## Trocando os mocks pela API em Go

Todos os services são **classes abstratas** (contratos) com uma implementação
`*MockService` que guarda o estado em memória. Os componentes só conhecem o
contrato, nunca a implementação.

Para plugar o backend:

1. Escreva as versões HTTP, ex. `AtividadeHttpService extends AtividadeService`,
   usando `HttpClient` e devolvendo os mesmos `Observable`.
2. Em `src/app/app.config.ts`, adicione `provideHttpClient()` e troque o
   `useClass`:

```ts
{ provide: AtividadeService, useClass: AtividadeHttpService },
```

Nenhum componente muda. Os mocks continuam no repositório e servem para rodar
o front sem backend (útil em demo e em teste).

### Endpoints que o front espera

Esta seção reflete o que o **backend em Go já implementa**
(`PFC.Backend`, `internal/{auth,matricula,programa,projeto}`), não mais um
contrato especulativo — os dois lados foram alinhados nesta rodada:

| Método   | Rota                          | Observação                                                                                     |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST`   | `/auth/login`                 | Cognito; devolve `{ usuario, token }` (`token` é o IdToken)                                      |
| `POST`   | `/auth/registrar`             | sempre cria ALUNO; RGM embutido no e-mail, checado pelo Pre Sign-up Lambda contra a allowlist     |
| `POST`   | `/admin/students`             | `{ rgms: string[] }` — pré-autoriza em lote (allowlist, não cria conta); só COORDENADOR           |
| `DELETE` | `/admin/students`             | `{ rgms: string[] }` — remove da allowlist; só COORDENADOR                                       |
| `POST`   | `/programas`                  | `{ cursoId }` — só COORDENADOR                                                                    |
| `GET`    | `/programas`                  | lista todos                                                                                        |
| `PUT`    | `/programas/{id}`             | `{ cursoId }` — só COORDENADOR                                                                    |
| `DELETE` | `/programas/{id}`             | só COORDENADOR; recusa se o programa ainda tiver projetos                                        |
| `POST`   | `/programas/{id}/projetos`    | `{ nome, descricao, integrantes: string[] (RGMs) }` — só COORDENADOR                              |
| `GET`    | `/programas/{id}/projetos`    | lista os PFCs daquele programa                                                                    |
| `PUT`    | `/projetos/{id}/orientador`   | `{ orientadorId }` — só COORDENADOR; não aceita vazio (sem endpoint pra limpar ainda)              |
| `PUT`    | `/projetos/{id}/integrantes`  | `{ rgm }` — adiciona; só COORDENADOR                                                              |
| `DELETE` | `/projetos/{id}/integrantes`  | `{ rgm }` — remove; só COORDENADOR                                                                |
| `GET`    | `/referencias/busca?q=&pagina=` | busca artigos por tema (backend consulta a **OpenAlex**)                                       |
| `GET`    | `/referencias/doi?doi=`       | referência ABNT a partir do DOI (backend consulta o **Crossref**)                                 |
| `GET`    | `/projetos/{id}/referencias`  | lista do grupo; integrantes e equipe acadêmica                                                    |
| `POST`   | `/projetos/{id}/referencias`  | `{ doi }` — só integrantes; 409 se já estiver na lista                                            |
| `DELETE` | `/projetos/{id}/referencias/{refId}` | só integrantes                                                                             |

`GET /usuarios` lista as contas reais do Cognito (e-mail só vem pra
professor/coordenador) e é chamado uma vez por sessão — o
`UsuarioHttpService` guarda o resultado e o login zera. Conta de aluno vem
com `rgm` (do e-mail `<rgm>@alunos.umc.br`), que é o que liga o RGM
pré-autorizado à conta na tela de Usuários.

**Gaps conhecidos** (o mock cobre, mas o backend ainda não tem endpoint):
editar ou excluir usuário — no modo real a tela de Usuários esconde essas
ações.

Atividades, campos de entrega e entregas também já existem no backend
(`internal/atividade`):

| Método   | Rota                                       | Observação                                                         |
| -------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `GET`    | `/atividades`                              | lista com os `campos` do formulário de entrega                      |
| `POST`   | `/atividades`                              | `{ titulo, descricao, prazo }`; nasce com 1 campo de arquivo obrigatório |
| `PUT`    | `/atividades/{id}`                         | edita título/descrição/prazo (os três são obrigatórios)             |
| `DELETE` | `/atividades/{id}`                         | remove também as entregas                                           |
| `POST`   | `/atividades/{id}/campos`                  | `{ rotulo, tipo, obrigatorio }`; tipos ARQUIVO, TEXTO, TEXTO_LONGO, LINK |
| `DELETE` | `/atividades/{id}/campos/{campoId}`        | 409 se for o último campo                                           |
| `GET`    | `/atividades/{id}/entregas`                | entregas de todos os projetos (equipe acadêmica)                    |
| `GET`    | `/projetos/{id}/entregas`                  | entregas do grupo                                                   |
| `PUT`    | `/projetos/{id}/entregas/{atividadeId}`    | `{ respostas: { <campoId>: valor } }`; só integrantes               |

Só **Materiais** segue sem backend (`MaterialMockService`). Campo de arquivo
guarda apenas o **nome** do arquivo — ainda não há upload (seria S3 com URL
pré-assinada).

As regras de status (pendente / atrasado / entregue com atraso) são
calculadas no cliente a partir do prazo e do `entregueEm`
(`core/services/status-entrega.ts`; o modo mock usa as de `memoria.store.ts`).

## Design system

Tokens em `src/styles.scss`, extraídos do protótipo:

| Token          | Valor                    |
| -------------- | ------------------------ |
| `--primary`    | `oklch(38% 0.14 264)`    |
| `--bronze`     | `oklch(58.5% 0.095 62)`  |
| `--success`    | `oklch(46% 0.12 154)`    |
| `--destructive`| `oklch(58% 0.22 25)`     |
| `--background` | `oklch(98.5% 0.008 85)`  |

Tipografia: **Playfair Display** nos títulos, **Inter** no corpo (Google Fonts,
carregadas no `index.html`). Cantos retos em tudo — é decisão estética do
protótipo, não esquecimento.

Ícones são SVG inline em `shared/components/icone.component.ts`; não há
dependência de biblioteca de ícones.

## Diferenças em relação ao protótipo

- **Login redesenhado**: o protótipo usava um painel lateral de 390px com
  moldura de coluna dórica. Aqui a tela é branca com o cartão centralizado.
- **Materiais de Apoio**: tela nova, não existia no protótipo. Está no escopo
  do TCC. Para removê-la, apague `features/materiais/` e a rota `/materiais`.
- **Seletor de turma** na tela inicial do professor — o protótipo era fixo na
  Turma A.
- **Rotas reais com guards** em vez do toggle client-side do protótipo.

## Deploy

O build gera arquivos estáticos em `dist/athena-front/browser`, prontos para o
bucket S3 servido pelo CloudFront. Como o roteamento é client-side, configure a
distribuição para responder `index.html` (200) nos erros 403/404, senão um
refresh em `/usuarios` cai em erro.
