const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
function extract(name) {
  const start = html.indexOf(`      function ${name}(`);
  assert.ok(start >= 0);
  return html.slice(start, html.indexOf('\n      }', start) + 8);
}
test('lock state remains explicit while CSS action previews are regenerated', () => {
  const context = vm.createContext({});
  vm.runInContext(extract('updateRandomLockButton'), context);
  const attrs = {};
  const button = {setAttribute(k,v) {attrs[k]=v;}};
  for (let i=0; i<100; i++) {
    const locked = i % 2 === 0;
    context.updateRandomLockButton(button, locked);
    assert.equal(attrs['aria-pressed'], String(locked));
    assert.ok(button.innerHTML.includes('utility-current iconoir iconoir-lock'));assert.ok(button.innerHTML.includes(locked ? 'utility-next iconoir iconoir-lock-slash' : 'utility-next iconoir iconoir-lock'));
    assert.equal(button.title, locked ? 'Unlock randomization' : 'Lock randomization');
  }
});
test('plant and vessel visibility retain hidden pressed state with CSS action icons', () => {
  for (const kind of ['Plant', 'Vessel']) {
    let visible = true;
    const attrs = {};
    const button = {setAttribute(k,v) {attrs[k]=v;}};
    const context = vm.createContext({
      panelRoot: {querySelector: () => ({querySelector: () => button})},
      [`is${kind}PartVisible`]: () => visible,
    });
    vm.runInContext(extract(`update${kind}PartToggleButton`), context);
    for (let i=0; i<20; i++) {
      visible = i % 2 === 0;
      context[`update${kind}PartToggleButton`]('leaves');
      assert.equal(attrs['aria-pressed'], String(!visible));
      assert.ok(button.innerHTML.includes('utility-current iconoir iconoir-eye-closed'));
      assert.ok(button.innerHTML.includes('utility-next iconoir iconoir-eye'));
    }
  }
});
test('save UI preserves legacy persistence contracts', () => {
  assert.ok(html.includes('bonsai.snapshots.v1'));
  assert.ok(html.includes('const SNAPSHOT_DB_NAME = "bonsai.gallery.db"'));
  assert.equal(html.includes('id="snapSave"'), false);
  const toolbar = html.slice(html.indexOf('<div id="canvasToolbar"'), html.indexOf('<div class="hud-camera"'));
  assert.ok(toolbar.indexOf('id="tbSnapAdd"') < toolbar.indexOf('id="randomizeAll"'));
});

test('randomizing vessel choices preserves hidden and visible states', () => {
  const context = vm.createContext({});
  vm.runInContext(extract('randomizeElement'), context);
  for (const id of ['vesselType','mediumType','platformType']) {
    const control = {id,tagName:'SELECT',value:'none',options:[{value:'none'},{value:'a'},{value:'b',disabled:true}]};
    context.randomizeElement(control);assert.equal(control.value,'none');
    control.value='a';
    for(let i=0;i<50;i++){context.randomizeElement(control);assert.equal(control.value,'a');}
  }
});
test('input-mode handoff follows mouse, touch and hovering pen without changing toggle state',()=>{
 const root={dataset:{}};const context=vm.createContext({document:{documentElement:root}});
 vm.runInContext(extract('updateUtilityInput'),context);
 for(const [pointerType,expected] of [['mouse','mouse'],['pen','touch'],['mouse','mouse'],['touch','touch'],['','touch']]){
  context.updateUtilityInput({pointerType});assert.equal(root.dataset.utilityInput,expected);
 }
});
