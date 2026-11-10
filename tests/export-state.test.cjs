const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function extract(name){const start=html.indexOf(`      function ${name}(`);assert.ok(start>=0);return html.slice(start,html.indexOf('\n      }',start)+8);}
const context=vm.createContext({renderer:{domElement:{width:924,height:974}}});
vm.runInContext(extract('getExportCropRect')+'\n'+extract('getExportTargetSize')+'\n'+extract('getGifFrameDelay'),context);
const plain=value=>JSON.parse(JSON.stringify(value));
test('exports center square, portrait and landscape crops inside the source',()=>{
 assert.deepEqual(plain(context.getExportCropRect(1600,1000,'square')),{sx:300,sy:0,sw:1000,sh:1000});
 assert.deepEqual(plain(context.getExportCropRect(1600,1000,'portrait')),{sx:400,sy:0,sw:800,sh:1000});
 assert.deepEqual(plain(context.getExportCropRect(900,1600,'landscape')),{sx:0,sy:547,sw:900,sh:506});
});
test('one-pixel crop sources never produce a zero-sized drawing region',()=>{
 for(const width of [1,2,100])for(const height of [1,2,100])for(const mode of ['full','square','portrait','landscape']){
  const crop=context.getExportCropRect(width,height,mode);
  assert.ok(crop.sw>=1&&crop.sh>=1);assert.ok(crop.sx>=0&&crop.sy>=0);assert.ok(crop.sx+crop.sw<=width&&crop.sy+crop.sh<=height);
 }
});
test('current export dimensions follow the crop and presets/custom dimensions stay explicit',()=>{
 assert.deepEqual(plain(context.getExportTargetSize({cropMode:'square'})),{width:924,height:924});
 assert.deepEqual(plain(context.getExportTargetSize({sizePreset:'1080-square'})),{width:1080,height:1080});
 assert.deepEqual(plain(context.getExportTargetSize({sizePreset:'2160-square'})),{width:2160,height:2160});
 assert.deepEqual(plain(context.getExportTargetSize({sizePreset:'1920x1080'})),{width:1920,height:1080});
 assert.deepEqual(plain(context.getExportTargetSize({sizePreset:'custom',width:320,height:240})),{width:320,height:240});
 assert.deepEqual(plain(context.getExportTargetSize({sizePreset:'custom',width:-4,height:-9})),{width:1,height:1});
});

test('GIF timing quantizes frame delays without shortening the declared 24 fps loop',()=>{
 const delays=Array.from({length:36},(_,index)=>context.getGifFrameDelay(index,24));
 assert.equal(delays.reduce((sum,delay)=>sum+delay,0),1500);
 assert.ok(delays.every(delay=>delay===40||delay===50));
});
