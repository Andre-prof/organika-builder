import test from 'node:test';
import assert from 'node:assert/strict';
import {
  criarMoleculaVazia, validarEstrutura, validarLocal,
  contarCarbonos, detectarRamificacao, identificarFuncoes,
  classificarAlcoois, possuiAlcoolPrimario, possuiAlcoolSecundario,
} from '../src/index.js';
import { montar, verificarRecusaSemAlteracao } from './helpers.js';
import { montarEtanol, montarAcidoEtanoico } from '../examples/montagens.js';

test('V2 diferencia bancada vazia, componentes desconectados e portas livres', () => {
  assert.equal(validarEstrutura(criarMoleculaVazia()).codigo, 'EMPTY_WORKSPACE');
  assert.equal(validarEstrutura(montar(['ch3', 'oh']).molecule.obterMolecula()).codigo, 'DISCONNECTED_COMPONENTS');
  const open = validarEstrutura(montar(['ch3']).molecule.obterMolecula());
  assert.equal(open.codigo, 'OPEN_PORTS');
  assert.equal(open.completa, false);
  assert.equal(open.detalhes.portIds.length, 1);
});

test('V1 é pura e recebe o snapshot dentro do comando', () => {
  const { molecule, fragments } = montar(['ch3', 'oh']);
  const snapshot = molecule.obterMolecula(); const before = structuredClone(snapshot);
  const result = validarLocal({ molecule: snapshot, portA: fragments[0].ports[0].id, portB: fragments[1].ports[0].id });
  assert.equal(result.codigo, 'CONNECTION_ALLOWED');
  assert.equal(result.valido, true);
  assert.deepEqual(snapshot, before);
  assert.deepEqual(molecule.obterMolecula(), before);
});

test('V1 recusa porta inexistente, mesma porta e duas portas da mesma peça', () => {
  const { molecule, fragments } = montar(['ch2']);
  const [a, b] = fragments[0].ports;
  verificarRecusaSemAlteracao(molecule, () => molecule.conectarPortas(a.id, 'ausente'), 'PORT_NOT_FOUND');
  verificarRecusaSemAlteracao(molecule, () => molecule.conectarPortas(a.id, a.id), 'SAME_PORT');
  verificarRecusaSemAlteracao(molecule, () => molecule.conectarPortas(a.id, b.id), 'SAME_FRAGMENT_CONNECTION');
});

test('V1 impede fechamento de ciclo entre portas livres', () => {
  const { molecule, fragments } = montar(['ch2', 'ch2', 'ch2'], [[0, 1, 1, 0], [1, 1, 2, 0]]);
  verificarRecusaSemAlteracao(molecule, () => molecule.conectarPortas(fragments[0].ports[0].id, fragments[2].ports[1].id), 'CYCLE_NOT_SUPPORTED');
});

test('V2 detecta ciclo mesmo em um snapshot adulterado com valências corretas', () => {
  const { molecule, fragments } = montar(['ch2', 'ch2', 'ch2'], [[0, 1, 1, 0], [1, 1, 2, 0]]);
  const snapshot = molecule.obterMolecula();
  const a = snapshot.fragments[0].ports[0]; const b = snapshot.fragments[2].ports[1];
  snapshot.bonds.push({ id: 'ciclo', a: a.atomId, b: b.atomId, order: 1, internal: false });
  a.occupiedBondId = 'ciclo'; b.occupiedBondId = 'ciclo';
  assert.equal(validarEstrutura(snapshot).codigo, 'CYCLE_NOT_SUPPORTED');
});

for (const template of ['cho', 'cooh']) {
  test(`a restrição de ${template} com OH é recíproca`, () => {
    const { molecule, fragments } = montar([template, 'oh']);
    for (const [a, b] of [[0, 1], [1, 0]]) verificarRecusaSemAlteracao(molecule,
      () => molecule.conectarPortas(fragments[a].ports[0].id, fragments[b].ports[0].id), 'UNSUPPORTED_PARTNER');
  });
}

test('V2 e V1 retornam erros claros para entradas malformadas sem lançar exceção', () => {
  for (const input of [null, undefined, 7, [], {}, { atoms: [] }]) {
    assert.equal(validarEstrutura(input).codigo, 'INVALID_MOLECULE');
    assert.equal(validarEstrutura(input).completa, false);
  }
  assert.equal(validarLocal(null).codigo, 'INVALID_COMMAND');
  assert.equal(validarLocal({}).codigo, 'INVALID_MOLECULE');
});

const corruptions = [
  ['versão incompatível', 'INVALID_MOLECULE', (s) => { s.schemaVersion = '99'; }],
  ['revisão negativa', 'INVALID_MOLECULE', (s) => { s.revision = -1; }],
  ['átomo nulo', 'INVALID_RECORD', (s) => { s.atoms[0] = null; }],
  ['ID repetido', 'DUPLICATE_ID', (s) => { s.atoms[1].id = s.atoms[0].id; }],
  ['elemento não suportado', 'UNSUPPORTED_ELEMENT', (s) => { s.atoms[0].element = 'N'; }],
  ['carga', 'UNSUPPORTED_CHARGE', (s) => { s.atoms[0].formalCharge = 1; }],
  ['fragmento inexistente', 'INVALID_FRAGMENT_REFERENCE', (s) => { s.atoms[0].fragmentId = 'ausente'; }],
  ['template inexistente', 'UNKNOWN_TEMPLATE', (s) => { s.fragments[0].templateId = 'anel'; }],
  ['lista de átomos incompleta', 'INVALID_FRAGMENT_ATOMS', (s) => { s.fragments[0].atomIds.pop(); }],
  ['porta com ordem 2', 'INVALID_PORT', (s) => { s.fragments[0].ports[0].allowedOrders = [2]; }],
  ['referência de ligação inválida', 'INVALID_BOND_REFERENCE', (s) => { s.bonds[0].b = 'ausente'; }],
  ['átomo ligado a si', 'SELF_BOND', (s) => { s.bonds[0].b = s.bonds[0].a; }],
  ['ligação repetida', 'DUPLICATE_BOND', (s) => { s.bonds.push({ ...s.bonds[0], id: 'duplicada' }); }],
  ['ligação externa dupla', 'EXTERNAL_BOND_ORDER_NOT_SUPPORTED', (s) => { s.bonds.find((b) => !b.internal).order = 2; }],
  ['porta aponta para ligação interna', 'INVALID_PORT_OCCUPANCY', (s) => { s.fragments[0].ports[0].occupiedBondId = s.bonds[0].id; }],
  ['ligação externa sem duas portas', 'INVALID_PORT_OCCUPANCY', (s) => { s.fragments[0].ports[0].occupiedBondId = null; }],
  ['valência excedida', 'VALENCE_EXCEEDED', (s) => { s.bonds[0].order = 2; }],
  ['remoção de H fixo', 'TEMPLATE_MISMATCH', (s) => {
    const h = s.atoms.find((a) => a.element === 'H');
    s.atoms = s.atoms.filter((a) => a.id !== h.id);
    s.bonds = s.bonds.filter((b) => b.a !== h.id && b.b !== h.id);
    s.fragments.find((f) => f.id === h.fragmentId).atomIds = s.fragments.find((f) => f.id === h.fragmentId).atomIds.filter((id) => id !== h.id);
  }],
];
for (const [name, code, corrupt] of corruptions) {
  test(`integridade rejeita ${name}`, () => {
    const snapshot = montarEtanol().obterMolecula(); corrupt(snapshot);
    const before = structuredClone(snapshot);
    assert.equal(validarEstrutura(snapshot).codigo, code);
    assert.equal(validarLocal({ molecule: snapshot }).codigo, code);
    assert.deepEqual(snapshot, before);
  });
}

test('reordenar arrays e renomear todos os IDs preserva a validade química', () => {
  const s = montarAcidoEtanoico().obterMolecula();
  const rename = (id) => `novo-${id}`;
  for (const a of s.atoms) { a.id = rename(a.id); a.fragmentId = rename(a.fragmentId); }
  for (const b of s.bonds) { b.id = rename(b.id); b.a = rename(b.a); b.b = rename(b.b); }
  for (const f of s.fragments) {
    f.id = rename(f.id); f.atomIds = f.atomIds.map(rename).reverse(); f.ports.reverse();
    for (const p of f.ports) { p.id = rename(p.id); p.atomId = rename(p.atomId); if (p.occupiedBondId) p.occupiedBondId = rename(p.occupiedBondId); }
  }
  s.atoms.reverse(); s.bonds.reverse(); s.fragments.reverse();
  assert.equal(validarEstrutura(s).completa, true);
});

test('contagem inclui C de aldeído e ácido, mesmo em montagem parcial', () => {
  assert.equal(contarCarbonos(montarAcidoEtanoico().obterMolecula()), 2);
  const { molecule } = montar(['ch3', 'cho'], [[0, 0, 1, 0]]);
  assert.equal(contarCarbonos(molecule.obterMolecula()), 2);
  assert.deepEqual(identificarFuncoes(molecule.obterMolecula()).map((f) => f.tipo), ['aldeido']);
  assert.equal(contarCarbonos(montar(['cho', 'cooh']).molecule.obterMolecula()), 2);
});

test('OH do ácido é ácido carboxílico e não álcool', () => {
  const snapshot = montarAcidoEtanoico().obterMolecula();
  assert.deepEqual(identificarFuncoes(snapshot).map((f) => f.tipo), ['acido_carboxilico']);
  assert.deepEqual(classificarAlcoois(snapshot), []);
});

test('etanol é álcool primário e sua cadeia não é ramificada', () => {
  const snapshot = montarEtanol().obterMolecula();
  assert.equal(possuiAlcoolPrimario(snapshot), true);
  assert.equal(possuiAlcoolSecundario(snapshot), false);
  assert.equal(detectarRamificacao(snapshot), false);
});

test('butan-2-ol é secundário, embora a cadeia carbônica seja linear', () => {
  const { molecule } = montar(['ch3', 'ch', 'ch2', 'ch3', 'oh'], [[0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0], [1, 2, 4, 0]]);
  const s = molecule.obterMolecula();
  assert.equal(validarEstrutura(s).completa, true);
  assert.equal(contarCarbonos(s), 4);
  assert.equal(possuiAlcoolSecundario(s), true);
  assert.equal(possuiAlcoolPrimario(s), false);
  assert.equal(detectarRamificacao(s), false);
});

test('2-metilpropano conta os quatro carbonos e detecta ramificação', () => {
  const { molecule } = montar(['ch', 'ch3', 'ch3', 'ch3'], [[0, 0, 1, 0], [0, 1, 2, 0], [0, 2, 3, 0]]);
  const s = molecule.obterMolecula();
  assert.equal(validarEstrutura(s).completa, true);
  assert.equal(contarCarbonos(s), 4);
  assert.equal(detectarRamificacao(s), true);
  assert.deepEqual(identificarFuncoes(s), []);
});

test('metanol tem classificação especial e não é confundido com grau carbônico 1', () => {
  const { molecule } = montar(['ch3', 'oh'], [[0, 0, 1, 0]]);
  const s = molecule.obterMolecula();
  assert.equal(classificarAlcoois(s)[0].classificacao, 'metanol');
  assert.equal(classificarAlcoois(s)[0].numeroVizinhosCarbono, 0);
  assert.equal(possuiAlcoolPrimario(s), false);
});

test('dois OH em carbonos distintos produzem duas ocorrências de álcool', () => {
  const { molecule } = montar(['oh', 'ch2', 'ch2', 'oh'], [[0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0]]);
  const s = molecule.obterMolecula();
  assert.equal(validarEstrutura(s).completa, true);
  assert.equal(classificarAlcoois(s).length, 2);
  assert.ok(classificarAlcoois(s).every((f) => f.classificacao === 'primario'));
});

test('auxiliares não classificam silenciosamente snapshots corrompidos', () => {
  assert.throws(() => contarCarbonos({}), { codigo: 'INVALID_MOLECULE' });
});
