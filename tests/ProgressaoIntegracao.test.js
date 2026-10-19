import test from 'node:test';
import assert from 'node:assert/strict';
import { DESAFIOS_INTERMEDIARIOS, DESAFIOS_AVANCADOS } from '../src/data/desafiosProgressivos.js';
import { criarProgressiveStore } from '../src/store/progressiveStore.js';
import { MoleculaProgressiva } from '../src/domain/MoleculaProgressiva.js';
import { estruturasEquivalentes, descreverEstrutura } from '../src/game/progressao.js';
import { criarLayoutProgressivo } from '../src/scene/formulaProgressiva.js';
import { pontoPorta, encontrarEncaixeProgressivo, alinharProgressivo } from '../src/scene/geometriaProgressiva.js';

for (const challenge of [...DESAFIOS_INTERMEDIARIOS, ...DESAFIOS_AVANCADOS]) {
  test(`${challenge.nivel}: gabarito completo e renderizável de ${challenge.nome}`, () => {
    const molecule = challenge.alvo;
    assert.equal(MoleculaProgressiva.restaurar(molecule).validarEstrutura().completa, true);
    const layout = criarLayoutProgressivo(molecule);
    assert.equal(layout.atoms.length, molecule.atoms.length);
    assert.equal(layout.bonds.length, molecule.bonds.length);
    assert.ok(layout.atoms.every((a) => Number.isFinite(a.x) && Number.isFinite(a.y)));
    assert.deepEqual(layout.bonds.map((b) => b.order), molecule.bonds.map((b) => b.order));
    for (let i = 0; i < layout.atoms.length; i++) for (let j = i + 1; j < layout.atoms.length; j++) {
      const a = layout.atoms[i]; const b = layout.atoms[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 35, `Símbolos separados em ${challenge.nome}: ${a.element}/${b.element}`);
    }
    const renamed = structuredClone(molecule);
    renamed.atoms.reverse().forEach((a) => { a.id = `novo-${a.id}`; });
    renamed.bonds.reverse().forEach((b) => { b.a = `novo-${b.a}`; b.b = `novo-${b.b}`; });
    // O comparador depende apenas de átomos e arestas, nunca de IDs das peças.
    assert.equal(estruturasEquivalentes(molecule, renamed), true);
  });
}

for (const [index, challenge] of DESAFIOS_INTERMEDIARIOS.entries()) {
  test(`Bancada intermediária monta ${challenge.nome} com alinhamento real`, () => {
    const store = criarProgressiveStore('intermediario');
    store.getState().trocarDesafio(index, true);
    const map = new Map(); const previous = new Set();
    for (const fragment of challenge.alvo.fragments) {
      const result = store.getState().adicionar(fragment.templateId); assert.equal(result.valido, true);
      map.set(fragment.id, result.fragmento);
      for (const b of challenge.alvo.bonds.filter((b) => !b.internal)) {
        const fa = challenge.alvo.fragments.find((f) => f.atomIds.includes(b.a));
        const fb = challenge.alvo.fragments.find((f) => f.atomIds.includes(b.b));
        const other = fa.id === fragment.id ? fb : fb.id === fragment.id ? fa : null;
        if (!other || !previous.has(other.id)) continue;
        const currentPort = fragment.ports.findIndex((p) => p.occupiedBondId === b.id);
        const otherPort = other.ports.findIndex((p) => p.occupiedBondId === b.id);
        const r = store.getState().conectar(map.get(fragment.id).ports[currentPort].id, map.get(other.id).ports[otherPort].id, b.order);
        assert.equal(r.valido, true, `${challenge.nome}: ${r.mensagem}`);
      }
      previous.add(fragment.id);
    }
    assert.equal(store.getState().verificar().objetivoCorreto, true);
    assert.equal(store.getState().visualizacao, 'formula');
    store.getState().desfazer(); assert.equal(store.getState().resultado, null);
    store.getState().refazer(); assert.equal(store.getState().verificar().objetivoCorreto, true);
  });
}

test('Comparador distingue isômeros, posições de insaturação e presença de anel', () => {
  const a = DESAFIOS_INTERMEDIARIOS.find((d) => d.id === 'but-1-eno').alvo;
  const b = DESAFIOS_INTERMEDIARIOS.find((d) => d.id === 'but-2-eno').alvo;
  const c = DESAFIOS_INTERMEDIARIOS.find((d) => d.id === '2-metilpropeno').alvo;
  assert.equal(estruturasEquivalentes(a, b), false);
  assert.equal(estruturasEquivalentes(a, c), false);
  assert.equal(estruturasEquivalentes(b, c), false);
  assert.equal(estruturasEquivalentes(DESAFIOS_AVANCADOS[6].alvo, DESAFIOS_INTERMEDIARIOS[1].alvo), false);
});
test('Funções novas são reconhecidas sem confundir amida com amina ou éster com éter', () => {
  const expected = ['Cetona', 'Éter', 'Amina', 'Amida', 'Éster', 'Nitrila'];
  DESAFIOS_AVANCADOS.slice(0, 6).forEach((d, i) => {
    assert.deepEqual(descreverEstrutura(d.alvo).funcoes, [expected[i]]);
  });
});
test('Histórico, remoção, inventário e reinício são independentes entre níveis', () => {
  const a = criarProgressiveStore('avancado'); const b = criarProgressiveStore('intermediario');
  a.getState().adicionar('C'); const id = a.getState().selecao;
  assert.equal(b.getState().molecule.atoms.length, 0);
  a.getState().remover(); assert.equal(a.getState().molecule.atoms.length, 0);
  a.getState().desfazer(); assert.equal(a.getState().molecule.atoms[0].id, id);
  a.getState().refazer(); assert.equal(a.getState().molecule.atoms.length, 0);
  for (let i = 0; i < 3; i++) a.getState().adicionar('C');
  const before = a.getState().molecule;
  assert.equal(a.getState().adicionar('C').codigo, 'INVENTORY_EXHAUSTED');
  assert.deepEqual(a.getState().molecule, before);
  assert.equal(a.getState().trocarDesafio(3).codigo, 'CHALLENGE_LOCKED');
  a.getState().reiniciar(); assert.equal(a.getState().molecule.atoms.length, 0);
});
test('Encaixe por aproximação não exige sobreposição e recusa ordem diferente', () => {
  const store = criarProgressiveStore('intermediario');
  const a = store.getState().adicionar('ch2_dupla').fragmento;
  const b = store.getState().adicionar('ch2_dupla').fragmento;
  const { molecule, poses } = store.getState();
  const aligned = alinharProgressivo(molecule, poses, a.ports[0].id, b.ports[0].id);
  const raw = structuredClone(aligned); raw[a.id].x += 12;
  assert.equal(encontrarEncaixeProgressivo(molecule, raw, a.id, 1, 1), null);
  const candidate = encontrarEncaixeProgressivo(molecule, raw, a.id, 1, 2);
  assert.ok(candidate);
  assert.equal(Math.round(Math.hypot(pontoPorta(a, 0, candidate.poses[a.id]).x - pontoPorta(b, 0, candidate.poses[b.id]).x, pontoPorta(a, 0, candidate.poses[a.id]).y - pontoPorta(b, 0, candidate.poses[b.id]).y)), 48);
  store.getState().definirOrdem(2); assert.equal(store.getState().soltar(a.id, raw).valido, true);
  assert.equal(store.getState().verificar().objetivoCorreto, true);
});
test('Restauração rejeita alterações em H fixos, portas, ligações e valências', () => {
  const target = DESAFIOS_INTERMEDIARIOS[0].alvo;
  const alteracoes = [
    (m) => { m.atoms.find((a) => a.element === 'H').element = 'O'; },
    (m) => { m.fragments[0].ports[0].allowedOrders = [1, 2, 3]; },
    (m) => { m.fragments[0].ports[0].occupiedBondId = null; },
    (m) => { m.bonds[0].internal = false; },
    (m) => { m.bonds.find((b) => !b.internal).order = 3; },
    (m) => { m.schemaVersion = '1.1'; },
  ];
  for (const alterar of alteracoes) {
    const copy = structuredClone(target); alterar(copy);
    assert.throws(() => MoleculaProgressiva.restaurar(copy));
  }
  const advanced = structuredClone(DESAFIOS_AVANCADOS[0].alvo);
  advanced.bonds[0].internal = true;
  assert.throws(() => MoleculaProgressiva.restaurar(advanced));
  assert.equal(new MoleculaProgressiva().adicionarFragmento('toString').codigo, 'UNKNOWN_TEMPLATE');
});
