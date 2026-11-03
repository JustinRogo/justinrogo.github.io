import themes, { reflections } from "v2:strengths";

export { themes, reflections };
export const domains = [
  { id: "thinking", name: "Strategic Thinking" },
  { id: "relationship", name: "Relationship Building" },
  { id: "executing", name: "Executing" },
  { id: "influencing", name: "Influencing" },
];
export const domainNames = Object.fromEntries(
  domains.map(({ id, name }) => [id, name]),
);
const maxRank = Math.max(...themes.map(({ rank }) => rank));
const scores = themes.reduce((sum, { domain, rank }) => {
  sum[domain] = (sum[domain] || 0) + Math.max(1, maxRank + 1 - rank);
  return sum;
}, {});
export const totalWeight = Object.values(scores).reduce(
  (sum, score) => sum + score,
  0,
);
export const domainOverview = domains.map((domain) => ({
  ...domain,
  weight: scores[domain.id],
  percentage: ((scores[domain.id] / totalWeight) * 100).toFixed(1),
}));
