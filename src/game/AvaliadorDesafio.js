import { validarEstrutura, contarCarbonos, identificarFuncoes } from './ValidadorEstrutura.js';
import { indexarGrafo } from './grafo.js';

/**
 * Codificação canônica de uma árvore com elementos e ordens de ligação.
 * O menor código entre todas as raízes independe de IDs e ordem dos arrays.
 * Não confunde isômeros que possuem a mesma fórmula molecular.
 */
export function assinaturaMolecular(molecule) {
  const validation = validarEstrutura(molecule);
  if (!validation.completa) return null;
  const graph = indexarGrafo(molecule);
  function encode(id, parent) {
    const branches = graph.adjacency.get(id).filter((n) => n.atomId !== parent)
      .map((n) => `${n.bond.order}${encode(n.atomId, id)}`).sort();
    return `${graph.atoms.get(id).element}(${branches.join('')})`;
  }
  return molecule.atoms.map((a) => encode(a.id, null)).sort()[0];
}

export function avaliarDesafio(molecule, desafio) {
  const validation = validarEstrutura(molecule);
  if (!validation.completa) return { ...validation, objetivoCorreto: false };
  const correct = assinaturaMolecular(molecule) === assinaturaMolecular(desafio.alvo);
  return {
    valido: true, completa: true, objetivoCorreto: correct,
    codigo: correct ? 'CHALLENGE_COMPLETE' : 'OBJECTIVE_MISMATCH',
    mensagem: correct ? `Você construiu ${desafio.nome.toLocaleLowerCase('pt-BR')}!` : 'A molécula é válida, mas ainda não corresponde ao desafio.',
    detalhes: { carbonos: contarCarbonos(molecule), funcoes: identificarFuncoes(molecule).map((f) => f.tipo) },
  };
}
