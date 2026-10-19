import { criarLayoutProgressivo } from './formulaProgressiva.js';
import { posesValidas } from './geometriaProgressiva.js';

/** Usa a conectividade real, sem consultar o gabarito nem alterar átomos/arestas. */
export function organizarMontagemAvancada(molecule) {
  const { atoms } = criarLayoutProgressivo(molecule);
  const xs = atoms.map((a) => a.x); const ys = atoms.map((a) => a.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  // Espaço para os círculos, os índices e os H, inclusive junto às bordas.
  const scale = Math.min(1.6, 1060 / Math.max(1, maxX - minX), 620 / Math.max(1, maxY - minY));
  const centerX = (minX + maxX) / 2; const centerY = (minY + maxY) / 2;
  const poses = Object.fromEntries(atoms.map((a) => [a.id, {
    x: +(600 + (a.x - centerX) * scale).toFixed(3),
    y: +(380 + (a.y - centerY) * scale).toFixed(3), angle: 0,
  }]));
  if (!posesValidas(molecule, poses)) throw new Error('Não foi possível distribuir os átomos com espaço suficiente.');
  return poses;
}
