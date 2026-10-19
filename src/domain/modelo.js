/**
 * Contratos do domínio. Não há coordenadas, componentes React ou estado visual.
 * Os tipos JSDoc documentam JavaScript puro, sem exigir TypeScript.
 *
 * @typedef {{id: string, element: 'C'|'H'|'O', formalCharge: 0,
 * fragmentId: string}} Atom
 * @typedef {{id: string, a: string, b: string, order: 1|2,
 * internal: boolean}} Bond
 * @typedef {{id: string, atomId: string, allowedOrders: [1],
 * occupiedBondId: string|null}} Port
 * @typedef {{id: string, templateId: string, atomIds: string[],
 * ports: Port[]}} Fragment
 * @typedef {{schemaVersion: string, revision: number, atoms: Atom[],
 * bonds: Bond[], fragments: Fragment[]}} MoleculeData
 * @typedef {{molecule: MoleculeData, portA: string, portB: string,
 * order?: number}} ComandoConexao
 */

export const SCHEMA_VERSION = '1.1';
export const VALENCIAS = Object.freeze({ C: 4, O: 2, H: 1 });

/** Cria um snapshot vazio e independente. */
export function criarMoleculaVazia() {
  return { schemaVersion: SCHEMA_VERSION, revision: 0, atoms: [], bonds: [], fragments: [] };
}
