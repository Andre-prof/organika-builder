import { Icon } from './Icon.jsx';
import './ProximaFase.css';

const PROGRESSAO = {
  iniciante: { nome: 'iniciante', destino: 'intermediario', proximo: 'intermediário' },
  intermediario: { nome: 'intermediário', destino: 'avancado', proximo: 'avançado' },
};

export function ProximaFase({ nivel, desafios, concluidos }) {
  const fase = PROGRESSAO[nivel];
  // O catálogo inteiro precisa estar concluído, inclusive em roteiros reduzidos.
  if (!fase || !desafios.length || !desafios.every((d) => concluidos.includes(d.id))) return null;
  return <section className="proxima-fase" aria-label="Nível concluído">
    <span className="feedback-symbol" aria-hidden="true"><Icon name="check" size={24} /></span>
    <div><h3>Nível concluído!</h3><p>Você completou todos os desafios do nível {fase.nome}. Continue no {fase.proximo}.</p></div>
    <button className="button primary" onClick={() => { window.location.hash = fase.destino; }}>Próxima fase <Icon name="arrow" size={19} /></button>
  </section>;
}
