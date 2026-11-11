import { DESAFIOS } from '../data/desafios.js';
import { desafiosDoNivel } from '../data/desafiosProgressivos.js';
export const CATALOGO = { iniciante: DESAFIOS, intermediario: desafiosDoNivel('intermediario'), avancado: desafiosDoNivel('avancado') };
export const CHAVE = 'organika-alunos-v1';
export function completo(aluno) {
  return !!aluno?.nome && !!aluno?.turma && Object.entries(CATALOGO).every(([nivel, desafios]) => desafios.every(d => aluno.concluidos?.[nivel]?.includes(d.id)));
}
let dados;
try { dados = JSON.parse(globalThis.localStorage?.getItem(CHAVE) || '{}'); } catch { dados = {}; }
if (!dados || typeof dados !== 'object' || Array.isArray(dados)) dados = {};
dados.alunos ||= {};
let aviso = '';
const listeners = new Set();
export const observar = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const alunoAtual = () => dados.alunos[dados.ativo] || null;
export const avisoSalvamento = () => aviso;
function salvar() {
  try { globalThis.localStorage?.setItem(CHAVE, JSON.stringify(dados)); aviso = ''; }
  catch { aviso = 'Não foi possível salvar neste navegador. Mantenha esta página aberta para preservar seu progresso.'; }
  listeners.forEach(fn => fn());
}
export function entrar(nome, turma) {
  nome = nome.trim().slice(0, 120); turma = turma.trim().slice(0, 80);
  if (!nome || !turma) return false;
  const id = JSON.stringify([nome.toLocaleLowerCase('pt-BR'), turma.toLocaleLowerCase('pt-BR')]);
  dados.alunos[id] ||= { nome, turma, concluidos: {} };
  dados.ativo = id; salvar(); return true;
}
export function sair() { dados.ativo = null; salvar(); }
export function registrarConclusao(nivel, id) {
  const aluno = alunoAtual();
  if (!aluno || !CATALOGO[nivel]?.some(d => d.id === id)) return;
  aluno.concluidos[nivel] = [...new Set([...(aluno.concluidos[nivel] || []), id])];
  if (completo(aluno) && !aluno.dataConclusao) aluno.dataConclusao = new Date().toISOString();
  salvar();
}
