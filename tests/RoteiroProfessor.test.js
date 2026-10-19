import test from 'node:test';
import assert from 'node:assert/strict';
import { criarGameStore } from '../src/store/gameStore.js';
import { CHAVE_ROTEIRO, TODOS_DESAFIOS, validarRoteiro, serializarRoteiro, importarRoteiro, lerRoteiroSalvo, salvarRoteiro } from '../src/game/roteiroProfessor.js';

function memoria() {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
}

test('um roteiro selecionado começa em seu primeiro desafio, sem exigir os omitidos', () => {
  const store = criarGameStore();
  assert.equal(store.getState().iniciarSessao(['butan-2-ol', 'etanol', 'acido-propanoico']).valido, true);
  assert.deepEqual(store.getState().roteiroIds, ['etanol', 'acido-propanoico', 'butan-2-ol']);
  assert.equal(store.getState().desafioId, 'etanol');
  assert.equal(store.getState().trocarDesafio('acido-propanoico').codigo, 'CHALLENGE_LOCKED');
  assert.equal(store.getState().trocarDesafio('etano').codigo, 'CHALLENGE_OUTSIDE_ROSTER');
  const ch3 = store.getState().adicionarPeca('ch3', { x: 330, y: 280, angle: 0 }).fragmento;
  const ch2 = store.getState().adicionarPeca('ch2', { x: 160, y: 450, angle: 0 }).fragmento;
  assert.equal(store.getState().conectarPortas(ch2.ports[0].id, ch3.ports[0].id).valido, true);
  const oh = store.getState().adicionarPeca('oh', { x: 160, y: 450, angle: 0 }).fragmento;
  assert.equal(store.getState().conectarPortas(oh.ports[0].id, ch2.ports[1].id).valido, true);
  assert.equal(store.getState().verificar().objetivoCorreto, true);
  store.getState().trocarDesafio('acido-propanoico');
  assert.equal(store.getState().desafioId, 'acido-propanoico');
});

test('recomeço limpa montagem, progresso, seleção e históricos sem apagar roteiro salvo', () => {
  const storage = memoria(); salvarRoteiro(storage, ['etanol']);
  const store = criarGameStore(); store.getState().iniciarSessao(['etano']);
  const a = store.getState().adicionarPeca('ch3', { x: 300, y: 250, angle: 0 }).fragmento;
  const b = store.getState().adicionarPeca('ch3', { x: 440, y: 250, angle: 0 }, true).fragmento;
  assert.ok(a && b); store.getState().verificar();
  assert.deepEqual(store.getState().concluidos, ['etano']);
  store.getState().iniciarSessao();
  const result = store.getState();
  assert.equal(result.molecule.fragments.length, 0); assert.equal(result.molecule.revision, 0);
  assert.equal(result.selecao, null); assert.equal(result.portaOrigem, null); assert.equal(result.resultado, null);
  assert.deepEqual(result.concluidos, []); assert.deepEqual(result.poses, {});
  assert.equal(result.podeDesfazer, false); assert.equal(result.podeRefazer, false);
  result.desfazer(); assert.equal(store.getState().molecule.fragments.length, 0);
  assert.deepEqual(result.roteiroIds, TODOS_DESAFIOS);
  assert.deepEqual(lerRoteiroSalvo(storage).ids, ['etanol']);
});

test('iniciar um roteiro inválido preserva a atividade existente', () => {
  const store = criarGameStore(); store.getState().adicionarPeca('ch3');
  const before = store.getState();
  assert.equal(store.getState().iniciarSessao([]).codigo, 'INVALID_ROSTER');
  assert.equal(store.getState().molecule, before.molecule);
  assert.deepEqual(store.getState().roteiroIds, before.roteiroIds);
  assert.equal(store.getState().podeDesfazer, true);
});

test('roteiros são exportados, importados e salvos sem incluir montagem ou dados de alunos', () => {
  const content = serializarRoteiro(['etanol', 'etano']);
  assert.deepEqual(JSON.parse(content), { tipo: 'organika-roteiro', versao: 1, desafiosIds: ['etano', 'etanol'] });
  assert.deepEqual(importarRoteiro(content), ['etano', 'etanol']);
  const storage = memoria(); salvarRoteiro(storage, ['etanol']);
  assert.deepEqual(lerRoteiroSalvo(storage), { ids: ['etanol'], aviso: null });
  assert.ok(storage.getItem(CHAVE_ROTEIRO));
});

test('rejeita arquivo inválido, versão desconhecida, IDs duplicados e desafios fora do catálogo', () => {
  for (const ids of [[], ['etano', 'etano'], ['benzeno'], [1], null, {}]) assert.equal(validarRoteiro(ids).valido, false);
  assert.throws(() => importarRoteiro('não é JSON'));
  assert.throws(() => importarRoteiro(JSON.stringify({ tipo: 'organika-roteiro', versao: 2, desafiosIds: ['etano'] })));
  assert.throws(() => importarRoteiro(' '.repeat(65537)));
});

test('falha ou corrupção no armazenamento não impede uma nova aula', () => {
  const blocked = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('sem espaço'); } };
  assert.deepEqual(lerRoteiroSalvo(blocked).ids, TODOS_DESAFIOS);
  assert.ok(lerRoteiroSalvo(blocked).aviso);
  assert.throws(() => salvarRoteiro(blocked, ['etano']), /Não foi possível salvar/);
  const corrupt = memoria(); corrupt.setItem(CHAVE_ROTEIRO, '{}');
  assert.deepEqual(lerRoteiroSalvo(corrupt).ids, TODOS_DESAFIOS);
});
