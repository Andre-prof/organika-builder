import { useRef, useState } from 'react';
import { DESAFIOS } from '../data/desafios.js';
import { GABARITOS } from '../data/gabaritos.js';
import { BLOCOS } from '../data/blocos.js';
import { contarCarbonos } from '../game/ValidadorEstrutura.js';
import { lerRoteiroSalvo, salvarRoteiro, serializarRoteiro, importarRoteiro, TODOS_DESAFIOS } from '../game/roteiroProfessor.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Icon } from '../components/Icon.jsx';
import { ProgressaoProfessor } from '../components/ProgressaoProfessor.jsx';

function carregar() {
  // Até o acesso à propriedade localStorage pode falhar em navegadores restritos.
  try { return lerRoteiroSalvo(window.localStorage); } catch { return { ids: [...TODOS_DESAFIOS], aviso: 'O armazenamento local está indisponível. Você pode preparar e exportar um roteiro.' }; }
}

export default function Professor({ onStart, onHelp, onPrint }) {
  const [initial] = useState(carregar);
  const [ids, setIds] = useState(initial.ids);
  const [message, setMessage] = useState(initial.aviso ? { texto: initial.aviso, erro: true } : null);
  const file = useRef(null);
  const selected = DESAFIOS.filter((d) => ids.includes(d.id));
  function toggle(id) { setIds((current) => TODOS_DESAFIOS.filter((key) => key === id ? !current.includes(id) : current.includes(key))); setMessage(null); }
  function save() {
    try { salvarRoteiro(window.localStorage, ids); setMessage({ texto: 'Roteiro salvo neste navegador. Ele permanece ao recomeçar a atividade.' }); }
    catch (error) { setMessage({ texto: error.message, erro: true }); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([serializarRoteiro(ids)], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'roteiro-organika.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ texto: 'Roteiro exportado. Você pode importá-lo em outro navegador.' });
  }
  async function readFile(event) {
    const item = event.target.files?.[0]; event.target.value = '';
    if (!item) return;
    try {
      if (item.size > 65536) throw new Error('Use um arquivo JSON de até 64 KB.');
      const next = importarRoteiro(await item.text()); setIds(next);
      setMessage({ texto: 'Roteiro importado para revisão. Salve-o ou inicie a atividade quando estiver pronto.' });
    } catch (error) { setMessage({ texto: error.message, erro: true }); }
  }
  return <div className="teacher-shell"><PageHeader active="professor" onHelp={onHelp} /><main className="teacher-main">
    <section className="teacher-intro"><div><span className="eyebrow"><Icon name="teacher" size={17} /> ÁREA DO PROFESSOR</span><h1 id="page-title" tabIndex="-1">Prepare a próxima <em>descoberta.</em></h1><p>Um roteiro para sua turma, com objetivos claros e espaço para experimentar.</p></div><a href="#inicio" className="button secondary"><Icon name="home" size={17} /> Voltar ao início</a></section>
    <div className="teacher-grid"><section className="teacher-roster" aria-labelledby="roster-title"><div className="teacher-panel-heading"><div><span className="eyebrow">ESCOLHA SEU PERCURSO</span><h2 id="roster-title">Desafios da atividade</h2></div><span className="selection-count">{ids.length} de 10</span></div><p className="teacher-panel-description">Selecione os desafios que quer trabalhar. A sequência segue a ordem didática do jogo; o primeiro escolhido fica disponível imediatamente.</p><div className="roster-selection-actions"><button onClick={() => { setIds([...TODOS_DESAFIOS]); setMessage(null); }}>Selecionar todos</button><button onClick={() => { setIds([]); setMessage(null); }}>Limpar seleção</button></div>
      <div className="roster-list">{DESAFIOS.map((d) => <div key={d.id} className={`roster-row${ids.includes(d.id) ? ' included' : ''}`}><label><input type="checkbox" checked={ids.includes(d.id)} onChange={() => toggle(d.id)} /><span className="roster-number">{String(d.numero).padStart(2, '0')}</span><span className="roster-info"><strong>{d.nome}</strong><span>{d.categoria} · {contarCarbonos(d.alvo)} {contarCarbonos(d.alvo) === 1 ? 'carbono' : 'carbonos'}</span></span></label><details className="roster-answer"><summary>Ver gabarito <Icon name="chevron" size={14} /></summary><div><p className="answer-label">FÓRMULA SEMIDESENVOLVIDA</p><p className="answer-formula">{GABARITOS[d.id].formula}</p><p>{GABARITOS[d.id].explicacao}</p><p className="answer-pieces"><strong>Peças disponíveis:</strong> {Object.entries(d.inventario).map(([id, quantity]) => `${quantity} × ${BLOCOS[id].nome}`).join(' · ')}</p></div></details></div>)}</div>
      <div className="roster-footer"><span>{selected.length ? `${selected.length} ${selected.length === 1 ? 'desafio pronto' : 'desafios prontos'} para explorar.` : 'Selecione ao menos um desafio.'}</span><button className="button primary" disabled={!ids.length} onClick={() => onStart(ids)}>Iniciar roteiro <Icon name="arrow" size={18} /></button></div>
    </section><aside className="teacher-aside">
      <section className="teacher-tool-panel"><span className="teacher-tool-icon"><Icon name="save" size={23} /></span><h2>Leve seu roteiro com você</h2><p>Guarde a seleção neste navegador ou exporte um arquivo para usar em outro computador.</p><div className="teacher-tool-buttons"><button className="button primary" disabled={!ids.length} onClick={save}><Icon name="save" size={17} /> Salvar roteiro neste navegador</button><button className="button secondary" disabled={!ids.length} onClick={download}><Icon name="download" size={17} /> Exportar roteiro JSON</button><button className="button secondary" onClick={() => file.current.click()}><Icon name="upload" size={17} /> Importar roteiro JSON</button><input ref={file} type="file" accept=".json,application/json" aria-label="Arquivo de roteiro do professor" hidden onChange={readFile} /></div><p className="teacher-local-note">O roteiro salva a seleção de desafios, sem dados de alunos. A montagem e o progresso do jogo duram apenas a sessão.</p></section>
      <section className="teacher-tool-panel"><span className="teacher-tool-icon"><Icon name="printer" size={23} /></span><h2>Do jogo para o papel</h2><p>Imprima os desafios selecionados. A lista do aluno sai sem respostas; o material do professor inclui gabaritos comentados.</p><div className="teacher-tool-buttons"><button className="button secondary" disabled={!ids.length} onClick={() => onPrint(ids, false)}><Icon name="printer" size={17} /> Imprimir lista do aluno</button><button className="button secondary" disabled={!ids.length} onClick={() => onPrint(ids, true)}><Icon name="book" size={17} /> Imprimir com gabarito</button></div></section>
      <section className="teacher-lesson"><span className="eyebrow">SUGESTÃO PARA A AULA</span><h2>Observar, construir, explicar.</h2><ol><li><strong>Antes de montar</strong><span>Peça aos alunos que prevejam as peças necessárias e contem os carbonos.</span></li><li><strong>Durante o encaixe</strong><span>Compare portas livres e valências. Pergunte por que uma ligação foi recusada.</span></li><li><strong>Depois de verificar</strong><span>Peça uma explicação da função orgânica e o desenho com H e ligações explícitos.</span></li></ol></section>
    </aside></div>
    {message && <p className={`teacher-message${message.erro ? ' error' : ''}`} role={message.erro ? 'alert' : 'status'}>{message.texto}</p>}
    <ProgressaoProfessor />
    <p className="teacher-scope-note">Espaço para preparar atividades e consultar gabaritos. Recomeçar o jogo mantém o roteiro salvo neste navegador.</p>
    <footer className="site-footer"><span>Orgânika Builder <span>·</span> Ensinar também é construir.</span><span>Roteiros e impressão disponíveis neste navegador.</span></footer>
  </main></div>;
}
