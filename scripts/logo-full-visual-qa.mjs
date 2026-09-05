import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const root = path.resolve(import.meta.dirname, "..");
const runtimeCss = fs.readFileSync(path.join(root, "assets/landometer/landometer-motifs.css"), "utf8");
const runtimeJs = fs.readFileSync(path.join(root, "assets/landometer/landometer-motifs.js"), "utf8");
const staticSvg = fs.readFileSync(path.join(root, "assets/landometer/svg/logo-full.svg"));
const staticDataUrl = `data:image/svg+xml;base64,${staticSvg.toString("base64")}`;

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

async function render({ width, dpr, mode }) {
  const context = await browser.newContext({
    deviceScaleFactor: dpr,
    reducedMotion: ["animated-final", "settled-final"].includes(mode) ? "no-preference" : "reduce",
    viewport: { width: width + 40, height: Math.ceil(width / 2) + 40 },
  });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><style>
    html,body{margin:0;background:#fff} #target{display:block;width:${width}px;height:${width / 2}px}
  </style><body><div id="mount"></div></body></html>`);

  if (mode === "static") {
    await page.locator("#mount").evaluate((mount, source) => {
      const image = document.createElement("img");
      image.id = "target";
      image.alt = "";
      image.src = source;
      mount.append(image);
    }, staticDataUrl);
    await page.locator("#target").evaluate((image) => image.decode());
  } else {
    await page.addStyleTag({ content: runtimeCss });
    await page.addScriptTag({ content: runtimeJs });
    await page.locator("#mount").evaluate((mount, play) => {
      const motif = document.createElement("lm-motif");
      motif.id = "target";
      motif.setAttribute("kind", "logo");
      motif.setAttribute("autoplay", "false");
      mount.append(motif);
      if (play) motif.play();
    }, ["animated-final", "settled-final"].includes(mode));
    if (mode === "animated-final") {
      await page.locator("#target").evaluate(async (motif) => {
        await Promise.all(motif.getAnimations({ subtree: true }).map((animation) => animation.finished));
      });
    } else if (mode === "settled-final") {
      await page.waitForTimeout(2050);
      await page.locator("#target").evaluate((motif) => motif.removeAttribute("data-play"));
    }
  }

  const buffer = await page.locator("#target").screenshot({ animations: "allow" });
  await context.close();
  return PNG.sync.read(buffer);
}

function compare(actual, expected, tolerance = 2, maxPixelRatio = 0) {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return { passed: false, dimensionMismatch: [actual.width, actual.height, expected.width, expected.height] };
  }
  let pixelsOverTolerance = 0;
  let maxChannelDelta = 0;
  for (let i = 0; i < actual.data.length; i += 4) {
    let pixelDelta = 0;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(actual.data[i + channel] - expected.data[i + channel]);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      pixelDelta = Math.max(pixelDelta, delta);
    }
    if (pixelDelta > tolerance) pixelsOverTolerance += 1;
  }
  const pixelRatio = pixelsOverTolerance / (actual.width * actual.height);
  return {
    passed: pixelRatio <= maxPixelRatio,
    pixelsOverTolerance,
    pixelRatio: Number(pixelRatio.toFixed(6)),
    maxAllowedPixelRatio: maxPixelRatio,
    maxChannelDelta,
    tolerance,
  };
}

function pixelAt(png, x, y) {
  const px = Math.max(0, Math.min(png.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(png.height - 1, Math.round(y)));
  const index = (py * png.width + px) * 4;
  return [...png.data.slice(index, index + 4)];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function point(radius, angleDegrees, scale) {
  const angle = angleDegrees * Math.PI / 180;
  return [(300 + radius * Math.cos(angle)) * scale, (143 - radius * Math.sin(angle)) * scale];
}

function inspectSeams(png, width, dpr) {
  const scale = width / 600 * dpr;
  const innerByJoin = {
    45: [0x4D, 0xB6, 0xE9],
    90: [0x0E, 0xB9, 0x9B],
    135: [0xD2, 0xA4, 0x37],
  };
  const outerByJoin = {
    45: [0x59, 0xD2, 0xFE],
    90: [0x0A, 0xD6, 0x9C],
    135: [0xFF, 0xBC, 0x1F],
  };
  const outerByMidpoint = {
    22.5: [0x59, 0xD2, 0xFE],
    67.5: [0x0A, 0xD6, 0x9C],
    112.5: [0xFF, 0xBC, 0x1F],
    157.5: [0xFF, 0x5A, 0x5F],
  };
  const innerByMidpoint = {
    22.5: [0x4D, 0xB6, 0xE9],
    67.5: [0x0E, 0xB9, 0x9B],
    112.5: [0xD2, 0xA4, 0x37],
    157.5: [0xD2, 0x56, 0x6A],
  };
  const probes = [];
  for (const angle of [45, 90, 135]) {
    probes.push({ type: "angular-inner", radius: 85.5, angle, expected: innerByJoin[angle], tolerance: 30 });
    probes.push({ type: "angular-outer", radius: 113.5, angle, expected: outerByJoin[angle], tolerance: 30 });
  }
  for (const angle of [22.5, 67.5, 112.5, 157.5]) {
    probes.push({
      type: "radial",
      radius: 99.5,
      angle,
      expected: outerByMidpoint[angle],
      alternateExpected: innerByMidpoint[angle],
      tolerance: 30,
    });
  }
  probes.push({
    type: "wedge",
    radius: 71.3,
    angle: 22.5,
    expected: [0x1F, 0x87, 0xCE],
    alternateExpected: [0x4D, 0xB6, 0xE9],
    tolerance: 60,
  });

  const results = probes.map((probe) => {
    const [x, y] = point(probe.radius, probe.angle, scale);
    const rgba = pixelAt(png, x, y);
    const distances = [probe.expected, probe.alternateExpected].filter(Boolean).map((expected) => distance(rgba, expected));
    const nearestExpectedDistance = Math.min(...distances);
    return {
      ...probe,
      rgba,
      nearestExpectedDistance: Number(nearestExpectedDistance.toFixed(2)),
      passed: rgba[3] === 255 && nearestExpectedDistance <= probe.tolerance,
    };
  });
  return { passed: results.every((probe) => probe.passed), probes: results };
}

const fixtures = [];
for (const width of [180, 600]) {
  for (const dpr of [1, 2, 3]) fixtures.push({ width, dpr });
}

const reducedAndStatic = await Promise.all(fixtures.map(async ({ width, dpr }) => {
  const [runtime, still] = await Promise.all([
    render({ width, dpr, mode: "reduced-final" }),
    render({ width, dpr, mode: "static" }),
  ]);
  return {
    width,
    dpr,
    runtimeStaticParity: compare(runtime, still),
    seamInspection: width === 600 ? inspectSeams(runtime, width, dpr) : null,
    runtime,
  };
}));

const animatedFinal = [];
const settledFinal = [];
for (const dpr of [1, 2, 3]) {
  // Run animated fixtures sequentially so browser background-page throttling cannot pause a timeline.
  const animated = await render({ width: 300, dpr, mode: "animated-final" });
  const settled = await render({ width: 300, dpr, mode: "settled-final" });
  const reduced = await render({ width: 300, dpr, mode: "reduced-final" });
  animatedFinal.push({
    width: 300,
    dpr,
    animatedReducedPerceptualParityAfterAnimationsFinish: compare(animated, reduced, 2, 0.02),
    animatedSeamInspection: inspectSeams(animated, 300, dpr),
  });
  settledFinal.push({
    width: 300,
    dpr,
    settledRuntimeStaticParityAt2050Ms: compare(settled, reduced),
    settledSeamInspection: inspectSeams(settled, 300, dpr),
  });
}

await browser.close();

const cases = reducedAndStatic.map(({ runtime, ...record }) => record).concat(animatedFinal, settledFinal);
const failed = cases.filter((record) => {
  const checks = Object.values(record).filter((value) => value && typeof value === "object" && "passed" in value);
  return checks.some((check) => !check.passed);
});
const report = {
  schemaVersion: "motif-library-logo-full-visual-qa/1.0",
  executedAt: new Date().toISOString(),
  artifactRelease: "1.1.2",
  browser: "system Google Chrome through Playwright",
  fixtureMatrix: "Widths 180/600 at DPR 1/2/3 for runtime/static parity and seam probes; animated held final after all authored animations finish versus reduced-motion final at width 300 and DPR 1/2/3; preview-style settle at 2050 ms versus the stable final state at width 300 and DPR 1/2/3.",
  evidenceBoundary: "This verifies the byte-exact owner-supplied runtime's angular, radial, and wedge joins resolve to the expected segment-region colours, so neither Brand Blue underlay nor white fixture background can pass as a seam. Reduced-motion runtime, static SVG, and the preview-style 2050 ms settled state are exact within two 8-bit channel values. The held animated state permits at most 2% edge pixels to differ because an animation-fill compositing layer can anti-alias the same vector edge differently; expected-colour seam probes must still pass. It does not claim pixel identity to the official master lockup.",
  cases,
  status: failed.length ? "failed" : "passed",
};
fs.writeFileSync(path.join(root, "governance/logo-full-visual-qa.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failed.length) {
  console.error(`FAILED: ${failed.length} of ${cases.length} logo-full visual fixtures.`);
  process.exit(1);
}
console.log(`PASS: ${cases.length} logo-full visual fixtures across DPR 1/2/3.`);
