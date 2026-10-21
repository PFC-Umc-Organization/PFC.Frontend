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

A API é a do `PFC.Backend` (`src/environments/environment.ts`). Para rodar
contra outra API, troque `apiBaseUrl` ali.

## Telas

| Rota | Quem acessa | Conteúdo |
| ---- | ----------- | -------- |
| `/entrar` | visitante | Login. Conta criada pela coordenação cai em `/nova-senha` no primeiro acesso |
| `/criar-conta`, `/confirmar-conta` | visitante | Cadastro do aluno (RGM pré-autorizado) e confirmação pelo código do e-mail |
| `/esqueci-senha` | visitante | Pede o código por e-mail e define a senha nova |
| `/nova-senha` | visitante | Troca da senha temporária (orientador e admin, primeiro acesso) |
| `/` | todos | Equipe: status de entrega de cada grupo da turma. Aluno: cronograma das atividades (mesmo sem grupo) |
| `/meu-pfc` | aluno | Cria o PFC do grupo, convites e aceite |
| `/materiais` | todos | Equipe: materiais de apoio. Aluno: envio das entregas do grupo |
| `/referencias` | todos | Busca de artigos (OpenAlex/Crossref) e lista ABNT do grupo |
| `/gestao` | orientador, admin | Programa de PFC por turma, PFCs dos alunos e atividades com os campos de entrega |
| `/usuarios` | admin | Cadastro de orientador/admin, pré-autorização de RGMs e contas |
| `/turmas` | admin | Cursos e turmas |

## Estrutura

```
src/app/
├── core/
│   ├── models/        # tipos de domínio e regras puras (rótulos, período, RGM)
│   ├── services/      # um service por domínio, falando com a API
│   ├── guards/        # authGuard, visitanteGuard, perfilGuard([...])
│   └── interceptors/  # Bearer + logout em 401; GETs idênticos em voo viram um só
├── shared/            # header, campo de senha, ícones (SVG inline), pipes
└── features/          # uma pasta por área (auth, inicio, aluno, professor, admin, materiais, referencias)
```

Cada domínio tem um `abstract class XService` e a implementação `XHttpService`,
escolhida em `app.config.ts`. A exceção é **Materiais**: o backend ainda não
tem esse domínio, então `MaterialLocalService` guarda os materiais só na
memória do navegador — a tela avisa que é uma prévia (somem ao recarregar e o
aluno não vê).

Erros de carregamento aparecem na tela: nenhuma lista vira "vazia" quando a
API falha.

As rotas, os corpos e as regras de cada chamada estão no README do
`PFC.Backend` (seção "Rotas implementadas").

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

Peças de interface repetidas moram no `styles.scss`, não em cada componente:
`.alerta` (erro), `.ok` (sucesso), `.acao-remover`, `.card__head-icone`,
`.form`/`.troca` (telas de autenticação). No componente fica só o que é dele
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
  de um `signal.set(...)` (o `salvando`, o `erro`) no mesmo callback.

GETs idênticos em voo ao mesmo tempo viram uma requisição só
(`core/interceptors/deduplicar.interceptor.ts`). Não é cache: acabou a
requisição, a próxima vai ao servidor.

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
