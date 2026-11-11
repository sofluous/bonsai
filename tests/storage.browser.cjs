const {chromium}=require(process.env.BONSAI_PLAYWRIGHT||'playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const root=path.resolve(__dirname,'..');
const probe=`const originalPut=dbPutSnapshots;
dbPutSnapshots=(...args)=>{if(window.__failDb)throw new DOMException('Test quota','QuotaExceededError');return originalPut(...args);};
const originalSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){if(k===SNAPSHOT_STORAGE_KEY&&window.__failLocal)throw new DOMException('Test quota','QuotaExceededError');return originalSet.call(this,k,v);};
window.__storageProbe={
 async seed(n){const state=captureControlState();snapshots=Array.from({length:n},(_,i)=>({id:'large-'+i,name:'Save '+i,createdAt:Date.now()-i,thumb:'',state}));snapshotRenderCount=24;renderSnapshotGallery();return await saveSnapshotsToStorage();},
 async save(){createSnapshot();return await snapshotWriteQueue;},
 async remove(id){deleteSnapshotById(id);return await snapshotWriteQueue;},
 async withFuture(){await originalPut([...snapshots,{id:'future-opaque',schemaVersion:99,state:{futureField:'keep'},thumb:'original-preview'}],Date.now()+1);},
 async flush(){return await snapshotWriteQueue;},ids(){return snapshots.map(s=>s.id);},
}; initial();`;
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(file===path.join(root,'index.html')?data.toString().replace('      initial();',probe):data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__storageProbe);await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__storageProbe.save()),true);
 const old=await page.evaluate(()=>window.__storageProbe.ids()[0]);
 await context.addInitScript(()=>{window.__failDb=true;});await page.evaluate(()=>{window.__failDb=true;});
 assert.equal(await page.evaluate(()=>window.__storageProbe.save()),true);
 const newest=await page.evaluate(()=>window.__storageProbe.ids()[0]);assert.notEqual(newest,old);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#snapshotCount')?.textContent==='2');
 assert.equal(await page.evaluate(()=>window.__storageProbe.ids()[0]),newest,'reload chooses newer fallback over stale DB');
 await page.evaluate(()=>window.__storageProbe.remove(window.__storageProbe.ids()[0]));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#snapshotCount')?.textContent==='1');assert.equal(await page.evaluate(()=>window.__storageProbe.ids()[0]),old);
 await page.evaluate(()=>window.__storageProbe.remove(window.__storageProbe.ids()[0]));await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__storageProbe);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__storageProbe.ids().length),0,'empty fallback does not resurrect deleted saves');
 await page.evaluate(()=>{window.__failLocal=true;document.querySelector('#toastStack').replaceChildren();});
 assert.equal(await page.evaluate(()=>window.__storageProbe.save()),false);assert.equal(await page.locator('.toast').filter({hasText:/^Saved$/}).count(),0);assert.match(await page.locator('.toast').last().textContent(),/only in this session/);
 await page.evaluate(()=>{window.__failDb=false;window.__failLocal=false;});
 await page.evaluate(()=>window.__storageProbe.save());await page.evaluate(()=>window.__storageProbe.withFuture());
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#snapshotCount')?.textContent==='2');
 assert.match(await page.locator('.toast').last().textContent(),/preserved/);
 await page.evaluate(()=>window.__storageProbe.save());await page.locator('[data-tab="gallery"].side-btn').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#galleryExportAllBtn').click();const download=await downloadPromise;
 const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.deepEqual(exported.snapshots.find(s=>s.id==='future-opaque'),{id:'future-opaque',schemaVersion:99,state:{futureField:'keep'},thumb:'original-preview'});
 await page.evaluate(()=>{window.__failDb=false;});
 const start=Date.now();assert.equal(await page.evaluate(()=>window.__storageProbe.seed(500)),true);
 const seedMs=Date.now()-start;assert.equal(await page.locator('.gallery-tile').count(),24);
 await page.locator('[data-tab="gallery"].side-btn').click();
 const tile=page.locator('.gallery-tile').first();await tile.focus();await tile.press('Enter');assert.equal(await tile.evaluate(el=>el===document.activeElement),true);assert.match(await tile.getAttribute('class'),/is-selected/);
 await page.evaluate(()=>{window.__firstTile=document.querySelector('.gallery-tile');});
 await tile.press('Space');assert.equal(await page.evaluate(()=>window.__firstTile===document.querySelector('.gallery-tile')),true,'selection retains DOM');
 const recall=tile.locator('[data-action="recall"]');await recall.focus();await recall.press('Enter');await page.evaluate(()=>window.__storageProbe.flush());assert.equal(await page.locator('.toast').filter({hasText:'Save loaded'}).count(),1,'native keyboard Recall works');assert.equal(await page.locator('.gallery-tile').first().locator('[data-action="recall"]').evaluate(el=>el===document.activeElement),true);
 const del=page.locator('.gallery-tile').first().locator('[data-action="delete"]');await del.focus();await del.press('Space');assert.equal(await page.locator('#confirmModal').isVisible(),true,'native keyboard Delete opens confirmation');await page.locator('#confirmCancelBtn').click();
 for(let i=0;i<20;i++)await page.locator('#galleryLoadMoreBtn').click();assert.equal(await page.locator('.gallery-tile').count(),500);assert.equal(await page.locator('#galleryLoadMoreBtn').isVisible(),false);
 await page.locator('.gallery-tile').last().focus();await page.locator('.gallery-tile').last().press('Enter');assert.equal(await page.locator('.gallery-tile.is-selected').last().getAttribute('data-id'),'large-499');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.gallery-tile').last().evaluate(el=>el.getBoundingClientRect().width>0),true);
 assert.deepEqual(errors,[]);const report={date:new Date().toISOString().slice(0,10),browser:'headless Edge',records:500,initialCards:24,loadedCards:500,seedAndPersistMs:seedMs,checks:['future stored record preservation and export','stale database recovery','fallback deletion including empty gallery','total storage failure truthful feedback','retry','bounded initial render','keyboard selection and Recall','native keyboard Delete confirmation','focus retention','all batches','compact viewport'],pageErrors:errors};
 if(process.env.BONSAI_STORAGE_REPORT)fs.writeFileSync(process.env.BONSAI_STORAGE_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
