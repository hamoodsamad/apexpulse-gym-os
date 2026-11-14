import { build } from "esbuild";

await build({
  entryPoints: ["server/vercel-entry.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  external: ["better-sqlite3", "pg-native"],
  outfile: "api/_bundle.cjs",
  footer: {
    js: "if (module.exports && module.exports.default) { module.exports = module.exports.default; }",
  },
});

console.log("Built api/_bundle.cjs successfully.");
