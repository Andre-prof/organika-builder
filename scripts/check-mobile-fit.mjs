import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { DESAFIOS } from '../src/data/desafios.js';
import { BLOCOS } from '../src/data/blocos.js';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.ORGANIKA_URL || 'http://127.0.0.1:5175/';
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await page.goto(`${base}#professor`);
  await page.getByRole('button', { name: 'Limpar seleção', exact: true }).tap();
  await page.getByRole('checkbox', { name: /Butano/ }).check();
  await page.getByRole('checkbox', { name: /Metanol/ }).check();
  await page.getByRole('button', { name: 'Iniciar roteiro', exact: true }).tap();
  await page.getByRole('heading', { name: 'Vamos montar o butano?', exact: true }).waitFor();
  async function fits(selector) {
    assert.ok(await page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${selector} deve caber na tela.`);
  }
  await fits('.palette-grid');
  await fits('.workspace-scroll');
  assert.ok(await page.locator('.palette-grid button').evaluateAll(elements => elements.every(el => {
    const box = el.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth;
  })), 'CH₃, CH₂ e OH devem estar na largura visível.');
  const challenge = DESAFIOS.find(d => d.id === 'butano'); const mapping = new Map();
  for (const [i, target] of challenge.alvo.fragments.entries()) {
    await page.getByRole('button', { name: new RegExp(`^Adicionar ${BLOCOS[target.templateId].nome},`) }).tap();
    const actual = await page.locator('.workspace-svg [data-fragment-id]').last().getAttribute('data-fragment-id');
    mapping.set(target.id, actual);
    const previous = new Set(challenge.alvo.fragments.slice(0, i).map(f => f.id));
    for (const bond of challenge.alvo.bonds.filter(b => !b.internal)) {
      const a = challenge.alvo.fragments.find(f => f.atomIds.includes(bond.a));
      const b = challenge.alvo.fragments.find(f => f.atomIds.includes(bond.b));
      const other = a.id === target.id ? b : b.id === target.id ? a : null;
      if (!other || !previous.has(other.id)) continue;
      const mine = target.ports.findIndex(p => p.occupiedBondId === bond.id);
      const theirs = other.ports.findIndex(p => p.occupiedBondId === bond.id);
      await page.locator(`[data-fragment-id="${actual}"] [data-port-id$=":port:p${mine + 1}"]`).tap();
      await page.locator(`[data-fragment-id="${mapping.get(other.id)}"] [data-port-id$=":port:p${theirs + 1}"]`).tap();
    }
  }
  assert.ok(await page.locator('.workspace-piece').evaluateAll(elements => elements.every(el => {
    const b = el.getBoundingClientRect(); const c = el.closest('.workspace-scroll').getBoundingClientRect();
    return b.left >= c.left - 1 && b.right <= c.right + 1;
  })), 'Todas as peças do butano devem caber na bancada.');
  await page.locator('.palette').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/butano-celular-completo.png', fullPage: true });
  // Um gesto no fundo vazio continua rolando a página verticalmente.
  await page.locator('.workspace-scroll').scrollIntoViewIfNeeded();
  const cdp = await page.context().newCDPSession(page);
  const box = await page.locator('.workspace-scroll').boundingBox();
  const beforeScroll = await page.evaluate(() => scrollY);
  const touch = { x: box.x + box.width / 2, y: box.y + box.height - 45, id: 0 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, y: touch.y - i * 8 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(await page.evaluate(() => scrollY) > beforeScroll + 30, 'O fundo vazio deve permitir rolagem vertical.');
  await page.getByRole('button', { name: 'Verificar estrutura', exact: true }).tap();
  await page.getByText('Você construiu butano!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Próximo desafio', exact: true }).tap();
  await page.getByRole('heading', { name: 'Vamos montar o metanol?', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => scrollY), 0, 'O próximo desafio deve começar no topo.');
  for (const nivel of ['intermediario', 'avancado']) {
    await page.goto(`${base}#${nivel}`);
    await fits('.workspace-scroll'); await fits('.palette-grid');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  console.log('OK: butano completo no celular, paletas visíveis, bancadas ajustadas, rolagem vertical e próximo desafio no topo.');
} finally { await browser.close(); }
