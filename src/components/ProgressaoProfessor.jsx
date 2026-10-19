import { useState } from 'react';
import { desafiosDoNivel } from '../data/desafiosProgressivos.js';
import { descreverEstrutura } from '../game/progressao.js';
import { progressiveStores } from '../store/useProgressiveStore.js';
import { FormulaPlana } from './FormulaPlana.jsx';

export function ProgressaoProfessor() {
  const [nivel, setNivel] = useState('intermediario'); const [preview, setPreview] = useState(null);
  return <section className="progressive-teacher" aria-labelledby="progressive-teacher-title"><h2 id="progressive-teacher-title">Intermediário e avançado</h2><p>Consulte os objetivos e a fórmula completa. Você pode iniciar qualquer desafio destes níveis para trabalhar com a turma.</p><div className="level-navigation" role="group" aria-label="Nível dos novos gabaritos">{[['intermediario', 'Intermediário'], ['avancado', 'Avançado']].map(([id, nome]) => <button className="button secondary" key={id} aria-pressed={nivel === id} onClick={() => { setNivel(id); setPreview(null); }}>{nome}</button>)}</div><div className="progressive-teacher-list">{desafiosDoNivel(nivel).map((d, i) => {
    const info = descreverEstrutura(d.alvo);
    return <article key={d.id}><div><h3>{String(i + 1).padStart(2, '0')} · {d.nome}</h3><p>{info.formula} · {info.ciclica ? 'Estrutura cíclica' : 'Cadeia aberta'}{info.funcoes.length ? ` · ${info.funcoes.join(' · ')}` : ''}</p></div><div><button className="button secondary small" aria-expanded={preview === d.id} onClick={() => setPreview(preview === d.id ? null : d.id)}>Ver gabarito de {d.nome}</button><button className="button primary small" onClick={() => { progressiveStores[nivel].getState().trocarDesafio(i, true); window.location.hash = nivel; }}>Iniciar {d.nome}</button></div>{preview === d.id && <div className="progressive-teacher-answer"><p><strong>Critério:</strong> grafo equivalente ao gabarito, um componente e todas as valências completas, incluindo H explícitos.</p><p>{d.dica}</p><div className="workspace-scroll formula-mode"><FormulaPlana molecule={d.alvo} onPuzzle={() => setPreview(null)} /></div></div>}</article>;
  })}</div><p>O roteiro salvo e a impressão da seção acima continuam destinados ao iniciante. Nos novos níveis, a atividade é iniciada individualmente pelos botões desta seção.</p></section>;
}
