import { validarEstrutura } from '../game/ValidadorEstrutura.js';
import { indexarGrafo } from '../game/grafo.js';

const PASSO = 160;
const DISTANCIA_H = 64;
const DIRECOES = { direita: [1, 0], baixo: [0, 1], esquerda: [-1, 0], cima: [0, -1] };
const igual = (a, b) => a.x === b.x && a.y === b.y;
function direcao(a, b) {
  return b.x > a.x ? 'direita' : b.x < a.x ? 'esquerda' : b.y > a.y ? 'baixo' : 'cima';
}
const dentro = (v, a, b) => v >= Math.min(a, b) && v <= Math.max(a, b);

/** Segmentos ortogonais só podem se encontrar em um átomo comum. */
function conflita(a, b, c, d, permiteOrigem) {
  const h1 = a.y === b.y; const h2 = c.y === d.y;
  if (h1 === h2) {
    if (h1 ? a.y !== c.y : a.x !== c.x) return false;
    const low = Math.max(Math.min(h1 ? a.x : a.y, h1 ? b.x : b.y), Math.min(h1 ? c.x : c.y, h1 ? d.x : d.y));
    const high = Math.min(Math.max(h1 ? a.x : a.y, h1 ? b.x : b.y), Math.max(h1 ? c.x : c.y, h1 ? d.x : d.y));
    if (low > high) return false;
    const p = h1 ? { x: low, y: a.y } : { x: a.x, y: low };
    return !(low === high && permiteOrigem && igual(p, a));
  }
  const h = h1 ? [a, b] : [c, d]; const v = h1 ? [c, d] : [a, b];
  const p = { x: v[0].x, y: h[0].y };
  if (!dentro(p.x, h[0].x, h[1].x) || !dentro(p.y, v[0].y, v[1].y)) return false;
  return !(permiteOrigem && igual(p, a));
}

function maiorCaminhoCarbonico(molecule, graph) {
  let best = [];
  function walk(id, previous, path) {
    if (path.length > best.length) best = [...path];
    for (const n of graph.adjacency.get(id)) {
      if (n.atomId !== previous && graph.atoms.get(n.atomId).element === 'C') walk(n.atomId, id, [...path, n.atomId]);
    }
  }
  for (const a of molecule.atoms.filter((a) => a.element === 'C')) walk(a.id, null, [a.id]);
  return best;
}

/**
 * Produz somente coordenadas. Átomos, H e ordens de ligação vêm do grafo original.
 * A malha dos átomos pesados e o comprimento menor das ligações a H evitam
 * colisões nas cadeias e ramificações; a busca recusa cruzamentos de ligações.
 */
export function criarLayoutFormula(molecule, validar = validarEstrutura) {
  const validation = validar(molecule);
  if (!validation.completa) { const error = new Error(validation.mensagem); error.codigo = validation.codigo; throw error; }
  const graph = indexarGrafo(molecule);
  const heavy = molecule.atoms.filter((a) => a.element !== 'H');
  const backbone = maiorCaminhoCarbonico(molecule, graph);
  const positions = new Map(backbone.map((id, i) => [id, { x: i * PASSO, y: 0 }]));
  const edges = [];
  for (let i = 1; i < backbone.length; i++) edges.push([backbone[i - 1], backbone[i]]);
  const heavyNeighbors = (id) => graph.adjacency.get(id).filter((n) => graph.atoms.get(n.atomId).element !== 'H');
  const tasks = backbone.flatMap((id) => heavyNeighbors(id).filter((n) => !positions.has(n.atomId)).map((n) => [id, n.atomId]));
  let attempts = 0;
  function solve(queue) {
    if (!queue.length) return true;
    if (++attempts > 6000) return false;
    const [[parent, child], ...rest] = queue;
    if (positions.has(child)) return solve(rest);
    const origin = positions.get(parent);
    const atom = graph.atoms.get(child);
    const bond = graph.adjacency.get(parent).find((n) => n.atomId === child).bond;
    const occupied = new Set(heavyNeighbors(parent).filter((n) => positions.has(n.atomId)).map((n) => direcao(origin, positions.get(n.atomId))));
    const endpoint = backbone[0] === parent || backbone.at(-1) === parent;
    const preferred = atom.element === 'C' ? ['baixo', 'cima', 'direita', 'esquerda']
      : bond.order === 2 ? ['cima', 'baixo', 'direita', 'esquerda']
        : endpoint ? ['direita', 'esquerda', 'cima', 'baixo'] : ['cima', 'baixo', 'direita', 'esquerda'];
    for (const name of preferred.filter((name) => !occupied.has(name))) {
      const [dx, dy] = DIRECOES[name];
      for (const distance of [1, 2, 3, 4]) {
        const candidate = { x: origin.x + dx * distance * PASSO, y: origin.y + dy * distance * PASSO };
        if ([...positions.values()].some((p) => igual(p, candidate))) continue;
        if (edges.some(([a, b]) => conflita(origin, candidate, positions.get(a), positions.get(b), a === parent || b === parent))) continue;
        if ([...positions].some(([id, p]) => id !== parent && (dx === 0 ? p.x === origin.x && dentro(p.y, origin.y, candidate.y) : p.y === origin.y && dentro(p.x, origin.x, candidate.x)))) continue;
        positions.set(child, candidate); edges.push([parent, child]);
        const following = heavyNeighbors(child).filter((n) => n.atomId !== parent && !positions.has(n.atomId)).map((n) => [child, n.atomId]);
        if (solve([...following, ...rest])) return true;
        positions.delete(child); edges.pop();
      }
    }
    return false;
  }
  if (!backbone.length || !solve(tasks) || positions.size !== heavy.length) {
    const error = new Error('Não foi possível organizar esta fórmula sem cruzamentos. A montagem foi preservada.');
    error.codigo = 'LAYOUT_UNAVAILABLE'; throw error;
  }
  for (const atom of heavy) {
    const origin = positions.get(atom.id); const neighbors = heavyNeighbors(atom.id);
    const used = new Set(neighbors.map((n) => direcao(origin, positions.get(n.atomId))));
    let preferred = ['cima', 'baixo', 'esquerda', 'direita'];
    if (neighbors.length === 1) preferred = [direcao(positions.get(neighbors[0].atomId), origin), ...preferred];
    else if (backbone.at(-1) === atom.id) preferred = ['direita', ...preferred];
    else if (backbone[0] === atom.id) preferred = ['esquerda', ...preferred];
    for (const n of graph.adjacency.get(atom.id).filter((n) => graph.atoms.get(n.atomId).element === 'H')) {
      const name = preferred.find((name) => !used.has(name)); used.add(name);
      const [dx, dy] = DIRECOES[name];
      positions.set(n.atomId, { x: origin.x + dx * DISTANCIA_H, y: origin.y + dy * DISTANCIA_H });
    }
  }
  const atoms = molecule.atoms.map((a) => ({ ...a, ...positions.get(a.id) }));
  const xs = atoms.map((a) => a.x); const ys = atoms.map((a) => a.y);
  const counts = Object.fromEntries(['C', 'H', 'O'].map((e) => [e, atoms.filter((a) => a.element === e).length]));
  const subs = (n) => n === 1 ? '' : String(n).replace(/\d/g, (v) => '₀₁₂₃₄₅₆₇₈₉'[Number(v)]);
  return {
    atoms, bonds: molecule.bonds.map((b) => ({ ...b, from: positions.get(b.a), to: positions.get(b.b) })),
    viewBox: { x: Math.min(...xs) - 48, y: Math.min(...ys) - 48, width: Math.max(...xs) - Math.min(...xs) + 96, height: Math.max(...ys) - Math.min(...ys) + 96 },
    formulaMolecular: ['C', 'H', 'O'].filter((e) => counts[e] > 0).map((e) => e + subs(counts[e])).join(''),
    descricao: `${counts.C} átomos de carbono, ${counts.H} de hidrogênio e ${counts.O} de oxigênio. Todos os átomos e ligações estão explícitos.`,
  };
}
