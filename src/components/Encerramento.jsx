import { useEffect, useRef, useState } from 'react';
import { alunoAtual, completo, CATALOGO } from '../game/certificacao.js';
// Imagens originais aprovadas, compartilhadas entre abertura e encerramento.
export function ArteMascote({ final = false }) {
  const [falhou, setFalhou] = useState(false);
  return falhou ? <div className="arte-pendente"><span aria-hidden="true">⚗</span><p>Orgânika Builder</p><small>Ilustração original aguardando integração</small></div> : <img className="mascote-original" src={`${import.meta.env.BASE_URL}mascote/${final ? 'conclusao' : 'abertura'}.png`} onError={() => setFalhou(true)} alt={final ? 'Químico mascote segurando o certificado de conclusão' : 'Químico mascote dando boas-vindas'} />;
}
export default function Encerramento({ onClose }) {
  const aluno = alunoAtual(); const dialog = useRef(null); const trigger = useRef(null); const [aberto, setAberto] = useState(false);
  useEffect(() => { trigger.current?.focus(); }, []);
  useEffect(() => { if (aberto) dialog.current?.showModal(); else trigger.current?.focus(); }, [aberto]);
  if (!completo(aluno) || !aluno.dataConclusao) return null;
  const data = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long' }).format(new Date(aluno.dataConclusao));
  function fechar() { setAberto(false); }
  return <main className="encerramento"><span className="eyebrow">TRÊS NÍVEIS · UMA GRANDE CONQUISTA</span><h1 tabIndex="-1">Você construiu seu caminho, {aluno.nome}!</h1><p>Todos os desafios obrigatórios foram concluídos. Seu certificado está pronto.</p>
    <div className="entrega-mascote"><ArteMascote final /><button ref={trigger} className="certificado-hotspot" onClick={() => setAberto(true)} aria-label="Abrir meu certificado personalizado"><span>Ver meu certificado ↗</span></button></div>
    <button className="button secondary" onClick={onClose}>Voltar às descobertas</button>
    {aberto && <dialog ref={dialog} className="certificado-dialog" aria-labelledby="titulo-certificado" onCancel={e => { e.preventDefault(); fechar(); }}>
      <style>{'@media print { @page { size: A4 landscape; margin: 12mm; } }'}</style><div className="certificado-acoes"><button className="button secondary" onClick={fechar}>Voltar</button><button className="button primary" onClick={() => window.print()}>Imprimir / Salvar em PDF</button><p>Na janela de impressão, escolha sua impressora ou “Salvar como PDF”.</p></div>
      <article className="certificado-real"><svg className="certificado-atomo" viewBox="-30 -30 60 60" aria-hidden="true">{[0, 60, 120].map(a => <ellipse key={a} rx="25" ry="10" transform={`rotate(${a})`} fill="none" stroke="currentColor" strokeWidth="1.5" />)}<circle r="3" fill="#23a9d1" /></svg><span className="eyebrow">ORGÂNIKA BUILDER</span><h2 id="titulo-certificado">Certificado de conclusão</h2><p>Certificamos que</p><h3>{aluno.nome}</h3><p>da turma <strong>{aluno.turma}</strong>, concluiu todos os desafios obrigatórios dos três níveis do Orgânika Builder.</p><div className="conquistas">{Object.entries(CATALOGO).map(([nivel, desafios]) => <p key={nivel}><small className="conquista-nivel">{{iniciante: 'INICIANTE', intermediario: 'INTERMEDIÁRIO', avancado: 'AVANÇADO'}[nivel]}</small><strong>{ {iniciante: 'Descobrir os encaixes', intermediario: 'Multiplicar as ligações', avancado: 'Pensar átomo por átomo'}[nivel]}</strong><br />{desafios.length} desafios concluídos</p>)}</div><p>Conclusão em {data}</p><div className="certificado-selo" aria-label="30 desafios concluídos">30</div><footer>Monte. Experimente. Descubra.</footer></article>
    </dialog>}
  </main>;
}
