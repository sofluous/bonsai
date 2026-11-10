const {chromium}=require(process.env.BONSAI_PLAYWRIGHT||'playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const probe=`window.__exportProbe={
 setup(){setAutoRotate(false);setAutoSpeed(0);ike.rotation.set(0,.45,0);qualityModeUI.value='mobile';applyQualityProfile('mobile');treeType.value='pine';syncFormDefaultsFromSpecies();setSeed(123456);fallingLeavesToggle.checked=false;setPlantPartVisible('branches',false,false);bgTex.value='solid';bgColor.value='#314c65';applyBackground();regenerate();frameView();},
 sceneSignature(object=ike){
  object.updateMatrixWorld(true);let vertices=0,instances=0;const bounds=new THREE.Box3();
  const visit=(o,visible)=>{visible=visible&&o.visible;if(!visible)return;
   if(o.isMesh){const positions=o.geometry.attributes.position;const count=o.isInstancedMesh?o.count:1;instances+=count;
    for(let i=0;i<count;i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const local=new THREE.Matrix4();o.getMatrixAt(i,local);matrix.multiply(local);}for(let j=0;j<positions.count;j++){bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(positions,j).applyMatrix4(matrix));vertices++;}}}
   o.children.forEach(child=>visit(child,visible));};visit(object,true);
  return {vertices,instances,min:bounds.min.toArray(),max:bounds.max.toArray()};
 },
 state(){const saved=captureControlState();return {scene:saved.scene,camera:saved.camera,autoOn:saved.autoOn,autoSpeed:saved.autoSpeed,minDistance:controls.minDistance,maxDistance:controls.maxDistance,enabled:controls.enabled,damping:controls.enableDamping,renderer:{size:renderer.getSize(new THREE.Vector2()).toArray(),ratio:renderer.getPixelRatio(),width:renderer.domElement.width,height:renderer.domElement.height}};},
 async readGlb(bytes){const {GLTFLoader}=await import('https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');const data=await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer,'');return this.sceneSignature(data.scene);},
 readJson(model){return this.sceneSignature(new THREE.ObjectLoader().parse(model));},
 editPose(rotation,zoom){ike.rotation.y=rotation;camera.zoom=zoom;camera.updateProjectionMatrix();},
 async failGif(stage){const original=gifLibPromise;gifLibPromise=Promise.resolve(class {addFrame(){if(stage==='capture')throw new Error('Injected capture failure');}on(){}render(){throw new Error('Injected encoding failure');}});try{await exportLoopGif();}finally{gifLibPromise=original;}},
 trackEncoding(){const render=window.GIF.prototype.render;window.__encodingReady=false;window.GIF.prototype.render=function(...args){window.__encodingReady=true;return render.apply(this,args);};}

};initial();`;
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(file===path.join(root,'index.html')?data.toString().replace('      initial();',probe):data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await page.waitForSelector('.random-lock-btn',{state:'attached'});await page.waitForTimeout(400);
  await page.evaluate(()=>window.__exportProbe.setup());await page.locator('[data-tab="export"].side-btn').click();
  const round=value=>JSON.parse(JSON.stringify(value,(_key,item)=>typeof item==='number'?Math.round(item*1e8)/1e8:item));
  const equal=(a,b,label)=>assert.deepEqual(round(a),round(b),label);
  const outputDir=process.env.BONSAI_EXPORT_OUTPUT;
  const outputs=[];
  const download=async(target,trigger)=>{const promise=target.waitForEvent('download',{timeout:30000});await trigger();const file=await promise;return fs.readFileSync(await file.path());};
  const decode=async(bytes)=>page.evaluate(async bytes=>{
   const image=await createImageBitmap(new Blob([new Uint8Array(bytes)]));const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,image.width,image.height).data;let empty=0,solid=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)empty++;if(pixels[i]===255)solid++;}
   const result={width:image.width,height:image.height,transparentPixels:empty,opaquePixels:solid,corner:Array.from(pixels.slice(0,4))};image.close();return result;
  },Array.from(bytes));
  const reference=await page.evaluate(()=>window.__exportProbe.sceneSignature());
  const state=await page.evaluate(()=>window.__exportProbe.state());
  for(const kind of ['png','jpeg','webp']){
   await page.selectOption('#exportImageKind',kind);await page.selectOption('#exportSizePreset','custom');await page.locator('#exportWidth').fill('320');await page.locator('#exportHeight').fill('240');
   const bytes=await download(page,()=>page.locator('#exportImageBtn').click());const image=await decode(bytes);
   assert.equal(image.width,320);assert.equal(image.height,240);
   if(kind==='png'){assert.ok(image.transparentPixels>0);assert.ok(image.opaquePixels>0);if(outputDir)fs.writeFileSync(path.join(outputDir,'transparent.png'),bytes);}
   else{assert.equal(image.transparentPixels,0);assert.equal(image.opaquePixels,320*240);}
   outputs.push({kind,bytes:bytes.length,...image});
  }
  await page.selectOption('#exportImageKind','png');await page.locator('label[aria-label="Transparent background for PNG export"]').click();assert.equal(await page.locator('#exportTransparent').isChecked(),false);
  const opaque=await decode(await download(page,()=>page.locator('#exportImageBtn').click()));assert.equal(opaque.opaquePixels,320*240);assert.deepEqual(opaque.corner,[49,76,101,255]);
  outputs.push({kind:'opaque-png',...opaque});
  await page.selectOption('#exportSizePreset','current');
  for(const [crop,aspect] of [['square',1],['portrait',.8],['landscape',16/9]]){
   await page.selectOption('#exportCropMode',crop);const image=await decode(await download(page,()=>page.locator('#exportImageBtn').click()));
   assert.ok(Math.abs(image.width/image.height-aspect)<.01);outputs.push({kind:'crop-'+crop,width:image.width,height:image.height});
  }
  for(const [preset,width,height] of [['1080-square',1080,1080],['2160-square',2160,2160],['1920x1080',1920,1080]]){
   await page.selectOption('#exportSizePreset',preset);const image=await decode(await download(page,()=>page.locator('#exportImageBtn').click()));assert.equal(image.width,width);assert.equal(image.height,height);outputs.push({kind:preset,width,height});
  }
  await page.locator('[data-export-tab="model"]').click();
  await page.selectOption('#exportModelKind','scene-json');const jsonBytes=await download(page,()=>page.locator('#exportModelBtn').click());const json=JSON.parse(jsonBytes);
  assert.equal(json.version,1);assert.equal(json.state.seed,123456);assert.equal(json.state.scene.plantVisibility.branches,false);assert.ok(json.model.geometries.every(geometry=>geometry.type==='BufferGeometry'));
  const native=await page.evaluate(model=>window.__exportProbe.readJson(model),json.model);outputs.push({kind:'scene-json',bytes:jsonBytes.length,signature:native});
  if(outputDir)fs.writeFileSync(path.join(outputDir,'model.json'),jsonBytes);
  await page.selectOption('#exportModelKind','glb');const glb=await download(page,()=>page.locator('#exportModelBtn').click());
  assert.equal(glb.subarray(0,4).toString(),'glTF');assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
  outputs.push({kind:'glb',bytes:glb.length,signature:await page.evaluate(bytes=>window.__exportProbe.readGlb(bytes),Array.from(glb))});
  if(outputDir)fs.writeFileSync(path.join(outputDir,'model.glb'),glb);
  await page.locator('[data-export-tab="gif"]').click();
  const gif=await download(page,()=>page.locator('#exportGifBtn').click());
  assert.equal(gif.subarray(0,6).toString(),'GIF89a');assert.equal(gif.readUInt16LE(6),512);assert.equal(gif.readUInt16LE(8),512);
  const loop=gif.indexOf('NETSCAPE2.0');assert.ok(loop>=0);assert.equal(gif.readUInt16LE(loop+13),0);
  const animation=await page.evaluate(async bytes=>{
   const decoder=new ImageDecoder({data:new Uint8Array(bytes),type:'image/gif'});await decoder.tracks.ready;
   const count=decoder.tracks.selectedTrack.frameCount;const samples=[];let duration=0;
   for(let index=0;index<count;index++){
    const {image}=await decoder.decode({frameIndex:index});duration+=image.duration;if(![0,Math.floor(count/2),count-1].includes(index)){image.close();continue;}const canvas=document.createElement('canvas');canvas.width=image.displayWidth;canvas.height=image.displayHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261,edgeDelta=0;
    for(let i=0;i<pixels.length;i++)hash=Math.imul(hash^pixels[i],16777619)>>>0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){if(x!==0&&y!==0&&x!==canvas.width-1&&y!==canvas.height-1)continue;const offset=(y*canvas.width+x)*4;for(let channel=0;channel<3;channel++)edgeDelta=Math.max(edgeDelta,Math.abs(pixels[offset+channel]-pixels[channel]));}
    samples.push({index,hash:hash.toString(16),edgeDelta,duration:image.duration});image.close();
   }
   decoder.close();return {frames:count,duration,samples};
  },Array.from(gif));
  assert.equal(animation.frames,36);assert.equal(animation.duration,1500000);assert.ok(new Set(animation.samples.map(sample=>sample.hash)).size>1);assert.ok(animation.samples.every(sample=>sample.edgeDelta<=8));
  outputs.push({kind:'gif',bytes:gif.length,...animation});if(outputDir)fs.writeFileSync(path.join(outputDir,'turntable.gif'),gif);
  equal(state,await page.evaluate(()=>window.__exportProbe.state()),'all exports preserve the live scene');
  // A second real encode uses the cached worker, while newer user edits must survive completion.
  await page.evaluate(()=>window.__exportProbe.trackEncoding());const next=page.waitForEvent('download',{timeout:30000});await page.locator('#exportGifBtn').click();
  await page.waitForFunction(()=>window.__encodingReady);await page.evaluate(()=>window.__exportProbe.editPose(.9,1.2));const edited=await page.evaluate(()=>window.__exportProbe.state());await next;
  await page.waitForFunction(()=>document.querySelector('#exportGifBtn').getAttribute('aria-busy')==='false');
  equal(edited,await page.evaluate(()=>window.__exportProbe.state()),'encoding completion preserves newer edits');
  for(const stage of ['capture','encoding']){
   const before=await page.evaluate(()=>window.__exportProbe.state());await page.evaluate(stage=>window.__exportProbe.failGif(stage),stage);
   equal(before,await page.evaluate(()=>window.__exportProbe.state()),stage+' failure preserves the live scene');assert.equal(await page.locator('#exportGifBtn').isEnabled(),true);
  }
  // Real resource failures remain recoverable without a page reload for the GIF worker.
  const failure=await browser.newPage({viewport:{width:1440,height:1000}});failure.on('pageerror',error=>errors.push(error.message));
  await failure.route('**/exporters/GLTFExporter.js',route=>route.abort());
  await failure.goto(page.url(),{waitUntil:'domcontentloaded'});await failure.waitForSelector('.random-lock-btn',{state:'attached'});await failure.waitForTimeout(300);await failure.evaluate(()=>window.__exportProbe.setup());
  await failure.locator('[data-tab="export"].side-btn').click();const failureState=await failure.evaluate(()=>window.__exportProbe.state());
  await failure.locator('[data-export-tab="model"]').click();await failure.locator('#exportModelBtn').click();await failure.waitForFunction(()=>document.querySelector('#toastStack').textContent.includes('GLB export unavailable'));
  equal(failureState,await failure.evaluate(()=>window.__exportProbe.state()),'GLB loader failure preserves the scene');
  await failure.route('**/gif.worker.js',route=>route.abort());await failure.locator('[data-export-tab="gif"]').click();await failure.locator('#exportGifBtn').click();
  await failure.waitForFunction(()=>document.querySelector('#toastStack').textContent.includes('GIF export failed'));
  equal(failureState,await failure.evaluate(()=>window.__exportProbe.state()),'GIF worker failure preserves the scene');assert.equal(await failure.locator('#exportGifBtn').isEnabled(),true);
  await failure.unroute('**/gif.worker.js');const recovered=await download(failure,()=>failure.locator('#exportGifBtn').click());assert.equal(recovered.subarray(0,6).toString(),'GIF89a');
  const near=(a,b)=>Math.abs(a-b)<1e-4;
  for(const output of outputs.filter(item=>item.signature)){assert.equal(output.signature.vertices,reference.vertices);assert.equal(output.signature.instances,reference.instances);for(const key of ['min','max'])assert.ok(output.signature[key].every((value,i)=>near(value,reference[key][i])),output.kind+' bounds');}
  assert.deepEqual(errors,[]);
  const report={reference,outputs,checks:['image sizes/crops/PNG alpha/opaque JPEG-WebP','native JSON final buffer geometry and Save metadata','GLB v2 visible geometry and expanded foliage instances','36-frame square looping GIF decoded','live view/renderer/playback restoration','repeat encode and newer edits preserved','capture/encoding/resource failure handling','GIF worker retry'],errors};
  if(outputDir)fs.writeFileSync(path.join(outputDir,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
