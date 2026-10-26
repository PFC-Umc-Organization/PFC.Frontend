import { Page, expect, test as base } from '@playwright/test';

import { fakeApi } from './fake-api.mjs';

const test = base.extend<{ api: ReturnType<typeof fakeApi> }>({
  api: [async ({ context }, use) => {
    const api = fakeApi();
    await context.route('https://376uriw318.execute-api.us-east-1.amazonaws.com/**', api.handle);
    await context.route('https://fake-bucket.s3.us-east-1.amazonaws.com/**', api.bucket);
    await use(api);
  }, { auto: true }],
});

async function signIn(page: Page, email: string) {
  await page.goto('/entrar');
  await page.fill('#email', email);
  await page.fill('#password', 'Teste12345678@');
  await page.click('button[type=submit]');
  await page.waitForLoadState('networkidle');
}

/** Fields side by side must have their labels and controls on the same lines. */
async function misaligned(page: Page, where: string): Promise<string[]> {
  await page.waitForLoadState('networkidle');
  const rows = await page.evaluate(() => {
    const control = (f: Element) =>
      f.querySelector('input:not([type=file]):not([type=checkbox]), select, textarea, .file-picker, label.btn, .segmented');
    const fields = [...document.querySelectorAll('.field')].filter((f) => (f as HTMLElement).offsetParent && control(f));
    const out: string[] = [];
    for (const [i, a] of fields.entries()) {
      for (const b of fields.slice(i + 1)) {
        if (a.closest('form, .card') !== b.closest('form, .card') || a.contains(b) || b.contains(a)) continue;
        if (Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) > 1) continue;
        const ca = control(a)!.getBoundingClientRect().top;
        const cb = control(b)!.getBoundingClientRect().top;
        const la = a.firstElementChild!.getBoundingClientRect().top;
        const lb = b.firstElementChild!.getBoundingClientRect().top;
        if (Math.abs(la - lb) > 1) out.push(`${a.textContent?.trim().slice(0, 30)} | ${b.textContent?.trim().slice(0, 30)}: label ${Math.round(la - lb)}px`);
        if (Math.abs(ca - cb) > 1) out.push(`${a.textContent?.trim().slice(0, 30)} | ${b.textContent?.trim().slice(0, 30)}: ${Math.round(ca - cb)}px`);
      }
    }
    return out;
  });
  return rows.map((r) => `${where}: ${r}`);
}

/** Forms open on demand: open each one, try its choices, check it and close it. */
async function forms(page: Page, where: string): Promise<string[]> {
  const found: string[] = [];
  for (const opener of await page.locator('.card__actions .btn--primary, .list-head .btn--primary').all()) {
    if (!(await opener.isVisible())) continue;
    await opener.click();
    found.push(...(await misaligned(page, `${where} (formulário)`)));
    for (const choice of await page.locator('form .segmented__item').all()) {
      await choice.click();
      found.push(...(await misaligned(page, `${where} (formulário, ${await choice.textContent()})`)));
    }
    await page.getByRole('button', { name: 'Cancelar' }).first().click();
  }
  return found;
}

test('fields side by side line up on every screen', async ({ page }) => {
  const found: string[] = [];

  await signIn(page, '11231101229@alunos.umc.br');
  for (const route of ['/', '/meu-pfc', '/materiais', '/referencias', '/entregaveis']) {
    await page.goto(route);
    found.push(...(await misaligned(page, route)));
    for (const tab of await page.locator('.tabs__item, .segmented__item').all()) {
      await tab.click();
      found.push(...(await misaligned(page, `${route} ${await tab.textContent()}`)));
    }
  }
  for (const option of await page.locator('#activity option:not([value=""])').all()) {
    await page.selectOption('#activity', (await option.getAttribute('value'))!);
    found.push(...(await misaligned(page, `/entregaveis ${await option.textContent()}`)));
  }

  for (const email of ['leonardoalvino@umc.br', 'ana@umc.br']) {
    await page.evaluate(() => localStorage.clear());
    await signIn(page, email);
    for (const route of ['/', '/gestao', '/materiais', '/referencias', '/turmas', '/usuarios']) {
      await page.goto(route);
      if (!page.url().endsWith(route)) continue;
      found.push(...(await misaligned(page, `${email} ${route}`)));
      for (const tab of await page.locator('.tabs__item, .segmented__item').all()) {
        await tab.click();
        const where = `${email} ${route} ${await tab.textContent()}`;
        found.push(...(await misaligned(page, where)), ...(await forms(page, where)));
      }
      found.push(...(await forms(page, `${email} ${route}`)));
    }
  }

  expect(found).toEqual([]);
});
