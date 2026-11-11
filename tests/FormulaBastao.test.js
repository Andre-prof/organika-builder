import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO } from '../src/game/certificacao.js';
import { criarLayoutFormula } from '../src/scene/formulaPlana.js';
import { criarLayoutProgressivo } from '../src/scene/formulaProgressiva.js';
import { criarFormulaBastao } from '../src/scene/formulaBastao.js';
for(const [nivel,ds] of Object.entries(CATALOGO)) for(const d of ds) test(`Bastão preserva ligações pesadas: ${nivel}/${d.nome}`,()=>{
 const m=d.alvo;const before=structuredClone(m);const full=m.schemaVersion==='2.0'?criarLayoutProgressivo(m):criarLayoutFormula(m);const l=criarFormulaBastao(m,full);const heavy=new Set(m.atoms.filter(a=>a.element!=='H').map(a=>a.id));
 assert.deepEqual(m,before);assert.equal(l.atoms.length,heavy.size);assert.equal(l.bonds.length,m.bonds.filter(b=>heavy.has(b.a)&&heavy.has(b.b)).length);assert.ok(l.atoms.filter(a=>a.element==='C').every(a=>a.label===''));assert.ok(l.bonds.every(b=>Math.hypot(b.from.x-b.to.x,b.from.y-b.to.y)>0));
});
