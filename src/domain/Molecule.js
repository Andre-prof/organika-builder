import { criarMoleculaVazia } from './modelo.js';
import { obterTemplate, instanciarTemplate } from '../data/blocos.js';
import { validarLocal } from '../game/ValidadorEstrutura.js';
import { falha, sucesso } from '../game/resultados.js';
import { inspecionarGrafo } from '../game/integridade.js';

/**
 * Agregado que controla as alterações do domínio. Recusas nunca mudam o estado.
 * Snapshots e resultados não compartilham referências mutáveis com o agregado.
 * revision só aumenta após uma alteração química efetivamente confirmada.
 */
export class Molecule {
  #molecule = criarMoleculaVazia();
  #namespace = globalThis.crypto.randomUUID();
  #fragmentSequence = 0;
  #bondSequence = 0;

  /** Restaura um estado íntegro para undo/redo, sempre com cópia independente. */
  static restaurar(snapshot) {
    const validation = inspecionarGrafo(snapshot);
    if (!validation.valido) {
      const error = new Error(validation.mensagem); error.codigo = validation.codigo; throw error;
    }
    const instance = new Molecule();
    instance.#molecule = structuredClone(snapshot);
    // O novo namespace impede colisão com IDs anteriores ao desfazer/refazer.
    return instance;
  }

  adicionarFragmento(templateId) {
    if (!obterTemplate(templateId)) return falha('UNKNOWN_TEMPLATE', 'Esta peça não está disponível no modo iniciante.', { templateId });
    const id = `f-${this.#namespace}-${++this.#fragmentSequence}`;
    const instance = instanciarTemplate(templateId, id);
    this.#molecule.atoms.push(...instance.atoms);
    this.#molecule.bonds.push(...instance.bonds);
    this.#molecule.fragments.push(instance.fragment);
    this.#molecule.revision += 1;
    return { ...sucesso('FRAGMENT_ADDED', 'Peça adicionada.'), fragmento: structuredClone(instance.fragment) };
  }

  conectarPortas(portA, portB, order = 1) {
    const result = validarLocal({ molecule: this.#molecule, portA, portB, order });
    if (!result.valido) return result;
    const ports = this.#molecule.fragments.flatMap((f) => f.ports);
    const a = ports.find((p) => p.id === portA); const b = ports.find((p) => p.id === portB);
    const bond = {
      id: `e-${this.#namespace}-${++this.#bondSequence}`,
      a: a.atomId, b: b.atomId, order: 1, internal: false,
    };
    // Todos os pré-requisitos já foram verificados: não há aplicação parcial.
    this.#molecule.bonds.push(bond);
    a.occupiedBondId = bond.id; b.occupiedBondId = bond.id;
    this.#molecule.revision += 1;
    return { ...sucesso('PORTS_CONNECTED', 'Portas conectadas.'), ligacao: { ...bond } };
  }

  desconectar(bondId) {
    const bond = this.#molecule.bonds.find((b) => b.id === bondId);
    if (!bond) return falha('BOND_NOT_FOUND', 'A ligação informada não existe.', { bondId });
    if (bond.internal) return falha('INTERNAL_BOND_IMMUTABLE', 'As ligações e os H internos das peças são fixos.', { bondId });
    this.#molecule.bonds = this.#molecule.bonds.filter((b) => b.id !== bondId);
    for (const fragment of this.#molecule.fragments) {
      for (const port of fragment.ports) {
        if (port.occupiedBondId === bondId) port.occupiedBondId = null;
      }
    }
    this.#molecule.revision += 1;
    return sucesso('BOND_DISCONNECTED', 'Ligação removida e portas liberadas.');
  }

  removerFragmento(fragmentId) {
    const fragment = this.#molecule.fragments.find((f) => f.id === fragmentId);
    if (!fragment) return falha('FRAGMENT_NOT_FOUND', 'A peça informada não existe.');
    const atoms = new Set(fragment.atomIds);
    const removed = new Set(this.#molecule.bonds.filter((b) => atoms.has(b.a) || atoms.has(b.b)).map((b) => b.id));
    this.#molecule.atoms = this.#molecule.atoms.filter((a) => !atoms.has(a.id));
    this.#molecule.bonds = this.#molecule.bonds.filter((b) => !removed.has(b.id));
    this.#molecule.fragments = this.#molecule.fragments.filter((f) => f.id !== fragmentId);
    for (const f of this.#molecule.fragments) {
      for (const port of f.ports) if (removed.has(port.occupiedBondId)) port.occupiedBondId = null;
    }
    this.#molecule.revision += 1;
    return sucesso('FRAGMENT_REMOVED', 'Peça devolvida à paleta.');
  }

  /** A cópia profunda protege especialmente as portas e as listas atomIds. */
  obterMolecula() {
    return structuredClone(this.#molecule);
  }
}
