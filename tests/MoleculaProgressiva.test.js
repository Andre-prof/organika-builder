import test from 'node:test';
import assert from 'node:assert/strict';
import { MoleculaProgressiva } from '../src/domain/MoleculaProgressiva.js';

for (const [nome, template, ordem, h] of [['eteno', 'ch2_dupla', 2, 4], ['etino', 'ch_tripla', 3, 2]]) {
  test(`Intermediário monta ${nome} preservando H explícitos`, () => {
    const m = new MoleculaProgressiva();
    const a = m.adicionarFragmento(template).fragmento;
    const b = m.adicionarFragmento(template).fragmento;
    assert.equal(m.conectarPortas(a.ports[0].id, b.ports[0].id, ordem).valido, true);
    assert.equal(m.validarEstrutura().completa, true);
    assert.equal(m.obterMolecula().atoms.filter((at) => at.element === 'H').length, h);
  });
}
test('Recusa de ordem incompatível é atômica e não consome portas', () => {
  const m = new MoleculaProgressiva();
  const a = m.adicionarFragmento('ch3').fragmento;
  const b = m.adicionarFragmento('ch2_dupla').fragmento;
  const antes = m.obterMolecula();
  assert.equal(m.conectarPortas(a.ports[0].id, b.ports[0].id, 2).codigo, 'INCOMPATIBLE_BOND_ORDER');
  assert.deepEqual(m.obterMolecula(), antes);
});
test('Intermediário mantém proibição de anéis e desconexão libera portas', () => {
  const m = new MoleculaProgressiva();
  const fs = Array.from({ length: 3 }, () => m.adicionarFragmento('ch2').fragmento);
  const primeira = m.conectarPortas(fs[0].ports[0].id, fs[1].ports[0].id);
  m.conectarPortas(fs[1].ports[1].id, fs[2].ports[0].id);
  assert.equal(m.conectarPortas(fs[2].ports[1].id, fs[0].ports[1].id).codigo, 'CYCLE_NOT_SUPPORTED');
  assert.equal(m.desconectar(primeira.ligacao.id).valido, true);
  assert.equal(m.validarEstrutura().codigo, 'DISCONNECTED_COMPONENTS');
});
test('Avançado fecha ciclo e exige todos os H do ciclopropano', () => {
  const m = new MoleculaProgressiva('avancado');
  const cs = Array.from({ length: 3 }, () => m.adicionarAtomo('C').atomo.id);
  cs.forEach((c, i) => assert.equal(m.conectarAtomos(c, cs[(i + 1) % 3]).valido, true));
  assert.equal(m.validarEstrutura().codigo, 'INCOMPLETE_VALENCE');
  for (const c of cs) for (let i = 0; i < 2; i++) m.conectarAtomos(c, m.adicionarAtomo('H').atomo.id);
  assert.equal(m.validarEstrutura().completa, true);
  const antes = m.obterMolecula();
  const copia = m.obterMolecula(); copia.atoms.length = 0;
  assert.deepEqual(m.obterMolecula(), antes);
});
test('Avançado monta metilamina neutra e recusa quinta ligação no carbono', () => {
  const m = new MoleculaProgressiva('avancado');
  const c = m.adicionarAtomo('C').atomo.id; const n = m.adicionarAtomo('N').atomo.id;
  m.conectarAtomos(c, n);
  const hs = Array.from({ length: 5 }, () => m.adicionarAtomo('H').atomo.id);
  hs.forEach((h, i) => m.conectarAtomos(i < 3 ? c : n, h));
  assert.equal(m.validarEstrutura().completa, true);
  assert.equal(m.conectarAtomos(c, hs[3]).codigo, 'VALENCE_EXCEEDED');
  assert.equal(m.adicionarAtomo('Cl').codigo, 'UNSUPPORTED_ELEMENT');
});
test('Cada nível conserva sua unidade de construção', () => {
  assert.equal(new MoleculaProgressiva().adicionarAtomo('C').codigo, 'ATOMS_NOT_SUPPORTED');
  assert.equal(new MoleculaProgressiva('avancado').adicionarFragmento('ch3').codigo, 'FRAGMENTS_NOT_SUPPORTED');
});
