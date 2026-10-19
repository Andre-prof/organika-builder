import { indexarGrafo, possuiCiclo } from './grafo.js';

/** Isomorfismo exato, incluindo H e ordens. Não usa a assinatura de árvores. */
export function estruturasEquivalentes(a, b) {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length) return false;
  const ga = indexarGrafo(a); const gb = indexarGrafo(b);
  const assinatura = (g, at) => `${at.element}:${g.adjacency.get(at.id).map((n) => `${n.bond.order}${g.atoms.get(n.atomId).element}`).sort().join(',')}`;
  const sa = new Map(a.atoms.map((at) => [at.id, assinatura(ga, at)]));
  const sb = new Map(b.atoms.map((at) => [at.id, assinatura(gb, at)]));
  if ([...sa.values()].sort().join('|') !== [...sb.values()].sort().join('|')) return false;
  const candidates = new Map(a.atoms.map((at) => [at.id, b.atoms.filter((bt) => sa.get(at.id) === sb.get(bt.id)).map((bt) => bt.id)]));
  const map = new Map(); const used = new Set();
  const order = (g, u, v) => g.adjacency.get(u).find((n) => n.atomId === v)?.bond.order || 0;
  function buscar() {
    if (map.size === a.atoms.length) return true;
    const remaining = a.atoms.filter((at) => !map.has(at.id));
    remaining.sort((u, v) => {
      const linked = (id) => ga.adjacency.get(id).filter((n) => map.has(n.atomId)).length;
      return linked(v.id) - linked(u.id) || candidates.get(u.id).length - candidates.get(v.id).length;
    });
    const id = remaining[0].id;
    for (const target of candidates.get(id)) {
      if (used.has(target) || [...map].some(([u, v]) => order(ga, id, u) !== order(gb, target, v))) continue;
      map.set(id, target); used.add(target);
      if (buscar()) return true;
      map.delete(id); used.delete(target);
    }
    return false;
  }
  return buscar();
}

/** Classificação por vizinhança atômica; O do ácido/éster não vira álcool/éter. */
export function descreverEstrutura(molecule) {
  const g = indexarGrafo(molecule); const funcoes = new Set();
  const neighbors = (id, element, order) => g.adjacency.get(id).filter((n) => (!element || g.atoms.get(n.atomId).element === element) && (!order || n.bond.order === order));
  const carbonilicos = new Set(molecule.atoms.filter((a) => a.element === 'C' && neighbors(a.id, 'O', 2).length).map((a) => a.id));
  for (const id of carbonilicos) {
    const os = neighbors(id, 'O', 1);
    if (neighbors(id, 'N', 1).length) funcoes.add('Amida');
    else if (os.some((n) => neighbors(n.atomId, 'H', 1).length)) funcoes.add('Ácido carboxílico');
    else if (os.some((n) => neighbors(n.atomId, 'C', 1).length === 2)) funcoes.add('Éster');
    else if (neighbors(id, 'H', 1).length) funcoes.add('Aldeído');
    else if (neighbors(id, 'C', 1).length === 2) funcoes.add('Cetona');
  }
  for (const at of molecule.atoms) {
    if (at.element === 'O' && !neighbors(at.id, 'C').some((n) => carbonilicos.has(n.atomId))) {
      if (neighbors(at.id, 'C', 1).length && neighbors(at.id, 'H', 1).length) funcoes.add('Álcool');
      if (neighbors(at.id, 'C', 1).length === 2) funcoes.add('Éter');
    }
    if (at.element === 'N') {
      if (neighbors(at.id, 'C', 3).length) funcoes.add('Nitrila');
      else if (neighbors(at.id, 'C', 1).length && !neighbors(at.id, 'C', 1).some((n) => carbonilicos.has(n.atomId))) funcoes.add('Amina');
    }
  }
  const cc = molecule.bonds.filter((b) => g.atoms.get(b.a).element === 'C' && g.atoms.get(b.b).element === 'C');
  if (cc.some((b) => b.order === 2)) funcoes.add('Insaturação C=C');
  if (cc.some((b) => b.order === 3)) funcoes.add('Insaturação C≡C');
  const counts = molecule.atoms.reduce((acc, at) => ({ ...acc, [at.element]: (acc[at.element] || 0) + 1 }), {});
  const subs = (n) => n === 1 ? '' : String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]);
  return { funcoes: [...funcoes], ciclica: possuiCiclo(molecule, g.adjacency),
    formula: ['C', 'H', 'N', 'O'].filter((e) => counts[e]).map((e) => e + subs(counts[e])).join('') };
}
