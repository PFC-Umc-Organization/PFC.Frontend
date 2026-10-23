import { Page, expect, test as base } from '@playwright/test';

import { fakeApi } from './fake-api.mjs';

type Api = ReturnType<typeof fakeApi>;

/** Each test gets a fresh fake API and fails on any console error. */
const test = base.extend<{ api: Api }>({
  api: [async ({ context, page }, use) => {
    const api = fakeApi();
    await context.route('https://376uriw318.execute-api.us-east-1.amazonaws.com/**', api.handle);
    await context.route('https://fake-bucket.s3.us-east-1.amazonaws.com/**', api.bucket);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/status of 40|ERR_ABORTED/.test(m.text())) errors.push(m.text());
    });
    await use(api);
    expect(errors, 'console errors').toEqual([]);
  }, { auto: true }],
});

const PASSWORD = 'Teste12345678@';
const STUDENT_WITHOUT_GROUP = '11231101228@alunos.umc.br';
const STUDENT_WITH_GROUP = '11231101229@alunos.umc.br';
const ADMIN = 'leonardoalvino@umc.br';
const ADVISOR = 'ana@umc.br';

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/entrar');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForLoadState('networkidle');
}

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
}

test.describe('student without a group', () => {
  test('sees the schedule and the PFC notice, calling only student routes', async ({ page, api }) => {
    await signIn(page, STUDENT_WITHOUT_GROUP);
    await expect(page.getByText('Monografia', { exact: true })).toBeVisible();
    await expect(page.getByText('1º CRUD')).toBeVisible();
    await expect(page.getByText('ainda não faz parte de um PFC')).toBeVisible();
    expect(api.calls).toContain('GET /me');
    expect(api.calls.some((c) => /\/atividades\/[^/]+\/entregas/.test(c))).toBe(false);
  });

  test('Entregáveis explains that submitting is done by the group', async ({ page }) => {
    await signIn(page, STUDENT_WITHOUT_GROUP);
    await page.goto('/entregaveis');
    await expect(page.getByText('Você ainda não faz parte de um PFC')).toBeVisible();
  });

  test('reads only general and own-cohort materials, without form or removal', async ({ page }) => {
    await signIn(page, STUDENT_WITHOUT_GROUP);
    await page.goto('/materiais');
    await expect(page.getByText('Manual do PFC')).toBeVisible();
    await expect(page.getByText('Aula da turma t2')).toHaveCount(0);
    await expect(page.locator('#titulo')).toHaveCount(0);
    await expect(page.locator('.material__remove')).toHaveCount(0);
  });
});

test.describe('student with a group', () => {
  test('the home highlights the closest open deadline and links to it', async ({ page }) => {
    await signIn(page, STUDENT_WITH_GROUP);
    const next = page.locator('.next');
    await expect(next.getByRole('heading', { name: '1º CRUD' })).toBeVisible();
    await expect(next).toContainText('mais 1 pendente');
    await page.screenshot({ path: 'test-results/next.png' });
    await next.getByRole('link', { name: 'Enviar entrega' }).click();
    await expect(page).toHaveURL(/\/entregaveis\?atividade=a2/);
  });

  test('Meu PFC shows names, advisor and cohort in a single call', async ({ page, api }) => {
    await signIn(page, STUDENT_WITH_GROUP);
    await expect(page.getByText('Athena').first()).toBeVisible();
    api.calls.length = 0;
    await page.goto('/meu-pfc');
    await expect(page.getByText('Bia Lima').first()).toBeVisible();
    await expect(page.getByText('RGM 11231101230 (aguardando cadastro)')).toBeVisible();
    await expect(page.getByText('Orientadora Ana')).toBeVisible();
    await expect(page.getByText('Engenharia de Software (Noite, 2026.2)')).toBeVisible();
    await expect(page.locator('.invitation').filter({ hasText: 'André Novaes' })).toContainText('RGM 11231101228');
    await expect(page.getByText('RGM 11231103420 (aguardando cadastro)')).toBeVisible();
    expect(api.calls.some((c) => c.includes('/usuarios') || (c.includes('/programas') && c.includes('/projetos')))).toBe(false);
    expect(api.failed).toEqual([]);
  });

  test('uploads straight to the bucket, submits and downloads without the token', async ({ page, api }) => {
    await signIn(page, STUDENT_WITH_GROUP);
    await page.goto('/entregaveis?atividade=a3');
    await expect(page.locator('#activity option:checked')).toContainText('Monografia final');

    await page.setInputFiles('#field-c3', { name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
    await expect(page.getByText('Tipo de arquivo não aceito')).toBeVisible();
    expect(api.calls.some((c) => c.includes('/arquivos'))).toBe(false);

    await page.setInputFiles('#field-c3', { name: 'Monografia Final.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(200_000, 1) });
    await expect(page.locator('.file-picker__name')).toHaveText('Monografia Final.pdf');
    const upload = api.s3.find((r) => r.method === 'POST');
    expect(upload?.auth).toBe(false);

    await page.getByRole('button', { name: 'Enviar entrega' }).click();
    await expect(page.getByRole('button', { name: 'Monografia Final.pdf' })).toBeVisible();
    expect(api.db.submissions.find((e) => e.atividadeId === 'a3')?.respostas?.c3).toBe('entregas/pr1/a3/c3/u1/Monografia Final.pdf');
    await expect(page.locator('#activity')).toHaveValue('');
    await expect(page.locator('#field-c3')).toHaveCount(0);
    await expect(page.getByText('enviado antes do upload')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('fake-bucket') && r.method() === 'GET'),
      page.getByRole('button', { name: 'Monografia Final.pdf' }).click(),
    ]);
    expect(download.headers()['authorization']).toBeUndefined();
    expect(api.failed).toEqual([]);
  });
});

test.describe('deadline', () => {
  test('a submission made in time stays editable after the deadline; a late activity without one disappears', async ({ page, api }) => {
    api.db.activities.push({ id: 'a4', titulo: 'Banca', descricao: '', prazo: '2026-01-10T23:59', publicadaEm: '2026-01-01T00:00:00Z', campos: [{ id: 'c4', rotulo: 'Link', tipo: 'LINK', obrigatorio: true }] });
    await signIn(page, STUDENT_WITH_GROUP);
    await page.goto('/entregaveis');
    await expect(page.locator('#activity option', { hasText: 'Banca' })).toHaveCount(0);

    await page.locator('#activity').selectOption('a1');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    const edited = api.db.submissions.find((e) => e.atividadeId === 'a1');
    expect(edited?.entregueEm).toBe('2026-10-09T12:00:00Z');
    await expect(page.getByText(/editada em .* por/)).toBeVisible();
    expect(api.failed).toEqual([]);
  });
});

test.describe('references', () => {
  test('a student searches by topic, adds and sees it in the group list', async ({ page, api }) => {
    await signIn(page, STUDENT_WITH_GROUP);
    await page.goto('/referencias');
    await page.getByLabel('Tema da pesquisa').fill('gestão de projetos');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText('2 resultados')).toBeVisible();
    await expect(page.getByText('Sem DOI', { exact: true }).last()).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar' }).click();
    await expect(page.getByText('Referência adicionada à lista do projeto.')).toBeVisible();
    await expect(page.getByText('Na lista')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Referências do projeto Athena \(1\)/ })).toBeVisible();
    expect(api.db.references).toHaveLength(1);
    expect(api.failed).toEqual([]);
  });
});

test.describe('coordination', () => {
  test('the panel starts at this term\'s cohort and builds the grid with one submissions call', async ({ page, api }) => {
    await signIn(page, ADMIN);
    await expect(page.locator('#cohort option:checked')).toHaveText('Engenharia de Software (Noite, 2026.2)');
    await expect(page.getByText('Status de entrega por projeto (2)')).toBeVisible();
    expect(api.calls).toContain('GET /programas/p1/entregas');
    expect(api.calls.some((c) => /\/atividades\/[^/]+\/entregas/.test(c))).toBe(false);

    const before = api.calls.length;
    await page.getByRole('button', { name: 'Athena, Monografia: Entregue' }).click();
    await expect(page.getByText('monografia.pdf')).toBeVisible();
    expect(api.calls.length).toBe(before);
    expect(api.failed).toEqual([]);
  });

  test('downloads a submission file from the cell detail', async ({ page, api }) => {
    api.db.submissions.push({ atividadeId: 'a3', projetoId: 'pr2', entregueEm: '2026-10-20T12:00:00Z', entreguePor: 'Fulano', respostas: { c3: 'entregas/pr2/a3/c3/u9/tcc.pdf' } });
    await signIn(page, ADMIN);
    await page.getByRole('button', { name: 'Web-Cursos, Monografia final: Entregue' }).click();
    const [download] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('fake-bucket') && r.method() === 'GET'),
      page.getByRole('button', { name: 'tcc.pdf' }).click(),
    ]);
    expect(download.url().endsWith('tcc.pdf')).toBe(true);
  });

  test('Gestão shows an orphan program as "Turma removida"', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/gestao');
    await page.getByRole('button', { name: 'Programas de PFC' }).click();
    await expect(page.getByText('Turma removida')).toBeVisible();
  });

  test('Usuários counts advisors and coordination apart', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Usuários', exact: true }).first().click();
    await expect(page.getByText('Orientadores').first()).toBeVisible();
    await expect(page.getByText('Coordenação').first()).toBeVisible();
  });

  test('an invalid term is flagged before sending', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/turmas');
    await page.getByRole('button', { name: 'Turmas', exact: true }).first().click();
    await page.fill('#new-term', '2026.3');
    await page.locator('#new-term').blur();
    await expect(page.getByText('Use ano e semestre')).toBeVisible();
  });

  test('registers a course and a cohort; a course with cohorts cannot be deleted', async ({ page, api }) => {
    await signIn(page, ADMIN);
    await page.goto('/turmas');
    await page.fill('#new-course-name', 'Direito');
    await page.getByRole('button', { name: 'Criar curso' }).click();
    await expect(page.getByRole('row', { name: /Direito/ })).toContainText('0');

    await page.getByRole('button', { name: 'Turmas', exact: true }).first().click();
    await page.locator('#new-course').selectOption('Direito');
    await page.locator('#new-shift').selectOption('NOITE');
    await page.fill('#new-term', '2026.2');
    await page.getByRole('button', { name: 'Criar turma' }).click();
    await expect(page.getByRole('cell', { name: 'Direito', exact: true })).toBeVisible();
    expect(api.db.cohorts.at(-1)).toMatchObject({ nome: 'Direito', turno: 'NOITE', graduacaoId: 'k12' });

    await page.getByRole('button', { name: 'Cursos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Excluir curso Direito' })).toBeDisabled();
    expect(api.failed).toEqual([]);
  });

  test('publishes a file material for every cohort', async ({ page, api }) => {
    await signIn(page, ADMIN);
    await page.goto('/materiais');
    await expect(page.locator('.material__audience', { hasText: 'Sistemas de Informação (Manhã, 2026.2)' })).toBeVisible();
    await page.fill('#material-title', 'Modelo de monografia');
    await page.getByRole('button', { name: 'Arquivo', exact: true }).click();
    await page.setInputFiles('#material-file', { name: 'modelo.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(1000, 1) });
    await expect(page.locator('.file-picker__name')).toHaveText('modelo.pdf');
    await page.getByRole('button', { name: 'Publicar material' }).click();
    await expect(page.getByText('Material publicado')).toBeVisible();
    await expect(page.getByText('Modelo de monografia')).toBeVisible();
    expect(api.db.materials.some((m) => m.chave === 'materiais/u1/modelo.pdf' && m.cursoId === null)).toBe(true);
  });
});

test.describe('management', () => {
  test('publishes an activity with an extra field and edits title and fields', async ({ page, api }) => {
    await signIn(page, ADMIN);
    await page.goto('/gestao');
    await page.getByRole('button', { name: 'Atividades', exact: true }).click();

    await page.fill('#new-activity-title', 'Banca final');
    await page.fill('#new-activity-deadline', '2099-12-20T23:59');
    const form = page.locator('app-new-activity');
    await form.getByLabel('Nome do novo campo').fill('Repositório');
    await form.getByLabel('Tipo do novo campo').selectOption('LINK');
    await form.getByRole('button', { name: 'Adicionar campo' }).click();
    await expect(form.getByText('Repositório')).toBeVisible();
    await page.getByRole('button', { name: 'Publicar atividade' }).click();
    await expect(page.getByText('Atividade publicada')).toBeVisible();
    const created = api.db.activities.find((a) => a.titulo === 'Banca final');
    expect(created?.campos.map((c) => c.tipo)).toEqual(['ARQUIVO', 'LINK']);

    await page.getByRole('button', { name: 'Editar atividade Banca final' }).click();
    const editor = page.locator('app-activity-editor');
    await editor.getByLabel('Nome do novo campo').fill('Slides');
    await editor.getByRole('button', { name: 'Adicionar campo' }).click();
    await expect(editor.getByText('Slides')).toBeVisible();
    await editor.getByRole('button', { name: 'Remover campo Repositório' }).click();
    await expect(editor.getByText('Repositório')).toHaveCount(0);
    await editor.getByLabel('Título da atividade').fill('Banca de defesa');
    await editor.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('cell', { name: 'Banca de defesa', exact: true })).toBeVisible();
    expect(created?.campos.map((c) => c.rotulo)).toEqual(['Arquivo da entrega', 'Slides']);
    expect(api.failed).toEqual([]);
  });

  test('sets the advisor and renames a PFC', async ({ page, api }) => {
    await signIn(page, ADMIN);
    await page.goto('/gestao');
    await expect(page.getByRole('button', { name: 'PFCs dos alunos' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Adicionar orientador de Web-Cursos' }).click();
    await page.getByRole('row', { name: /Web-Cursos/ }).getByRole('combobox').selectOption({ label: 'Orientadora Ana' });
    await expect(page.getByRole('row', { name: /Web-Cursos/ })).toContainText('Orientadora Ana');
    expect(api.db.projects.find((x) => x.id === 'pr2')?.orientadorId).toBe('u-ana');

    await page.getByRole('button', { name: 'Editar PFC Web-Cursos' }).click();
    await page.fill('#edit-name', 'Web-Cursos 2');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('cell', { name: 'Web-Cursos 2', exact: true })).toBeVisible();
    expect(api.failed).toEqual([]);
  });
});

test.describe('advisor', () => {
  test('sees and manages only the groups they advise, without admin actions', async ({ page, api }) => {
    await signIn(page, ADVISOR);
    await expect(page.getByText('Status de entrega por projeto (1)')).toBeVisible();
    await expect(page.getByText('Web-Cursos')).toHaveCount(0);

    await page.goto('/gestao');
    await expect(page.getByRole('button', { name: 'Meus orientandos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Programas de PFC' })).toHaveCount(0);
    await expect(page.getByText('Web-Cursos')).toHaveCount(0);
    await expect(page.locator('[aria-label^="Excluir PFC"], [aria-label^="Editar PFC"]')).toHaveCount(0);

    await page.goto('/materiais');
    await expect(page.locator('.material__remove')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Remover Aula da turma t2' })).toBeVisible();
    expect(api.failed).toEqual([]);
  });
});

test.describe('passwords', () => {
  test('a temporary password leads to "Defina sua senha" and then into the app', async ({ page }) => {
    await signIn(page, 'prof@umc.br', 'Temp#1234');
    await expect(page).toHaveURL(/\/nova-senha$/);
    await page.fill('#password', 'Nova#12345');
    await page.fill('#confirmation', 'Nova#1234x');
    await page.locator('#confirmation').blur();
    await expect(page.getByText('As senhas não são iguais')).toBeVisible();
    await page.fill('#confirmation', 'Nova#12345');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('forgot password: a wrong code warns, the right one resets, and the login returns to the asked page', async ({ page }) => {
    await page.goto('/entrar');
    await page.fill('#email', STUDENT_WITHOUT_GROUP);
    await page.getByText('Esqueci minha senha').click();
    await expect(page).toHaveURL(/\/esqueci-senha/);
    await expect(page.locator('#email')).toHaveValue(STUDENT_WITHOUT_GROUP);
    await page.click('button[type=submit]');
    await page.fill('#code', '000000');
    await page.fill('#password', 'Outra#1234');
    await page.fill('#confirmation', 'Outra#1234');
    await page.click('button[type=submit]');
    await expect(page.getByText('código incorreto')).toBeVisible();
    await page.fill('#code', '123456');
    await page.click('button[type=submit]');
    await expect(page.getByText('senha alterada')).toBeVisible();

    await page.goto('/referencias');
    await expect(page).toHaveURL(/entrar/);
    await page.fill('#email', STUDENT_WITHOUT_GROUP);
    await page.fill('#password', 'Outra#1234');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/\/referencias$/);
  });
});

test.describe('penalties', () => {
  const seed = (api: Api, n: number) => {
    for (let i = 1; i <= n; i++) {
      api.db.penalties.push({ projetoId: 'pr1', id: `manual-${i}`, motivo: `Motivo ${i}`, aplicadaEm: `2026-10-0${i}T12:00:00Z`, aplicadaPor: 'Orientadora Ana', perdao: null });
    }
  };

  test('the student home counts penalties and, at three, shows REPROVADO and closes submissions', async ({ page, api }) => {
    await signIn(page, STUDENT_WITH_GROUP);
    await expect(page.getByText('0 de 3 penalidades')).toBeVisible();
    seed(api, 3);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Reprovado' })).toBeVisible();
    await expect(page.getByText('Motivo 3')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Enviar entrega' })).toHaveCount(0);
    await page.goto('/entregaveis');
    await expect(page.getByRole('alert')).toContainText('O grupo foi reprovado');
    await expect(page.locator('#activity')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  });

  test('the advisor waives one from the panel and applies another, with a reason', async ({ page, api }) => {
    seed(api, 3);
    await signIn(page, ADVISOR);
    await page.getByRole('button', { name: 'Athena, penalidades: reprovado' }).click();
    await page.getByRole('button', { name: 'Perdoar' }).first().click();
    await page.getByRole('button', { name: 'Confirmar perdão' }).click();
    await expect(page.getByText('Informe o motivo do perdão.')).toBeVisible();
    await page.getByLabel('Motivo do perdão').fill('Atestado médico');
    await page.getByRole('button', { name: 'Confirmar perdão' }).click();
    await expect(page.getByText('Perdoada em')).toContainText('Orientadora Ana: Atestado médico');
    await expect(page.getByRole('button', { name: 'Athena, penalidades: 2 de 3' })).toBeVisible();

    await page.getByLabel('Motivo', { exact: true }).fill('Entrega não validada');
    await page.getByLabel('Atividade (opcional)').selectOption({ label: 'Monografia' });
    await page.getByRole('button', { name: 'Aplicar penalidade' }).click();
    await expect(page.getByText('Entrega não validada (Monografia)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Athena, penalidades: reprovado' })).toBeVisible();
    expect(api.db.penalties.at(-1)).toMatchObject({ projetoId: 'pr1', motivo: 'Entrega não validada', atividadeId: 'a1' });
  });
});

test.describe('phone (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('no student screen scrolls sideways', async ({ page }) => {
    for (const route of ['/entrar', '/esqueci-senha']) {
      await page.goto(route);
      await noSideScroll(page);
    }
    await signIn(page, STUDENT_WITHOUT_GROUP);
    await noSideScroll(page);
    for (const route of ['/materiais', '/entregaveis', '/meu-pfc']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await noSideScroll(page);
    }
  });
});
