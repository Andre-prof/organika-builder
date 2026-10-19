import { VALENCIAS } from '../domain/modelo.js';
import { aceitaParceiro, inspecionarGrafo } from './integridade.js';
import { alcancaveis, contarComponentes, indexarGrafo } from './grafo.js';
import { falha, sucesso } from './resultados.js';

/**
 * V1 pura: o comando transporta o snapshot que será examinado.
 * @param {import('../domain/modelo.js').ComandoConexao} comando
 * @returns {{valido: boolean, codigo: string, mensagem: string, detalhes: object}}
 */
export function validarLocal(comando) {
  if (!comando || typeof comando !== 'object') return falha('INVALID_COMMAND', 'Informe um comando de conexão.');
  const { molecule, portA, portB, order = 1 } = comando;
  const integrity = inspecionarGrafo(molecule);
  if (!integrity.valido) return integrity;
  const graph = indexarGrafo(molecule);
  const a = graph.ports.get(portA); const b = graph.ports.get(portB);
  if (!a || !b) return falha('PORT_NOT_FOUND', 'Uma das portas informadas não existe.', { portA, portB });
  if (portA === portB) return falha('SAME_PORT', 'Escolha duas portas diferentes.');
  if (a.port.occupiedBondId !== null || b.port.occupiedBondId !== null) return falha('PORT_OCCUPIED', 'Uma das portas já está ocupada.');
  if (order !== 1) return falha('EXTERNAL_BOND_ORDER_NOT_SUPPORTED', 'No modo iniciante, as ligações externas são apenas simples.');
  if (a.fragment.id === b.fragment.id) return falha('SAME_FRAGMENT_CONNECTION', 'As duas portas devem pertencer a peças diferentes.');
  const atomA = graph.atoms.get(a.port.atomId); const atomB = graph.atoms.get(b.port.atomId);
  if (!aceitaParceiro(a.fragment.templateId, atomB.element) || !aceitaParceiro(b.fragment.templateId, atomA.element)) {
    return falha('UNSUPPORTED_PARTNER', 'Esta combinação não está disponível no modo iniciante. OH, CHO e COOH só se conectam a carbono.');
  }
  if (alcancaveis(graph.adjacency, atomA.id).has(atomB.id)) {
    return falha('CYCLE_NOT_SUPPORTED', 'Essa ligação fecharia um ciclo, indisponível no modo iniciante.');
  }
  for (const atom of [atomA, atomB]) {
    if (graph.valences.get(atom.id) + order > VALENCIAS[atom.element]) {
      return falha('VALENCE_EXCEEDED', 'A conexão ultrapassaria a valência deste átomo.', { atomId: atom.id });
    }
  }
  return sucesso('CONNECTION_ALLOWED', 'As portas podem ser conectadas.');
}

/** V2 pura: integridade, componente único, portas ocupadas e valências finais. */
export function validarEstrutura(molecule) {
  const integrity = inspecionarGrafo(molecule);
  if (!integrity.valido) return { ...integrity, completa: false };
  const incomplete = (code, message, details) => ({ ...falha(code, message, details), completa: false });
  if (molecule.fragments.length === 0) return incomplete('EMPTY_WORKSPACE', 'Adicione ao menos uma peça.');
  const graph = indexarGrafo(molecule);
  const components = contarComponentes(graph.adjacency);
  if (components !== 1) return incomplete('DISCONNECTED_COMPONENTS', 'Há peças ou conjuntos desconectados.', { componentes: components });
  const free = [...graph.ports.values()].filter(({ port }) => port.occupiedBondId === null).map(({ port }) => port.id);
  if (free.length) return incomplete('OPEN_PORTS', 'Ainda há portas livres na montagem.', { portIds: free });
  for (const atom of molecule.atoms) {
    if (graph.valences.get(atom.id) !== VALENCIAS[atom.element]) {
      return incomplete('INVALID_VALENCE', 'Um átomo não completou sua valência.', { atomId: atom.id });
    }
  }
  return { ...sucesso('STRUCTURE_COMPLETE', 'A molécula está completa e quimicamente válida neste modo.'), completa: true };
}

/** Auxiliares aceitam montagens parciais consistentes; rejeitam snapshots corrompidos. */
function exigirGrafo(molecule) {
  const result = inspecionarGrafo(molecule);
  if (!result.valido) {
    const error = new Error(result.mensagem); error.codigo = result.codigo; throw error;
  }
  return indexarGrafo(molecule);
}

export function contarCarbonos(molecule) {
  exigirGrafo(molecule);
  // Inclui os carbonos que pertencem a CHO e COOH; IDs não são contados duas vezes.
  return molecule.atoms.filter((a) => a.element === 'C').length;
}

export function detectarRamificacao(molecule) {
  const graph = exigirGrafo(molecule);
  return molecule.atoms.some((a) => a.element === 'C'
    && graph.adjacency.get(a.id).filter((n) => graph.atoms.get(n.atomId).element === 'C').length >= 3);
}

/**
 * Identifica padrões no grafo, não pela presença de rótulos dos fragmentos.
 * O OH de um ácido não deve também aparecer como função álcool.
 */
export function identificarFuncoes(molecule) {
  const graph = exigirGrafo(molecule);
  const neighbors = (id, element, order) => graph.adjacency.get(id).filter((n) =>
    graph.atoms.get(n.atomId).element === element && n.bond.order === order);
  const carbonyl = (id) => neighbors(id, 'O', 2).length > 0;
  const funcoes = [];
  for (const atom of molecule.atoms) {
    if (atom.element === 'O' && neighbors(atom.id, 'H', 1).length === 1) {
      for (const n of neighbors(atom.id, 'C', 1)) {
        if (carbonyl(n.atomId)) continue;
        const degree = neighbors(n.atomId, 'C', 1).length;
        funcoes.push({ tipo: 'alcool', oxigenioId: atom.id, carbonoId: n.atomId,
          numeroVizinhosCarbono: degree,
          classificacao: ['metanol', 'primario', 'secundario', 'terciario'][degree] });
      }
    }
    if (atom.element !== 'C' || !carbonyl(atom.id)) continue;
    if (neighbors(atom.id, 'H', 1).length === 1 && neighbors(atom.id, 'C', 1).length === 1) {
      funcoes.push({ tipo: 'aldeido', carbonoId: atom.id });
    }
    for (const n of neighbors(atom.id, 'O', 1)) {
      if (neighbors(n.atomId, 'H', 1).length === 1 && neighbors(atom.id, 'C', 1).length === 1) {
        funcoes.push({ tipo: 'acido_carboxilico', carbonoId: atom.id, oxigenioId: n.atomId });
      }
    }
  }
  return funcoes;
}

export function classificarAlcoois(molecule) {
  return identificarFuncoes(molecule).filter((f) => f.tipo === 'alcool');
}

export function possuiAlcoolPrimario(molecule) {
  return classificarAlcoois(molecule).some((a) => a.classificacao === 'primario');
}

export function possuiAlcoolSecundario(molecule) {
  return classificarAlcoois(molecule).some((a) => a.classificacao === 'secundario');
}
