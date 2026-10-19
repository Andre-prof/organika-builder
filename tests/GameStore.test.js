import test from 'node:test';
import assert from 'node:assert/strict';
import { criarGameStore } from '../src/store/gameStore.js';
import { DESAFIOS } from '../src/data/desafios.js';
import { assinaturaMolecular, avaliarDesafio } from '../src/game/AvaliadorDesafio.js';
import { Molecule, validarEstrutura } from '../src/index.js';
import { calcularEncaixe, componenteDe, portaNaCena } from '../src/scene/geometria.js';

/** Insere cada fragmento e o conecta a um vizinho já construído, como faria a UI. */
function construirAlvo(store, challenge) {
  const mapping = new Map();
  for (const [i, target] of challenge.alvo.fragments.entries()) {
    const result = store.getState().adicionarPeca(target.templateId, { x: i === 0 ? 330 : 160, y: i === 0 ? 280 : 450, angle: 0 });
    assert.equal(result.valido, true, result.mensagem); mapping.set(target.id, result.fragmento);
    const previous = new Set(challenge.alvo.fragments.slice(0, i).map((f) => f.id));
    for (const b of challenge.alvo.bonds.filter((b) => !b.internal)) {
      const fa = challenge.alvo.fragments.find((f) => f.atomIds.includes(b.a));
      const fb = challenge.alvo.fragments.find((f) => f.atomIds.includes(b.b));
      const other = fa.id === target.id ? fb : fb.id === target.id ? fa : null;
      if (!other || !previous.has(other.id)) continue;
      const mine = target.ports.findIndex((p) => p.occupiedBondId === b.id);
      const theirs = other.ports.findIndex((p) => p.occupiedBondId === b.id);
      const connection = store.getState().conectarPortas(mapping.get(target.id).ports[mine].id, mapping.get(other.id).ports[theirs].id);
      assert.equal(connection.valido, true, connection.mensagem);
    }
  }
}

test('as dez receitas são completas e a store permite a progressão inteira', () => {
  const store = criarGameStore();
  for (const challenge of DESAFIOS) {
    assert.equal(validarEstrutura(challenge.alvo).completa, true);
    if (store.getState().desafioId !== challenge.id) store.getState().trocarDesafio(challenge.id);
    assert.equal(store.getState().desafioId, challenge.id);
    construirAlvo(store, challenge);
    assert.equal(store.getState().validacao.completa, true);
    assert.equal(store.getState().concluidos.includes(challenge.id), false, 'montagem completa não concede vitória antes de Verificar');
    const result = store.getState().verificar();
    assert.equal(result.objetivoCorreto, true, challenge.id);
  }
  assert.equal(store.getState().concluidos.length, 10);
});

test('cada sessão tem engine e histórico independentes', () => {
  const a = criarGameStore(); const b = criarGameStore();
  a.getState().adicionarPeca('ch3');
  assert.equal(b.getState().molecule.fragments.length, 0);
  assert.equal(b.getState().podeDesfazer, false);
});

test('inventário e desafios bloqueados não alteram montagem nem histórico', () => {
  const store = criarGameStore(); store.getState().adicionarPeca('ch3'); store.getState().adicionarPeca('ch3');
  const before = store.getState().molecule;
  assert.equal(store.getState().adicionarPeca('ch3').codigo, 'INVENTORY_EMPTY');
  assert.equal(store.getState().adicionarPeca('oh').codigo, 'INVENTORY_EMPTY');
  assert.equal(store.getState().trocarDesafio('etanol').codigo, 'CHALLENGE_LOCKED');
  assert.equal(store.getState().molecule, before);
  store.getState().desfazer();
  assert.equal(store.getState().molecule.fragments.length, 1);
});

test('desfazer/refazer restaura cena e grafo sem permitir mutação pelo consumidor', () => {
  const store = criarGameStore(); construirAlvo(store, DESAFIOS[0]);
  const before = store.getState().molecule; const poses = store.getState().poses;
  assert.throws(() => { before.fragments[0].ports[0].occupiedBondId = null; }, TypeError);
  store.getState().desfazer(); assert.equal(store.getState().validacao.completa, false);
  store.getState().refazer();
  assert.deepEqual(store.getState().molecule, before); assert.deepEqual(store.getState().poses, poses);
});

test('mover conjunto preserva química, distâncias e resultado já verificado', () => {
  const store = criarGameStore(); construirAlvo(store, DESAFIOS[0]); store.getState().verificar();
  const before = store.getState(); const id = before.molecule.fragments[0].id;
  const poses = { ...before.poses, [id]: { ...before.poses[id], x: before.poses[id].x + 30, y: before.poses[id].y + 20 } };
  store.getState().moverConjunto(id, poses, false);
  assert.deepEqual(store.getState().molecule, before.molecule);
  for (const f of before.molecule.fragments) {
    assert.equal(store.getState().poses[f.id].x, before.poses[f.id].x + 30);
    assert.equal(store.getState().poses[f.id].y, before.poses[f.id].y + 20);
  }
  assert.equal(store.getState().resultado.objetivoCorreto, true);
});

test('girar conjunto mantém distâncias e conectividade', () => {
  const store = criarGameStore(); construirAlvo(store, DESAFIOS[0]);
  const before = store.getState(); const [a, b] = before.molecule.fragments.map((f) => f.id);
  store.getState().selecionar(a); store.getState().girarSelecionada();
  const after = store.getState();
  assert.deepEqual(after.molecule, before.molecule);
  assert.ok(Math.abs(Math.hypot(after.poses[a].x - after.poses[b].x, after.poses[a].y - after.poses[b].y) - 120) < .001);
  assert.equal(after.poses[a].angle, (before.poses[a].angle + 90) % 360);
});

test('devolver peça libera portas, repõe inventário e pode ser desfeito', () => {
  const store = criarGameStore(); construirAlvo(store, DESAFIOS[0]);
  const previous = store.getState().molecule; const id = previous.fragments[0].id;
  store.getState().selecionar(id); store.getState().removerSelecionada();
  assert.equal(store.getState().molecule.fragments.length, 1);
  assert.equal(store.getState().molecule.fragments[0].ports[0].occupiedBondId, null);
  store.getState().desfazer(); assert.deepEqual(store.getState().molecule, previous);
  store.getState().refazer(); assert.equal(store.getState().adicionarPeca('ch3').valido, true);
});

test('recusa de encaixe conserva a cena e o grafo', () => {
  const store = criarGameStore(); construirAlvo(store, DESAFIOS[0]);
  const previous = store.getState(); const [a, b] = previous.molecule.fragments;
  const result = store.getState().conectarPortas(a.ports[0].id, b.ports[0].id);
  assert.equal(result.codigo, 'PORT_OCCUPIED');
  assert.equal(store.getState().molecule, previous.molecule); assert.equal(store.getState().poses, previous.poses);
});

test('snap alinha duas saliências de repouso e desfaz inserção com encaixe num passo', () => {
  const store = criarGameStore(); store.getState().adicionarPeca('ch3', { x: 300, y: 250, angle: 0 });
  const before = store.getState().molecule;
  store.getState().adicionarPeca('ch3', { x: 440, y: 250, angle: 0 }, true, 1);
  assert.equal(store.getState().validacao.completa, true);
  const [a, b] = store.getState().molecule.fragments;
  const pa = portaNaCena(a, 0, store.getState().poses[a.id]); const pb = portaNaCena(b, 0, store.getState().poses[b.id]);
  assert.ok(Math.hypot(pa.x - pb.x, pa.y - pb.y) < .001);
  assert.ok(Math.abs(pa.nx + pb.nx) < .001);
  store.getState().desfazer(); assert.deepEqual(store.getState().molecule, before);
});

test('o alcance de snap é medido em pixels CSS após escala', () => {
  const store = criarGameStore();
  store.getState().adicionarPeca('ch3', { x: 300, y: 250, angle: 0 });
  const b = store.getState().adicionarPeca('ch3', { x: 470, y: 250, angle: 0 }).fragmento;
  const s = store.getState();
  assert.equal(calcularEncaixe(s.molecule, s.poses, [b.id], 1), null);
  assert.ok(calcularEncaixe(s.molecule, s.poses, [b.id], .5).portA);
});

test('assinatura ignora IDs e distingue butano de 2-metilpropano', () => {
  const a = DESAFIOS[2].alvo; const b = DESAFIOS[8].alvo;
  assert.notEqual(assinaturaMolecular(a), assinaturaMolecular(b));
  assert.equal(avaliarDesafio(a, DESAFIOS[8]).objetivoCorreto, false);
  const restored = Molecule.restaurar(a); assert.equal(assinaturaMolecular(restored.obterMolecula()), assinaturaMolecular(a));
});

test('snapshot restaurado é independente e gera IDs novos após uma nova adição', () => {
  const engine = new Molecule(); engine.adicionarFragmento('ch3');
  const snapshot = engine.obterMolecula(); const restored = Molecule.restaurar(snapshot);
  const extra = restored.adicionarFragmento('oh');
  assert.ok(!snapshot.fragments.some((f) => f.id === extra.fragmento.id));
  snapshot.atoms.length = 0; assert.equal(restored.obterMolecula().atoms.length, 6);
  assert.throws(() => Molecule.restaurar({}), { codigo: 'INVALID_MOLECULE' });
});

test('posições inválidas e seleções inexistentes não corrompem a cena', () => {
  const store = criarGameStore();
  assert.equal(store.getState().adicionarPeca('ch3', { x: NaN, y: 20, angle: 0 }).codigo, 'INVALID_POSE');
  assert.equal(store.getState().selecionar('inexistente').codigo, 'FRAGMENT_NOT_FOUND');
  assert.equal(store.getState().molecule.fragments.length, 0);
});
