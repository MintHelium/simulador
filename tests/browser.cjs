// Optional integration check: requires Playwright and locally installed Chrome.
// Start a local server on port 8765, or set SIMULADOR_URL.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const baseUrl=process.env.SIMULADOR_URL || 'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const context=await browser.newContext();
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(baseUrl);
 const select=async(id,value)=>page.selectOption('#'+id,value);
 const value=id=>page.inputValue('#'+id);
 const text=id=>page.textContent('#'+id);
 const fill=async(id,v)=>{await page.fill('#'+id,v);await page.locator('#'+id).blur()};
 async function choose(stage='Etapa 3',size='750m2'){
  await select('desarrollo','Cañón de Gomas');await select('etapa',stage);
  await select('tamano',size);await select('tipo','Un solo frente');
 }
 await choose(); await select('pago','Financiamiento');
 for(const term of ['6','12','18','25','35','45']){
  await select('plazo',term);
  assert.equal(await value('usarAnualidades'),'no');
  assert.equal(await page.locator('#cantidadAnualidadesGroup').isVisible(),false);
  assert.ok(Number(await value('mensualidadInput'))>=2000);
  await fill('enganche','999,999,999');
  assert.ok(Number(await value('mensualidadInput'))>=2000);
  await page.check('#modoMensualidad'); await fill('mensualidadInput','1,999');
  assert.ok(Number(await value('mensualidadInput'))>=2000);
  await page.check('#modoEnganche'); await fill('enganche','0');
  if(term==='6'){assert.ok(await page.locator('#usarAnualidades').isDisabled());continue}
  await select('usarAnualidades','si');
  assert.equal(await value('anualidades'),'');assert.equal(await value('anualidadMonto'),'0');
  const max={'12':1,'18':1,'25':2,'35':3,'45':4}[term];
  for(let count=1;count<=max;count++){
   await select('anualidades',String(count));await fill('anualidadMonto','999,000');
   assert.ok(Number(await value('mensualidadInput'))>=2000);
   assert.ok(await page.locator('#anualidadesResultadoDiv').isVisible());
   assert.ok(!/\$-/.test(await text('mensualidad')));
  }
 }
 await select('pago','Contado');
 assert.equal(await page.locator('#zonaAnualidades').isVisible(),false);
 assert.equal(await page.locator('#anualidadesResultadoDiv').isVisible(),false);
 assert.equal(await text('valorTotal'),'$310,000.00');
 await select('pago','Financiamiento');await select('plazo','45');
 await fill('enganche','125,000');assert.equal(await value('enganche'),'125000');
 const withCommas=await text('mensualidad');await fill('enganche','125000');assert.equal(await text('mensualidad'),withCommas);
 await select('desarrollo','');
 for(const id of ['valorTotal','comisionTotal','comisionCobrar','comisionAhorro'])assert.equal(await text(id),'$0.00');
 await choose('Etapa 1','1500m2');await page.check('#modoMensualidad');
 assert.equal(await text('valorTotal'),'$0.00');
 await select('pago','Contado');assert.equal(await text('valorTotal'),'$680,000.00');
 await page.check('#modoEnganche');
 await choose();await select('pago','Financiamiento');await select('plazo','45');
 await fill('enganche','999,999,999');await page.press('#enganche','ArrowUp');
 assert.equal(await value('enganche'),'295000');
 await page.check('#modoMensualidad');await fill('mensualidadInput','2,000');
 await page.press('#mensualidadInput','ArrowDown');assert.equal(await value('mensualidadInput'),'2000');
 await page.check('#modoEnganche');await fill('enganche','55,000');
 await select('usarAnualidades','si');await select('anualidades','4');await fill('anualidadMonto','40,000');
 await page.screenshot({path:'/tmp/simulador-revision.png',fullPage:true});
 // All seven standard 2250 products render their catalog prices and approved deposits.
 const catalog=require('../lotes.json');
 for(const [dev,stages] of Object.entries(catalog)) for(const [stage,sizes] of Object.entries(stages)) {
  await select('desarrollo',dev);await select('etapa',stage);
  if(dev==='Cañón de Gomas' && stage==='Etapa 1') {
   assert.equal(await page.locator('#tamano option[value="2250m2"]').count(),0);continue;
  }
  await select('tamano','2250m2');await select('tipo','Un solo frente');
  const lot=sizes['2250m2']['Un solo frente'];
  await select('pago','Contado');
  assert.equal(await text('valorTotal'),'$'+lot.Contado.toLocaleString('es-MX',{minimumFractionDigits:2}));
  await select('pago','Financiamiento');
  for(const [term,plan] of Object.entries(lot.Financiamiento)) {
   await select('plazo',term);assert.equal(Number(await value('enganche')),plan.enganche);
   assert.equal(await text('valorTotal'),'$'+plan.precio.toLocaleString('es-MX',{minimumFractionDigits:2}));
  }
 }
 // Exercise visible impossible-plan handling with synthetic catalog data.
 await page.evaluate(()=>{lotesData['Cañón de Gomas']['Etapa 3']['750m2']['Un solo frente'].Financiamiento['6'].precio=10000});
 await choose();await select('pago','Financiamiento');await select('plazo','6');
 assert.match(await text('mensajeCalculo'),/no permite/);assert.equal(await text('comisionTotal'),'$0.00');
 assert.deepEqual(errors,[]);
 await context.close();
 const failure=await browser.newContext({serviceWorkers:'block'});const bad=await failure.newPage();
 await bad.route('**/lotes.json',route=>route.fulfill({status:500,body:'unavailable'}));
 await bad.goto(baseUrl);await bad.waitForFunction(()=>document.getElementById('errorCarga').textContent.includes('No se pudo cargar'));
 assert.ok(await bad.locator('#desarrollo').isDisabled());
 await failure.close();console.log('Browser DOM scenarios passed; no unexpected console/page errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
