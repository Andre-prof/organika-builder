import test from 'node:test';
import assert from 'node:assert/strict';
import { DESAFIOS } from '../src/data/desafios.js';
import { criarLayoutFormula } from '../src/scene/formulaPlana.js';
import { criarGameStore } from '../src/store/gameStore.js';

function cruza(a, b) {
  const h1 = a.from.y === a.to.y; const h2 = b.from.y === b.to.y;
  const between = (x, a, b) => x >= Math.min(a, b) && x <= Math.max(a, b);
  if (h1 !== h2) {
    const h = h1 ? a : b; const v = h1 ? b : a;
    return between(v.from.x, h.from.x, h.to.x) && between(h.from.y, v.from.y, v.to.y);
  }
  if (h1 ? a.from.y !== b.from.y : a.from.x !== b.from.x) return false;
  const axis = h1 ? 'x' : 'y';
  return Math.max(Math.min(a.from[axis], a.to[axis]), Math.min(b.from[axis], b.to[axis]))
    <= Math.min(Math.max(a.from[axis], a.to[axis]), Math.max(b.from[axis], b.to[axis]));
}

for (const challenge of DESAFIOS) {
  test(`fórmula completa de ${challenge.nome} preserva todos os átomos e não cruza ligações`, () => {
    const molecule = challenge.alvo; const before = structuredClone(molecule);
    const layout = criarLayoutFormula(molecule);
    assert.deepEqual(molecule, before);
    assert.deepEqual(layout.atoms.map((a) => a.id).sort(), molecule.atoms.map((a) => a.id).sort());
    assert.deepEqual(layout.bonds.map((b) => [b.id, b.order]), molecule.bonds.map((b) => [b.id, b.order]));
    assert.equal(new Set(layout.atoms.map((a) => `${a.x},${a.y}`)).size, molecule.atoms.length);
    for (const a of layout.atoms) {
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
      assert.ok(a.x >= layout.viewBox.x && a.x <= layout.viewBox.x + layout.viewBox.width);
      assert.ok(a.y >= layout.viewBox.y && a.y <= layout.viewBox.y + layout.viewBox.height);
    }
    for (let i = 0; i < layout.atoms.length; i++) for (let j = i + 1; j < layout.atoms.length; j++) {
      assert.ok(Math.hypot(layout.atoms[i].x - layout.atoms[j].x, layout.atoms[i].y - layout.atoms[j].y) >= 32, 'Os símbolos precisam de espaço próprio.');
    }
    for (let i = 0; i < layout.bonds.length; i++) for (let j = i + 1; j < layout.bonds.length; j++) {
      const a = layout.bonds[i]; const b = layout.bonds[j];
      if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) continue;
      assert.equal(cruza(a, b), false, 'Ligações que não compartilham átomos não podem se cruzar.');
    }
  });
}

test('etanal e ácido mantêm uma carbonila dupla; etanol revela seis H', () => {
  for (const id of ['etanal', 'acido-propanoico']) {
    const layout = criarLayoutFormula(DESAFIOS.find((d) => d.id === id).alvo);
    assert.equal(layout.bonds.filter((b) => b.order === 2).length, 1);
  }
  const ethanol = criarLayoutFormula(DESAFIOS.find((d) => d.id === 'etanol').alvo);
  assert.equal(ethanol.atoms.filter((a) => a.element === 'H').length, 6);
  assert.equal(ethanol.formulaMolecular, 'C₂H₆O');
});

function etano(store) {
  const a = store.getState().adicionarPeca('ch3', { x: 300, y: 250, angle: 0 }).fragmento;
  store.getState().adicionarPeca('ch3', { x: 440, y: 250, angle: 0 }, true);
  return a;
}

test('a revelação só aparece após Verificar e alternar vistas não altera o grafo', () => {
  const store = criarGameStore(); etano(store);
  assert.equal(store.getState().visualizacao, 'puzzle');
  assert.equal(store.getState().alterarVisualizacao('formula').codigo, 'FORMULA_NOT_READY');
  assert.equal(store.getState().verificar().objetivoCorreto, true);
  assert.equal(store.getState().visualizacao, 'formula');
  const snapshot = store.getState().molecule; const poses = store.getState().poses;
  store.getState().alterarVisualizacao('puzzle'); store.getState().alterarVisualizacao('formula');
  assert.equal(store.getState().molecule, snapshot); assert.equal(store.getState().poses, poses);
  const bond = snapshot.bonds.find((b) => !b.internal);
  store.getState().desconectar(bond.id);
  assert.equal(store.getState().visualizacao, 'puzzle'); assert.equal(store.getState().resultado, null);
  store.getState().desfazer(); assert.equal(store.getState().visualizacao, 'formula');
});

test('molécula válida com objetivo incorreto também revela sua própria estrutura', () => {
  const store = criarGameStore(); store.getState().iniciarSessao(['etanol']);
  const a = store.getState().adicionarPeca('ch3', { x: 300, y: 250, angle: 0 }).fragmento;
  const b = store.getState().adicionarPeca('cho', { x: 450, y: 250, angle: 0 }).fragmento;
  store.getState().conectarPortas(b.ports[0].id, a.ports[0].id);
  const result = store.getState().verificar();
  assert.equal(result.completa, true); assert.equal(result.objetivoCorreto, false);
  assert.equal(store.getState().visualizacao, 'formula');
  assert.equal(criarLayoutFormula(store.getState().molecule).formulaMolecular, 'C₂H₄O');
  assert.deepEqual(store.getState().concluidos, []);
});
