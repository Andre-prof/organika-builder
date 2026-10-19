import { pathToFileURL } from 'node:url';
import {
  Molecule, validarEstrutura, contarCarbonos, identificarFuncoes,
} from '../src/index.js';

function adicionar(molecule, templateId) {
  const result = molecule.adicionarFragmento(templateId);
  if (!result.valido) throw new Error(result.mensagem);
  return result.fragmento;
}

function conectar(molecule, a, b) {
  const result = molecule.conectarPortas(a.id, b.id);
  if (!result.valido) throw new Error(result.mensagem);
  return result;
}

export function montarEtanol() {
  const molecule = new Molecule();
  const ch3 = adicionar(molecule, 'ch3');
  const ch2 = adicionar(molecule, 'ch2');
  const oh = adicionar(molecule, 'oh');
  conectar(molecule, ch3.ports[0], ch2.ports[0]);
  conectar(molecule, ch2.ports[1], oh.ports[0]);
  return molecule;
}

export function montarAcidoEtanoico() {
  const molecule = new Molecule();
  const ch3 = adicionar(molecule, 'ch3');
  const cooh = adicionar(molecule, 'cooh');
  conectar(molecule, ch3.ports[0], cooh.ports[0]);
  return molecule;
}

export function tentarConectarDoisOH() {
  const molecule = new Molecule();
  const a = adicionar(molecule, 'oh');
  const b = adicionar(molecule, 'oh');
  const antes = molecule.obterMolecula();
  const resultado = molecule.conectarPortas(a.ports[0].id, b.ports[0].id);
  return { antes, depois: molecule.obterMolecula(), resultado };
}

// Importar os exemplos nos testes não imprime nada nem executa montagens extras.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [nome, molecule] of [['Etanol', montarEtanol()], ['Ácido etanoico', montarAcidoEtanoico()]]) {
    const snapshot = molecule.obterMolecula();
    console.log(nome, {
      validacao: validarEstrutura(snapshot),
      carbonos: contarCarbonos(snapshot),
      funcoes: identificarFuncoes(snapshot).map((f) => f.tipo),
    });
  }
  const tentativa = tentarConectarDoisOH();
  console.log('Tentativa OH + OH:', tentativa.resultado);
  console.log('Estado preservado:', JSON.stringify(tentativa.antes) === JSON.stringify(tentativa.depois));
}
