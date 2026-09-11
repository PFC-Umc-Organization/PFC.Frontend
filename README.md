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

| Perfil    | E-mail                        | Senha       |
| --------- | ----------------------------- | ----------- |
| Aluno     | `pedro.silva@athena.edu`      | `athena123` |
| Aluno     | `ana.costa@athena.edu`        | `athena123` |
| Professor | `alessandro.horas@athena.edu` | `athena123` |

## Telas

| Rota           | Perfil    | Conteúdo                                                                |
| -------------- | --------- | ----------------------------------------------------------------------- |
| `/entrar`      | público   | Login (tela branca, cartão centralizado)                                |
| `/criar-conta` | público   | Cadastro com seleção de perfil                                          |
| `/`            | ambos     | Hero + Timeline de Entregas; professor também vê o status por aluno     |
| `/gestao`      | professor | Cadastro de atividades + tabela "Atividades e turmas"                   |
| `/usuarios`    | professor | Métricas, busca, filtro por função e tabela de pessoas cadastradas      |
| `/materiais`   | ambos     | Materiais de apoio (professor publica, aluno consulta)                  |

O professor tem o seletor **"Ver como"** no header para inspecionar a interface
do aluno — em modo somente leitura, usando o primeiro aluno da turma.

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

Contrato inferido dos services — vale conferir com quem está escrevendo o Go:

| Método   | Rota                                     | Observação                          |
| -------- | ---------------------------------------- | ----------------------------------- |
| `POST`   | `/auth/login`                            | devolve usuário + token             |
| `POST`   | `/auth/registrar`                        | cadastro com perfil                 |
| `GET`    | `/turmas`                                |                                     |
| `GET`    | `/usuarios?busca=&perfil=`               | filtro server-side                  |
| `POST`   | `/usuarios`                              |                                     |
| `GET`    | `/atividades?turmaId=`                   |                                     |
| `POST`   | `/atividades`                            |                                     |
| `DELETE` | `/atividades/{id}`                       |                                     |
| `GET`    | `/turmas/{id}/status-entregas`           | matriz aluno × atividade            |
| `GET`    | `/alunos/{id}/timeline`                  | entregáveis do aluno com status     |
| `PUT`    | `/atividades/{id}/entregas/{alunoId}`    | registra a entrega                  |
| `DELETE` | `/atividades/{id}/entregas/{alunoId}`    | desfaz a entrega                    |
| `GET`    | `/materiais?turmaId=`                    |                                     |
| `POST`   | `/materiais`                             |                                     |
| `DELETE` | `/materiais/{id}`                        |                                     |

As regras de status (pendente / atrasado / entregue com atraso) hoje vivem em
`core/services/memoria.store.ts`. Quando o backend assumir esse cálculo, é só
passar o status pronto no payload e apagar essas funções.

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
