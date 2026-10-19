import { obterTemplate } from '../data/blocos.js';
import { SCHEMA_VERSION, VALENCIAS } from '../domain/modelo.js';
import { falha, sucesso } from './resultados.js';
import { indexarGrafo, possuiCiclo } from './grafo.js';

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const idValido = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Confere o fragmento por isomorfismo do pequeno grafo interno.
 * Assim, reordenar arrays ou renomear IDs não torna um snapshot inválido,
 * mas remover H, mudar uma carbonila ou transferir portas para O torna.
 */
function correspondeAoTemplate(fragment, atoms, bonds, template) {
  if (atoms.length !== template.atoms.length || bonds.length !== template.internalBonds.length
      || fragment.ports.length !== template.ports.length) return false;
  const signature = (a, edges, ports) => JSON.stringify([
    a.element, a.formalCharge,
    edges.filter((e) => e.a === a.id || e.b === a.id).map((e) => e.order).sort(),
    ports.filter((p) => p.atomId === a.id).length,
  ]);
  const pairOrder = (edges, a, b) => edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))?.order ?? 0;
  const mapping = new Map();
  const used = new Set();
  function visit(index) {
    if (index === template.atoms.length) return true;
    const source = template.atoms[index];
    for (const target of atoms) {
      if (used.has(target.id) || signature(source, template.internalBonds, template.ports)
          !== signature(target, bonds, fragment.ports)) continue;
      if ([...mapping].some(([a, b]) => pairOrder(template.internalBonds, source.id, a)
          !== pairOrder(bonds, target.id, b))) continue;
      mapping.set(source.id, target.id); used.add(target.id);
      if (visit(index + 1)) return true;
      mapping.delete(source.id); used.delete(target.id);
    }
    return false;
  }
  return visit(0);
}

/** As portas de cada template atual compartilham a restrição de parceiros. */
export function aceitaParceiro(templateId, element) {
  return obterTemplate(templateId).ports.every((p) => p.allowedPartnerElements.includes(element));
}

/**
 * Verifica a integridade também em montagens parciais. Não exige completude.
 * V1 e V2 recebem snapshots externos, portanto nunca confiam só nas valências.
 * O primeiro erro define uma prioridade determinística de diagnóstico.
 */
export function inspecionarGrafo(molecule) {
  if (!objeto(molecule) || molecule.schemaVersion !== SCHEMA_VERSION
      || !Number.isSafeInteger(molecule.revision) || molecule.revision < 0
      || !['atoms', 'bonds', 'fragments'].every((key) => Array.isArray(molecule[key]))) {
    return falha('INVALID_MOLECULE', 'O formato ou a versão da molécula é inválido.');
  }
  const ids = new Set();
  const reserve = (id) => {
    if (!idValido(id)) return falha('INVALID_ID', 'Todo registro deve possuir um ID não vazio.');
    if (ids.has(id)) return falha('DUPLICATE_ID', 'Há IDs repetidos na molécula.', { id });
    ids.add(id); return null;
  };
  for (const record of [...molecule.atoms, ...molecule.bonds, ...molecule.fragments]) {
    if (!objeto(record)) return falha('INVALID_RECORD', 'Há um registro inválido no grafo.');
    const error = reserve(record.id); if (error) return error;
  }
  const atoms = new Map(molecule.atoms.map((a) => [a.id, a]));
  const fragments = new Map(molecule.fragments.map((f) => [f.id, f]));
  const bonds = new Map(molecule.bonds.map((b) => [b.id, b]));
  for (const atom of atoms.values()) {
    if (!Object.hasOwn(VALENCIAS, atom.element)) return falha('UNSUPPORTED_ELEMENT', 'Este elemento não está disponível no modo iniciante.', { atomId: atom.id });
    if (atom.formalCharge !== 0) return falha('UNSUPPORTED_CHARGE', 'O modo iniciante aceita somente átomos neutros.', { atomId: atom.id });
    if (!fragments.has(atom.fragmentId)) return falha('INVALID_FRAGMENT_REFERENCE', 'Um átomo não pertence a um fragmento existente.', { atomId: atom.id });
  }
  for (const fragment of fragments.values()) {
    if (!obterTemplate(fragment.templateId)) return falha('UNKNOWN_TEMPLATE', 'O template da peça não está disponível.', { fragmentId: fragment.id });
    if (!Array.isArray(fragment.atomIds) || !Array.isArray(fragment.ports)
        || new Set(fragment.atomIds).size !== fragment.atomIds.length
        || fragment.atomIds.some((id) => atoms.get(id)?.fragmentId !== fragment.id)
        || molecule.atoms.filter((a) => a.fragmentId === fragment.id).length !== fragment.atomIds.length) {
      return falha('INVALID_FRAGMENT_ATOMS', 'A lista de átomos da peça é inconsistente.', { fragmentId: fragment.id });
    }
    for (const port of fragment.ports) {
      if (!objeto(port)) return falha('INVALID_PORT', 'Há uma porta inválida na peça.');
      const error = reserve(port.id); if (error) return error;
      if (!fragment.atomIds.includes(port.atomId) || !Array.isArray(port.allowedOrders)
          || port.allowedOrders.length !== 1 || port.allowedOrders[0] !== 1
          || !(port.occupiedBondId === null || idValido(port.occupiedBondId))) {
        return falha('INVALID_PORT', 'A porta deve pertencer à peça e aceitar apenas ligação simples.', { portId: port.id });
      }
    }
  }
  const pairs = new Set();
  for (const bond of bonds.values()) {
    if (!atoms.has(bond.a) || !atoms.has(bond.b)) return falha('INVALID_BOND_REFERENCE', 'Uma ligação aponta para um átomo inexistente.', { bondId: bond.id });
    if (bond.a === bond.b) return falha('SELF_BOND', 'Um átomo não pode ser ligado a si mesmo.', { bondId: bond.id });
    if (![1, 2].includes(bond.order) || typeof bond.internal !== 'boolean') return falha('INVALID_BOND', 'A ordem ou o tipo da ligação é inválido.', { bondId: bond.id });
    const pair = JSON.stringify([bond.a, bond.b].sort());
    if (pairs.has(pair)) return falha('DUPLICATE_BOND', 'O mesmo par de átomos possui ligações duplicadas.', { bondId: bond.id });
    pairs.add(pair);
    const sameFragment = atoms.get(bond.a).fragmentId === atoms.get(bond.b).fragmentId;
    if (bond.internal !== sameFragment) return falha('INVALID_BOND_OWNERSHIP', 'Ligações internas devem permanecer dentro de sua peça.', { bondId: bond.id });
    if (!bond.internal && bond.order !== 1) return falha('EXTERNAL_BOND_ORDER_NOT_SUPPORTED', 'As ligações externas devem ser simples.', { bondId: bond.id });
  }
  const graph = indexarGrafo(molecule);
  const occupied = new Map();
  for (const { port, fragment } of graph.ports.values()) {
    if (port.occupiedBondId === null) continue;
    const bond = bonds.get(port.occupiedBondId);
    if (!bond || bond.internal || (bond.a !== port.atomId && bond.b !== port.atomId)) {
      return falha('INVALID_PORT_OCCUPANCY', 'A ocupação da porta não corresponde a uma ligação externa.', { portId: port.id });
    }
    const otherId = bond.a === port.atomId ? bond.b : bond.a;
    if (!aceitaParceiro(fragment.templateId, atoms.get(otherId).element)) {
      return falha('UNSUPPORTED_PARTNER', 'Esta combinação não está disponível no modo iniciante.', { portId: port.id });
    }
    const list = occupied.get(bond.id) ?? []; list.push(port); occupied.set(bond.id, list);
  }
  for (const bond of bonds.values()) {
    if (bond.internal) continue;
    const ports = occupied.get(bond.id) ?? [];
    if (ports.length !== 2 || new Set(ports.map((p) => p.atomId)).size !== 2) {
      return falha('INVALID_PORT_OCCUPANCY', 'Cada ligação externa deve ocupar uma porta em cada extremidade.', { bondId: bond.id });
    }
  }
  for (const atom of atoms.values()) {
    if (graph.valences.get(atom.id) > VALENCIAS[atom.element]) {
      return falha('VALENCE_EXCEEDED', 'Este átomo ultrapassou sua valência permitida.', { atomId: atom.id });
    }
  }
  for (const fragment of fragments.values()) {
    const internal = molecule.bonds.filter((b) => b.internal && atoms.get(b.a).fragmentId === fragment.id);
    const ownAtoms = fragment.atomIds.map((id) => atoms.get(id));
    if (!correspondeAoTemplate(fragment, ownAtoms, internal, obterTemplate(fragment.templateId))) {
      return falha('TEMPLATE_MISMATCH', 'Os átomos, H fixos, portas ou ligações internas da peça foram alterados.', { fragmentId: fragment.id });
    }
  }
  if (possuiCiclo(molecule, graph.adjacency)) return falha('CYCLE_NOT_SUPPORTED', 'Ciclos não estão disponíveis no modo iniciante.');
  return sucesso('GRAPH_VALID', 'O grafo é consistente, mesmo que a montagem ainda esteja incompleta.');
}
