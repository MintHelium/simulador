const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'lotes.json')));
function setup(fetch = async () => ({ok:true,json:async()=>data})) {
  const elements = {};
  const element = id => elements[id] ||= {value:'',textContent:'',innerHTML:'',disabled:false,style:{},parentElement:{style:{}},addEventListener(){}};
  const ctx = vm.createContext({document:{getElementById:element,addEventListener(){}},window:{location:{hostname:'localhost'}},fetch,console:{error(){}}});
  vm.runInContext(source, ctx);
  return {ctx, element};
}
const {ctx} = setup();
function invariant(r, price, n, count) {
  assert.ok(r);
  assert.ok(r.plan.mensualBase >= 2000);
  assert.ok(r.plan.ultima >= 0);
  assert.ok(r.enganche + count*r.monto < price);
  assert.equal(Math.round((r.enganche+count*r.monto+r.plan.pagosNormales*r.plan.mensualBase+r.plan.ultima)*100),Math.round(price*100));
  assert.equal(r.plan.pagosNormales+(r.plan.ultima>0?1:0),n);
}
test('catalog: all financed plans, all allowed counts, both modes and extremes',()=>{
  let cases=0;
  for(const dev of Object.values(data)) for(const stage of Object.values(dev)) {
    if(typeof stage !== 'object') continue;
    for(const size of Object.values(stage)) for(const lot of Object.values(size)) for(const [term,plan] of Object.entries(lot.Financiamiento||{})) {
      const plazo=Number(term);
      for(let cantidad=0;cantidad<=ctx.getMaxAnualidadesPorPlazo(plazo);cantidad++)
      for(const modo of ['enganche','mensualidad']) for(const value of [0,1999,2000,2000.01,125000,1e9]) {
        const r=ctx.limitarFinanciamiento({precio:plan.precio,precioContado:lot.Contado,minimo:plan.enganche,plazo,cantidad,monto:1e9,modo,enganche:value,mensualidad:value});
        invariant(r,plan.precio,plazo,cantidad);
        assert.ok(r.enganche>=plan.enganche && r.enganche<=lot.Contado);
        cases++;
      }
    }
  }
  console.log('Validated scenarios:',cases);
});
test('minimum, rounding cents, previous negative final payment and impossible plan',()=>{
 for(const plazo of [6,12,18,25,35,45]) {
  assert.equal(ctx.calcularPlanMensualidades(2000*plazo,0,plazo).mensualBase,2000);
  for(const extra of [0.01,1,49,199,201,999]) {
   const plan=ctx.calcularPlanMensualidades(2000*plazo+extra,0,plazo);
   invariant({plan,enganche:0,monto:0},2000*plazo+extra,plazo,0);
  }
 }
 assert.equal(ctx.calcularPlanMensualidades(100,0,45),null);
 assert.equal(ctx.limitarFinanciamiento({precio:10000,precioContado:9000,minimo:5000,plazo:6}),null);
});
test('commission transfer boundaries and existing normal calculation',()=>{
 for(const ahorro of [0,1,100,333,749,750,751]) for(const cobrar of [0,999,1000,18000]) {
  const r=ctx.aplicarAhorroAdicional({cobrar,ahorro,total:cobrar+ahorro});
  const move=ahorro>0&&ahorro<750&&cobrar>=1000?1000:0;
  assert.equal(r.cobrar,cobrar-move);assert.equal(r.ahorro,ahorro+move);assert.equal(r.total,r.cobrar+r.ahorro);
 }
 assert.equal(ctx.ajustarComision(18333).cobrar,17000);
 assert.equal(ctx.ajustarComision(18333).ahorro,1333);
});
test('numeric inputs never partially parse commas or garbage',()=>{
 for(const s of ['125000','125,000']) assert.equal(ctx.leerImporte(s),125000);
 assert.equal(ctx.leerImporte('125,000.25'),125000.25);
 for(const s of ['125,00','12x','Infinity','-2','']) assert.equal(ctx.leerImporte(s),0);
});
test('authorized price matrices and neighbor rules only: no other leaf changed',()=>{
 const old=JSON.parse(execFileSync('git',['show','4262e23:lotes.json'],{cwd:root}));
 const expected=structuredClone(old);
 for(const stage of ['Etapa 2','Etapa 3','Etapa 4']) for(const [size,types] of Object.entries(expected['Campestre Las Flores'][stage])) for(const type of Object.keys(types)) {
  const reference=data['Cañón de Gomas']['Etapa 3'][size]?.[type];
  if(reference) types[type]=reference;
 }
 for(const [dev,stages] of Object.entries(expected)) for(const [stage,sizes] of Object.entries(stages)) {
  if(dev==='Cañón de Gomas' && stage==='Etapa 1') continue;
  const base=sizes['750m2']['Un solo frente'];
  sizes['2250m2'] ||= {};
  sizes['2250m2']['Un solo frente']={Contado:base.Contado*3,Financiamiento:Object.fromEntries(
   Object.entries(base.Financiamiento).map(([term,plan])=>[term,{precio:plan.precio*3,enganche:plan.enganche*3-15000}]))};
 }
 for(const [size,type] of [['1500m2','Un solo vecino'],['2250m2','LF116 Un solo vecino']]) {
  const sizes=expected['Campestre Las Flores']['Etapa 4'];const base=sizes[size]['Un solo frente'];
  sizes[size][type]={Contado:base.Contado,Financiamiento:Object.fromEntries(
   Object.entries(base.Financiamiento).map(([term,plan])=>[term,{precio:plan.precio,enganche:base.Contado*0.25}]))};
 }
 const cdg4=expected['Cañón de Gomas']['Etapa 4'];
 cdg4['2250m2']['L151 Triple Frente 2250m2']=cdg4['1500m2']['L151 Triple Frente 2250m2'];
 delete cdg4['1500m2']['L151 Triple Frente 2250m2'];
 assert.deepEqual(data,expected);
});
test('reset clears commissions, annualities and downstream payment; cash-only mode safe',()=>{
 const {ctx,element:e}=setup();ctx.lotesData=data;vm.runInContext('lotesData = globalThis.lotesData',ctx);
 for(const [id,v] of Object.entries({desarrollo:'Cañón de Gomas',etapa:'Etapa 1',tamano:'1500m2',tipo:'Un solo frente'})) e(id).value=v;
 vm.runInContext('modoCalculo="mensualidad"; actualizarResultados()',ctx);
 assert.equal(e('valorTotal').textContent,'$0.00');
 e('pago').value='Contado';ctx.actualizarResultados();assert.equal(e('valorTotal').textContent,'$680,000.00');
 ctx.resetCamposDesde('tipo');
 for(const id of ['comisionCobrar','comisionAhorro','comisionTotal','valorTotal']) assert.equal(e(id).textContent,'$0.00');
 assert.equal(e('anualidadesResumen').parentElement.style.display,'none');
 assert.equal(e('pago').disabled,true);
});
test('catalog failure visible for HTTP and malformed JSON',async()=>{
 for(const fetch of [async()=>({ok:false,status:500}),async()=>({ok:true,json:async()=>{throw Error('JSON')}})]) {
  const {ctx,element:e}=setup(fetch); await ctx.cargarDatos();
  assert.match(e('errorCarga').textContent,/No se pudo cargar/);assert.equal(e('desarrollo').disabled,true);
 }
});

test('seven standard 2250 options: triple prices, matching terms and approved deposits',()=>{
 const targets=[['Cañón de Gomas','Etapa 2',[420000,360000,315000,210000,180000,150000]],
  ['Cañón de Gomas','Etapa 3',[405000,360000,315000,210000,180000,150000]],
  ['Cañón de Gomas','Etapa 4',[375000,330000,255000,210000,180000,150000]],
  ['Campestre Las Flores','Etapa 1',[435000,405000,375000,225000,195000,165000]],
  ...['Etapa 2','Etapa 3','Etapa 4'].map(stage=>['Campestre Las Flores',stage,[405000,360000,315000,210000,180000,150000]])];
 for(const [dev,stage,deposits] of targets) {
  const sizes=data[dev][stage];const base=sizes['750m2']['Un solo frente'];
  const lot=sizes['2250m2']?.['Un solo frente'];assert.ok(lot,`${dev} ${stage}`);
  assert.equal(lot.Contado,3*base.Contado);
  assert.deepEqual(Object.keys(lot.Financiamiento),Object.keys(base.Financiamiento));
  for(const [term,plan] of Object.entries(lot.Financiamiento)) {
   assert.equal(plan.precio,3*base.Financiamiento[term].precio);
   assert.equal(plan.enganche,3*base.Financiamiento[term].enganche-15000);
  }
  assert.deepEqual(Object.values(lot.Financiamiento).map(p=>p.enganche),deposits);
 }
});
test('CDG1 excluded and every existing special lot preserved',()=>{
 const prior=JSON.parse(execFileSync('git',['show','6be0e0d:lotes.json'],{cwd:root}));
 assert.equal(data['Cañón de Gomas']['Etapa 1']['2250m2'],undefined);
 assert.deepEqual(data['Cañón de Gomas']['Etapa 1'],prior['Cañón de Gomas']['Etapa 1']);
 for(const [dev,stages] of Object.entries(prior)) for(const [stage,sizes] of Object.entries(stages))
  for(const [size,types] of Object.entries(sizes)) for(const [type,lot] of Object.entries(types)) {
   if(size==='2250m2' && type==='Un solo frente') continue;
   if(dev==='Cañón de Gomas' && stage==='Etapa 4' && type==='L151 Triple Frente 2250m2') continue;
   assert.deepEqual(data[dev][stage][size][type],lot,`${dev}/${stage}/${size}/${type}`);
  }
});
test('CDG4 L151 exists only under 2250 and preserves its original catalog values',()=>{
 const prior=JSON.parse(execFileSync('git',['show','68822e0:lotes.json'],{cwd:root}));
 const stage=data['Cañón de Gomas']['Etapa 4'];
 const original=prior['Cañón de Gomas']['Etapa 4']['1500m2']['L151 Triple Frente 2250m2'];
 assert.equal(stage['1500m2']['L151 Triple Frente 2250m2'],undefined);
 assert.deepEqual(stage['2250m2']['L151 Triple Frente 2250m2'],original);
 let occurrences=0;
 for(const types of Object.values(stage)) {
  if(types['L151 Triple Frente 2250m2']) occurrences++;
 }
 assert.equal(occurrences,1);
 assert.ok(stage['2250m2']['Un solo frente']);
});
test('LF4 neighbor lots: same prices and terms, 25 percent cash deposit for every term',()=>{
 const sizes=data['Campestre Las Flores']['Etapa 4'];
 for(const [size,type,deposit] of [['1500m2','Un solo vecino',155000],['2250m2','LF116 Un solo vecino',232500]]) {
  const base=sizes[size]['Un solo frente'];const lot=sizes[size][type];
  assert.equal(lot.Contado,base.Contado);
  assert.deepEqual(Object.keys(lot.Financiamiento),Object.keys(base.Financiamiento));
  for(const [term,plan] of Object.entries(lot.Financiamiento)) {
   assert.equal(plan.precio,base.Financiamiento[term].precio);
   assert.equal(plan.enganche,deposit);assert.equal(plan.enganche,0.25*lot.Contado);
  }
 }
});
