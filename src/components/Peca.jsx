import { BLOCOS } from '../data/blocos.js';
import { PORTAS } from '../scene/geometria.js';

export const CORES = { ch3: '#ccd9e6', ch2: '#ccd9e6', ch: '#ccd9e6', oh: '#cbd8e5', cho: '#b1ceeb', cooh: '#b1ceeb' };

/** O contorno só representa encaixe. Nunca é usado para validar química. */
function caminho(templateId, ports, origem) {
  const sides = {};
  PORTAS[templateId].forEach(([x, y], i) => {
    if (ports?.[i]?.occupiedBondId) return;
    const side = x === 60 ? 'right' : x === -60 ? 'left' : y === -40 ? 'top' : 'bottom';
    sides[side] = origem && ports?.[i]?.id !== origem ? -1 : (i % 2 ? -1 : 1);
  });
  const s = ['M32 20'];
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const n = sides[side];
    if (side === 'top') { if (n) s.push('L70 20', `C70 ${20 - 13 * n} 90 ${20 - 13 * n} 90 20`); s.push('L128 20 Q140 20 140 32'); }
    if (side === 'right') { if (n) s.push('L140 50', `C${140 + 13 * n} 50 ${140 + 13 * n} 70 140 70`); s.push('L140 88 Q140 100 128 100'); }
    if (side === 'bottom') { if (n) s.push('L90 100', `C90 ${100 + 13 * n} 70 ${100 + 13 * n} 70 100`); s.push('L32 100 Q20 100 20 88'); }
    if (side === 'left') { if (n) s.push('L20 70', `C${20 - 13 * n} 70 ${20 - 13 * n} 50 20 50`); s.push('L20 32 Q20 20 32 20 Z'); }
  }
  return s.join(' ');
}

export function Formula({ templateId }) {
  const sub = { ch3: '3', ch2: '2' }[templateId];
  return <>{sub ? <>CH<tspan baselineShift="sub" fontSize="16">{sub}</tspan></> : BLOCOS[templateId].nome}</>;
}

export function DesenhoPeca({ templateId, ports, origem, selected, ghost = false, angle = 0 }) {
  return <>
    <path d={caminho(templateId, ports, origem)} fill={CORES[templateId]} stroke={selected ? '#1a3f65' : '#5d7a98'} strokeWidth={selected ? 2.5 : 1.4} strokeLinejoin="round" />
    <path d="M38 25h80" stroke="white" strokeWidth="2" opacity=".55" />
    <text x="80" y="64" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${-angle} 80 60)`} className="piece-label" fill="#26323e"><Formula templateId={templateId} /></text>
    {PORTAS[templateId].map(([x, y], i) => ports?.[i]?.occupiedBondId ? null : <g key={i}><circle cx={x + 80} cy={y + 60} r="9" fill="#fff" stroke="#3978ba" strokeWidth="2.2" /><circle cx={x + 80} cy={y + 60} r="2.5" fill="#3978ba" /></g>)}
  </>;
}

export function Peca({ fragment, pose, selected, origem, destino, scale, onDrag, onSelect, onPort }) {
  return <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.angle}) translate(-80 -60)`}
    className={`workspace-piece${selected ? ' selected' : ''}`} data-fragment-id={fragment.id}
    role="group" aria-label={`Peça ${BLOCOS[fragment.templateId].nome}`} tabIndex="0"
    onPointerDown={(event) => { if (event.pointerType !== 'mouse' || event.button === 0) onDrag(event, { kind: 'fragment', id: fragment.id }); }}
    onClick={(event) => { event.stopPropagation(); onSelect(fragment.id); }}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(fragment.id); } }}>
    <DesenhoPeca templateId={fragment.templateId} ports={fragment.ports} selected={selected} origem={origem} angle={pose.angle} />
    {fragment.ports.map((p, i) => {
      if (p.occupiedBondId) return null;
      const [x, y] = PORTAS[fragment.templateId][i];
      return <g key={p.id} data-port-id={p.id} className={`interactive-port${origem === p.id ? ' chosen' : ''}${destino === p.id ? ' snap-target' : ''}`} role="button" tabIndex="0"
        aria-label={`Porta ${i + 1} livre de ${BLOCOS[fragment.templateId].nome}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onPort(p.id); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPort(p.id); } }}>
        <circle cx={x + 80} cy={y + 60} r={Math.min(27, Math.max(22 / scale, 15))} fill="transparent" />
        <title>{destino === p.id ? 'Solte a peça para conectar aqui' : `Conector livre ${i + 1}`}</title>
        {destino === p.id && <circle className="snap-halo" cx={x + 80} cy={y + 60} r={18 / scale} fill="#d5eaff" stroke="#3978ba" strokeWidth="1.5" strokeDasharray="4 3" />}
        <circle className="port-ring" cx={x + 80} cy={y + 60} r={Math.min(17, Math.max(10 / scale, 9))} fill="white" stroke="#3978ba" strokeWidth="2.3" />
        <circle cx={x + 80} cy={y + 60} r="3" fill="#3978ba" />
      </g>;
    })}
  </g>;
}
