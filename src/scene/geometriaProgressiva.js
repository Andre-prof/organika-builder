import { BLOCOS_INTERMEDIARIOS, MoleculaProgressiva } from '../domain/MoleculaProgressiva.js';

export const LIMITES_PROGRESSIVOS = { width: 1200, height: 760 };
export function pontoPorta(fragment, index, pose) {
  const count = BLOCOS_INTERMEDIARIOS[fragment.templateId].ports.length;
  const degrees = count === 1 ? 0 : count === 2 ? [180, 0][index] : [180, 0, -90][index];
  const rad = (degrees + (pose.angle || 0)) * Math.PI / 180;
  const distance = degrees === -90 ? 60 : 82;
  return { x: pose.x + Math.cos(rad) * distance, y: pose.y + Math.sin(rad) * distance, nx: Math.cos(rad), ny: Math.sin(rad) };
}
export function conjuntoProgressivo(molecule, id) {
  if (molecule.nivel === 'avancado') return [id];
  const owner = new Map(molecule.fragments.flatMap((f) => f.atomIds.map((a) => [a, f.id])));
  const seen = new Set([id]); const queue = [id];
  for (const next of queue) for (const b of molecule.bonds.filter((b) => !b.internal)) {
    const a = owner.get(b.a); const c = owner.get(b.b); const other = a === next ? c : c === next ? a : null;
    if (other && !seen.has(other)) { seen.add(other); queue.push(other); }
  }
  return queue;
}
export function posesValidas(molecule, poses) {
  const ids = molecule.nivel === 'intermediario' ? molecule.fragments.map((f) => f.id) : molecule.atoms.map((a) => a.id);
  if (ids.some((id) => !poses[id] || !Number.isFinite(poses[id].x) || !Number.isFinite(poses[id].y))) return false;
  const margin = molecule.nivel === 'intermediario' ? 100 : 35;
  if (ids.some((id) => poses[id].x < margin || poses[id].x > 1200 - margin || poses[id].y < margin || poses[id].y > 760 - margin)) return false;
  // Corpos distantes: os conectores continuam visíveis entre as peças.
  return !ids.some((id, i) => ids.slice(i + 1).some((other) => {
    const a = poses[id]; const b = poses[other];
    if (molecule.nivel === 'avancado') return Math.hypot(a.x - b.x, a.y - b.y) < 50;
    const width = Math.abs(Math.sin((a.angle || 0) * Math.PI / 180)) > .5 ? 88 : 132;
    const height = width === 88 ? 132 : 88;
    const ow = Math.abs(Math.sin((b.angle || 0) * Math.PI / 180)) > .5 ? 88 : 132;
    return Math.abs(a.x - b.x) < (width + ow) / 2 + 6 && Math.abs(a.y - b.y) < (height + (ow === 88 ? 132 : 88)) / 2 + 6;
  }));
}
export function alinharProgressivo(molecule, poses, portA, portB) {
  const a = molecule.fragments.find((f) => f.ports.some((p) => p.id === portA));
  const b = molecule.fragments.find((f) => f.ports.some((p) => p.id === portB));
  if (!a || !b || conjuntoProgressivo(molecule, a.id).includes(b.id)) return null;
  const ia = a.ports.findIndex((p) => p.id === portA); const ib = b.ports.findIndex((p) => p.id === portB);
  const source = pontoPorta(a, ia, poses[a.id]); const target = pontoPorta(b, ib, poses[b.id]);
  const rotation = Math.atan2(-target.ny, -target.nx) - Math.atan2(source.ny, source.nx);
  const cs = Math.cos(rotation); const sn = Math.sin(rotation); const next = structuredClone(poses);
  for (const id of conjuntoProgressivo(molecule, a.id)) {
    const p = poses[id]; const dx = p.x - source.x; const dy = p.y - source.y;
    next[id] = { x: target.x + target.nx * 48 + dx * cs - dy * sn,
      y: target.y + target.ny * 48 + dx * sn + dy * cs, angle: ((p.angle || 0) + rotation * 180 / Math.PI + 360) % 360 };
  }
  // Reenquadra o conjunto unido quando o encaixe ultrapassaria uma borda.
  const joined = [...conjuntoProgressivo(molecule, a.id), ...conjuntoProgressivo(molecule, b.id)];
  const xs = joined.map((id) => next[id].x); const ys = joined.map((id) => next[id].y);
  const dx = Math.min(...xs) < 100 ? 100 - Math.min(...xs) : Math.max(...xs) > 1100 ? 1100 - Math.max(...xs) : 0;
  const dy = Math.min(...ys) < 100 ? 100 - Math.min(...ys) : Math.max(...ys) > 660 ? 660 - Math.max(...ys) : 0;
  for (const id of joined) { next[id].x += dx; next[id].y += dy; }
  return posesValidas(molecule, next) ? next : null;
}
export function encontrarEncaixeProgressivo(molecule, poses, id, escala, ordem) {
  if (molecule.nivel !== 'intermediario') return null;
  const moving = new Set(conjuntoProgressivo(molecule, id)); const candidates = [];
  for (const a of molecule.fragments.filter((f) => moving.has(f.id))) for (const pa of a.ports.filter((p) => !p.occupiedBondId && p.allowedOrders.includes(ordem))) {
    for (const b of molecule.fragments.filter((f) => !moving.has(f.id))) for (const pb of b.ports.filter((p) => !p.occupiedBondId && p.allowedOrders.includes(ordem))) {
      const simulated = MoleculaProgressiva.restaurar(molecule);
      if (!simulated.conectarPortas(pa.id, pb.id, ordem).valido) continue;
      const aligned = alinharProgressivo(molecule, poses, pa.id, pb.id);
      if (!aligned) continue;
      const distance = Math.hypot(aligned[id].x - poses[id].x, aligned[id].y - poses[id].y) * escala;
      if (distance > 30) continue;
      const angle = Math.abs((aligned[id].angle - poses[id].angle + 540) % 360 - 180);
      candidates.push({ portA: pa.id, portB: pb.id, atoms: [pa.atomId, pb.atomId].sort().join('|'), poses: aligned, distance, angle });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.angle - b.angle);
  const best = candidates[0];
  if (best && candidates.some((c) => c.atoms !== best.atoms && c.distance - best.distance < 4)) return null;
  return best || null;
}
export function posicaoLivre(molecule, poses) {
  const candidates = [];
  const stepX = molecule.nivel === 'intermediario' ? 240 : 180;
  const stepY = molecule.nivel === 'intermediario' ? 200 : 120;
  for (let y = 140; y <= 620; y += stepY) for (let x = 150; x <= 1050; x += stepX) candidates.push({ x, y, angle: 0 });
  return candidates.find((p) => Object.values(poses).every((other) => Math.hypot(p.x - other.x, p.y - other.y) > (molecule.nivel === 'intermediario' ? 150 : 60))) || null;
}
