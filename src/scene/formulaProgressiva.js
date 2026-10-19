import { MoleculaProgressiva } from '../domain/MoleculaProgressiva.js';
import { criarLayoutFormula } from './formulaPlana.js';
import { indexarGrafo, possuiCiclo } from '../game/grafo.js';
import { descreverEstrutura } from '../game/progressao.js';

export function criarLayoutProgressivo(molecule) {
  const validation = MoleculaProgressiva.restaurar(molecule).validarEstrutura();
  if (!validation.completa) throw new Error(validation.mensagem);
  const graph = indexarGrafo(molecule); const info = descreverEstrutura(molecule);
  let atoms;
  if (!possuiCiclo(molecule, graph.adjacency)) {
    try { atoms = criarLayoutFormula(molecule, () => validation).atoms; } catch { /* O arranjo geral abaixo trata outras topologias. */ }
  }
  if (!atoms) {
    const heavy = molecule.atoms.filter((a) => a.element !== 'H');
    const hn = (id) => graph.adjacency.get(id).filter((n) => graph.atoms.get(n.atomId).element !== 'H');
    // Um ciclo simples é percorrido em ordem topológica, não em ordem de criação.
    let ordered = []; const visited = new Set(); let current = heavy[0]?.id;
    if (heavy.every((a) => hn(a.id).length === 2)) {
      while (current && !visited.has(current)) {
        ordered.push(current); visited.add(current); current = hn(current).find((n) => !visited.has(n.atomId))?.atomId;
      }
    }
    const simpleRing = ordered.length === heavy.length;
    if (!simpleRing) ordered = heavy.map((a) => a.id);
    const radius = Math.max(125, heavy.length * 185 / (2 * Math.PI));
    const positions = new Map(ordered.map((id, i) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / ordered.length;
      return [id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }];
    }));
    if (!simpleRing) {
      // Relaxação limitada: nenhum percurso recursivo pode se perder em um anel.
      for (let step = 0; step < 240; step++) {
        const forces = new Map(ordered.map((id) => [id, { x: 0, y: 0 }]));
        for (let i = 0; i < ordered.length; i++) for (let j = i + 1; j < ordered.length; j++) {
          const a = positions.get(ordered[i]); const b = positions.get(ordered[j]);
          const dx = a.x - b.x; const dy = a.y - b.y; const d = Math.max(1, Math.hypot(dx, dy)); const force = 18000 / (d * d);
          forces.get(ordered[i]).x += dx / d * force; forces.get(ordered[i]).y += dy / d * force;
          forces.get(ordered[j]).x -= dx / d * force; forces.get(ordered[j]).y -= dy / d * force;
        }
        for (const b of molecule.bonds.filter((b) => positions.has(b.a) && positions.has(b.b))) {
          const a = positions.get(b.a); const c = positions.get(b.b); const dx = c.x - a.x; const dy = c.y - a.y; const d = Math.max(1, Math.hypot(dx, dy)); const f = (d - 180) * .035;
          forces.get(b.a).x += dx / d * f; forces.get(b.a).y += dy / d * f; forces.get(b.b).x -= dx / d * f; forces.get(b.b).y -= dy / d * f;
        }
        for (const id of ordered) { const p = positions.get(id); const f = forces.get(id); p.x += Math.max(-5, Math.min(5, f.x)); p.y += Math.max(-5, Math.min(5, f.y)); }
      }
    }
    for (const id of ordered) {
      const origin = positions.get(id); const hs = graph.adjacency.get(id).filter((n) => graph.atoms.get(n.atomId).element === 'H');
      const occupied = hn(id).map((n) => Math.atan2(positions.get(n.atomId).y - origin.y, positions.get(n.atomId).x - origin.x));
      for (const h of hs) {
        let best = 0; let score = -Infinity;
        for (let i = 0; i < 24; i++) {
          const angle = i * Math.PI / 12;
          const distance = occupied.length ? Math.min(...occupied.map((v) => Math.acos(Math.cos(angle - v)))) : Math.PI;
          if (distance > score) { score = distance; best = angle; }
        }
        occupied.push(best); positions.set(h.atomId, { x: origin.x + Math.cos(best) * 70, y: origin.y + Math.sin(best) * 70 });
      }
    }
    atoms = molecule.atoms.map((a) => ({ ...a, ...positions.get(a.id) }));
  }
  if (atoms.some((a) => !Number.isFinite(a.x) || !Number.isFinite(a.y))) throw new Error('Esta estrutura não pode ser organizada automaticamente. Volte à montagem para reposicioná-la.');
  const positions = new Map(atoms.map((a) => [a.id, a])); const xs = atoms.map((a) => a.x); const ys = atoms.map((a) => a.y);
  return { atoms, bonds: molecule.bonds.map((b) => ({ ...b, from: positions.get(b.a), to: positions.get(b.b) })),
    viewBox: { x: Math.min(...xs) - 48, y: Math.min(...ys) - 48, width: Math.max(...xs) - Math.min(...xs) + 96, height: Math.max(...ys) - Math.min(...ys) + 96 },
    formulaMolecular: info.formula, descricao: `${info.formula}. Todos os átomos e H estão explícitos. ${info.ciclica ? 'Estrutura com anel.' : 'Cadeia aberta.'}` };
}
