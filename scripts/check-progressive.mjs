import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { DESAFIOS_INTERMEDIARIOS, DESAFIOS_AVANCADOS } from '../src/data/desafiosProgressivos.js';

const browser = await chromium.launch({ channel: process.env.ORGANIKA_BROWSER_CHANNEL ?? 'chrome', headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(10000);
page.on('pageerror', (error) => errors.push(error.message));
await mkdir('test-results', { recursive: true });
const base = 'http://127.0.0.1:5175/';
const chooseOrder = async (p, n) => p.getByRole('button', { name: { 1: '— simples', 2: '= dupla', 3: '≡ tripla' }[n], exact: true }).click();
async function launch(challenge) {
  await page.goto(`${base}#professor`);
  await page.getByRole('button', { name: challenge.nivel === 'intermediario' ? 'Intermediário' : 'Avançado', exact: true }).click();
  await page.getByRole('button', { name: `Iniciar ${challenge.nome}`, exact: true }).click();
  await page.getByRole('heading', { name: `Vamos montar ${challenge.nome.toLowerCase()}?`, exact: true }).waitFor();
}
async function build(challenge) {
  if (challenge.nivel === 'intermediario') {
    const map = new Map(); const previous = new Set();
    for (const f of challenge.alvo.fragments) {
      await page.locator(`[data-palette-type="${f.templateId}"]`).click();
      const id = await page.locator('.progressive-svg [data-fragment-id]').last().getAttribute('data-fragment-id');
      map.set(f.id, id);
      for (const b of challenge.alvo.bonds.filter((b) => !b.internal)) {
        const a = challenge.alvo.fragments.find((f) => f.atomIds.includes(b.a));
        const c = challenge.alvo.fragments.find((f) => f.atomIds.includes(b.b));
        const other = a.id === f.id ? c : c.id === f.id ? a : null;
        if (!other || !previous.has(other.id)) continue;
        const pi = f.ports.find((p) => p.occupiedBondId === b.id).id.split(':port:')[1];
        const oi = other.ports.find((p) => p.occupiedBondId === b.id).id.split(':port:')[1];
        await chooseOrder(page, b.order);
        await page.locator(`[data-fragment-id="${id}"] [data-port-id$=":port:${pi}"]`).click();
        await page.locator(`[data-fragment-id="${map.get(other.id)}"] [data-port-id$=":port:${oi}"]`).click();
      }
      previous.add(f.id);
    }
  } else {
    for (const at of challenge.alvo.atoms) await page.locator(`[data-palette-type="${at.element}"]`).click();
    const indexes = new Map(challenge.alvo.atoms.map((a, i) => [a.id, i + 1]));
    for (const b of challenge.alvo.bonds) {
      await chooseOrder(page, b.order);
      for (const id of [b.a, b.b]) {
        const at = challenge.alvo.atoms.find((a) => a.id === id);
        await page.locator('.progressive-connection-list').getByRole('button', { name: `${at.element} · átomo ${indexes.get(id)}`, exact: true }).click();
      }
    }
  }
}
async function verify(challenge) {
  if (challenge.nivel === 'intermediario') {
    const expected = challenge.alvo.bonds.filter((b) => !b.internal).reduce((s, b) => s + b.order * 2, 0);
    assert.equal(await page.locator('.progressive-svg [data-port-id] [data-connector-unit]').count(), expected, 'Um conector visual por unidade de ligação em cada extremidade.');
  }
  await page.getByRole('button', { name: 'Verificar estrutura', exact: true }).click();
  await page.getByRole('heading', { name: 'Fórmula estrutural plana completa', exact: true }).waitFor();
  await page.locator('.progressive-feedback.success').waitFor();
  assert.equal(await page.locator('.formula-svg [data-atom-id]').count(), challenge.alvo.atoms.length);
  assert.equal(await page.locator('.formula-svg [data-bond-id]').count(), challenge.alvo.bonds.length);
  for (const order of [1, 2, 3]) assert.equal(await page.locator(`.formula-svg [data-bond-order="${order}"] line`).count(), challenge.alvo.bonds.filter((b) => b.order === order).length * order);
  assert.equal(await page.locator('.workspace-scroll .formula-svg').count(), 1);
  const fits = await page.locator('.formula-drawing').evaluate((container) => {
    const box = container.getBoundingClientRect();
    return [...container.querySelectorAll('[data-atom-id]')].every((a) => {
      const r = a.getBoundingClientRect(); return r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
    });
  });
  assert.ok(fits, `Todos os H cabem verticalmente: ${challenge.nome}`);
  if (challenge.nivel === 'avancado') {
    await page.getByRole('button', { name: 'Montagem por átomos', exact: true }).click();
    assert.equal(await page.locator('.progressive-svg [data-atom-id]').count(), challenge.alvo.atoms.length);
    assert.equal(await page.locator('.progressive-svg .atom-puzzle-body').count(), challenge.alvo.atoms.length);
    for (const order of [1, 2, 3]) {
      const units = await page.locator(`.progressive-svg .puzzle-connectors.occupied[data-connector-order="${order}"] [data-connector-unit]`).count();
      assert.equal(units, challenge.alvo.bonds.filter((b) => b.order === order).length * order * 2);
    }
    if (challenge.id === 'propanona') {
      const ys = await page.locator('.progressive-svg [data-element="C"]').evaluateAll((atoms) => atoms.map((a) => a.transform.baseVal.consolidate().matrix.f));
      assert.equal(new Set(ys).size, 1, 'Os três carbonos ficam alinhados na montagem após verificar.');
      await page.screenshot({ path: 'test-results/propanona-montagem-organizada.png', fullPage: true });
    }
    await page.getByRole('button', { name: 'Fórmula plana completa', exact: true }).click();
  }
}
try {
  await page.goto(base);
  await page.getByRole('link', { name: 'Explorar intermediário', exact: true }).click();
  await page.getByRole('heading', { name: 'Vamos montar eteno?' }).waitFor();
  for (const challenge of [...DESAFIOS_INTERMEDIARIOS, ...DESAFIOS_AVANCADOS]) {
    await launch(challenge); await build(challenge); await verify(challenge);
    if (['eteno', 'etino', 'metilamina', 'ciclohexano', 'benzeno'].includes(challenge.id)) await page.screenshot({ path: `test-results/progressivo-${challenge.id}.png`, fullPage: true });
    console.log(`Navegador: ${challenge.nivel} / ${challenge.nome} ✓`);
  }
  // Navegação mantém a sessão; trocar a representação mantém a química.
  await page.getByRole('link', { name: 'Intermediário', exact: true }).click();
  await page.getByRole('heading', { name: 'Fórmula estrutural plana completa' }).waitFor();
  await page.getByRole('link', { name: 'Avançado', exact: true }).click();
  await page.getByRole('heading', { name: 'Fórmula estrutural plana completa' }).waitFor();
  await page.getByRole('button', { name: 'Montagem por átomos', exact: true }).click();
  const atoms = await page.locator('.progressive-svg [data-atom-id]').count();
  assert.equal(atoms, 12);
  await page.getByRole('button', { name: 'Recomeçar', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert.equal(await page.locator('.progressive-svg [data-atom-id]').count(), atoms);
  // Recomeçar só reinicia o nível atual.
  await page.getByRole('button', { name: 'Recomeçar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('link', { name: 'Explorar avançado', exact: true }).click();
  assert.equal(await page.locator('.progressive-svg [data-atom-id]').count(), 0);
  await page.getByRole('link', { name: 'Intermediário', exact: true }).click();
  await page.getByRole('heading', { name: 'Fórmula estrutural plana completa' }).waitFor();
  // Toque e tela estreita: adicionar e conectar sem arraste.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(`${base}#intermediario`);
  await mobile.locator('[data-palette-type="ch2_dupla"]').tap();
  await mobile.locator('[data-palette-type="ch2_dupla"]').tap();
  await chooseOrder(mobile, 2);
  const ports = mobile.locator('.progressive-connection-list button');
  await ports.nth(0).tap(); await ports.nth(1).tap();
  await mobile.getByRole('button', { name: 'Verificar estrutura', exact: true }).tap();
  await mobile.getByRole('heading', { name: 'Fórmula estrutural plana completa' }).waitFor();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await mobile.screenshot({ path: 'test-results/progressivo-mobile.png', fullPage: true });
  // Arraste real com encaixe; depois undo/refazer e conexão por teclado.
  await launch(DESAFIOS_INTERMEDIARIOS[0]);
  await page.locator('[data-palette-type="ch2_dupla"]').click();
  await page.locator('[data-palette-type="ch2_dupla"]').click();
  await chooseOrder(page, 2);
  await page.locator('.progressive-svg').scrollIntoViewIfNeeded();
  const dragPoints = await page.locator('.progressive-svg').evaluate((svg) => {
    const m = svg.getScreenCTM();
    const point = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(m); return { x: p.x, y: p.y }; };
    return { start: point(150, 140) };
  });
  // O destino está em x=390; a porta saliente fica em 472 e o corpo alinhado em 602.
  // Aproximar a 12 unidades da posição final permanece dentro do raio CSS.
  const endpoint = await page.locator('.progressive-svg').evaluate((svg) => {
    const p = new DOMPoint(614, 140).matrixTransform(svg.getScreenCTM()); return { x: p.x, y: p.y };
  });
  await page.mouse.move(dragPoints.start.x, dragPoints.start.y); await page.mouse.down();
  await page.mouse.move(endpoint.x, endpoint.y, { steps: 15 });
  await page.getByText('Solte para encaixar a ligação dupla', { exact: true }).waitFor();
  await page.mouse.up();
  assert.equal(await page.locator('.progressive-svg [data-scene-bond]').count(), 1);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  assert.equal(await page.locator('.progressive-svg [data-scene-bond]').count(), 0);
  const freePorts = page.locator('.progressive-svg [data-port-id]');
  await freePorts.nth(0).focus(); await page.keyboard.press('Enter');
  await freePorts.nth(1).focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.progressive-svg [data-scene-bond]').count(), 1);
  await page.getByRole('button', { name: 'Verificar estrutura', exact: true }).click();
  await page.getByRole('heading', { name: 'Fórmula estrutural plana completa', exact: true }).waitFor();
  // Átomos podem ser conectados diretamente no desenho, com recusa sem mutação.
  await launch(DESAFIOS_AVANCADOS[0]);
  await page.locator('[data-palette-type="C"]').click(); await page.locator('[data-palette-type="O"]').click();
  const canvasAtoms = page.locator('.progressive-svg [data-atom-id]');
  await chooseOrder(page, 3);
  await canvasAtoms.nth(0).click(); await canvasAtoms.nth(1).click();
  await page.getByText('A ligação ultrapassa a valência disponível.', { exact: true }).waitFor();
  assert.equal(await page.locator('.progressive-svg [data-scene-bond]').count(), 0);
  await chooseOrder(page, 2);
  await canvasAtoms.nth(1).click();
  assert.equal(await page.locator('.progressive-svg [data-scene-bond]').count(), 1);
  await page.getByRole('button', { name: 'Verificar estrutura', exact: true }).click();
  assert.equal(await page.locator('.formula-svg').count(), 0);
  // Gabarito docente mostra a fórmula completa, incluindo uma tripla.
  await page.goto(`${base}#professor`);
  await page.getByRole('button', { name: 'Intermediário', exact: true }).click();
  await page.getByRole('button', { name: 'Ver gabarito de Etino', exact: true }).click();
  await page.getByRole('heading', { name: 'Fórmula estrutural plana completa' }).waitFor();
  assert.equal(await page.locator('.progressive-teacher-answer [data-bond-order="3"] line').count(), 3);
  assert.deepEqual(errors, []);
  console.log('Navegação, sessões independentes, recomeço, toque, arraste, teclado, recusas e gabarito docente ✓');
} catch (error) {
  await page.screenshot({ path: 'test-results/progressivo-falha.png', fullPage: true });
  throw error;
} finally { await browser.close(); }
