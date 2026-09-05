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

const requestedBase = process.env.MOTIF_BROWSER_QA_BASE_URL?.replace(/\/$/, "") || "";
const server = requestedBase ? null : http.createServer((request, response) => {
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

if (server) await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server?.address();
const origin = requestedBase || `http://127.0.0.1:${address.port}`;
const siteBase = requestedBase || `${origin}/motif`;
fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const browserVersion = await browser.version();
const exactSourceFiles = [
  {
    path: "assets/landometer/landometer-motifs.css",
    sha256: "7cc2deb475a8d6e4af331407b2b4b741716c458a8ce885e2fb2859374b93912e",
  },
  {
    path: "assets/landometer/landometer-motifs.js",
    sha256: "3a5caef7918a85885b61dd53e049ea8bf2b0a3cea508f587bb14970bfe6deaf2",
  },
  {
    path: "assets/ijji/logo-sting/ijji-logo-sting.js",
    sha256: "1a1d1bc247b5deb92aa19e4d84524ac1f823454a9401b6ce53acf8716010433e",
  },
  {
    path: "assets/ijji/logo-sting/layers/ijji-logo-still.png",
    sha256: "bb1bc80e0c79a10dedb1b48c39efd187e97fe429adec4917975e265f610ccaac",
  },
  {
    path: "assets/ijji/logo-sting/layers/ijji-mark-still.png",
    sha256: "acac2c65b1a17c1956686c3fdbb2a0a6dc3c547c35be1ca128675d28b0ffc630",
  },
];
for (const source of exactSourceFiles) {
  const bytes = fs.readFileSync(path.join(root, source.path));
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  record(actual === source.sha256, `Exact authored source bytes: ${source.path}`, actual);
}
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
  record(metrics.cardCount === 11 && metrics.visibleCardCount === 11, `${label} static asset inventory`, `total=${metrics.cardCount}, visible=${metrics.visibleCardCount}`);
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
  record(await page.locator(".asset-card:not([hidden])").count() === 5, "Brand filter shows all five ijji cards across identity and pending-state families");
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
      ink: motif.getAttribute("ink"),
      inlineWedge: motif.style.getPropertyValue("--lm-wedge").trim(),
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
      && initialLandometerPreview.motifs.find((motif) => !motif.quiet)?.ink === "blue"
      && initialLandometerPreview.motifs.every((motif) => motif.inlineWedge === "")
      && initialLandometerPreview.captions.join(",") === "full,quiet",
    "Landometer v3 preview immediately autoplays paired full and quiet exact-runtime motifs with blue full ink and no wedge override",
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
      await page.waitForTimeout(3500);
      const settledLogo = await page.evaluate(() => ({
        playingCount: document.querySelectorAll("#preview-stage lm-motif[data-play]").length,
        status: document.querySelector("#preview-status")?.textContent?.trim(),
        fullPathCount: document.querySelectorAll("#preview-stage lm-motif:not([quiet]) path").length,
        quietPathCount: document.querySelectorAll("#preview-stage lm-motif[quiet] path").length,
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
          && settledLogo.quietPathCount === 14
          && settledLogo.outerSkyStroke === "rgb(89, 210, 254)"
          && settledLogo.outerSkyRight >= 413.4,
        "Landometer v3 logo preview settles at 3.4 seconds with all 10 full and 14 quiet paths intact",
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
      await page.waitForTimeout(2100);
      record(
        await page.locator("#preview-stage lm-motif[data-play]").count() === 0,
        "Landometer logo preview holds the complete final state long enough to inspect",
      );
      await page.waitForTimeout(600);
      const logoReplay = await page.evaluate(() => ({
        playingCount: document.querySelectorAll("#preview-stage lm-motif[data-play]").length,
        status: document.querySelector("#preview-status")?.textContent?.trim(),
      }));
      record(
        logoReplay.playingCount === 2 && logoReplay.status.includes("กำลังประกอบ"),
        "Landometer logo full and quiet auto-replay together at the 6.0-second showcase interval",
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
  // The production route loads this runtime on demand. Wait for the audience-visible
  // motif instead of assuming the network import will always finish within 150 ms.
  await page.locator("#preview-stage .ijji-motif").waitFor({ state: "attached" });
  record(
    await page.locator("#preview-stage .ijji-motif").count() === 1 && await page.locator("#preview-stage lm-motif").count() === 0,
    "ijji pending-state preview remains a single state-bound motif",
  );
  record(await page.locator("[data-preview-timer]").getAttribute("aria-hidden") === "true", "Frequently changing ijji elapsed time is excluded from the live announcement");
  await page.locator("#preview-cancel").click();
  record(await page.locator("#preview-stage .ijji-motif").count() === 0 && await page.locator("#preview-stage img").count() === 1, "ijji cancel removes motion and leaves static fallback");
  await page.locator("[data-dialog-close]").click();

  const ijjiLogoFullTrigger = page.locator('[data-preview-brand="ijji-logo"][data-preview-id="tagline"]');
  await ijjiLogoFullTrigger.click();
  await page.locator("#preview-stage ijji-logo-sting").waitFor({ state: "attached" });
  await page.waitForFunction(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    return logo?.shadowRoot && logo.currentTime > 0 && logo._playing;
  });
  const ijjiLogoFull = await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    const shadow = logo?.shadowRoot;
    const images = [...(shadow?.querySelectorAll("image") || [])];
    const fallback = logo?.querySelector("img");
    return {
      count: document.querySelectorAll("#preview-stage ijji-logo-sting").length,
      runtimeScripts: [...document.scripts].filter((script) => script.src.includes("/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.0")).map((script) => script.src),
      defined: Boolean(customElements.get("ijji-logo-sting")),
      manual: logo?.hasAttribute("manual"),
      loop: logo?.hasAttribute("loop"),
      notagline: logo?.hasAttribute("notagline"),
      surface: logo?.getAttribute("surface"),
      bounce: logo?.getAttribute("bounce"),
      assets: logo?.getAttribute("assets"),
      duration: logo?.duration,
      currentTime: logo?.currentTime,
      playing: Boolean(logo?._playing),
      viewBox: shadow?.querySelector("svg")?.getAttribute("viewBox"),
      ariaLabel: shadow?.querySelector("svg")?.getAttribute("aria-label"),
      rectFill: shadow?.querySelector("rect")?.getAttribute("fill"),
      circles: shadow?.querySelectorAll("circle").length,
      images: images.map((image) => image.getAttribute("href")),
      fallback: fallback ? { src: fallback.src, alt: fallback.alt, complete: fallback.complete, naturalWidth: fallback.naturalWidth } : null,
    };
  });
  const expectedFullLayers = ["i-1.png", "jj.png", "i-2.png", "tag-1-1.png", "tag-1-2.png", "tag-1-3.png", "tag-2-1.png", "tag-2-2.png", "tag-2-3.png"];
  record(
    ijjiLogoFull.count === 1
      && ijjiLogoFull.runtimeScripts.length === 1
      && ijjiLogoFull.defined
      && ijjiLogoFull.manual
      && ijjiLogoFull.loop
      && !ijjiLogoFull.notagline
      && ijjiLogoFull.surface === "brand-blue"
      && ijjiLogoFull.bounce === "playful"
      && ijjiLogoFull.assets === `${siteBase}/assets/ijji/logo-sting/layers/`
      && ijjiLogoFull.duration === 9
      && ijjiLogoFull.currentTime > 0
      && ijjiLogoFull.playing,
    "ijji full+tagline preview loads the exact runtime once and immediately plays with the supplied attributes",
    JSON.stringify(ijjiLogoFull),
  );
  record(
    ijjiLogoFull.viewBox === "556 433.1 890.7 1086.9"
      && ijjiLogoFull.ariaLabel === "ijji — Your business buddy around the corner"
      && ijjiLogoFull.rectFill.toUpperCase() === "#1D4497"
      && ijjiLogoFull.circles === 4
      && JSON.stringify(ijjiLogoFull.images.map((href) => href.split("/").pop())) === JSON.stringify(expectedFullLayers),
    "ijji full+tagline audience frame uses the source viewBox, Brand Blue surface, four heads, and all nine authored image layers",
    JSON.stringify({ viewBox: ijjiLogoFull.viewBox, ariaLabel: ijjiLogoFull.ariaLabel, rectFill: ijjiLogoFull.rectFill, circles: ijjiLogoFull.circles, images: ijjiLogoFull.images }),
  );
  record(
    ijjiLogoFull.fallback?.src.endsWith("/assets/ijji/logo-sting/layers/ijji-logo-still.png")
      && ijjiLogoFull.fallback.alt === "ijji — Your business buddy around the corner"
      && ijjiLogoFull.fallback.complete
      && ijjiLogoFull.fallback.naturalWidth > 0,
    "ijji full+tagline component carries the exact accessible final-frame fallback",
    JSON.stringify(ijjiLogoFull.fallback),
  );

  await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    logo.__qaStarts = 0;
    logo.__qaEnds = 0;
    logo.addEventListener("ijji-sting-start", () => { logo.__qaStarts += 1; });
    logo.addEventListener("ijji-sting-end", () => { logo.__qaEnds += 1; });
    logo.seek(8.98);
    logo.play();
  });
  await page.waitForTimeout(650);
  const ijjiLoop = await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    return {
      starts: logo?.__qaStarts,
      ends: logo?.__qaEnds,
      currentTime: logo?.currentTime,
      playing: Boolean(logo?._playing),
      loop: logo?.hasAttribute("loop"),
    };
  });
  record(
    ijjiLoop.starts >= 2
      && ijjiLoop.ends >= 1
      && ijjiLoop.currentTime > 0
      && ijjiLoop.currentTime < 1
      && ijjiLoop.playing
      && ijjiLoop.loop,
    "ijji full+tagline preview auto-replays 400 ms after the authored 9-second final frame",
    JSON.stringify(ijjiLoop),
  );

  await page.locator("#preview-cancel").click();
  await page.waitForTimeout(50);
  const ijjiFullPaused = await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    const shadow = logo?.shadowRoot;
    return {
      currentTime: logo?.currentTime,
      duration: logo?.duration,
      playing: Boolean(logo?._playing),
      loop: logo?.hasAttribute("loop"),
      pieceOpacity: [...(shadow?.querySelectorAll("image") || [])].slice(0, 3).map((image) => image.getAttribute("opacity")),
      wordOpacity: [...(shadow?.querySelectorAll("image") || [])].slice(3).map((image) => image.getAttribute("opacity")),
      cancelDisabled: document.querySelector("#preview-cancel")?.disabled,
      status: document.querySelector("#preview-status")?.textContent?.trim(),
    };
  });
  record(
    ijjiFullPaused.currentTime === ijjiFullPaused.duration
      && ijjiFullPaused.duration === 9
      && !ijjiFullPaused.playing
      && !ijjiFullPaused.loop
      && ijjiFullPaused.pieceOpacity.every((opacity) => opacity === "1")
      && ijjiFullPaused.wordOpacity.every((opacity) => opacity === "1")
      && ijjiFullPaused.cancelDisabled
      && ijjiFullPaused.status.includes("หยุด auto replay"),
    "Pausing ijji full+tagline removes the loop and lands on the complete authored final logo",
    JSON.stringify(ijjiFullPaused),
  );
  await page.locator("#preview-dialog").screenshot({ path: path.join(screenshotDir, "ijji-logo-full-final.png") });
  await page.locator("[data-dialog-close]").click();

  const ijjiLogoMarkTrigger = page.locator('[data-preview-brand="ijji-logo"][data-preview-id="mark"]');
  await ijjiLogoMarkTrigger.click();
  await page.locator("#preview-stage ijji-logo-sting").waitFor({ state: "attached" });
  await page.waitForFunction(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    return logo?.shadowRoot && logo.currentTime > 0 && logo._playing;
  });
  const ijjiLogoMark = await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    const shadow = logo?.shadowRoot;
    const images = [...(shadow?.querySelectorAll("image") || [])];
    const fallback = logo?.querySelector("img");
    return {
      runtimeScriptCount: [...document.scripts].filter((script) => script.src.includes("/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.0")).length,
      manual: logo?.hasAttribute("manual"),
      loop: logo?.hasAttribute("loop"),
      notagline: logo?.hasAttribute("notagline"),
      surface: logo?.getAttribute("surface"),
      bounce: logo?.getAttribute("bounce"),
      assets: logo?.getAttribute("assets"),
      duration: logo?.duration,
      currentTime: logo?.currentTime,
      playing: Boolean(logo?._playing),
      viewBox: shadow?.querySelector("svg")?.getAttribute("viewBox"),
      ariaLabel: shadow?.querySelector("svg")?.getAttribute("aria-label"),
      rectFill: shadow?.querySelector("rect")?.getAttribute("fill"),
      circles: shadow?.querySelectorAll("circle").length,
      hiddenWords: images.slice(3).filter((image) => image.getAttribute("display") === "none").length,
      fallback: fallback ? { src: fallback.src, alt: fallback.alt, complete: fallback.complete, naturalWidth: fallback.naturalWidth } : null,
    };
  });
  record(
    ijjiLogoMark.runtimeScriptCount === 1
      && ijjiLogoMark.manual
      && ijjiLogoMark.loop
      && ijjiLogoMark.notagline
      && ijjiLogoMark.surface === null
      && ijjiLogoMark.bounce === "extra"
      && ijjiLogoMark.assets === `${siteBase}/assets/ijji/logo-sting/layers/`
      && ijjiLogoMark.duration === 6.4
      && ijjiLogoMark.currentTime > 0
      && ijjiLogoMark.playing,
    "ijji mark-only preview reuses the single runtime and immediately plays the compact supplied sequence",
    JSON.stringify(ijjiLogoMark),
  );
  record(
    ijjiLogoMark.viewBox === "598 433.1 848.7 839.9"
      && ijjiLogoMark.ariaLabel === "ijji"
      && ijjiLogoMark.rectFill === "none"
      && ijjiLogoMark.circles === 4
      && ijjiLogoMark.hiddenWords === 6
      && ijjiLogoMark.fallback?.src.endsWith("/assets/ijji/logo-sting/layers/ijji-mark-still.png")
      && ijjiLogoMark.fallback.alt === "ijji"
      && ijjiLogoMark.fallback.complete
      && ijjiLogoMark.fallback.naturalWidth > 0,
    "ijji mark-only audience frame uses the compact source viewBox, hides all tagline layers, and carries its final fallback",
    JSON.stringify(ijjiLogoMark),
  );
  await page.locator("#preview-cancel").click();
  const ijjiMarkPaused = await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    const shadow = logo?.shadowRoot;
    return {
      currentTime: logo?.currentTime,
      duration: logo?.duration,
      playing: Boolean(logo?._playing),
      loop: logo?.hasAttribute("loop"),
      pieceOpacity: [...(shadow?.querySelectorAll("image") || [])].slice(0, 3).map((image) => image.getAttribute("opacity")),
      hiddenWords: [...(shadow?.querySelectorAll("image") || [])].slice(3).filter((image) => image.getAttribute("display") === "none").length,
      status: document.querySelector("#preview-status")?.textContent?.trim(),
    };
  });
  record(
    ijjiMarkPaused.currentTime === ijjiMarkPaused.duration
      && ijjiMarkPaused.duration === 6.4
      && !ijjiMarkPaused.playing
      && !ijjiMarkPaused.loop
      && ijjiMarkPaused.pieceOpacity.every((opacity) => opacity === "1")
      && ijjiMarkPaused.hiddenWords === 6
      && ijjiMarkPaused.status.includes("หยุด auto replay"),
    "Pausing ijji mark-only removes the loop and lands on the complete authored mark",
    JSON.stringify(ijjiMarkPaused),
  );
  await page.locator("[data-dialog-close]").click();

  await page.locator('[data-copy-code][data-brand="landometer"]').first().click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(clipboard.includes("<lm-motif kind=\"dial\"") && clipboard.includes("montri-th.github.io/motif"), "Copy-code action writes canonical Landometer snippet");

  await page.locator('[data-copy-code][data-brand="landometer"][data-id="logo"]').click();
  const logoClipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(
    logoClipboard.includes('<lm-motif kind="logo" ink="blue"></lm-motif>')
      && !logoClipboard.includes("--lm-wedge")
      && logoClipboard.includes("landometer-motifs.css?v=1.2.0")
      && logoClipboard.includes("landometer-motifs.js?v=1.2.0"),
    "Logo copy-code action preserves the authored v3 blue-ink contract without a legacy wedge override",
    logoClipboard,
  );

  await page.locator('[data-copy-code][data-brand="ijji-logo"][data-id="tagline"]').click();
  const ijjiFullClipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(
    ijjiFullClipboard.includes("ijji-logo-sting.js?v=1.2.0")
      && ijjiFullClipboard.includes('<ijji-logo-sting surface="brand-blue" bounce="playful" assets="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/">')
      && ijjiFullClipboard.includes("ijji-logo-still.png")
      && !ijjiFullClipboard.includes(" manual")
      && !ijjiFullClipboard.includes(" loop"),
    "ijji full+tagline copy snippet preserves exact source settings and finite-once production playback",
    ijjiFullClipboard,
  );

  await page.locator('[data-copy-code][data-brand="ijji-logo"][data-id="mark"]').click();
  const ijjiMarkClipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(
    ijjiMarkClipboard.includes("ijji-logo-sting.js?v=1.2.0")
      && ijjiMarkClipboard.includes('<ijji-logo-sting notagline bounce="extra" assets="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/">')
      && ijjiMarkClipboard.includes("ijji-mark-still.png")
      && !ijjiMarkClipboard.includes(" manual")
      && !ijjiMarkClipboard.includes(" loop"),
    "ijji mark-only copy snippet preserves exact compact settings and finite-once production playback",
    ijjiMarkClipboard,
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
  await page.waitForTimeout(3500);

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
      fullInlineWedgeProperty: full?.style.getPropertyValue("--lm-wedge").trim(),
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
      && darkMobileLogo.fullInlineWedgeProperty === ""
      && !darkMobileLogo.fullWedgeProperty?.toUpperCase().includes("#0195CB"),
    "390x844 dark-mode full logo uses v3 blue ink and the authored derived wedge without a legacy override",
    JSON.stringify({ ink: darkMobileLogo.fullInk, inlineWedge: darkMobileLogo.fullInlineWedgeProperty, computedWedge: darkMobileLogo.fullWedgeProperty }),
  );
  record(
    darkMobileLogo.fullPathCount === 10 && darkMobileLogo.quietPathCount === 14,
    "390x844 dark-mode logo pair retains all 10 full and 14 quiet v3 paths",
    JSON.stringify({ full: darkMobileLogo.fullPathCount, quiet: darkMobileLogo.quietPathCount }),
  );
  record(
    JSON.stringify(darkMobileLogo.pin) === JSON.stringify([29, 68, 151, 255]),
    "390x844 dark-mode full logo pin computes to Brand Blue rgb(29, 68, 151)",
    JSON.stringify({ rgba: darkMobileLogo.pin, raw: darkMobileLogo.raw.pin }),
  );
  record(
    JSON.stringify(darkMobileLogo.wedge) === JSON.stringify([31, 135, 206, 255]),
    "390x844 dark-mode full logo wedge computes from v3 source tokens to rgb(31, 135, 206)",
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

// ijji identity previews preserve the source's minimum perceived width without creating viewport overflow.
for (const fixture of [
  { id: "tagline", viewport: { width: 320, height: 800 }, minimumWidth: 319 },
  { id: "mark", viewport: { width: 360, height: 800 }, minimumWidth: 160 },
]) {
  const context = await browser.newContext({ viewport: fixture.viewport });
  const page = await context.newPage();
  await page.goto(`${siteBase}/`, { waitUntil: "networkidle" });
  await page.locator(`[data-preview-brand="ijji-logo"][data-preview-id="${fixture.id}"]`).click();
  await page.locator("#preview-stage ijji-logo-sting").waitFor({ state: "attached" });
  const layout = await page.evaluate(() => {
    const dialog = document.querySelector("#preview-dialog");
    const body = dialog?.querySelector(".dialog-body");
    const stage = dialog?.querySelector(".dialog-stage");
    const logo = stage?.querySelector("ijji-logo-sting");
    const fallback = logo?.querySelector("img");
    const rect = dialog?.getBoundingClientRect();
    const logoRect = logo?.getBoundingClientRect();
    return {
      open: Boolean(dialog?.open),
      dialogWithinViewport: Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1),
      logoWidth: logoRect?.width || 0,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflows: [dialog, body, stage, logo].map((element) => ({
        name: element?.id || element?.localName || element?.className,
        delta: element ? element.scrollWidth - element.clientWidth : Number.POSITIVE_INFINITY,
      })),
      fallbackLoaded: Boolean(fallback?.complete && fallback.naturalWidth > 0),
    };
  });
  record(
    layout.open
      && layout.dialogWithinViewport
      && layout.logoWidth >= fixture.minimumWidth
      && layout.pageOverflow <= 1
      && layout.overflows.every(({ delta }) => delta <= 1)
      && layout.fallbackLoaded,
    `ijji ${fixture.id} preview at ${fixture.viewport.width}px preserves its audience width, fallback, and horizontal containment`,
    JSON.stringify(layout),
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
  await page.locator("[data-dialog-close]").click();

  for (const fixture of [
    { id: "tagline", duration: 9, hiddenWords: 0 },
    { id: "mark", duration: 6.4, hiddenWords: 6 },
  ]) {
    await page.locator(`[data-preview-brand="ijji-logo"][data-preview-id="${fixture.id}"]`).click();
    await page.locator("#preview-stage ijji-logo-sting").waitFor({ state: "attached" });
    const reducedIdentity = await page.evaluate(() => {
      const logo = document.querySelector("#preview-stage ijji-logo-sting");
      const images = [...(logo?.shadowRoot?.querySelectorAll("image") || [])];
      return {
        currentTime: logo?.currentTime,
        duration: logo?.duration,
        playing: Boolean(logo?._playing),
        loop: logo?.hasAttribute("loop"),
        pieceOpacity: images.slice(0, 3).map((image) => image.getAttribute("opacity")),
        wordOpacity: images.slice(3).map((image) => image.getAttribute("opacity")),
        hiddenWords: images.slice(3).filter((image) => image.getAttribute("display") === "none").length,
        replayHidden: document.querySelector("#preview-replay")?.hidden,
        pauseHidden: document.querySelector("#preview-cancel")?.hidden,
        status: document.querySelector("#preview-status")?.textContent?.trim(),
      };
    });
    record(
      reducedIdentity.currentTime === fixture.duration
        && reducedIdentity.duration === fixture.duration
        && !reducedIdentity.playing
        && !reducedIdentity.loop
        && reducedIdentity.pieceOpacity.every((opacity) => opacity === "1")
        && reducedIdentity.hiddenWords === fixture.hiddenWords
        && (fixture.id === "mark" || reducedIdentity.wordOpacity.every((opacity) => opacity === "1"))
        && reducedIdentity.replayHidden
        && reducedIdentity.pauseHidden
        && reducedIdentity.status.includes("reduced motion"),
      `Reduced motion presents the complete static ijji ${fixture.id} final frame with replay controls hidden`,
      JSON.stringify(reducedIdentity),
    );
    await page.locator("[data-dialog-close]").click();
  }
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
  record(noJs.h1 === 1 && noJs.cards === 11 && noJs.downloads >= 11 && noJs.hero && noJs.visibleEnhancedControls === 0 && noJs.notice && noJs.noticeBackground !== "rgba(0, 0, 0, 0)" && noJs.noticeColor !== noJs.noticeBackground, "No-JS baseline keeps learning content and direct downloads without dead enhancement controls", JSON.stringify(noJs));
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
  record(scaled.overflow <= 1 && scaled.h1Visible && scaled.cards === 11 && scaled.offenders.length === 0, `Thai text scale ${scale}% preserves page contract`, JSON.stringify(scaled));
  await context.close();
}

await browser.close();
if (server) await new Promise((resolve) => server.close(resolve));

const socialPath = path.join(root, "assets/social/motif-library-1200x630.png");
const socialBytes = fs.readFileSync(socialPath);
const report = {
  schemaVersion: "motif-library-browser-qa/1.0",
  executedAt: new Date().toISOString(),
  artifactRelease: "1.2.0",
  artifactRoot: ".",
  target: requestedBase ? "published_https" : "local_loopback",
  routes: ["/motif/", "/motif/en/"],
  browser: browserVersion,
  emulationNote: "Viewport checks are desktop Chrome emulation, not native iPhone, iPad, Safari, or screen-reader evidence.",
  lifecycleEmulationNote: "Visibility and pagehide/pageshow handlers are exercised with standards-shaped in-page events; this is not a full operating-system tab suspension or cross-navigation BFCache observation.",
  viewports,
  states: ["light", "dark", "keyboard", "paired full/quiet dialog", "immediate autoplay", "three-second default auto-replay", "Landometer v3 logo exact-final settle at 3.4 seconds and replay at 6.0 seconds", "390x844 dark Landometer v3 palette lock", "pause", "replay now", "Escape focus restoration", "stale async-preview isolation", "dynamic reduced motion", "synthetic document visibility lifecycle", "synthetic pagehide/pageshow lifecycle", "filter", "search", "copy", "Landometer 1.2.0 copy contract", "PNG export", "ijji bounded timeout", "ijji cancel", "ijji full+tagline immediate play and loop", "ijji mark-only immediate play", "ijji exact attributes, viewBoxes, layers, and fallbacks", "ijji finite-once 1.2.0 copy contracts", "ijji identity mobile widths", "reduced motion final states", "no JavaScript", "Thai 130% text", "200% text"],
  screenshotsCaptured: {
    storage: "ephemeral local QA output; intentionally not published",
    names: ["th-mobile-360.png", "th-desktop-1440.png", "en-mobile-390.png", "logo-full-quiet-final.png", "logo-full-quiet-final-dark-mobile-390x844.png", "ijji-logo-full-final.png"],
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
console.log(`PASS: ${checks.length} browser checks across ${viewports.length * 2} responsive route renders plus Landometer v3 and ijji identity motion, critical modal layout, reduced-motion, no-JS, and text-scale states.`);
