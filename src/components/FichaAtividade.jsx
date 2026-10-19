import { obterDesafio } from '../data/desafios.js';
import { GABARITOS } from '../data/gabaritos.js';

/** A lista do aluno não inclui gabaritos, nem mesmo ocultos no DOM de impressão. */
export function FichaAtividade({ ids, comGabarito }) {
  const challenges = ids.map(obterDesafio);
  return <section className="print-worksheet" aria-label={comGabarito ? 'Lista com gabarito do professor' : 'Lista de atividades do aluno'}>
    <header><span>ORGÂNIKA BUILDER · QUÍMICA ORGÂNICA</span><h1>Construindo moléculas</h1><p>Nome: __________________________________ Turma: __________ Data: ____/____/______</p><p>Monte as estruturas, confira o número de carbonos e explique como cada átomo completa suas ligações. Na folha, desenhe a estrutura com os H e as ligações explícitos.</p></header>
    {challenges.map((d, i) => <article key={d.id}><h2>{i + 1}. {d.nome}</h2><p>{d.enunciado}</p><p className="print-reflection">Como você verificou as ligações e o grupo funcional?</p><div className="print-writing-space" /></article>)}
    {comGabarito && <section className="print-answer-key"><h1>Gabarito comentado do professor</h1><p>As fórmulas abaixo são semidesenvolvidas. Para uma fórmula estrutural plana completa, representar cada H e cada ligação individualmente.</p>{challenges.map((d, i) => <article key={d.id}><h2>{i + 1}. {d.nome}</h2><p className="answer-formula">{GABARITOS[d.id].formula}</p><p>{GABARITOS[d.id].explicacao}</p></article>)}</section>}
  </section>;
}
