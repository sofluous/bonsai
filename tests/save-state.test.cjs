const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function harness({failEffects = false} = {}) {
  const vector = (initial = [0,0,0]) => ({value: initial.slice(),set(...values){this.value=values;},toArray(){return this.value.slice();}});
  const elements = [
    {id:'treeType',tagName:'SELECT',type:'select-one',value:'pine',options:[{value:'pine',defaultSelected:true},{value:'maple'}]},
    {id:'qualityMode',tagName:'SELECT',type:'select-one',value:'mobile',options:[{value:'auto',defaultSelected:true},{value:'mobile'}]},
    {id:'keyLight',tagName:'INPUT',type:'range',value:'2.2',defaultValue:'2.2'},
    {id:'leafColor',tagName:'INPUT',type:'color',value:'#123456',defaultValue:'#2d6e52'},
    {id:'toolbarToggle',tagName:'INPUT',type:'checkbox',checked:false,defaultChecked:true},
  ];
  const lookup=id=>elements.find(element=>element.id===id);
  const win={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/bonsaiHubAdapter.js'),'utf8'),{structuredClone,window:win,document:{querySelectorAll:()=>elements}});
  const camera={position:vector([7,4,9]),up:vector([0,1,0]),fov:42,near:.03,far:180,zoom:1.1,updateProjectionMatrix(){}};
  const controls={target:vector([.2,.4,.1]),autoRotateSpeed:0,enableDamping:true,update(){}};
  const model={seed:123456,autoOn:false,scene:{transform:{rotation:[0,1.234,0,'XYZ']},plantVisibility:{leaves:false},qualityTier:'mobile'}};
  const calls=[];
  const adapter=win.BonsaiHubAdapterModule.createBonsaiHubAdapter({
    $:lookup,qualityModeUI:lookup('qualityMode'),camera,controls,
    applyBackground(){calls.push('background');},applyLightingFromUI(){},applyVesselOnly(){},applyRenderStyle(){},
    regenerate(){calls.push('regenerate');},refreshAllReadouts(){},sanitizeTerminalBounds(){calls.push('bounds');},
    setSeed:value=>{model.seed=value;},setAutoSpeed:value=>{controls.autoRotateSpeed=value;},setAutoRotate:value=>{model.autoOn=value;},
    getCurrentSeed:()=>model.seed,getAutoOn:()=>model.autoOn,toVec3Array:vec=>vec.toArray(),
    applyVec3:(vec,values)=>{if(Array.isArray(values)&&values.length===3&&values.every(Number.isFinite))vec.set(...values);},
    getSceneState:()=>JSON.parse(JSON.stringify(model.scene)),applySceneState:state=>{model.scene=state;calls.push('scene');},
    syncSnapshotEffects:()=>{calls.push('effects');if(failEffects)throw new Error('effect failure');},beginSnapshotRestore:()=>calls.push('begin'),endSnapshotRestore:()=>calls.push('end'),
  });
  return {adapter,camera,controls,model,calls,lookup};
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('complete saves preserve rotation, hidden parts, resolved quality, projection and zero speed in both payloads',()=>{
 const {adapter}=harness();const state=plain(adapter.captureControlState());
 assert.equal(state.autoSpeed,0);assert.equal(state.namespaced.hub.camera.autoRotateSpeed,0);
 assert.deepEqual(state.scene,state.namespaced.module.config.scene);
 assert.equal(state.scene.qualityTier,'mobile');assert.equal(state.scene.plantVisibility.leaves,false);
 assert.deepEqual(state.scene.transform.rotation,[0,1.234,0,'XYZ']);
 for(const [key,value] of Object.entries({fov:42,near:.03,far:180,zoom:1.1}))assert.equal(state.namespaced.hub.camera[key],value);
});
test('current and namespaced-only recall use the same reset and ordered runtime restore',()=>{
 for(const namespaced of [false,true]){
  const {adapter,camera,controls,model,calls,lookup}=harness();const captured=plain(adapter.captureControlState());
  lookup('leafColor').value='#ffffff';camera.fov=60;controls.autoRotateSpeed=3;model.seed=1;
  const state=namespaced?captured.namespaced:captured;
  adapter.applyControlState(state);
  assert.equal(camera.fov,42);assert.equal(camera.zoom,1.1);assert.equal(controls.autoRotateSpeed,0);
  assert.equal(model.seed,123456);assert.equal(lookup('leafColor').value,'#123456');
  assert.ok(calls.indexOf('effects')<calls.indexOf('bounds'));assert.ok(calls.indexOf('bounds')<calls.indexOf('regenerate'));assert.equal(calls[0],'begin');assert.equal(calls.at(-1),'end');
 }
});
test('older saves omit scene fields safely and reset missing controls instead of inheriting the current scene',()=>{
 const {adapter,camera,lookup,model,controls}=harness();lookup('leafColor').value='#ffffff';camera.fov=70;controls.autoRotateSpeed=3;
 adapter.applyControlState({seed:5,controls:{treeType:'maple'},autoOn:false,camera:{position:[1,2,3],target:[0,0,0]}});
 assert.equal(controls.autoRotateSpeed,.8);assert.equal(lookup('leafColor').value,'#2d6e52');assert.equal(camera.fov,38);assert.equal(camera.zoom,1);assert.deepEqual(plain(model.scene),{});
 assert.deepEqual(camera.position.toArray(),[1,2,3]);
});
test('historical records normalize idempotently without rewriting their source',()=>{
 const {adapter}=harness();
 for(const file of ['legacy-march06.json','transitional-march10.json']){
  const input=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',file),'utf8'));const original=JSON.stringify(input);
  const record=plain(adapter.normalizeSnapshotRecord(input));assert.ok(record.state);assert.equal(record.state.seed,input.state.seed);
  assert.deepEqual(plain(adapter.normalizeSnapshotRecord(record)),record);assert.equal(JSON.stringify(input),original);
 }
});
test('unsupported or empty records cannot enter the gallery',()=>{
 const {adapter}=harness();
 for(const record of [null,{}, {id:'empty',state:{}},{id:'wrong-legacy',mode:'sakana',state:{seed:1,controls:{}}},{id:'wrong-module',state:{mode:'sakana',hub:{},module:{key:'sakana'}}}])assert.equal(adapter.normalizeSnapshotRecord(record),null);
});

test('restoration always releases its layout guard when a runtime effect fails',()=>{
 const {adapter,calls}=harness({failEffects:true});
 assert.throws(()=>adapter.applyControlState({seed:1,controls:{}}),/effect failure/);
 assert.equal(calls.at(-1),'end');
});
test('invalid imported camera projection falls back to finite defaults',()=>{
 const {adapter,camera}=harness();
 adapter.applyControlState({seed:1,controls:{},camera:{position:[1,2,3],target:[0,0,0],fov:0,near:-1,far:0,zoom:-1}});
 assert.deepEqual([camera.fov,camera.near,camera.far,camera.zoom],[38,.1,200,1]);
});

test('nested namespaced envelopes with an omitted Bonsai mode retain compatibility',()=>{
 const {adapter}=harness();const namespaced=plain(adapter.captureControlState().namespaced);delete namespaced.mode;
 const record=adapter.normalizeSnapshotRecord({id:'early-envelope',state:{namespaced}});
 assert.equal(record.mode,'bonsai');adapter.applyControlState(record.state);
 assert.equal(adapter.captureControlState().seed,123456);
});

test('record schema upgrades are explicit, idempotent and preserve extension fields',()=>{
 const {adapter}=harness();const input={id:'legacy-version',extra:{note:'retain'},state:{seed:42,controls:{treeType:'pine'}}};
 const original=JSON.stringify(input);const migrated=plain(adapter.normalizeSnapshotRecord(input));
 assert.equal(migrated.schemaVersion,2);assert.equal(migrated.state.seed,42);assert.deepEqual(migrated.extra,input.extra);
 assert.equal(JSON.stringify(input),original);assert.deepEqual(plain(adapter.normalizeSnapshotRecord(migrated)),migrated);
});
test('unsupported record versions are rejected before legacy or namespaced interpretation',()=>{
 const {adapter}=harness();for(const schemaVersion of [0,3,99,'1',null,-1,1.5]){
  assert.equal(adapter.normalizeSnapshotRecord({id:'future',schemaVersion,state:adapter.captureControlState()}),null);
 }
 assert.equal(adapter.normalizeSnapshotRecord({id:'current',schemaVersion:1,state:adapter.captureControlState()}).schemaVersion,2);
});

test('version 2 recalls namespaced values over conflicting legacy mirrors',()=>{
 const {adapter,model,lookup,camera}=harness();const state=plain(adapter.captureControlState());
 state.seed=999;state.controls.treeType='maple';state.camera.fov=60;state.scene={wrong:true};
 adapter.applyControlState(state);assert.equal(model.seed,123456);assert.equal(lookup('treeType').value,'pine');assert.equal(camera.fov,42);assert.equal(model.scene.wrong,undefined);
 const record=plain(adapter.normalizeSnapshotRecord({id:'two',schemaVersion:2,mode:'sakana',module:{key:'sakana'},state}));
 assert.equal(record.state.seed,123456);assert.equal(record.state.controls.treeType,'pine');assert.equal(record.state.camera.fov,42);
 assert.deepEqual(plain(adapter.normalizeSnapshotRecord(record)),record);
});
test('unversioned and version 1 conflicts migrate with historical legacy precedence',()=>{
 const {adapter}=harness();for(const schemaVersion of [undefined,1]){
  const state=plain(adapter.captureControlState());delete state.schemaVersion;state.seed=77;state.controls.treeType='maple';
  const record=adapter.normalizeSnapshotRecord({id:'old',schemaVersion,state});assert.equal(record.schemaVersion,2);
  assert.equal(record.state.namespaced.hub.seed,77);assert.equal(record.state.namespaced.module.config.controls.treeType,'maple');
 }
});
test('version 2 missing or malformed authority is rejected without applying legacy data',()=>{
 const {adapter,model,calls}=harness();const state=plain(adapter.captureControlState());
 for(const namespaced of [undefined,{}, {...state.namespaced,hub:[]},{...state.namespaced,module:{key:'sakana'}}, {...state.namespaced,appShell:[]}]){
  const broken={...state,seed:999,namespaced};assert.equal(adapter.normalizeSnapshotRecord({id:'bad',schemaVersion:2,state:broken}),null);
  assert.equal(adapter.applyControlState(broken),false);assert.equal(model.seed,123456);assert.equal(calls.length,0);
 }
});
test('compatibility mirror reproduces canonical recall in a legacy-only reader',()=>{
 const canonical=harness();const mirror=harness();const state=plain(canonical.adapter.captureControlState());
 canonical.adapter.applyControlState(state);delete state.schemaVersion;delete state.namespaced;mirror.adapter.applyControlState(state);
 assert.deepEqual(plain(mirror.adapter.captureControlState()),plain(canonical.adapter.captureControlState()));
});

test('compatibility mirror objects do not alias authoritative scene and camera values',()=>{
 const {adapter}=harness();const state=adapter.captureControlState();
 const position=state.namespaced.hub.camera.position[0];state.camera.position[0]=999;
 assert.equal(state.namespaced.hub.camera.position[0],position);
 state.scene.transform.rotation[0]=999;assert.notEqual(state.namespaced.module.config.scene.transform.rotation[0],999);
});

test('top-level compatibility mirrors cannot mutate version 2 authority',()=>{
 const {adapter}=harness();const record=adapter.normalizeSnapshotRecord({id:'top-mirrors',schemaVersion:2,state:adapter.captureControlState()});
 record.hub.seed=999;record.module.config.controls.treeType='maple';record.appShell.themeSelect='wrong';
 assert.equal(record.state.namespaced.hub.seed,123456);assert.equal(record.state.namespaced.module.config.controls.treeType,'pine');
 assert.notEqual(record.state.namespaced.appShell.themeSelect,'wrong');
});
