import test from 'node:test';
import assert from 'node:assert/strict';
import { DESAFIOS_AVANCADOS } from '../src/data/desafiosProgressivos.js';
import { criarProgressiveStore } from '../src/store/progressiveStore.js';
import { organizarMontagemAvancada } from '../src/scene/organizarMontagem.js';
import { posesValidas } from '../src/scene/geometriaProgressiva.js';

for (const [index, d] of DESAFIOS_AVANCADOS.entries()) {
  test(`Verificar organiza ${d.nome} sem mudar a química e permite desfazer`, () => {
    const store = criarProgressiveStore('avancado'); store.getState().trocarDesafio(index, true);
    const ids = new Map();
    for (const a of d.alvo.atoms) ids.set(a.id, store.getState().adicionar(a.element).atomo.id);
    for (const b of d.alvo.bonds) assert.equal(store.getState().conectar(ids.get(b.a), ids.get(b.b), b.order).valido, true);
    const before = structuredClone(store.getState().molecule); const raw = structuredClone(store.getState().poses);
    const expected = organizarMontagemAvancada(before);
    assert.equal(store.getState().verificar().objetivoCorreto, true);
    assert.deepEqual(store.getState().molecule, before);
    assert.deepEqual(store.getState().poses, expected);
    assert.equal(posesValidas(before, expected), true);
    store.getState().alterarVisualizacao('puzzle');
    assert.deepEqual(store.getState().poses, expected);
    // Conferir novamente não cria outra etapa de organização no histórico.
    store.getState().verificar(); store.getState().desfazer();
    assert.deepEqual(store.getState().poses, raw);
    assert.deepEqual(store.getState().molecule, before);
    store.getState().refazer(); assert.deepEqual(store.getState().poses, expected);
    if (d.id === 'propanona') {
      const cs = before.atoms.filter((a) => a.element === 'C');
      assert.equal(new Set(cs.map((a) => expected[a.id].y)).size, 1);
      const carbonila = before.bonds.find((b) => b.order === 2);
      assert.equal(expected[carbonila.a].x, expected[carbonila.b].x);
    }
  });
}
test('Verificação incompleta preserva as posições manuais', () => {
  const store = criarProgressiveStore('avancado'); store.getState().adicionar('C');
  const before = structuredClone(store.getState().poses);
  assert.equal(store.getState().verificar().valido, false);
  assert.deepEqual(store.getState().poses, before);
});
