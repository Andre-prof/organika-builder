import test from 'node:test';
import assert from 'node:assert/strict';
import { Molecule } from '../src/index.js';
import { calcularEncaixe, portaNaCena, temColisao } from '../src/scene/geometria.js';
import { criarGameStore } from '../src/store/gameStore.js';

function cena(a, b, sourcePose) {
  const engine = new Molecule();
  const target = engine.adicionarFragmento(a).fragmento;
  const source = engine.adicionarFragmento(b).fragmento;
  return { molecule: engine.obterMolecula(), target, source,
    poses: { [target.id]: { x: 300, y: 250, angle: 0 }, [source.id]: sourcePose } };
}

test('duas peças CH₃ encaixam lado a lado com um espaço de 20, sem sobreposição', () => {
  const { molecule, target, source, poses } = cena('ch3', 'ch3', { x: 440, y: 250, angle: 0 });
  assert.equal(temColisao(poses, [source.id]), false);
  const result = calcularEncaixe(molecule, poses, [source.id], 1);
  assert.equal(result.portB, target.ports[0].id);
  assert.equal(result.poses[source.id].x, 420);
  assert.equal(result.poses[source.id].angle, 180);
  const a = portaNaCena(target, 0, result.poses[target.id]); const b = portaNaCena(source, 0, result.poses[source.id]);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .001);
  assert.equal(temColisao(result.poses, [source.id]), false);
});

test('sobrepor os corpos não é o gatilho de encaixe', () => {
  const { molecule, source, poses } = cena('ch3', 'ch3', { x: 302, y: 250, angle: 0 });
  assert.equal(calcularEncaixe(molecule, poses, [source.id], 1), null);
});

test('um CH₂ solto escolhe a porta equivalente que exige menos giro', () => {
  const { molecule, target, source, poses } = cena('ch3', 'ch2', { x: 440, y: 250, angle: 0 });
  const result = calcularEncaixe(molecule, poses, [source.id], 1);
  assert.equal(result.portA, source.ports[0].id);
  assert.equal(result.portB, target.ports[0].id);
  assert.equal(result.poses[source.id].angle, 0);
  assert.equal(result.ambiguo, undefined);
});

test('ramificação superior aceita uma aproximação externa e gira a peça', () => {
  const { molecule, target, source, poses } = cena('ch', 'ch3', { x: 300, y: 135, angle: 0 });
  assert.equal(temColisao(poses, [source.id]), false);
  const result = calcularEncaixe(molecule, poses, [source.id], 1);
  assert.equal(result.portB, target.ports[2].id);
  assert.equal(result.poses[source.id].y, 150);
  assert.equal(result.poses[source.id].angle, 90);
});

test('a orientação manual do destino é respeitada no encaixe vertical', () => {
  const { molecule, source, target, poses } = cena('ch3', 'ch3', { x: 300, y: 390, angle: 0 });
  poses[target.id].angle = 90;
  const result = calcularEncaixe(molecule, poses, [source.id], 1);
  assert.equal(result.poses[target.id].angle, 90);
  assert.equal(result.poses[source.id].y, 370);
  assert.equal(result.poses[source.id].angle, 270);
});

test('o alcance CSS também funciona na aproximação externa de peças opostas', () => {
  const { molecule, source, poses } = cena('ch3', 'oh', { x: 470, y: 250, angle: 0 });
  assert.equal(calcularEncaixe(molecule, poses, [source.id], 1), null);
  assert.ok(calcularEncaixe(molecule, poses, [source.id], .5).portA);
});

test('o novo cálculo geométrico não libera a união de dois OH', () => {
  const { molecule, source, poses } = cena('oh', 'oh', { x: 160, y: 250, angle: 0 });
  assert.equal(calcularEncaixe(molecule, poses, [source.id], 1).erro.codigo, 'UNSUPPORTED_PARTNER');
});

test('soltar a peça da paleta sobre outra não consome inventário nem altera a molécula', () => {
  const store = criarGameStore(); store.getState().adicionarPeca('ch3', { x: 300, y: 250, angle: 0 });
  const before = store.getState().molecule;
  const result = store.getState().adicionarPeca('ch3', { x: 302, y: 250, angle: 0 }, true);
  assert.equal(result.codigo, 'LAYOUT_COLLISION');
  assert.deepEqual(store.getState().molecule, before);
  assert.equal(store.getState().adicionarPeca('ch3', { x: 440, y: 250, angle: 0 }, true).valido, true);
});

test('arrastar uma peça já inserida sobre outra preserva as posições anteriores', () => {
  const store = criarGameStore();
  store.getState().adicionarPeca('ch3', { x: 300, y: 250, angle: 0 });
  const source = store.getState().adicionarPeca('ch3', { x: 600, y: 250, angle: 0 }).fragmento;
  const before = store.getState();
  const result = store.getState().moverConjunto(source.id, { [source.id]: { x: 302, y: 250, angle: 0 } });
  assert.equal(result.codigo, 'LAYOUT_COLLISION');
  assert.equal(store.getState().molecule, before.molecule);
  assert.equal(store.getState().poses, before.poses);
});
