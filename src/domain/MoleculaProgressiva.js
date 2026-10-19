import { BLOCOS } from '../data/blocos.js';
import { falha, sucesso } from '../game/resultados.js';
import { indexarGrafo, possuiCiclo } from '../game/grafo.js';

// Políticas independentes: ampliar os níveis não relaxa as regras do iniciante.
const VALENCIAS = Object.freeze({ C: 4, H: 1, O: 2, N: 3 });
const carbono = (id, hidrogenios, ordens) => ({
  id, nome: `${hidrogenios ? `CH${hidrogenios === 1 ? '' : hidrogenios}` : 'C'}`,
  atoms: [{ id: 'c', element: 'C' }, ...Array.from({ length: hidrogenios }, (_, i) => ({ id: `h${i}`, element: 'H' }))],
  internalBonds: Array.from({ length: hidrogenios }, (_, i) => ({ id: `h${i}`, a: 'c', b: `h${i}`, order: 1 })),
  ports: ordens.map((order, i) => ({ id: `p${i}`, atomId: 'c', allowedOrders: [order] })),
});
const extras = {
  ch2_dupla: carbono('ch2_dupla', 2, [2]),
  ch_dupla: carbono('ch_dupla', 1, [1, 2]),
  c_dupla: carbono('c_dupla', 0, [1, 1, 2]),
  ch_tripla: carbono('ch_tripla', 1, [3]),
  c_tripla: carbono('c_tripla', 0, [1, 3]),
};
// Os H são fixos nos fragmentos insaturados. Uma ligação dupla nunca apaga H.
function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar); Object.freeze(valor);
  }
  return valor;
}
export const BLOCOS_INTERMEDIARIOS = congelar({ ...BLOCOS, ...extras });

export class MoleculaProgressiva {
  #estado;
  /** Somente snapshots produzidos pelo agregado, usados pelo histórico da sessão. */
  static restaurar(snapshot) {
    const instance = new MoleculaProgressiva(snapshot.nivel);
    const copy = structuredClone(snapshot);
    if (copy.schemaVersion !== '2.0' || !Number.isInteger(copy.revision) || copy.revision < 0
      || !Array.isArray(copy.atoms) || !Array.isArray(copy.bonds) || !Array.isArray(copy.fragments)) throw new Error('Snapshot inválido.');
    const ids = [...copy.atoms, ...copy.bonds, ...copy.fragments, ...copy.fragments.flatMap((f) => f.ports)];
    if (ids.some((v) => !v || typeof v.id !== 'string') || new Set(ids.map((v) => v.id)).size !== ids.length) throw new Error('IDs inválidos.');
    if (copy.atoms.some((a) => !Object.hasOwn(VALENCIAS, a.element) || a.formalCharge !== 0)) throw new Error('Átomo inválido.');
    if (copy.nivel === 'avancado' && (copy.fragments.length || copy.atoms.some((a) => a.fragmentId !== null))) throw new Error('Fragmento inválido.');
    const atomIds = new Set(copy.atoms.map((a) => a.id)); const edges = new Set();
    for (const b of copy.bonds) {
      const key = [b.a, b.b].sort().join('|');
      if (!atomIds.has(b.a) || !atomIds.has(b.b) || b.a === b.b || ![1, 2, 3].includes(b.order) || edges.has(key) || typeof b.internal !== 'boolean') throw new Error('Ligação inválida.');
      if (copy.nivel === 'avancado' && b.internal) throw new Error('Ligação interna inválida.');
      edges.add(key);
    }
    if (copy.nivel === 'intermediario') {
      const owned = new Set(); const internalIds = new Set(); const ports = copy.fragments.flatMap((f) => f.ports);
      for (const f of copy.fragments) {
        const template = Object.hasOwn(BLOCOS_INTERMEDIARIOS, f.templateId) ? BLOCOS_INTERMEDIARIOS[f.templateId] : null;
        if (!template || !Array.isArray(f.atomIds) || f.atomIds.length !== template.atoms.length || f.ports.length !== template.ports.length) throw new Error('Template inválido.');
        for (const local of template.atoms) {
          const id = `${f.id}:atom:${local.id}`; const at = copy.atoms.find((a) => a.id === id);
          if (!at || at.element !== local.element || at.fragmentId !== f.id || !f.atomIds.includes(id) || owned.has(id)) throw new Error('Átomos internos alterados.');
          owned.add(id);
        }
        for (const local of template.internalBonds) {
          const id = `${f.id}:bond:${local.id}`; const b = copy.bonds.find((b) => b.id === id);
          if (!b || !b.internal || b.order !== local.order || b.a !== `${f.id}:atom:${local.a}` || b.b !== `${f.id}:atom:${local.b}`) throw new Error('Ligações internas alteradas.');
          internalIds.add(id);
        }
        for (const local of template.ports) {
          const p = f.ports.find((p) => p.id === `${f.id}:port:${local.id}`);
          const partners = local.allowedPartnerElements || ['C'];
          if (!p || p.atomId !== `${f.id}:atom:${local.atomId}` || JSON.stringify(p.allowedOrders) !== JSON.stringify(local.allowedOrders)
            || JSON.stringify(p.allowedPartnerElements) !== JSON.stringify(partners)
            || (p.occupiedBondId !== null && !copy.bonds.some((b) => b.id === p.occupiedBondId && !b.internal))) throw new Error('Porta inválida.');
        }
      }
      if (owned.size !== copy.atoms.length || copy.bonds.some((b) => b.internal && !internalIds.has(b.id))) throw new Error('Propriedade de fragmento inválida.');
      for (const b of copy.bonds.filter((b) => !b.internal)) {
        const ends = ports.filter((p) => p.occupiedBondId === b.id);
        if (ends.length !== 2 || !ends.some((p) => p.atomId === b.a) || !ends.some((p) => p.atomId === b.b)) throw new Error('Ocupação de portas inválida.');
        const a = copy.atoms.find((a) => a.id === b.a); const c = copy.atoms.find((a) => a.id === b.b);
        if (a.fragmentId === c.fragmentId || ends.some((p) => !p.allowedOrders.includes(b.order)
          || !p.allowedPartnerElements.includes((p.atomId === a.id ? c : a).element))) throw new Error('Conexão incompatível.');
      }
      if (possuiCiclo(copy, indexarGrafo(copy).adjacency)) throw new Error('Anéis não são permitidos no intermediário.');
    }
    instance.#estado = copy;
    if (copy.atoms.some((a) => instance.#valencia(a.id) > VALENCIAS[a.element])) throw new Error('Valência inválida.');
    return instance;
  }
  constructor(nivel = 'intermediario') {
    if (!['intermediario', 'avancado'].includes(nivel)) throw new Error('Nível desconhecido.');
    this.#estado = { schemaVersion: '2.0', nivel, revision: 0, atoms: [], bonds: [], fragments: [] };
  }
  obterMolecula() { return structuredClone(this.#estado); }
  adicionarFragmento(templateId) {
    if (this.#estado.nivel !== 'intermediario') return falha('FRAGMENTS_NOT_SUPPORTED', 'Neste nível, use átomos individuais.');
    const template = Object.hasOwn(BLOCOS_INTERMEDIARIOS, templateId) ? BLOCOS_INTERMEDIARIOS[templateId] : null;
    if (!template) return falha('UNKNOWN_TEMPLATE', 'Peça desconhecida.');
    const id = `f-${crypto.randomUUID()}`;
    const atomId = (local) => `${id}:atom:${local}`;
    const fragmento = { id, templateId, atomIds: template.atoms.map((a) => atomId(a.id)),
      ports: template.ports.map((p) => ({ id: `${id}:port:${p.id}`, atomId: atomId(p.atomId), allowedOrders: [...p.allowedOrders], occupiedBondId: null,
        allowedPartnerElements: [...(p.allowedPartnerElements || ['C'])] })) };
    this.#estado.atoms.push(...template.atoms.map((a) => ({ id: atomId(a.id), element: a.element, formalCharge: 0, fragmentId: id })));
    this.#estado.bonds.push(...template.internalBonds.map((b) => ({ id: `${id}:bond:${b.id}`, a: atomId(b.a), b: atomId(b.b), order: b.order, internal: true })));
    this.#estado.fragments.push(fragmento);
    this.#estado.revision++;
    return { ...sucesso('FRAGMENT_ADDED', 'Peça adicionada.'), fragmento: structuredClone(fragmento) };
  }
  adicionarAtomo(element) {
    if (this.#estado.nivel !== 'avancado') return falha('ATOMS_NOT_SUPPORTED', 'Neste nível, use fragmentos.');
    if (!Object.hasOwn(VALENCIAS, element)) return falha('UNSUPPORTED_ELEMENT', 'Escolha C, H, O ou N.');
    const atomo = { id: `a-${crypto.randomUUID()}`, element, formalCharge: 0, fragmentId: null };
    this.#estado.atoms.push(atomo); this.#estado.revision++;
    return { ...sucesso('ATOM_ADDED', 'Átomo adicionado.'), atomo: { ...atomo } };
  }
  #alcanca(a, b) {
    const visitados = new Set([a]); const fila = [a];
    for (const atual of fila) for (const bond of this.#estado.bonds) {
      const vizinho = bond.a === atual ? bond.b : bond.b === atual ? bond.a : null;
      if (vizinho && !visitados.has(vizinho)) { visitados.add(vizinho); fila.push(vizinho); }
    }
    return visitados.has(b);
  }
  #valencia(id) { return this.#estado.bonds.reduce((s, b) => s + (b.a === id || b.b === id ? b.order : 0), 0); }
  #conectar(a, b, order, portas = []) {
    if (![1, 2, 3].includes(order)) return falha('INVALID_BOND_ORDER', 'Escolha ligação simples, dupla ou tripla.');
    const atoms = [a, b].map((id) => this.#estado.atoms.find((at) => at.id === id));
    if (atoms.some((at) => !at)) return falha('ATOM_NOT_FOUND', 'Átomo inexistente.');
    if (a === b) return falha('SELF_BOND', 'Um átomo não pode ligar-se a si mesmo.');
    if (this.#estado.bonds.some((bond) => [bond.a, bond.b].includes(a) && [bond.a, bond.b].includes(b))) return falha('DUPLICATE_BOND', 'Estes átomos já estão ligados.');
    if (atoms.some((at) => this.#valencia(at.id) + order > VALENCIAS[at.element])) return falha('VALENCE_EXCEEDED', 'A ligação ultrapassa a valência disponível.');
    if (this.#estado.nivel === 'intermediario' && this.#alcanca(a, b)) return falha('CYCLE_NOT_SUPPORTED', 'Anéis estão disponíveis no modo avançado.');
    const ligacao = { id: `b-${crypto.randomUUID()}`, a, b, order, internal: false };
    this.#estado.bonds.push(ligacao); portas.forEach((p) => { p.occupiedBondId = ligacao.id; });
    this.#estado.revision++;
    return { ...sucesso('BOND_ADDED', 'Ligação criada.'), ligacao: { ...ligacao } };
  }
  conectarAtomos(a, b, order = 1) {
    if (this.#estado.nivel !== 'avancado') return falha('PORTS_REQUIRED', 'Conecte as portas das peças.');
    return this.#conectar(a, b, order);
  }
  conectarPortas(a, b, order = 1) {
    const ports = this.#estado.fragments.flatMap((f) => f.ports);
    const pa = ports.find((p) => p.id === a); const pb = ports.find((p) => p.id === b);
    if (!pa || !pb) return falha('PORT_NOT_FOUND', 'Porta inexistente.');
    if (pa.occupiedBondId || pb.occupiedBondId) return falha('PORT_OCCUPIED', 'Uma das portas está ocupada.');
    if (!pa.allowedOrders.includes(order) || !pb.allowedOrders.includes(order)) return falha('INCOMPATIBLE_BOND_ORDER', 'As duas portas precisam aceitar a mesma ordem de ligação.');
    const atom = (id) => this.#estado.atoms.find((at) => at.id === id);
    if (!pa.allowedPartnerElements.includes(atom(pb.atomId).element) || !pb.allowedPartnerElements.includes(atom(pa.atomId).element)) return falha('UNSUPPORTED_PARTNER', 'Estas peças não podem ser conectadas.');
    return this.#conectar(pa.atomId, pb.atomId, order, [pa, pb]);
  }
  desconectar(id) {
    const bond = this.#estado.bonds.find((b) => b.id === id);
    if (!bond) return falha('BOND_NOT_FOUND', 'Ligação inexistente.');
    if (bond.internal) return falha('INTERNAL_BOND_IMMUTABLE', 'As ligações internas são fixas.');
    this.#estado.bonds = this.#estado.bonds.filter((b) => b.id !== id);
    this.#estado.fragments.flatMap((f) => f.ports).forEach((p) => { if (p.occupiedBondId === id) p.occupiedBondId = null; });
    this.#estado.revision++;
    return sucesso('BOND_DISCONNECTED', 'Ligação removida.');
  }
  remover(id) {
    const fragment = this.#estado.fragments.find((f) => f.id === id);
    const ids = new Set(fragment ? fragment.atomIds : this.#estado.atoms.filter((a) => a.id === id && a.fragmentId === null).map((a) => a.id));
    if (!ids.size) return falha('SELECTION_NOT_FOUND', 'Selecione uma peça ou átomo.');
    const removidas = new Set(this.#estado.bonds.filter((b) => ids.has(b.a) || ids.has(b.b)).map((b) => b.id));
    this.#estado.atoms = this.#estado.atoms.filter((a) => !ids.has(a.id));
    this.#estado.bonds = this.#estado.bonds.filter((b) => !removidas.has(b.id));
    this.#estado.fragments = this.#estado.fragments.filter((f) => f.id !== id);
    this.#estado.fragments.flatMap((f) => f.ports).forEach((p) => { if (removidas.has(p.occupiedBondId)) p.occupiedBondId = null; });
    this.#estado.revision++;
    return sucesso('SELECTION_REMOVED', 'Item devolvido à paleta.');
  }
  validarEstrutura() {
    const { atoms, fragments } = this.#estado;
    if (!atoms.length) return falha('EMPTY_MOLECULE', 'Adicione átomos ou peças.');
    if (atoms.some((a) => !this.#alcanca(atoms[0].id, a.id))) return falha('DISCONNECTED_COMPONENTS', 'Conecte todos os componentes.');
    if (fragments.some((f) => f.ports.some((p) => !p.occupiedBondId))) return falha('OPEN_PORTS', 'Ainda existem portas livres.');
    if (atoms.some((a) => this.#valencia(a.id) !== VALENCIAS[a.element])) return falha('INCOMPLETE_VALENCE', 'Complete as valências, incluindo os H explícitos.');
    return { ...sucesso('STRUCTURE_COMPLETE', 'Estrutura completa.'), completa: true };
  }
}
