import test from 'node:test';
import assert from 'node:assert/strict';
import { moverComLimites, posesValidas } from '../src/scene/geometriaProgressiva.js';

const molecule = { nivel: 'avancado', atoms: [{ id: 'a' }, { id: 'b' }] };
const poses = { a: { x: 150, y: 140 }, b: { x: 330, y: 140 } };
test('arraste para na colisão e mantém a posição aceita ao soltar', () => {
  const next = moverComLimites(molecule, poses, 'a', 180, 0);
  assert.ok(next.a.x > 150 && next.a.x <= 280);
  assert.ok(posesValidas(molecule, next));
  assert.deepEqual(next.b, poses.b);
  assert.equal(poses.a.x, 150);
});
test('arraste limita a borda e permite sair do obstáculo em outra direção', () => {
  const edge = moverComLimites(molecule, poses, 'a', -1000, -1000);
  assert.equal(edge.a.x, 35);
  assert.ok(Math.abs(edge.a.y - 35) < .001);
  const blocked = moverComLimites(molecule, poses, 'a', 180, 0);
  const free = moverComLimites(molecule, blocked, 'a', 0, 100);
  assert.ok(free.a.y > 230);
  assert.ok(posesValidas(molecule, free));
});
