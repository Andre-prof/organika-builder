import { useEffect, useRef, useState } from 'react';
import { useProgressiveStore, progressiveStores } from '../store/useProgressiveStore.js';
import { BLOCOS_INTERMEDIARIOS } from '../domain/MoleculaProgressiva.js';
import { desafiosDoNivel } from '../data/desafiosProgressivos.js';
import { pontoPorta, conjuntoProgressivo, encontrarEncaixeProgressivo } from '../scene/geometriaProgressiva.js';
import { FormulaPlana } from '../components/FormulaPlana.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConectoresPuzzle, CorpoAtomoPuzzle, encaixesAtomo } from '../components/ConectoresPuzzle.jsx';

export const NOMES_NIVEIS = { intermediario: 'Intermediário', avancado: 'Avançado' };
const ordens = { 1: 'simples', 2: 'dupla', 3: 'tripla' };
export const nomePeca = (id) => BLOCOS_INTERMEDIARIOS[id].nome.replace(/2/g, '₂').replace(/3/g, '₃');

/** Mesmo contorno de quebra-cabeça e acabamento usados no nível iniciante. */
function CorpoPeca({ portas }) {
  const topo = portas === 3 ? 'H-13 C-13 -27 13 -27 13 -44' : '';
  const esquerda = portas > 1 ? 'L-66 13 C-49 13 -49 -13 -66 -13' : '';
  return <><path className="piece-body" d={`M-48 -44 ${topo} H48 Q66 -44 66 -26 L66 -13 C83 -13 83 13 66 13 L66 26 Q66 44 48 44 H-48 Q-66 44 -66 26 ${esquerda} L-66 -26 Q-66 -44 -48 -44 Z`} fill="#ccd9e6" stroke="#5d7a98" strokeWidth="1.6" /><path d="M-46 -38 H46" stroke="white" strokeWidth="2" opacity=".55" /></>;
}

function Confirmacao({ tipo, onClose, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="progressive-dialog-title">
    <h2 id="progressive-dialog-title">{tipo === 'help' ? 'Como explorar este nível' : tipo === 'restart' ? 'Recomeçar este nível?' : 'Limpar a montagem?'}</h2>
    {tipo === 'help' ? <><p>Adicione os itens pela paleta. Arraste para reposicionar ou use as setas depois de selecionar. No intermediário, conecte duas portas com a ordem indicada; os H já pertencem às peças.</p><p>No avançado, escolha simples, dupla ou tripla e toque em dois átomos para ligá-los. Adicione cada H pela paleta e conecte-o ao átomo desejado. Uma linha entre dois átomos existentes pode fechar um anel.</p><p>Use os botões abaixo da bancada para conectar sem arrastar. Escape cancela uma conexão; Delete remove o item selecionado. Verificar revela todos os átomos e ligações no mesmo quadro.</p></> : <p>{tipo === 'restart' ? 'A montagem e o progresso deste nível serão apagados. Os outros níveis e o roteiro do professor serão preservados.' : 'Os itens voltarão à paleta. Os desafios já concluídos serão preservados.'}</p>}
    <div className="dialog-actions"><button className="button secondary" onClick={onClose}>{tipo === 'help' ? 'Entendi' : 'Cancelar'}</button>{tipo !== 'help' && <button className="button primary" onClick={onConfirm}>Confirmar</button>}</div>
  </dialog>;
}

function Tracos({ a, b, ordem, gap = 0 }) {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1; const ux = (b.x - a.x) / length; const uy = (b.y - a.y) / length;
  return (ordem === 3 ? [-7, 0, 7] : ordem === 2 ? [-4, 4] : [0]).map((offset) => <line key={offset} x1={a.x + ux * gap - uy * offset} y1={a.y + uy * gap + ux * offset} x2={b.x - ux * gap - uy * offset} y2={b.y - uy * gap + ux * offset} />);
}

export default function LaboratorioProgressivo({ nivel }) {
  const state = useProgressiveStore(nivel); const desafios = desafiosDoNivel(nivel); const challenge = desafios[state.indice];
  const intermediate = nivel === 'intermediario'; const formula = state.visualizacao === 'formula';
  const svg = useRef(null); const pointer = useRef(null); const [preview, setPreview] = useState(null); const [dialog, setDialog] = useState(null);
  const [snap, setSnap] = useState(false);
  const poses = preview || state.poses; const molecule = state.molecule;
  const external = molecule.bonds.filter((b) => !b.internal);
  const items = intermediate ? molecule.fragments : molecule.atoms;
  useEffect(() => { pointer.current = null; setPreview(null); setDialog(null); }, [nivel, state.indice]);
  const boardPoint = (event) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  };
  function start(event, id) {
    if (event.button !== 0 || !event.isPrimary) return;
    const point = boardPoint(event); if (!point) return;
    svg.current.setPointerCapture(event.pointerId);
    pointer.current = { pointerId: event.pointerId, id, x: point.x, y: point.y, poses: structuredClone(state.poses), moved: false };
  }
  function move(event) {
    const drag = pointer.current; if (!drag || event.pointerId !== drag.pointerId) return;
    const point = boardPoint(event); if (!point) return;
    const dx = point.x - drag.x; const dy = point.y - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return;
    drag.moved = true;
    const next = structuredClone(drag.poses);
    for (const id of conjuntoProgressivo(molecule, drag.id)) next[id] = { ...next[id], x: next[id].x + dx, y: next[id].y + dy };
    drag.next = next;
    const matrix = svg.current.getScreenCTM(); const scale = Math.hypot(matrix.a, matrix.b);
    const candidate = encontrarEncaixeProgressivo(molecule, next, drag.id, scale, state.ordem);
    setSnap(!!candidate); setPreview(candidate?.poses || next);
  }
  function end(event) {
    const drag = pointer.current; if (!drag || event.pointerId !== drag.pointerId) return;
    pointer.current = null; setPreview(null); setSnap(false);
    if (svg.current.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId);
    if (!drag.moved) { if (intermediate) state.selecionar(drag.id); else state.escolherConexao(drag.id); return; }
    const matrix = svg.current.getScreenCTM(); state.soltar(drag.id, drag.next, Math.hypot(matrix.a, matrix.b));
  }
  function cancel() { pointer.current = null; setPreview(null); setSnap(false); }
  function keyboard(event, id) {
    if (event.key === 'Escape') { event.preventDefault(); cancel(); state.cancelarConexao(); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (intermediate) state.selecionar(id); else state.escolherConexao(id); return; }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); state.selecionar(id); progressiveStores[nivel].getState().remover(); return; }
    if (event.key.toLowerCase() === 'r' && intermediate) { event.preventDefault(); state.selecionar(id); progressiveStores[nivel].getState().girar(); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!d) return;
    event.preventDefault(); const step = event.shiftKey ? 30 : 10; const next = structuredClone(state.poses);
    for (const key of conjuntoProgressivo(molecule, id)) next[key] = { ...next[key], x: next[key].x + d[0] * step, y: next[key].y + d[1] * step };
    state.mover(id, next);
  }
  const labelAt = (id) => {
    if (intermediate) { const i = molecule.fragments.findIndex((f) => f.atomIds.includes(id)); return `${nomePeca(molecule.fragments[i].templateId)} · peça ${i + 1}`; }
    const i = molecule.atoms.findIndex((a) => a.id === id); return `${molecule.atoms[i].element} · átomo ${i + 1}`;
  };
  return <div className="app progressive-shell" onKeyDown={(event) => { if (event.key === 'Escape') { cancel(); state.cancelarConexao(); } }}>
    <PageHeader active={nivel} nivel={NOMES_NIVEIS[nivel]} onHelp={() => setDialog('help')} onRestart={() => setDialog('restart')} />
    <main>
      <nav className="level-navigation" aria-label="Nível de dificuldade"><a href="#laboratorio">Iniciante</a><a href="#intermediario" aria-current={intermediate ? 'page' : undefined}>Intermediário</a><a href="#avancado" aria-current={!intermediate ? 'page' : undefined}>Avançado</a></nav>
      <section className="intro"><div><div className="eyebrow"><span className="tiny-line" /> APRENDER É CONSTRUIR</div><h1>A química começa com <em>um encaixe.</em></h1><p>Solucionando o quebra-cabeça da Química Orgânica</p></div><div className="intro-note"><Icon name="leaf" size={28} /><span>Um passo de cada vez.<br /><strong>Uma descoberta a cada ligação.</strong></span></div></section>
      <section className="lab" aria-label={`Bancada do modo ${NOMES_NIVEIS[nivel].toLowerCase()}`}>
        <div className="challenge-heading"><div className="challenge-number">{String(state.indice + 1).padStart(2, '0')}<span>/ {desafios.length}</span></div><div className="challenge-copy"><div className="eyebrow">{NOMES_NIVEIS[nivel]} <span>•</span> DESAFIO {state.indice + 1}</div><h2 id="page-title" tabIndex="-1">Vamos montar {challenge.nome.toLowerCase()}?</h2><p>{intermediate ? 'Fragmentos conhecidos, novas ligações. Os H continuam fixos em cada peça.' : 'Construa com átomos individuais. Cada H e cada ligação precisam ser colocados.'}</p></div><button className={`hint-button${state.dica ? ' activated' : ''}`} onClick={state.mostrarDica} aria-expanded={state.dica}><Icon name="bulb" /> Uma dica</button></div>
        {state.dica && <div className="hint-text"><Icon name="bulb" /><p>{challenge.dica}</p></div>}
        <div className="lab-body">
        <aside className="palette"><div className="section-label"><h3>{intermediate ? 'Suas peças' : 'Seus átomos'}</h3><span>{Object.values(challenge.inventario).reduce((a, b) => a + b, 0)}</span></div><p className="panel-description">Toque para adicionar. Arraste na bancada para mover.</p><div className="palette-grid">{Object.entries(challenge.inventario).map(([tipo, total]) => {
          const used = intermediate ? molecule.fragments.filter((f) => f.templateId === tipo).length : molecule.atoms.filter((a) => a.element === tipo).length;
          const orders = intermediate ? BLOCOS_INTERMEDIARIOS[tipo].ports.map((p) => ordens[p.allowedOrders[0]]).join(' + ') : null;
          return <button className={`palette-item${used >= total ? ' exhausted' : ''}`} key={tipo} data-palette-type={tipo} disabled={used >= total || formula} onClick={() => state.adicionar(tipo)} aria-label={`Adicionar ${intermediate ? nomePeca(tipo) : tipo}, ${total - used} disponíveis`}><span className="piece-quantity">×{total - used}</span><svg viewBox="-100 -75 200 150" aria-hidden="true">{intermediate ? <><CorpoPeca portas={BLOCOS_INTERMEDIARIOS[tipo].ports.length} />{BLOCOS_INTERMEDIARIOS[tipo].ports.map((p, pi) => { const count = BLOCOS_INTERMEDIARIOS[tipo].ports.length; const angle = count === 1 ? 0 : [180, 0, -90][pi]; return <ConectoresPuzzle key={pi} x={Math.cos(angle * Math.PI / 180) * (pi === 2 ? 60 : 82)} y={Math.sin(angle * Math.PI / 180) * (pi === 2 ? 60 : 82)} angle={angle} ordem={p.allowedOrders[0]} />; })}</> : <g transform="scale(1.35)"><CorpoAtomoPuzzle element={tipo} />{encaixesAtomo({ bonds: [] }, { id: "preview", element: tipo }, { preview: { x: 0, y: 0 } }, state.ordem).map((p, pi) => <ConectoresPuzzle key={pi} {...p} pequeno />)}</g>}<text textAnchor="middle" dominantBaseline="central" fontSize="40" fill="#26323e" fontWeight="600">{intermediate ? nomePeca(tipo) : tipo}</text></svg><span className="palette-piece-name">{orders || `${{ C: 4, H: 1, O: 2, N: 3 }[tipo]} ${tipo === 'H' ? 'ligação' : 'ligações'}`}</span></button>;
        })}</div><div className="palette-lesson"><span className="lesson-icon"><Icon name="link" /></span><h4>{intermediate ? 'Encaixes com sentido' : 'Cada ligação conta'}</h4><p>{intermediate ? 'Um conector para simples, dois para dupla e três para tripla. Una grupos com a mesma quantidade.' : 'Cada conector representa uma unidade de ligação. C tem 4, O tem 2, N tem 3 e H tem 1. Duplas usam dois; triplas, três.'}</p></div></aside>
        <div className="workspace-column">
          <div className="workspace-topbar"><div><span className="live-dot" /><span>Bancada de montagem</span></div><div className="history-buttons"><button className="icon-button" aria-label="Desfazer" disabled={!state.podeDesfazer} onClick={state.desfazer}><Icon name="undo" size={18} /></button><button className="icon-button" aria-label="Refazer" disabled={!state.podeRefazer} onClick={state.refazer}><Icon name="redo" size={18} /></button><span /><button className="icon-button" aria-label="Limpar" disabled={!items.length} onClick={() => setDialog('clear')}><Icon name="trash" size={18} /></button></div></div>
          <div className="progressive-bond-order" role="group" aria-label="Ordem da ligação"><span>Ligação:</span>{[1, 2, 3].map((n) => <button key={n} disabled={formula} aria-pressed={state.ordem === n} onClick={() => state.definirOrdem(n)}>{n === 1 ? '—' : n === 2 ? '=' : '≡'} {ordens[n]}</button>)}</div>
          <div className="workspace-view-toggle" role="group" aria-label="Representação da molécula"><button aria-pressed={!formula} onClick={() => state.alterarVisualizacao('puzzle')}>{intermediate ? 'Quebra-cabeça' : 'Montagem por átomos'}</button><button aria-pressed={formula} disabled={!state.resultado?.completa} onClick={() => state.alterarVisualizacao('formula')}>Fórmula plana completa</button></div>
          <div className={`workspace-scroll progressive-canvas${formula ? ' formula-mode' : ''}${formula && state.resultado?.analise?.ciclica ? ' ring-formula' : ''}`}>
            {formula ? <FormulaPlana molecule={molecule} onPuzzle={() => state.alterarVisualizacao('puzzle')} /> : <>
              <svg ref={svg} className="progressive-svg" viewBox="0 0 1200 760" role="region" aria-label="Bancada molecular interativa" onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={() => { if (pointer.current) cancel(); }}>
                <defs><pattern id={`progressive-dots-${nivel}`} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#adc5df" /></pattern></defs>
                <rect width="1200" height="760" fill="#eef2f7" /><rect width="1200" height="760" fill={`url(#progressive-dots-${nivel})`} onClick={() => state.selecionar(null)} />
                <g className="progressive-bonds">{external.map((b) => {
                  let a; let c;
                  if (intermediate) {
                    const fs = molecule.fragments.filter((f) => f.ports.some((p) => p.occupiedBondId === b.id));
                    [a, c] = fs.map((f) => pontoPorta(f, f.ports.findIndex((p) => p.occupiedBondId === b.id), poses[f.id]));
                  } else { a = poses[b.a]; c = poses[b.b]; }
                  return <g key={b.id} data-scene-bond={b.id} data-bond-order={b.order}><Tracos a={a} b={c} ordem={b.order} gap={intermediate ? 10 : 26} /></g>;
                })}</g>
                {intermediate ? molecule.fragments.map((f, i) => {
                  const p = poses[f.id];
                  return <g key={f.id} data-fragment-id={f.id} className={`progressive-piece${state.selecao === f.id ? ' selected' : ''}`} role="button" tabIndex="0" aria-label={`${nomePeca(f.templateId)}, peça ${i + 1}`} onPointerDown={(e) => start(e, f.id)} onKeyDown={(e) => { if (e.target === e.currentTarget) keyboard(e, f.id); }}>
                    <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle || 0})`}><CorpoPeca portas={f.ports.length} /><text textAnchor="middle" dominantBaseline="central" transform={`rotate(${-(p.angle || 0)})`}>{nomePeca(f.templateId)}</text></g>
                    {f.ports.map((port, index) => {
                      const point = pontoPorta(f, index, p); const occupied = !!port.occupiedBondId;
                      return <g key={port.id} data-port-id={port.id} className={`progressive-port${occupied ? ' occupied' : ''}${state.origem === port.id ? ' source' : ''}`} role="button" tabIndex={occupied ? -1 : 0} aria-disabled={occupied} aria-label={`Porta ${index + 1} ${ordens[port.allowedOrders[0]]}, peça ${i + 1}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); if (!occupied) state.escolherConexao(port.id); }} onKeyDown={(e) => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (!occupied) state.escolherConexao(port.id); } }}>
                        <circle cx={point.x} cy={point.y} r="28" fill="transparent" stroke="none" /><ConectoresPuzzle x={point.x} y={point.y} angle={Math.atan2(point.ny, point.nx) * 180 / Math.PI} ordem={port.allowedOrders[0]} ocupado={occupied} />
                      </g>;
                    })}
                  </g>;
                }) : molecule.atoms.map((a, i) => <g key={a.id} data-atom-id={a.id} data-element={a.element} className={`progressive-atom element-${a.element}${state.origem === a.id ? ' source' : ''}${state.selecao === a.id ? ' selected' : ''}`} role="button" tabIndex="0" aria-label={`${a.element}, átomo ${i + 1}`} transform={`translate(${poses[a.id].x} ${poses[a.id].y})`} onPointerDown={(e) => start(e, a.id)} onKeyDown={(e) => keyboard(e, a.id)}><CorpoAtomoPuzzle element={a.element} />{encaixesAtomo(molecule, a, poses, state.ordem).map((p, pi) => <ConectoresPuzzle key={pi} {...p} pequeno />)}<text textAnchor="middle" dominantBaseline="central">{a.element}</text><text className="atom-index" x="40" y="44" textAnchor="start">{i + 1}</text></g>)}
              </svg>
              {!items.length && <div className="progressive-empty"><h3>{intermediate ? 'Uma nova ligação, uma nova descoberta.' : 'Do átomo à molécula.'}</h3><p>Comece adicionando {intermediate ? 'uma peça' : 'um átomo'} pela paleta.</p></div>}
              {snap && <div className="snap-label">Solte para encaixar a ligação {ordens[state.ordem]}</div>}
            </>}
          </div>
          <div className="workspace-actions"><div className="assembly-status"><span className={state.resultado?.completa ? 'status-dot complete' : 'status-dot'} /><span>{state.resultado?.completa ? 'Estrutura verificada' : `${molecule.atoms.length} átomos · ${external.length} ligações ${intermediate ? 'entre peças' : ''}`}</span></div><button className="button primary" disabled={!items.length} onClick={state.verificar}>Verificar estrutura <Icon name="arrow" size={18} /></button></div>
        </div>
        </div>
      <div className={`feedback-bar progressive-feedback${state.feedback?.valido === false ? ' has-error' : ''}${state.resultado?.objetivoCorreto ? ' has-success success' : ''}`}><span className="feedback-symbol"><Icon name={state.resultado?.objetivoCorreto ? 'check' : state.feedback?.valido === false ? 'help' : 'leaf'} size={22} /></span><div role="status" aria-live="polite"><strong>{state.feedback?.mensagem || 'Aqui, cada tentativa ensina.'}</strong><p>{state.resultado?.analise ? `${state.resultado.analise.formula} · ${state.resultado.analise.ciclica ? 'Com anel' : 'Cadeia aberta'} · ${state.resultado.analise.funcoes.join(' · ')}` : 'Explore à vontade: o jogo ajuda você a respeitar as ligações.'}</p></div>{state.resultado?.objetivoCorreto && state.indice < desafios.length - 1 && <button className="button secondary" onClick={() => state.trocarDesafio(state.indice + 1)}>Próximo desafio <Icon name="arrow" size={16} /></button>}</div>
      </section>
      {!formula && items.length > 0 && <section className="assembly-details progressive-controls" aria-label="Controles da montagem"><div className="progressive-selection"><strong>{state.origem ? 'Escolha o outro ponto para conectar' : 'Conecte sem arrastar'}</strong><button className="button secondary small" disabled={!state.origem} onClick={state.cancelarConexao}>Cancelar conexão</button>{intermediate && <button className="button secondary small" disabled={!state.selecao} onClick={state.girar}>Girar conjunto</button>}<button className="button secondary small" disabled={!state.selecao} onClick={state.remover}>Devolver seleção</button></div><p>{intermediate ? 'Escolha duas portas compatíveis. O conjunto se alinha automaticamente se houver espaço.' : 'Escolha a ordem acima e depois dois átomos. Para mover, arraste ou use as setas no átomo focado.'}</p><div className="progressive-connection-list">{intermediate ? molecule.fragments.flatMap((f, i) => f.ports.map((p, pi) => !p.occupiedBondId && <button key={p.id} aria-pressed={state.origem === p.id} onClick={() => state.escolherConexao(p.id)}>{nomePeca(f.templateId)} · peça {i + 1} · porta {pi + 1} <strong>{ordens[p.allowedOrders[0]]}</strong></button>)) : molecule.atoms.map((a, i) => <button key={a.id} aria-pressed={state.origem === a.id} onClick={() => state.escolherConexao(a.id)}>{a.element} · átomo {i + 1}</button>)}</div><div className="progressive-remove-bonds">{external.map((b, i) => <button key={b.id} onClick={() => state.desconectar(b.id)}>Desconectar {i + 1}: {labelAt(b.a)} {b.order === 3 ? '≡' : b.order === 2 ? '=' : '—'} {labelAt(b.b)}</button>)}</div></section>}
      <section className="journey" aria-labelledby="progressive-journey-title"><div className="journey-heading"><div><span className="eyebrow">SEU CAMINHO DE DESCOBERTAS</span><h3 id="progressive-journey-title">Uma molécula de cada vez.</h3></div><span>{state.concluidos.length} de {desafios.length} concluídos</span></div><div className="journey-steps">{desafios.map((d, i) => <button className={`journey-step${i === state.indice ? ' current' : ''}${state.concluidos.includes(d.id) ? ' finished' : ''}`} key={d.id} disabled={i > 0 && !state.concluidos.includes(desafios[i - 1].id)} aria-current={i === state.indice ? 'step' : undefined} onClick={() => { if (i !== state.indice) state.trocarDesafio(i); }}><span>{state.concluidos.includes(d.id) ? <Icon name="check" size={16} /> : i === 0 || state.concluidos.includes(desafios[i - 1].id) ? String(i + 1).padStart(2, '0') : <Icon name="lock" size={13} />}</span><small>{d.nome}</small></button>)}</div></section>
      <p className="progressive-session-note">As montagens dos três níveis ficam guardadas enquanto esta página estiver aberta. Você pode alternar de nível e continuar de onde parou.</p>
      <footer className="site-footer"><span>Orgânika Builder <span>·</span> Química que faz sentido.</span><span>Feito para explorar, peça por peça.</span></footer>
    </main>
    {dialog && <Confirmacao tipo={dialog} onClose={() => setDialog(null)} onConfirm={() => { if (dialog === 'restart') { state.reiniciar(); window.location.hash = 'inicio'; } else state.limpar(); setDialog(null); }} />}
  </div>;
}
