import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5186','--strictPort'],{windowsHide:true});
let browser;
try {
 await new Promise((r,j)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))r()});server.on('error',j)});
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1360,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5186/#laboratorio');await page.getByLabel('Nome completo').fill('Teste fórmula');await page.getByLabel('Turma',{exact:true}).fill('A');await page.getByRole('button',{name:'Entrar na atividade'}).click();
 await page.evaluate(async()=>{const {gameStore}=await import('/src/store/useGameStore.js');let s=gameStore.getState();s.adicionarPeca('ch3');s.adicionarPeca('ch3');s=gameStore.getState();s.selecionarPorta(s.molecule.fragments[0].ports[0].id);s.selecionarPorta(s.molecule.fragments[1].ports[0].id)});
 await page.getByRole('button',{name:'Verificar estrutura',exact:true}).click();await page.getByRole('heading',{name:'Fórmula em bastão',exact:true}).waitFor();assert.equal(await page.locator('.formula-svg [data-bond-id]').count(),1);assert.equal(await page.locator('.formula-atoms text').count(),0);await page.screenshot({path:'test-results/etano-bastao.png',fullPage:true});
 await page.getByRole('button',{name:'Fórmula plana completa',exact:true}).click();assert.equal(await page.locator('.formula-atoms text').count(),8);await page.screenshot({path:'test-results/etano-plana-ajustada.png',fullPage:true});assert.deepEqual(errors,[]);console.log('Etano: bastão após acerto e fórmula completa: OK');
}finally{await browser?.close();server.kill()}
