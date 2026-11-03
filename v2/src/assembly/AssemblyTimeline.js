import { gsap } from "gsap";
import { assemblyTasks, layoutTasks } from "./assemblyConfig.js";

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Measure only at preparation/start, never in an animation-frame loop.
function visibleBox(element, viewport) {
  if (!element?.isConnected || !element.getClientRects().length) return null;
  const box = element.getBoundingClientRect();
  const left = Math.max(8, box.left);
  const top = Math.max(8, box.top);
  const right = Math.min(viewport.width - 8, box.right);
  const bottom = Math.min(viewport.height - 8, box.bottom);
  return right - left >= 20 && bottom - top >= 18
    ? { left, top, width: right - left, height: bottom - top }
    : null;
}

export function createAssemblyTimeline({
  registry,
  cursors,
  guides,
  wireframes,
  layer,
  grid,
  config,
  onComplete,
}) {
  const viewport = { width: innerWidth, height: innerHeight };
  const compact = viewport.width <= 600;
  const count = clamp(
    Math.round(compact ? config.mobileCursorCount : config.cursorCount),
    3,
    Math.min(6, cursors.length),
  );
  const total =
    clamp(compact ? config.mobileDuration : config.duration, 1200, 6000) / 1000;
  const intensity = clamp(config.intensity, 0, 1);
  const crewEntry = clamp(config.crewEntry ?? 0.35, 0.2, 0.6);
  const context = gsap.context(() => {});
  let timeline;
  let preparing = true;
  const staged = new Set();
  const point = (x, y) => ({
    x: clamp(x, 8, viewport.width - 27),
    y: clamp(y, 8, viewport.height - 37),
  });
  const entries = [
    { x: -32, y: viewport.height * 0.3 },
    { x: viewport.width * 0.7, y: -48 },
    { x: viewport.width * 0.32, y: viewport.height + 32 },
    { x: viewport.width + 32, y: viewport.height * 0.4 },
    { x: viewport.width * 0.85, y: viewport.height + 32 },
    { x: -32, y: viewport.height * 0.7 },
  ];

  function stage(id, element) {
    if (!preparing || !assemblyTasks.some((task) => task.id === id)) return;
    if (!visibleBox(element, viewport) || staged.has(element)) return;
    staged.add(element);
    context.add(() => gsap.set(element, { opacity: 0 }));
  }
  context.add(() => {
    gsap.set(layer, { visibility: "visible", opacity: 1 });
    gsap.set(grid, { opacity: 0 });
  });
  for (const [id, element] of registry) stage(id, element);

  function start() {
    // Late local data is included if ready; slower data keeps its normal loading/retry path.
    for (const [id, element] of registry) stage(id, element);
    const jobs = [...layoutTasks, ...assemblyTasks]
      .flatMap((task) => {
        const element = registry.get(task.id);
        const box = visibleBox(element, viewport);
        return box ? [{ ...task, element, box }] : [];
      })
      .sort((a, b) => a.at - b.at);
    preparing = false;
    context.add(() => {
      timeline = gsap.timeline({ paused: true, onComplete });
      timeline.set(layer, { attr: { "data-assembly-stage": "layout" } }, 0);
      timeline.set(
        layer,
        { attr: { "data-assembly-stage": "content" } },
        total * crewEntry,
      );
      timeline.to(grid, { opacity: intensity, duration: 0.18 }, 0);
      timeline.to(grid, { opacity: 0, duration: total * 0.18 }, total * 0.62);
      const busy = Array(count).fill(0);
      const positions = entries.slice(0, count);
      cursors.forEach((cursor, i) => {
        delete cursor.dataset.target;
        delete cursor.dataset.flip;
        gsap.set(cursor, { ...entries[i], opacity: 0 });
        gsap.set(guides[i], { opacity: 0 });
      });
      gsap.set([...wireframes.values()], { opacity: 0 });
      for (const job of jobs) {
        // Compact crews give content jobs to Details, keeping Layout on structural work.
        const index = job.cursor < count ? job.cursor : Math.min(3, count - 1);
        const cursor = cursors[index];
        const guide = job.wireframe ? wireframes.get(job.id) : guides[index];
        const rect = guide.querySelector("rect");
        const handles = guide.querySelector("path");
        const click = cursor.querySelector(".agent-click");
        const b = job.box;
        const stroke = job.effect === "trace";
        const text = job.effect === "text";
        const vertical = job.effect === "links" && b.height > b.width;
        const anchor =
          stroke || text
            ? point(b.left + 2, b.top + (text ? b.height * 0.5 : 2))
            : point(
                b.left + Math.min(b.width * 0.22, 42),
                b.top + Math.min(b.height * 0.28, 34),
              );
        const travel = total * 0.1;
        const firstJob = busy[index] === 0;
        const depart = firstJob
          ? index === 0
            ? Math.max(0, total * job.at - travel)
            : Math.max(
                total * crewEntry + index * 0.015,
                total * job.at - travel,
              )
          : Math.max(total * job.at - travel, busy[index]);
        const at = Math.max(total * job.at, depart + total * 0.025);
        const trip = at - depart;
        const duration = total * job.duration;
        busy[index] = at + duration;
        timeline.set(cursor, { opacity: 1 }, depart);
        timeline.to(
          cursor,
          {
            ...anchor,
            duration: trip,
            ease: firstJob ? "power3.out" : "power3.inOut",
          },
          depart,
        );
        timeline.call(
          () => {
            cursor.dataset.target = job.id;
            cursor.dataset.flip = String(anchor.x > viewport.width - 120);
          },
          null,
          at,
        );
        timeline.fromTo(
          click,
          { scale: 0.3, opacity: 0.8 * intensity },
          {
            scale: 1.8,
            opacity: 0,
            duration: 0.28,
            ease: "power2.out",
          },
          at,
        );

        const from = { opacity: 0 };
        const to = { opacity: 1, duration, ease: "power3.out" };
        // Keep navigation hit regions stable even when a click interrupts preparation.
        if (text) {
          from.clipPath = "inset(0% 100% 0% 0%)";
          to.clipPath = "inset(0% 0% 0% 0%)";
        } else if (job.effect === "place") {
          from.y = 12 * intensity;
          from.scale = 1 - 0.025 * intensity;
          to.y = 0;
          to.scale = 1;
        }
        if (!job.wireframe) {
          timeline.fromTo(job.element, from, to, at);
          const wire = wireframes.get(job.id);
          if (wire)
            timeline.to(
              wire,
              { opacity: 0, duration: 0.22 },
              at + duration * 0.6,
            );
        }

        // One reusable measured selection frame per agent, never a duplicate UI.
        // Bound each SVG's paint area to its target instead of five full-screen canvases.
        timeline.set(
          guide,
          { x: b.left, y: b.top, width: b.width, height: b.height },
          at,
        );
        timeline.set(
          rect,
          {
            attr: {
              x: 1,
              y: 1,
              width: b.width - 2,
              height: b.height - 2,
              rx: stroke ? 26 : text ? 2 : 12,
            },
            strokeDashoffset: 1,
          },
          at,
        );
        const x = 1,
          y = 1,
          r = x + b.width - 2,
          d = y + b.height - 2;
        timeline.set(
          handles,
          {
            attr: {
              d: `M${x - 2} ${y - 2}h4v4h-4Z M${r - 2} ${d - 2}h4v4h-4Z`,
            },
          },
          at,
        );
        timeline.set(guide, { opacity: intensity }, at);
        if (!stroke)
          timeline.to(
            rect,
            { strokeDashoffset: 0, duration, ease: "none" },
            at,
          );
        if (!job.wireframe)
          timeline.to(
            guide,
            { opacity: 0, duration: Math.min(0.1, total * 0.025) },
            at + duration,
          );
        if (stroke) {
          const corners = [
            point(b.left + b.width - 2, b.top + 2),
            point(b.left + b.width - 2, b.top + b.height - 2),
            point(b.left + 2, b.top + b.height - 2),
            anchor,
          ];
          const lengths = [b.width, b.height, b.width, b.height];
          const perimeter = 2 * (b.width + b.height);
          let progress = 0;
          corners.forEach((corner, k) => {
            const fraction = lengths[k] / perimeter;
            const segment = at + duration * progress;
            timeline.to(
              cursor,
              {
                ...corner,
                duration: duration * fraction,
                ease: "power1.inOut",
              },
              segment,
            );
            progress += fraction;
            timeline.to(
              rect,
              {
                strokeDashoffset: 1 - progress,
                duration: duration * fraction,
                ease: "power1.inOut",
              },
              segment,
            );
          });
          positions[index] = anchor;
        } else if (text || job.effect === "links") {
          const end = vertical
            ? point(anchor.x, b.top + b.height - 6)
            : point(b.left + b.width - 8, anchor.y);
          timeline.to(cursor, { ...end, duration, ease: "power2.out" }, at);
          positions[index] = end;
        } else {
          positions[index] = anchor;
        }
      }
      cursors.slice(0, count).forEach((cursor, i) => {
        const at =
          i === 0
            ? Math.max(total * 0.38, busy[i] + total * 0.025)
            : Math.max(total * 0.96, busy[i]);
        timeline.to(
          cursor,
          {
            x: positions[i].x + (i % 2 ? 22 : -22),
            y: positions[i].y - 18,
            opacity: 0,
            duration: i === 0 ? 0.24 : Math.max(0.12, total - at),
            ease: "power2.in",
          },
          at,
        );
      });
      timeline.play(0);
    });
  }
  return {
    stage,
    start,
    destroy: () => {
      preparing = false;
      context.revert();
    },
    get duration() {
      return total * 1000;
    },
  };
}
