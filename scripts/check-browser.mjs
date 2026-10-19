import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Arquivo sem prefixo test- para não entrar no descobrimento de testes unitários.
const url = process.env.ORGANIKA_URL ?? 'http://127.0.0.1:5175/';
const browser = await chromium.launch({ channel: process.env.ORGANIKA_BROWSER_CHANNEL ?? 'chrome', headless: true });
await mkdir('test-results', { recursive: true });
const errors = [];

async function point(page, x, y) {
  return page.locator('.workspace-svg').evaluate((svg, p) => {
    const result = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM());
    return { x: result.x, y: result.y };
  }, { x, y });
}
async function dragMouse(page, source, destination, beforeDrop) {
  await page.mouse.move(source.x, source.y); await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 16 });
  if (beforeDrop) await beforeDrop();
  await page.mouse.up();
}
async function center(locator) {
  const b = await locator.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url); await page.getByRole('heading', { name: 'Orgânika Builder' }).waitFor();
  await page.screenshot({ path: 'test-results/inicio-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Começar a jogar' }).click();
  await page.getByRole('heading', { name: 'Vamos montar o etano?' }).waitFor();
  await page.screenshot({ path: 'test-results/desktop-inicial.png', fullPage: true });
  await page.getByRole('button', { name: 'Adicionar CH₃, 2 disponíveis' }).click();
  await page.getByRole('button', { name: 'Adicionar CH₃, 1 disponíveis' }).click();
  assert.equal(await page.locator('[data-fragment-id]').count(), 2);
  await page.locator('[data-fragment-id]').first().click();
  await page.locator('.port-button').first().click();
  await page.locator('.port-button').last().click();
  await page.getByText('Pronta para verificar', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  assert.equal(await page.locator('.bond-button').count(), 0);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await page.getByRole('button', { name: 'Verificar estrutura' }).click();
  await page.getByText('Você construiu etano!', { exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/desktop-etano.png', fullPage: true });
  await page.getByRole('button', { name: 'Próximo desafio' }).click();
  await page.getByRole('heading', { name: 'Vamos montar o propano?' }).waitFor();
  console.log('OK: cliques, portas acessíveis, undo/redo, verificação e próximo desafio.');

  await page.reload();
  let source = await center(page.getByRole('button', { name: 'Adicionar CH₃, 2 disponíveis' }));
  await dragMouse(page, source, await point(page, 300, 250));
  assert.equal(await page.locator('[data-fragment-id]').count(), 1);
  await page.getByRole('button', { name: 'Girar peça selecionada', exact: true }).click();
  await page.keyboard.press('r');
  source = await center(page.getByRole('button', { name: 'Adicionar CH₃, 1 disponíveis' }));
  await dragMouse(page, source, await point(page, 160, 250), async () => {
    await page.getByText('Solte para encaixar', { exact: true }).waitFor();
    assert.equal(await page.locator('.interactive-port.snap-target').count(), 1);
    assert.equal(await page.locator('[data-fragment-id]').count(), 1, 'a prévia não deve consumir a peça');
    await page.screenshot({ path: 'test-results/encaixe-previa.png', fullPage: true });
  });
  await page.getByText('Pronta para verificar', { exact: true }).waitFor();
  const before = await page.locator('[data-fragment-id]').evaluateAll((elements) => elements.map((e) => e.getAttribute('transform')));
  await dragMouse(page, await point(page, 300, 250), await point(page, 330, 300));
  const after = await page.locator('[data-fragment-id]').evaluateAll((elements) => elements.map((e) => e.getAttribute('transform')));
  assert.notDeepEqual(after, before);
  assert.equal(await page.locator('.bond-button').count(), 1);
  await page.getByRole('button', { name: 'Verificar estrutura' }).click();
  await page.getByText('Você construiu etano!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Desconectar ligação 1: CH₃ com CH₃' }).click();
  await page.getByRole('button', { name: 'Verificar estrutura' }).click();
  await page.getByText('Há peças ou conjuntos desconectados.', { exact: true }).waitFor();
  console.log('OK: arraste da paleta, snap, movimento do conjunto e desconexão.');
  await page.getByRole('button', { name: 'Como jogar' }).click();
  assert.equal(await page.locator('dialog').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').count(), 0);
  await page.reload();
  await page.getByRole('button', { name: 'Adicionar CH₃, 2 disponíveis' }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Adicionar CH₃, 1 disponíveis' }).focus(); await page.keyboard.press('Enter');
  await page.locator('.port-button').first().focus(); await page.keyboard.press('Enter');
  await page.locator('.port-button').last().focus(); await page.keyboard.press('Enter');
  await page.locator('[data-fragment-id]').first().focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('r');
  await page.getByRole('button', { name: 'Verificar estrutura' }).focus(); await page.keyboard.press('Enter');
  await page.getByText('Você construiu etano!', { exact: true }).waitFor();
  console.log('OK: construção, movimento, giro e verificação inteiramente pelo teclado.');
  await page.getByRole('button', { name: 'Recomeçar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar montando', exact: true }).click();
  await page.getByText('Você construiu etano!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Recomeçar', exact: true }).click();
  await page.getByRole('button', { name: 'Recomeçar e voltar ao início' }).click();
  await page.getByRole('heading', { name: 'Orgânika Builder' }).waitFor();
  await page.getByRole('link', { name: 'Área do professor', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Desafios da atividade' }).waitFor();
  await page.screenshot({ path: 'test-results/professor-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Limpar seleção' }).click();
  assert.equal(await page.getByRole('button', { name: 'Iniciar roteiro' }).isDisabled(), true);
  await page.getByRole('checkbox', { name: /Etanol/ }).check();
  await page.getByRole('button', { name: 'Salvar roteiro neste navegador' }).click();
  await page.getByText('Roteiro salvo neste navegador. Ele permanece ao recomeçar a atividade.', { exact: true }).waitFor();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar roteiro JSON' }).click();
  assert.equal((await download).suggestedFilename(), 'roteiro-organika.json');
  await page.getByRole('button', { name: 'Limpar seleção' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'roteiro.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ tipo: 'organika-roteiro', versao: 1, desafiosIds: ['etanol'] })) });
  await page.getByText('Roteiro importado para revisão. Salve-o ou inicie a atividade quando estiver pronto.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('checkbox', { name: /Etanol/ }).isChecked(), true);
  await page.getByRole('button', { name: 'Iniciar roteiro' }).click();
  await page.getByRole('heading', { name: 'Vamos montar o etanol?' }).waitFor();
  await page.getByRole('button', { name: 'Recomeçar', exact: true }).click();
  await page.getByRole('button', { name: 'Recomeçar e voltar ao início' }).click();
  await page.getByRole('link', { name: 'Área do professor', exact: true }).first().click();
  assert.equal(await page.getByRole('checkbox', { name: /Etanol/ }).isChecked(), true);
  assert.equal(await page.getByRole('checkbox', { name: /Etano Hidrocarbonetos/ }).isChecked(), false);
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole('button', { name: 'Imprimir lista do aluno' }).click();
  assert.equal(await page.locator('.print-worksheet article').count(), 1);
  assert.equal(await page.locator('.print-answer-key').count(), 0);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.teacher-shell').isVisible(), false);
  assert.equal(await page.locator('.print-worksheet').isVisible(), true);
  await page.pdf({ path: 'test-results/lista-aluno.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Imprimir com gabarito' }).click();
  assert.equal(await page.locator('.print-answer-key article').count(), 1);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: 'test-results/lista-professor.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  console.log('OK: página inicial, recomeço, roteiro docente, importação/exportação, persistência e listas distintas para impressão.');
  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const touch = await mobile.newPage(); touch.on('pageerror', (e) => errors.push(e.message));
  await touch.goto(url); await touch.getByRole('heading', { name: 'Orgânika Builder' }).waitFor();
  await touch.screenshot({ path: 'test-results/inicio-mobile.png', fullPage: true });
  assert.ok(await touch.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await touch.getByRole('button', { name: 'Começar a jogar' }).tap();
  await touch.getByRole('heading', { name: 'Vamos montar o etano?' }).waitFor();
  await touch.screenshot({ path: 'test-results/mobile-inicial.png', fullPage: true });
  assert.ok(await touch.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'A página não deve rolar horizontalmente.');
  await touch.getByRole('button', { name: 'Adicionar CH₃, 2 disponíveis' }).tap();
  await touch.getByRole('button', { name: 'Adicionar CH₃, 1 disponíveis' }).tap();
  await touch.locator('.port-button').first().tap();
  await touch.locator('.port-button').last().tap();
  await touch.getByRole('button', { name: 'Verificar estrutura' }).tap();
  await touch.getByText('Você construiu etano!', { exact: true }).waitFor();
  console.log('OK: layout móvel, toque e conexão sem arraste.');

  await touch.reload();
  const cdp = await mobile.newCDPSession(touch);
  async function dragTouch(source, destination) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...source, id: 0 }] });
    for (let i = 1; i <= 16; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: source.x + (destination.x - source.x) * i / 16, y: source.y + (destination.y - source.y) * i / 16, id: 0 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await touch.getByRole('button', { name: 'Adicionar CH₃, 2 disponíveis' }).scrollIntoViewIfNeeded();
  source = await center(touch.getByRole('button', { name: 'Adicionar CH₃, 2 disponíveis' }));
  await dragTouch(source, await point(touch, 300, 160));
  assert.equal(await touch.locator('[data-fragment-id]').count(), 1);
  source = await center(touch.getByRole('button', { name: 'Adicionar CH₃, 1 disponíveis' }));
  await dragTouch(source, await point(touch, 440, 160));
  await touch.getByText('Pronta para verificar', { exact: true }).waitFor();
  assert.equal(await touch.locator('[data-fragment-id]').count(), 2);
  console.log('OK: arraste por toque com snap, sem duplicar peças.');
  await touch.getByRole('link', { name: 'Área do professor', exact: true }).first().tap();
  await touch.getByRole('heading', { name: 'Desafios da atividade' }).waitFor();
  await touch.screenshot({ path: 'test-results/professor-mobile.png', fullPage: true });
  assert.ok(await touch.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'A área do professor deve caber na tela móvel.');
  await touch.getByText('Ver gabarito', { exact: false }).first().tap();
  assert.equal(await touch.locator('.roster-answer').first().getAttribute('open'), '');
  console.log('OK: área docente responsiva e gabaritos acessíveis por toque.');
  await mobile.close();
  assert.deepEqual(errors, [], 'Não deve haver erros de JavaScript no navegador.');
  console.log('Verificação de navegador concluída.');
} finally { await browser.close(); }
