import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const runtimePath = path.join(root, "assets/landometer/landometer-motifs.js");
const outputDir = path.join(root, "assets/landometer/svg");
// Official priority-wedge colour from the owner-supplied Landometer lockup.
// The exact runtime bytes remain unchanged; the library host selects this logo-specific paint.
const logoWedgeSrgb = "#0195CB";
// Browser-computed 8-bit sRGB results of each 80% energy colour mixed over Brand Blue.
// Opaque results preserve the official mark's colour appearance without dark overlap seams.
const logoBandSrgb = {
  "color-mix(in srgb, #FF5A5F 80%, #1D4497)": "#D2566A",
  "color-mix(in srgb, #FFBC1F 80%, #1D4497)": "#D2A437",
  "color-mix(in srgb, #0AD69C 80%, #1D4497)": "#0EB99B",
  "color-mix(in srgb, #59D2FE 80%, #1D4497)": "#4DB6E9",
};

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
    let svg = window.LandometerMotifs
      .svg(kind, quiet)
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
      .replaceAll("var(--energy-coral,#FF5A5F)", "#FF5A5F")
      .replaceAll("var(--energy-yellow,#FFBC1F)", "#FFBC1F")
      .replaceAll("var(--energy-mint,#0AD69C)", "#0AD69C")
      .replaceAll("var(--energy-sky,#59D2FE)", "#59D2FE")
      .replaceAll("var(--lm-wedge, #3F93D1)", logoWedgeSrgb)
      .replaceAll("currentColor", color);
    for (const [mix, srgb] of Object.entries(logoBandSrgb)) svg = svg.replaceAll(mix, srgb);
    svg = svg
      .replace(/ style="stroke:(#[A-Fa-f0-9]{6});--lm-dash:[^;]+;--lm-delay:[^"]+"/g, ' stroke="$1"')
      .replace(/ class="lm-step"/g, ' transform="translate(12 -12)" class="lm-step"')
      .replace(/\sclass="[^"]*"/g, "")
      .replace(/\sstyle="--lm-[^"]*"/g, "");
    fs.writeFileSync(path.join(outputDir, `${kind}-${variant}.svg`), `${svg}\n`);
  }
}

console.log(`Generated ${window.LandometerMotifs.kinds.length * 2} static Landometer SVGs.`);
