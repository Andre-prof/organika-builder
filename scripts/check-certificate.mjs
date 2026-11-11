import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5186','--strictPort'],{windowsHide:true});
let browser;
try {
 await new Promise((r,j)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))r()});server.on('error',j)});
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1360,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5186/#avancado');await page.getByLabel('Nome completo').fill('Ana Clara de Souza');await page.getByLabel('Turma',{exact:true}).fill('2º A');await page.getByRole('button',{name:'Entrar na atividade'}).click();
 assert.equal(await page.getByRole('button',{name:'Ver certificado',exact:true}).count(),0);
 await page.evaluate(async()=>{const c=await import('/src/game/certificacao.js');for(const [n,ds] of Object.entries(c.CATALOGO))for(const d of ds){if(n==='avancado'&&d===ds.at(-1))continue;c.registrarConclusao(n,d.id)}});
 await page.reload();assert.equal(await page.getByRole('button',{name:'Ver certificado',exact:true}).count(),0);
 await page.evaluate(async()=>{const c=await import('/src/game/certificacao.js');c.registrarConclusao('avancado',c.CATALOGO.avancado.at(-1).id)});
 const trigger=page.getByRole('button',{name:'Abrir meu certificado personalizado'});await trigger.waitFor();await page.screenshot({path:'test-results/encerramento-desktop.png',fullPage:true});await trigger.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.locator('.certificado-real').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});
 assert.match(await page.locator('.certificado-real').innerText(),/Ana Clara de Souza/);await page.emulateMedia({media:'print'});await page.pdf({path:'test-results/certificado-aluno.pdf',preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'screen'});await page.screenshot({path:'test-results/certificado-desktop.png',fullPage:true});
 await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);await page.keyboard.press('Space');await page.getByRole('dialog').waitFor();await page.locator('.certificado-real').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'test-results/encerramento-mobile.png',fullPage:true});await trigger.click();await page.getByRole('dialog').waitFor();await page.locator('.certificado-real').evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))});await page.screenshot({path:'test-results/certificado-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Voltar às descobertas'}).click();await page.getByRole('button',{name:'Trocar aluno'}).click();await page.goto('http://127.0.0.1:5186/#intermediario');await page.getByLabel('Nome completo').fill('Bruno');await page.getByLabel('Turma',{exact:true}).fill('2º A');await page.getByRole('button',{name:'Entrar na atividade'}).click();assert.equal(await page.getByRole('button',{name:'Ver certificado',exact:true}).count(),0);assert.deepEqual(errors,[]);console.log('Fluxo de certificado: OK');
}finally{await browser?.close();server.kill()}
