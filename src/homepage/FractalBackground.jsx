import { useEffect, useRef } from 'react';

// Original procedural fractal from 1d5b197, adapted to clean up when deselected.
export function FractalBackground({ animated, light }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const palette = ['--electric-blue', '--cyan', '--violet', '--orange'];
    const directions = Array.from({ length: 6 }, (_, index) => index * Math.PI / 3);
    const cycleLength = 30000;
    const frameInterval = 1000 / 30;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let branches = [];
    let animationFrame = 0;
    let cycleStarted = 0;
    let resizeTimer = 0;
    let themeColors = [];
    let lastRendered = 0;
    let branchLimit = 0;

    function randomBetween(min, max) {
      return min + Math.random() * (max - min);
    }

    function getThemeColors() {
      const styles = getComputedStyle(document.body);
      return palette.map(token => styles.getPropertyValue(token).trim());
    }

    function pointAlongPath(points, distance) {
      if (distance <= 0) return [points[0]];

      const visible = [points[0]];
      let remaining = distance;

      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y);

        if (remaining >= segmentLength) {
          visible.push(current);
          remaining -= segmentLength;
          continue;
        }

        const ratio = segmentLength ? remaining / segmentLength : 0;
        visible.push({
          x: previous.x + (current.x - previous.x) * ratio,
          y: previous.y + (current.y - previous.y) * ratio,
        });
        break;
      }

      return visible;
    }

    function addBranch(start, directionIndex, depth, delay, step, colorIndex) {
      if (depth < 1 || branches.length >= branchLimit) return;

      const points = [{ x: start.x, y: start.y }];
      const segmentCount = Math.floor(randomBetween(2, depth > 4 ? 5 : 4));
      let direction = directionIndex;
      let current = { ...start };
      let pathLength = 0;

      for (let index = 0; index < segmentCount; index += 1) {
        if (index && Math.random() < 0.34) {
          direction = (direction + (Math.random() < 0.5 ? 1 : 5)) % 6;
        }

        const length = step * randomBetween(0.8, 1.35);
        current = {
          x: current.x + Math.cos(directions[direction]) * length,
          y: current.y + Math.sin(directions[direction]) * length,
        };
        points.push(current);
        pathLength += length;
      }

      const branch = {
        points,
        length: pathLength,
        delay,
        duration: randomBetween(2200, 3900),
        colorIndex,
        width: depth > 5 ? 1.35 : 1,
      };
      branches.push(branch);

      if (depth === 1) return;

      const childDelay = delay + branch.duration * randomBetween(0.52, 0.78);
      const childCount = Math.random() < (depth > 4 ? 0.8 : 0.58) ? 2 : 1;
      const turn = Math.random() < 0.5 ? 1 : 5;

      addBranch(
        current,
        (direction + turn) % 6,
        depth - 1,
        childDelay,
        step * 0.91,
        colorIndex
      );

      if (childCount === 2) {
        const forkPoint = points[Math.max(1, points.length - 2)];
        addBranch(
          forkPoint,
          (direction + (turn === 1 ? 5 : 1)) % 6,
          depth - 2,
          childDelay + randomBetween(160, 520),
          step * 0.86,
          (colorIndex + 1) % palette.length
        );
      }
    }

    function createFractal() {
      branches = [];
      const area = width * height;
      // More starting paths, spread across all four edges. Keep mobile bounded
      // and retain the existing 30fps limit and static reduced-motion drawing.
      const rootCount = Math.max(6, Math.min(12, Math.round(area / 160000)));
      const branchesPerRoot = 26;
      const step = Math.max(31, Math.min(52, width / 24));

      for (let index = 0; index < rootCount; index += 1) {
        branchLimit = (index + 1) * branchesPerRoot;
        const edge = index % 4;
        const margin = step * 1.5;
        let start;
        let direction;

        if (edge === 0) {
          start = { x: randomBetween(-margin, width + margin), y: -margin };
          direction = Math.random() < 0.5 ? 1 : 2;
        } else if (edge === 1) {
          start = { x: width + margin, y: randomBetween(-margin, height + margin) };
          direction = Math.random() < 0.5 ? 2 : 3;
        } else if (edge === 2) {
          start = { x: randomBetween(-margin, width + margin), y: height + margin };
          direction = Math.random() < 0.5 ? 4 : 5;
        } else {
          start = { x: -margin, y: randomBetween(-margin, height + margin) };
          direction = Math.random() < 0.5 ? 0 : 5;
        }

        addBranch(
          start,
          direction,
          Math.floor(randomBetween(5, 8)),
          index * randomBetween(260, 620),
          step,
          index % palette.length
        );
      }
    }

    function sizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2400000 / Math.max(1, width * height)));
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      themeColors = getThemeColors();
      createFractal();
      cycleStarted = performance.now();
    }

    function drawBranch(branch, progress, alpha, colors) {
      const points = pointAlongPath(branch.points, branch.length * progress);
      if (points.length < 2) return;

      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index].x, points[index].y);
      }

      const color = colors[branch.colorIndex];
      context.globalAlpha = alpha;
      context.strokeStyle = color;
      context.lineWidth = branch.width;
      context.shadowColor = color;
      context.shadowBlur = 7;
      context.stroke();
    }

    function render(now) {
      if (now - lastRendered < frameInterval) {
        animationFrame = requestAnimationFrame(render);
        return;
      }
      lastRendered = now;

      const elapsed = now - cycleStarted;
      const fade = elapsed > cycleLength * 0.86
        ? Math.max(0, 1 - (elapsed - cycleLength * 0.86) / (cycleLength * 0.14))
        : 1;

      context.clearRect(0, 0, width, height);
      branches.forEach(branch => {
        const progress = Math.max(0, Math.min(1, (elapsed - branch.delay) / branch.duration));
        drawBranch(branch, progress, fade * 0.82, themeColors);
      });
      context.globalAlpha = 1;
      context.shadowBlur = 0;

      if (elapsed >= cycleLength) {
        createFractal();
        cycleStarted = now;
      }

      animationFrame = requestAnimationFrame(render);
    }

    function drawStill() {
      cancelAnimationFrame(animationFrame);
      themeColors = getThemeColors();
      context.clearRect(0, 0, width, height);
      branches.forEach(branch => drawBranch(branch, 1, 0.58, themeColors));
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    }

    function syncMotionPreference() {
      cancelAnimationFrame(animationFrame);
      if (document.hidden) return;
      if (!animated) {
        drawStill();
      } else {
        cycleStarted = performance.now();
        lastRendered = 0;
        animationFrame = requestAnimationFrame(render);
      }
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { sizeCanvas(); syncMotionPreference(); }, 180);
    }
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', syncMotionPreference);
    sizeCanvas();
    syncMotionPreference();
    return () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', syncMotionPreference);
    };
  }, [animated, light]);
  return <canvas ref={canvasRef} className="fractal-background" aria-hidden="true" />;
}
