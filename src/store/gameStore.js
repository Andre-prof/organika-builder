import { createStore } from 'zustand/vanilla';
import { Molecule } from '../domain/Molecule.js';
import { BLOCOS } from '../data/blocos.js';
import { DESAFIOS, obterDesafio } from '../data/desafios.js';
import { validarEstrutura, validarLocal } from '../game/ValidadorEstrutura.js';
import { avaliarDesafio } from '../game/AvaliadorDesafio.js';
import { TODOS_DESAFIOS, validarRoteiro } from '../game/roteiroProfessor.js';
import { alinharPortas, calcularEncaixe, componenteDe, girar, temColisao, foraDaCena } from '../scene/geometria.js';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

export function criarGameStore() {
  let engine = new Molecule(); let past = []; let future = [];
  return createStore((set, get) => {
    const notify = (result) => { set({ feedback: result }); return result; };
    const frame = () => ({ molecule: engine.obterMolecula(), poses: structuredClone(get().poses), resultado: structuredClone(get().resultado), visualizacao: get().visualizacao });
    const commit = (before, poses, result, selected = get().selecao) => {
      past = [...past.slice(-49), before]; future = [];
      const molecule = freeze(engine.obterMolecula());
      set({ molecule, poses: freeze(structuredClone(poses)), validacao: validarEstrutura(molecule), feedback: result,
        selecao: selected, portaOrigem: null, resultado: molecule.revision === before.molecule.revision ? get().resultado : null,
        visualizacao: molecule.revision === before.molecule.revision ? get().visualizacao : 'puzzle', podeDesfazer: true, podeRefazer: false });
      return result;
    };
    const reject = (codigo, mensagem) => notify({ valido: false, codigo, mensagem });
    return {
      molecule: freeze(engine.obterMolecula()), poses: {}, desafioId: DESAFIOS[0].id,
      roteiroIds: [...TODOS_DESAFIOS],
      concluidos: [], selecao: null, portaOrigem: null, feedback: null, resultado: null,
      visualizacao: 'puzzle',
      validacao: validarEstrutura(engine.obterMolecula()), podeDesfazer: false, podeRefazer: false, dicaVisivel: false,
      adicionarPeca(templateId, pose, snap = false, scale = 1) {
        const state = get(); const challenge = obterDesafio(state.desafioId);
        if (!BLOCOS[templateId]) return reject('UNKNOWN_TEMPLATE', 'Peça desconhecida.');
        if (pose && (![pose.x, pose.y, pose.angle].every(Number.isFinite) || pose.angle % 90 !== 0 || foraDaCena({ nova: pose }))) return reject('INVALID_POSE', 'A posição ou o giro informado é inválido.');
        const used = state.molecule.fragments.filter((f) => f.templateId === templateId).length;
        if (used >= (challenge.inventario[templateId] ?? 0)) return reject('INVENTORY_EMPTY', 'Não há mais unidades dessa peça neste desafio.');
        const before = frame(); const result = engine.adicionarFragmento(templateId); const id = result.fragmento.id;
        const n = state.molecule.fragments.length;
        let poses = { ...state.poses, [id]: pose ?? { x: 220 + (n % 4) * 170, y: 200 + Math.floor(n / 4) * 150, angle: 0 } };
        if (snap) {
          const candidate = calcularEncaixe(engine.obterMolecula(), poses, [id], scale);
          if (candidate?.erro) { engine = Molecule.restaurar(before.molecule); return notify(candidate.erro); }
          if (candidate?.portA) { engine.conectarPortas(candidate.portA, candidate.portB); poses = candidate.poses; }
          else if (temColisao(poses, [id])) {
            engine = Molecule.restaurar(before.molecule);
            return reject('LAYOUT_COLLISION', 'As peças estão sobrepostas. Aproxime os conectores pelas bordas.');
          }
          if (candidate?.ambiguo) result.mensagem = 'Peça adicionada. Há mais de um encaixe: escolha as portas para conectar.';
        }
        return commit(before, poses, result, id);
      },
      moverConjunto(fragmentId, poses, snap = true, scale = 1) {
        const state = get(); if (!state.poses[fragmentId]) return reject('FRAGMENT_NOT_FOUND', 'Selecione uma peça existente.');
        const before = frame(); const moving = componenteDe(state.molecule, fragmentId);
        let next = { ...state.poses };
        // A UI envia a pose do grupo, mas não pode mover componentes não selecionados.
        const origin = state.poses[fragmentId]; const destination = poses?.[fragmentId];
        if (!destination || !Number.isFinite(destination.x) || !Number.isFinite(destination.y)) return reject('INVALID_POSE', 'A posição informada é inválida.');
        for (const id of moving) next[id] = { ...state.poses[id], x: state.poses[id].x + destination.x - origin.x, y: state.poses[id].y + destination.y - origin.y };
        if (foraDaCena(next, moving)) return reject('SCENE_OUT_OF_BOUNDS', 'Mantenha o conjunto dentro da bancada.');
        let message = 'Conjunto movido.';
        if (snap) {
          const candidate = calcularEncaixe(state.molecule, next, moving, scale);
          if (candidate?.erro) return notify(candidate.erro);
          if (candidate?.portA) { const result = engine.conectarPortas(candidate.portA, candidate.portB); if (!result.valido) return notify(result); next = candidate.poses; message = 'Peças encaixadas.'; }
          else if (temColisao(next, moving)) return reject('LAYOUT_COLLISION', 'As peças estão sobrepostas. Aproxime os conectores pelas bordas.');
          if (candidate?.ambiguo) message = 'Há mais de um encaixe. Selecione as portas para escolher o destino.';
        }
        return commit(before, next, { valido: true, codigo: 'SCENE_UPDATED', mensagem: message }, fragmentId);
      },
      selecionar(fragmentId) {
        if (fragmentId !== null && !get().molecule.fragments.some((f) => f.id === fragmentId)) return reject('FRAGMENT_NOT_FOUND', 'Selecione uma peça existente.');
        set({ selecao: fragmentId, portaOrigem: null });
      },
      selecionarPorta(portId) {
        const state = get(); const port = state.molecule.fragments.flatMap((f) => f.ports).find((p) => p.id === portId);
        if (!port) return reject('PORT_NOT_FOUND', 'A porta não existe.');
        if (port.occupiedBondId) return reject('PORT_OCCUPIED', 'Esta porta já está conectada. Use a lista de ligações para desconectar.');
        if (!state.portaOrigem || state.portaOrigem === portId) { set({ portaOrigem: state.portaOrigem === portId ? null : portId }); return; }
        return get().conectarPortas(state.portaOrigem, portId);
      },
      conectarPortas(portA, portB) {
        const state = get(); const validation = validarLocal({ molecule: state.molecule, portA, portB });
        if (!validation.valido) return notify(validation);
        const alignment = alinharPortas(state.molecule, state.poses, portA, portB);
        if (temColisao(alignment.poses, alignment.moving) || foraDaCena(alignment.poses, alignment.moving)) return reject('LAYOUT_COLLISION', 'Não há espaço para encaixar aqui. Mova o conjunto e tente de novo.');
        const before = frame(); const result = engine.conectarPortas(portA, portB);
        return commit(before, alignment.poses, result);
      },
      desconectar(bondId) { const before = frame(); const result = engine.desconectar(bondId); return result.valido ? commit(before, get().poses, result) : notify(result); },
      removerSelecionada() {
        const state = get(); const before = frame(); const result = engine.removerFragmento(state.selecao);
        if (!result.valido) return notify(result);
        const poses = { ...state.poses }; delete poses[state.selecao];
        return commit(before, poses, result, null);
      },
      girarSelecionada() {
        const state = get(); if (!state.selecao) return;
        const before = frame(); const pivot = state.poses[state.selecao]; const next = { ...state.poses };
        for (const id of componenteDe(state.molecule, state.selecao)) {
          const p = state.poses[id]; const r = girar({ x: p.x - pivot.x, y: p.y - pivot.y }, 90);
          next[id] = { x: pivot.x + r.x, y: pivot.y + r.y, angle: (p.angle + 90) % 360 };
        }
        if (foraDaCena(next, componenteDe(state.molecule, state.selecao))) return reject('SCENE_OUT_OF_BOUNDS', 'Mova o conjunto para o centro antes de girar.');
        return commit(before, next, { valido: true, codigo: 'SCENE_ROTATED', mensagem: 'Conjunto girado em 90 graus.' });
      },
      verificar() {
        const result = avaliarDesafio(engine.obterMolecula(), obterDesafio(get().desafioId));
        set({ resultado: result, feedback: result, visualizacao: result.completa ? 'formula' : 'puzzle', portaOrigem: null,
          concluidos: result.objetivoCorreto ? [...new Set([...get().concluidos, get().desafioId])] : get().concluidos });
        return result;
      },
      alterarVisualizacao(view) {
        if (!['puzzle', 'formula'].includes(view)) return reject('INVALID_VIEW', 'Escolha quebra-cabeça ou fórmula plana.');
        if (view === 'formula' && !get().resultado?.completa) return reject('FORMULA_NOT_READY', 'Complete a montagem e clique em Verificar estrutura para revelar a fórmula.');
        set({ visualizacao: view, portaOrigem: null });
        return { valido: true, codigo: 'VIEW_CHANGED', mensagem: view === 'formula' ? 'Fórmula completa exibida.' : 'Quebra-cabeça exibido.' };
      },
      mostrarDica() { set({ dicaVisivel: !get().dicaVisivel }); },
      desfazer() {
        if (!past.length) return;
        const previous = past.pop(); future.push(frame()); engine = Molecule.restaurar(previous.molecule);
        set({ molecule: freeze(engine.obterMolecula()), poses: freeze(previous.poses), validacao: validarEstrutura(previous.molecule),
          resultado: previous.resultado, visualizacao: previous.visualizacao, selecao: null, portaOrigem: null, podeDesfazer: past.length > 0, podeRefazer: true,
          feedback: { valido: true, codigo: 'UNDONE', mensagem: 'Última ação desfeita.' } });
      },
      refazer() {
        if (!future.length) return;
        const next = future.pop(); past.push(frame()); engine = Molecule.restaurar(next.molecule);
        set({ molecule: freeze(engine.obterMolecula()), poses: freeze(next.poses), validacao: validarEstrutura(next.molecule),
          resultado: next.resultado, visualizacao: next.visualizacao, selecao: null, portaOrigem: null, podeDesfazer: true, podeRefazer: future.length > 0,
          feedback: { valido: true, codigo: 'REDONE', mensagem: 'Ação refeita.' } });
      },
      reiniciar() {
        const before = frame(); engine = new Molecule();
        commit(before, {}, { valido: true, codigo: 'RESET', mensagem: 'Bancada limpa. Vamos tentar de novo.' }, null);
      },
      iniciarSessao(ids = TODOS_DESAFIOS) {
        const validation = validarRoteiro(ids);
        if (!validation.valido) return notify(validation);
        engine = new Molecule(); past = []; future = [];
        set({ molecule: freeze(engine.obterMolecula()), poses: {}, validacao: validarEstrutura(engine.obterMolecula()),
          roteiroIds: freeze([...validation.ids]), desafioId: validation.ids[0], concluidos: [],
          selecao: null, portaOrigem: null, feedback: null, resultado: null, visualizacao: 'puzzle', dicaVisivel: false, podeDesfazer: false, podeRefazer: false });
        return { valido: true, codigo: 'SESSION_STARTED', mensagem: 'Nova atividade iniciada.' };
      },
      trocarDesafio(id) {
        const challenge = obterDesafio(id);
        if (!challenge) return reject('CHALLENGE_NOT_FOUND', 'Desafio não encontrado.');
        const index = get().roteiroIds.indexOf(id);
        if (index < 0) return reject('CHALLENGE_OUTSIDE_ROSTER', 'Este desafio não faz parte do roteiro atual.');
        if (index > 0 && !get().concluidos.includes(get().roteiroIds[index - 1])) return reject('CHALLENGE_LOCKED', 'Conclua o desafio anterior para desbloquear este.');
        engine = new Molecule(); past = []; future = [];
        set({ molecule: freeze(engine.obterMolecula()), poses: {}, validacao: validarEstrutura(engine.obterMolecula()),
          desafioId: id, selecao: null, portaOrigem: null, feedback: null, resultado: null, visualizacao: 'puzzle', dicaVisivel: false, podeDesfazer: false, podeRefazer: false });
      },
    };
  });
}
