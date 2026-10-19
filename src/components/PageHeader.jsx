import { Brand } from './Brand.jsx';
import { Icon } from './Icon.jsx';
import { useRef } from 'react';

function PageLink({ href, children, ...props }) {
  const start = useRef(null);
  return <a href={href} {...props} onPointerDown={(e) => {
    start.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY, time: e.timeStamp } : null;
  }} onPointerUp={(e) => {
    const point = start.current; start.current = null;
    // O Chrome móvel pode suprimir o clique sintético logo após um arraste.
    // Um toque curto confirmado navega mesmo nesse caso, sem ativar ao rolar.
    if (point && e.pointerType === 'touch' && e.timeStamp - point.time < 1000
        && Math.hypot(e.clientX - point.x, e.clientY - point.y) < 8) window.location.hash = href.slice(1);
  }} onPointerCancel={() => { start.current = null; }}>{children}</a>;
}

export function PageHeader({ active, onHelp, onRestart, nivel = 'Iniciante' }) {
  return <header className="site-header page-header"><div className="header-inner"><Brand /><nav aria-label="Navegação principal"><PageLink className={active === 'inicio' ? 'active' : ''} href="#inicio" aria-current={active === 'inicio' ? 'page' : undefined}>Início</PageLink><PageLink className={active === 'professor' ? 'active' : ''} href="#professor" aria-current={active === 'professor' ? 'page' : undefined}>Área do professor</PageLink><button onClick={onHelp}>Como jogar <Icon name="help" size={17} /></button>{onRestart && <button className="restart-session-button" onClick={onRestart}><Icon name="rotate" size={16} /> Recomeçar</button>}</nav><span className="level-pill"><span /> Modo {nivel.toLowerCase()}</span></div></header>;
}
