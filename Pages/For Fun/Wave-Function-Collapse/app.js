(() => {
  'use strict';
  const {Wave, PRESETS, samplePreset} = WFC;
  const $ = id => document.getElementById(id);
  const canvas = $('world'), context = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = {circuits: {bg: '#14221f', line: '#c9df9c'}, islands: {bg: '#193a49', line: '#9ebc85'}, ribbons: {bg: '#202933', line: '#e9c2a0'}, custom: {bg: '#193a49'}};
  let selected = 'circuits', active = selected, wave, running = false, attempt = 0, seed = '', lastTime = 0, credit = 0;
  let hovered = -1, keyboardCell = -1, frame = 0, activeSize = 32, completionAnnounced = false;
  let activePreset, activeSample = null;
  const params = new URLSearchParams(location.search);
  const painter = new SamplePainter(() => {
    PRESETS.custom = samplePreset(painter.snapshot());
    if (selected === 'custom') choosePreset('custom');
  }, params);
  PRESETS.custom = samplePreset(painter.snapshot());
  if (PRESETS[params.get('world')]) selected = params.get('world');
  if (['24', '32', '48'].includes(params.get('size'))) $('size').value = params.get('size');
  if (params.has('seed')) $('seed').value = params.get('seed').slice(0, 64);

  function drawTile(ctx, kind, tile, x, y, s, index = 0, patch = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const palette = colors[kind]; ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, 1.005, 1.005);
    if (kind === 'custom') {
      if (patch) {
        const n = tile.patternSize;
        tile.pixels.forEach((color,i)=>{ctx.fillStyle=tile.palette[color];ctx.fillRect(i%n/n,Math.floor(i/n)/n,1/n+.001,1/n+.001);});
      } else { ctx.fillStyle=tile.color;ctx.fillRect(0,0,1.005,1.005); }
    } else if (kind === 'islands') {
      const points = {a:[0,0], b:[1,0], c:[1,1], d:[0,1], n:[.5,0], e:[1,.5], s:[.5,1], w:[0,.5]};
      const polygons = [[], ['a','n','w'], ['b','e','n'], ['a','b','e','w'], ['c','s','e'], [], ['n','b','c','s'], ['a','b','c','s','w'], ['d','w','s'], ['a','n','s','d'], [], ['a','b','e','s','d'], ['w','e','c','d'], ['a','n','e','c','d'], ['n','b','c','d','w'], ['a','b','c','d']];
      const regions = tile.mask === 5 ? [['a','n','w'],['c','s','e']] : tile.mask === 10 ? [['b','e','n'],['d','w','s']] : [polygons[tile.mask]];
      for (const polygon of regions) if (polygon.length) {
        ctx.beginPath(); polygon.forEach((p, i) => { const [px, py] = points[p]; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.closePath();
        ctx.fillStyle = '#95af7d'; ctx.fill();
        // Only coast segments receive an outline; tile edges stay seamless.
        ctx.strokeStyle = '#dbd0a0'; ctx.lineWidth = .06;
        for (let i = 0; i < polygon.length; i++) {
          const p = points[polygon[i]], q = points[polygon[(i + 1) % polygon.length]];
          if (p[0] === q[0] && (p[0] === 0 || p[0] === 1) || p[1] === q[1] && (p[1] === 0 || p[1] === 1)) continue;
          ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke();
        }
      }
      if (tile.mask === 15 && index % 3 === 0) {
        ctx.fillStyle = '#577b58'; ctx.beginPath(); ctx.moveTo(.52,.22); ctx.lineTo(.34,.62); ctx.lineTo(.7,.62); ctx.fill();
        ctx.fillStyle = '#7a9566'; ctx.fillRect(.5,.6,.035,.17);
      } else if (tile.mask === 0 && index % 4 === 0) {
        ctx.strokeStyle = '#305768'; ctx.lineWidth = .03; ctx.beginPath(); ctx.moveTo(.3,.52); ctx.quadraticCurveTo(.5,.61,.7,.52); ctx.stroke();
      }
    } else {
      const edges = [[.5,0],[1,.5],[.5,1],[0,.5]], connected = [1,2,4,8].map((bit, d) => tile.mask & bit ? d : -1).filter(d => d >= 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = kind === 'ribbons' ? .22 : .09;
      ctx.strokeStyle = palette.line;
      if (kind === 'ribbons' && connected.length === 2) {
        const [a, b] = connected;
        ctx.beginPath(); ctx.moveTo(...edges[a]);
        if ((a + 2) % 4 === b) ctx.lineTo(...edges[b]);
        else ctx.quadraticCurveTo(.5,.5,...edges[b]);
        ctx.stroke(); ctx.lineWidth = .035; ctx.strokeStyle = '#fff0d04a'; ctx.stroke();
      } else if (kind === 'circuits') {
        for (const d of connected) {
          const [ex,ey] = edges[d]; ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(.5 + (ex-.5)*.35,.5 + (ey-.5)*.35); ctx.lineTo(.5,.5); ctx.stroke();
        }
        if (connected.length === 1 || connected.length >= 3) {
          ctx.fillStyle = palette.bg; ctx.strokeStyle = '#e7e7b4'; ctx.lineWidth = .045; ctx.beginPath(); ctx.arc(.5,.5,.1,0,Math.PI*2); ctx.fill(); ctx.stroke();
        } else if (!connected.length) {
          ctx.fillStyle = '#3c5142'; ctx.beginPath(); ctx.arc(.5,.5,.025,0,Math.PI*2); ctx.fill();
        }
      }
    }
    ctx.restore();
  }
  function render(target = canvas, overlays = true) {
    const ctx = target.getContext('2d'), cell = target.width / wave.width;
    ctx.fillStyle = colors[active].bg; ctx.fillRect(0,0,target.width,target.height);
    for (let i = 0; i < wave.cells.length; i++) {
      const x = i % wave.width * cell, y = Math.floor(i / wave.width) * cell, options = wave.cells[i];
      if (options.length === 1) drawTile(ctx, active, wave.tiles[options[0]], x, y, cell, i);
      else if (!options.length) { ctx.fillStyle = '#9e575744'; ctx.fillRect(x,y,cell,cell); }
      else if ($('show-options').checked) {
        if (active === 'custom') {
          let red=0,green=0,blue=0,total=0;
          for(const id of options){const tile=wave.tiles[id],color=parseInt(tile.color.slice(1),16),w=tile.weight;red+=(color>>>16)*w;green+=((color>>>8)&255)*w;blue+=(color&255)*w;total+=w;}
          ctx.fillStyle=`rgb(${Math.round(red/total)},${Math.round(green/total)},${Math.round(blue/total)})`;ctx.fillRect(x,y,cell,cell);
          continue;
        }
        // Superimpose all remaining tiles with equal opacity to reveal uncertainty.
        ctx.globalAlpha = .65 / options.length;
        for (const id of options) drawTile(ctx, active, wave.tiles[id], x, y, cell, i);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#d3e9a42b'; ctx.fillRect(x+cell*.46,y+cell*.46,cell*.08,cell*.08);
      }
    }
    if (overlays && $('show-grid').checked) {
      ctx.strokeStyle = '#c4d4b021'; ctx.lineWidth = 1; ctx.beginPath();
      for(let x=0;x<=wave.width;x++){ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,target.height);}
      for(let y=0;y<=wave.height;y++){ctx.moveTo(0,y*cell);ctx.lineTo(target.width,y*cell);}
      ctx.stroke();
    }
    const focus = keyboardCell >= 0 && document.activeElement === canvas ? keyboardCell : hovered;
    if (overlays && focus >= 0) {
      const x = focus % wave.width * cell, y = Math.floor(focus / wave.width) * cell;
      ctx.strokeStyle = '#f0f3d9'; ctx.lineWidth = 2; ctx.strokeRect(x+1,y+1,cell-2,cell-2);
    }
  }
  function status(text) { $('status').textContent = text; }
  function icon(name) { return `<svg class="icon" aria-hidden="true"><use href="Wave-Function-Collapse/icons.svg#${name}"/></svg>`; }
  function sync() {
    const resolved = wave.resolved, percent = wave.complete ? 100 : Math.min(99, Math.round(resolved / wave.cells.length * 100));
    $('resolved').textContent = resolved.toLocaleString(); $('possibilities').textContent = wave.possibilities.toLocaleString();
    $('percent').textContent = `${percent}%`; $('progress-fill').style.width = `${percent}%`; $('progress').setAttribute('aria-valuenow', percent);
    $('play').innerHTML = wave.complete ? `${icon('check')} Done` : running ? `${icon('player-pause')} Pause` : `${icon('player-play')} Play`;
    $('play').disabled = wave.complete || (wave.failed && attempt >= 24); $('step').disabled = $('play').disabled;
    $('status-dot').classList.toggle('paused', !running);
    if (wave.complete && !completionAnnounced) { completionAnnounced = true; status(attempt ? `World complete · ${attempt} ${attempt === 1 ? 'retry' : 'retries'}` : 'World complete'); }
  }
  function setRunning(value) {
    running = value && !wave.complete && !(wave.failed && attempt >= 24); lastTime = 0; credit = 0;
    if (!wave.complete && !wave.failed) status(running ? 'Generating…' : 'Paused');
    sync();
    cancelAnimationFrame(frame); if (running && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function updateLink() {
    const url = new URL(location.href); url.searchParams.set('world',active); url.searchParams.set('size',activeSize); url.searchParams.set('seed',seed);
    for(const key of ['sample','palette','patch','rotate'])url.searchParams.delete(key);
    if(active==='custom'){
      url.searchParams.set('sample',activeSample.pixels.join(activeSample.pixels.some(pixel=>pixel>=8)?'.':''));
      url.searchParams.set('palette',activeSample.palette.map(color=>color.slice(1)).join('.'));
      url.searchParams.set('patch',activeSample.patternSize);url.searchParams.set('rotate',activeSample.rotations?'1':'0');
    }
    try { history.replaceState(null,'',url); } catch (_) { /* Local file previews can restrict history changes. */ }
  }
  function start(play = !reducedMotion.matches, customSource = null) {
    cancelAnimationFrame(frame); active = selected; activeSize = Number($('size').value); seed = $('seed').value.trim() || 'little-wonders'; $('seed').value = seed;
    attempt = 0; hovered = keyboardCell = -1; completionAnnounced = false;
    activeSample=active==='custom'?(customSource || painter.snapshot()):null;
    activePreset=active==='custom'?samplePreset(activeSample):PRESETS[active];
    if(active==='custom')colors.custom.bg=activeSample.palette[0];
    wave = new Wave(activeSize, Math.round(activeSize * .72), activePreset, `${seed}|0`);
    canvas.width = activeSize * 40; canvas.height = wave.height * 40;
    canvas.style.aspectRatio = `${wave.width} / ${wave.height}`;
    $('dimensions').textContent = `${wave.width} × ${wave.height} ${active==='custom'?'pixels':'tiles'}`; $('world-name').textContent = activePreset.name;
    canvas.setAttribute('aria-label',`${activePreset.name}, ${wave.width} columns and ${wave.height} rows. Use arrows to select a cell and Enter to collapse it.`);
    $('cell-info').textContent = 'Hover over a cell to see how many tiles still fit.';
    updateLink(); setRunning(play); render();
  }
  function advance(index) {
    if (wave.failed) {
      if (attempt >= 24) { setRunning(false); status(active==='custom'?'Stopped after 24 retries. Try 2 × 2 patches or allow rotations.':'Stopped after 24 retries. Try another seed.'); return; }
      attempt++; completionAnnounced = false;
      wave = new Wave(activeSize, Math.round(activeSize*.72), activePreset, `${seed}|${attempt}`);
      status(`No tiles fit · starting attempt ${attempt+1}`);
      return;
    }
    const result = wave.step(index);
    if (result === 'failed') status('No tiles fit · the next step starts another attempt');
    if (result === 'complete') { running = false; cancelAnimationFrame(frame); }
  }
  function tick(time) {
    if (!running || document.hidden) return;
    const elapsed = lastTime ? Math.min(time-lastTime,100) : 16; lastTime = time;
    const speeds = [0,6,25,90,250,1500]; credit += elapsed / 1000 * speeds[Number($('speed').value)];
    const count = Math.min(40,Math.floor(credit)); credit -= count;
    const budgetStart = performance.now();
    for(let i=0;i<count && running;i++) {
      advance();
      if(performance.now()-budgetStart>12) break;
    }
    if(count){render();sync();}
    if(running) frame=requestAnimationFrame(tick);
  }
  function choosePreset(kind) {
    selected=kind;
    $('paint-editor').hidden=kind!=='custom';
    document.querySelectorAll('.preset').forEach(button=>{const on=button.dataset.preset===kind;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',on);});
    $('tile-count').textContent = `${PRESETS[kind].tiles.length} ${kind==='custom'?'patches':'tiles'}`;
    $('tile-note').textContent=kind==='custom'?`Patches overlap by ${PRESETS.custom.patternSize-1} ${PRESETS.custom.patternSize===2?'pixel':'pixels'}. ${PRESETS.custom.tiles.length>96?'Showing the first 96.':''}`:'Adjacent tile edges must match.';
    if(kind==='custom')$('paint-feedback').textContent=`${PRESETS.custom.tiles.length} learned ${PRESETS.custom.tiles.length===1?'patch':'patches'} · changes apply when you generate.`;
    $('tiles').replaceChildren();
    PRESETS[kind].tiles.slice(0,96).forEach((tile,i)=>{
      const swatch=document.createElement('canvas');swatch.width=swatch.height=64;
      swatch.title=kind==='custom'?`Patch ${i+1} · seen ${tile.weight} times`:`Tile ${i+1} · edges: ${tile.edges.join(', ')}`;swatch.setAttribute('role','img');swatch.setAttribute('aria-label',swatch.title);
      drawTile(swatch.getContext('2d'),kind,tile,0,0,64,i,true);$('tiles').append(swatch);
    });
  }
  function inspect(index) {
    if(index<0)return;
    const options=wave.cells[index];
    const text=`Cell ${index%wave.width+1}, ${Math.floor(index/wave.width)+1} · ${options.length===1?'resolved':`${options.length} possible tiles`}`;
    if($('cell-info').textContent!==text)$('cell-info').textContent=text;
  }
  function pointIndex(event) {
    const rect=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)/rect.width*wave.width),y=Math.floor((event.clientY-rect.top)/rect.height*wave.height);
    return x<0||y<0||x>=wave.width||y>=wave.height?-1:y*wave.width+x;
  }
  function collapseHere(index) {
    if(index<0||wave.complete||wave.cells[index].length<=1)return;
    setRunning(false); advance(index); render(); sync(); inspect(index);
    if(!wave.complete&&!wave.failed)status('Selected cell filled · neighbor options updated');
  }
  $('play').addEventListener('click',()=>setRunning(!running));
  $('step').addEventListener('click',()=>{setRunning(false);advance();render();sync();if(!wave.complete&&!wave.failed)status('Step complete · neighbor options updated');});
  $('replay').addEventListener('click',()=>{
    // Replay the world on the canvas, including its actual size and seed.
    choosePreset(active);$('size').value=String(activeSize);$('seed').value=seed;start(!reducedMotion.matches,activeSample);
  });
  $('generate').addEventListener('click',()=>start());
  $('paint-generate').addEventListener('click',()=>{choosePreset('custom');start();canvas.scrollIntoView({block:'start',behavior:reducedMotion.matches?'instant':'smooth'});});
  $('shuffle').addEventListener('click',()=>{
    const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);$('seed').value=`wonder-${bytes[0].toString(36)}${bytes[1].toString(36)}`;start();
  });
  $('seed').addEventListener('keydown',event=>{if(event.key==='Enter')start();});
  document.querySelectorAll('.preset').forEach(button=>button.addEventListener('click',()=>choosePreset(button.dataset.preset)));
  ['show-options','show-grid'].forEach(id=>$(id).addEventListener('change',()=>render()));
  $('speed').addEventListener('input',()=>{$('speed-label').textContent=['','Slowest','Slow','Medium','Fast','Fastest'][Number($('speed').value)];credit=0;});
  canvas.addEventListener('pointermove',event=>{const index=pointIndex(event);if(index!==hovered){hovered=index;render();inspect(index);}});
  canvas.addEventListener('pointerleave',()=>{hovered=-1;render();});
  canvas.addEventListener('click',event=>collapseHere(pointIndex(event)));
  canvas.addEventListener('focus',()=>{if(keyboardCell<0)keyboardCell=Math.floor(wave.height/2)*wave.width+Math.floor(wave.width/2);inspect(keyboardCell);render();});
  canvas.addEventListener('blur',()=>render());
  canvas.addEventListener('keydown',event=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' '].includes(event.key))event.preventDefault();else return;
    if(event.key==='Enter')collapseHere(keyboardCell);
    else if(event.key===' ')setRunning(!running);
    else{const x=keyboardCell%wave.width,y=Math.floor(keyboardCell/wave.width);keyboardCell=Math.max(0,Math.min(wave.height-1,y+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)))*wave.width+Math.max(0,Math.min(wave.width-1,x+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0)));inspect(keyboardCell);render();}
  });
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);lastTime=0;if(!document.hidden&&running)frame=requestAnimationFrame(tick);});
  reducedMotion.addEventListener('change',event=>{if(event.matches)setRunning(false);});
  $('save').addEventListener('click',()=>{
    const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;render(image,false);
    image.toBlob(blob=>{if(!blob){status('Could not save this image. Please try again.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.download=`wfc-${active}-${seed.replace(/[^a-z0-9_-]/gi,'-').slice(0,50)}.png`;link.href=url;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
  });
  document.querySelectorAll('.preset').forEach(button=>{
    if(button.dataset.preset==='custom')return;
    const kind=button.dataset.preset,preview=button.querySelector('canvas'),mini=new Wave(8,6,PRESETS[kind],`preview-${kind}`);
    for(let i=0;i<300&&!mini.complete&&!mini.failed;i++)mini.step();
    const ctx=preview.getContext('2d');ctx.fillStyle=colors[kind].bg;ctx.fillRect(0,0,preview.width,preview.height);
    mini.cells.forEach((options,i)=>drawTile(ctx,kind,mini.tiles[options[0]??0],i%8*9,Math.floor(i/8)*9,9,i));
  });
  choosePreset(selected);start();
})();
