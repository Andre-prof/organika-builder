import assert from 'node:assert/strict';
import { Molecule } from '../src/index.js';

/** Monta usando índices de fragmentos/portas, independentemente dos IDs gerados. */
export function montar(templates, links = []) {
  const molecule = new Molecule();
  const fragments = templates.map((template) => {
    const result = molecule.adicionarFragmento(template);
    assert.equal(result.valido, true, result.mensagem);
    return result.fragmento;
  });
  for (const [a, pa, b, pb] of links) {
    const result = molecule.conectarPortas(fragments[a].ports[pa].id, fragments[b].ports[pb].id);
    assert.equal(result.valido, true, result.mensagem);
  }
  return { molecule, fragments };
}

export function verificarRecusaSemAlteracao(molecule, operation, codigo) {
  const antes = molecule.obterMolecula();
  const result = operation();
  assert.equal(result.valido, false);
  assert.equal(result.codigo, codigo);
  assert.deepEqual(molecule.obterMolecula(), antes);
  return result;
}
