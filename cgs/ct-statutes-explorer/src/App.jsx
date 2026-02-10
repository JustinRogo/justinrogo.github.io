import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import "./App.css";

function buildSectionDocs(indexJson) {
  const docs = [];
  const titles = indexJson?.titles ?? [];
  for (const t of titles) {
    const titleKey = t.title_key ?? "";
    const titleLabel = t.label ?? "";
    const titleName = t.name ?? "";
    for (const ch of t.chapters ?? []) {
      const chapterKey = ch.chapter_key ?? "";
      const chapterLabel = ch.label ?? "";
      const chapterName = ch.name ?? "";
      for (const s of ch.sections ?? []) {
        docs.push({
          id: `${titleKey}|${chapterKey}|${s.section_key ?? ""}`,
          titleKey,
          titleLabel,
          titleName,
          chapterKey,
          chapterLabel,
          chapterName,
          secKey: s.section_key ?? "",
          heading: s.label ?? "",
          url: s.url ?? "",
        });
      }
    }
  }
  return docs;
}
function normalizeSecKey(s) {
  return (s || "").toLowerCase().replace(/^sec\.?\s*/i, "").trim();
}

// Recognize inputs like 4-62, 4-62a, 4a-62, 4-62b, etc.
function looksLikeSecKeyQuery(q) {
  const s = normalizeSecKey(q).replace(/\s+/g, "");
  return /^[0-9]+[a-z]?-?[0-9]+[a-z]?$/.test(s) || /^[0-9]+-[0-9]+[a-z]?$/.test(s);
}


function stripUnsafe(html) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
}

function extractSectionHtmlFromChapter(doc, chapterHtmlText) {
  const url = new URL(doc.url);
  const fragment = (url.hash || "").replace("#", "");
  if (!fragment) return null;

  const parser = new DOMParser();
  const dom = parser.parseFromString(chapterHtmlText, "text/html");

  let anchor =
    dom.getElementById(fragment) ||
    dom.querySelector(`a[name="${CSS.escape(fragment)}"]`) ||
    dom.querySelector(`[id="${CSS.escape(fragment)}"]`);

  if (!anchor) return null;

  let startNode = anchor;
  if (startNode.tagName?.toLowerCase() === "a" && startNode.nextElementSibling) {
    startNode = startNode.nextElementSibling;
  }

  const parts = [];
  const container = startNode.parentElement || dom.body;
  const children = Array.from(container.children);
  let startIndex = children.indexOf(startNode);

  if (startIndex === -1) {
    let node = startNode;
    while (node) {
      const el = node;
      const id = el.id || "";
      const name = el.getAttribute?.("name") || "";
      if (el !== startNode && (id.startsWith("sec_") || name.startsWith("sec_"))) break;
      if (el.outerHTML) parts.push(el.outerHTML);
      node = el.nextElementSibling;
    }
  } else {
    for (let i = startIndex; i < children.length; i++) {
      const el = children[i];
      const id = el.id || "";
      const name = el.getAttribute?.("name") || "";
      if (i !== startIndex && (id.startsWith("sec_") || name.startsWith("sec_"))) break;
      parts.push(el.outerHTML);
    }
  }

  const html = stripUnsafe(parts.join("\n"));
  return html.trim() ? html : null;
}

export default function App() {
  const [indexJson, setIndexJson] = useState(null);

  // Browse selections
  const [selectedTitleKey, setSelectedTitleKey] = useState(null);
  const [selectedChapterKey, setSelectedChapterKey] = useState(null);
  const [chapterQuery, setChapterQuery] = useState("");


  // Search
const [globalQueryRaw, setGlobalQueryRaw] = useState("");
const [globalQuery, setGlobalQuery] = useState("");
useEffect(() => {
  const t = setTimeout(() => setGlobalQuery(globalQueryRaw), 160); // 120–250ms is fine
  return () => clearTimeout(t);
}, [globalQueryRaw]);


  // Global drawer state
  const [globalOpen, setGlobalOpen] = useState(true);

  // Reader
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [readerState, setReaderState] = useState({
    status: "idle",
    html: "",
    error: "",
    mode: "inline", // inline | iframe
  });

  useEffect(() => {
    (async () => {
      const res = await fetch("/cgs_index.json");
      if (!res.ok) throw new Error(`Failed to load cgs_index.json (${res.status})`);
      const json = await res.json();
      setIndexJson(json);
    })().catch((e) => {
      console.error(e);
      alert(String(e));
    });
  }, []);

  const titles = useMemo(() => indexJson?.titles ?? [], [indexJson]);

  const selectedTitle = useMemo(() => {
    if (!selectedTitleKey) return null;
    return titles.find((t) => t.title_key === selectedTitleKey) ?? null;
  }, [titles, selectedTitleKey]);

  const selectedChapter = useMemo(() => {
    if (!selectedTitle || !selectedChapterKey) return null;
    return (selectedTitle.chapters ?? []).find((c) => c.chapter_key === selectedChapterKey) ?? null;
  }, [selectedTitle, selectedChapterKey]);

  const chapters = useMemo(() => selectedTitle?.chapters ?? [], [selectedTitle]);
  const sections = useMemo(() => selectedChapter?.sections ?? [], [selectedChapter]);

  const filteredSections = useMemo(() => {
    const q = chapterQuery.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => {
      const label = (s.label ?? "").toLowerCase();
      const key = (s.section_key ?? "").toLowerCase();
      return label.includes(q) || key.includes(q);
    });
  }, [sections, chapterQuery]);

  // Global Fuse index
  const docs = useMemo(() => buildSectionDocs(indexJson), [indexJson]);
  const secKeyIndex = useMemo(() => {
  const m = new Map();

  for (const d of docs) {
    const k = normalizeSecKey(d.secKey);
    if (!k) continue;

    if (!m.has(k)) m.set(k, []);
    m.get(k).push(d);
  }

  return m;
}, [docs]);


  const fuse = useMemo(() => {
    return new Fuse(docs, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "heading", weight: 0.55 },
        { name: "chapterName", weight: 0.18 },
        { name: "titleName", weight: 0.15 },
        { name: "secKey", weight: 0.12 },
        { name: "chapterLabel", weight: 0.07 },
        { name: "titleLabel", weight: 0.05 },
      ],
    });
  }, [docs]);

const globalResults = useMemo(() => {
  const q0 = globalQuery.trim();
  if (!q0) return [];

  const q = normalizeSecKey(q0).replace(/\s+/g, "");

  // 1) If it looks like a statute section key, do exact/prefix lookup first
  if (looksLikeSecKeyQuery(q0)) {
    const exact = secKeyIndex.get(q) ?? [];

    // Prefix matches (e.g., "4-62" should also show "4-62a", "4-62b" nearby)
    const pref = [];
    for (const [k, arr] of secKeyIndex.entries()) {
      if (k !== q && k.startsWith(q)) pref.push(...arr);
      if (pref.length >= 40) break;
    }

    // If we found anything by key, return those first and skip fuzzy search
    if (exact.length || pref.length) return [...exact, ...pref].slice(0, 40);
  }

  // 2) Otherwise fall back to Fuse (headings)
  return fuse.search(q0).slice(0, 40).map((r) => r.item);
}, [globalQuery, fuse, secKeyIndex]);


  function openTitle(titleKey) {
    setSelectedTitleKey(titleKey);
    setSelectedChapterKey(null);
    setChapterQuery("");
  }

  function openChapter(chapterKey) {
    setSelectedChapterKey(chapterKey);
    setChapterQuery("");
  }

  function backToTitles() {
    setSelectedTitleKey(null);
    setSelectedChapterKey(null);
    setChapterQuery("");
  }

  function backToChapters() {
    setSelectedChapterKey(null);
    setChapterQuery("");
  }

  async function openInReader(doc) {
    setSelectedDoc(doc);
    setReaderState({ status: "loading", html: "", error: "", mode: "inline" });

    try {
      const chapterUrl = new URL(doc.url);
      chapterUrl.hash = "";
      const res = await fetch(chapterUrl.toString(), { mode: "cors" });
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const text = await res.text();

      const extracted = extractSectionHtmlFromChapter(doc, text);
      if (!extracted) {
        setReaderState({
          status: "ready",
          html: "",
          error: "Could not extract section HTML. Showing official view instead.",
          mode: "iframe",
        });
        return;
      }

      setReaderState({ status: "ready", html: extracted, error: "", mode: "inline" });
    } catch {
      setReaderState({
        status: "ready",
        html: "",
        error: "Inline rendering was blocked (CORS). Showing official page view instead.",
        mode: "iframe",
      });
    }
  }

  // Helper: open global result and also sync browse state (nice UX)
  function openGlobalResult(r) {
    // Try to sync browse selections to match the result
    setSelectedTitleKey(r.titleKey);
    setSelectedChapterKey(r.chapterKey);
    setChapterQuery("");
    openInReader(r);
    setGlobalOpen(true); // keep open; change to false if you want it to auto-collapse
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-title">CT General Statutes</div>
          <div className="brand-sub">Browse Titles → Chapters → Sections • Inline reader</div>
        </div>

        <div className="searchbar">
         <input
  value={globalQueryRaw}
  onChange={(e) => setGlobalQueryRaw(e.target.value)}
  placeholder='Heading Search e.g., "landlord", "probate", "4-62"'
/>

        </div>
      </header>

      <main className="main2">
        {/* LEFT PANEL: Browse + Global drawer */}
        <section className="panel leftPanel">
          <div className="panel-header">
            <div className="panel-title">Browse</div>
            <div className="crumbs">
              <button className="linkbtn" onClick={backToTitles} disabled={!selectedTitleKey}>
                Titles
              </button>
              <span className="sep">/</span>
              <button className="linkbtn" onClick={backToChapters} disabled={!selectedChapterKey}>
                Chapters
              </button>
              <span className="sep">/</span>
              <span className="crumb">
                {selectedChapter
                  ? `${selectedChapter.label}${selectedChapter.name ? ` — ${selectedChapter.name}` : ""}`
                  : "Sections"}
              </span>
            </div>
          </div>

          {/* Browse body scroll area (leaves room for bottom drawer) */}
          <div className="leftBody">
            {!selectedTitle && (
              <div className="grid">
                {titles.map((t) => (
                  <button key={t.title_key} className="card" onClick={() => openTitle(t.title_key)}>
                    <div className="card-kicker">{t.label || `Title ${t.title_key}`}</div>
                    <div className="card-title">{t.name || " "}</div>
                    <div className="card-meta">{(t.chapters ?? []).length} chapters</div>
                  </button>
                ))}
              </div>
            )}

            {selectedTitle && !selectedChapter && (
              <>
                <div className="subheader">
                  <div className="subheader-title">
                    {selectedTitle.label}
                    {selectedTitle.name ? ` — ${selectedTitle.name}` : ""}
                  </div>
                  <button className="ghost" onClick={backToTitles}>
                    Back to Titles
                  </button>
                </div>

                <div className="grid">
                  {chapters.map((c) => (
                    <button key={c.chapter_key} className="card" onClick={() => openChapter(c.chapter_key)}>
                      <div className="card-kicker">{c.label || `Chapter ${c.chapter_key}`}</div>
                      <div className="card-title">{c.name || " "}</div>
                      <div className="card-meta">{(c.sections ?? []).length} sections</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {selectedChapter && (
              <>
                <div className="subheader">
                  <div className="subheader-title">
                    {selectedTitle?.label}
                    {selectedTitle?.name ? ` — ${selectedTitle.name}` : ""}
                    <span className="dot">•</span>
                    {selectedChapter.label}
                    {selectedChapter.name ? ` — ${selectedChapter.name}` : ""}
                  </div>

                  <div className="subheader-actions">
                    <input
                      className="miniinput"
                      value={chapterQuery}
                      onChange={(e) => setChapterQuery(e.target.value)}
                      placeholder="Search within chapter…"
                      aria-label="Search within chapter"
                    />
                    <button className="ghost" onClick={backToChapters}>
                      Back
                    </button>
                  </div>
                </div>

                <div className="list">
                  {filteredSections.map((s) => {
                    const doc = {
                      titleKey: selectedTitle?.title_key ?? "",
                      titleLabel: selectedTitle?.label ?? "",
                      titleName: selectedTitle?.name ?? "",
                      chapterKey: selectedChapter?.chapter_key ?? "",
                      chapterLabel: selectedChapter?.label ?? "",
                      chapterName: selectedChapter?.name ?? "",
                      secKey: s.section_key ?? "",
                      heading: s.label ?? "",
                      url: s.url ?? "",
                      id: `${selectedTitle?.title_key ?? ""}|${selectedChapter?.chapter_key ?? ""}|${s.section_key ?? ""}`,
                    };

                    return (
                      <button key={s.url} className="result" onClick={() => openInReader(doc)} title="Open in reader">
                        <div className="result-title">{s.label || "(No heading text)"}</div>
                        <div className="result-meta">
                          {s.section_key ? <span className="pill">§ {s.section_key}</span> : null}
                          <span className="pill">Open in reader</span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredSections.length === 0 && <div className="empty">No matches in this chapter.</div>}
                </div>
              </>
            )}
          </div>

          {/* Bottom-docked Global Results drawer */}
          <div className={`globalDrawer ${globalOpen ? "open" : ""}`}>
            <button className="drawerHandle" onClick={() => setGlobalOpen((v) => !v)}>
              <span className="drawerTitle">Global results</span>
              <span className="drawerMeta">
                {globalQuery.trim()
                  ? `${globalResults.length} shown`
                  : "Type in the search box above"}
              </span>
              <span className="drawerChevron">{globalOpen ? "▾" : "▴"}</span>
            </button>

            {globalOpen && (
              <div className="drawerBody">
                {!globalQuery.trim() && <div className="empty">Search across all section headings.</div>}

                {globalQuery.trim() && globalResults.length === 0 && <div className="empty">No matches.</div>}

                {globalResults.map((r) => (
                  <button key={r.id} className="result" onClick={() => openGlobalResult(r)} title="Open in reader">
                    <div className="result-title">{r.heading}</div>
                    <div className="result-meta">
                      <span className="pill">
                        {r.titleLabel}{r.titleName ? ` — ${r.titleName}` : ""}
                      </span>
                      <span className="pill">
                        {r.chapterLabel}{r.chapterName ? ` — ${r.chapterName}` : ""}
                      </span>
                      {r.secKey ? <span className="pill">§ {r.secKey}</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Reader */}
        <section className="panel reader">
          <div className="panel-header">
            <div className="panel-title">Reader</div>
            <div className="panel-meta">{selectedDoc?.secKey ? `§ ${selectedDoc.secKey}` : "Select a section"}</div>
          </div>

          {!selectedDoc && <div className="reader-empty">Pick a section from Browse or Global results.</div>}

          {selectedDoc && (
            <div className="reader-body">
              <div className="reader-head">
                <div className="reader-title">{selectedDoc.heading}</div>
                <div className="reader-meta">
                  <span className="pill">
                    {selectedDoc.titleLabel}{selectedDoc.titleName ? ` — ${selectedDoc.titleName}` : ""}
                  </span>
                  <span className="pill">
                    {selectedDoc.chapterLabel}{selectedDoc.chapterName ? ` — ${selectedDoc.chapterName}` : ""}
                  </span>
                  <button
                    className="ghost"
                    onClick={() => window.open(selectedDoc.url, "_blank", "noopener,noreferrer")}
                  >
                    Official link
                  </button>
                </div>
              </div>

              {readerState.status === "loading" && <div className="reader-loading">Loading section…</div>}

              {readerState.status === "ready" && readerState.error && (
                <div className="reader-note">{readerState.error}</div>
              )}

              {readerState.status === "ready" && readerState.mode === "inline" && (
                <div className="reader-content" dangerouslySetInnerHTML={{ __html: readerState.html }} />
              )}

              {readerState.status === "ready" && readerState.mode === "iframe" && (
                <iframe className="reader-iframe" src={selectedDoc.url} title="Official statute view" />
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
