/** Utilitários puros. O chamador deve verificar a integridade antes de usá-los. */
export function indexarGrafo(molecule) {
  const atoms = new Map(molecule.atoms.map((a) => [a.id, a]));
  const fragments = new Map(molecule.fragments.map((f) => [f.id, f]));
  const bonds = new Map(molecule.bonds.map((b) => [b.id, b]));
  const ports = new Map();
  const adjacency = new Map(molecule.atoms.map((a) => [a.id, []]));
  const valences = new Map(molecule.atoms.map((a) => [a.id, 0]));
  for (const fragment of molecule.fragments) {
    for (const port of fragment.ports) ports.set(port.id, { port, fragment });
  }
  for (const bond of molecule.bonds) {
    adjacency.get(bond.a).push({ atomId: bond.b, bond });
    adjacency.get(bond.b).push({ atomId: bond.a, bond });
    valences.set(bond.a, valences.get(bond.a) + bond.order);
    valences.set(bond.b, valences.get(bond.b) + bond.order);
  }
  return { atoms, fragments, bonds, ports, adjacency, valences };
}

export function alcancaveis(adjacency, start) {
  const seen = new Set();
  const pending = [start];
  while (pending.length) {
    const id = pending.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const neighbor of adjacency.get(id) ?? []) pending.push(neighbor.atomId);
  }
  return seen;
}

export function contarComponentes(adjacency) {
  const remaining = new Set(adjacency.keys());
  let count = 0;
  while (remaining.size) {
    count += 1;
    for (const id of alcancaveis(adjacency, remaining.values().next().value)) remaining.delete(id);
  }
  return count;
}

/** Em um grafo sem arestas paralelas, uma floresta tem E = V - componentes. */
export function possuiCiclo(molecule, adjacency) {
  return molecule.bonds.length > molecule.atoms.length - contarComponentes(adjacency);
}
