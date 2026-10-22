import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

// One self-contained file, as HACS installs it (SPEC HA-SAIL-SPEC-001 §9.7, OD-29)
export default {
  input: "src/vigie-traffic-card.ts",
  output: { file: "dist/vigie-traffic-card.js", format: "es", sourcemap: false },
  plugins: [
    resolve(),
    typescript({ tsconfig: "./tsconfig.json", include: ["src/**/*.ts"], noEmit: false }),
    terser({ format: { comments: false } }),
  ],
};
