const { chromium } = require(process.env.BONSAI_PLAYWRIGHT || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const output = process.env.BONSAI_LIGHTING_OUTPUT;
const probe = `window.__lightingProbe = {
 setup(species) { setAutoRotate(false); ike.rotation.set(0,0,0); treeType.value=species; syncFormDefaultsFromSpecies(); setSeed(123456); regenerate(); frameView(); },
 light(key, ambient, exposure) { keyLightUI.value=key; hemiLightUI.value=ambient; exposureUI.value=exposure; applyLightingFromUI(); },
 rotate(angle) { ike.rotation.y=angle; },
 preset(name) { applyLightingPreset(name); },
 background(color) { bgColor.value=color; applyBackground(); },
 restoreLegacyLighting() {
  keyLightUI.value='.55';hemiLightUI.value='.9';exposureUI.value='1';applyLightingFromUI();
  const saved=captureControlState(); delete saved.namespaced;
  applyLightingPreset('studio');
  applyControlState(normalizeSnapshotRecord({id:'legacy-lighting',state:saved}).state);
  return {key:dir.intensity,ambient:hemi.intensity,exposure:renderer.toneMappingExposure,seed:currentSeed};
 },
 measure() {
  renderer.render(scene,camera);
  const canvas=document.createElement('canvas');canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let sum=0,count=0,bright=0;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;const luma=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];sum+=luma;count++;if(luma>=40)bright++;}
  return {meanLuma:sum/Math.max(1,count),readableFraction:bright/Math.max(1,count),pixels:count,seed:currentSeed,key:dir.intensity,ambient:hemi.intensity,exposure:renderer.toneMappingExposure,background:bgColor.value,linked:bgLightLinkUI.checked,mode:renderMode.value};
 }
}; initial();`;
(async () => {
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
   res.end(file===path.join(root,'index.html')?data.toString().replace('      initial();',probe):data);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.random-lock-btn',{state:'attached'});await page.waitForTimeout(800);
  const startup=await page.evaluate(()=>window.__lightingProbe.measure());assert.equal(startup.key,2.2);assert.equal(startup.ambient,2);assert.equal(startup.exposure,1.15);
  const results=[];
  for(const species of ['magnolia','pine','maple']) {
   const available=await page.locator('#treeType').evaluate((el,value)=>Array.from(el.options).some(option=>option.value===value),species);if(!available)continue;
   await page.evaluate(species=>window.__lightingProbe.setup(species),species);await page.waitForTimeout(300);
   await page.evaluate(()=>window.__lightingProbe.light(.55,.9,1));const before=await page.evaluate(()=>window.__lightingProbe.measure());
   if(output&&species==='magnolia')await page.locator('#stage canvas').screenshot({path:path.join(output,'before.png')});
   await page.evaluate(()=>window.__lightingProbe.preset('balanced'));const after=await page.evaluate(()=>window.__lightingProbe.measure());
   if(output&&species==='magnolia')await page.locator('#stage canvas').screenshot({path:path.join(output,'after.png')});
   assert.equal(before.pixels,after.pixels);assert.ok(after.meanLuma>before.meanLuma*2);assert.ok(after.readableFraction>.6);
   results.push({species,before,after});
  }
  assert.equal(results.length,3);
  const legacy=await page.evaluate(()=>window.__lightingProbe.restoreLegacyLighting());
  assert.deepEqual(legacy,{key:.55,ambient:.9,exposure:1,seed:123456});
  const presets=[];
  for(const background of ['#0e1115','#e8ece7']) {
   await page.evaluate(color=>window.__lightingProbe.background(color),background);
   for(const name of ['balanced','studio','soft','dramatic','neon']) {
    await page.evaluate(name=>window.__lightingProbe.preset(name),name);
    const result=await page.evaluate(()=>window.__lightingProbe.measure());
    assert.ok(Number.isFinite(result.meanLuma));
    if(['balanced','studio','soft'].includes(name))assert.ok(result.readableFraction>.6);
    presets.push({name,...result});
   }
  }
  await page.evaluate(()=>{window.__lightingProbe.background('#0e1115');window.__lightingProbe.preset('balanced');});
  const angles=[];
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
   await page.evaluate(angle=>window.__lightingProbe.rotate(angle),angle);
   const result=await page.evaluate(()=>window.__lightingProbe.measure());
   assert.ok(result.readableFraction>.5);angles.push({angle,...result});
  }
  assert.deepEqual(errors,[]);
  if(output)fs.writeFileSync(path.join(output,'lighting.json'),JSON.stringify({results,legacy,presets,angles},null,2));
  console.log(JSON.stringify({results,legacy,presets,angles}));
 } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
