import { Page, expect, test as base } from '@playwright/test';

import { apiFalsa } from './api-falsa.mjs';

type Api = ReturnType<typeof apiFalsa>;

/** Cada teste ganha a API falsa do zero e falha se a página der erro no console. */
const test = base.extend<{ api: Api }>({
  api: [async ({ context, page }, use) => {
    const api = apiFalsa();
    await context.route('https://376uriw318.execute-api.us-east-1.amazonaws.com/**', api.handle);
    await context.route('https://bucket-falso.s3.us-east-1.amazonaws.com/**', api.bucket);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/status of 40|ERR_ABORTED/.test(m.text())) erros.push(m.text());
    });
    await use(api);
    expect(erros, 'erros no console').toEqual([]);
  }, { auto: true }],
});

const SENHA = 'Teste12345678@';
const ALUNO_SEM_GRUPO = '11231101228@alunos.umc.br';
const ALUNA_COM_GRUPO = '11231101229@alunos.umc.br';
const ADMIN = 'leonardoalvino@umc.br';
const ORIENTADORA = 'ana@umc.br';

async function entrar(page: Page, email: string, senha = SENHA) {
  await page.goto('/entrar');
  await page.fill('#email', email);
  await page.fill('#senha', senha);
  await page.click('button[type=submit]');
  await page.waitForLoadState('networkidle');
}

async function semRolagemLateral(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
}

test.describe('aluno sem grupo', () => {
  test('vê o cronograma, o aviso de PFC e só chama rotas de aluno', async ({ page, api }) => {
    await entrar(page, ALUNO_SEM_GRUPO);
    await expect(page.getByText('Monografia', { exact: true })).toBeVisible();
    await expect(page.getByText('1º CRUD')).toBeVisible();
    await expect(page.getByText('ainda não faz parte de um PFC')).toBeVisible();
    expect(api.calls).toContain('GET /me');
    expect(api.calls.some((c) => /\/atividades\/[^/]+\/entregas/.test(c))).toBe(false);
  });

  test('Entregáveis explica que a entrega é do grupo', async ({ page }) => {
    await entrar(page, ALUNO_SEM_GRUPO);
    await page.goto('/entregaveis');
    await expect(page.getByText('Você ainda não faz parte de um PFC')).toBeVisible();
  });

  test('lê só os materiais gerais e os da turma, sem formulário nem remover', async ({ page }) => {
    await entrar(page, ALUNO_SEM_GRUPO);
    await page.goto('/materiais');
    await expect(page.getByText('Manual do PFC')).toBeVisible();
    await expect(page.getByText('Aula da turma t2')).toHaveCount(0);
    await expect(page.locator('#titulo')).toHaveCount(0);
    await expect(page.locator('.material__remover')).toHaveCount(0);
  });
});

test.describe('aluna com grupo', () => {
  test('Meu PFC mostra nomes, orientador e turma numa chamada só', async ({ page, api }) => {
    await entrar(page, ALUNA_COM_GRUPO);
    await expect(page.getByText('Athena').first()).toBeVisible();
    api.calls.length = 0;
    await page.goto('/meu-pfc');
    await expect(page.getByText('Bia Lima').first()).toBeVisible();
    await expect(page.getByText('RGM 11231101230 (aguardando cadastro)')).toBeVisible();
    await expect(page.getByText('Orientadora Ana')).toBeVisible();
    await expect(page.getByText('Engenharia de Software - Noite - 2026.2')).toBeVisible();
    expect(api.calls.some((c) => c.includes('/usuarios') || (c.includes('/programas') && c.includes('/projetos')))).toBe(false);
    expect(api.failed).toEqual([]);
  });

  test('envia arquivo direto ao bucket, entrega e baixa sem levar o token', async ({ page, api }) => {
    await entrar(page, ALUNA_COM_GRUPO);
    await page.goto('/entregaveis?atividade=a3');
    await expect(page.locator('#atividade option:checked')).toContainText('Monografia final');

    await page.setInputFiles('#campo-c3', { name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
    await expect(page.getByText('Tipo de arquivo não aceito')).toBeVisible();
    expect(api.calls.some((c) => c.includes('/arquivos'))).toBe(false);

    await page.setInputFiles('#campo-c3', { name: 'Monografia Final.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(200_000, 1) });
    await expect(page.locator('.upload__nome')).toHaveText('Monografia Final.pdf');
    const envio = api.s3.find((r) => r.method === 'POST');
    expect(envio?.auth).toBe(false);

    await page.getByRole('button', { name: 'Enviar entrega' }).click();
    await expect(page.getByRole('button', { name: 'Monografia Final.pdf' })).toBeVisible();
    expect(api.db.entregas.find((e) => e.atividadeId === 'a3')?.respostas?.c3).toBe('entregas/pr1/a3/c3/u1/Monografia Final.pdf');
    await expect(page.locator('#atividade')).toHaveValue('');
    await expect(page.locator('#campo-c3')).toHaveCount(0);
    await expect(page.getByText('enviado antes do upload')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('bucket-falso') && r.method() === 'GET'),
      page.getByRole('button', { name: 'Monografia Final.pdf' }).click(),
    ]);
    expect(download.headers()['authorization']).toBeUndefined();
    expect(api.failed).toEqual([]);
  });
});

test.describe('prazo', () => {
  test('entregue no prazo segue editável depois dele; sem entrega, a atividade vencida some', async ({ page, api }) => {
    api.db.atividades.push({ id: 'a4', titulo: 'Banca', descricao: '', prazo: '2026-01-10T23:59', publicadaEm: '2026-01-01T00:00:00Z', campos: [{ id: 'c4', rotulo: 'Link', tipo: 'LINK', obrigatorio: true }] });
    await entrar(page, ALUNA_COM_GRUPO);
    await page.goto('/entregaveis');
    await expect(page.locator('#atividade option', { hasText: 'Banca' })).toHaveCount(0);

    await page.locator('#atividade').selectOption('a1');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    const editada = api.db.entregas.find((e) => e.atividadeId === 'a1');
    expect(editada?.entregueEm).toBe('2026-10-09T12:00:00Z');
    await expect(page.getByText(/editada em .* por/)).toBeVisible();
    expect(api.failed).toEqual([]);
  });
});

test.describe('coordenação', () => {
  test('painel começa na turma do semestre e monta a matriz com uma chamada de entregas', async ({ page, api }) => {
    await entrar(page, ADMIN);
    await expect(page.locator('#curso option:checked')).toHaveText('Engenharia de Software - Noite - 2026.2');
    await expect(page.getByText('Status de entrega por projeto (2)')).toBeVisible();
    expect(api.calls).toContain('GET /programas/p1/entregas');
    expect(api.calls.some((c) => /\/atividades\/[^/]+\/entregas/.test(c))).toBe(false);

    const antes = api.calls.length;
    await page.locator('button.celula').first().click();
    await expect(page.getByText('monografia.pdf')).toBeVisible();
    expect(api.calls.length).toBe(antes);
    expect(api.failed).toEqual([]);
  });

  test('baixa o arquivo de uma entrega pelo detalhe da célula', async ({ page, api }) => {
    api.db.entregas.push({ atividadeId: 'a3', projetoId: 'pr2', entregueEm: '2026-10-20T12:00:00Z', entreguePor: 'Fulano', respostas: { c3: 'entregas/pr2/a3/c3/u9/tcc.pdf' } });
    await entrar(page, ADMIN);
    await page.locator('[aria-label="Ver entrega de Web-Cursos"]').nth(1).click();
    const [download] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('bucket-falso') && r.method() === 'GET'),
      page.getByRole('button', { name: 'tcc.pdf' }).click(),
    ]);
    expect(download.url().endsWith('tcc.pdf')).toBe(true);
  });

  test('Gestão mostra programa órfão como "Turma removida"', async ({ page }) => {
    await entrar(page, ADMIN);
    await page.goto('/gestao');
    await expect(page.getByText('Turma removida')).toBeVisible();
  });

  test('Usuários separa orientadores e coordenação', async ({ page }) => {
    await entrar(page, ADMIN);
    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Usuários', exact: true }).first().click();
    await expect(page.getByText('Orientadores').first()).toBeVisible();
    await expect(page.getByText('Coordenação').first()).toBeVisible();
  });

  test('período inválido avisa antes de enviar', async ({ page }) => {
    await entrar(page, ADMIN);
    await page.goto('/turmas');
    await page.getByRole('button', { name: 'Turmas', exact: true }).first().click();
    await page.fill('#novo-periodo', '2026.3');
    await page.locator('#novo-periodo').blur();
    await expect(page.getByText('Use ano e semestre')).toBeVisible();
  });

  test('publica material em arquivo para todas as turmas', async ({ page, api }) => {
    await entrar(page, ADMIN);
    await page.goto('/materiais');
    await expect(page.locator('.material__turma', { hasText: 'Sistemas de Informação - Manhã - 2026.2' })).toBeVisible();
    await page.fill('#titulo', 'Modelo de monografia');
    await page.getByRole('button', { name: 'Arquivo', exact: true }).click();
    await page.setInputFiles('#material-arquivo', { name: 'modelo.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(1000, 1) });
    await expect(page.locator('.upload__nome')).toHaveText('modelo.pdf');
    await page.getByRole('button', { name: 'Publicar material' }).click();
    await expect(page.getByText('Material publicado')).toBeVisible();
    await expect(page.getByText('Modelo de monografia')).toBeVisible();
    expect(api.db.materiais.some((m) => m.chave === 'materiais/u1/modelo.pdf' && m.cursoId === null)).toBe(true);
  });
});

test.describe('orientadora', () => {
  test('vê e gerencia só os grupos que orienta, sem ações de admin', async ({ page, api }) => {
    await entrar(page, ORIENTADORA);
    await expect(page.getByText('Status de entrega por projeto (1)')).toBeVisible();
    await expect(page.getByText('Web-Cursos')).toHaveCount(0);

    await page.goto('/gestao');
    await expect(page.getByRole('button', { name: 'Meus orientandos' })).toBeVisible();
    await expect(page.getByText('Criar programa de PFC')).toHaveCount(0);
    await expect(page.getByText('Web-Cursos')).toHaveCount(0);
    await expect(page.locator('[aria-label^="Excluir PFC"], [aria-label^="Editar PFC"]')).toHaveCount(0);

    await page.goto('/materiais');
    await expect(page.locator('.material__remover')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Remover Aula da turma t2' })).toBeVisible();
    expect(api.failed).toEqual([]);
  });
});

test.describe('senhas', () => {
  test('senha temporária leva a "Defina sua senha" e depois entra no app', async ({ page }) => {
    await entrar(page, 'prof@umc.br', 'Temp#1234');
    await expect(page).toHaveURL(/\/nova-senha$/);
    await page.fill('#senha', 'Nova#12345');
    await page.fill('#confirmacao', 'Nova#1234x');
    await page.locator('#confirmacao').blur();
    await expect(page.getByText('As senhas não são iguais')).toBeVisible();
    await page.fill('#confirmacao', 'Nova#12345');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('esqueci a senha: código errado avisa, certo redefine, e o login volta à página pedida', async ({ page }) => {
    await page.goto('/entrar');
    await page.fill('#email', ALUNO_SEM_GRUPO);
    await page.getByText('Esqueci minha senha').click();
    await expect(page).toHaveURL(/\/esqueci-senha/);
    await expect(page.locator('#email')).toHaveValue(ALUNO_SEM_GRUPO);
    await page.click('button[type=submit]');
    await page.fill('#codigo', '000000');
    await page.fill('#senha', 'Outra#1234');
    await page.fill('#confirmacao', 'Outra#1234');
    await page.click('button[type=submit]');
    await expect(page.getByText('código incorreto')).toBeVisible();
    await page.fill('#codigo', '123456');
    await page.click('button[type=submit]');
    await expect(page.getByText('senha alterada')).toBeVisible();

    await page.goto('/referencias');
    await expect(page).toHaveURL(/entrar/);
    await page.fill('#email', ALUNO_SEM_GRUPO);
    await page.fill('#senha', 'Outra#1234');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/\/referencias$/);
  });
});

test.describe('celular (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nenhuma tela do aluno rola para o lado', async ({ page }) => {
    for (const rota of ['/entrar', '/esqueci-senha']) {
      await page.goto(rota);
      await semRolagemLateral(page);
    }
    await entrar(page, ALUNO_SEM_GRUPO);
    await semRolagemLateral(page);
    for (const rota of ['/materiais', '/entregaveis', '/meu-pfc']) {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      await semRolagemLateral(page);
    }
  });
});
