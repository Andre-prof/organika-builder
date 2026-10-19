import { createStore } from 'zustand/vanilla';
import { MoleculaProgressiva } from '../domain/MoleculaProgressiva.js';
import { desafiosDoNivel } from '../data/desafiosProgressivos.js';
import { estruturasEquivalentes, descreverEstrutura } from '../game/progressao.js';
import { alinharProgressivo, posicaoLivre, posesValidas, conjuntoProgressivo, encontrarEncaixeProgressivo } from '../scene/geometriaProgressiva.js';
import { falha, sucesso } from '../game/resultados.js';
import { organizarMontagemAvancada } from '../scene/organizarMontagem.js';

const freeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
export function criarProgressiveStore(nivel) {
  const desafios = desafiosDoNivel(nivel); let engine = new MoleculaProgressiva(nivel); let past = []; let future = [];
  return createStore((set, get) => {
    const notify = (r) => { set({ feedback: r }); return r; };
    const frame = () => ({ molecule: engine.obterMolecula(), poses: structuredClone(get().poses), resultado: get().resultado, visualizacao: get().visualizacao });
    const publish = (result, poses, before, selecao = get().selecao) => {
      if (!result.valido) return notify(result);
      past = [...past.slice(-49), before]; future = [];
      const changed = engine.obterMolecula().revision !== before.molecule.revision;
      set({ molecule: freeze(engine.obterMolecula()), poses: freeze(structuredClone(poses)), feedback: result, selecao,
        origem: null, resultado: changed ? null : get().resultado, visualizacao: changed ? 'puzzle' : get().visualizacao,
        podeDesfazer: true, podeRefazer: false });
      return result;
    };
    const reset = (index, completed = get().concluidos) => {
      engine = new MoleculaProgressiva(nivel); past = []; future = [];
      set({ molecule: freeze(engine.obterMolecula()), poses: {}, indice: index, concluidos: completed, selecao: null, origem: null,
        resultado: null, visualizacao: 'puzzle', feedback: null, dica: false, podeDesfazer: false, podeRefazer: false });
    };
    return {
      nivel, indice: 0, molecule: freeze(engine.obterMolecula()), poses: {}, concluidos: [], selecao: null, origem: null,
      ordem: 1, resultado: null, visualizacao: 'puzzle', feedback: null, dica: false, podeDesfazer: false, podeRefazer: false,
      definirOrdem: (ordem) => { if ([1, 2, 3].includes(ordem)) set({ ordem }); },
      selecionar: (id) => set({ selecao: id, origem: null }),
      cancelarConexao: () => set({ origem: null }),
      mostrarDica: () => set({ dica: true }),
      adicionar(tipo) {
        const state = get(); const challenge = desafios[state.indice];
        const used = nivel === 'intermediario' ? state.molecule.fragments.filter((f) => f.templateId === tipo).length : state.molecule.atoms.filter((a) => a.element === tipo).length;
        if (used >= (challenge.inventario[tipo] || 0)) return notify(falha('INVENTORY_EXHAUSTED', 'Não há mais itens deste tipo disponíveis.'));
        const p = posicaoLivre(state.molecule, state.poses);
        if (!p) return notify(falha('BOARD_FULL', 'Mova os itens para abrir espaço na bancada.'));
        const before = frame(); const result = nivel === 'intermediario' ? engine.adicionarFragmento(tipo) : engine.adicionarAtomo(tipo);
        if (!result.valido) return notify(result);
        const id = result.fragmento?.id || result.atomo.id;
        return publish(result, { ...state.poses, [id]: p }, before, id);
      },
      conectar(a, b, ordem = get().ordem, ajustar = true) {
        const before = frame();
        // Simulação independente: a química só muda depois de validar a cena.
        const tentativa = MoleculaProgressiva.restaurar(before.molecule);
        const result = nivel === 'intermediario' ? tentativa.conectarPortas(a, b, ordem) : tentativa.conectarAtomos(a, b, ordem);
        if (!result.valido) return notify(result);
        const poses = nivel === 'intermediario' && ajustar ? alinharProgressivo(before.molecule, before.poses, a, b) : before.poses;
        if (!poses) return notify(falha('LAYOUT_COLLISION', 'Mova ou gire o conjunto para deixar espaço para este encaixe.'));
        engine = tentativa;
        return publish(result, poses, before);
      },
      escolherConexao(id) {
        const state = get();
        if (state.origem === id) { set({ origem: null }); return; }
        if (!state.origem) { set({ origem: id, selecao: nivel === 'avancado' ? id : state.selecao, feedback: sucesso('SOURCE_SELECTED', 'Agora escolha o outro ponto da ligação.') }); return; }
        return state.conectar(state.origem, id);
      },
      mover(id, poses) {
        if (!posesValidas(get().molecule, poses)) return notify(falha('LAYOUT_COLLISION', 'Deixe espaço entre os itens e mantenha-os dentro da bancada.'));
        return publish(sucesso('ITEM_MOVED', 'Posição ajustada.'), poses, frame(), id);
      },
      soltar(id, poses, escala = 1) {
        const candidate = encontrarEncaixeProgressivo(get().molecule, poses, id, escala, get().ordem);
        if (!candidate) return get().mover(id, poses);
        const before = frame(); const result = engine.conectarPortas(candidate.portA, candidate.portB, get().ordem);
        return publish(result, candidate.poses, before, id);
      },
      girar() {
        const state = get(); if (!state.selecao) return;
        const center = state.poses[state.selecao]; const poses = structuredClone(state.poses);
        for (const id of conjuntoProgressivo(state.molecule, state.selecao)) {
          const p = poses[id]; const dx = p.x - center.x; const dy = p.y - center.y;
          poses[id] = { x: center.x - dy, y: center.y + dx, angle: ((p.angle || 0) + 90) % 360 };
        }
        return state.mover(state.selecao, poses);
      },
      remover() {
        const state = get(); const before = frame(); const result = engine.remover(state.selecao);
        const poses = { ...state.poses }; delete poses[state.selecao];
        return publish(result, poses, before, null);
      },
      desconectar(id) { const before = frame(); return publish(engine.desconectar(id), get().poses, before); },
      verificar() {
        const validation = engine.validarEstrutura();
        if (!validation.completa) { set({ visualizacao: 'puzzle', resultado: null }); return notify(validation); }
        let poses = get().poses; let aviso = '';
        if (nivel === 'avancado') {
          try {
            const organizadas = organizarMontagemAvancada(get().molecule);
            if (Object.keys(organizadas).some((id) => Math.hypot(organizadas[id].x - poses[id].x, organizadas[id].y - poses[id].y) > .01)) {
              past = [...past.slice(-49), frame()]; future = []; poses = freeze(organizadas);
              set({ podeDesfazer: true, podeRefazer: false });
            }
          } catch { aviso = ' A distribuição da montagem foi preservada porque faltou espaço para organizá-la.'; }
        }
        const correta = estruturasEquivalentes(get().molecule, desafios[get().indice].alvo);
        const result = { ...validation, objetivoCorreto: correta,
          mensagem: correta ? `Você montou ${desafios[get().indice].nome.toLowerCase()}!` : 'A estrutura é válida, mas ainda não corresponde ao desafio.',
          valido: correta, analise: descreverEstrutura(get().molecule) };
        result.mensagem += aviso;
        set({ resultado: result, poses, visualizacao: 'formula', origem: null,
          concluidos: correta ? [...new Set([...get().concluidos, desafios[get().indice].id])] : get().concluidos });
        return notify(result);
      },
      alterarVisualizacao(v) { if (v === 'puzzle' || (v === 'formula' && get().resultado?.completa)) set({ visualizacao: v, origem: null }); },
      desfazer() {
        if (!past.length) return;
        const previous = past.pop(); future.push(frame()); engine = MoleculaProgressiva.restaurar(previous.molecule);
        set({ ...previous, molecule: freeze(previous.molecule), poses: freeze(previous.poses), origem: null, selecao: null, feedback: sucesso('UNDO', 'Alteração desfeita.'), podeDesfazer: !!past.length, podeRefazer: true });
      },
      refazer() {
        if (!future.length) return;
        const next = future.pop(); past.push(frame()); engine = MoleculaProgressiva.restaurar(next.molecule);
        set({ ...next, molecule: freeze(next.molecule), poses: freeze(next.poses), origem: null, selecao: null, feedback: sucesso('REDO', 'Alteração refeita.'), podeDesfazer: true, podeRefazer: !!future.length });
      },
      trocarDesafio(index, professor = false) {
        if (!Number.isInteger(index) || !desafios[index] || (!professor && index > 0 && !get().concluidos.includes(desafios[index - 1].id))) return notify(falha('CHALLENGE_LOCKED', 'Conclua o desafio anterior.'));
        reset(index); return sucesso('CHALLENGE_CHANGED', 'Desafio iniciado.');
      },
      limpar: () => reset(get().indice),
      reiniciar: () => reset(0, []),
    };
  });
}
