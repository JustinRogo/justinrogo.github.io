import { useContext, useMemo } from "react";
import BranchedMenu from "../vendor/BranchedMenu.jsx";
import Icon from "./Icon.jsx";
import { newTabLink } from "./UI.jsx";
import { groupOf, resources, projectHref } from "../content.js";
import { useBotanical } from "../botanical/siteStyle.js";
import { LinkBaseContext, resolveHref } from "../links.js";

const EMPTY_PAGES = [];
const SHORT_SCREEN = 900;
const UCPEA_ROOT = "Pages/Work/UCPEA/";
const contractLabels = [
  ["UCPEAContract.html", "Current Contract"],
  ["UCPEA_Contract_History.html", "Contract History"],
  ["UCPEA_Contract_Comparison.html", "Contract Comparison"],
];
// Off the homepage, hash routes and project paths point back to it.
function rebase(item, base) {
  if (!base) return item;
  return {
    ...item,
    ...(item.href && { href: resolveHref(item.href, base) }),
    ...(item.children && { children: item.children.map((child) => rebase(child, base)) }),
  };
}
function ucpeaLinks(pages) {
  const scoped = pages.filter((page) => page.path.startsWith(UCPEA_ROOT));
  const link = (page, label = page.title) => ({
    value: `page:${page.path}`,
    label,
    href: projectHref(page),
    ...newTabLink,
  });
  const dashboard = scoped.find(
    (page) => page.path === `${UCPEA_ROOT}index.html`,
  );
  const contracts = contractLabels.flatMap(([path, label]) => {
    const page = scoped.find((page) => page.path === `${UCPEA_ROOT}${path}`);
    return page ? [link(page, label)] : [];
  });
  const extra = scoped
    .filter(
      (page) =>
        page !== dashboard &&
        !contractLabels.some(([path]) => page.path === `${UCPEA_ROOT}${path}`),
    )
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((page) => ({ ...link(page), icon: <Icon name="book" size={16} /> }));
  return dashboard
    ? [
        {
          ...link(dashboard),
          icon: <Icon name="book" size={16} />,
          children: contracts,
        },
        ...extra,
      ]
    : [...contracts, ...extra];
}

export default function ExploreMenu({
  route,
  effects = true,
  onSelect,
  pages = EMPTY_PAGES,
  collapseOnShortScreens = false,
}) {
  const botanical = useBotanical();
  const base = useContext(LinkBaseContext);
  const items = useMemo(
    () => [
      {
        label: "Projects",
        children: [
          {
            value: "work",
            label: "Work & tools",
            href: "#/projects?group=Work",
            icon: <Icon name="code" size={16} />,
          },
          {
            value: "library",
            label: "Library projects",
            href: "#/projects?group=Library",
            icon: <Icon name="book" size={16} />,
          },
          {
            value: "fun",
            label: "For the fun of it",
            href: "#/projects?group=For+Fun",
            icon: <Icon name="projects" size={16} />,
          },
          {
            value: "saved",
            label: "Saved projects",
            href: "#/projects?saved=1",
            icon: <Icon name="bookmark" size={16} />,
          },
        ],
      },
      {
        label: "Work",
        rowHeight: 64,
        children: pages
          .filter(
            (page) =>
              groupOf(page) !== "For Fun" &&
              !page.path.startsWith("Pages/Work/UCPEA/"),
          )
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((page) => ({
            value: `page:${page.path}`,
            label: page.title,
            href: projectHref(page),
            ...newTabLink,
            icon: <Icon name="code" size={16} />,
          })),
      },
      {
        label: "UCPEA",
        rowHeight: 64,
        children: ucpeaLinks(pages),
      },
      {
        label: "For Fun",
        rowHeight: 64,
        children: pages
          .filter((page) => groupOf(page) === "For Fun")
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((page) => ({
            value: `page:${page.path}`,
            label: page.title,
            href: projectHref(page),
            ...newTabLink,
            icon: <Icon name="projects" size={16} />,
          })),
      },
      {
        label: "Useful shortcuts",
        children: [
          {
            value: "catalog",
            label: "Library search",
            href: "#/tools?panel=catalog",
            icon: <Icon name="search" size={16} />,
          },
          {
            value: "booking",
            label: "Book a meeting",
            href: "#/tools?panel=booking",
            icon: <Icon name="calendar" size={16} />,
          },
          {
            value: "request",
            label: "Start a request",
            href: "#/tools?panel=request",
            icon: <Icon name="mail" size={16} />,
          },
        ],
      },
      {
        label: "Quick links",
        children: resources.map(([label, href], index) => ({
          value: `resource-${index}`,
          label,
          href,
          ...newTabLink,
          icon: <Icon name="external" size={16} />,
        })),
      },
    ].map((group) => rebase(group, base)),
    [pages, base],
  );
  const selected =
    route?.view === "tools"
      ? route.params.get("panel") || "catalog"
      : route?.params.get("saved")
        ? "saved"
        : { Work: "work", Library: "library", "For Fun": "fun" }[
            route?.params.get("group")
          ] || "";
  // BranchedMenu reads this once, so later resizes never fold a group someone opened.
  const startClosed =
    collapseOnShortScreens &&
    innerHeight < SHORT_SCREEN &&
    !["work", "library", "fun", "saved"].includes(selected);
  return (
    <BranchedMenu
      items={items}
      defaultOpen={startClosed ? [] : [0]}
      activeValue={selected}
      onSelect={onSelect}
      color="var(--ink)"
      accentColor="var(--orange)"
      lineColor="var(--branch-line)"
      width={260}
      rowHeight={44}
      fontSize={12}
      indent={28}
      trunk={8}
      radius={8}
      drawDuration={effects ? 420 : 0}
      foldDuration={effects ? 300 : 0}
      leaves={botanical}
    />
  );
}
