/** Cada unidade visual corresponde a uma unidade da ordem da ligação. */
export function ConectoresPuzzle({ x = 0, y = 0, angle = 0, ordem = 1, ocupado = false, pequeno = false }) {
  const spacing = pequeno ? 10 : 14;
  return <g transform={`translate(${x} ${y}) rotate(${angle})`} className={`puzzle-connectors${ocupado ? ' occupied' : ''}`} data-connector-order={ordem} aria-hidden="true">
    {Array.from({ length: ordem }, (_, i) => <path key={i} data-connector-unit="true" transform={`translate(0 ${(i - (ordem - 1) / 2) * spacing})`}
      d={pequeno ? 'M-7 -4 H0 C0 -8 7 -8 7 -4 V4 C7 8 0 8 0 4 H-7 Z' : 'M-10 -5 H0 C0 -11 10 -11 10 -5 V5 C10 11 0 11 0 5 H-10 Z'} />)}
  </g>;
}

export function CorpoAtomoPuzzle({ element }) {
  const count = { C: 4, O: 2, N: 3, H: 1 }[element];
  const top = count >= 3 ? 'H-7 C-7 -17 7 -17 7 -27' : '';
  const bottom = count === 4 ? 'H7 C7 37 -7 37 -7 27' : '';
  const left = count >= 2 ? 'V7 C-17 7 -17 -7 -27 -7' : '';
  return <path className="atom-puzzle-body" d={`M-17 -27 ${top} H17 Q27 -27 27 -17 V-7 C37 -7 37 7 27 7 V17 Q27 27 17 27 ${bottom} H-17 Q-27 27 -27 17 ${left} V-17 Q-27 -27 -17 -27 Z`} />;
}

/** O encaixe é uma metáfora visual; a capacidade real vem do grafo. */
export function encaixesAtomo(molecule, atom, poses, ordemSelecionada = 1) {
  const bonds = molecule.bonds.filter((b) => b.a === atom.id || b.b === atom.id);
  const origin = poses[atom.id];
  const groups = bonds.map((b) => {
    const other = poses[b.a === atom.id ? b.b : b.a];
    return { angle: Math.atan2(other.y - origin.y, other.x - origin.x), ordem: b.order, ocupado: true };
  });
  let remaining = { C: 4, O: 2, N: 3, H: 1 }[atom.element] - bonds.reduce((s, b) => s + b.order, 0);
  while (remaining > 0) {
    let angle = 0; let score = -1;
    for (let i = 0; i < 12; i++) {
      const candidate = i * Math.PI / 6;
      const distance = groups.length ? Math.min(...groups.map((g) => Math.acos(Math.cos(candidate - g.angle)))) : Math.PI;
      if (distance > score) { angle = candidate; score = distance; }
    }
    const ordem = Math.min(remaining, ordemSelecionada);
    groups.push({ angle, ordem, ocupado: false }); remaining -= ordem;
  }
  return groups.map((g) => ({ ...g, x: Math.cos(g.angle) * 34, y: Math.sin(g.angle) * 34, angle: g.angle * 180 / Math.PI }));
}
