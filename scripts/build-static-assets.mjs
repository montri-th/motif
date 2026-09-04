import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const runtimePath = path.join(root, "assets/landometer/landometer-motifs.js");
const outputDir = path.join(root, "assets/landometer/svg");
// Browser-computed 8-bit sRGB result of the exact runtime's LCH wedge mix.
// scripts/verify-runtime-parity.mjs independently recalculates and enforces this value.
const logoWedgeSrgb = "#1F87CE";

globalThis.HTMLElement = class {};
globalThis.window = {
  customElements: {
    get() { return undefined; },
    define() {},
  },
  matchMedia() { return { matches: true }; },
};

vm.runInThisContext(fs.readFileSync(runtimePath, "utf8"), { filename: runtimePath });

if (!window.LandometerMotifs?.svg) {
  throw new Error("Landometer motif runtime did not expose its SVG renderer.");
}

fs.mkdirSync(outputDir, { recursive: true });

for (const kind of window.LandometerMotifs.kinds) {
  for (const quiet of [false, true]) {
    const variant = quiet ? "quiet" : "full";
    const color = quiet ? "#59D2FE" : "#1D4497";
    const svg = window.LandometerMotifs
      .svg(kind, quiet)
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
      .replaceAll("var(--energy-coral,#FF5A5F)", "#FF5A5F")
      .replaceAll("var(--energy-yellow,#FFBC1F)", "#FFBC1F")
      .replaceAll("var(--energy-mint,#0AD69C)", "#0AD69C")
      .replaceAll("var(--energy-sky,#59D2FE)", "#59D2FE")
      .replaceAll("var(--lm-wedge, #3F93D1)", logoWedgeSrgb)
      .replaceAll("currentColor", color)
      .replace(/ class="lm-step"/g, ' transform="translate(12 -12)" class="lm-step"')
      .replace(/\sclass="[^"]*"/g, "")
      .replace(/\sstyle="--lm-[^"]*"/g, "");
    fs.writeFileSync(path.join(outputDir, `${kind}-${variant}.svg`), `${svg}\n`);
  }
}

console.log(`Generated ${window.LandometerMotifs.kinds.length * 2} static Landometer SVGs.`);
