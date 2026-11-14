import { build } from "esbuild";

await build({
  entryPoints: ["server/vercel-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  packages: "external",
  outfile: "api/index.cjs",
  footer: {
    js: "if (module.exports && module.exports.default) { module.exports = module.exports.default; }",
  },
});

console.log("Built api/index.cjs successfully.");
