/* Original simple-tiled WFC: weighted Shannon entropy and adjacency propagation.
   Edges are ordered north, east, south, west; labels share a common orientation. */
(function (root) {
  'use strict';
  const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function randomFromSeed(seed) {
    let state = 2166136261;
    for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ state >>> 15, 1 | state);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pathTile(mask, weight) {
    return {mask, weight, edges: [1, 2, 4, 8].map(bit => mask & bit ? '1' : '0')};
  }
  const PRESETS = {
    circuits: {name: 'Circuit garden', label: '01 / CIRCUIT GARDEN', boundary: '0', tiles: Array.from({length: 16}, (_, mask) => {
      const count = [1, 2, 4, 8].filter(bit => mask & bit).length;
      return pathTile(mask, count === 0 ? 3 : count === 1 ? .5 : count === 2 ? 4 : count === 3 ? .7 : .25);
    })},
    islands: {name: 'Quiet islands', label: '02 / QUIET ISLANDS', boundary: '00', tiles: Array.from({length: 16}, (_, mask) => {
      const corners = [1, 2, 4, 8].map(bit => mask & bit ? 1 : 0);
      const [nw, ne, se, sw] = corners;
      return {mask, corners, weight: mask === 0 ? 9 : mask === 15 ? 12 : mask === 5 || mask === 10 ? .15 : 1,
        edges: [`${nw}${ne}`, `${ne}${se}`, `${sw}${se}`, `${nw}${sw}`]};
    })},
    ribbons: {name: 'Ribbon maze', label: '03 / RIBBON MAZE', boundary: '0', tiles: [0, 5, 10, 3, 6, 12, 9].map(mask => pathTile(mask, mask === 0 ? 1 : mask === 5 || mask === 10 ? 2 : 3))}
  };
  function samplePreset(sample) {
    const {size, pixels, palette, patternSize: n, rotations} = sample;
    if (!Number.isInteger(size) || size < 3 || size > 24 || ![2, 3].includes(n) || !Array.isArray(pixels) || pixels.length !== size * size || !Array.isArray(palette) || palette.length < 8 || palette.length > 1024 || !palette.every(color => /^#[a-f0-9]{6}$/i.test(color)) || !pixels.every(p => Number.isInteger(p) && p >= 0 && p < palette.length)) throw new Error('Invalid painted sample');
    const patterns = new Map();
    function add(patch) {
      const key = patch.join(',');
      if (patterns.has(key)) patterns.get(key).weight++;
      else patterns.set(key, {pixels: patch, color: palette[patch[0]], palette: [...palette], patternSize: n, weight: 1});
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // Read across the sample edges, allowing the painted image to repeat.
      let patch = Array.from({length: n * n}, (_, i) => pixels[((y + Math.floor(i / n)) % size) * size + (x + i % n) % size]);
      add(patch);
      if (rotations) for (let r = 0; r < 3; r++) {
        patch = Array.from({length: n * n}, (_, i) => patch[(n - 1 - i % n) * n + Math.floor(i / n)]);
        add(patch);
      }
    }
    const tiles = [...patterns.values()];
    for (const tile of tiles) {
      const strip = (startX, startY, width, height) => Array.from({length: width * height}, (_, i) => tile.pixels[(startY + Math.floor(i / width)) * n + startX + i % width]).join(',');
      tile.edges = [strip(0, 0, n, n - 1), strip(1, 0, n - 1, n), strip(0, 1, n, n - 1), strip(0, 0, n - 1, n)];
    }
    return {name: 'Painted world', label: '04 / YOUR PAINTED WORLD', boundary: null, tiles, patternSize: n};
  }
  class Wave {
    constructor(width, height, preset, seed) {
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error('Invalid grid size');
      this.width = width; this.height = height; this.preset = preset; this.tiles = preset.tiles;
      this.random = randomFromSeed(seed); this.failed = false; this.last = -1; this.steps = 0;
      this.cells = Array.from({length: width * height}, () => this.tiles.map((_, i) => i));
      const changed = [];
      // Close the canvas edges, so roads loop or terminate and islands stay in the sea.
      this.cells.forEach((options, i) => {
        const x = i % width, y = Math.floor(i / width);
        this.cells[i] = options.filter(t => this.tiles[t].edges.every((edge, d) => {
          const [dx, dy] = DIRECTIONS[d];
          return preset.boundary == null || x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height || edge === preset.boundary;
        }));
        if (options.length !== this.cells[i].length) changed.push(i);
        if (!this.cells[i].length) this.failed = true;
      });
      if (!this.failed) this.propagate(changed);
    }
    entropy(options) {
      let total = 0, weightedLog = 0;
      for (const id of options) { const w = this.tiles[id].weight; total += w; weightedLog += w * Math.log(w); }
      return Math.log(total) - weightedLog / total;
    }
    propagate(changed) {
      const queue = [...changed], queued = new Set(changed);
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head]; queued.delete(i);
        const x = i % this.width, y = Math.floor(i / this.width);
        for (let d = 0; d < 4; d++) {
          const [dx, dy] = DIRECTIONS[d], nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
          const neighbor = ny * this.width + nx;
          const allowed = new Set();
          for (const id of this.cells[i]) allowed.add(this.tiles[id].edges[d]);
          const old = this.cells[neighbor], next = old.filter(id => allowed.has(this.tiles[id].edges[(d + 2) % 4]));
          if (old.length === next.length) continue;
          this.cells[neighbor] = next;
          if (!next.length) { this.failed = true; return false; }
          if (!queued.has(neighbor)) { queue.push(neighbor); queued.add(neighbor); }
        }
      }
      return true;
    }
    step(forcedIndex) {
      if (this.failed) return 'failed';
      let index = forcedIndex;
      if (index === undefined) {
        let lowest = Infinity; index = -1;
        for (let i = 0; i < this.cells.length; i++) {
          if (this.cells[i].length <= 1) continue;
          const entropy = this.entropy(this.cells[i]) + this.random() * 1e-7;
          if (entropy < lowest) { lowest = entropy; index = i; }
        }
      }
      if (index === -1) return 'complete';
      if (!Number.isInteger(index) || index < 0 || index >= this.cells.length || this.cells[index].length <= 1) return 'unchanged';
      const options = this.cells[index];
      let choice = this.random() * options.reduce((sum, id) => sum + this.tiles[id].weight, 0);
      let selected = options[options.length - 1];
      for (const id of options) { choice -= this.tiles[id].weight; if (choice < 0) { selected = id; break; } }
      this.cells[index] = [selected]; this.last = index; this.steps++;
      if (!this.propagate([index])) return 'failed';
      return this.complete ? 'complete' : 'progress';
    }
    get complete() { return !this.failed && this.cells.every(options => options.length === 1); }
    get resolved() { return this.cells.reduce((sum, options) => sum + (options.length === 1 ? 1 : 0), 0); }
    get possibilities() { return this.cells.reduce((sum, options) => sum + (options.length > 1 ? options.length : 0), 0); }
  }
  const api = {Wave, PRESETS, randomFromSeed, samplePreset};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WFC = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
