import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useGameStore, gameStore } from './store/useGameStore.js';
import { BLOCOS } from './data/blocos.js';
import { obterDesafio } from './data/desafios.js';
import { contarCarbonos } from './game/ValidadorEstrutura.js';
import { Icon } from './components/Icon.jsx';
import { Peca, DesenhoPeca } from './components/Peca.jsx';
import { useArraste } from './hooks/useArraste.js';
import { componenteDe, portaNaCena } from './scene/geometria.js';
import { PageHeader } from './components/PageHeader.jsx';
import { FichaAtividade } from './components/FichaAtividade.jsx';
import Inicio from './pages/Inicio.jsx';
import Professor from './pages/Professor.jsx';
import { FormulaPlana } from './components/FormulaPlana.jsx';
import LaboratorioProgressivo from './pages/LaboratorioProgressivo.jsx';
import './progressive.css';

function EmptyBoard() {
  return <g className="empty-board" aria-hidden="true">
    <circle cx="480" cy="215" r="105" fill="#e0e8f0" />
    <g transform="translate(346 155) rotate(-12 80 60)"><DesenhoPeca templateId="ch3" ghost /></g>
    <g transform="translate(487 169) rotate(10 80 60)" opacity=".7"><DesenhoPeca templateId="ch3" ghost /></g>
    <path d="m480 158 6-14m14 26 15-4m-25-22 9-9" stroke="#6192c3" strokeWidth="2" strokeLinecap="round" />
  </g>;
}

function Dialog({ kind, onClose, onConfirm }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current; dialog.showModal();
    const close = (event) => { event.preventDefault(); closeRef.current(); }; dialog.addEventListener('cancel', close);
    return () => dialog.removeEventListener('cancel', close);
  }, []);
  const confirmation = kind !== 'help';
  const sessionReset = kind === 'restart' || kind === 'new-session';
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <button className="icon-button dialog-close" aria-label="Fechar" onClick={onClose}><Icon name="close" /></button>
    <span className="eyebrow">{confirmation ? 'UMA NOVA TENTATIVA' : 'SEU PRIMEIRO ENCAIXE'}</span><h2 id="dialog-title">{kind === 'restart' ? 'Recomeçar a atividade?' : kind === 'new-session' ? 'Iniciar uma nova atividade?' : kind === 'reset' ? 'Limpar esta bancada?' : 'Um pequeno guia para explorar.'}</h2>
    {confirmation ? <><p>{sessionReset ? 'A montagem, o histórico e as conclusões desta sessão serão limpos. O roteiro salvo na área do professor permanece neste navegador.' : 'A montagem atual será retirada da bancada. Seu progresso nos desafios fica guardado nesta sessão.'}</p>{kind === 'restart' && <p>Você voltará à página inicial para escolher como começar.</p>}<div className="dialog-actions"><button className="button secondary" onClick={onClose}>Continuar montando</button><button className="button primary" onClick={onConfirm}>{kind === 'restart' ? 'Recomeçar e voltar ao início' : kind === 'new-session' ? 'Iniciar nova atividade' : 'Limpar bancada'}</button></div></> : <>
      <ol className="help-steps"><li><strong>Escolha suas peças.</strong><span>Arraste da paleta para a bancada ou toque para adicionar.</span></li><li><strong>Aproxime os pontos.</strong><span>Os encaixes se alinham sozinhos. Você também pode selecionar duas portas livres para conectá-las.</span></li><li><strong>Explore sem receio.</strong><span>Selecione uma peça para girar, devolver ou mover o conjunto. Ligações impossíveis são impedidas.</span></li><li><strong>Confira sua descoberta.</strong><span>Use Verificar estrutura para saber se você cumpriu o desafio.</span></li></ol>
      <p className="keyboard-help">No teclado: Tab navega, Enter seleciona, setas movem o conjunto, R gira, Delete devolve e Escape cancela.</p><button className="button primary" onClick={onClose}>Vamos experimentar <Icon name="arrow" /></button>
    </>}
  </dialog>;
}

function Laboratorio({ onRestart }) {
  const state = useGameStore((s) => s);
  const challenge = obterDesafio(state.desafioId);
  const challenges = state.roteiroIds.map(obterDesafio);
  const challengeIndex = challenges.findIndex((d) => d.id === state.desafioId);
  const board = useRef(null); const [scale, setScale] = useState(1);
  const [dialog, setDialog] = useState(null);
  const drag = useArraste(board);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const matrix = board.current?.getScreenCTM();
      if (matrix) setScale(Math.hypot(matrix.a, matrix.b));
    });
    observer.observe(board.current); return () => observer.disconnect();
  }, []);
  const selected = state.molecule.fragments.find((f) => f.id === state.selecao);
  const bonds = state.molecule.bonds.filter((b) => !b.internal);
  const carbonos = contarCarbonos(state.molecule);
  const freePorts = state.molecule.fragments.flatMap((f) => f.ports).filter((p) => !p.occupiedBondId).length;
  const visualPoses = drag.drag?.candidate?.portA ? drag.drag.candidate.poses : drag.drag?.poses ?? state.poses;
  const preview = drag.drag;
  const ghostPose = preview?.kind === 'palette' ? (preview.candidate?.portA ? preview.candidate.poses[preview.fragment.id] : preview.pose) : null;
  const successful = state.resultado?.objetivoCorreto;
  const showFormula = state.visualizacao === 'formula' && state.resultado?.completa;
  const next = challenges[challengeIndex + 1];
  function keyboard(event) {
    if (event.target.closest('select, input, textarea')) return;
    if (event.target.closest('button') && event.key.toLowerCase() !== 'r') return;
    const current = gameStore.getState();
    if (current.visualizacao === 'formula') return;
    if (event.key === 'Escape') { current.selecionar(null); return; }
    if (!current.selecao) return;
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); current.girarSelecionada(); }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); current.removerSelecionada(); }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); const step = event.shiftKey ? 30 : 10;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      const poses = { ...current.poses };
      for (const id of componenteDe(current.molecule, current.selecao)) poses[id] = { ...poses[id], x: poses[id].x + dx, y: poses[id].y + dy };
      current.moverConjunto(current.selecao, poses, false);
    }
  }
  return <div className="app" id="inicio">
    <PageHeader active="laboratorio" onHelp={() => setDialog('help')} onRestart={() => setDialog('restart')} />
    <main>
      <nav className="level-navigation" aria-label="Nível de dificuldade"><a href="#laboratorio" aria-current="page">Iniciante</a><a href="#intermediario">Intermediário</a><a href="#avancado">Avançado</a></nav>
      <section className="intro"><div><div className="eyebrow"><span className="tiny-line" /> APRENDER É CONSTRUIR</div><h1>A química começa com <em>um encaixe.</em></h1><p>Solucionando o quebra-cabeça da Química Orgânica</p></div><div className="intro-note"><Icon name="leaf" size={28} /><span>Um passo de cada vez.<br /><strong>Uma descoberta a cada ligação.</strong></span></div></section>
      <section className="lab" id="laboratorio" aria-labelledby="challenge-title">
        <div className="challenge-heading"><div className="challenge-number">{String(challengeIndex + 1).padStart(2, '0')}<span>/ {challenges.length}</span></div><div className="challenge-copy"><div className="eyebrow">{challenge.categoria} <span>•</span> DESAFIO {challengeIndex + 1}</div><h2 id="challenge-title">Vamos montar o {challenge.nome.toLowerCase()}?</h2><p>{challenge.enunciado}</p></div><button className={`hint-button${state.dicaVisivel ? ' activated' : ''}`} onClick={state.mostrarDica} aria-expanded={state.dicaVisivel}><Icon name="bulb" /> Uma dica</button></div>
        {state.dicaVisivel && <div className="hint-text"><Icon name="bulb" /><p>{challenge.dica}</p></div>}
        <div className="lab-body">
          <aside className={`palette${showFormula ? ' formula-palette' : ''}`} aria-labelledby="palette-title"><div className="section-label"><h3 id="palette-title">{showFormula ? 'Peças da montagem' : 'Suas peças'}</h3><span>{showFormula ? state.molecule.fragments.length : Object.values(challenge.inventario).reduce((a, b) => a + b, 0)}</span></div><p className="panel-description">{showFormula ? 'As peças que deram origem à estrutura.' : 'Arraste ou toque para adicionar.'}</p>
            <div className="palette-grid">{Object.entries(challenge.inventario).filter(([id]) => !showFormula || state.molecule.fragments.some((f) => f.templateId === id)).map(([id, total]) => {
              const used = state.molecule.fragments.filter((f) => f.templateId === id).length; const left = total - used;
              return <button className={`palette-item${left === 0 && !showFormula ? ' exhausted' : ''}`} key={id} disabled={!left || showFormula} aria-label={showFormula ? `${BLOCOS[id].nome}, ${used} peças na montagem` : `Adicionar ${BLOCOS[id].nome}, ${left} disponíveis`}
                onPointerDown={(event) => drag.iniciar(event, { kind: 'palette', templateId: id })}
                onClick={() => { if (!drag.cliqueDepoisDeArraste()) state.adicionarPeca(id); }}>
                <span className="piece-quantity">×{showFormula ? used : left}</span><svg viewBox="0 0 160 120" aria-hidden="true"><DesenhoPeca templateId={id} /></svg><span className="palette-piece-name">{id === 'oh' ? 'Hidroxila' : id === 'cho' ? 'Aldeído' : id === 'cooh' ? 'Carboxila' : `${BLOCOS[id].ports.length} ${BLOCOS[id].ports.length === 1 ? 'conexão' : 'conexões'}`}</span>
              </button>;
            })}</div>
            {showFormula && <p className="palette-edit-note">Para editar, volte ao <button onClick={() => state.alterarVisualizacao('puzzle')}>quebra-cabeça</button>.</p>}
            <div className="upcoming"><span>MAIS ADIANTE</span><div><span>CH₂</span><span>OH</span><span>COOH</span><Icon name="lock" size={13} /></div><p>Novas peças, novas possibilidades.</p></div>
            <div className="palette-lesson"><span className="lesson-icon"><Icon name="link" /></span><h4>Encaixes com sentido</h4><p>Cada ponto é uma conexão disponível. Os hidrogênios já fazem parte da sua peça.</p></div>
          </aside>
          <div className="workspace-column" onKeyDown={keyboard}>
            <div className="workspace-topbar"><div><span className="live-dot" /><span>Bancada de montagem</span><small>{state.molecule.fragments.length} peças <span>·</span> {bonds.length} ligações</small></div><div className="history-buttons"><button className="icon-button" aria-label="Desfazer" disabled={!state.podeDesfazer} onClick={state.desfazer}><Icon name="undo" size={18} /></button><button className="icon-button" aria-label="Refazer" disabled={!state.podeRefazer} onClick={state.refazer}><Icon name="redo" size={18} /></button><span /><button className="icon-button" aria-label="Reiniciar bancada" disabled={!state.molecule.fragments.length} onClick={() => setDialog('reset')}><Icon name="trash" size={18} /></button></div></div>
            <div className="workspace-view-toggle" role="group" aria-label="Representação da molécula"><button aria-pressed={!showFormula} onClick={() => state.alterarVisualizacao('puzzle')}>Quebra-cabeça</button><button aria-pressed={showFormula} disabled={!state.resultado?.completa} onClick={() => state.alterarVisualizacao('formula')}>Fórmula plana completa</button></div>
            <div className={`workspace-scroll${showFormula ? ' formula-mode' : ''}${drag.drag ? ' is-dragging' : ''}`}>
              <svg ref={board} viewBox="0 0 960 560" className="workspace-svg" style={showFormula ? { display: 'none' } : undefined} role="region" aria-label="Bancada de montagem molecular">
                <defs><pattern id="dots" width="23" height="23" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".85" fill="#91a6bb" opacity=".38" /></pattern><filter id="piece-shadow" x="-30%" y="-50%" width="160%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#37495b" floodOpacity=".09" /></filter></defs>
                <rect width="960" height="560" fill="#eef2f7" onClick={() => state.selecionar(null)} /><rect width="960" height="560" fill="url(#dots)" pointerEvents="none" />
                {state.molecule.fragments.map((fragment) => <Peca key={fragment.id} fragment={fragment} pose={visualPoses[fragment.id]} selected={state.selecao === fragment.id} origem={state.portaOrigem} scale={scale}
                  destino={preview?.candidate?.portB} onDrag={drag.iniciar} onSelect={(id) => { if (!drag.cliqueDepoisDeArraste()) state.selecionar(id); }} onPort={state.selecionarPorta} />)}
                {bonds.map((bond) => {
                  const f = state.molecule.fragments.find((fragment) => fragment.ports.some((port) => port.occupiedBondId === bond.id));
                  const point = portaNaCena(f, f.ports.findIndex((port) => port.occupiedBondId === bond.id), visualPoses[f.id]);
                  return <circle key={bond.id} className="junction-marker" cx={point.x} cy={point.y} r={Math.max(5 / scale, 5)} fill="#3978ba" stroke="white" strokeWidth="1.5" pointerEvents="none"><title>Ligação formada</title></circle>;
                })}
                {ghostPose && <g className="palette-ghost" transform={`translate(${ghostPose.x} ${ghostPose.y}) rotate(${ghostPose.angle}) translate(-80 -60)`} opacity=".85" pointerEvents="none"><DesenhoPeca templateId={preview.templateId} angle={ghostPose.angle} ghost /></g>}
              </svg>
              {showFormula && <FormulaPlana molecule={state.molecule} onPuzzle={() => state.alterarVisualizacao('puzzle')} />}
              {!showFormula && !state.molecule.fragments.length && !drag.drag && <div className="empty-overlay" aria-hidden="true"><svg viewBox="320 100 360 225"><EmptyBoard /></svg><h4>Toda molécula começa<br className="mobile-break" /> com uma peça.</h4><p>Arraste uma peça para cá e descubra os encaixes.<br />Você também pode tocar nas peças para adicioná-las.</p></div>}
              {drag.drag?.candidate?.portA && <div className="snap-label"><Icon name="link" size={16} /> Solte para encaixar</div>}
              {drag.drag?.candidate?.ambiguo && <div className="snap-label">Escolha as portas para conectar</div>}
              {!showFormula && selected && !drag.drag && <div className="workspace-rotation-tool"><span>{BLOCOS[selected.templateId].nome}</span><button className="button small secondary" onClick={state.girarSelecionada} aria-label={componenteDe(state.molecule, selected.id).length === 1 ? 'Girar peça selecionada' : 'Girar conjunto selecionado'}><Icon name="rotate" size={17} />{componenteDe(state.molecule, selected.id).length === 1 ? 'Girar peça' : 'Girar conjunto'}<kbd>R</kbd></button></div>}
              {!showFormula && <div className="workspace-caption connector-legend"><span><i className="legend-free" /> Conector livre</span><span><i className="legend-connected" /> Ligação formada</span></div>}
            </div>
            <div className="workspace-actions"><div className="assembly-status"><span className={state.validacao.completa ? 'status-dot complete' : 'status-dot'} /><span>{state.resultado?.completa ? 'Estrutura verificada' : state.validacao.completa ? 'Pronta para verificar' : state.molecule.fragments.length ? `${freePorts} ${freePorts === 1 ? 'conexão livre' : 'conexões livres'}` : 'Sua próxima descoberta está aqui'}</span></div><button className="button primary" disabled={!state.molecule.fragments.length} onClick={state.verificar}>Verificar estrutura <Icon name="arrow" size={19} /></button></div>
          </div>
        </div>
        <div className={`feedback-bar${state.feedback?.valido === false ? ' has-error' : ''}${successful ? ' has-success' : ''}`}><span className="feedback-symbol"><Icon name={successful ? 'check' : state.feedback?.valido === false ? 'help' : 'leaf'} size={22} /></span><div role="status" aria-live="polite"><strong>{state.feedback?.mensagem ?? 'Aqui, cada tentativa ensina.'}</strong><p>{successful ? 'Você completou o desafio. Vamos conhecer a próxima molécula?' : state.feedback?.valido === false ? 'A montagem foi preservada. Ajuste as peças e tente novamente.' : 'Explore à vontade: o jogo ajuda você a respeitar as ligações.'}</p></div>{successful && next ? <button className="button secondary" onClick={() => state.trocarDesafio(next.id)}>Próximo desafio <Icon name="arrow" size={16} /></button> : <div className="valence-key" aria-label="Valências: carbono 4, oxigênio 2 e hidrogênio 1"><span>C <b>4</b></span><span>O <b>2</b></span><span>H <b>1</b></span></div>}</div>
      </section>
      {state.molecule.fragments.length > 0 && <section className="assembly-details" aria-label="Detalhes e controles da montagem">
        <div className="molecule-facts"><span><strong>{carbonos}</strong> {carbonos === 1 ? 'carbono' : 'carbonos'}</span><span><strong>{state.molecule.atoms.filter((a) => a.element === 'H').length}</strong> H explícitos</span><span><strong>{state.molecule.atoms.filter((a) => a.element === 'O').length}</strong> oxigênios</span></div>
        {!showFormula && selected && <div className="selection-controls"><span>Peça {BLOCOS[selected.templateId].nome}</span><button className="button small secondary" onClick={state.girarSelecionada}><Icon name="rotate" size={16} /> Girar conjunto</button><button className="button small secondary" onClick={state.removerSelecionada}><Icon name="trash" size={16} /> Devolver peça</button></div>}
        {!showFormula && (selected || state.portaOrigem) && <div className="accessible-ports"><strong>{state.portaOrigem ? 'Agora escolha uma porta de destino' : 'Ou conecte sem arrastar'}</strong><div>{state.molecule.fragments.flatMap((f, fi) => f.ports.map((p, pi) => !p.occupiedBondId && <button key={p.id} className={`port-button${state.portaOrigem === p.id ? ' active' : ''}`} onClick={() => state.selecionarPorta(p.id)} aria-pressed={state.portaOrigem === p.id}>{BLOCOS[f.templateId].nome} <span>peça {fi + 1} · porta {pi + 1}</span></button>))}</div></div>}
        {bonds.length > 0 && <div className="bond-controls"><strong>Ligações da montagem</strong>{bonds.map((b, i) => {
          const a = state.molecule.fragments.find((f) => f.atomIds.includes(b.a)); const c = state.molecule.fragments.find((f) => f.atomIds.includes(b.b));
          return <button key={b.id} className="bond-button" onClick={() => state.desconectar(b.id)} aria-label={`Desconectar ligação ${i + 1}: ${BLOCOS[a.templateId].nome} com ${BLOCOS[c.templateId].nome}`}>{BLOCOS[a.templateId].nome} — {BLOCOS[c.templateId].nome} <Icon name="close" size={13} /></button>;
        })}</div>}
      </section>}
      <section className="journey" aria-labelledby="journey-title"><div className="journey-heading"><div><span className="eyebrow">SEU CAMINHO DE DESCOBERTAS</span><h3 id="journey-title">Uma molécula de cada vez.</h3></div><span>{state.concluidos.length} de {challenges.length} concluídos</span></div><div className="journey-steps" style={{ '--journey-count': challenges.length }}>{challenges.map((d, i) => {
        const unlocked = i === 0 || state.concluidos.includes(challenges[i - 1].id); const complete = state.concluidos.includes(d.id);
        return <button key={d.id} disabled={!unlocked} className={`journey-step${state.desafioId === d.id ? ' current' : ''}${complete ? ' finished' : ''}`} onClick={() => { if (state.desafioId !== d.id) state.trocarDesafio(d.id); }} aria-label={`${i + 1}. ${d.nome}${!unlocked ? ', bloqueado' : ''}`} aria-current={state.desafioId === d.id ? 'step' : undefined}><span>{complete ? <Icon name="check" size={16} /> : unlocked ? String(i + 1).padStart(2, '0') : <Icon name="lock" size={13} />}</span><small>{d.nome}</small></button>;
      })}</div></section>
      <footer className="site-footer"><span>Orgânika Builder <span>·</span> Química que faz sentido.</span><span>Feito para explorar, peça por peça.</span></footer>
    </main>
    {dialog && <Dialog kind={dialog} onClose={() => setDialog(null)} onConfirm={() => { if (dialog === 'restart') onRestart(); else state.reiniciar(); setDialog(null); }} />}
  </div>;
}

function paginaAtual() {
  const name = window.location.hash.slice(1);
  return ['laboratorio', 'professor', 'intermediario', 'avancado'].includes(name) ? name : 'inicio';
}

export default function App() {
  const [page, setPage] = useState(paginaAtual);
  const [dialog, setDialog] = useState(null);
  const [pendingIds, setPendingIds] = useState(null);
  const [print, setPrint] = useState(null);
  const snapshot = useGameStore((s) => s.molecule);
  const completed = useGameStore((s) => s.concluidos);
  const hasSession = snapshot.fragments.length > 0 || completed.length > 0;
  useEffect(() => {
    const listener = () => { setDialog(null); setPage(paginaAtual()); };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById(page === 'laboratorio' ? 'challenge-title' : 'page-title')?.focus({ preventScroll: true });
  }, [page]);
  const navigate = (next) => { window.location.hash = next; setPage(next); };
  function start(ids) {
    if (hasSession) { setPendingIds(ids ?? null); setDialog('new-session'); return; }
    launch(ids);
  }
  function launch(ids) {
    const result = gameStore.getState().iniciarSessao(ids);
    if (!result.valido) return;
    setDialog(null); setPendingIds(null); navigate('laboratorio');
  }
  function restart() { gameStore.getState().iniciarSessao(); navigate('inicio'); }
  function printWorksheet(ids, comGabarito) {
    // O conteúdo precisa estar renderizado antes de o navegador abrir a impressão.
    flushSync(() => setPrint({ ids: [...ids], comGabarito }));
    window.print();
  }
  return <>
    {page === 'inicio' && <Inicio hasSession={hasSession} onStart={() => start()} onContinue={() => navigate('laboratorio')} onHelp={() => setDialog('help')} />}
    {page === 'professor' && <Professor onStart={start} onHelp={() => setDialog('help')} onPrint={printWorksheet} />}
    {page === 'laboratorio' && <Laboratorio onRestart={restart} />}
    {['intermediario', 'avancado'].includes(page) && <LaboratorioProgressivo key={page} nivel={page} />}
    {dialog && <Dialog kind={dialog} onClose={() => { setDialog(null); setPendingIds(null); }} onConfirm={() => launch(pendingIds ?? undefined)} />}
    {print && <FichaAtividade ids={print.ids} comGabarito={print.comGabarito} />}
  </>;
}
