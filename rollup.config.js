import { readFile } from "node:fs/promises";

import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

// `import css from "x.css?raw"`: the file's text as a string (Leaflet's CSS goes into the
// card's shadow root, where a page stylesheet cannot reach)
const raw = {
  name: "raw",
  async resolveId(source, importer) {
    if (!source.endsWith("?raw")) return null;
    const resolved = await this.resolve(source.slice(0, -4), importer);
    return resolved && `${resolved.id}?raw`;
  },
  async load(id) {
    if (!id.endsWith("?raw")) return null;
    return `export default ${JSON.stringify(await readFile(id.slice(0, -4), "utf8"))};`;
  },
};

// Leaflet's package entry is a UMD file whose names Rollup cannot see; its ES module build
// is the same code with real exports (the bundle would otherwise call undefined functions)
const leafletEsm = {
  name: "leaflet-esm",
  async resolveId(source, importer) {
    if (source !== "leaflet") return null;
    return this.resolve("leaflet/dist/leaflet-src.esm.js", importer);
  },
};

// One self-contained file with both cards, as HACS installs it (SPEC HA-SAIL-SPEC-001 §9.7,
// §9.8; OD-29, OD-34)
export default {
  input: "src/index.ts",
  output: { file: "dist/vigie-traffic-card.js", format: "es", sourcemap: false },
  plugins: [
    raw,
    leafletEsm,
    resolve(),
    typescript({ tsconfig: "./tsconfig.json", include: ["src/**/*.ts"], noEmit: false }),
    terser({ format: { comments: false } }),
  ],
};
