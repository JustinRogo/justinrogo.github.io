export const PAGE_TREE_FALLBACK = [
  {
    title: 'For Fun',
    children: [
      { title: 'Evolutionary Flocking Ecosystem', href: 'Pages/For Fun/Birds.html' },
      { title: 'Game of Life - Ultimate Cosmos', href: 'Pages/For Fun/Game-of-Life.html' },
      { title: 'Midnight Tarot', href: 'Pages/For Fun/Tarot/index.html' },
      { title: 'Web Crawler', href: 'Pages/For Fun/Spider/index.html' },
      { title: 'Wave Function Collapse', href: 'Pages/For Fun/Wave-Function-Collapse.html' },
      { title: 'UConn Law Library & IT - Multi-Gen Strategic Framework 2026', href: 'Pages/For Fun/StrategicFramework2.html' },
    ],
  },
  {
    title: 'Work',
    children: [
      { title: 'AI Corner Blog', href: 'https://justinrogo.vercel.app/updates' },
      {
        title: 'CGS',
        children: [
          { title: 'CT General Statutes Explorer', href: 'https://uconn-law-library.github.io/CGS/#/' },
        ],
      },
      {
        title: 'Library',
        children: [
          { title: 'Front Desk Planner', href: 'Pages/Work/Library/Desk Planner/index.html' },
          { title: 'Law Library Heatmap', href: 'Pages/Work/Library/heatmap.html' },
          { title: 'UConn School of Law Library Centennial Timeline', href: 'Pages/Work/Library/Timeline_LawLib.html' },
        ],
      },
      {
        title: 'UCPEA',
        children: [
          { title: 'UCPEA Member Dashboard', href: 'Pages/Work/UCPEA/index.html' },
          { title: 'UCPEA Contract Comparison', href: 'Pages/Work/UCPEA/UCPEA_Contract_Comparison.html' },
          { title: 'UCPEA Collective Bargaining Agreement, 2025-2029', href: 'Pages/Work/UCPEA/UCPEAContract.html' },
          { title: 'UCPEA Contract History', href: 'Pages/Work/UCPEA/UCPEA_Contract_History.html' },
        ],
      },
    ],
  },
];

const PAGE_TREE_ROOT = 'Pages/';
const PAGE_TREE_MANIFEST = 'data/pages.json';

function titleFromPathPart(value) {
  return value
    .replace(/\.html$/i, '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => (word.length <= 4 && /^[a-z]+$/.test(word) ? word.toUpperCase() : word.replace(/^\w/, char => char.toUpperCase())))
    .join(' ');
}

function insertPage(tree, page) {
  const parts = page.path.split('/').slice(1);
  const fileName = parts.pop();
  let cursor = tree;

  parts.forEach(part => {
    let group = cursor.find(node => !node.href && node.pathPart === part);
    if (!group) {
      group = { title: titleFromPathPart(part), pathPart: part, children: [] };
      cursor.push(group);
    }
    cursor = group.children;
  });

  cursor.push({
    title: page.title || titleFromPathPart(fileName),
    href: page.href || page.path,
    path: page.path,
    category: page.category,
    description: page.description,
  });
}

function sortTree(nodes) {
  nodes.sort((a, b) => {
    if (a.href && !b.href) return 1;
    if (!a.href && b.href) return -1;
    return a.title.localeCompare(b.title);
  });
  nodes.forEach(node => {
    if (node.children) sortTree(node.children);
  });
  return nodes;
}

export async function loadPageTree(signal) {
  const response = await fetch(PAGE_TREE_MANIFEST, { cache: 'no-cache', signal });
  if (!response.ok) throw new Error('Page manifest failed to load');
  const data = await response.json();
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const validPages = pages.filter(page => (
    page
    && typeof page.path === 'string'
    && page.path.startsWith(PAGE_TREE_ROOT)
    && /\.html$/i.test(page.path)
    && typeof page.title === 'string'
    && page.title.trim()
    && typeof page.category === 'string'
    && page.category.trim()
    && typeof page.description === 'string'
    && page.description.trim()
    && (page.href === undefined || typeof page.href === 'string')
  ));

  if (!validPages.length) throw new Error('Page manifest contains no valid pages');

  const tree = [];
  validPages.forEach(page => insertPage(tree, page));
  return sortTree(tree);
}
