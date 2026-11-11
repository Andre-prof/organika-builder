import { useState } from 'react';
import { entrar } from '../game/certificacao.js';
export default function EntradaAluno({ onEntrar }) {
  const [nome, setNome] = useState(''); const [turma, setTurma] = useState('');
  return <main className="entrada-aluno"><span className="eyebrow">SEU CAMINHO DE DESCOBERTAS</span><h1>Antes de começar</h1><p>Informe os dados que aparecerão no certificado. Use o mesmo nome e turma para retomar seu progresso neste navegador.</p><form onSubmit={e => { e.preventDefault(); if (entrar(nome, turma)) onEntrar(); }}><label>Nome completo<input autoFocus required maxLength={120} autoComplete="name" value={nome} onChange={e => setNome(e.target.value)} /></label><label>Turma<input required maxLength={80} value={turma} onChange={e => setTurma(e.target.value)} /></label><button className="button primary">Entrar na atividade</button></form><p>Os registros ficam neste navegador. Pessoas com nome e turma iguais compartilham o mesmo registro.</p><a href="#inicio">Voltar ao início</a></main>;
}
