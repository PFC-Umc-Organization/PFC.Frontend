# Rafa Manager — O Portal do PFC (frontend)

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

A API é a do `PFC.Backend` (`src/environments/environment.ts`). Para rodar
contra outra API, troque `apiBaseUrl` ali.

## Telas

| Rota | Quem acessa | Conteúdo |
| ---- | ----------- | -------- |
| `/entrar` | visitante | Login. Conta criada pela coordenação cai em `/nova-senha` no primeiro acesso |
| `/criar-conta`, `/confirmar-conta` | visitante | Cadastro do aluno (RGM pré-autorizado) e confirmação pelo código do e-mail |
| `/esqueci-senha` | visitante | Pede o código por e-mail e define a senha nova |
| `/nova-senha` | visitante | Troca da senha temporária (orientador e admin, primeiro acesso) |
| `/` | todos | Equipe: status de entrega de cada grupo da turma (o orientador vê só os grupos que orienta). Aluno: cronograma das atividades (mesmo sem grupo) |
| `/meu-pfc` | aluno | Grupo com nomes, orientador e turma (uma chamada, `GET /meu-pfc`); sem grupo, cria o PFC ou aceita um convite |
| `/entregaveis` | aluno | Envio das entregas do grupo (arquivo sobe direto para o S3, com progresso) e o que já foi entregue, com download |
| `/materiais` | todos | Equipe publica materiais (link ou arquivo, por turma ou para todas); aluno lê os gerais e os da turma dele |
| `/referencias` | todos | Busca de artigos (OpenAlex/Crossref) e lista ABNT do grupo |
| `/gestao` | orientador, admin | Admin: programa de PFC por turma, PFCs dos alunos e atividades. Orientador: os PFCs que orienta e as atividades |
| `/usuarios` | admin | Cadastro de orientador/admin, pré-autorização de RGMs e contas |
| `/turmas` | admin | Cursos e turmas |

## Estrutura

```
src/app/
├── core/
│   ├── models/        # tipos de domínio e regras puras (rótulos, período, RGM)
│   ├── services/      # um service por domínio, falando com a API
│   ├── guards/        # authGuard, guestGuard, roleGuard([...])
│   └── interceptors/  # Bearer + logout em 401; GETs idênticos em voo viram um só
├── shared/
│   ├── components/    # header, layout, ícones, campo de senha, escolha de arquivo,
│   │                  # respostas de uma entrega, timeline e card de entregável
│   └── pipes/         # deadline ("20/08 às 23:59")
└── features/          # uma pasta por tela, com uma subpasta por seção
    ├── auth/          # login, sign-up, confirm-account, forgot-password, new-password
    ├── home/          # início: painel do aluno e da equipe (matriz + detalhe)
    ├── my-pfc/        # /meu-pfc: grupo, convites, criar o PFC
    ├── deliverables/  # /entregaveis
    ├── materials/     # /materiais
    ├── references/    # /referencias: busca por tema, por DOI e a lista
    ├── pfc-management/# /gestao: programas, projetos e atividades
    ├── users/         # /usuarios
    ├── cohorts/       # /turmas: cursos e turmas
    └── notice/        # página não encontrada e área restrita
```

O código é em inglês; o que o usuário vê (textos, rotas) e o que espelha a API
(campos JSON das interfaces em `core/models`) continua em português. Cada
componente tem `.ts`, `.html` e, quando precisa, `.scss`. Quando as seções de
uma tela dividem dados, eles ficam num store do próprio componente
(`pfc-management.store.ts`, `cohorts.store.ts`), provido por ele.

Cada domínio tem um `abstract class XService` e a implementação `XHttpService`,
escolhida em `app.config.ts`.

Arquivos (entregas e materiais) não passam pela API: o backend devolve um
formulário assinado e `core/services/upload.ts` manda o arquivo direto para o
bucket, com progresso. O interceptor só põe o `Bearer` em chamadas à API — o
S3 recusa um envio assinado que também traga `Authorization`.

Erros de carregamento aparecem na tela: nenhuma lista vira "vazia" quando a
API falha.

As telas pedem os dados já no formato em que mostram: o aluno acha o próprio
grupo por `GET /meu-pfc` (não baixa os projetos dos outros nem a lista de
usuários, que é só da equipe) e a matriz do painel vem de três chamadas em
paralelo — projetos, atividades e `GET /programas/:id/entregas`.

As rotas, os corpos e as regras de cada chamada estão no README do
`PFC.Backend` (seção "Rotas implementadas").

## Testes

```bash
npm test        # Vitest: modelos, interceptors e telas (roda no pipeline)
npm run e2e     # build + Playwright contra a API falsa de e2e/fake-api.mjs
```

O e2e (`e2e/flows.spec.ts`) cobre os três perfis (aluno com e sem grupo,
coordenação, orientadora), upload e download de arquivo, prazo, materiais,
referências, gestão (atividades, orientador, PFC), cursos e turmas, senha
temporária, esqueci a senha e as telas no celular. Precisa do Chromium uma vez: `npx playwright install
chromium`. Mudou uma regra do backend? Atualize a API falsa junto.

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

Ícones são SVG inline em `shared/components/icon/icon.component.html`; não há
dependência de biblioteca de ícones.

Peças de interface repetidas moram no `styles.scss`, não em cada componente:
`.alert` (erro), `.ok` (sucesso), `.icon-action`, `.card__head-icon`,
`.empty-state` (lista vazia), `.text-button` (ação com cara de link),
`.form`/`.auth-switch` (telas de autenticação). No componente fica só o que é dele
— em geral a margem em volta.

Responsivo: abaixo de 1100px a navegação vira um menu (botão no cabeçalho).
Tabela larga rola dentro do próprio `.table-scroll`, nunca a página — o
`.page` usa `grid-template-columns: minmax(0, 1fr)` e o `.table-scroll` é
`position: relative` justamente pra isso.

## Detecção de mudanças

O app roda **sem zone.js** (`provideZonelessChangeDetection()` em
`app.config.ts`) e todo componente é `ChangeDetectionStrategy.OnPush`. A tela
é verificada quando um signal lido pelo template muda, ou num evento do
próprio template (clique, digitação). Na prática:

- estado de tela é sempre `signal`/`computed`/`toSignal` — campo comum
  alterado dentro de um `subscribe` **não aparece na tela**;
- `form.reset()`/`setValue()` dentro de callback funciona porque vem junto
  de um `signal.set(...)` (o `saving`, o `error`) no mesmo callback.

GETs idênticos em voo ao mesmo tempo viram uma requisição só
(`core/interceptors/dedupe.interceptor.ts`). Não é cache: acabou a
requisição, a próxima vai ao servidor.

## Diferenças em relação ao protótipo

- **Login redesenhado**: o protótipo usava um painel lateral de 390px com
  moldura de coluna dórica. Aqui a tela é branca com o cartão centralizado.
- **Materiais de Apoio**: tela nova, não existia no protótipo. Está no escopo
  do TCC. Para removê-la, apague `features/materials/` e a rota `/materiais`.
- **Seletor de turma** na tela inicial do professor — o protótipo era fixo na
  Turma A.
- **Rotas reais com guards** em vez do toggle client-side do protótipo.

## Deploy

O build gera arquivos estáticos em `dist/athena-front/browser`, prontos para o
bucket S3 servido pelo CloudFront. Como o roteamento é client-side, configure a
distribuição para responder `index.html` (200) nos erros 403/404, senão um
refresh em `/usuarios` cai em erro.
