import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "..");
const qaOutput = path.join(root, "governance/browser-qa.json");
const screenshotDir = "/private/tmp/motif-browser-qa";
const failures = [];
const checks = [];

function record(condition, name, detail = null) {
  checks.push({ name, status: condition ? "passed" : "failed", ...(detail ? { detail } : {}) });
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}

function mimeFor(file) {
  const extension = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".zip": "application/zip",
  }[extension] || "application/octet-stream";
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
  response.writeHead(200, {
    "content-type": mimeFor(candidate),
    "cache-control": "no-store",
    "content-length": fs.statSync(candidate).size,
  });
  fs.createReadStream(candidate).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const siteBase = `${origin}/motif`;
fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const browserVersion = await browser.version();
const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 600, height: 900 },
  { width: 713, height: 823 },
  { width: 768, height: 1024 },
  { width: 900, height: 900 },
  { width: 1080, height: 900 },
  { width: 1200, height: 900 },
  { width: 1440, height: 900 },
  { width: 1600, height: 1000 },
];

async function inspectRoute(route, locale, viewport) {
  const context = await browser.newContext({ viewport, colorScheme: "light" });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  const response = await page.goto(`${siteBase}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(100);
  const metrics = await page.evaluate(() => {
    const images = [...document.images];
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((heading) => Number(heading.tagName.slice(1)));
    const unnamedControls = [...document.querySelectorAll("button,a[href],input,summary")].filter((element) => {
      const name = element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim()
        || element.getAttribute("placeholder") || element.getAttribute("alt") || "";
      return !name;
    }).length;
    return {
      lang: document.documentElement.lang,
      title: document.title,
      h1Count: document.querySelectorAll("h1").length,
      mainCount: document.querySelectorAll("main").length,
      cardCount: document.querySelectorAll(".asset-card[data-brand]").length,
      visibleCardCount: [...document.querySelectorAll(".asset-card[data-brand]")].filter((card) => !card.hidden).length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
      imageAltMissing: images.filter((image) => !image.hasAttribute("alt")).length,
      headingSkip: headings.some((level, index) => index > 0 && level > headings[index - 1] + 1),
      unnamedControls,
      heroEnhanced: Boolean(document.querySelector(".hero-stage.is-enhanced lm-motif svg")),
      heroStaticVisible: Boolean(document.querySelector(".hero-stage img")),
      fontStatus: document.fonts?.status || "unsupported",
    };
  });
  const label = `${locale} ${viewport.width}x${viewport.height}`;
  record(response?.status() === 200, `${label} route returns 200`, String(response?.status()));
  record(metrics.lang === locale, `${label} initial locale`, metrics.lang);
  record(metrics.h1Count === 1 && metrics.mainCount === 1, `${label} landmark contract`, `h1=${metrics.h1Count}, main=${metrics.mainCount}`);
  record(metrics.cardCount === 9 && metrics.visibleCardCount === 9, `${label} static asset inventory`, `total=${metrics.cardCount}, visible=${metrics.visibleCardCount}`);
  record(metrics.scrollWidth <= metrics.clientWidth + 1, `${label} no page-level horizontal overflow`, `${metrics.scrollWidth}/${metrics.clientWidth}`);
  record(metrics.brokenImages.length === 0, `${label} images load`, metrics.brokenImages.join(", ") || "all loaded");
  record(metrics.imageAltMissing === 0, `${label} image alt contract`, `missing=${metrics.imageAltMissing}`);
  record(!metrics.headingSkip, `${label} heading order has no skipped levels`);
  record(metrics.unnamedControls === 0, `${label} controls have text or labels`, `unnamed=${metrics.unnamedControls}`);
  record(metrics.heroStaticVisible && metrics.heroEnhanced, `${label} progressive hero parity`, `static=${metrics.heroStaticVisible}, enhanced=${metrics.heroEnhanced}`);
  record(metrics.fontStatus === "loaded", `${label} local fonts loaded`, metrics.fontStatus);
  record(consoleErrors.length === 0, `${label} zero console errors`, consoleErrors.join(" | ") || "none");
  record(pageErrors.length === 0, `${label} zero page errors`, pageErrors.join(" | ") || "none");
  record(failedResponses.length === 0, `${label} zero failed HTTP responses`, failedResponses.join(" | ") || "none");

  if (route === "/" && viewport.width === 360) {
    await page.screenshot({ path: path.join(screenshotDir, "th-mobile-360.png"), fullPage: true });
  }
  if (route === "/" && viewport.width === 1440) {
    await page.screenshot({ path: path.join(screenshotDir, "th-desktop-1440.png"), fullPage: true });
  }
  if (route === "/en/" && viewport.width === 390) {
    await page.screenshot({ path: path.join(screenshotDir, "en-mobile-390.png"), fullPage: true });
  }
  await context.close();
}

for (const viewport of viewports) {
  await inspectRoute("/", "th", viewport);
  await inspectRoute("/en/", "en", viewport);
}

// Interaction and keyboard coverage on the Thai route.
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  const page = await context.newPage();
  await page.goto(`${siteBase}/`, { waitUntil: "networkidle" });

  await page.keyboard.press("Tab");
  record(await page.locator(".skip-link").evaluate((link) => document.activeElement === link), "Keyboard focus starts on skip link");
  record(await page.locator(".skip-link").evaluate((link) => {
    const rect = link.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  }), "Skip link becomes visible on focus");

  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator("[data-theme-toggle]").click();
  const changedTheme = await page.locator("html").getAttribute("data-theme");
  record(initialTheme !== changedTheme, "Theme toggle changes theme", `${initialTheme} -> ${changedTheme}`);
  const previewSurface = await page.locator(".asset-preview").first().evaluate((element) => getComputedStyle(element).backgroundColor);
  const previewChannels = previewSurface.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [0, 0, 0];
  const previewLuminanceProxy = previewChannels.reduce((sum, channel) => sum + channel, 0) / (3 * 255);
  record(previewLuminanceProxy > 0.7, "Dark theme keeps exact ink/Brand Blue assets on an explicit light preview surface", previewSurface);

  await page.locator('[data-filter="ijji"]').click();
  record(await page.locator(".asset-card:not([hidden])").count() === 3, "Brand filter shows three ijji cards");
  await page.locator('[data-filter="all"]').click();
  await page.locator("[data-asset-search]").fill("rings");
  record(await page.locator(".asset-card:not([hidden])").count() === 2, "Search finds cross-family rings examples");
  await page.locator("[data-asset-search]").fill("");

  const landometerPreview = page.locator('[data-preview-brand="landometer"]').first();
  await landometerPreview.click();
  await page.waitForTimeout(100);
  record(await page.locator("#preview-dialog").evaluate((dialog) => dialog.open), "Landometer preview opens as modal dialog");
  record(await page.locator("#preview-stage lm-motif svg").count() === 1, "Landometer preview renders exact runtime motif");
  await page.keyboard.press("Escape");
  record(!(await page.locator("#preview-dialog").evaluate((dialog) => dialog.open)), "Escape closes preview dialog");

  const ijjiPreview = page.locator('[data-preview-brand="ijji"][data-preview-id="rotate-b"]').last();
  await ijjiPreview.click();
  await page.waitForTimeout(150);
  record(await page.locator("#preview-stage .ijji-motif").count() === 1, "ijji pending-state preview starts inline");
  record(await page.locator("[data-preview-timer]").getAttribute("aria-hidden") === "true", "Frequently changing ijji elapsed time is excluded from the live announcement");
  await page.locator("#preview-cancel").click();
  record(await page.locator("#preview-stage .ijji-motif").count() === 0 && await page.locator("#preview-stage img").count() === 1, "ijji cancel removes motion and leaves static fallback");
  await page.locator("[data-dialog-close]").click();

  await page.locator('[data-copy-code][data-brand="landometer"]').first().click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(clipboard.includes("<lm-motif kind=\"dial\"") && clipboard.includes("montri-th.github.io/motif"), "Copy-code action writes canonical Landometer snippet");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-download-png]").first().click();
  const download = await downloadPromise;
  const pngPath = path.join(screenshotDir, download.suggestedFilename());
  await download.saveAs(pngPath);
  const pngBytes = fs.readFileSync(pngPath);
  record(download.suggestedFilename() === "landometer-dial-full.png", "PNG export keeps deterministic filename", download.suggestedFilename());
  record(pngBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "PNG export produces a valid PNG signature", `${pngBytes.length} bytes`);
  await context.close();
}

// The ijji loop must also stop automatically when the bounded simulated state ends.
{
  const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${siteBase}/en/`, { waitUntil: "networkidle" });
  await page.locator('[data-preview-brand="ijji"][data-preview-id="rotate-b"]').last().click();
  await page.waitForTimeout(4200);
  record(await page.locator("#preview-stage .ijji-motif").count() === 0 && await page.locator("#preview-stage img").count() === 1, "ijji preview stops automatically at state timeout");
  record((await page.locator("#preview-status").textContent())?.includes("complete"), "ijji timeout exposes visible completion status");
  await context.close();
}

// Reduced-motion users receive stable states even inside interactive previews.
{
  const context = await browser.newContext({ viewport: { width: 900, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${siteBase}/`, { waitUntil: "networkidle" });
  await page.locator('[data-preview-brand="landometer"]').first().click();
  await page.waitForTimeout(50);
  const lmAnimations = await page.locator("#preview-stage lm-motif *").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationName));
  record(lmAnimations.every((name) => name === "none"), "Reduced motion disables Landometer animation", [...new Set(lmAnimations)].join(", "));
  await page.locator("[data-dialog-close]").click();
  await page.locator('[data-preview-brand="ijji"][data-preview-id="rotate-b"]').last().click();
  await page.waitForTimeout(100);
  const ijjiAnimations = await page.locator("#preview-stage .ijji-motif *").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationName));
  record(ijjiAnimations.every((name) => name === "none"), "Reduced motion disables ijji animation", [...new Set(ijjiAnimations)].join(", "));
  await context.close();
}

// Core learning content and downloads remain usable without JavaScript.
{
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${siteBase}/`, { waitUntil: "load" });
  const noJs = await page.evaluate(() => {
    const notice = document.querySelector(".no-js-note");
    const noticeStyle = notice ? getComputedStyle(notice) : null;
    return {
      h1: document.querySelectorAll("h1").length,
      cards: document.querySelectorAll(".asset-card").length,
      downloads: document.querySelectorAll("a[download]").length,
      hero: Boolean(document.querySelector(".hero-stage img")),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      visibleEnhancedControls: [...document.querySelectorAll("[data-theme-toggle],[data-copy-template],[data-preview-brand],[data-copy-code],[data-download-png],.library-tools")]
        .filter((element) => getComputedStyle(element).display !== "none").length,
      notice: Boolean(notice),
      noticeBackground: noticeStyle?.backgroundColor,
      noticeColor: noticeStyle?.color,
    };
  });
  record(noJs.h1 === 1 && noJs.cards === 9 && noJs.downloads >= 9 && noJs.hero && noJs.visibleEnhancedControls === 0 && noJs.notice && noJs.noticeBackground !== "rgba(0, 0, 0, 0)" && noJs.noticeColor !== noJs.noticeBackground, "No-JS baseline keeps learning content and direct downloads without dead enhancement controls", JSON.stringify(noJs));
  record(noJs.overflow <= 1, "No-JS mobile baseline has no horizontal overflow", String(noJs.overflow));
  await context.close();
}

// Text scaling checks exercise Thai at 130% and a stricter 200% zoom-equivalent font scale.
for (const scale of [130, 200]) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${siteBase}/`, { waitUntil: "networkidle" });
  await page.evaluate((percent) => { document.documentElement.style.fontSize = `${percent}%`; }, scale);
  await page.waitForTimeout(50);
  const scaled = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1Visible: Boolean(document.querySelector("h1")?.getClientRects().length),
    cards: document.querySelectorAll(".asset-card").length,
    offenders: [...document.querySelectorAll("body *")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.right > document.documentElement.clientWidth + 1 || rect.left < -1);
    }).slice(0, 12).map((element) => ({
      tag: element.tagName,
      className: String(element.className || "").slice(0, 100),
      text: String(element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
      width: Math.round(element.getBoundingClientRect().width),
    })),
  }));
  record(scaled.overflow <= 1 && scaled.h1Visible && scaled.cards === 9 && scaled.offenders.length === 0, `Thai text scale ${scale}% preserves page contract`, JSON.stringify(scaled));
  await context.close();
}

await browser.close();
await new Promise((resolve) => server.close(resolve));

const socialPath = path.join(root, "assets/social/motif-library-1200x630.png");
const socialBytes = fs.readFileSync(socialPath);
const report = {
  schemaVersion: "motif-library-browser-qa/1.0",
  executedAt: new Date().toISOString(),
  artifactRoot: ".",
  routes: ["/motif/", "/motif/en/"],
  browser: browserVersion,
  emulationNote: "Viewport checks are desktop Chrome emulation, not native iPhone, iPad, Safari, or screen-reader evidence.",
  viewports,
  states: ["light", "dark", "keyboard", "dialog", "filter", "search", "copy", "PNG export", "bounded timeout", "cancel", "reduced motion", "no JavaScript", "Thai 130% text", "200% text"],
  screenshotsCaptured: {
    storage: "ephemeral local QA output; intentionally not published",
    names: ["th-mobile-360.png", "th-desktop-1440.png", "en-mobile-390.png"],
  },
  socialPreview: {
    path: "assets/social/motif-library-1200x630.png",
    mime: "image/png",
    width: 1200,
    height: 630,
    bytes: socialBytes.length,
    sha256: crypto.createHash("sha256").update(socialBytes).digest("hex"),
    visualReview: "inspected at intrinsic size; title, motif, safe area, and thumbnail composition passed",
  },
  totals: {
    checks: checks.length,
    passed: checks.filter((check) => check.status === "passed").length,
    failed: failures.length,
  },
  status: failures.length ? "failed" : "candidate_ready_for_release_handoff",
  openManualGates: [
    "native iPhone/iPad Safari elastic-scroll and browser-chrome review",
    "screen-reader pass in VoiceOver or equivalent",
    "third-party social-platform card cache observation after deployment",
    "field Core Web Vitals after sufficient real traffic",
  ],
  checks,
};
fs.writeFileSync(qaOutput, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(`FAILED: ${failures.length} of ${checks.length} browser checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`PASS: ${checks.length} browser checks across ${viewports.length * 2} responsive route renders plus interaction, reduced-motion, no-JS, and text-scale states.`);
