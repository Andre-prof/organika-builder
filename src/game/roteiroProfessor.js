import { DESAFIOS } from '../data/desafios.js';

export const CHAVE_ROTEIRO = 'organika.roteiro-professor.v1';
export const TODOS_DESAFIOS = DESAFIOS.map((d) => d.id);

/** Roteiros referenciam apenas o catálogo revisado; não importam código ou grafos. */
export function validarRoteiro(ids) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > DESAFIOS.length
      || ids.some((id) => typeof id !== 'string' || !TODOS_DESAFIOS.includes(id))
      || new Set(ids).size !== ids.length) {
    return { valido: false, codigo: 'INVALID_ROSTER', mensagem: 'Selecione ao menos um desafio, sem repetições, entre os dez disponíveis.' };
  }
  return { valido: true, ids: TODOS_DESAFIOS.filter((id) => ids.includes(id)) };
}

export function serializarRoteiro(ids) {
  const result = validarRoteiro(ids);
  if (!result.valido) throw new Error(result.mensagem);
  return JSON.stringify({ tipo: 'organika-roteiro', versao: 1, desafiosIds: result.ids }, null, 2);
}

export function importarRoteiro(text) {
  if (typeof text !== 'string' || text.length > 65536) throw new Error('O roteiro deve ser um arquivo JSON de até 64 KB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Não foi possível ler o JSON. Use um roteiro exportado pelo Orgânika.'); }
  if (!data || data.tipo !== 'organika-roteiro' || data.versao !== 1) throw new Error('Este arquivo não é um roteiro compatível com o Orgânika.');
  const result = validarRoteiro(data.desafiosIds);
  if (!result.valido) throw new Error(result.mensagem);
  return result.ids;
}

/** Falhas de armazenamento não bloqueiam a preparação da atividade. */
export function lerRoteiroSalvo(storage) {
  try {
    const saved = storage.getItem(CHAVE_ROTEIRO);
    return { ids: saved ? importarRoteiro(saved) : [...TODOS_DESAFIOS], aviso: null };
  } catch {
    return { ids: [...TODOS_DESAFIOS], aviso: 'Não foi possível recuperar o roteiro salvo. Os dez desafios continuam disponíveis.' };
  }
}

export function salvarRoteiro(storage, ids) {
  const content = serializarRoteiro(ids);
  try { storage.setItem(CHAVE_ROTEIRO, content); } catch { throw new Error('Não foi possível salvar neste navegador. Você ainda pode exportar o roteiro.'); }
}
