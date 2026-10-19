import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { DESAFIOS } from '../src/data/desafios.js';
import { BLOCOS } from '../src/data/blocos.js';

const browser = await chromium.launch({ channel: process.env.ORGANIKA_BROWSER_CHANNEL ?? 'chrome', headless: true });
const errors = [];
await mkdir('test-results', { recursive: true });
async function construir(page, challenge) {
  const mapping = new Map();
  for (const [i, target] of challenge.alvo.fragments.entries()) {
    await page.getByRole('button', { name: new RegExp(`^Adicionar ${BLOCOS[target.templateId].nome},`) }).click();
    const actual = await page.locator('.workspace-svg [data-fragment-id]').last().getAttribute('data-fragment-id');
    mapping.set(target.id, actual);
    const previous = new Set(challenge.alvo.fragments.slice(0, i).map((f) => f.id));
    for (const bond of challenge.alvo.bonds.filter((b) => !b.internal)) {
      const a = challenge.alvo.fragments.find((f) => f.atomIds.includes(bond.a));
      const b = challenge.alvo.fragments.find((f) => f.atomIds.includes(bond.b));
      const other = a.id === target.id ? b : b.id === target.id ? a : null;
      if (!other || !previous.has(other.id)) continue;
      const mine = target.ports.findIndex((p) => p.occupiedBondId === bond.id);
      const theirs = other.ports.findIndex((p) => p.occupiedBondId === bond.id);
      await page.locator(`[data-fragment-id="${actual}"] [data-port-id$=":port:p${mine + 1}"]`).click();
      await page.locator(`[data-fragment-id="${mapping.get(other.id)}"] [data-port-id$=":port:p${theirs + 1}"]`).click();
    }
  }
}
async function conferir(page, challenge) {
  await page.getByRole('button', { name: 'Verificar estrutura' }).click();
  await page.getByRole('heading', { name: 'Fórmula estrutural plana completa', exact: true }).waitFor();
  assert.equal(await page.locator('.workspace-scroll .formula-svg [data-atom-id]').count(), challenge.alvo.atoms.length);
  assert.equal(await page.locator('.formula-svg [data-element="H"]').count(), challenge.alvo.atoms.filter((a) => a.element === 'H').length);
  assert.equal(await page.locator('.formula-svg [data-bond-id]').count(), challenge.alvo.bonds.length);
  assert.equal(await page.locator('.formula-svg [data-bond-order="2"] line').count(), challenge.alvo.bonds.filter((b) => b.order === 2).length * 2);
  assert.ok((await page.locator('.formula-atoms text').allTextContents()).every((t) => ['C', 'H', 'O'].includes(t)));
  assert.equal(await page.getByRole('button', { name: 'Fórmula plana completa', exact: true }).getAttribute('aria-pressed'), 'true');
  const fitsVertically = await page.locator('.formula-drawing').evaluate((container) => {
    const box = container.getBoundingClientRect();
    return [...container.querySelectorAll('[data-atom-id]')].every((atom) => {
      const bounds = atom.getBoundingClientRect(); return bounds.top >= box.top - 1 && bounds.bottom <= box.bottom + 1;
    });
  });
  assert.ok(fitsVertically, `Nenhum H deve ficar cortado em ${challenge.nome}.`);
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.ORGANIKA_URL ?? 'http://127.0.0.1:5175/');
  await page.getByRole('button', { name: 'Começar a jogar' }).click();
  assert.ok(await page.locator('.challenge-copy p').evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 16));
  assert.ok(await page.locator('.panel-description').evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 16));
  for (const challenge of DESAFIOS) {
    await construir(page, challenge);
    const before = await page.locator('.workspace-svg [data-fragment-id]').evaluateAll((elements) => elements.map((e) => e.getAttribute('transform')));
    await conferir(page, challenge);
    if (['etanol', 'acido-propanoico', '2-metilpropano', 'butan-2-ol'].includes(challenge.id)) await page.screenshot({ path: `test-results/formula-${challenge.id}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Quebra-cabeça', exact: true }).click();
    assert.deepEqual(await page.locator('.workspace-svg [data-fragment-id]').evaluateAll((elements) => elements.map((e) => e.getAttribute('transform'))), before);
    await page.getByRole('button', { name: 'Fórmula plana completa', exact: true }).click();
    if (challenge !== DESAFIOS.at(-1)) await page.getByRole('button', { name: 'Próximo desafio' }).click();
  }
  await context.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const touch = await mobile.newPage(); touch.on('pageerror', (e) => errors.push(e.message));
  await touch.goto(process.env.ORGANIKA_URL ?? 'http://127.0.0.1:5175/');
  await touch.getByRole('button', { name: 'Começar a jogar' }).tap();
  await construir(touch, DESAFIOS[0]); await conferir(touch, DESAFIOS[0]);
  assert.ok(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'A página deve continuar cabendo no celular.');
  await touch.screenshot({ path: 'test-results/formula-mobile.png', fullPage: true });
  await touch.getByRole('button', { name: 'Ampliar fórmula' }).tap();
  await touch.getByRole('button', { name: 'Reduzir fórmula' }).tap();
  await mobile.close(); assert.deepEqual(errors, []);
  console.log('OK: fontes de leitura, dez fórmulas completas no mesmo quadro, todos os H, carbonilas, alternância sem perder posições e zoom por toque.');
} finally { await browser.close(); }
