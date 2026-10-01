/* Small, local pixel-art editor. Its sample is learned by the overlapping model. */
(() => {
  'use strict';
  const SIZE = 24, STORAGE = 'wfc-painted-sample-v1';
  const model = typeof module === 'object' && module.exports ? require('./engine.js') : WFC;
  const DEFAULT_COLORS = ['#193a49', '#95af7d', '#dbd0a0', '#577b58', '#e9c2a0', '#b87872', '#d3e9a4', '#eeeede'];
  const copy = sample => ({...sample, pixels: [...sample.pixels], palette: [...sample.palette]});
  function normalizeSample(sample) {
    model.samplePreset(sample);
    if (![12, SIZE].includes(sample.size)) throw new Error('Invalid drawing grid size');
    const result = copy(sample);
    if (sample.size === SIZE) return result;
    // Keep the old drawing's colors and shape: one old pixel becomes a 2 × 2 block.
    result.size = SIZE;
    result.pixels = Array.from({length:SIZE*SIZE},(_,i)=>sample.pixels[Math.floor(Math.floor(i/SIZE)/2)*sample.size+Math.floor(i%SIZE/2)]);
    return result;
  }
  function readSample(params) {
    const encoded = params.get('sample') || '';
    if (!/^[0-7]+$/.test(encoded) && !/^\d{1,4}(?:\.\d{1,4})+$/.test(encoded)) throw new Error('Invalid shared drawing');
    const pixels = (encoded.includes('.')?encoded.split('.'):[...encoded]).map(Number);
    if (![144, SIZE*SIZE].includes(pixels.length)) throw new Error('Invalid shared drawing size');
    return normalizeSample({size:Math.sqrt(pixels.length),pixels,palette:(params.get('palette') || '').split('.').map(color=>'#'+color),patternSize:Number(params.get('patch') || 2),rotations:params.get('rotate') === '1'});
  }
  function example() {
    const size = 12, pixels = Array(size * size).fill(0);
    for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) {
      if ((x === 2 || x === 9) && (y === 2 || y === 9)) continue;
      pixels[y * size + x] = x === 2 || x === 9 || y === 2 || y === 9 ? 2 : 1;
    }
    pixels[4 * size + 4] = pixels[7 * size + 7] = 3;
    return normalizeSample({size, pixels, palette: [...DEFAULT_COLORS], patternSize: 2, rotations: false});
  }
  class SamplePainter {
    constructor(onChange, params) {
      this.onChange = onChange; this.sample = example(); this.history = []; this.color = 1; this.customColor = null; this.tool = 'pencil'; this.cursor = 0; this.pointer = null;
      this.canvas = document.getElementById('paint-canvas'); this.context = this.canvas.getContext('2d');
      try { const saved = JSON.parse(localStorage.getItem(STORAGE)); if (saved) this.sample = normalizeSample(saved); } catch (_) { /* Storage is optional. */ }
      if (params.has('sample')) {
        try {
          this.sample = readSample(params);
        } catch (_) { /* Ignore incomplete or malformed share links. */ }
      }
      this.buildPalette(); this.syncSettings(); this.render();
      this.canvas.addEventListener('pointerdown',event=>{
        if (this.pointer !== null || event.button !== 0) return;
        event.preventDefault(); this.canvas.focus(); this.remember(); this.pointer = event.pointerId;
        this.canvas.setPointerCapture(event.pointerId); this.last = this.point(event); this.cursor = this.last; this.paint(this.last); this.render();
      });
      this.canvas.addEventListener('pointermove',event=>{
        if (this.pointer !== event.pointerId) return;
        const index = this.point(event);
        if (index < 0) { this.last = -1; return; }
        if (this.tool === 'fill') return;
        if (this.last < 0) this.paint(index);
        else this.line(this.last,index);
        this.last = this.cursor = index; this.render();
      });
      const finish = event => {
        if (this.pointer !== event.pointerId) return;
        this.pointer = null; this.commit();
      };
      this.canvas.addEventListener('pointerup',finish);this.canvas.addEventListener('pointercancel',finish);this.canvas.addEventListener('lostpointercapture',finish);
      this.canvas.addEventListener('keydown',event=>{
        if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === ' ' || event.key === 'Enter') { this.remember(); this.paint(this.cursor); this.commit(); }
        else {
          const x=this.cursor%SIZE,y=Math.floor(this.cursor/SIZE);
          this.cursor=Math.max(0,Math.min(SIZE-1,y+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)))*SIZE+Math.max(0,Math.min(SIZE-1,x+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0)));
        }
        this.render();
      });
      this.canvas.addEventListener('focus',()=>this.render());this.canvas.addEventListener('blur',()=>this.render());
      document.querySelectorAll('[data-tool]').forEach(button=>button.addEventListener('click',()=>{
        this.tool=button.dataset.tool;document.querySelectorAll('[data-tool]').forEach(other=>other.setAttribute('aria-pressed',other===button));
      }));
      const pickColor = event => {
        this.customColor=event.target.value;this.tool='pencil';
        document.querySelectorAll('[data-tool]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.tool==='pencil'));
        this.buildPalette();
      };
      document.getElementById('paint-color').addEventListener('input',pickColor);
      document.getElementById('paint-color').addEventListener('change',pickColor);
      document.getElementById('paint-undo').addEventListener('click',()=>{
        if(!this.history.length)return;this.sample=this.history.pop();if(this.color>=this.sample.palette.length)this.color=1;this.syncSettings();this.buildPalette();this.commit();
      });
      document.getElementById('paint-clear').addEventListener('click',()=>{this.remember();this.sample.pixels.fill(0);this.commit();});
      document.getElementById('paint-example').addEventListener('click',()=>{this.remember();this.sample=example();this.color=1;this.customColor=null;this.syncSettings();this.buildPalette();this.commit();});
      ['pattern-size','paint-rotations'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{
        this.remember();this.sample.patternSize=Number(document.getElementById('pattern-size').value);this.sample.rotations=document.getElementById('paint-rotations').checked;this.commit();
      }));
    }
    snapshot() { return copy(this.sample); }
    remember() { this.history.push(this.snapshot()); if(this.history.length>40)this.history.shift(); }
    commit() {
      this.buildPalette();
      document.getElementById('paint-undo').disabled=!this.history.length;
      try{localStorage.setItem(STORAGE,JSON.stringify(this.sample));}catch(_){/* Painting works without storage. */}
      this.render();this.onChange();
    }
    syncSettings() {
      document.getElementById('pattern-size').value=String(this.sample.patternSize);
      document.getElementById('paint-rotations').checked=this.sample.rotations;
    }
    buildPalette() {
      const group=document.getElementById('paint-palette');
      while(group.children.length>this.sample.palette.length)group.lastElementChild.remove();
      this.sample.palette.forEach((color,i)=>{
        let button=group.children[i];
        if(!button){button=document.createElement('button');button.type='button';button.addEventListener('click',()=>{this.color=i;this.customColor=null;this.buildPalette();});group.append(button);}
        button.style.background=color;button.setAttribute('aria-label',`${i<8?'Color':'Custom color'} ${i+1}: ${color}${i===0?' (background and eraser)':''}`);button.setAttribute('aria-pressed',this.customColor===null?i===this.color:color.toLowerCase()===this.customColor.toLowerCase());
      });
      const color=this.customColor || this.sample.palette[this.color];
      document.getElementById('paint-color').value=color;
      document.getElementById('paint-color-value').textContent=color;
      document.querySelector('.paint-color-row').classList.toggle('selected',this.customColor!==null);
    }
    drawingColor() {
      if(this.customColor===null)return this.color;
      const existing=this.sample.palette.findIndex(color=>color.toLowerCase()===this.customColor.toLowerCase());
      if(existing>=0)return existing;
      // Discard unused custom swatches before adding another; keep the original eight.
      const used=new Set(this.sample.pixels),mapping=[],palette=[];
      this.sample.palette.forEach((color,i)=>{if(i<8||used.has(i)){mapping[i]=palette.length;palette.push(color);}});
      this.sample.pixels=this.sample.pixels.map(color=>mapping[color]);
      this.color=mapping[this.color]??1;this.sample.palette=palette;
      this.sample.palette.push(this.customColor);return this.sample.palette.length-1;
    }
    point(event) {
      const rect=this.canvas.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)/rect.width*SIZE),y=Math.floor((event.clientY-rect.top)/rect.height*SIZE);
      return x<0||y<0||x>=SIZE||y>=SIZE?-1:y*SIZE+x;
    }
    paint(index) {
      if(index<0)return;
      const color=this.tool==='erase'?0:this.drawingColor();
      if(this.tool!=='fill'){this.sample.pixels[index]=color;return;}
      const old=this.sample.pixels[index];if(old===color)return;
      const queue=[index];this.sample.pixels[index]=color;
      for(let head=0;head<queue.length;head++){
        const i=queue[head],x=i%SIZE,y=Math.floor(i/SIZE);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=x+dx,ny=y+dy,j=ny*SIZE+nx;
          if(nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE&&this.sample.pixels[j]===old){this.sample.pixels[j]=color;queue.push(j);}
        }
      }
    }
    line(from,to) {
      const x=from%SIZE,y=Math.floor(from/SIZE),dx=to%SIZE-x,dy=Math.floor(to/SIZE)-y,steps=Math.max(Math.abs(dx),Math.abs(dy));
      for(let i=0;i<=steps;i++)this.paint(Math.round(y+dy*(steps?i/steps:0))*SIZE+Math.round(x+dx*(steps?i/steps:0)));
    }
    render() {
      const ctx=this.context,cell=this.canvas.width/SIZE;
      this.sample.pixels.forEach((color,i)=>{ctx.fillStyle=this.sample.palette[color];ctx.fillRect(i%SIZE*cell,Math.floor(i/SIZE)*cell,cell,cell);});
      ctx.strokeStyle='#ffffff25';ctx.lineWidth=1;ctx.beginPath();
      for(let i=0;i<=SIZE;i++){ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,this.canvas.height);ctx.moveTo(0,i*cell);ctx.lineTo(this.canvas.width,i*cell);}ctx.stroke();
      if(document.activeElement===this.canvas){ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.strokeRect(this.cursor%SIZE*cell+1,Math.floor(this.cursor/SIZE)*cell+1,cell-2,cell-2);}
      const preview=document.getElementById('paint-preview'),pctx=preview.getContext('2d');
      const p=preview.width/SIZE;
      this.sample.pixels.forEach((color,i)=>{pctx.fillStyle=this.sample.palette[color];pctx.fillRect(i%SIZE*p,Math.floor(i/SIZE)*preview.height/SIZE,p,preview.height/SIZE);});
    }
  }
  if (typeof module === 'object' && module.exports) module.exports={normalizeSample,readSample};
  else window.SamplePainter=SamplePainter;
})();
