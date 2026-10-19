import { MoleculaProgressiva } from '../domain/MoleculaProgressiva.js';

function fragmentos(id, nome, receita, ligacoes, dica) {
  const m = new MoleculaProgressiva();
  const fs = receita.map((t) => m.adicionarFragmento(t).fragmento);
  ligacoes.forEach(([a, pa, b, pb, order]) => {
    const r = m.conectarPortas(fs[a].ports[pa].id, fs[b].ports[pb].id, order);
    if (!r.valido) throw new Error(`${nome}: ${r.mensagem}`);
  });
  if (!m.validarEstrutura().completa) throw new Error(`Gabarito incompleto: ${nome}`);
  return { id, nivel: 'intermediario', nome, dica, alvo: m.obterMolecula(),
    inventario: receita.reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {}) };
}
// Os índices de porta correspondem à ordem dos templates; H nunca é implícito.
export const DESAFIOS_INTERMEDIARIOS = [
  fragmentos('eteno', 'Eteno', ['ch2_dupla', 'ch2_dupla'], [[0, 0, 1, 0, 2]], 'Una as duas portas duplas. Cada carbono já possui dois H.'),
  fragmentos('propeno', 'Propeno', ['ch3', 'ch_dupla', 'ch2_dupla'], [[0, 0, 1, 0, 1], [1, 1, 2, 0, 2]], 'A peça CH tem uma porta simples e outra dupla.'),
  fragmentos('but-1-eno', 'But-1-eno', ['ch3', 'ch2', 'ch_dupla', 'ch2_dupla'], [[0, 0, 1, 0, 1], [1, 1, 2, 0, 1], [2, 1, 3, 0, 2]], 'A dupla fica na extremidade da cadeia com quatro carbonos.'),
  fragmentos('but-2-eno', 'But-2-eno', ['ch3', 'ch_dupla', 'ch_dupla', 'ch3'], [[0, 0, 1, 0, 1], [1, 1, 2, 1, 2], [2, 0, 3, 0, 1]], 'Coloque a dupla entre os dois carbonos centrais. Este desafio não distingue cis/trans.'),
  fragmentos('2-metilpropeno', '2-Metilpropeno', ['ch3', 'c_dupla', 'ch3', 'ch2_dupla'], [[0, 0, 1, 0, 1], [1, 1, 2, 0, 1], [1, 2, 3, 0, 2]], 'O carbono sem H recebe dois CH₃ e uma ligação dupla.'),
  fragmentos('etino', 'Etino', ['ch_tripla', 'ch_tripla'], [[0, 0, 1, 0, 3]], 'Dois CH, unidos por uma tripla. A fórmula molecular é C₂H₂.'),
  fragmentos('propino', 'Propino', ['ch3', 'c_tripla', 'ch_tripla'], [[0, 0, 1, 0, 1], [1, 1, 2, 0, 3]], 'O carbono central não tem H: recebe uma simples e uma tripla.'),
  fragmentos('but-1-ino', 'But-1-ino', ['ch3', 'ch2', 'c_tripla', 'ch_tripla'], [[0, 0, 1, 0, 1], [1, 1, 2, 0, 1], [2, 1, 3, 0, 3]], 'A tripla é terminal em uma cadeia de quatro carbonos.'),
  fragmentos('but-2-ino', 'But-2-ino', ['ch3', 'c_tripla', 'c_tripla', 'ch3'], [[0, 0, 1, 0, 1], [1, 1, 2, 1, 3], [2, 0, 3, 0, 1]], 'Una os dois carbonos sem H por uma tripla, com CH₃ em cada ponta.'),
  fragmentos('penta-1-3-dieno', 'Penta-1,3-dieno', ['ch2_dupla', 'ch_dupla', 'ch_dupla', 'ch_dupla', 'ch3'], [[0, 0, 1, 1, 2], [1, 0, 2, 0, 1], [2, 1, 3, 1, 2], [3, 0, 4, 0, 1]], 'Alterne dupla, simples, dupla e simples ao longo dos cinco carbonos.'),
];

function atomos(id, nome, elementos, ligacoes, dica) {
  const m = new MoleculaProgressiva('avancado');
  const ids = elementos.map((e) => m.adicionarAtomo(e).atomo.id);
  ligacoes.forEach(([a, b, order = 1]) => {
    if (!m.conectarAtomos(ids[a], ids[b], order).valido) throw new Error(`Gabarito inválido: ${nome}`);
  });
  // Somente o gabarito completa H. No editor, o aluno adiciona e conecta cada H.
  const valencias = { C: 4, O: 2, N: 3 };
  const snapshot = m.obterMolecula();
  ids.forEach((at, i) => {
    const soma = snapshot.bonds.filter((b) => b.a === at || b.b === at).reduce((s, b) => s + b.order, 0);
    for (let h = soma; h < valencias[elementos[i]]; h++) m.conectarAtomos(at, m.adicionarAtomo('H').atomo.id);
  });
  if (!m.validarEstrutura().completa) throw new Error(`Gabarito incompleto: ${nome}`);
  const alvo = m.obterMolecula();
  return { id, nivel: 'avancado', nome, dica, alvo,
    inventario: alvo.atoms.reduce((acc, a) => ({ ...acc, [a.element]: (acc[a.element] || 0) + 1 }), {}) };
}
const anel = (n, alternado = false) => Array.from({ length: n }, (_, i) => [i, (i + 1) % n, alternado && i % 2 === 0 ? 2 : 1]);
export const DESAFIOS_AVANCADOS = [
  atomos('propanona', 'Propanona', ['C', 'C', 'C', 'O'], [[0, 1], [1, 2], [1, 3, 2]], 'A carbonila fica no carbono central. Complete os seis H nas extremidades.'),
  atomos('metoximetano', 'Metoximetano', ['C', 'O', 'C'], [[0, 1], [1, 2]], 'No éter, o O faz duas ligações simples com carbonos e não recebe H.'),
  atomos('metilamina', 'Metilamina', ['C', 'N'], [[0, 1]], 'Complete três H no C e dois H no N. O N neutro faz três ligações.'),
  atomos('etanamida', 'Etanamida', ['C', 'C', 'O', 'N'], [[0, 1], [1, 2, 2], [1, 3]], 'A amida tem C(=O)–N. O N recebe dois H.'),
  atomos('etanoato-de-metila', 'Etanoato de metila', ['C', 'C', 'O', 'O', 'C'], [[0, 1], [1, 2, 2], [1, 3], [3, 4]], 'O éster contém C(=O)–O–C. Nenhum dos dois O recebe H.'),
  atomos('etanonitrila', 'Etanonitrila', ['C', 'C', 'N'], [[0, 1], [1, 2, 3]], 'A nitrila termina em C≡N. O N não recebe H.'),
  atomos('ciclopropano', 'Ciclopropano', ['C', 'C', 'C'], anel(3), 'Feche um triângulo de carbonos e ligue dois H a cada C.'),
  atomos('ciclobutano', 'Ciclobutano', ['C', 'C', 'C', 'C'], anel(4), 'Feche um anel de quatro C e complete os oito H.'),
  atomos('ciclohexano', 'Ciclohexano', Array(6).fill('C'), anel(6), 'Cada carbono do anel faz duas ligações C–C e duas C–H.'),
  atomos('benzeno', 'Benzeno', Array(6).fill('C'), anel(6, true), 'Use seis C em anel, com simples e duplas alternadas e um H por C. É uma representação de Kekulé; as ligações reais são deslocalizadas.'),
];
export const desafiosDoNivel = (nivel) => nivel === 'intermediario' ? DESAFIOS_INTERMEDIARIOS : DESAFIOS_AVANCADOS;
