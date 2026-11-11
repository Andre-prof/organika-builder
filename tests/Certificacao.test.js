import test from 'node:test';
import assert from 'node:assert/strict';
import { entrar, sair, alunoAtual, completo, registrarConclusao, CATALOGO } from '../src/game/certificacao.js';
import { criarGameStore } from '../src/store/gameStore.js';
test('certificação exige catálogo inteiro, mantém data e separa alunos', () => {
 sair(); registrarConclusao('iniciante', CATALOGO.iniciante[0].id); assert.equal(alunoAtual(), null);
 assert.equal(entrar(' ', 'A'), false); entrar('Teste certificado', 'A');
 criarGameStore().getState().verificar(); assert.deepEqual(alunoAtual().concluidos, {});
 registrarConclusao('iniciante', 'inexistente'); assert.deepEqual(alunoAtual().concluidos, {});
 for (const [nivel, desafios] of Object.entries(CATALOGO)) for (const d of desafios) {
   assert.equal(completo(alunoAtual()), false); registrarConclusao(nivel, d.id);
 }
 assert.equal(completo(alunoAtual()), true); const data = alunoAtual().dataConclusao;
 registrarConclusao('iniciante', CATALOGO.iniciante[0].id); assert.equal(alunoAtual().dataConclusao, data);
 entrar('Outro aluno', 'A'); assert.equal(completo(alunoAtual()), false);
 entrar('Teste certificado', 'B'); assert.equal(completo(alunoAtual()), false);
 entrar(' teste certificado ', 'a'); assert.equal(completo(alunoAtual()), true); sair();
});
