import { Molecule } from '../domain/Molecule.js';

/** Receitas são dados de conteúdo, sem coordenadas ou regras visuais. */
const receitas = [
  ['etano', 'Etano', 'Monte uma cadeia com dois carbonos.', ['ch3', 'ch3'], [[0, 0, 1, 0]], {}, 'Hidrocarbonetos', 'Uma peça CH₃ tem uma porta. Encaixe as duas peças para fechar a cadeia.'],
  ['propano', 'Propano', 'Construa uma cadeia aberta com três carbonos.', ['ch3', 'ch2', 'ch3'], [[0, 0, 1, 0], [1, 1, 2, 0]], {}, 'Hidrocarbonetos', 'A peça CH₂ tem duas portas e fica entre os dois CH₃.'],
  ['butano', 'Butano', 'Construa uma cadeia linear de quatro carbonos.', ['ch3', 'ch2', 'ch2', 'ch3'], [[0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0]], { oh: 1 }, 'Hidrocarbonetos', 'Use dois CH₂ entre os dois CH₃. O OH é uma peça extra.'],
  ['metanol', 'Metanol', 'Monte um álcool com apenas um carbono.', ['ch3', 'oh'], [[0, 0, 1, 0]], { ch2: 1 }, 'Álcoois', 'O OH se liga diretamente ao carbono do CH₃.'],
  ['etanol', 'Etanol', 'Monte um álcool com dois carbonos.', ['ch3', 'ch2', 'oh'], [[0, 0, 1, 0], [1, 1, 2, 0]], { cho: 1 }, 'Álcoois', 'Monte CH₃–CH₂ e use a porta restante do CH₂ para o OH.'],
  ['propan-1-ol', 'Propan-1-ol', 'Construa um álcool de três carbonos com OH na ponta.', ['ch3', 'ch2', 'ch2', 'oh'], [[0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0]], { ch3: 1 }, 'Álcoois', 'O carbono que porta o OH tem um único vizinho de carbono.'],
  ['etanal', 'Etanal', 'Monte um aldeído com dois carbonos no total.', ['ch3', 'cho'], [[0, 0, 1, 0]], { oh: 1, ch2: 1 }, 'Aldeídos', 'A peça CHO já contém um carbono, uma carbonila e um H.'],
  ['acido-propanoico', 'Ácido propanoico', 'Monte um ácido carboxílico com três carbonos no total.', ['ch3', 'ch2', 'cooh'], [[0, 0, 1, 0], [1, 1, 2, 0]], { cho: 1, oh: 1 }, 'Ácidos carboxílicos', 'COOH já tem um carbono. Acrescente CH₂ e CH₃.'],
  ['2-metilpropano', '2-metilpropano', 'Monte uma cadeia ramificada com quatro carbonos.', ['ch', 'ch3', 'ch3', 'ch3'], [[0, 0, 1, 0], [0, 1, 2, 0], [0, 2, 3, 0]], { ch2: 1, oh: 1 }, 'Ramificações', 'As três portas do CH recebem, cada uma, um CH₃.'],
  ['butan-2-ol', 'Butan-2-ol', 'Monte um álcool secundário com quatro carbonos.', ['ch3', 'ch', 'ch2', 'ch3', 'oh'], [[0, 0, 1, 0], [1, 1, 2, 0], [2, 1, 3, 0], [1, 2, 4, 0]], { ch2: 1, cho: 1, cooh: 1 }, 'Desafio final', 'Ligue o OH ao CH. Esse carbono deve ter dois vizinhos de carbono.'],
];

export const DESAFIOS = receitas.map(([id, nome, enunciado, pecas, ligacoes, extras, categoria, dica], index) => {
  const molecule = new Molecule();
  const fragments = pecas.map((p) => molecule.adicionarFragmento(p).fragmento);
  for (const [a, pa, b, pb] of ligacoes) molecule.conectarPortas(fragments[a].ports[pa].id, fragments[b].ports[pb].id);
  const inventario = { ...extras };
  for (const p of pecas) inventario[p] = (inventario[p] ?? 0) + 1;
  return { id, numero: index + 1, nome, enunciado, inventario, categoria, dica, alvo: molecule.obterMolecula() };
});

export const obterDesafio = (id) => DESAFIOS.find((d) => d.id === id) ?? null;
