// Run with: node --test tests/birds.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../Pages/For Fun/Birds.html'), 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];

function setup(script = source) {
    let seed = 12345;
    const seededMath = Object.create(Math);
    seededMath.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const events = {};
    const elements = new Map();
    const context = new Proxy({}, {get: (target, key) => target[key] ?? (() => {} )});
    const document = {
        hidden: false,
        createElement: () => ({getContext: () => context}),
        documentElement: {clientWidth: 1280, clientHeight: 720},
        addEventListener: (name, callback) => { events[name] = callback; },
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {
                addEventListener: (name, callback) => { events[`${id}:${name}`] = callback; },
                getContext: () => context,
                getBoundingClientRect: () => ({left: 1000, right: 1280, top: 0, bottom: 720}),
                classList: {contains: () => true, replace() {}, add() {}, remove() {}, toggle() {}},
                style: {}
            });
            return elements.get(id);
        }
    };
    const sandbox = vm.createContext({
        Math: seededMath, document,
        window: {innerWidth: 1280, innerHeight: 720, addEventListener() {}},
        requestAnimationFrame() {},
        performance, assert, events
    });
    vm.runInContext(script, sandbox);
    vm.runInContext('resizeCanvas()', sandbox);
    return {run: code => vm.runInContext(code, sandbox), document};
}

test('spatial queries include every neighbor across cells, screen edges, and resized grids', () => {
    setup().run(`
        const grid = new SpatialGrid(100);
        for (const [w, h] of [[1280, 720], [375, 667], [1, 1]]) {
            grid.resize(w, h);
            const items = Array.from({length: 500}, () => ({
                x: Math.random() * (w + 40) - 20, y: Math.random() * (h + 40) - 20
            }));
            grid.rebuild(items);
            const found = [];
            for (const item of items) {
                for (const radius of [40, 100, 180, 200]) {
                    grid.query(item.x, item.y, radius, found);
                    assert.equal(new Set(found).size, found.length);
                    for (const other of items) {
                        if (Vec2.distSq(item, other) < radius * radius) assert.ok(found.includes(other));
                    }
                }
            }
        }
    `);
});

test('grid forces match a full neighbor scan, including obstacles and coincident birds', () => {
    setup().run(`
        addBoids(200, 'prey');
        addBoids(5, 'predator');
        for (const b of boids) if (b.type === 'predator') b.satiation = 100;
        boids[1].position.set(boids[0].position.x, boids[0].position.y);
        obstacles = Array.from({length: 200}, () => ({x: Math.random() * width, y: Math.random() * height, r: 8}));
        boidGrid.rebuild(boids);
        obstacleGrid.rebuild(obstacles);
        for (const b of boids) b.flock();
        const expected = boids.map(b => [b.acceleration.x, b.acceleration.y]);
        boidGrid.query = (x, y, r, result) => { result.length = 0; for (const b of boids) result.push(b); };
        obstacleGrid.query = (x, y, r, result) => { result.length = 0; for (const o of obstacles) result.push(o); };
        boids.forEach((b, i) => {
            b.acceleration.set(0, 0);
            b.flock();
            assert.ok(Math.abs(b.acceleration.x - expected[i][0]) < 1e-10);
            assert.ok(Math.abs(b.acceleration.y - expected[i][1]) < 1e-10);
        });
    `);
});

test('equal elapsed time produces identical physics and breeding at 30, 60, and 144 Hz', () => {
    const states = [30, 60, 144].map(hz => {
        const sim = setup();
        return sim.run(`
            addBoids(30, 'prey'); addBoids(2, 'predator');
            for (let frame = 0; frame <= ${hz} * 2; frame++) animate(frame * 1000 / ${hz});
            JSON.stringify(boids.map(b => [b.position.x, b.position.y, b.breedTimer, b.energy, b.satiation]));
        `);
    });
    assert.equal(states[0], states[1]);
    assert.equal(states[1], states[2]);
});

test('stalls have bounded catch-up and hidden tabs do not advance the ecosystem', () => {
    const sim = setup();
    sim.run(`
        addBoids(1, 'predator'); params.predMetabolism = 1;
        animate(0); animate(10000);
        assert.equal(boids[0].energy, 1496);
    `);
    sim.document.hidden = true;
    sim.run(`events.visibilitychange(); animate(20000); assert.equal(boids[0].energy, 1496);`);
    sim.document.hidden = false;
    sim.run(`events.visibilitychange(); animate(30000); assert.equal(boids[0].energy, 1495);`);
});

test('births respect the prey cap and deaths update population counts immediately', () => {
    setup().run(`
        params.maxPrey = 100; params.breedSpeed = 20;
        addBoids(99, 'prey');
        for (const b of boids) b.breedTimer = 1000;
        simulate(); assert.equal(currentPreyCount, 100);
        simulate(); assert.equal(currentPreyCount, 100);
        boids = [new Boid(50, 50, 'predator'), new Boid(51, 50, 'prey')];
        simulate(); assert.equal(currentPreyCount, 0); assert.equal(currentPredCount, 1);
        boids[0].energy = 0;
        simulate(); assert.equal(currentPredCount, 0); assert.equal(boids.length, 0);
    `);
});

test('draw, erase, clear, and resize invalidate obstacle searches', () => {
    setup().run(`
        handleInteraction(100, 100); simulate();
        obstacleGrid.query(100, 100, 48, nearbyObstacles); assert.equal(nearbyObstacles.length, 1);
        currentMode = 'erase'; handleInteraction(100, 100); simulate();
        obstacleGrid.query(100, 100, 48, nearbyObstacles); assert.equal(nearbyObstacles.length, 0);
        currentMode = 'draw'; handleInteraction(100, 100); simulate();
        window.innerWidth = 375; window.innerHeight = 667; resizeCanvas(); simulate();
        obstacleGrid.query(100, 100, 48, nearbyObstacles); assert.equal(nearbyObstacles.length, 1);
        events['clearObsBtn:click'](); simulate();
        obstacleGrid.query(100, 100, 48, nearbyObstacles); assert.equal(nearbyObstacles.length, 0);
    `);
});

test('wrapping does not interpolate across the screen and zero coordinates remain valid', () => {
    setup().run(`
        const bird = new Boid(0, 0);
        assert.equal(bird.position.x, 0); assert.equal(bird.position.y, 0);
        bird.position.set(width + bird.size + 1, 100); bird.edges();
        assert.equal(bird.position.x, -bird.size);
        assert.equal(bird.previousPosition.x, bird.position.x);
        bird.position.set(100, -bird.size - 1); bird.edges();
        assert.equal(bird.position.y, height + bird.size);
        assert.equal(bird.previousPosition.y, bird.position.y);
    `);
});

test('a crowded ecosystem with obstacles remains finite over sustained updates', () => {
    setup().run(`
        params.maxPrey = 1500; addBoids(1500, 'prey'); addBoids(12, 'predator');
        obstacles = Array.from({length: 500}, () => ({x: Math.random() * width, y: Math.random() * height, r: 8}));
        for (let step = 0; step < 120; step++) simulate();
        for (const bird of boids) {
            for (const v of [bird.position, bird.velocity, bird.acceleration]) {
                assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
            }
        }
        assert.ok(currentPreyCount <= params.maxPrey);
    `);
});

// Optional comparative CPU benchmark. Canvas calls are stubbed; this is not an FPS measurement.
if (process.argv.includes('--benchmark')) {
    const {execFileSync} = require('node:child_process');
    const originalHtml = process.env.BIRDS_BASELINE
        ? fs.readFileSync(process.env.BIRDS_BASELINE, 'utf8')
        : execFileSync('git', ['show', 'HEAD:Pages/For Fun/Birds.html'], {encoding: 'utf8'});
    const original = [...originalHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
    for (const count of [250, 800, 1500]) {
        const result = {};
        for (const [label, script] of [['original', original], ['optimized', source]]) {
            result[label] = setup(script).run(`
                params.breedSpeed = 0; addBoids(${count}, 'prey');
                obstacles = Array.from({length: 300}, () => ({x: Math.random() * width, y: Math.random() * height, r: 8}));
                const tick = ${label === 'original' ? 'animate' : '() => { simulate(); render(1, STEP_MS); }'};
                for (let i = 0; i < 30; i++) tick();
                const samples = [];
                for (let i = 0; i < 100; i++) {
                    const start = performance.now(); tick(); samples.push(performance.now() - start);
                }
                samples.sort((a, b) => a - b);
                ({medianMs: samples[50].toFixed(2), p95Ms: samples[95].toFixed(2)});
            `);
        }
        console.log(JSON.stringify({prey: count, obstacles: 300, ...result}));
    }
}
