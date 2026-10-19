import test from 'node:test';
import assert from 'node:assert/strict';
import { Molecule, BLOCOS, validarEstrutura } from '../src/index.js';
import { montar, verificarRecusaSemAlteracao } from './helpers.js';
import { montarEtanol, montarAcidoEtanoico, tentarConectarDoisOH } from '../examples/montagens.js';

test('inicia vazio e recusa template inexistente sem mudar a revisão', () => {
  const molecule = new Molecule();
  assert.deepEqual(molecule.obterMolecula(), { schemaVersion: '1.1', revision: 0, atoms: [], bonds: [], fragments: [] });
  verificarRecusaSemAlteracao(molecule, () => molecule.adicionarFragmento('benzeno'), 'UNKNOWN_TEMPLATE');
});

test('IDs são únicos e prefixados inclusive em instâncias de agregados diferentes', () => {
  const a = montar(['ch3', 'ch3']).molecule.obterMolecula();
  const b = montar(['cooh', 'oh']).molecule.obterMolecula();
  const ids = [];
  for (const snapshot of [a, b]) {
    for (const fragment of snapshot.fragments) {
      ids.push(fragment.id);
      for (const atom of snapshot.atoms.filter((x) => x.fragmentId === fragment.id)) assert.ok(atom.id.startsWith(`${fragment.id}:`));
      for (const port of fragment.ports) assert.ok(port.id.startsWith(`${fragment.id}:`));
      for (const bond of snapshot.bonds.filter((x) => snapshot.atoms.find((y) => y.id === x.a).fragmentId === fragment.id)) assert.ok(bond.id.startsWith(`${fragment.id}:`));
    }
    ids.push(...snapshot.atoms.map((x) => x.id), ...snapshot.bonds.map((x) => x.id), ...snapshot.fragments.flatMap((x) => x.ports.map((p) => p.id)));
  }
  assert.equal(new Set(ids).size, ids.length);
});

test('etanol tem H explícitos, portas reciprocamente ocupadas e cinco revisões', () => {
  const snapshot = montarEtanol().obterMolecula();
  assert.equal(snapshot.atoms.filter((a) => a.element === 'H').length, 6);
  assert.equal(snapshot.atoms.length, 9);
  assert.equal(snapshot.bonds.length, 8);
  assert.equal(snapshot.revision, 5);
  const ports = snapshot.fragments.flatMap((f) => f.ports);
  for (const bond of snapshot.bonds.filter((b) => !b.internal)) {
    const occupied = ports.filter((p) => p.occupiedBondId === bond.id);
    assert.equal(occupied.length, 2);
    assert.deepEqual(new Set(occupied.map((p) => p.atomId)), new Set([bond.a, bond.b]));
  }
  assert.equal(validarEstrutura(snapshot).completa, true);
});

test('ácido etanoico preserva carbonila dupla e os quatro H', () => {
  const snapshot = montarAcidoEtanoico().obterMolecula();
  assert.equal(snapshot.atoms.filter((a) => a.element === 'H').length, 4);
  assert.equal(snapshot.bonds.filter((b) => b.order === 2).length, 1);
  assert.equal(snapshot.bonds.filter((b) => b.order === 2)[0].internal, true);
  assert.equal(validarEstrutura(snapshot).completa, true);
});

test('retornos de adicionar, conectar e obter não permitem corromper o agregado', () => {
  const { molecule, fragments } = montar(['ch3', 'oh']);
  const atomId = fragments[0].atomIds[0];
  fragments[0].atomIds.length = 0;
  fragments[0].ports[0].allowedOrders.push(2);
  const result = molecule.conectarPortas(fragments[0].ports[0].id, fragments[1].ports[0].id);
  result.ligacao.a = 'adulterado';
  const copy = molecule.obterMolecula();
  copy.atoms.length = 0; copy.fragments[0].ports[0].occupiedBondId = null;
  const real = molecule.obterMolecula();
  assert.equal(real.fragments[0].atomIds[0], atomId);
  assert.deepEqual(real.fragments[0].ports[0].allowedOrders, [1]);
  assert.equal(validarEstrutura(real).completa, true);
});

test('recusa porta ocupada e ligação dupla sem alterar grafo ou revisão', () => {
  const { molecule, fragments } = montar(['ch3', 'ch2', 'oh'], [[0, 0, 1, 0]]);
  verificarRecusaSemAlteracao(molecule, () => molecule.conectarPortas(fragments[0].ports[0].id, fragments[2].ports[0].id), 'PORT_OCCUPIED');
  verificarRecusaSemAlteracao(molecule, () => molecule.conectarPortas(fragments[1].ports[1].id, fragments[2].ports[0].id, 2), 'EXTERNAL_BOND_ORDER_NOT_SUPPORTED');
});

test('desconectar libera duas portas, mantém H e permite reconectar com novo ID', () => {
  const molecule = montarEtanol();
  const before = molecule.obterMolecula();
  const bond = before.bonds.find((b) => !b.internal);
  const portIds = before.fragments.flatMap((f) => f.ports).filter((p) => p.occupiedBondId === bond.id).map((p) => p.id);
  assert.equal(molecule.desconectar(bond.id).valido, true);
  const after = molecule.obterMolecula();
  assert.deepEqual(after.atoms, before.atoms);
  assert.equal(after.revision, before.revision + 1);
  assert.equal(after.fragments.flatMap((f) => f.ports).filter((p) => p.occupiedBondId === null).length, 2);
  assert.equal(validarEstrutura(after).codigo, 'DISCONNECTED_COMPONENTS');
  const reconnect = molecule.conectarPortas(...portIds);
  assert.equal(reconnect.valido, true);
  assert.notEqual(reconnect.ligacao.id, bond.id);
  assert.equal(validarEstrutura(molecule.obterMolecula()).completa, true);
});

test('não permite desconectar ligações internas nem ligações inexistentes', () => {
  const molecule = montarAcidoEtanoico();
  const internal = molecule.obterMolecula().bonds.find((b) => b.order === 2);
  verificarRecusaSemAlteracao(molecule, () => molecule.desconectar(internal.id), 'INTERNAL_BOND_IMMUTABLE');
  verificarRecusaSemAlteracao(molecule, () => molecule.desconectar('não-existe'), 'BOND_NOT_FOUND');
});

test('OH com OH é uma recusa de escopo e conserva os dois fragmentos', () => {
  const { antes, depois, resultado } = tentarConectarDoisOH();
  assert.equal(resultado.codigo, 'UNSUPPORTED_PARTNER');
  assert.equal(resultado.valido, false);
  assert.deepEqual(depois, antes);
});

test('templates e suas estruturas aninhadas são imutáveis', () => {
  assert.throws(() => { BLOCOS.ch3.atoms[0].element = 'O'; }, TypeError);
  assert.throws(() => { BLOCOS.oh.ports[0].allowedOrders.push(2); }, TypeError);
});
