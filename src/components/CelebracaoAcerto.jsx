import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import './CelebracaoAcerto.css';

export const MENSAGENS_ACERTO = Object.freeze([
  'Muito bem!', 'Acertou!', 'Isso aí!', 'Mandou bem!',
  'Excelente!', 'Boa, você conseguiu!', 'Bela descoberta!', 'Você acertou em cheio!',
]);

/** Só uma verificação correta dispara a comemoração; navegar não repete o efeito. */
export function useCelebracaoAcerto(contexto, correto) {
  const [celebracao, setCelebracao] = useState(null);
  const anterior = useRef(-1); const sequencia = useRef(0);
  useEffect(() => { setCelebracao(null); }, [contexto]);
  useEffect(() => { if (!correto) setCelebracao(null); }, [correto]);
  useEffect(() => {
    if (!celebracao) return;
    const timer = window.setTimeout(() => setCelebracao(null), 3200);
    return () => window.clearTimeout(timer);
  }, [celebracao]);
  function verificarComCelebracao(verificar) {
    const result = verificar();
    if (!result?.objetivoCorreto) { setCelebracao(null); return result; }
    // Sorteio uniforme entre as outras frases evita repetição consecutiva.
    let indice = Math.floor(Math.random() * (MENSAGENS_ACERTO.length - (anterior.current < 0 ? 0 : 1)));
    if (anterior.current >= 0 && indice >= anterior.current) indice++;
    anterior.current = indice;
    setCelebracao({ id: ++sequencia.current, mensagem: MENSAGENS_ACERTO[indice] });
    return result;
  }
  return { celebracao, verificarComCelebracao };
}

export function CelebracaoAcerto({ celebracao }) {
  if (!celebracao) return null;
  return <aside key={celebracao.id} className="celebracao-acerto" role="status" aria-live="polite" aria-atomic="true">
    <span className="celebracao-brilhos" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>
    <span className="celebracao-selo" aria-hidden="true"><Icon name="check" size={28} /></span>
    <strong>{celebracao.mensagem}</strong>
  </aside>;
}
