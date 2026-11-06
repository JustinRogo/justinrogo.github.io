import { build, context } from "esbuild";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { decodeHTML } from "entities";

const root = fileURLToPath(new URL("../", import.meta.url));
export async function buildV2({ watch = false } = {}) {
  await mkdir(path.join(root, "v2/assets"), { recursive: true });
  for (const [source, target] of [
    ["assets/react-bits-LICENSE.txt", "react-bits-LICENSE.txt"],
    ["node_modules/react/LICENSE", "react-LICENSE.txt"],
    ["node_modules/react-dom/LICENSE", "react-dom-LICENSE.txt"],
    ["node_modules/scheduler/LICENSE", "scheduler-LICENSE.txt"],
    ["node_modules/motion/LICENSE.md", "motion-LICENSE.txt"],
    ["node_modules/framer-motion/LICENSE.md", "framer-motion-LICENSE.txt"],
    ["node_modules/motion-dom/LICENSE.md", "motion-dom-LICENSE.txt"],
    ["node_modules/motion-utils/LICENSE.md", "motion-utils-LICENSE.txt"],
    ["node_modules/vgpu/LICENSE", "vgpu-LICENSE.txt"],
    ["v2/assets/fonts/Geist-OFL.txt", "Geist-OFL.txt"],
  ])
    await copyFile(
      path.join(root, source),
      path.join(root, "v2/assets", target),
    );
  for (const [name, source] of [
    ["gsap", "gsap/dist/gsap.js"],
    ["gsap-react", "@gsap/react/dist/index.js"],
  ]) {
    const text = await readFile(
      path.join(root, "node_modules", source),
      "utf8",
    );
    await writeFile(
      path.join(root, "v2/assets", `${name}-LICENSE.txt`),
      text.match(/\/\*![\s\S]*?\*\//)?.[0] ||
        "https://gsap.com/standard-license/",
    );
  }
  const options = {
    absWorkingDir: root,
    entryPoints: ["v2/src/index.jsx"],
    outfile: "v2/assets/app.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    jsx: "automatic",
    minify: !watch,
    sourcemap: watch ? "inline" : false,
    legalComments: "linked",
    external: ["*.woff2"],
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        watch ? "development" : "production",
      ),
    },
    plugins: [
      {
        name: "existing-background-components",
        setup(builder) {
          const source = path.join(root, "src/homepage/SiteBackground.jsx");
          builder.onResolve({ filter: /^v2:backgrounds$/ }, () => ({
            path: source,
            namespace: "v2-backgrounds",
          }));
          builder.onLoad(
            { filter: /.*/, namespace: "v2-backgrounds" },
            async () => {
              const original = await readFile(source, "utf8");
              const boundary = original.indexOf(
                "export function SiteBackground()",
              );
              if (boundary < 0)
                throw new Error(
                  "Existing background component boundary changed.",
                );
              // Expose the existing renderers without V1's body observer/settings owner
              // or global host CSS. V2 owns selection, motion, theme, and scoped styles.
              const components = original
                .slice(0, boundary)
                .replace(/^import ['"].*\.css['"];?\s*$/gm, "");
              return {
                contents: `${components}\nexport { ShapeWavesBackground, AuroraBackground, AntigravityBackground, FractalBackground };`,
                resolveDir: path.dirname(source),
                loader: "jsx",
                watchFiles: [source],
              };
            },
          );
        },
      },
      {
        name: "existing-strengths-content",
        setup(builder) {
          const source = path.join(root, "src/homepage/legacy-widgets.js");
          builder.onResolve({ filter: /^v2:strengths$/ }, () => ({
            path: source,
            namespace: "strengths",
          }));
          builder.onLoad({ filter: /.*/, namespace: "strengths" }, async () => {
            const legacy = await readFile(source, "utf8");
            const themes = [
              ...legacy.matchAll(
                /data-domain="([^"]+)" data-desc="([^"]+)"><span class="rank">(\d+)<\/span><span class="name">([^<]+)<\/span>/g,
              ),
            ]
              .map(([, domain, description, rank, name]) => ({
                domain,
                description: decodeHTML(description),
                rank: Number(rank),
                name: decodeHTML(name),
              }))
              .sort((a, b) => a.rank - b.rank);
            if (themes.length !== 34)
              throw new Error(
                "Expected all 34 existing CliftonStrengths themes.",
              );
            const reflections = Object.fromEntries(
              ["best", "overextended"].map((id) => {
                const match = legacy.match(
                  new RegExp(
                    `<div id="${id}" class="content(?: active)?">\\s*<p>([\\s\\S]*?)</p>`,
                  ),
                );
                if (!match)
                  throw new Error(
                    `Missing existing CliftonStrengths ${id} reflection.`,
                  );
                return [
                  id,
                  decodeHTML(
                    match[1]
                      .replace(/<[^>]*>/g, "")
                      .replace(/\s+/g, " ")
                      .trim(),
                  ),
                ];
              }),
            );
            return {
              contents: `export default ${JSON.stringify(themes)};\nexport const reflections = ${JSON.stringify(reflections)};`,
              loader: "js",
              watchFiles: [source],
            };
          });
        },
      },
    ],
  };
  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    return ctx;
  }
  await build(options);
  console.log("V2 built independently in v2/assets/.");
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildV2({ watch: process.argv.includes("--watch") });
