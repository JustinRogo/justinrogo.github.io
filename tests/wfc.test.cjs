// Run with: node --test tests/wfc.test.cjs (or node tests/wfc.test.cjs)
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Wave, PRESETS, samplePreset} = require('../Pages/For Fun/Wave-Function-Collapse/engine.js');
const {normalizeSample,readSample} = require('../Pages/For Fun/Wave-Function-Collapse/painter.js');

function solve(preset, seed, size = 24) {
  for (let attempt = 0; attempt <= 24; attempt++) {
    const wave = new Wave(size, Math.round(size * .72), preset, `${seed}|${attempt}`);
    for (let i = 0; i <= wave.cells.length && !wave.complete && !wave.failed; i++) wave.step();
    if (wave.complete) return wave;
  }
  throw new Error(`No solution for ${seed}`);
}
function verify(wave) {
  assert.equal(wave.complete, true);
  assert.equal(wave.possibilities, 0);
  assert.equal(wave.resolved, wave.width * wave.height);
  wave.cells.forEach((options, i) => {
    assert.equal(options.length, 1);
    const tile = wave.tiles[options[0]], x = i % wave.width, y = Math.floor(i / wave.width);
    if (x + 1 < wave.width) assert.equal(tile.edges[1], wave.tiles[wave.cells[i+1][0]].edges[3]);
    if (y + 1 < wave.height) assert.equal(tile.edges[2], wave.tiles[wave.cells[i+wave.width][0]].edges[0]);
    if (wave.preset.boundary != null) {
      if (!x) assert.equal(tile.edges[3], wave.preset.boundary);
      if (!y) assert.equal(tile.edges[0], wave.preset.boundary);
      if (x === wave.width - 1) assert.equal(tile.edges[1], wave.preset.boundary);
      if (y === wave.height - 1) assert.equal(tile.edges[2], wave.preset.boundary);
    }
  });
}
for (const [name, preset] of Object.entries(PRESETS)) {
  test(`${name}: generated tiles match all neighbors and boundaries for varied seeds`, () => {
    for (const seed of ['little-wonders', 'hello', '0', '🌱', 'island-time', 'loops']) verify(solve(preset, seed));
    verify(solve(preset, 'large-world', 48));
  });
  test(`${name}: replay is deterministic and a new seed changes the result`, () => {
    const first = solve(preset, 'replay');
    assert.deepEqual(solve(preset, 'replay').cells, first.cells);
    assert.notDeepEqual(solve(preset, 'different').cells, first.cells);
  });
}
test('manual observation propagates constraints and never adds forbidden choices', () => {
  const wave = new Wave(24, 17, PRESETS.circuits, 'manual');
  const before = wave.cells.map(options => [...options]);
  const index = 200;
  wave.step(index);
  assert.equal(wave.cells[index].length, 1);
  assert.equal(wave.last, index);
  wave.cells.forEach((options, i) => options.forEach(option => assert.ok(before[i].includes(option))));
  for (let i=0;i<wave.cells.length&&!wave.complete&&!wave.failed;i++)wave.step();
  verify(wave);
});
test('contradictions are reported and do not masquerade as finished worlds', () => {
  const impossible = {boundary:'0',tiles:[{weight:1,edges:['1','1','1','1']}]};
  const wave = new Wave(3,3,impossible,'failure');
  assert.equal(wave.failed,true);
  assert.equal(wave.complete,false);
  assert.equal(wave.step(),'failed');
});
test('Shannon entropy uses weights, not only the number of options', () => {
  const wave = new Wave(4,4,PRESETS.circuits,'entropy');
  assert.ok(wave.entropy([0,15]) < wave.entropy([3,6]));
  assert.equal(wave.entropy([0]),0);
});

function paintedSample(patternSize = 2, rotations = false, size = 6) {
  return {size, pixels: Array.from({length:size*size},(_,i)=>i%size===2||Math.floor(i/size)===3?1:0), palette:['#193a49','#95af7d','#dbd0a0','#577b58','#e9c2a0','#b87872','#d3e9a4','#eeeede'],patternSize,rotations};
}
test('painted samples count repeated patches and read across opposite sample edges', () => {
  const sample=paintedSample(),preset=samplePreset(sample);
  assert.equal(preset.tiles.reduce((sum,tile)=>sum+tile.weight,0),sample.size**2);
  const source=new Map();
  for(let y=0;y<sample.size;y++)for(let x=0;x<sample.size;x++){
    const key=[sample.pixels[y*sample.size+x],sample.pixels[y*sample.size+(x+1)%sample.size],sample.pixels[(y+1)%sample.size*sample.size+x],sample.pixels[(y+1)%sample.size*sample.size+(x+1)%sample.size]].join(',');
    source.set(key,(source.get(key)||0)+1);
  }
  assert.deepEqual(new Map(preset.tiles.map(tile=>[tile.pixels.join(','),tile.weight])),source);
});
for(const size of [6,24])for(const patternSize of [2,3])for(const rotations of [false,true]){
  test(`painted ${size}-column sample, ${patternSize} × ${patternSize}, rotations ${rotations}: every output patch belongs to the learned sample`,()=>{
    const sample=paintedSample(patternSize,rotations,size),preset=samplePreset(sample),wave=solve(preset,'painted',24);
    verify(wave);
    const learned=new Set(preset.tiles.map(tile=>tile.pixels.join(',')));
    const output=wave.cells.map(options=>wave.tiles[options[0]].pixels[0]);
    for(let y=0;y<=wave.height-patternSize;y++)for(let x=0;x<=wave.width-patternSize;x++){
      const patch=Array.from({length:patternSize**2},(_,i)=>output[(y+Math.floor(i/patternSize))*wave.width+x+i%patternSize]);
      assert.ok(learned.has(patch.join(',')),`Unexpected pattern at ${x},${y}`);
    }
    assert.deepEqual(solve(preset,'painted',24).cells,wave.cells);
    assert.equal(preset.tiles.reduce((sum,tile)=>sum+tile.weight,0),sample.size**2*(rotations?4:1));
  });
}
test('monochrome paintings complete immediately and the learned palette is a snapshot',()=>{
  const sample=paintedSample();sample.pixels.fill(0);
  const preset=samplePreset(sample),wave=new Wave(24,17,preset,'blank');
  verify(wave);assert.equal(preset.tiles.length,1);
  sample.palette[0]='#ffffff';sample.pixels[0]=1;
  assert.equal(preset.tiles[0].palette[0],'#193a49');assert.ok(preset.tiles[0].pixels.every(pixel=>pixel===0));
});
test('invalid samples are rejected before allocating a wave',()=>{
  assert.throws(()=>samplePreset({...paintedSample(),pixels:[0]}));
  assert.throws(()=>samplePreset({...paintedSample(),patternSize:4}));
  assert.throws(()=>samplePreset({...paintedSample(),palette:['javascript:bad']}));
  assert.throws(()=>samplePreset({...paintedSample(),palette:Array(1025).fill('#193a49')}));
  assert.throws(()=>samplePreset({...paintedSample(),pixels:Array(36).fill(8)}));
  assert.throws(()=>samplePreset({...paintedSample(),size:25,pixels:Array(625).fill(0)}));
});

test('old drawings expand to 24 columns without changing colors, shape, or learning settings',()=>{
  const sample=paintedSample(3,true,12);
  sample.palette.push('#000000','#8a8a8a','#af3c3c');sample.pixels[143]=10;
  const before=JSON.stringify(sample),upgraded=normalizeSample(sample);
  assert.equal(upgraded.size,24);assert.equal(upgraded.pixels.length,576);
  for(let y=0;y<12;y++)for(let x=0;x<12;x++){
    for(const dy of [0,1])for(const dx of [0,1])assert.equal(upgraded.pixels[(2*y+dy)*24+2*x+dx],sample.pixels[y*12+x]);
  }
  assert.deepEqual(upgraded.palette,sample.palette);assert.equal(upgraded.patternSize,3);assert.equal(upgraded.rotations,true);
  assert.equal(JSON.stringify(sample),before);
  upgraded.palette[0]='#ffffff';upgraded.pixels[0]=9;
  assert.equal(JSON.stringify(sample),before);
});

test('shared drawings support old and new sizes and preserve individual high-resolution pixels',()=>{
  const paramsFor=sample=>new URLSearchParams({sample:sample.pixels.join(sample.pixels.some(pixel=>pixel>=8)?'.':''),palette:sample.palette.map(color=>color.slice(1)).join('.'),patch:String(sample.patternSize),rotate:sample.rotations?'1':'0'});
  const old=paintedSample(2,false,12);
  assert.deepEqual(readSample(paramsFor(old)),normalizeSample(old));
  old.palette.push('#123456','#654321','#abcdef');old.pixels[35]=10;
  assert.deepEqual(readSample(paramsFor(old)),normalizeSample(old));
  const current=paintedSample(3,true,24);
  current.palette=Array(584).fill('#193a49');current.palette[583]='#ffaa33';current.pixels[575]=583;
  assert.deepEqual(readSample(paramsFor(current)),current);
  const cloned=normalizeSample(current);assert.deepEqual(cloned,current);assert.notEqual(cloned.pixels,current.pixels);
  const truncated=paramsFor(current);truncated.set('sample','0.1.2');assert.throws(()=>readSample(truncated));
  const invalid=paramsFor(current);invalid.set('sample',Array(576).fill(9999).join('.'));assert.throws(()=>readSample(invalid));
  assert.throws(()=>normalizeSample(paintedSample(2,false,6)));
});

test('custom colors beyond the original palette retain their colors and neighbor constraints',()=>{
  const sample=paintedSample();
  sample.palette=Array.from({length:256},(_,i)=>`#${(i*65537).toString(16).padStart(6,'0')}`);
  sample.pixels=sample.pixels.map(pixel=>pixel?255:100);
  const preset=samplePreset(sample),wave=solve(preset,'custom-colors');
  verify(wave);
  const output=wave.cells.map(options=>wave.tiles[options[0]]);
  assert.ok(output.some(tile=>tile.pixels[0]===255));
  assert.ok(output.some(tile=>tile.pixels[0]===100));
  output.forEach(tile=>assert.equal(tile.color,sample.palette[tile.pixels[0]]));
  sample.palette[255]='#ffffff';
  assert.equal(preset.tiles.find(tile=>tile.pixels[0]===255).color,'#ff00ff');
  assert.equal(preset.tiles.find(tile=>tile.pixels[0]===255).palette[255],'#ff00ff');
});
