const {chromium}=require(process.env.BONSAI_PLAYWRIGHT||'playwright-core');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],results=[];
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}});desktop.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${server.address().port}/`;await desktop.goto(url,{waitUntil:'domcontentloaded'});await desktop.waitForSelector('.random-lock-btn',{state:'attached'});
 await desktop.mouse.move(1100,200);await desktop.waitForTimeout(200);
 const pen=await desktop.context().newCDPSession(desktop);
 await pen.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1101,y:201,pointerType:'pen'});
 assert.equal(await desktop.evaluate(()=>document.documentElement.dataset.utilityInput),'touch','pen hover must restore direct utility access after mouse input');
 const lock=desktop.locator('.random-lock-btn:visible').first();await lock.scrollIntoViewIfNeeded();const rect=await lock.boundingBox();const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
 for(const type of ['mouseMoved','mousePressed','mouseReleased'])await pen.send('Input.dispatchMouseEvent',{type,x,y,pointerType:'pen',...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});
 assert.equal(await lock.getAttribute('aria-pressed'),'true','native pen contact toggles once');
 await desktop.mouse.move(1100,200);await desktop.waitForTimeout(200);assert.equal(await desktop.evaluate(()=>document.documentElement.dataset.utilityInput),'mouse');assert.equal(await lock.evaluate(e=>getComputedStyle(e).opacity),'1');
 results.push({input:'CDP pen',checks:['pen hover after mouse reveals utilities','pen contact toggles lock once','mouse restores quiet reveal; locked state persists']});await desktop.close();
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844},deviceScaleFactor:1});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForSelector('.random-lock-btn',{state:'attached'});await page.waitForTimeout(300);
 const tap=async locator=>{await locator.scrollIntoViewIfNeeded();await locator.tap();};
 await tap(page.locator('[data-tab="bonsai"].side-btn'));
 const utility=page.locator('.random-lock-btn:visible').first();assert.equal(await utility.evaluate(e=>getComputedStyle(e).opacity),'1');
 await tap(utility);assert.equal(await utility.getAttribute('aria-pressed'),'true');await tap(utility);assert.equal(await utility.getAttribute('aria-pressed'),'false');
 const visibility=page.locator('.section-vis-toggle:visible').first();await tap(visibility);assert.equal(await visibility.getAttribute('aria-pressed'),'true');await tap(visibility);assert.equal(await visibility.getAttribute('aria-pressed'),'false');
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:375,height:667},{width:667,height:375}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(150);
  const toggle=page.locator('#panelToggleRail');await tap(toggle);assert.equal(await page.locator('#panel').isVisible(),false);await tap(toggle);assert.equal(await page.locator('#panel').isVisible(),true);
  // Native touch Save must be hit-testable above the dock in each orientation.
  const save=page.locator('#tbSnapAdd');const box=await save.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,'Save fits viewport');
  assert.equal(await save.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'Save is not covered');
  await tap(save);await tap(page.locator('[data-tab="gallery"].side-btn'));await page.waitForSelector('.gallery-tile');
  const tile=page.locator('.gallery-tile').first();await tap(tile);await page.waitForTimeout(200);assert.equal(await tile.locator('.gallery-menu-trigger').evaluate(e=>getComputedStyle(e).opacity),'1');
  await tap(tile.locator('.gallery-menu-trigger'));await tap(page.locator('#galleryCardMenu [data-action="recall"]'));await page.waitForTimeout(150);
  const geo=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,seam:Math.abs(document.querySelector('#panel').getBoundingClientRect().bottom-document.querySelector('#sidebar').getBoundingClientRect().top)}));assert.equal(geo.overflow,false);assert.ok(geo.seam<1);
  results.push({input:'native touch',viewport,...geo});
 }
 await tap(page.locator('.gallery-tile').first());await tap(page.locator('.gallery-tile').first().locator('.gallery-menu-trigger'));await tap(page.locator('#galleryCardMenu [data-action="delete"]'));assert.equal(await page.locator('#confirmModal').isVisible(),true);await tap(page.locator('#confirmCancelBtn'));assert.equal(await page.locator('#confirmModal').isVisible(),false);
 for(const theme of ['paper-mint','mono-slate','neon-grid']){await tap(page.locator('[data-tab="app"].side-btn'));await page.selectOption('#themeSelect',theme);await tap(page.locator('[data-tab="gallery"].side-btn'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);const report={date:'2026-11-17',browser:'headless Edge',results,pageErrors:errors,limits:'Emulated touch and CDP pen; not physical hardware or Safari. Theme checks cover geometry, not contrast certification.'};if(process.env.BONSAI_INPUT_REPORT)fs.writeFileSync(process.env.BONSAI_INPUT_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
