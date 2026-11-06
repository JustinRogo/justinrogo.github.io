/*! React Bits — Copyright (c) 2026 David Haz. MIT + Commons Clause; see assets/react-bits-LICENSE.txt.
 * Source revision e12c22192ac7b4b452c5e2feb9b586d74765d696.
 * Local changes: native nested child anchors/lists, controlled selection, accessible collapsed branches, shared site icons, per-section row heights.
 */
"use client";

import {
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import "./BranchedMenu.css";

const DEFAULT_ITEMS = [];
const PAD = 6;
const MARK = 16;
const DEPTH_INDENT = 32;

const renderIcon = (icon) => (isValidElement(icon) ? icon : null);
const toSet = (open) =>
  new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);

function flattenItems(items, depth = 0, parent = -1, rows = []) {
  for (const item of items) {
    const row = { ...item, depth, parent, index: rows.length };
    rows.push(row);
    if (item.children) flattenItems(item.children, depth + 1, row.index, rows);
    row.last = rows.length - 1;
  }
  return rows;
}

function BranchLinks({ items, active, isOpen, select, depth = 0, label }) {
  return (
    <ul className="branched-menu__list" aria-label={label}>
      {items.map((kid) => (
        <li key={kid.value}>
          <a
            className="branched-menu__item"
            style={{ "--bm-depth": depth }}
            href={kid.href || `#/${kid.value}`}
            target={kid.target}
            rel={kid.rel}
            aria-describedby={kid.describedBy}
            aria-current={kid.value === active ? "page" : undefined}
            data-active={kid.value === active ? "" : undefined}
            tabIndex={isOpen ? 0 : -1}
            onClick={() => select(kid.value, kid)}
          >
            {kid.icon ? (
              <span className="branched-menu__icon" aria-hidden="true">
                {renderIcon(kid.icon)}
              </span>
            ) : null}
            <span className="branched-menu__label">{kid.label}</span>
          </a>
          {kid.children?.length ? (
            <BranchLinks
              items={kid.children}
              active={active}
              isOpen={isOpen}
              select={select}
              depth={depth + 1}
              label={`${kid.label} pages`}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function BranchedMenu({
  items = DEFAULT_ITEMS,
  defaultOpen = 0,
  defaultActive = "",
  activeValue,
  label = "Explore shortcuts",
  onSelect,
  onToggle,
  color = "#f5f5f5",
  accentColor = "#f5f5f5",
  lineColor = "#3f3f46",
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  className = "",
}) {
  const [open, setOpen] = useState(() => toSet(defaultOpen));
  const branchId = useId();
  const [selected, setActive] = useState(() => {
    if (defaultActive) return defaultActive;
    const first = items.find(
      (it, i) => it.children && toSet(defaultOpen).has(i),
    );
    return first?.children?.[0]?.value ?? "";
  });
  const active = activeValue ?? selected;
  const navRef = useRef(null);
  const heads = useRef([]);
  const markerRef = useRef(null);
  const latest = useRef({});
  latest.current = { onSelect, onToggle };

  const activeSection = items.findIndex((it) =>
    flattenItems(it.children || []).some((kid) => kid.value === active),
  );
  const markerShown = activeSection >= 0 && open.has(activeSection);
  useLayoutEffect(() => {
    const place = (glide) => {
      const m = markerRef.current;
      const el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && el;
      if (!glide) m.style.transition = "none";
      if (on) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
      m.toggleAttribute("data-on", Boolean(on));
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = "";
      }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, fontSize, rowHeight]);

  const select = (value, item) => {
    setActive(value);
    latest.current.onSelect?.(value, item);
  };
  const toggle = (i) => {
    setOpen((prev) => {
      const next = new Set(prev);
      const isOpen = !next.has(i);
      if (isOpen) next.add(i);
      else next.delete(i);
      latest.current.onToggle?.(i, isOpen);
      return next;
    });
  };

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = (k, height) => PAD + k * height + height / 2;
  const branch = (k, height, depth = 0) => {
    const x = trunk + depth * DEPTH_INDENT;
    return `M ${x} ${rowY(k, height) - r} A ${r} ${r} 0 0 0 ${x + r} ${rowY(k, height)} H ${endX + depth * DEPTH_INDENT}`;
  };
  const startY = (parent, height) =>
    parent < 0 ? 0 : rowY(parent, height) + r;
  const reach = (k, height, depth = 0, parent = -1) =>
    `M ${trunk + depth * DEPTH_INDENT} ${startY(parent, height)} V ${rowY(k, height) - r} A ${r} ${r} 0 0 0 ${trunk + depth * DEPTH_INDENT + r} ${rowY(k, height)} H ${endX + depth * DEPTH_INDENT}`;
  const length = (k, height, parent = -1) =>
    rowY(k, height) -
    r -
    startY(parent, height) +
    (Math.PI * r) / 2 +
    (endX - trunk - r);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={`branched-menu${className ? ` ${className}` : ""}`}
      style={{
        "--bm-w": `${width}px`,
        "--bm-ink": color,
        "--bm-accent": accentColor,
        "--bm-line": lineColor,
        "--bm-font": `${fontSize}px`,
        "--bm-row": `${rowHeight}px`,
        "--bm-indent": `${indent}px`,
        "--bm-line-w": lineWidth,
        "--bm-draw": `${drawDuration}ms`,
        "--bm-fold": `${foldDuration}ms`,
      }}
    >
      <span
        ref={markerRef}
        className="branched-menu__marker"
        aria-hidden="true"
      />
      {items.map((item, i) => {
        const kids = item.children;
        const rows = flattenItems(kids || []);
        const roots = rows.filter((row) => row.depth === 0);
        const isOpen = kids ? open.has(i) : false;
        const leafValue = item.value ?? item.label;
        const leafActive = !kids && leafValue === active;
        const sectionHeight = Math.max(rowHeight, item.rowHeight || rowHeight);
        const bodyH = kids ? PAD * 2 + rows.length * sectionHeight : 0;
        return (
          <div
            key={item.value ?? item.label}
            className="branched-menu__section"
            data-open={isOpen ? "" : undefined}
            style={{ "--bm-row": `${sectionHeight}px` }}
          >
            <button
              ref={(el) => {
                heads.current[i] = el;
              }}
              type="button"
              className="branched-menu__head"
              aria-expanded={kids ? isOpen : undefined}
              aria-controls={kids ? `${branchId}-${i}` : undefined}
              aria-current={leafActive ? "true" : undefined}
              data-active={leafActive ? "" : undefined}
              onClick={() => (kids ? toggle(i) : select(leafValue, item))}
            >
              {item.label}
              {kids && (
                <svg
                  className="branched-menu__chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <path d="m9 5 7 7-7 7" />
                </svg>
              )}
            </button>
            {kids ? (
              <div
                className="branched-menu__body"
                id={`${branchId}-${i}`}
                aria-hidden={!isOpen}
                inert={!isOpen}
              >
                <div className="branched-menu__fold">
                  <div
                    className="branched-menu__tree"
                    style={{ height: bodyH }}
                  >
                    <svg
                      className="branched-menu__lines"
                      width={indent}
                      height={bodyH}
                      aria-hidden="true"
                    >
                      <path
                        className="branched-menu__base"
                        d={
                          roots.length
                            ? `M ${trunk} 0 V ${rowY(roots[roots.length - 1].index, sectionHeight) - r}`
                            : ""
                        }
                      />
                      {rows
                        .filter((row) => row.children?.length)
                        .map((row) => (
                          <path
                            key={`trunk-${row.value}`}
                            className="branched-menu__base"
                            d={`M ${trunk + (row.depth + 1) * DEPTH_INDENT} ${rowY(row.index, sectionHeight) + r} V ${rowY(row.last, sectionHeight) - r}`}
                          />
                        ))}
                      {rows.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__base"
                          d={branch(k, sectionHeight, kid.depth)}
                        />
                      ))}
                      {rows.map((kid, k) => (
                        <path
                          key={kid.value}
                          className="branched-menu__reach"
                          d={reach(k, sectionHeight, kid.depth, kid.parent)}
                          style={{
                            strokeDasharray: length(
                              k,
                              sectionHeight,
                              kid.parent,
                            ),
                            strokeDashoffset:
                              kid.value === active
                                ? 0
                                : length(k, sectionHeight, kid.parent),
                          }}
                        />
                      ))}
                    </svg>
                    <BranchLinks
                      items={kids}
                      active={active}
                      isOpen={isOpen}
                      select={select}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
