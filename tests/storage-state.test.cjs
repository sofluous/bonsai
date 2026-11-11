const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness({db=null,local=null,failDb=false,quota=Infinity}={}) {
 const data=new Map(local===null?[]:[['bonsai.snapshots.v1',JSON.stringify(local)]]),toasts=[];
 let database=db,dbFailure=failDb,limit=quota;
 const context={structuredClone,Date,JSON,Math,Number,Array,Promise,
  normalizeSnapshotRecord:s=>s?.id && s.schemaVersion!==99?s:null,showToast:m=>toasts.push(m),
  localStorage:{getItem:k=>data.get(k)||null,removeItem:k=>data.delete(k),setItem(k,v){if(v.length>limit)throw Error('QuotaExceeded');data.set(k,v);}},
  dbGetSnapshots:async()=>database,dbPutSnapshots:async(list,updatedAt)=>{await new Promise(r=>setTimeout(r,5));if(dbFailure)throw Error('QuotaExceeded');database={data:list,updatedAt};return true;},
 };
 vm.createContext(context);
 vm.runInContext(`const SNAPSHOT_STORAGE_KEY='bonsai.snapshots.v1',SNAPSHOT_RENDER_BATCH=24;let snapshots=[],preservedSnapshotRecords=[],snapshotStorageRevision=0,snapshotRenderCount=24,snapshotWriteQueue=Promise.resolve();`+
 source.slice(source.indexOf('      function saveSnapshotsToStorage('),source.indexOf('      function updateSnapshotCount()'))+
 source.slice(source.indexOf('      async function loadSnapshotsFromStorage()'),source.indexOf('      function formatSnapshotTime'))+
 `globalThis.api={save:saveSnapshotsToStorage,load:loadSnapshotsFromStorage,set:list=>snapshots=list,get:()=>snapshots};`,context);
 return {api:context.api,toasts,data,db:()=>database,recover:()=>{dbFailure=false;limit=Infinity;}};
}
test('newer fallback wins over stale database, migrates and retires fallback',async()=>{
 const h=harness({db:{data:[{id:'stale'}],updatedAt:10},local:{snapshots:[{id:'new'}],updatedAt:20}});
 await h.api.load();assert.equal(h.api.get()[0].id,'new');assert.equal(h.db().data[0].id,'new');assert.equal(h.data.size,0);
});
test('empty newer fallback preserves deletion rather than resurrecting last Save',async()=>{
 const h=harness({db:{data:[{id:'deleted'}],updatedAt:10},local:{snapshots:[],updatedAt:20}});
 await h.api.load();assert.equal(h.api.get().length,0);assert.equal(h.db().data.length,0);
});
test('legacy array remains readable; newer database wins over old fallback',async()=>{
 const h=harness({local:[{id:'legacy'}]});await h.api.load();assert.equal(h.api.get()[0].id,'legacy');
 const newer=harness({db:{data:[{id:'db'}],updatedAt:20},local:{snapshots:[{id:'old'}],updatedAt:10}});
 await newer.api.load();assert.equal(newer.api.get()[0].id,'db');
});
test('fallback quota strips previews but preserves state and reports limitation',async()=>{
 const h=harness({failDb:true,quota:500});h.api.set([{id:'a',thumb:'x'.repeat(1000),state:{seed:42}}]);
 assert.equal(await h.api.save('Saved'),true);const stored=JSON.parse(h.data.get('bonsai.snapshots.v1'));
 assert.equal(stored.snapshots[0].thumb,'');assert.equal(stored.snapshots[0].state.seed,42);assert.match(h.toasts[0],/without previews/);
});
test('total failure keeps session data, suppresses success and allows retry',async()=>{
 const h=harness({failDb:true,quota:0});h.api.set([{id:'session'}]);assert.equal(await h.api.save('Saved'),false);
 assert.equal(h.api.get()[0].id,'session');assert.equal(h.toasts.includes('Saved'),false);assert.match(h.toasts[0],/only in this session/);
 h.recover();assert.equal(await h.api.save('Saved'),true);assert.equal(h.db().data[0].id,'session');
});
test('overlapping writes capture their own data and finish with latest state',async()=>{
 const h=harness();h.api.set([{id:'first'}]);const first=h.api.save();h.api.set([{id:'last'}]);const last=h.api.save();
 await Promise.all([first,last]);assert.equal(h.db().data[0].id,'last');
});
test('malformed fallback is retained and warns without overwriting it',async()=>{
 const h=harness({local:{broken:true}});await h.api.load();assert.equal(h.api.get().length,0);assert.equal(h.data.size,1);assert.match(h.toasts[0],/could not be read/);
});

test('unsupported stored records survive migration and later writes unchanged',async()=>{
 const future={id:'future',schemaVersion:99,state:{newFeature:true},thumb:'opaque'};
 const h=harness({local:[{id:'known'},future,null]});await h.api.load();
 assert.equal(h.api.get().length,1);assert.deepEqual(JSON.parse(JSON.stringify(h.db().data[1])),future);
 h.api.set([{id:'new'}]);await h.api.save();assert.deepEqual(JSON.parse(JSON.stringify(h.db().data[1])),future);assert.equal(h.db().data[2],null);
});
test('preview reduction preserves opaque records and captured queued state',async()=>{
 const future={id:'future',schemaVersion:99,thumb:'opaque'};
 const h=harness({local:[future],failDb:true,quota:500});await h.api.load();
 h.api.set([{id:'first',thumb:'x'.repeat(1000)}]);const pending=h.api.save();h.api.set([{id:'later'}]);await pending;
 const stored=JSON.parse(h.data.get('bonsai.snapshots.v1')).snapshots;assert.equal(stored[0].id,'first');assert.deepEqual(stored[1],future);
});
