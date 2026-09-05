import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "..");
const shouldWriteReport = process.env.MOTIF_QA_WRITE !== "0";
const siteRuntime = fs.readFileSync(path.join(root, "site.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ijjiRuntime = fs.readFileSync(path.join(root, "assets/ijji/logo-sting/ijji-logo-sting.js"), "utf8");

function mimeFor(file) {
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
  }[path.extname(file).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const relative = pathname.replace(/^\/motif\/?/, "").replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  if (!candidate.startsWith(`${root}${path.sep}`) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const isHtml = path.extname(candidate).toLowerCase() === ".html";
  response.writeHead(200, {
    "content-type": mimeFor(candidate),
    "content-length": fs.statSync(candidate).size,
    "cache-control": isHtml ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(candidate).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const siteBase = `${origin}/motif`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let browser;
let browserVersion = null;
let cold;
let repeat;
let inspection;
const failedResponses = [];

try {
  browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}),
  });
  browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await context.addInitScript(() => {
    window.__motifPerf = { lcpMs: 0, cls: 0, longTaskMs: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__motifPerf.lcpMs = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__motifPerf.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__motifPerf.longTaskMs += entry.duration;
      }).observe({ type: "longtask", buffered: true });
    } catch (_) {}
  });

  const page = await context.newPage();
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => failedResponses.push(`FAILED ${request.url()} ${request.failure()?.errorText || ""}`));

  async function capture(label, action) {
    await action();
    await page.waitForTimeout(250);
    return page.evaluate((visitLabel) => {
      const resources = performance.getEntriesByType("resource");
      const navigation = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      const counts = new Map();
      for (const entry of resources) counts.set(entry.name, (counts.get(entry.name) || 0) + 1);
      return {
        label: visitLabel,
        profile: "local system Chrome, 1440x900, loopback HTTP, no network throttling",
        requestCount: resources.length + 1,
        resourceCount: resources.length,
        transferBytes: Math.round((navigation?.transferSize || 0) + resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)),
        decodedBodyBytes: Math.round((navigation?.decodedBodySize || 0) + resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0)),
        cacheEligibleResourceCount: resources.filter((entry) => entry.decodedBodySize > 0).length,
        zeroTransferResourceCount: resources.filter((entry) => entry.decodedBodySize > 0 && entry.transferSize === 0).length,
        duplicateUrls: [...counts].filter(([, count]) => count > 1).map(([url, count]) => ({ url, count })),
        timing: {
          responseEndMs: Math.round(navigation?.responseEnd || 0),
          domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd || 0),
          loadMs: Math.round(navigation?.loadEventEnd || 0),
          firstContentfulPaintMs: Math.round(paint?.startTime || 0),
          largestContentfulPaintMs: Math.round(window.__motifPerf?.lcpMs || 0),
          cumulativeLayoutShift: Number((window.__motifPerf?.cls || 0).toFixed(4)),
          longTaskMs: Math.round(window.__motifPerf?.longTaskMs || 0),
        },
      };
    }, label);
  }

  cold = await capture("cold_visit", () => page.goto(`${siteBase}/`, { waitUntil: "networkidle" }));
  repeat = await capture("repeat_visit", () => page.reload({ waitUntil: "networkidle" }));

  const lazyBefore = await page.evaluate(() => ({
    logoComponents: document.querySelectorAll("ijji-logo-sting").length,
    landometerComponents: document.querySelectorAll("lm-motif").length,
    logoRuntimeRequests: performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/assets/ijji/logo-sting/ijji-logo-sting.js")).length,
  }));

  async function closePreviewDialog() {
    await page.evaluate(() => document.querySelector("#preview-dialog").close());
    await page.waitForFunction(() => {
      const dialog = document.querySelector("#preview-dialog");
      return !dialog.open && !dialog.querySelector("#preview-stage > *");
    });
  }

  await page.locator('[data-preview-brand="landometer"][data-preview-id="logo"]').click();
  await page.waitForSelector("#preview-dialog[open] lm-motif");
  const landometerDialog = await page.evaluate(() => {
    const dialog = document.querySelector("#preview-dialog");
    const motifs = [...dialog.querySelectorAll("lm-motif")];
    return {
      open: dialog.open,
      motifCount: motifs.length,
      playingCount: motifs.filter((motif) => motif.hasAttribute("data-play")).length,
      fullInk: motifs.find((motif) => !motif.hasAttribute("quiet"))?.getAttribute("ink"),
      fullInlineWedge: motifs.find((motif) => !motif.hasAttribute("quiet"))?.style.getPropertyValue("--lm-wedge"),
      dialogLocalCount: dialog.querySelectorAll("lm-motif").length,
      documentCount: document.querySelectorAll("lm-motif").length,
    };
  });
  await closePreviewDialog();

  async function inspectIjjiDialog(id) {
    await page.locator(`[data-preview-brand="ijji-logo"][data-preview-id="${id}"]`).click();
    await page.waitForFunction((previewId) => {
      const logo = document.querySelector("#preview-dialog[open] ijji-logo-sting");
      return Boolean(logo && logo.hasAttribute("loop") && (previewId !== "mark" || logo.hasAttribute("notagline")));
    }, id);
    const record = await page.evaluate(() => {
      const dialog = document.querySelector("#preview-dialog");
      const logo = dialog.querySelector("ijji-logo-sting");
      return {
        open: dialog.open,
        duration: logo.duration,
        currentTime: logo.currentTime,
        manual: logo.hasAttribute("manual"),
        loop: logo.hasAttribute("loop"),
        notagline: logo.hasAttribute("notagline"),
        surface: logo.getAttribute("surface"),
        dialogLocalCount: dialog.querySelectorAll("ijji-logo-sting").length,
        documentCount: document.querySelectorAll("ijji-logo-sting").length,
      };
    });
    await closePreviewDialog();
    return record;
  }

  const ijjiFullDialog = await inspectIjjiDialog("tagline");
  const afterFullClose = await page.evaluate(() => ({
    dialogOpen: document.querySelector("#preview-dialog").open,
    logoComponents: document.querySelectorAll("ijji-logo-sting").length,
  }));
  const ijjiMarkDialog = await inspectIjjiDialog("mark");
  const afterAllClose = await page.evaluate(() => ({
    dialogOpen: document.querySelector("#preview-dialog").open,
    logoComponents: document.querySelectorAll("ijji-logo-sting").length,
    landometerComponents: document.querySelectorAll("lm-motif").length,
    logoRuntimeRequests: performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/assets/ijji/logo-sting/ijji-logo-sting.js")).length,
    uniqueLogoLayerRequests: new Set(performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/assets/ijji/logo-sting/layers/"))
      .map((entry) => entry.name)).size,
  }));

  inspection = {
    timingContract: {
      landometerLogoSettleMs: 3400,
      landometerLogoReplayMs: 6000,
      ijjiFullDurationMs: 9000,
      ijjiMarkDurationMs: 6400,
      ijjiRuntimeHoldThenLoopGapMs: 400,
    },
    lazyBefore,
    landometerDialog,
    ijjiFullDialog,
    afterFullClose,
    ijjiMarkDialog,
    afterAllClose,
  };
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const landometerTimingSourceExact = /const landometerLogoReplayMs = 6000;/.test(siteRuntime)
  && /const landometerLogoSettleMs = 3400;/.test(siteRuntime)
  && /previewConfig\.id === "logo" \? landometerLogoReplayMs : landometerDefaultReplayMs/.test(siteRuntime);
const ijjiTimingSourceExact = /var T = \{ hop: 0, bodies: 2\.7, tagline: 4\.2, hello: 6\.1, hold: 7\.6, end: 9 \};/.test(ijjiRuntime)
  && /var T_MARK = \{ hop: 0, bodies: 2\.7, tagline: 1e9, hello: 4\.2, hold: 5\.7, end: 6\.4 \};/.test(ijjiRuntime)
  && /setTimeout\(function \(\) \{ if \(self\.isConnected && self\.hasAttribute\('loop'\)\) self\.replay\(\); \}, 400\);/.test(ijjiRuntime)
  && indexHtml.includes('data-preview-id="tagline" data-duration="9"')
  && indexHtml.includes('data-preview-id="mark" data-duration="6.4"');
const dialogReplaySourceBounded = siteRuntime.includes('previewConfig?.brand !== "landometer"')
  && siteRuntime.includes('previewConfig?.brand !== "ijji-logo"')
  && (siteRuntime.match(/!dialog\?\.open/g) || []).length >= 2
  && (siteRuntime.match(/document\.visibilityState !== "visible"/g) || []).length >= 2
  && (siteRuntime.match(/reducedMotionPreference\?\.matches/g) || []).length >= 2
  && siteRuntime.includes('dialog?.addEventListener("close"')
  && siteRuntime.includes('window.addEventListener("pagehide"')
  && siteRuntime.includes("stopIjjiLogoAutoreplay({ finish: false })")
  && siteRuntime.includes("stopLandometerAutoreplay();");

const checks = [
  { name: "zero failed HTTP responses", passed: failedResponses.length === 0, detail: failedResponses },
  { name: "no duplicate resource URLs on cold visit", passed: cold.duplicateUrls.length === 0, detail: cold.duplicateUrls },
  { name: "no duplicate resource URLs on repeat visit", passed: repeat.duplicateUrls.length === 0, detail: repeat.duplicateUrls },
  { name: "local CLS at or below 0.1", passed: cold.timing.cumulativeLayoutShift <= 0.1, detail: cold.timing.cumulativeLayoutShift },
  { name: "local LCP observer returned a value", passed: cold.timing.largestContentfulPaintMs > 0, detail: cold.timing.largestContentfulPaintMs },
  { name: "repeat visit reuses at least one cache-eligible response", passed: repeat.zeroTransferResourceCount > 0, detail: repeat.zeroTransferResourceCount },
  {
    name: "Landometer logo inspection uses the 3400 ms settle and 6000 ms replay contract",
    passed: landometerTimingSourceExact
      && inspection.landometerDialog.open
      && inspection.landometerDialog.motifCount === 2
      && inspection.landometerDialog.playingCount === 2
      && inspection.landometerDialog.fullInk === "blue"
      && inspection.landometerDialog.fullInlineWedge === "",
    detail: { sourceExact: landometerTimingSourceExact, dialog: inspection.landometerDialog },
  },
  {
    name: "ijji source and preview cards preserve the 9000 ms full and 6400 ms mark-only timelines",
    passed: ijjiTimingSourceExact
      && inspection.ijjiFullDialog.duration === 9
      && inspection.ijjiMarkDialog.duration === 6.4,
    detail: { sourceExact: ijjiTimingSourceExact, full: inspection.ijjiFullDialog, mark: inspection.ijjiMarkDialog },
  },
  {
    name: "logo replay is an explicit dialog-only inspection aid with visibility, reduced-motion, close, and pagehide bounds",
    passed: dialogReplaySourceBounded
      && inspection.landometerDialog.dialogLocalCount === 2
      && inspection.landometerDialog.documentCount === inspection.lazyBefore.landometerComponents + 2
      && inspection.ijjiFullDialog.dialogLocalCount === 1
      && inspection.ijjiFullDialog.documentCount === inspection.lazyBefore.logoComponents + 1
      && inspection.ijjiMarkDialog.dialogLocalCount === 1
      && inspection.ijjiMarkDialog.documentCount === inspection.lazyBefore.logoComponents + 1,
    detail: { sourceBounded: dialogReplaySourceBounded, inspection },
  },
  {
    name: "ijji identity runtime is lazy, loaded once, and never leaves a playing component after dialog close",
    passed: inspection.lazyBefore.logoComponents === 0
      && inspection.lazyBefore.logoRuntimeRequests === 0
      && inspection.ijjiFullDialog.manual
      && inspection.ijjiFullDialog.loop
      && inspection.ijjiFullDialog.surface === "brand-blue"
      && !inspection.ijjiFullDialog.notagline
      && inspection.ijjiMarkDialog.manual
      && inspection.ijjiMarkDialog.loop
      && inspection.ijjiMarkDialog.notagline
      && inspection.afterFullClose.logoComponents === 0
      && inspection.afterAllClose.logoComponents === 0
      && inspection.afterAllClose.landometerComponents === inspection.lazyBefore.landometerComponents
      && inspection.afterAllClose.logoRuntimeRequests === 1,
    detail: inspection,
  },
];
const failed = checks.filter((check) => !check.passed);
const report = {
  schemaVersion: "motif-library-performance-qa/1.1",
  executedAt: new Date().toISOString(),
  artifactRelease: "1.2.0",
  artifactRoot: ".",
  browser: browserVersion,
  route: "/motif/",
  evidenceBoundary: "Local synthetic timing is diagnostic evidence only. It is not field p75 Core Web Vitals and does not predict GitHub Pages or end-user network performance. Motion checks attest lifecycle scope and source timing; they do not replace audience-view visual QA.",
  paintRisk: "bounded gradients, finite-once production snippets, and user-opened dialog-local inspection replay only. Landometer logo full/quiet finish by 2870/3360 ms, are settled at 3400 ms, hold, and replay at 6000 ms. ijji full runs 9000 ms and mark-only 6400 ms, then the exact runtime adds a 400 ms dialog-loop gap. Dialog close, hidden-page, pagehide, and reduced-motion paths stop or suppress replay; ijji identity runtime and layers load lazily only after Preview is opened.",
  inspection,
  cold,
  repeat,
  checks,
  status: failed.length ? "failed" : "passed_local_synthetic_profile",
};

if (shouldWriteReport) {
  fs.writeFileSync(path.join(root, "governance/performance-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
}

if (failed.length) {
  console.error(`FAILED: ${failed.length} of ${checks.length} local performance checks failed.`);
  for (const check of failed) console.error(`- ${check.name}: ${JSON.stringify(check.detail)}`);
  process.exit(1);
}
console.log(`PASS: ${checks.length} release 1.2.0 performance/loading checks. Cold ${cold.requestCount} requests / ${cold.transferBytes} transfer bytes; repeat ${repeat.zeroTransferResourceCount} zero-transfer cache hits; report ${shouldWriteReport ? "written" : "not written"}.`);
