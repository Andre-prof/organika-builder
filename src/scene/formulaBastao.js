import { indexarGrafo, possuiCiclo } from '../game/grafo.js';
// Deriva a representação do mesmo grafo validado, sem alterar a montagem.
export function criarFormulaBastao(molecule, layout) {
 const graph = indexarGrafo(molecule);
 const heavy = layout.atoms.filter(a => a.element !== 'H');
 const cyclic = possuiCiclo(molecule, graph.adjacency);
 const columns = [...new Set(heavy.map(a => a.x))].sort((a,b)=>a-b);
 const atoms = heavy.map(a => ({...a, x:a.x*.65, y:a.y*.65+(cyclic ? 0 : (columns.indexOf(a.x)%2)*60), label:a.element==='C'?'':a.element}));
 const byId = new Map(atoms.map(a=>[a.id,a]));
 // Os H de O e N permanecem explícitos; só os H ligados a C são omitidos.
 for (const a of atoms) if (a.element !== 'C') {
   const count = graph.adjacency.get(a.id).filter(n=>graph.atoms.get(n.atomId).element==='H').length;
   a.label += count ? 'H'+(count>1?String(count):'') : '';
 }
 // Centros de ligação tripla ficam alinhados aos dois vizinhos pesados.
 if (!cyclic) for (const a of atoms) {
   const ns = graph.adjacency.get(a.id).filter(n=>byId.has(n.atomId));
   if (ns.length===2 && ns.some(n=>n.bond.order===3)) {
     const ends=ns.map(n=>byId.get(n.atomId)); a.x=(ends[0].x+ends[1].x)/2; a.y=(ends[0].y+ends[1].y)/2;
   }
 }
 const bonds = molecule.bonds.filter(b=>byId.has(b.a)&&byId.has(b.b)).map(b=>({...b,from:byId.get(b.a),to:byId.get(b.b)}));
 const xs=atoms.map(a=>a.x),ys=atoms.map(a=>a.y);
 return {...layout,atoms,bonds,viewBox:{x:Math.min(...xs)-65,y:Math.min(...ys)-65,width:Math.max(130,Math.max(...xs)-Math.min(...xs)+130),height:Math.max(150,Math.max(...ys)-Math.min(...ys)+130)},descricao:'Fórmula em bastão: cada extremidade e vértice sem símbolo representa um carbono. Hidrogênios ligados a carbono ficam implícitos. O e N e seus hidrogênios são indicados.'};
}
