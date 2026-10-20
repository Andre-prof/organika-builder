import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.ORGANIKA_URL || 'http://127.0.0.1:5175/';
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(`${base}#avancado`);
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-palette-type="C"]').tap();
    assert.ok(await page.locator('.progressive-atom').last().evaluate(el => {
      const b = el.getBoundingClientRect(); const c = el.closest('.workspace-scroll').getBoundingClientRect();
      return b.left >= c.left && b.right <= c.right;
    }), 'Cada carbono adicionado deve aparecer na janela visível.');
  }
  await page.locator('.progressive-canvas').scrollIntoViewIfNeeded();
  const cdp = await page.context().newCDPSession(page);
  const box = await page.locator('.progressive-canvas').boundingBox();
  const left = await page.locator('.progressive-canvas').evaluate(el => el.scrollLeft);
  const source = { x: box.x + 80, y: box.y + box.height - 60, id: 0 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [source] });
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...source, x: source.x + i * 10 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(await page.locator('.progressive-canvas').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'A bancada inteira deve caber na largura do celular.');
  const mobileAtom = page.locator('.progressive-atom').first();
  await mobileAtom.scrollIntoViewIfNeeded();
  const start = await mobileAtom.evaluate(el => {
    const p = new DOMPoint(0, 0).matrixTransform(el.getScreenCTM());
    return { x: p.x, y: p.y, id: 0 };
  });
  const original = await mobileAtom.getAttribute('transform');
  const scroll = await page.locator('.progressive-canvas').evaluate(el => el.scrollLeft);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, y: start.y + i * 5 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.notEqual(await mobileAtom.getAttribute('transform'), original, 'O toque sobre o átomo deve arrastá-lo.');
  assert.equal(await page.locator('.progressive-canvas').evaluate(el => el.scrollLeft), scroll);
  await page.screenshot({ path: 'test-results/avancado-mobile-corrigido.png', fullPage: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(`${base}#avancado`);
  await desktop.locator('[data-palette-type="C"]').click();
  await desktop.locator('[data-palette-type="C"]').click();
  const atom = desktop.locator('.progressive-atom').first();
  const other = desktop.locator('.progressive-atom').last();
  const a = await atom.boundingBox(); const b = await other.boundingBox();
  await desktop.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await desktop.mouse.down();
  await desktop.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
  const preview = await atom.getAttribute('transform');
  await desktop.mouse.up();
  assert.equal(await atom.getAttribute('transform'), preview, 'Soltar deve preservar a última prévia válida, sem voltar à origem.');
  assert.notEqual(preview, 'translate(150 140)');
  console.log('OK: novos carbonos visíveis, fundo deslocável por toque e arraste sem salto de volta.');
} finally { await browser.close(); }
