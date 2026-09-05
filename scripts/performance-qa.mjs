import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "..");

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
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
const failedResponses = [];
page.on("response", (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});

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

const cold = await capture("cold_visit", () => page.goto(`${siteBase}/`, { waitUntil: "networkidle" }));
const repeat = await capture("repeat_visit", () => page.reload({ waitUntil: "networkidle" }));
await browser.close();
await new Promise((resolve) => server.close(resolve));

const checks = [
  { name: "zero failed HTTP responses", passed: failedResponses.length === 0, detail: failedResponses },
  { name: "no duplicate resource URLs on cold visit", passed: cold.duplicateUrls.length === 0, detail: cold.duplicateUrls },
  { name: "no duplicate resource URLs on repeat visit", passed: repeat.duplicateUrls.length === 0, detail: repeat.duplicateUrls },
  { name: "local CLS at or below 0.1", passed: cold.timing.cumulativeLayoutShift <= 0.1, detail: cold.timing.cumulativeLayoutShift },
  { name: "local LCP observer returned a value", passed: cold.timing.largestContentfulPaintMs > 0, detail: cold.timing.largestContentfulPaintMs },
  { name: "repeat visit reuses at least one cache-eligible response", passed: repeat.zeroTransferResourceCount > 0, detail: repeat.zeroTransferResourceCount },
];
const failed = checks.filter((check) => !check.passed);
const report = {
  schemaVersion: "motif-library-performance-qa/1.0",
  executedAt: new Date().toISOString(),
  artifactRelease: "1.1.3",
  artifactRoot: ".",
  browser: await Promise.resolve(browser.version?.()).catch(() => null),
  route: "/motif/",
  evidenceBoundary: "Local synthetic timing is diagnostic evidence only. It is not field p75 Core Web Vitals and does not predict GitHub Pages or end-user network performance.",
  paintRisk: "bounded gradients, finite/state-bound production recommendations, and one user-opened dialog-local inspection replay: 3000 ms by default, with logo settled at 2050 ms and held until 5000 ms; pause/visibility cleanup remains active, with no external runtime, analytics, video, blur-heavy full-screen animation, or page-level permanent polling",
  cold,
  repeat,
  checks,
  status: failed.length ? "failed" : "passed_local_synthetic_profile",
};
fs.writeFileSync(path.join(root, "governance/performance-qa.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failed.length) {
  console.error(`FAILED: ${failed.length} of ${checks.length} local performance checks failed.`);
  for (const check of failed) console.error(`- ${check.name}: ${JSON.stringify(check.detail)}`);
  process.exit(1);
}
console.log(`PASS: ${checks.length} local synthetic performance/loading checks. Cold ${cold.requestCount} requests / ${cold.transferBytes} transfer bytes; repeat ${repeat.zeroTransferResourceCount} zero-transfer cache hits.`);
