/**
 * Templates químicos, sem informações de desenho.
 * As portas representam capacidade externa disponível, não a valência do carbono.
 * Os H já pertencem ao template e nunca são criados ou consumidos ao conectar.
 */
function congelarProfundamente(valor) {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelarProfundamente);
    Object.freeze(valor);
  }
  return valor;
}

const atom = (id, element) => ({ id, element, formalCharge: 0 });
const bond = (id, a, b, order = 1) => ({ id, a, b, order });
const port = (id, atomId, allowedPartnerElements) => ({
  id, atomId, allowedOrders: [1], allowedPartnerElements,
});

export const BLOCOS = congelarProfundamente({
  ch3: {
    id: 'ch3', nome: 'CH₃',
    atoms: [atom('c', 'C'), atom('h1', 'H'), atom('h2', 'H'), atom('h3', 'H')],
    internalBonds: [bond('b1', 'c', 'h1'), bond('b2', 'c', 'h2'), bond('b3', 'c', 'h3')],
    ports: [port('p1', 'c', ['C', 'O'])],
  },
  ch2: {
    id: 'ch2', nome: 'CH₂',
    atoms: [atom('c', 'C'), atom('h1', 'H'), atom('h2', 'H')],
    internalBonds: [bond('b1', 'c', 'h1'), bond('b2', 'c', 'h2')],
    ports: [port('p1', 'c', ['C', 'O']), port('p2', 'c', ['C', 'O'])],
  },
  ch: {
    id: 'ch', nome: 'CH',
    atoms: [atom('c', 'C'), atom('h1', 'H')],
    internalBonds: [bond('b1', 'c', 'h1')],
    ports: [port('p1', 'c', ['C', 'O']), port('p2', 'c', ['C', 'O']), port('p3', 'c', ['C', 'O'])],
  },
  oh: {
    id: 'oh', nome: 'OH',
    atoms: [atom('o', 'O'), atom('h1', 'H')],
    internalBonds: [bond('b1', 'o', 'h1')],
    ports: [port('p1', 'o', ['C'])],
  },
  cho: {
    id: 'cho', nome: 'CHO',
    atoms: [atom('c', 'C'), atom('o', 'O'), atom('h1', 'H')],
    internalBonds: [bond('b1', 'c', 'o', 2), bond('b2', 'c', 'h1')],
    ports: [port('p1', 'c', ['C'])],
  },
  cooh: {
    id: 'cooh', nome: 'COOH',
    atoms: [atom('c', 'C'), atom('o1', 'O'), atom('o2', 'O'), atom('h1', 'H')],
    internalBonds: [bond('b1', 'c', 'o1', 2), bond('b2', 'c', 'o2'), bond('b3', 'o2', 'h1')],
    ports: [port('p1', 'c', ['C'])],
  },
});

export function obterTemplate(id) {
  return Object.hasOwn(BLOCOS, id) ? BLOCOS[id] : null;
}

/** Cria objetos novos; todas as referências locais recebem o mesmo prefixo. */
export function instanciarTemplate(templateId, fragmentId) {
  const template = obterTemplate(templateId);
  if (!template) throw new Error(`Template desconhecido: ${templateId}.`);
  const atomId = (id) => `${fragmentId}:atom:${id}`;
  return {
    atoms: template.atoms.map((a) => ({ ...a, id: atomId(a.id), fragmentId })),
    bonds: template.internalBonds.map((b) => ({
      ...b, id: `${fragmentId}:bond:${b.id}`, a: atomId(b.a), b: atomId(b.b), internal: true,
    })),
    fragment: {
      id: fragmentId, templateId,
      atomIds: template.atoms.map((a) => atomId(a.id)),
      ports: template.ports.map((p) => ({
        id: `${fragmentId}:port:${p.id}`, atomId: atomId(p.atomId),
        allowedOrders: [...p.allowedOrders], occupiedBondId: null,
      })),
    },
  };
}
