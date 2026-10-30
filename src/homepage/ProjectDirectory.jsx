import { useEffect, useRef, useState } from 'react';
import { loadPageTree, PAGE_TREE_FALLBACK } from './page-tree.js';
import { useCollectionSpotlight } from './effects.js';
import { GlassMaterial } from './GlassMaterial.jsx';

const collectPages = nodes => nodes.flatMap(node => node.href ? [node] : collectPages(node.children || []));

function PageLink({ page }) {
  const children = page.children || [];
  return <li className={children.length ? 'page-tree__parent' : undefined}>
    <a className={`page-link${children.length ? ' page-link--parent' : ''}`} href={page.href}>
      <span className="dot" aria-hidden="true" />
      <span className="page-link__content">
        <span className="page-link__heading">
          <span className="page-link__title">{page.title}</span>
          {page.category && <span className="page-link__category">{page.category}</span>}
        </span>
        {page.description && <span className="page-link__description">{page.description}</span>}
      </span>
    </a>
    {children.length > 0 && <ul className="page-branch__children">
      {children.map(child => <PageLink key={child.href} page={child} />)}
    </ul>}
  </li>;
}

function BranchItems({ node, path, depth }) {
  const children = [...(node.children || [])].sort((a, b) =>
    Number(Boolean(a.href)) - Number(Boolean(b.href)) || a.title.localeCompare(b.title));
  const indexPage = children.find(child => {
    const directory = (child.path || child.href || '').match(/(?:^|\/)([^/]+)\/index\.html$/i)?.[1];
    return child.href && directory === (node.pathPart || node.title);
  });
  const folders = children.filter(child => !child.href);
  const pages = children.filter(child => child.href && child !== indexPage);
  const links = indexPage ? [{ ...indexPage, children: pages }] : pages;
  return <ul className="page-branch__items">
    {folders.map((child, index) => {
      const descendants = collectPages(child.children || []);
      if (!descendants.length) return null;
      if (descendants.length === 1) return <PageLink key={child.title} page={descendants[0]} />;
      const headingId = `page-branch-${path}-${index}`;
      const Heading = `h${Math.min(4 + depth, 6)}`;
      return <li className="page-branch__folder" key={child.title}>
        <section className="page-branch page-branch--nested" aria-labelledby={headingId}>
          <div className="page-branch__header"><Heading id={headingId}>{child.title}</Heading></div>
          <BranchItems node={child} path={`${path}-${index}`} depth={depth + 1} />
        </section>
      </li>;
    })}
    {links.map(page => <PageLink key={page.href} page={page} />)}
  </ul>;
}

function collections(nodes) {
  const work = { title: 'Work', description: 'Library tools, statutes & updates', children: [] };
  const ucpea = { title: 'UCPEA', description: 'Union dashboard, contracts & resources', children: [] };
  const fun = { title: 'For Fun', description: 'Creative experiments & simulations', children: [] };
  for (const node of nodes) {
    if (node.title === 'Work' && !node.href) {
      for (const child of node.children || []) {
        if (!child.href && child.title === 'UCPEA') ucpea.children.push(...(child.children || []));
        else work.children.push(child);
      }
    } else if (node.title === 'For Fun' && !node.href) fun.children.push(...(node.children || []));
    else if (node.title === 'Updates' && !node.href) work.children.push(...(node.children || []));
    else work.children.push(node);
  }
  return [work, ucpea, fun];
}

export function ProjectDirectory() {
  const [tree, setTree] = useState(() => location.protocol === 'file:' ? PAGE_TREE_FALLBACK : null);
  const treeRef = useRef(null);
  useCollectionSpotlight(treeRef);
  useEffect(() => {
    if (location.protocol === 'file:') return;
    const controller = new AbortController();
    let disposed = false;
    // A stalled manifest should still resolve to usable navigation.
    const timeout = setTimeout(() => controller.abort(), 10000);
    loadPageTree(controller.signal)
      .then(nodes => { if (!disposed) setTree(nodes); })
      .catch(() => { if (!disposed) setTree(PAGE_TREE_FALLBACK); })
      .finally(() => clearTimeout(timeout));
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, []);
  return <section className="card surface widget page-directory" id="page-directory" aria-labelledby="page-directory-heading">
    <GlassMaterial />
    <header className="page-directory__heading"><h2 id="page-directory-heading">Pages &amp; Projects</h2></header>
    <nav className="page-tree" id="pageTree" ref={treeRef} aria-label="Site collections" aria-busy={!tree}>
      {!tree ? <span className="info-note" role="status">Loading pages...</span> : collections(tree).map((group, index) =>
        <details className="page-collection" key={group.title}>
          <summary className="page-collection__summary">
            <span className="page-collection__spotlight" aria-hidden="true" />
            <h3 className="page-collection__label"><span className="page-collection__title">{group.title}</span><span className="page-collection__description">{group.description}</span></h3>
            <span className="page-collection__chevron" aria-hidden="true" />
          </summary>
          <div className="page-collection__body"><BranchItems node={group} path={String(index)} depth={0} /></div>
        </details>)}
    </nav>
  </section>;
}
