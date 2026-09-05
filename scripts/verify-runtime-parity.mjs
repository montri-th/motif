import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "assets/landometer/landometer-motifs.css"), "utf8");
const runtime = fs.readFileSync(path.join(root, "assets/landometer/landometer-motifs.js"), "utf8");
const expectedSourceHashes = {
  "landometer-motifs.css": "e7028286a484c41707ea30dd448fd9d9d6b2106eac4d563f991fd268a9fe1794",
  "landometer-motifs.js": "d4e5c636a499d8bfa71a79a03c961fbddd3f237b20f139486316856de7ff12fb",
};
const actualSourceHashes = {
  "landometer-motifs.css": crypto.createHash("sha256").update(css).digest("hex"),
  "landometer-motifs.js": crypto.createHash("sha256").update(runtime).digest("hex"),
};

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

  function inspectPresentedLogo(theme) {
    if (theme === "dark") document.documentElement.dataset.theme = "dark";
    else document.documentElement.removeAttribute("data-theme");
    const element = document.createElement("lm-motif");
    element.setAttribute("kind", "logo");
    element.setAttribute("autoplay", "false");
    element.setAttribute("ink", "blue");
    element.style.setProperty("--lm-wedge", "#0195CB");
    document.body.append(element);
    const geometry = [...element.querySelectorAll("path,rect,circle")];
    const record = {
      theme,
      hostInk: element.getAttribute("ink"),
      hostWedge: element.style.getPropertyValue("--lm-wedge"),
      hostColorHex: toHex(getComputedStyle(element).color),
      pinFillHex: toHex(getComputedStyle(geometry[0]).fill),
      innerStrokeHex: geometry.slice(1, 5).map((part) => toHex(getComputedStyle(part).stroke)),
      outerStrokeHex: geometry.slice(5, 9).map((part) => toHex(getComputedStyle(part).stroke)),
      wedgeFillHex: toHex(getComputedStyle(geometry.at(-1)).fill),
      geometryCount: geometry.length,
    };
    element.remove();
    return record;
  }

  results["logo-full-preview-light"] = inspectPresentedLogo("light");
  results["logo-full-preview-dark"] = inspectPresentedLogo("dark");
  document.documentElement.removeAttribute("data-theme");
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
const expectedRawWedge = "#1F87CE";
const expectedOfficialWedge = "#0195CB";
const expectedBrandBlue = "#1D4497";
const previewLight = computed["logo-full-preview-light"];
const previewDark = computed["logo-full-preview-dark"];
const geometryDecision = JSON.parse(fs.readFileSync(path.join(root, "governance/logo-full-geometry-decision.json"), "utf8"));
const nonTargetHashes = Object.entries(geometryDecision.nonTargetStaticSvgSha256).map(([name, expected]) => {
  const bytes = fs.readFileSync(path.join(root, "assets/landometer/svg", name));
  return { name, expected, actual: crypto.createHash("sha256").update(bytes).digest("hex") };
});
const checks = [
  {
    name: "owner-supplied runtime CSS and JavaScript remain byte-exact",
    passed: Object.entries(expectedSourceHashes).every(([name, expected]) => actualSourceHashes[name] === expected),
    detail: { expected: expectedSourceHashes, actual: actualSourceHashes },
  },
  {
    name: "raw owner runtime keeps its authored light-theme Brand Blue composites and token-derived wedge",
    passed: logoGeometry[0]?.fillHex === expectedBrandBlue
      && JSON.stringify(innerLogoSegments.map((part) => part.strokeHex)) === JSON.stringify(expectedInnerColors)
      && JSON.stringify(outerLogoSegments.map((part) => part.strokeHex)) === JSON.stringify(expectedOuterColors)
      && computed["logo-full"].wedge.srgbHex === expectedRawWedge,
    detail: {
      pin: logoGeometry[0]?.fillHex,
      inner: innerLogoSegments.map((part) => part.strokeHex),
      outer: outerLogoSegments.map((part) => part.strokeHex),
      wedge: computed["logo-full"].wedge,
    },
  },
  {
    name: "artifact-delivered logo presentation locks the official palette in light and dark themes",
    passed: [previewLight, previewDark].every((preview) => preview.hostInk === "blue"
      && preview.hostWedge.toUpperCase() === expectedOfficialWedge
      && preview.hostColorHex === expectedBrandBlue
      && preview.pinFillHex === expectedBrandBlue
      && JSON.stringify(preview.innerStrokeHex) === JSON.stringify(expectedInnerColors)
      && JSON.stringify(preview.outerStrokeHex) === JSON.stringify(expectedOuterColors)
      && preview.wedgeFillHex === expectedOfficialWedge
      && preview.geometryCount === 10),
    detail: { light: previewLight, dark: previewDark },
  },
  {
    name: "logo full static wedge matches the artifact-delivered official presentation override",
    passed: staticWedge?.toUpperCase() === expectedOfficialWedge
      && previewLight.wedgeFillHex === expectedOfficialWedge
      && previewDark.wedgeFillHex === expectedOfficialWedge,
    detail: { staticWedge, rawRuntime: computed["logo-full"].wedge, previewLight, previewDark },
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
    name: "raw logo full wedge overlaps the inner band and retains the owner runtime's computed final colour",
    passed: logoGeometry.at(-1)?.d === "M300 143 L371.6 143 A71.6 71.6 0 0 0 350.63 92.37 Z"
      && logoGeometry.at(-1)?.fillHex === computed["logo-full"].wedge.srgbHex,
    detail: logoGeometry.at(-1),
  },
  {
    name: "logo full static SVG bakes concrete portable paints with no runtime-only style",
    passed: [expectedBrandBlue, ...expectedInnerColors, ...expectedOuterColors, expectedOfficialWedge]
      .every((color) => staticLogo.includes(color))
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
  artifactRelease: "1.1.3",
  artifactRoot: ".",
  browser: "system Google Chrome through Playwright",
  evidenceBoundary: "Geometry and lifecycle behavior are sourced from the byte-exact owner-supplied v2 runtime; its raw light-theme default remains Brand Blue with the authored LCH-derived #1F87CE wedge. The 1.1.3 artifact does not modify those source bytes: the showcase host explicitly selects ink=blue and --lm-wedge:#0195CB, producing the approved Brand Blue, four inner composite, four outer energy, and official cyan-wedge palette in both light and dark themes. Static SVG parity is evaluated against that artifact-delivered presentation. Exact normalized overlap paths and non-target static hashes are verified; optional replay/loop API presence is byte-parity evidence, not downstream authorization, and palette/region parity does not claim master-PNG raster pixel identity.",
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
