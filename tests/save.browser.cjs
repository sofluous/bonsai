const { chromium } = require(process.env.BONSAI_PLAYWRIGHT || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const probe = `window.__saveProbe = {
 setup(species='pine') {
  setAutoSpeed(0);setAutoRotate(true);setSidePanelVisible(true,true);setToolbarVisible(true,true);setCameraPadVisible(true,true);
  const theme=$('themeSelect');theme.value='paper-mint';window.DesignSystemThemeSelector.applyTheme('paper-mint');
  treeType.value=species;syncFormDefaultsFromSpecies();qualityModeUI.value='mobile';applyQualityProfile('mobile');setSeed(123456);
  fallingLeavesToggle.checked=false;setPlantPartVisible('leaves',false,false);
  vesselType.value='cascade-tube';setVesselPartVisible('vessel',false,false);
  bgColor.value='#314c65';bgTex.value='solid';applyBackground();
  applyLightingPreset('soft');regenerate();ike.rotation.set(.1,1.234,.05);ike.position.set(.1,-.15,.2);ike.scale.set(1.1,.9,1.05);
  camera.position.set(7,4,9);controls.target.set(.2,.4,.1);camera.fov=42;camera.near=.03;camera.far=180;camera.zoom=1.1;camera.updateProjectionMatrix();controls.update();
 },
 mutate() {
  setAutoRotate(false);ike.rotation.set(0,2.8,0);ike.position.set(0,0,0);ike.scale.set(1,1,1);setVesselPartVisible('vessel',true,false);setPlantPartVisible('leaves',true,false);
  qualityModeUI.value='high';applyQualityProfile('high');treeType.value='maple';setSeed(98765);regenerate();
  camera.fov=60;camera.zoom=1;camera.near=.1;camera.far=200;camera.position.set(4,5,12);controls.target.set(0,0,0);camera.updateProjectionMatrix();controls.update();
  bgColor.value='#ffffff';applyBackground();applyLightingPreset('dramatic');
  setToolbarVisible(false,true);setCameraPadVisible(false,true);setSidePanelVisible(false,true);$('themeSelect').value='neon-grid';window.DesignSystemThemeSelector.applyTheme('neon-grid');
 },
 autoQuality() {qualityModeUI.value='auto';applyQualityProfile('auto');sanitizeTerminalBounds();regenerate();},
 capture() {return captureControlState();},
 recallFrozen(id) {const snap=snapshots.find(s=>s.id===id);applyControlState(snap.state);setAutoRotate(false);return this.signature();},
 apply(state) {window.dispatchEvent(new Event('resize'));applyControlState(state);},
 stored() {return snapshots.map(s=>({...s,thumb:undefined}));},
 signature() {
  let hash=2166136261;const add=arr=>{const bytes=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength);for(const byte of bytes)hash=Math.imul(hash^byte,16777619)>>>0;};
  let vertices=0,instances=0;ike.updateMatrixWorld(true);
  ike.traverse(o=>{if(!o.isMesh)return;for(const name of Object.keys(o.geometry.attributes).sort())add(o.geometry.attributes[name].array);if(o.geometry.index)add(o.geometry.index.array);if(o.instanceMatrix){add(o.instanceMatrix.array);instances+=o.count;}vertices+=o.geometry.attributes.position?.count||0;});
  renderer.render(scene,camera);
  const image=document.createElement('canvas');image.width=renderer.domElement.width;image.height=renderer.domElement.height;
  const ctx=image.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
  let imageHash=2166136261;for(const byte of pixels)imageHash=Math.imul(imageHash^byte,16777619)>>>0;
  const materials=[];ike.traverse(o=>{if(o.isMesh){const mat=o.material;materials.push([o.userData.kind||'',o.visible,mat.type,mat.color?.getHexString(),mat.opacity,mat.wireframe,mat.metalness,mat.roughness]);}});
  return {hash:hash.toString(16),imageHash:imageHash.toString(16),materials,vertices,instances,seed:currentSeed,quality:SAFE_INST_LIMIT,autoOn,autoSpeed:controls.autoRotateSpeed,
   lastVisibleVessel:vesselType.dataset.lastVisibleValue,rotation:ike.rotation.toArray(),position:ike.position.toArray(),scale:ike.scale.toArray(),visibility:{...plantPartVisibility},
   camera:{position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,near:camera.near,far:camera.far,zoom:camera.zoom},
   lighting:{key:dir.intensity,ambient:hemi.intensity,exposure:renderer.toneMappingExposure},background:bgColor.value,
   toolbar:canvasToolbar.style.display,cameraPad:cameraPad.style.display,theme:document.documentElement.dataset.theme};
 }
}; initial();`;
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(file===path.join(root,'index.html')?data.toString().replace('      initial();',probe):data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await page.waitForSelector('.random-lock-btn',{state:'attached'});await page.waitForTimeout(500);
  const canonical=value=>JSON.parse(JSON.stringify(value,(_key,item)=>typeof item==='number'?Math.round(item*1e9)/1e9:item));
  const equal=(before,after,label)=>assert.deepEqual(canonical(after),canonical(before),label);
  const references=[];
  for(const species of ['pine','maple','magnolia']) {
   await page.locator('[data-tab="bonsai"].side-btn').click();
   await page.evaluate(species=>window.__saveProbe.setup(species),species);await page.waitForTimeout(200);
   const before=await page.evaluate(()=>window.__saveProbe.signature());
   await page.locator('#tbSnapAdd').click();const record=await page.evaluate(()=>window.__saveProbe.stored()[0]);
   await page.evaluate(()=>window.__saveProbe.mutate());
   await page.locator('[data-tab="gallery"].side-btn').click();
   await page.locator('.gallery-tile').first().hover();await page.locator('[data-action="recall"]').first().click();await page.waitForTimeout(200);
   equal(before,await page.evaluate(()=>window.__saveProbe.signature()),species+' UI Recall');
   references.push({species,id:record.id,signature:before});
  }
  const exportPromise=page.waitForEvent('download');await page.locator('#galleryExportAllBtn').click();
  const download=await exportPromise;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(exported.version,1);assert.equal(exported.snapshots.length,3);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#snapshotCount')?.textContent==='3');
  const persisted=await page.evaluate(()=>window.__saveProbe.stored());
  assert.deepEqual(persisted.map(s=>s.id).sort(),references.map(s=>s.id).sort());
  equal(exported.snapshots.map(({thumb,thumbnail,...record})=>record),persisted,'IndexedDB preserves complete serialized state');
  const imported=await browser.newPage({viewport:{width:1440,height:1000}});imported.on('pageerror',e=>errors.push(e.message));
  await imported.goto(page.url(),{waitUntil:'domcontentloaded'});await imported.waitForSelector('.random-lock-btn',{state:'attached'});await imported.waitForTimeout(300);
  const upload=async(value)=>{
   await imported.locator('#snapImportFile').setInputFiles({name:'saves.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
   await imported.waitForFunction(()=>document.querySelector('#snapImportFile').value==='');
  };
  await upload(exported);await imported.waitForFunction(()=>document.querySelector('#snapshotCount').textContent==='3');
  for(const reference of references) {
   // Stored zero speed must keep the view still even when auto-rotation is enabled.
   await imported.evaluate(()=>window.__saveProbe.mutate());
   const state=await imported.evaluate(id=>window.__saveProbe.stored().find(s=>s.id===id).state,reference.id);
   await imported.evaluate(state=>window.__saveProbe.apply(state),state);await imported.waitForTimeout(200);
   equal(reference.signature,await imported.evaluate(()=>window.__saveProbe.signature()),reference.species+' exported/imported Recall');
  }
  // Verify full namespaced envelopes, both nested and top-level forms.
  const current=exported.snapshots[0];
  await upload([{id:'namespaced-nested',state:current.state.namespaced},{id:'namespaced-top',...current.state.namespaced}]);
  await imported.waitForFunction(()=>document.querySelector('#snapshotCount').textContent==='5');
  const currentReference=references.find(item=>item.id===current.id);
  for(const id of ['namespaced-nested','namespaced-top']) {
   await imported.evaluate(()=>window.__saveProbe.mutate());
   const state=await imported.evaluate(id=>window.__saveProbe.stored().find(s=>s.id===id).state,id);
   await imported.evaluate(state=>window.__saveProbe.apply(state),state);await imported.waitForTimeout(200);
   equal(currentReference.signature,await imported.evaluate(()=>window.__saveProbe.signature()),id);
  }
  await imported.evaluate(()=>window.__saveProbe.mutate());
  const quotaState=exported.snapshots[0].state;
  await imported.evaluate(state=>{
   const write=Storage.prototype.setItem;
   Storage.prototype.setItem=()=>{throw new DOMException('Storage full','QuotaExceededError');};
   try{window.__saveProbe.apply(state);}finally{Storage.prototype.setItem=write;}
  },quotaState);await imported.waitForTimeout(200);
  equal(currentReference.signature,await imported.evaluate(()=>window.__saveProbe.signature()),'recall tolerates unavailable preference storage');
  const historical=[];
  for(const file of ['legacy-march06.json','transitional-march10.json']) {
   const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',file),'utf8'));
   await upload([fixture]);
   const first=await imported.evaluate(id=>window.__saveProbe.recallFrozen(id),fixture.id);
   await imported.evaluate(()=>window.__saveProbe.mutate());
   const second=await imported.evaluate(id=>window.__saveProbe.recallFrozen(id),fixture.id);
   equal(first,second,file+' repeatability');assert.equal(second.seed,fixture.state.seed);
   equal(fixture.state.camera.position,second.camera.position,file+' camera position');
   equal(fixture.state.camera.target,second.camera.target,file+' camera target');
   historical.push({file,seed:second.seed,hash:second.hash});
  }
  const count=await imported.locator('#snapshotCount').textContent();
  await upload(exported);assert.equal(await imported.locator('#snapshotCount').textContent(),count);
  for(const bad of ['{broken',{},[{id:'empty',state:{}}],[{id:'sakana',state:{mode:'sakana',hub:{},module:{key:'sakana'}}}]]) {
   await upload(bad);assert.equal(await imported.locator('#snapshotCount').textContent(),count);
  }
  await imported.setViewportSize({width:390,height:844});await imported.waitForTimeout(250);
  await imported.evaluate(()=>{window.__saveProbe.setup('pine');window.__saveProbe.autoQuality();});await imported.waitForTimeout(200);
  const autoState=await imported.evaluate(()=>window.__saveProbe.capture());
  const mobile=await imported.evaluate(()=>window.__saveProbe.signature());
  assert.equal(autoState.controls.qualityMode,'auto');assert.equal(autoState.scene.qualityTier,'mobile');
  await imported.setViewportSize({width:1440,height:1000});await imported.waitForTimeout(250);
  await imported.evaluate(state=>window.__saveProbe.apply(state),autoState);await imported.waitForTimeout(200);
  const desktop=await imported.evaluate(()=>window.__saveProbe.signature());
  assert.equal(desktop.quality,320);assert.equal(desktop.hash,mobile.hash);equal(mobile.camera,desktop.camera,'cross-viewport saved camera');
  assert.deepEqual(errors,[]);
  const report={current:references.map(({species,id,signature})=>({species,id,hash:signature.hash,imageHash:signature.imageHash,seed:signature.seed,quality:signature.quality})),historical,checks:['UI Save/Recall','JSON export/fresh-context import','IndexedDB reload','nested/top-level namespaced records','historical array import and repeated recall','duplicate/malformed/unsupported import','zero-speed view stability','queued resize cannot replace saved framing/quality','recall with unavailable localStorage writes','auto-quality geometry preserved across compact/desktop viewports'],errors};
  if(process.env.BONSAI_SAVE_REPORT)fs.writeFileSync(process.env.BONSAI_SAVE_REPORT,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
