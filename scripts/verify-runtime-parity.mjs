import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "assets/landometer/landometer-motifs.css"), "utf8");
const runtime = fs.readFileSync(path.join(root, "assets/landometer/landometer-motifs.js"), "utf8");

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: "reduce" });
await page.setContent("<!doctype html><html><body></body></html>");
await page.addStyleTag({ content: css });
await page.addScriptTag({ content: runtime });

const computed = await page.evaluate(() => {
  function toHex(cssColor) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.fillStyle = cssColor;
    context.fillRect(0, 0, 1, 1);
    return `#${[...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
      .map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }

  const results = {};
  for (const kind of window.LandometerMotifs.kinds) {
    for (const quiet of [false, true]) {
      const element = document.createElement("lm-motif");
      element.setAttribute("kind", kind);
      element.setAttribute("autoplay", "false");
      if (quiet) element.setAttribute("quiet", "");
      document.body.append(element);
      const svg = element.querySelector("svg");
      results[`${kind}-${quiet ? "quiet" : "full"}`] = {
        elementCount: svg.querySelectorAll("*").length,
        geometry: [...svg.querySelectorAll("path,rect,circle")].map((node) => ({
          tag: node.tagName,
          d: node.getAttribute("d"),
          x: node.getAttribute("x"),
          y: node.getAttribute("y"),
          cx: node.getAttribute("cx"),
          cy: node.getAttribute("cy"),
          r: node.getAttribute("r"),
          width: node.getAttribute("width"),
          height: node.getAttribute("height"),
          transform: getComputedStyle(node).transform,
        })),
      };
      if (kind === "logo" && !quiet) {
        const wedge = svg.querySelector("path:last-child");
        const cssFill = getComputedStyle(wedge).fill;
        results["logo-full"].wedge = { cssFill, srgbHex: toHex(cssFill) };
      }
      element.remove();
    }
  }
  return results;
});
await browser.close();

const staticLogo = fs.readFileSync(path.join(root, "assets/landometer/svg/logo-full.svg"), "utf8");
const staticWedge = [...staticLogo.matchAll(/<path\b[^>]*\bfill="([^"]+)"[^>]*>/g)].at(-1)?.[1] || null;
const staticSliceFull = fs.readFileSync(path.join(root, "assets/landometer/svg/slice-full.svg"), "utf8");
const staticSliceQuiet = fs.readFileSync(path.join(root, "assets/landometer/svg/slice-quiet.svg"), "utf8");
const checks = [
  {
    name: "logo full static wedge matches the runtime's computed sRGB color",
    passed: staticWedge?.toUpperCase() === computed["logo-full"].wedge.srgbHex,
    detail: { staticWedge, runtime: computed["logo-full"].wedge },
  },
  {
    name: "slice full static file bakes the runtime final transform",
    passed: staticSliceFull.includes('transform="translate(12 -12)"'),
  },
  {
    name: "slice quiet static file bakes the runtime final transform",
    passed: staticSliceQuiet.includes('transform="translate(12 -12)"'),
  },
];
const failed = checks.filter((check) => !check.passed);
const report = {
  schemaVersion: "motif-library-runtime-parity/1.0",
  executedAt: new Date().toISOString(),
  artifactRoot: ".",
  browser: "system Google Chrome through Playwright",
  evidenceBoundary: "Geometry is sourced from the exact runtime; reduced motion exposes the authored final CSS state. The LCH logo wedge is converted through the browser canvas to an 8-bit sRGB static color.",
  checks,
  computed,
  status: failed.length ? "failed" : "passed",
};
fs.writeFileSync(path.join(root, "governance/runtime-parity.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failed.length) {
  console.error(`FAILED: ${failed.length} of ${checks.length} runtime/static parity checks failed.`);
  for (const check of failed) console.error(`- ${check.name}: ${JSON.stringify(check.detail || null)}`);
  process.exit(1);
}
console.log(`PASS: ${checks.length} runtime/static parity checks. Logo wedge ${staticWedge}.`);
