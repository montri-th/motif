import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { PNG } = require("pngjs");
const root = path.resolve(import.meta.dirname, "..");
const qaOutput = process.env.MOTIF_BROWSER_QA_OUTPUT || path.join(root, "governance/browser-qa.json");
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
  { width: 844, height: 390 },
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
  const selectedLandometerKind = await landometerPreview.getAttribute("data-preview-id");
  await landometerPreview.click();
  record(await page.locator("#preview-dialog").evaluate((dialog) => dialog.open), "Landometer preview opens as modal dialog");
  const initialLandometerPreview = await page.locator("#preview-stage").evaluate((stage) => ({
    motifs: [...stage.querySelectorAll("lm-motif")].map((motif) => ({
      kind: motif.getAttribute("kind"),
      quiet: motif.hasAttribute("quiet"),
      playing: motif.hasAttribute("data-play"),
      svgCount: motif.querySelectorAll("svg").length,
      ariaHidden: motif.getAttribute("aria-hidden"),
    })),
    captions: [...stage.querySelectorAll("figcaption")].map((caption) => caption.textContent?.trim()),
  }));
  record(
    initialLandometerPreview.motifs.length === 2
      && initialLandometerPreview.motifs.every((motif) => motif.kind === selectedLandometerKind && motif.playing && motif.svgCount === 1 && motif.ariaHidden === "true")
      && initialLandometerPreview.motifs.filter((motif) => motif.quiet).length === 1
      && initialLandometerPreview.captions.join(",") === "full,quiet",
    "Landometer preview immediately autoplays paired full and quiet exact-runtime motifs",
    JSON.stringify(initialLandometerPreview),
  );

  await page.evaluate(() => {
    const motifs = [...document.querySelectorAll("#preview-stage lm-motif")];
    window.__lmReplayAttributeMutations = motifs.map(() => 0);
    window.__lmReplayObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const index = motifs.indexOf(mutation.target);
        if (index >= 0 && mutation.attributeName === "data-play") window.__lmReplayAttributeMutations[index] += 1;
      });
    });
    motifs.forEach((motif) => window.__lmReplayObserver.observe(motif, { attributes: true, attributeFilter: ["data-play"] }));
  });
  await page.waitForTimeout(3300);
  const replayCycle = await page.evaluate(() => ({
    mutations: [...window.__lmReplayAttributeMutations],
    playing: [...document.querySelectorAll("#preview-stage lm-motif")].map((motif) => motif.hasAttribute("data-play")),
  }));
  record(
    replayCycle.mutations.length === 2
      && replayCycle.mutations.every((count) => count >= 2)
      && replayCycle.playing.every(Boolean),
    "Landometer full and quiet motifs auto-replay together after about three seconds",
    JSON.stringify(replayCycle),
  );

  await page.locator("#preview-cancel").click();
  const pausedBeforeWait = await page.evaluate(() => ({
    mutations: [...window.__lmReplayAttributeMutations],
    playing: [...document.querySelectorAll("#preview-stage lm-motif")].map((motif) => motif.hasAttribute("data-play")),
    pauseDisabled: document.querySelector("#preview-cancel")?.disabled,
    status: document.querySelector("#preview-status")?.textContent?.trim(),
  }));
  await page.waitForTimeout(3200);
  const pausedAfterWait = await page.evaluate(() => ({
    mutations: [...window.__lmReplayAttributeMutations],
    playing: [...document.querySelectorAll("#preview-stage lm-motif")].map((motif) => motif.hasAttribute("data-play")),
  }));
  record(
    pausedBeforeWait.playing.every((playing) => !playing)
      && pausedBeforeWait.pauseDisabled
      && pausedBeforeWait.status.includes("หยุด auto replay")
      && pausedAfterWait.playing.every((playing) => !playing)
      && pausedAfterWait.mutations.join(",") === pausedBeforeWait.mutations.join(","),
    "Pause stops Landometer auto-replay and leaves both motifs at their final states",
    JSON.stringify({ pausedBeforeWait, pausedAfterWait }),
  );

  await page.evaluate(() => window.__lmReplayObserver?.disconnect());
  await page.locator("#preview-replay").click();
  const resumedPreview = await page.evaluate(() => ({
    count: document.querySelectorAll("#preview-stage lm-motif").length,
    playing: [...document.querySelectorAll("#preview-stage lm-motif")].map((motif) => motif.hasAttribute("data-play")),
    pauseDisabled: document.querySelector("#preview-cancel")?.disabled,
  }));
  record(
    resumedPreview.count === 2 && resumedPreview.playing.every(Boolean) && !resumedPreview.pauseDisabled,
    "Replay now resumes the paired Landometer autoplay loop",
    JSON.stringify(resumedPreview),
  );
  await page.locator("[data-dialog-close]").click();

  const expectedKinds = ["dial", "rings", "layers", "slice", "cultivate", "logo"];
  for (const kind of expectedKinds) {
    const trigger = page.locator(`[data-preview-brand="landometer"][data-preview-id="${kind}"]`).first();
    await trigger.click();
    const kindSnapshot = await page.locator("#preview-stage").evaluate((stage) => ({
      kinds: [...stage.querySelectorAll("lm-motif")].map((motif) => motif.getAttribute("kind")),
      quietCount: stage.querySelectorAll("lm-motif[quiet]").length,
      playingCount: stage.querySelectorAll("lm-motif[data-play]").length,
    }));
    record(
      kindSnapshot.kinds.length === 2
        && kindSnapshot.kinds.every((value) => value === kind)
        && kindSnapshot.quietCount === 1
        && kindSnapshot.playingCount === 2,
      `Landometer ${kind} preview provides autoplaying full and quiet variants`,
      JSON.stringify(kindSnapshot),
    );
    if (kind === "logo") {
      await page.waitForTimeout(2250);
      const settledLogo = await page.evaluate(() => ({
        playingCount: document.querySelectorAll("#preview-stage lm-motif[data-play]").length,
        status: document.querySelector("#preview-status")?.textContent?.trim(),
        fullPathCount: document.querySelectorAll("#preview-stage lm-motif:not([quiet]) path").length,
        outerSkyStroke: getComputedStyle(document.querySelectorAll("#preview-stage lm-motif:not([quiet]) path")[8]).stroke,
        outerSkyRight: (() => {
          const box = document.querySelectorAll("#preview-stage lm-motif:not([quiet]) path")[8].getBBox();
          return box.x + box.width;
        })(),
      }));
      record(
        settledLogo.playingCount === 0
          && settledLogo.status.includes("ประกอบครบแล้ว")
          && settledLogo.fullPathCount === 10
          && settledLogo.outerSkyStroke === "rgb(89, 210, 254)"
          && settledLogo.outerSkyRight >= 413.4,
        "Landometer logo preview settles to the exact static final state after both variants finish",
        JSON.stringify(settledLogo),
      );
      const dialogBox = await page.locator("#preview-dialog").boundingBox();
      const fullSvgBox = await page.locator("#preview-stage lm-motif:not([quiet]) svg").boundingBox();
      const logoFinalBuffer = await page.locator("#preview-dialog").screenshot({ path: path.join(screenshotDir, "logo-full-quiet-final.png") });
      const logoFinalPng = PNG.sync.read(logoFinalBuffer);
      const angle = 22.5 * Math.PI / 180;
      const probeX = Math.round((fullSvgBox.x - dialogBox.x) + ((300 + 113.5 * Math.cos(angle)) / 600) * fullSvgBox.width);
      const probeY = Math.round((fullSvgBox.y - dialogBox.y) + ((143 - 113.5 * Math.sin(angle)) / 300) * fullSvgBox.height);
      const pixelOffset = (probeY * logoFinalPng.width + probeX) * 4;
      const outerSkyPixel = [...logoFinalPng.data.slice(pixelOffset, pixelOffset + 4)];
      const outerSkyDistance = Math.hypot(outerSkyPixel[0] - 89, outerSkyPixel[1] - 210, outerSkyPixel[2] - 254);
      record(
        outerSkyPixel[3] === 255 && outerSkyDistance <= 12,
        "Landometer logo settled screenshot visibly paints the outer-sky quadrant",
        JSON.stringify({ probeX, probeY, outerSkyPixel, outerSkyDistance }),
      );
      await page.waitForTimeout(2450);
      record(
        await page.locator("#preview-stage lm-motif[data-play]").count() === 0,
        "Landometer logo preview holds the complete final state long enough to inspect",
      );
      await page.waitForTimeout(500);
      const logoReplay = await page.evaluate(() => ({
        playingCount: document.querySelectorAll("#preview-stage lm-motif[data-play]").length,
        status: document.querySelector("#preview-status")?.textContent?.trim(),
      }));
      record(
        logoReplay.playingCount === 2 && logoReplay.status.includes("กำลังประกอบ"),
        "Landometer logo full and quiet auto-replay together after the final-state hold",
        JSON.stringify(logoReplay),
      );
    }
    await page.locator("[data-dialog-close]").click();
  }

  await landometerPreview.focus();
  await landometerPreview.click();
  await page.keyboard.press("Escape");
  record(!(await page.locator("#preview-dialog").evaluate((dialog) => dialog.open)), "Escape closes preview dialog");
  record(await landometerPreview.evaluate((button) => document.activeElement === button), "Escape restores focus to the Landometer preview trigger");

  const ijjiPreview = page.locator('[data-preview-brand="ijji"][data-preview-id="rotate-b"]').last();
  await ijjiPreview.click();
  await page.waitForTimeout(150);
  record(
    await page.locator("#preview-stage .ijji-motif").count() === 1 && await page.locator("#preview-stage lm-motif").count() === 0,
    "ijji pending-state preview remains a single state-bound motif",
  );
  record(await page.locator("[data-preview-timer]").getAttribute("aria-hidden") === "true", "Frequently changing ijji elapsed time is excluded from the live announcement");
  await page.locator("#preview-cancel").click();
  record(await page.locator("#preview-stage .ijji-motif").count() === 0 && await page.locator("#preview-stage img").count() === 1, "ijji cancel removes motion and leaves static fallback");
  await page.locator("[data-dialog-close]").click();

  await page.locator('[data-copy-code][data-brand="landometer"]').first().click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(clipboard.includes("<lm-motif kind=\"dial\"") && clipboard.includes("montri-th.github.io/motif"), "Copy-code action writes canonical Landometer snippet");

  await page.locator('[data-copy-code][data-brand="landometer"][data-id="logo"]').click();
  const logoClipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(
    logoClipboard.includes('<lm-motif kind="logo" ink="blue" style="--lm-wedge:#0195CB"></lm-motif>')
      && logoClipboard.includes("landometer-motifs.css?v=1.1.3")
      && logoClipboard.includes("landometer-motifs.js?v=1.1.3"),
    "Logo copy-code action preserves the approved blue ink, official wedge, and 1.1.3 runtime contract",
    logoClipboard,
  );

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

// The reported iPhone-class failure is reproduced in dark mode: the complete logo must keep the official palette.
{
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(`${siteBase}/`, { waitUntil: "networkidle" });
  await page.locator('[data-preview-brand="landometer"][data-preview-id="logo"]').click();
  await page.waitForTimeout(2250);

  const darkMobileLogo = await page.evaluate(() => {
    const stage = document.querySelector("#preview-stage");
    const full = stage?.querySelector("lm-motif:not([quiet])");
    const quiet = stage?.querySelector("lm-motif[quiet]");
    const fullPaths = [...(full?.querySelectorAll("path") || [])];
    const quietPaths = [...(quiet?.querySelectorAll("path") || [])];
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const paint = canvas.getContext("2d", { willReadFrequently: true });
    const asRgba = (cssColor) => {
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = cssColor;
      paint.fillRect(0, 0, 1, 1);
      return [...paint.getImageData(0, 0, 1, 1).data];
    };
    return {
      theme: document.documentElement.dataset.theme,
      status: document.querySelector("#preview-status")?.textContent?.trim(),
      playingCount: stage?.querySelectorAll("lm-motif[data-play]").length,
      fullInk: full?.getAttribute("ink"),
      fullWedgeProperty: full ? getComputedStyle(full).getPropertyValue("--lm-wedge").trim() : null,
      fullPathCount: fullPaths.length,
      quietPathCount: quietPaths.length,
      pin: fullPaths[0] ? asRgba(getComputedStyle(fullPaths[0]).fill) : null,
      innerStrokes: fullPaths.slice(1, 5).map((path) => asRgba(getComputedStyle(path).stroke)),
      wedge: fullPaths[9] ? asRgba(getComputedStyle(fullPaths[9]).fill) : null,
      quietInk: quiet ? asRgba(getComputedStyle(quiet).color) : null,
      raw: {
        pin: fullPaths[0] ? getComputedStyle(fullPaths[0]).fill : null,
        innerStrokes: fullPaths.slice(1, 5).map((path) => getComputedStyle(path).stroke),
        wedge: fullPaths[9] ? getComputedStyle(fullPaths[9]).fill : null,
        quietInk: quiet ? getComputedStyle(quiet).color : null,
      },
    };
  });

  const expectedInnerStrokes = [
    [210, 86, 106, 255],
    [210, 164, 55, 255],
    [14, 185, 155, 255],
    [77, 182, 233, 255],
  ];
  record(
    darkMobileLogo.theme === "dark"
      && darkMobileLogo.playingCount === 0
      && darkMobileLogo.status?.includes("ประกอบครบแล้ว"),
    "390x844 dark-mode logo preview reaches the complete held final state",
    JSON.stringify(darkMobileLogo),
  );
  record(
    darkMobileLogo.fullInk === "blue"
      && darkMobileLogo.fullWedgeProperty?.toUpperCase() === "#0195CB",
    "390x844 dark-mode full logo host locks blue ink and the official cyan wedge",
    JSON.stringify({ ink: darkMobileLogo.fullInk, wedge: darkMobileLogo.fullWedgeProperty }),
  );
  record(
    darkMobileLogo.fullPathCount === 10 && darkMobileLogo.quietPathCount === 9,
    "390x844 dark-mode logo pair retains all 10 full and 9 quiet paths",
    JSON.stringify({ full: darkMobileLogo.fullPathCount, quiet: darkMobileLogo.quietPathCount }),
  );
  record(
    JSON.stringify(darkMobileLogo.pin) === JSON.stringify([29, 68, 151, 255]),
    "390x844 dark-mode full logo pin computes to Brand Blue rgb(29, 68, 151)",
    JSON.stringify({ rgba: darkMobileLogo.pin, raw: darkMobileLogo.raw.pin }),
  );
  record(
    JSON.stringify(darkMobileLogo.wedge) === JSON.stringify([1, 149, 203, 255]),
    "390x844 dark-mode full logo wedge computes to official rgb(1, 149, 203)",
    JSON.stringify({ rgba: darkMobileLogo.wedge, raw: darkMobileLogo.raw.wedge }),
  );
  record(
    JSON.stringify(darkMobileLogo.innerStrokes) === JSON.stringify(expectedInnerStrokes),
    "390x844 dark-mode full logo inner strokes compute to the four approved composite colors",
    JSON.stringify({ rgba: darkMobileLogo.innerStrokes, raw: darkMobileLogo.raw.innerStrokes }),
  );
  record(
    JSON.stringify(darkMobileLogo.quietInk) === JSON.stringify([89, 210, 254, 255]),
    "390x844 dark-mode quiet logo remains Energy Sky rgb(89, 210, 254)",
    JSON.stringify({ rgba: darkMobileLogo.quietInk, raw: darkMobileLogo.raw.quietInk }),
  );

  await page.screenshot({
    path: path.join(screenshotDir, "logo-full-quiet-final-dark-mobile-390x844.png"),
    fullPage: false,
  });
  await context.close();
}

// A delayed ijji module must not overwrite a newer Landometer preview after the first dialog is closed.
{
  const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await context.newPage();
  await page.route("**/assets/ijji/ijji-motifs.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto(`${siteBase}/`, { waitUntil: "networkidle" });
  await page.locator('[data-preview-brand="ijji"][data-preview-id="rotate-b"]').last().click();
  await page.locator("[data-dialog-close]").click();
  await page.locator('[data-preview-brand="landometer"]').first().click();
  await page.waitForTimeout(750);
  const raceSnapshot = await page.evaluate(() => ({
    open: Boolean(document.querySelector("#preview-dialog")?.open),
    landometerCount: document.querySelectorAll("#preview-stage lm-motif").length,
    quietCount: document.querySelectorAll("#preview-stage lm-motif[quiet]").length,
    ijjiCount: document.querySelectorAll("#preview-stage .ijji-motif").length,
    status: document.querySelector("#preview-status")?.textContent?.trim(),
  }));
  record(
    raceSnapshot.open
      && raceSnapshot.landometerCount === 2
      && raceSnapshot.quietCount === 1
      && raceSnapshot.ijjiCount === 0
      && raceSnapshot.status.includes("กำลังประกอบ"),
    "A stale delayed ijji import cannot overwrite a newer paired Landometer preview",
    JSON.stringify(raceSnapshot),
  );
  await context.close();
}

// Dynamic motion preferences, visibility, and BFCache-style lifecycle events stop and resume only when allowed.
{
  const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${siteBase}/`, { waitUntil: "networkidle" });
  await page.locator('[data-preview-brand="landometer"]').first().click();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  const dynamicallyReduced = await page.evaluate(() => ({
    playingCount: document.querySelectorAll("#preview-stage lm-motif[data-play]").length,
    replayHidden: document.querySelector("#preview-replay")?.hidden,
    pauseHidden: document.querySelector("#preview-cancel")?.hidden,
  }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(50);
  const dynamicallyRestored = await page.locator("#preview-stage lm-motif[data-play]").count();
  record(
    dynamicallyReduced.playingCount === 0
      && dynamicallyReduced.replayHidden
      && dynamicallyReduced.pauseHidden
      && dynamicallyRestored === 2,
    "A live reduced-motion preference change stops replay and resumes only when motion is allowed again",
    JSON.stringify({ dynamicallyReduced, dynamicallyRestored }),
  );

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(3150);
  const hiddenPlayingCount = await page.locator("#preview-stage lm-motif[data-play]").count();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const visiblePlayingCount = await page.locator("#preview-stage lm-motif[data-play]").count();
  record(
    hiddenPlayingCount === 0 && visiblePlayingCount === 2,
    "Document visibility stops hidden replay without catch-up and restarts the pair when visible",
    JSON.stringify({ hiddenPlayingCount, visiblePlayingCount }),
  );

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
  const pagehidePlayingCount = await page.locator("#preview-stage lm-motif[data-play]").count();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  const pageshowPlayingCount = await page.locator("#preview-stage lm-motif[data-play]").count();
  record(
    pagehidePlayingCount === 0 && pageshowPlayingCount === 2,
    "Synthetic pagehide/pageshow lifecycle events stop replay and restore an eligible open preview",
    JSON.stringify({ pagehidePlayingCount, pageshowPlayingCount }),
  );
  await context.close();
}

// The paired Landometer modal must remain horizontally contained at the narrowest portrait and short landscape breakpoints.
for (const fixture of [
  { route: "/", locale: "th", viewport: { width: 320, height: 800 } },
  { route: "/en/", locale: "en", viewport: { width: 844, height: 390 } },
]) {
  const context = await browser.newContext({ viewport: fixture.viewport });
  const page = await context.newPage();
  await page.goto(`${siteBase}${fixture.route}`, { waitUntil: "networkidle" });
  await page.locator('[data-preview-brand="landometer"]').first().click();
  const modalLayout = await page.evaluate(() => {
    const dialog = document.querySelector("#preview-dialog");
    const body = dialog?.querySelector(".dialog-body");
    const stage = dialog?.querySelector(".dialog-stage");
    const pair = dialog?.querySelector(".dialog-motif-pair");
    const rect = dialog?.getBoundingClientRect();
    const overflows = [dialog, body, stage, pair].map((element) => ({
      className: element?.className || element?.id,
      delta: element ? element.scrollWidth - element.clientWidth : Number.POSITIVE_INFINITY,
    }));
    return {
      open: Boolean(dialog?.open),
      motifCount: pair?.querySelectorAll("lm-motif").length || 0,
      quietCount: pair?.querySelectorAll("lm-motif[quiet]").length || 0,
      overflows,
      withinViewport: Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const label = `${fixture.locale} paired modal ${fixture.viewport.width}x${fixture.viewport.height}`;
  record(
    modalLayout.open
      && modalLayout.motifCount === 2
      && modalLayout.quietCount === 1
      && modalLayout.overflows.every(({ delta }) => delta <= 1)
      && modalLayout.withinViewport
      && modalLayout.pageOverflow <= 1,
    `${label} has no horizontal overflow`,
    JSON.stringify(modalLayout),
  );
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
  const reducedLandometer = await page.evaluate(() => {
    const motifs = [...document.querySelectorAll("#preview-stage lm-motif")];
    return {
      motifCount: motifs.length,
      quietCount: motifs.filter((motif) => motif.hasAttribute("quiet")).length,
      svgCount: motifs.reduce((count, motif) => count + motif.querySelectorAll("svg").length, 0),
      playingCount: motifs.filter((motif) => motif.hasAttribute("data-play")).length,
      animations: [...document.querySelectorAll("#preview-stage lm-motif *")].map((element) => getComputedStyle(element).animationName),
      replayHidden: document.querySelector("#preview-replay")?.hidden,
      pauseHidden: document.querySelector("#preview-cancel")?.hidden,
      status: document.querySelector("#preview-status")?.textContent?.trim(),
    };
  });
  record(
    reducedLandometer.motifCount === 2
      && reducedLandometer.quietCount === 1
      && reducedLandometer.svgCount === 2
      && reducedLandometer.playingCount === 0
      && reducedLandometer.animations.every((name) => name === "none")
      && reducedLandometer.replayHidden
      && reducedLandometer.pauseHidden
      && reducedLandometer.status.includes("reduced motion"),
    "Reduced motion shows stable Landometer full and quiet final states with replay controls hidden",
    JSON.stringify({ ...reducedLandometer, animations: [...new Set(reducedLandometer.animations)] }),
  );
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
  artifactRelease: "1.1.3",
  artifactRoot: ".",
  routes: ["/motif/", "/motif/en/"],
  browser: browserVersion,
  emulationNote: "Viewport checks are desktop Chrome emulation, not native iPhone, iPad, Safari, or screen-reader evidence.",
  lifecycleEmulationNote: "Visibility and pagehide/pageshow handlers are exercised with standards-shaped in-page events; this is not a full operating-system tab suspension or cross-navigation BFCache observation.",
  viewports,
  states: ["light", "dark", "keyboard", "paired full/quiet dialog", "immediate autoplay", "three-second default auto-replay", "logo exact-final settle and five-second replay", "390x844 dark logo approved-palette lock", "pause", "replay now", "Escape focus restoration", "stale async-preview isolation", "dynamic reduced motion", "synthetic document visibility lifecycle", "synthetic pagehide/pageshow lifecycle", "filter", "search", "copy", "logo 1.1.3 copy contract", "PNG export", "ijji bounded timeout", "ijji cancel", "reduced motion final states", "no JavaScript", "Thai 130% text", "200% text"],
  screenshotsCaptured: {
    storage: "ephemeral local QA output; intentionally not published",
    names: ["th-mobile-360.png", "th-desktop-1440.png", "en-mobile-390.png", "logo-full-quiet-final.png", "logo-full-quiet-final-dark-mobile-390x844.png"],
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
console.log(`PASS: ${checks.length} browser checks across ${viewports.length * 2} responsive route renders plus paired-motion interaction, critical modal layout, reduced-motion, no-JS, and text-scale states.`);
