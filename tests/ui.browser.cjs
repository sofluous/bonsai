const {chromium}=require(process.env.BONSAI_PLAYWRIGHT || 'playwright-core');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true}); const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.random-lock-btn',{timeout:45000,state:'attached'});
 if(await page.locator('#app').evaluate(e=>e.classList.contains('panel-hidden')))await page.locator('#panelToggle').click();
 const checkDesktopShell = async () => {
   const geometry = await page.evaluate(() => {
     const rect = selector => document.querySelector(selector).getBoundingClientRect();
     const header=rect('.app-head'), rail=rect('#sidebar'), panel=rect('#panel');
     return {headRail:Math.abs(header.bottom-rail.top),headPanel:Math.abs(header.bottom-panel.top),railPanel:Math.abs(rail.right-panel.left),owners:['.app-head','#sidebar','#panel'].every(selector=>document.querySelector(selector).parentElement.id==='controlShell')};
   });
   assert.ok(geometry.owners); assert.ok(geometry.headRail<1 && geometry.headPanel<1 && geometry.railPanel<1);
 };
 await checkDesktopShell();
 const lock=page.locator('.random-lock-btn:visible').first();const row=lock.locator('..');
 await row.hover();await lock.click();assert.equal(await lock.getAttribute('aria-pressed'),'true');
 await page.mouse.move(1100,200);await page.waitForTimeout(200);assert.equal(await lock.evaluate(e=>getComputedStyle(e).opacity),'1');
 assert.ok(await lock.locator('.iconoir-lock').count());
 await row.hover();await lock.click();await page.mouse.move(1100,200);await page.waitForTimeout(200);assert.equal(await lock.evaluate(e=>getComputedStyle(e).opacity),'0');
 await row.hover();await lock.focus();await page.keyboard.press('Space');assert.equal(await lock.getAttribute('aria-pressed'),'true');
 await page.keyboard.press('Space');assert.equal(await lock.getAttribute('aria-pressed'),'false');
 const vis=page.locator('.section-vis-toggle:visible').first();await vis.locator('xpath=ancestor::h2').hover();await vis.click();assert.equal(await vis.getAttribute('aria-pressed'),'true');assert.equal(await vis.locator('.iconoir-eye-closed').count(),1);
 await page.mouse.move(1100,200);assert.equal(await vis.evaluate(e=>getComputedStyle(e).opacity),'1');
 await vis.click();assert.equal(await vis.getAttribute('aria-pressed'),'false');
 await page.locator('#moduleSwitchBtn').click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');assert.equal(await page.locator('#moduleSwitchBtn').getAttribute('aria-expanded'),'false');
 await page.locator('#moduleSwitchBtn').click();await page.locator('#panelToggle').click();assert.equal(await page.locator('#moduleSwitch').isVisible(),false);assert.equal(await page.locator('#moduleSwitchBtn').getAttribute('aria-expanded'),'false');await page.locator('#panelToggle').click();
 await page.locator('#tbSnapAdd').click();await page.locator('[data-tab="gallery"].side-btn').click();await page.waitForSelector('.gallery-tile');
 assert.equal(await page.locator('#galleryLoadMoreBtn').isVisible(),false);
 const geometry=await page.locator('#snapshotGallery').evaluate(e=>({grid:e.getBoundingClientRect().width,parent:e.parentElement.getBoundingClientRect().width,tile:e.querySelector('.gallery-tile').getBoundingClientRect().width}));assert.ok(Math.abs(geometry.grid-geometry.parent)<2);assert.ok(Math.abs(geometry.tile-geometry.grid)<2);
 const icons=await page.evaluate(()=>['more-horiz','eye-closed','lock','lock-slash'].map(name=>{const i=document.createElement('i');i.className='iconoir iconoir-'+name;document.body.append(i);const style=getComputedStyle(i,'::before');const result={name,mask:style.maskImage,content:style.content};i.remove();return result;})); assert.ok(icons.every(icon=>icon.mask !== 'none')); console.log(JSON.stringify({geometry,icons:icons.map(icon=>icon.name),errors}));assert.deepEqual(errors,[]);
 for(const viewport of [{width:700,height:900},{width:390,height:844}]){await page.setViewportSize(viewport);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
   const seam=await page.evaluate(()=>Math.abs(document.querySelector('#panel').getBoundingClientRect().bottom-document.querySelector('#sidebar').getBoundingClientRect().top));assert.ok(seam<1);
   await page.locator('#panelToggleRail').click();assert.equal(await page.locator('#panel').isVisible(),false);
   await page.locator('#panelToggleRail').click();assert.equal(await page.locator('#panel').isVisible(),true);}
 await page.setViewportSize({width:1440,height:1000});
 for(const theme of ['paper-mint','mono-slate','neon-grid']) { await page.locator('[data-tab="app"].side-btn').click(); await page.selectOption('#themeSelect',theme); await page.locator('[data-tab="gallery"].side-btn').click(); await page.waitForTimeout(150); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); }
 await checkDesktopShell();
 if(process.env.BONSAI_SCREENSHOT)await page.screenshot({path:process.env.BONSAI_SCREENSHOT});
 console.log('Bonsai browser acceptance passed');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

