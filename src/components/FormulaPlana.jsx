import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { criarLayoutFormula } from '../scene/formulaPlana.js';
import { Icon } from './Icon.jsx';
import { criarLayoutProgressivo } from '../scene/formulaProgressiva.js';

export function FormulaPlana({ molecule, onPuzzle }) {
  const id = useId(); const [zoom, setZoom] = useState(1);
  const section = useRef(null);
  useEffect(() => {
    section.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    section.current?.querySelector('h3')?.focus({ preventScroll: true });
  }, []);
  const result = useMemo(() => {
    try { return { layout: molecule.schemaVersion === '2.0' ? criarLayoutProgressivo(molecule) : criarLayoutFormula(molecule) }; } catch (error) { return { erro: error.message }; }
  }, [molecule]);
  if (result.erro) return <div className="formula-fallback" role="alert"><p>{result.erro}</p><button className="button secondary" onClick={onPuzzle}>Voltar ao quebra-cabeça</button></div>;
  const { layout } = result;
  const box = layout.viewBox;
  return <section ref={section} className="formula-view" aria-label="Fórmula estrutural plana completa">
    <div className="formula-heading"><div><h3 tabIndex="-1">Fórmula estrutural plana completa</h3><p>Cada H e cada ligação da sua montagem.</p></div><div className="formula-zoom"><button className="icon-button" aria-label="Reduzir fórmula" disabled={zoom <= .8} onClick={() => setZoom((v) => Math.max(.8, v - .2))}><Icon name="minus" /></button><button className="icon-button" aria-label="Ampliar fórmula" disabled={zoom >= 1.8} onClick={() => setZoom((v) => Math.min(1.8, v + .2))}><Icon name="plus" /></button></div></div>
    <div className="formula-drawing"><svg className="formula-svg" role="img" aria-labelledby={`${id}-title ${id}-description`} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} style={{ width: Math.max(360, box.width * 1.25) * zoom, minWidth: box.width * .8 * zoom, height: `${zoom * 100}%`, minHeight: box.height * .7 * zoom }}>
      <title id={`${id}-title`}>Fórmula estrutural plana completa da molécula montada</title><desc id={`${id}-description`}>{layout.descricao}</desc>
      <g className="formula-bonds">{layout.bonds.map((bond) => {
        const dx = bond.to.x - bond.from.x; const dy = bond.to.y - bond.from.y; const length = Math.hypot(dx, dy);
        const ux = dx / length; const uy = dy / length;
        return <g key={bond.id} data-bond-id={bond.id} data-bond-order={bond.order}>{(bond.order === 3 ? [-7, 0, 7] : bond.order === 2 ? [-4, 4] : [0]).map((offset) => <line key={offset}
          x1={bond.from.x + ux * 21 - uy * offset} y1={bond.from.y + uy * 21 + ux * offset}
          x2={bond.to.x - ux * 21 - uy * offset} y2={bond.to.y - uy * 21 + ux * offset} />)}</g>;
      })}</g>
      <g className="formula-atoms">{layout.atoms.map((atom) => <text key={atom.id} data-atom-id={atom.id} data-element={atom.element} data-fragment-id-origin={atom.fragmentId}
        x={atom.x} y={atom.y} textAnchor="middle" dominantBaseline="central">{atom.element}</text>)}</g>
    </svg></div>
    <p className="formula-footnote">Fórmula molecular: <strong>{layout.formulaMolecular}</strong><span> · </span>{molecule.nivel === 'avancado' ? 'Cada hidrogênio foi conectado explicitamente.' : 'Os hidrogênios já pertenciam às peças.'}</p>
  </section>;
}
