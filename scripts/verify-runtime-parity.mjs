import { createRequire } from "node:module";
import crypto from "node:crypto";
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
          strokeWidth: node.getAttribute("stroke-width"),
          strokeDasharray: node.getAttribute("stroke-dasharray"),
          strokeOpacity: getComputedStyle(node).strokeOpacity,
          strokeHex: getComputedStyle(node).stroke === "none" ? null : toHex(getComputedStyle(node).stroke),
          fillHex: getComputedStyle(node).fill === "none" ? null : toHex(getComputedStyle(node).fill),
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
const logoGeometry = computed["logo-full"].geometry;
const innerLogoSegments = logoGeometry.slice(1, 5);
const outerLogoSegments = logoGeometry.slice(5, 9);
const expectedInnerPaths = [
  "M214.50 143.00 A85.5 85.5 0 0 1 239.54 82.54",
  "M239.28 82.81 A85.5 85.5 0 0 1 300.00 57.50",
  "M299.63 57.50 A85.5 85.5 0 0 1 360.46 82.54",
  "M360.19 82.28 A85.5 85.5 0 0 1 385.50 143.00",
];
const expectedOuterPaths = [
  "M186.50 143.00 A113.5 113.5 0 0 1 219.74 62.74",
  "M219.39 63.09 A113.5 113.5 0 0 1 300.00 29.50",
  "M299.50 29.50 A113.5 113.5 0 0 1 380.26 62.74",
  "M379.91 62.39 A113.5 113.5 0 0 1 413.50 143.00",
];
const expectedInnerColors = ["#D2566A", "#D2A437", "#0EB99B", "#4DB6E9"];
const expectedOuterColors = ["#FF5A5F", "#FFBC1F", "#0AD69C", "#59D2FE"];
const geometryDecision = JSON.parse(fs.readFileSync(path.join(root, "governance/logo-full-geometry-decision.json"), "utf8"));
const nonTargetHashes = Object.entries(geometryDecision.nonTargetStaticSvgSha256).map(([name, expected]) => {
  const bytes = fs.readFileSync(path.join(root, "assets/landometer/svg", name));
  return { name, expected, actual: crypto.createHash("sha256").update(bytes).digest("hex") };
});
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
  {
    name: "logo full final state has one pin, eight colour segments, and one wedge",
    passed: logoGeometry.length === 10,
    detail: { elementCount: logoGeometry.length },
  },
  {
    name: "logo full inner band uses the exact radial and angular overlap paths",
    passed: JSON.stringify(innerLogoSegments.map((part) => part.d)) === JSON.stringify(expectedInnerPaths)
      && innerLogoSegments.every((part) => part.strokeWidth === "29" && part.strokeDasharray === "69" && part.strokeOpacity === "1"),
    detail: innerLogoSegments,
  },
  {
    name: "logo full outer band uses the exact radial and angular overlap paths",
    passed: JSON.stringify(outerLogoSegments.map((part) => part.d)) === JSON.stringify(expectedOuterPaths)
      && outerLogoSegments.every((part) => part.strokeWidth === "29" && part.strokeDasharray === "91" && part.strokeOpacity === "1"),
    detail: outerLogoSegments,
  },
  {
    name: "logo full opaque inner composites and outer energy colours match the governed final regions",
    passed: JSON.stringify(innerLogoSegments.map((part) => part.strokeHex)) === JSON.stringify(expectedInnerColors)
      && JSON.stringify(outerLogoSegments.map((part) => part.strokeHex)) === JSON.stringify(expectedOuterColors),
    detail: {
      inner: innerLogoSegments.map((part) => part.strokeHex),
      outer: outerLogoSegments.map((part) => part.strokeHex),
    },
  },
  {
    name: "logo full wedge overlaps the inner band and holds the computed final colour",
    passed: logoGeometry.at(-1)?.d === "M300 143 L371.6 143 A71.6 71.6 0 0 0 350.63 92.37 Z"
      && logoGeometry.at(-1)?.fillHex === computed["logo-full"].wedge.srgbHex,
    detail: logoGeometry.at(-1),
  },
  {
    name: "logo full static SVG bakes concrete portable paints with no runtime-only style",
    passed: expectedInnerColors.concat(expectedOuterColors).every((color) => staticLogo.includes(color))
      && !/(?:color-mix|currentColor|var\(|style=)/.test(staticLogo),
  },
  {
    name: "logo full variable-dash animation and the exact supplied v2 lifecycle APIs are present",
    passed: runtime.includes('class="lm-drawv"')
      && css.includes("@keyframes lm-drawv")
      && css.includes("lm-motif[data-play] .lm-drawv")
      && runtime.includes("getAttribute('replay')")
      && runtime.includes("hasAttribute('loop')")
      && runtime.includes("this.addEventListener('pointerenter'")
      && runtime.includes("clearTimeout(this._loop)"),
  },
  {
    name: "all 11 non-target Landometer static SVGs remain byte-identical to release 1.1.0",
    passed: nonTargetHashes.every((record) => record.actual === record.expected),
    detail: nonTargetHashes.filter((record) => record.actual !== record.expected),
  },
];
const failed = checks.filter((check) => !check.passed);
const report = {
  schemaVersion: "motif-library-runtime-parity/1.0",
  executedAt: new Date().toISOString(),
  artifactRoot: ".",
  browser: "system Google Chrome through Playwright",
  evidenceBoundary: "Geometry is sourced from the exact owner-supplied v2 runtime; reduced motion exposes the authored final CSS state. The LCH logo wedge and sRGB inner composites are converted through the browser canvas to 8-bit sRGB static colors. Exact normalized overlap paths and non-target static hashes are verified; optional replay/loop API presence is byte-parity evidence, not downstream authorization, and this does not claim master-PNG pixel identity.",
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
