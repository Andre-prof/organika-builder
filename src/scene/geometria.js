import { validarLocal } from '../game/ValidadorEstrutura.js';

// A cena conhece portas e posições. O domínio químico não depende deste módulo.
export const CENA = Object.freeze({ width: 960, height: 560 });
export const ALCANCE_ENCAIXE_CSS = 28;
export function posicaoDeInsercao(point) {
  return { x: Math.max(85, Math.min(875, point.x)), y: Math.max(85, Math.min(475, point.y)), angle: 0 };
}
export const PORTAS = Object.freeze({
  ch3: [[60, 0, 1, 0]], ch2: [[-60, 0, -1, 0], [60, 0, 1, 0]],
  ch: [[-60, 0, -1, 0], [60, 0, 1, 0], [0, -40, 0, -1]],
  oh: [[-60, 0, -1, 0]], cho: [[-60, 0, -1, 0]], cooh: [[-60, 0, -1, 0]],
});
export const girar = ({ x, y }, angle) => {
  const r = angle * Math.PI / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
};
export function portaNaCena(fragment, index, pose) {
  const [x, y, nx, ny] = PORTAS[fragment.templateId][index];
  const p = girar({ x, y }, pose.angle); const n = girar({ x: nx, y: ny }, pose.angle);
  return { x: pose.x + p.x, y: pose.y + p.y, nx: n.x, ny: n.y };
}
export function componenteDe(molecule, id) {
  const atomOwner = new Map(molecule.atoms.map((a) => [a.id, a.fragmentId]));
  const adjacency = new Map(molecule.fragments.map((f) => [f.id, []]));
  for (const b of molecule.bonds.filter((b) => !b.internal)) {
    const a = atomOwner.get(b.a); const c = atomOwner.get(b.b);
    adjacency.get(a).push(c); adjacency.get(c).push(a);
  }
  const seen = new Set(); const pending = [id];
  while (pending.length) { const a = pending.pop(); if (!seen.has(a)) { seen.add(a); pending.push(...(adjacency.get(a) ?? [])); } }
  return [...seen];
}
export function alinharPortas(molecule, poses, portA, portB) {
  const fa = molecule.fragments.find((f) => f.ports.some((p) => p.id === portA));
  const fb = molecule.fragments.find((f) => f.ports.some((p) => p.id === portB));
  const a = portaNaCena(fa, fa.ports.findIndex((p) => p.id === portA), poses[fa.id]);
  const b = portaNaCena(fb, fb.ports.findIndex((p) => p.id === portB), poses[fb.id]);
  const delta = Math.round((Math.atan2(b.ny, b.nx) * 180 / Math.PI + 180 - Math.atan2(a.ny, a.nx) * 180 / Math.PI) / 90) * 90;
  const result = { ...poses }; const moving = componenteDe(molecule, fa.id);
  for (const id of moving) {
    const relative = girar({ x: poses[id].x - a.x, y: poses[id].y - a.y }, delta);
    result[id] = { x: b.x + relative.x, y: b.y + relative.y, angle: ((poses[id].angle + delta) % 360 + 360) % 360 };
  }
  return { poses: result, moving };
}
function bounds(pose) {
  const swapped = Math.round(pose.angle / 90) % 2 !== 0;
  return { x: pose.x, y: pose.y, w: swapped ? 80 : 120, h: swapped ? 120 : 80 };
}
export function foraDaCena(poses, ids = Object.keys(poses)) {
  return ids.some((id) => {
    const b = bounds(poses[id]);
    return b.x - b.w / 2 < 5 || b.y - b.h / 2 < 5 || b.x + b.w / 2 > CENA.width - 5 || b.y + b.h / 2 > CENA.height - 5;
  });
}
export function temColisao(poses, moving) {
  const others = Object.keys(poses).filter((id) => !moving.includes(id));
  return moving.some((id) => others.some((other) => {
    const a = bounds(poses[id]); const b = bounds(poses[other]);
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 1;
  }));
}
export function calcularEncaixe(molecule, poses, movingIds, scale = 1) {
  const options = []; const denied = [];
  for (const a of molecule.fragments.filter((f) => movingIds.includes(f.id))) {
    for (const pa of a.ports) {
      if (pa.occupiedBondId) continue;
      for (const b of molecule.fragments.filter((f) => !movingIds.includes(f.id))) {
        for (const pb of b.ports) {
          if (pb.occupiedBondId) continue;
          // Mede quanto falta deslocar o corpo até seu encaixe já orientado.
          // Comparar portas ANTES do giro exigia sobrepor duas peças CH₃.
          const alignment = alinharPortas(molecule, poses, pa.id, pb.id);
          const ideal = alignment.poses[a.id];
          const distance = Math.hypot(poses[a.id].x - ideal.x, poses[a.id].y - ideal.y) * scale;
          if (distance > ALCANCE_ENCAIXE_CSS) continue;
          const validation = validarLocal({ molecule, portA: pa.id, portB: pb.id });
          if (!validation.valido) { denied.push({ distance, erro: validation }); continue; }
          if (temColisao(alignment.poses, alignment.moving) || foraDaCena(alignment.poses, alignment.moving)) {
            denied.push({ distance, erro: { valido: false, codigo: 'LAYOUT_COLLISION', mensagem: 'Não há espaço para encaixar aqui.' } }); continue;
          }
          const difference = Math.abs(ideal.angle - poses[a.id].angle) % 360;
          options.push({ portA: pa.id, portB: pb.id, atomA: pa.atomId, fragmentA: a.id,
            distance, rotationCost: Math.min(difference, 360 - difference), ...alignment });
        }
      }
    }
  }
  options.sort((a, b) => a.distance - b.distance || a.rotationCost - b.rotationCost);
  // Portas equivalentes da mesma peça solta não exigem uma escolha artificial.
  // Exemplo: inverter um CH₂ em 180° produz o mesmo encaixe do corpo.
  const distinct = []; const keys = new Set();
  for (const option of options) {
    const pose = option.poses[option.fragmentA];
    const key = movingIds.length === 1
      ? `${option.atomA}|${option.portB}|${pose.x.toFixed(4)},${pose.y.toFixed(4)}`
      : `${option.portA}|${option.portB}`;
    if (!keys.has(key)) { keys.add(key); distinct.push(option); }
  }
  denied.sort((a, b) => a.distance - b.distance);
  if (distinct.length > 1 && distinct[1].distance - distinct[0].distance < 4) return { ambiguo: true };
  return distinct[0] ?? (denied[0] ? { erro: denied[0].erro } : null);
}
