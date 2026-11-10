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
test('lock glyph reflects state through repeated toggles, independently of hover', () => {
  const context = vm.createContext({});
  vm.runInContext(extract('updateRandomLockButton'), context);
  const attrs = {};
  const button = {setAttribute(k,v) {attrs[k]=v;}};
  for (let i=0; i<100; i++) {
    const locked = i % 2 === 0;
    context.updateRandomLockButton(button, locked);
    assert.equal(attrs['aria-pressed'], String(locked));
    assert.ok(button.innerHTML.includes(locked ? 'iconoir-lock"' : 'iconoir-lock-slash"'));
    assert.equal(button.title, locked ? 'Unlock randomization' : 'Lock randomization');
  }
});
test('plant and vessel visibility use hidden pressed state and current-state glyph', () => {
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
      assert.ok(button.innerHTML.includes(visible ? 'iconoir-eye"' : 'iconoir-eye-closed"'));
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
