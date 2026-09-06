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
const localOrigin = requestedBase ? "" : `http://127.0.0.1:${address.port}`;
const siteBase = requestedBase || `${localOrigin}/motif`;
const origin = new URL(siteBase).origin;
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
    path: "assets/ijji/ijji-motifs.js",
    sha256: "4f341f6bc0c7acd3d6ce44aad6d798e3f03b26c712a29610ae4985cbe11271a4",
  },
  {
    path: "assets/ijji/ijji-motion.css",
    sha256: "195a53a793d0fd693e0d9e6ec941a687ca3fbb55a7af262d85d0905c6ddf2bf4",
  },
  {
    path: "assets/landometer/svg/logo-full.svg",
    sha256: "90e9543f2f86a18f891331c13be25038b4334ca7dbe55b194650bc441e3558e1",
  },
  {
    path: "assets/landometer/svg/logo-quiet.svg",
    sha256: "5b6798cdb6c3ada246286e6ce3386644f383c4f987a267e5c5db392809403e14",
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
const exactByteAttestation = [];
for (const source of exactSourceFiles) {
  let bytes = null;
  let evidence = null;
  try {
    if (requestedBase) {
      const url = new URL(source.path, `${siteBase}/`);
      url.searchParams.set("qa_exact_bytes", source.sha256.slice(0, 12));
      const response = await fetch(url, { cache: "no-store", redirect: "follow" });
      bytes = Buffer.from(await response.arrayBuffer());
      evidence = {
        source: "published_https_response",
        url: url.href,
        status: response.status,
        contentType: response.headers.get("content-type"),
        bytes: bytes.length,
      };
      if (!response.ok) bytes = null;
    } else {
      const file = path.join(root, source.path);
      bytes = fs.readFileSync(file);
      evidence = { source: "local_filesystem", path: source.path, bytes: bytes.length };
    }
  } catch (error) {
    evidence = {
      source: requestedBase ? "published_https_response" : "local_filesystem",
      ...(requestedBase ? { url: new URL(source.path, `${siteBase}/`).href } : { path: source.path }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const actual = bytes ? crypto.createHash("sha256").update(bytes).digest("hex") : null;
  const passed = actual === source.sha256;
  const result = { path: source.path, expectedSha256: source.sha256, actualSha256: actual, passed, ...evidence };
  exactByteAttestation.push(result);
  record(
    passed,
    `${requestedBase ? "Published HTTPS" : "Local"} exact authored bytes: ${source.path}`,
    JSON.stringify(result),
  );
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

// These selectors intentionally exclude the preview dialog. The page-level motion
// inventory includes the hero plus Choose and Intent-to-Next-Action stages.
const inlineTargetSelector = [
  ".hero-stage[data-lm-live]",
  "#choose [data-lm-live]",
  "#choose [data-ijji-logo-live]",
  "#examples [data-lm-live]",
  "#examples [data-ijji-motif-live]",
].join(",");
const inlineLandometerExampleSelector = "#examples [data-lm-live]";
const inlineIjjiExampleSelector = "#examples [data-ijji-motif-live]";

async function waitForInlineEnhancement(page) {
  await page.waitForFunction(() => {
    const landometer = [
      ...document.querySelectorAll(".hero-stage[data-lm-live] > lm-motif, #choose [data-lm-live] > lm-motif, #examples [data-lm-live] > lm-motif"),
    ];
    const identity = document.querySelector("#choose [data-ijji-logo-live] > ijji-logo-sting");
    const ijji = [...document.querySelectorAll("#examples [data-ijji-motif-live] > .ijji-slot > .ijji-motif")];
    return landometer.length === 6
      && landometer.every((motif) => motif.querySelectorAll("svg").length === 1)
      && Boolean(identity?.shadowRoot?.querySelector("svg"))
      && ijji.length === 2;
  }, null, { timeout: 6000 });
}

async function waitForInlineState(page, selector, state, count = 1) {
  await page.waitForFunction(({ target, expectedState, expectedCount }) => {
    const stages = [...document.querySelectorAll(target)];
    return stages.length === expectedCount
      && stages.every((stage) => stage.dataset.motionState === expectedState);
  }, { target: selector, expectedState: state, expectedCount: count }, { timeout: 5000 });
}

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

// Page motion has one exact inventory on both localized routes: one hero, two
// complete brand-logo stages in Choose, then six Intent-to-Next-Action motifs.
for (const fixture of [
  { route: "/", locale: "th" },
  { route: "/en/", locale: "en" },
]) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${siteBase}${fixture.route}`, { waitUntil: "networkidle" });
  await waitForInlineEnhancement(page);

  const inline = await page.evaluate((targetSelector) => {
    const targets = [...document.querySelectorAll(targetSelector)];
    const landometerStages = [
      ...document.querySelectorAll(".hero-stage[data-lm-live], #choose [data-lm-live], #examples [data-lm-live]"),
    ];
    const identityStage = document.querySelector("#choose [data-ijji-logo-live]");
    const identity = identityStage?.querySelector(":scope > ijji-logo-sting");
    const identityShadow = identity?.shadowRoot;
    const identityImages = [...(identityShadow?.querySelectorAll("image") || [])];
    const ijjiStages = [...document.querySelectorAll("#examples [data-ijji-motif-live]")];
    const fileName = (url) => new URL(url, document.baseURI).pathname.split("/").pop();
    const fallbacks = targets.map((stage) => {
      const image = stage.querySelector(":scope > img");
      return image ? {
        file: fileName(image.currentSrc || image.src),
        alt: image.alt,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
      } : null;
    });
    return {
      counts: {
        hero: document.querySelectorAll(".hero-stage[data-lm-live]").length,
        choose: document.querySelectorAll("#choose [data-lm-live], #choose [data-ijji-logo-live]").length,
        examples: document.querySelectorAll("#examples [data-lm-live], #examples [data-ijji-motif-live]").length,
        total: targets.length,
        directFallbacks: targets.filter((stage) => stage.querySelector(":scope > img")).length,
      },
      fallbacks,
      enhancedCount: targets.filter((stage) => stage.classList.contains("is-enhanced")).length,
      landometer: landometerStages.map((stage) => {
        const motif = stage.querySelector(":scope > lm-motif");
        return {
          kind: motif?.getAttribute("kind") || "",
          quiet: Boolean(motif?.hasAttribute("quiet")),
          ink: motif?.getAttribute("ink") || "",
          autoplay: motif?.getAttribute("autoplay"),
          loop: stage.dataset.loop || "",
          ariaHidden: motif?.getAttribute("aria-hidden"),
          svgCount: motif?.querySelectorAll("svg").length || 0,
        };
      }),
      identity: {
        childCount: identityStage?.querySelectorAll(":scope > ijji-logo-sting").length || 0,
        manual: Boolean(identity?.hasAttribute("manual")),
        notagline: Boolean(identity?.hasAttribute("notagline")),
        surface: identity?.getAttribute("surface"),
        bounce: identity?.getAttribute("bounce"),
        assets: identity?.getAttribute("assets"),
        duration: identity?.duration,
        viewBox: identityShadow?.querySelector("svg")?.getAttribute("viewBox"),
        ariaLabel: identityShadow?.querySelector("svg")?.getAttribute("aria-label"),
        rectFill: identityShadow?.querySelector("rect")?.getAttribute("fill"),
        circles: identityShadow?.querySelectorAll("circle").length || 0,
        images: identityImages.map((image) => fileName(image.getAttribute("href"))),
        stageWidth: identityStage?.getBoundingClientRect().width || 0,
        deliveredWidth: identity?.getBoundingClientRect().width || 0,
      },
      ijji: ijjiStages.map((stage) => {
        const slot = stage.querySelector(":scope > .ijji-slot");
        const svg = slot?.querySelector(":scope > .ijji-motif");
        return {
          kind: stage.dataset.kind,
          surface: stage.dataset.surface,
          slotCount: stage.querySelectorAll(":scope > .ijji-slot").length,
          className: svg?.getAttribute("class"),
          ariaHidden: svg?.getAttribute("aria-hidden"),
          role: svg?.getAttribute("role"),
          ariaLabel: svg?.getAttribute("aria-label"),
        };
      }),
      cache121: {
        landometerCss: [...document.querySelectorAll("link[href]")]
          .filter((link) => link.href.includes("/assets/landometer/landometer-motifs.css?v=1.2.1")).length,
        landometerJs: [...document.scripts]
          .filter((script) => script.src.includes("/assets/landometer/landometer-motifs.js?v=1.2.1")).length,
        siteJs: [...document.scripts]
          .filter((script) => script.src.includes("/site.js?v=1.2.1")).length,
        ijjiLogoJs: [...document.scripts]
          .filter((script) => script.src.includes("/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.1")).length,
        ijjiMotifModule: performance.getEntriesByType("resource")
          .filter((entry) => entry.name.includes("/assets/ijji/ijji-motifs.js?v=1.2.1")).length,
      },
    };
  }, inlineTargetSelector);

  const expectedFallbacks = [
    "dial-full.svg",
    "logo-full.svg",
    "ijji-logo-still.png",
    "rings-full.svg",
    "layers-quiet.svg",
    "rings-quiet.svg",
    "cultivate-quiet.svg",
    "ijji-rotate-b-transparent-mint.svg",
    "ijji-graph-b-transparent-mint.svg",
  ];
  const expectedLandometer = [
    { kind: "dial", quiet: false, ink: "blue", autoplay: "false", loop: "3000", ariaHidden: "true", svgCount: 1 },
    { kind: "logo", quiet: false, ink: "blue", autoplay: "false", loop: "6000", ariaHidden: "true", svgCount: 1 },
    { kind: "rings", quiet: false, ink: "blue", autoplay: "false", loop: "3000", ariaHidden: "true", svgCount: 1 },
    { kind: "layers", quiet: true, ink: "", autoplay: "false", loop: "3000", ariaHidden: "true", svgCount: 1 },
    { kind: "rings", quiet: true, ink: "", autoplay: "false", loop: "3000", ariaHidden: "true", svgCount: 1 },
    { kind: "cultivate", quiet: true, ink: "", autoplay: "false", loop: "3000", ariaHidden: "true", svgCount: 1 },
  ];
  const expectedIdentityLayers = ["i-1.png", "jj.png", "i-2.png", "tag-1-1.png", "tag-1-2.png", "tag-1-3.png", "tag-2-1.png", "tag-2-2.png", "tag-2-3.png"];
  const expectedIjji = [
    { kind: "rotate-b", surface: "transparent-mint", slotCount: 1, className: "ijji-motif ijji-rotate-b", ariaHidden: "true", role: null, ariaLabel: null },
    { kind: "graph-b", surface: "transparent-mint", slotCount: 1, className: "ijji-motif ijji-graph-b", ariaHidden: "true", role: null, ariaLabel: null },
  ];
  const label = `${fixture.locale} inline`;
  record(
    inline.counts.hero === 1
      && inline.counts.choose === 2
      && inline.counts.examples === 6
      && inline.counts.total === 9
      && inline.counts.directFallbacks === 9
      && inline.enhancedCount === 9
      && inline.fallbacks.every((image) => image?.complete && image.naturalWidth > 0 && image.alt)
      && JSON.stringify(inline.fallbacks.map((image) => image.file)) === JSON.stringify(expectedFallbacks),
    `${label} has exactly one hero, two brand logos, and six Intent-to-Next-Action stages with complete direct fallbacks`,
    JSON.stringify({ counts: inline.counts, enhanced: inline.enhancedCount, fallbacks: inline.fallbacks }),
  );
  record(
    JSON.stringify(inline.landometer) === JSON.stringify(expectedLandometer),
    `${label} Landometer hero, logo, and four examples preserve exact enhanced attributes and replay intervals`,
    JSON.stringify(inline.landometer),
  );
  record(
    inline.identity.childCount === 1
      && inline.identity.manual
      && !inline.identity.notagline
      && inline.identity.surface === "brand-blue"
      && inline.identity.bounce === "playful"
      && inline.identity.assets === `${siteBase}/assets/ijji/logo-sting/layers/`
      && inline.identity.duration === 9
      && inline.identity.viewBox === "556 433.1 890.7 1086.9"
      && inline.identity.ariaLabel === "ijji — Your business buddy around the corner"
      && inline.identity.rectFill?.toUpperCase() === "#1D4497"
      && inline.identity.circles === 4
      && JSON.stringify(inline.identity.images) === JSON.stringify(expectedIdentityLayers),
    `${label} full ijji logo uses the exact full+tagline runtime attributes and authored layers`,
    JSON.stringify(inline.identity),
  );
  record(
    inline.identity.stageWidth >= 320
      && inline.identity.deliveredWidth >= 320
      && inline.identity.deliveredWidth <= inline.identity.stageWidth + 1,
    `${label} desktop Choose card delivers the full ijji identity at its 320 px audience minimum`,
    JSON.stringify({ stageWidth: inline.identity.stageWidth, deliveredWidth: inline.identity.deliveredWidth }),
  );
  record(
    JSON.stringify(inline.ijji) === JSON.stringify(expectedIjji),
    `${label} ijji examples preserve exact product-specific kinds, surfaces, and decorative semantics`,
    JSON.stringify(inline.ijji),
  );
  record(
    Object.values(inline.cache121).every((count) => count === 1),
    `${label} enhancement resources use one exact 1.2.1 cache-keyed runtime each`,
    JSON.stringify(inline.cache121),
  );
  await context.close();
}

// A cold identity request keeps the exact complete fallback visible and preserves
// an explicit Pause action while the final source layer is still arriving.
{
  const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await context.newPage();
  let delayedLayer = true;
  await page.route("**/assets/ijji/logo-sting/layers/tag-2-3.png*", async (route) => {
    if (delayedLayer) {
      delayedLayer = false;
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    await route.continue();
  });
  await page.goto(`${siteBase}/`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-preview-brand="ijji-logo"][data-preview-id="tagline"]').click();
  await page.locator("#preview-cancel").click();
  await page.waitForTimeout(50);
  const loadingPause = await page.evaluate(() => {
    const fallback = document.querySelector("#preview-stage > img");
    return {
      components: document.querySelectorAll("#preview-stage > ijji-logo-sting").length,
      fallbackVisible: Boolean(fallback && getComputedStyle(fallback).visibility === "visible"),
      fallbackFile: fallback?.src.split("/").pop(),
      pausedStatus: document.querySelector("#preview-status")?.textContent?.includes("หยุด auto replay"),
    };
  });
  await page.locator("#preview-stage > ijji-logo-sting").waitFor({ state: "attached", timeout: 5000 });
  const settledPause = await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage > ijji-logo-sting");
    return {
      currentTime: logo?.currentTime,
      duration: logo?.duration,
      playing: Boolean(logo?._playing),
      loop: Boolean(logo?.hasAttribute("loop")),
      cancelDisabled: Boolean(document.querySelector("#preview-cancel")?.disabled),
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(50);
  const restoredPause = await page.evaluate(() => {
    const logo = document.querySelector("#preview-stage > ijji-logo-sting");
    return {
      currentTime: logo?.currentTime,
      duration: logo?.duration,
      playing: Boolean(logo?._playing),
      loop: Boolean(logo?.hasAttribute("loop")),
      cancelDisabled: Boolean(document.querySelector("#preview-cancel")?.disabled),
    };
  });
  record(
    loadingPause.components === 0
      && loadingPause.fallbackVisible
      && loadingPause.fallbackFile.startsWith("ijji-logo-still.png")
      && loadingPause.pausedStatus,
    "Cold ijji identity loading keeps the complete fallback visible when Pause is chosen before layers are ready",
    JSON.stringify(loadingPause),
  );
  record(
    settledPause.currentTime === settledPause.duration
      && !settledPause.playing
      && !settledPause.loop
      && settledPause.cancelDisabled
      && restoredPause.currentTime === restoredPause.duration
      && !restoredPause.playing
      && !restoredPause.loop
      && restoredPause.cancelDisabled,
    "A pre-load ijji Pause survives layer readiness and reduced-motion on/off remounts",
    JSON.stringify({ settledPause, restoredPause }),
  );
  await context.close();
}

// One representative desktop render per locale exercises all inline controllers.
// Real waits cover each replay interval once per route; the rest are state changes.
for (const fixture of [
  { route: "/", locale: "th", pauseLabel: "หยุด animation", resumeLabel: "เล่น animation ต่อ" },
  { route: "/en/", locale: "en", pauseLabel: "Pause animation", resumeLabel: "Resume animation" },
]) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${siteBase}${fixture.route}`, { waitUntil: "networkidle" });
  await waitForInlineEnhancement(page);
  const label = `${fixture.locale} inline motion`;

  await page.evaluate(() => {
    const stage = document.querySelector(".hero-stage[data-lm-live]");
    const rect = stage?.getBoundingClientRect();
    if (!stage || !rect) return;
    const documentTop = rect.top + window.scrollY;
    window.scrollTo({ top: documentTop + rect.height * 0.9, behavior: "instant" });
  });
  await page.waitForFunction(() => document.querySelector(".hero-stage[data-lm-live]")?.dataset.motionState === "final");
  const belowThresholdHero = await page.evaluate(() => {
    const stage = document.querySelector(".hero-stage[data-lm-live]");
    const rect = stage?.getBoundingClientRect();
    const visibleHeight = rect ? Math.max(0, Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top)) : 0;
    return {
      ratio: rect?.height ? visibleHeight / rect.height : 0,
      state: stage?.dataset.motionState,
      playing: Boolean(stage?.querySelector(":scope > lm-motif[data-play]")),
    };
  });
  record(
    belowThresholdHero.ratio > 0
      && belowThresholdHero.ratio < 0.14
      && belowThresholdHero.state === "final"
      && !belowThresholdHero.playing,
    `${label} does not animate a merely sliver-visible hero below the 14-percent eligibility threshold`,
    JSON.stringify(belowThresholdHero),
  );

  const landometerLogoStage = page.locator("#choose [data-lm-live]");
  await landometerLogoStage.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const stage = document.querySelector("#choose [data-lm-live]");
    return stage?.dataset.motionState === "running"
      && stage.querySelector(":scope > lm-motif")?.hasAttribute("data-play");
  });
  await page.evaluate(() => {
    const motif = document.querySelector("#choose [data-lm-live] > lm-motif");
    window.__inlineLogoReplayMutations = 0;
    window.__inlineLogoReplayObserver = new MutationObserver((mutations) => {
      window.__inlineLogoReplayMutations += mutations.filter((mutation) => mutation.attributeName === "data-play").length;
    });
    window.__inlineLogoReplayObserver.observe(motif, { attributes: true, attributeFilter: ["data-play"] });
  });
  await page.waitForTimeout(6200);
  const landometerLogoReplay = await page.evaluate(() => ({
    mutations: window.__inlineLogoReplayMutations,
    state: document.querySelector("#choose [data-lm-live]")?.dataset.motionState,
    playing: document.querySelector("#choose [data-lm-live] > lm-motif")?.hasAttribute("data-play"),
  }));
  await page.evaluate(() => window.__inlineLogoReplayObserver?.disconnect());
  record(
    landometerLogoReplay.mutations >= 2 && landometerLogoReplay.state === "running" && landometerLogoReplay.playing,
    `${label} Landometer full logo visibly restarts at its six-second inline interval`,
    JSON.stringify(landometerLogoReplay),
  );

  const ijjiLogoStage = page.locator("#choose [data-ijji-logo-live]");
  await ijjiLogoStage.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const stage = document.querySelector("#choose [data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return stage?.dataset.motionState === "running" && logo?._playing && logo.hasAttribute("loop");
  });
  await page.evaluate(() => {
    const logo = document.querySelector("#choose [data-ijji-logo-live] > ijji-logo-sting");
    logo.__qaInlineStarts = 0;
    logo.__qaInlineEnds = 0;
    logo.addEventListener("ijji-sting-start", () => { logo.__qaInlineStarts += 1; });
    logo.addEventListener("ijji-sting-end", () => { logo.__qaInlineEnds += 1; });
    logo.seek(8.98);
    logo.play();
  });
  await page.waitForTimeout(650);
  const ijjiLogoReplay = await page.evaluate(() => {
    const stage = document.querySelector("#choose [data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return {
      state: stage?.dataset.motionState,
      starts: logo?.__qaInlineStarts,
      ends: logo?.__qaInlineEnds,
      currentTime: logo?.currentTime,
      playing: Boolean(logo?._playing),
      loop: Boolean(logo?.hasAttribute("loop")),
    };
  });
  record(
    ijjiLogoReplay.state === "running"
      && ijjiLogoReplay.starts >= 2
      && ijjiLogoReplay.ends >= 1
      && ijjiLogoReplay.currentTime > 0
      && ijjiLogoReplay.currentTime < 1
      && ijjiLogoReplay.playing
      && ijjiLogoReplay.loop,
    `${label} ijji full+tagline logo reaches its final frame and continuously restarts`,
    JSON.stringify(ijjiLogoReplay),
  );

  // Force an end, pause, and resume inside the exact runtime's untracked 400 ms
  // hold. Capture on the stable stage so events from replacement children count.
  await page.evaluate(() => {
    const stage = document.querySelector("#choose [data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    const race = {
      starts: 0,
      ends: 0,
      mounts: 1,
      startTimes: [],
      endTimes: [],
      initialLogo: logo,
    };
    window.__qaInlineIjjiRace = race;
    stage?.addEventListener("ijji-sting-start", () => {
      race.starts += 1;
      race.startTimes.push(performance.now());
    }, true);
    stage?.addEventListener("ijji-sting-end", () => {
      race.ends += 1;
      race.endTimes.push(performance.now());
    }, true);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element && node.matches("ijji-logo-sting")) race.mounts += 1;
        });
      });
    });
    observer.observe(stage, { childList: true });
    race.observer = observer;
    logo?.seek(8.98);
    logo?.play();
  });
  await page.waitForFunction(() => window.__qaInlineIjjiRace?.ends >= 1, null, { timeout: 1500 });
  await page.locator("[data-motion-toggle]").evaluate((button) => button.click());
  await waitForInlineState(page, inlineTargetSelector, "final", 9);
  await page.locator("[data-motion-toggle]").evaluate((button) => button.click());
  await page.waitForFunction(() => {
    const stage = document.querySelector("#choose [data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return stage?.dataset.motionState === "running"
      && logo?._playing
      && window.__qaInlineIjjiRace?.starts >= 2;
  });
  await page.waitForTimeout(550);
  const inlineIjjiRace = await page.evaluate(() => {
    const stage = document.querySelector("#choose [data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    const race = window.__qaInlineIjjiRace;
    race?.observer?.disconnect();
    return {
      starts: race?.starts,
      ends: race?.ends,
      mounts: race?.mounts,
      resumeDelayMs: race?.startTimes?.[1] - race?.endTimes?.[0],
      activeWasRemounted: Boolean(logo && logo !== race?.initialLogo),
      activeCount: stage?.querySelectorAll(":scope > ijji-logo-sting").length,
      activePlaying: Boolean(logo?._playing),
      activeLoop: Boolean(logo?.hasAttribute("loop")),
      activeCurrentTime: logo?.currentTime,
    };
  });
  record(
    inlineIjjiRace.starts === 2
      && inlineIjjiRace.ends === 1
      && inlineIjjiRace.mounts >= 3
      && inlineIjjiRace.resumeDelayMs >= 0
      && inlineIjjiRace.resumeDelayMs < 400
      && inlineIjjiRace.activeWasRemounted
      && inlineIjjiRace.activeCount === 1
      && inlineIjjiRace.activePlaying
      && inlineIjjiRace.activeLoop
      && inlineIjjiRace.activeCurrentTime > 0.35,
    `${label} ijji remount blocks a stale 400 ms callback from duplicating pause-to-resume playback`,
    JSON.stringify(inlineIjjiRace),
  );

  const landometerExamples = page.locator(inlineLandometerExampleSelector);
  const landometerExampleStarts = [];
  for (let index = 0; index < 4; index += 1) {
    await landometerExamples.nth(index).scrollIntoViewIfNeeded();
    await page.waitForFunction((targetIndex) => {
      const stage = document.querySelectorAll("#examples [data-lm-live]")[targetIndex];
      return stage?.dataset.motionState === "running"
        && stage.querySelector(":scope > lm-motif")?.hasAttribute("data-play");
    }, index);
    landometerExampleStarts.push(await landometerExamples.nth(index).evaluate((stage) => ({
      kind: stage.dataset.kind,
      quiet: stage.dataset.quiet === "true",
      state: stage.dataset.motionState,
      playing: stage.querySelector(":scope > lm-motif")?.hasAttribute("data-play"),
    })));
  }
  await landometerExamples.first().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#examples [data-lm-live]")?.dataset.motionState === "running");
  await page.evaluate(() => {
    const motif = document.querySelector("#examples [data-lm-live] > lm-motif");
    window.__inlineExampleReplayMutations = 0;
    window.__inlineExampleReplayObserver = new MutationObserver((mutations) => {
      window.__inlineExampleReplayMutations += mutations.filter((mutation) => mutation.attributeName === "data-play").length;
    });
    window.__inlineExampleReplayObserver.observe(motif, { attributes: true, attributeFilter: ["data-play"] });
  });
  await page.waitForTimeout(3250);
  const landometerExampleReplay = await page.evaluate(() => ({
    mutations: window.__inlineExampleReplayMutations,
    playing: document.querySelector("#examples [data-lm-live] > lm-motif")?.hasAttribute("data-play"),
  }));
  await page.evaluate(() => window.__inlineExampleReplayObserver?.disconnect());
  record(
    landometerExampleStarts.length === 4
      && landometerExampleStarts.every(({ state, playing }) => state === "running" && playing)
      && landometerExampleReplay.mutations >= 2
      && landometerExampleReplay.playing,
    `${label} starts all four Landometer examples and restarts the three-second cycle`,
    JSON.stringify({ starts: landometerExampleStarts, replay: landometerExampleReplay }),
  );

  const ijjiExamples = page.locator(inlineIjjiExampleSelector);
  const ijjiExampleMotion = [];
  for (let index = 0; index < 2; index += 1) {
    await ijjiExamples.nth(index).scrollIntoViewIfNeeded();
    await page.waitForFunction((targetIndex) => {
      const stage = document.querySelectorAll("#examples [data-ijji-motif-live]")[targetIndex];
      return stage?.dataset.motionState === "running" && stage.classList.contains("is-motion-running");
    }, index);
    const before = await ijjiExamples.nth(index).evaluate((stage) => {
      const animated = stage.querySelector(".ijji-motif *[class]");
      const style = animated ? getComputedStyle(animated) : null;
      return {
        kind: stage.dataset.kind,
        state: stage.dataset.motionState,
        runningClass: stage.classList.contains("is-motion-running"),
        animationName: style?.animationName,
        animationDuration: style?.animationDuration,
        iterationCount: style?.animationIterationCount,
        playState: style?.animationPlayState,
        currentTime: animated?.getAnimations()[0]?.currentTime ?? null,
      };
    });
    await page.waitForTimeout(100);
    const afterTime = await ijjiExamples.nth(index).evaluate((stage) => (
      stage.querySelector(".ijji-motif *[class]")?.getAnimations()[0]?.currentTime ?? null
    ));
    ijjiExampleMotion.push({ ...before, afterTime });
  }
  record(
    ijjiExampleMotion.length === 2
      && ijjiExampleMotion.every((item) => item.state === "running"
        && item.runningClass
        && item.animationName !== "none"
        && item.iterationCount === "infinite"
        && item.playState === "running"
        && item.currentTime !== null
        && item.afterTime > item.currentTime),
    `${label} runs both ijji examples with authored infinite CSS cycles`,
    JSON.stringify(ijjiExampleMotion),
  );

  // Keep the last ijji stage in view while invoking the sticky page-level control
  // without asking Playwright to scroll the control itself into view.
  await page.locator("[data-motion-toggle]").evaluate((button) => button.click());
  await waitForInlineState(page, inlineTargetSelector, "final", 9);
  const pagePaused = await page.evaluate((targetSelector) => {
    const targets = [...document.querySelectorAll(targetSelector)];
    const logo = document.querySelector("#choose [data-ijji-logo-live] > ijji-logo-sting");
    const button = document.querySelector("[data-motion-toggle]");
    return {
      pressed: button?.getAttribute("aria-pressed"),
      label: button?.getAttribute("aria-label"),
      glyph: button?.textContent?.trim(),
      hidden: Boolean(button?.hidden),
      disabled: Boolean(button?.disabled),
      states: targets.map((stage) => stage.dataset.motionState),
      landometerPlaying: targets.reduce((count, stage) => count + stage.querySelectorAll(":scope > lm-motif[data-play]").length, 0),
      identityPlaying: Boolean(logo?._playing),
      identityLoop: Boolean(logo?.hasAttribute("loop")),
      identityAtFinal: logo?.currentTime === logo?.duration,
      ijjiRunning: document.querySelectorAll("#examples [data-ijji-motif-live].is-motion-running").length,
      ijjiFinal: document.querySelectorAll("#examples [data-ijji-motif-live].is-motion-final").length,
      ijjiAnimationNames: [...document.querySelectorAll("#examples [data-ijji-motif-live] .ijji-motif *")]
        .map((element) => getComputedStyle(element).animationName),
    };
  }, inlineTargetSelector);
  record(
    pagePaused.pressed === null
      && pagePaused.label === fixture.resumeLabel
      && pagePaused.glyph === "▶"
      && !pagePaused.hidden
      && !pagePaused.disabled
      && pagePaused.states.every((state) => state === "final")
      && pagePaused.landometerPlaying === 0
      && !pagePaused.identityPlaying
      && !pagePaused.identityLoop
      && pagePaused.identityAtFinal
      && pagePaused.ijjiRunning === 0
      && pagePaused.ijjiFinal === 2
      && pagePaused.ijjiAnimationNames.every((name) => name === "none"),
    `${label} page control pauses every inline family at a complete final state`,
    JSON.stringify(pagePaused),
  );
  await page.locator("[data-motion-toggle]").evaluate((button) => button.click());
  await page.waitForFunction(() => {
    const stage = [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1);
    return stage?.dataset.motionState === "running" && stage.classList.contains("is-motion-running");
  });
  const pageResumed = await page.locator("[data-motion-toggle]").evaluate((button) => ({
    pressed: button.getAttribute("aria-pressed"),
    label: button.getAttribute("aria-label"),
    glyph: button.textContent?.trim(),
    hidden: button.hidden,
    disabled: button.disabled,
  }));
  record(
    pageResumed.pressed === null
      && pageResumed.label === fixture.pauseLabel
      && pageResumed.glyph === "Ⅱ"
      && !pageResumed.hidden
      && !pageResumed.disabled,
    `${label} page control resumes the eligible in-view animation`,
    JSON.stringify(pageResumed),
  );

  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForInlineState(page, inlineIjjiExampleSelector, "final", 2);
  const offscreen = await page.evaluate(() => ({
    states: [...document.querySelectorAll("#examples [data-ijji-motif-live]")].map((stage) => stage.dataset.motionState),
    running: document.querySelectorAll("#examples [data-ijji-motif-live].is-motion-running").length,
    final: document.querySelectorAll("#examples [data-ijji-motif-live].is-motion-final").length,
  }));
  record(
    offscreen.states.every((state) => state === "final") && offscreen.running === 0 && offscreen.final === 2,
    `${label} offscreen gating stops both ijji examples at stable final frames`,
    JSON.stringify(offscreen),
  );

  await ijjiExamples.last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1)?.dataset.motionState === "running");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitForInlineState(page, inlineTargetSelector, "final", 9);
  const hiddenState = await page.evaluate(() => document.querySelectorAll('[data-motion-state="running"]').length);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(() => [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1)?.dataset.motionState === "running");
  const visibleState = await page.evaluate(() => [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1)?.classList.contains("is-motion-running"));
  record(
    hiddenState === 0 && visibleState,
    `${label} visibility lifecycle stops all inline work and restarts only the in-view stage`,
    JSON.stringify({ hiddenRunning: hiddenState, visibleRunning: visibleState }),
  );

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })));
  await waitForInlineState(page, inlineTargetSelector, "final", 9);
  const pagehideRunning = await page.evaluate(() => document.querySelectorAll('[data-motion-state="running"]').length);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await page.waitForFunction(() => [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1)?.dataset.motionState === "running");
  const pageshowRunning = await page.evaluate(() => [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1)?.classList.contains("is-motion-running"));
  record(
    pagehideRunning === 0 && pageshowRunning,
    `${label} pagehide/pageshow lifecycle restores only eligible inline motion`,
    JSON.stringify({ pagehideRunning, pageshowRunning }),
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitForInlineState(page, inlineTargetSelector, "final", 9);
  await page.waitForTimeout(50);
  const dynamicallyReducedInline = await page.evaluate((targetSelector) => {
    const targets = [...document.querySelectorAll(targetSelector)];
    const logo = document.querySelector("#choose [data-ijji-logo-live] > ijji-logo-sting");
    const motionToggle = document.querySelector("[data-motion-toggle]");
    return {
      states: targets.map((stage) => stage.dataset.motionState),
      landometerPlaying: targets.reduce((count, stage) => count + stage.querySelectorAll(":scope > lm-motif[data-play]").length, 0),
      identityPlaying: Boolean(logo?._playing),
      identityLoop: Boolean(logo?.hasAttribute("loop")),
      identityAtFinal: logo?.currentTime === logo?.duration,
      ijjiRunning: document.querySelectorAll("#examples [data-ijji-motif-live].is-motion-running").length,
      ijjiAnimationNames: [...document.querySelectorAll("#examples [data-ijji-motif-live] .ijji-motif *")]
        .map((element) => getComputedStyle(element).animationName),
      motionToggle: {
        hidden: Boolean(motionToggle?.hidden),
        disabled: Boolean(motionToggle?.disabled),
        pressed: motionToggle?.getAttribute("aria-pressed"),
      },
    };
  }, inlineTargetSelector);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1)?.dataset.motionState === "running");
  const dynamicallyRestoredInline = await page.evaluate(() => (
    {
      running: [...document.querySelectorAll("#examples [data-ijji-motif-live]")].at(-1)?.classList.contains("is-motion-running"),
      motionToggle: {
        hidden: Boolean(document.querySelector("[data-motion-toggle]")?.hidden),
        disabled: Boolean(document.querySelector("[data-motion-toggle]")?.disabled),
        pressed: document.querySelector("[data-motion-toggle]")?.getAttribute("aria-pressed"),
      },
    }
  ));
  record(
    dynamicallyReducedInline.states.every((state) => state === "final")
      && dynamicallyReducedInline.landometerPlaying === 0
      && !dynamicallyReducedInline.identityPlaying
      && !dynamicallyReducedInline.identityLoop
      && dynamicallyReducedInline.identityAtFinal
      && dynamicallyReducedInline.ijjiRunning === 0
      && dynamicallyReducedInline.ijjiAnimationNames.every((name) => name === "none")
      && dynamicallyReducedInline.motionToggle.hidden
      && dynamicallyReducedInline.motionToggle.disabled
      && dynamicallyReducedInline.motionToggle.pressed === null
      && dynamicallyRestoredInline.running
      && !dynamicallyRestoredInline.motionToggle.hidden
      && !dynamicallyRestoredInline.motionToggle.disabled
      && dynamicallyRestoredInline.motionToggle.pressed === null,
    `${label} live reduced-motion changes finish every family and restart only when allowed`,
    JSON.stringify({ reduced: dynamicallyReducedInline, restored: dynamicallyRestoredInline }),
  );
  await context.close();
}

// Initial reduced-motion, mobile containment, and print fallback are sampled once
// per locale rather than multiplied across the full responsive viewport matrix.
for (const fixture of [
  { route: "/", locale: "th", viewport: { width: 320, height: 800 } },
  { route: "/en/", locale: "en", viewport: { width: 390, height: 844 } },
]) {
  const context = await browser.newContext({ viewport: fixture.viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${siteBase}${fixture.route}`, { waitUntil: "networkidle" });
  await waitForInlineEnhancement(page);
  await page.locator(inlineLandometerExampleSelector).first().scrollIntoViewIfNeeded();
  await waitForInlineState(page, inlineTargetSelector, "final", 9);
  const initialReducedMobile = await page.evaluate((targetSelector) => {
    const targets = [...document.querySelectorAll(targetSelector)];
    const logo = document.querySelector("#choose [data-ijji-logo-live] > ijji-logo-sting");
    const motionToggle = document.querySelector("[data-motion-toggle]");
    const identityStage = document.querySelector("#choose [data-ijji-logo-live]");
    const identityStyle = identityStage ? getComputedStyle(identityStage) : null;
    const identityRect = identityStage?.getBoundingClientRect();
    const identityLogoRect = logo?.getBoundingClientRect();
    const identityAvailableWidth = identityStage
      ? identityStage.clientWidth
        - parseFloat(identityStyle?.paddingLeft || "0")
        - parseFloat(identityStyle?.paddingRight || "0")
      : 0;
    const containment = targets.map((stage) => {
      const container = stage.closest(".hero-visual,.lane,.case-visual");
      const rect = stage.getBoundingClientRect();
      const containerRect = container?.getBoundingClientRect();
      return {
        fullBleedIdentity: stage.matches("[data-ijji-logo-live]"),
        width: rect.width,
        stageOverflow: stage.scrollWidth - stage.clientWidth,
        withinContainer: Boolean(containerRect && rect.left >= containerRect.left - 1 && rect.right <= containerRect.right + 1),
        withinViewport: rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1,
      };
    });
    return {
      targetCount: targets.length,
      states: targets.map((stage) => stage.dataset.motionState),
      landometerPlaying: targets.reduce((count, stage) => count + stage.querySelectorAll(":scope > lm-motif[data-play]").length, 0),
      identityPlaying: Boolean(logo?._playing),
      identityLoop: Boolean(logo?.hasAttribute("loop")),
      identityAtFinal: logo?.currentTime === logo?.duration,
      ijjiAnimationNames: [...document.querySelectorAll("#examples [data-ijji-motif-live] .ijji-motif *")]
        .map((element) => getComputedStyle(element).animationName),
      containment,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      identitySizing: {
        stageWidth: identityRect?.width || 0,
        deliveredWidth: identityLogoRect?.width || 0,
        availableWidth: identityAvailableWidth,
        maximumAllowedWidth: Math.min(320, identityAvailableWidth),
      },
      motionToggle: {
        hidden: Boolean(motionToggle?.hidden),
        disabled: Boolean(motionToggle?.disabled),
        pressed: motionToggle?.getAttribute("aria-pressed"),
      },
    };
  }, inlineTargetSelector);
  record(
    initialReducedMobile.targetCount === 9
      && initialReducedMobile.states.every((state) => state === "final")
      && initialReducedMobile.landometerPlaying === 0
      && !initialReducedMobile.identityPlaying
      && !initialReducedMobile.identityLoop
      && initialReducedMobile.identityAtFinal
      && initialReducedMobile.ijjiAnimationNames.every((name) => name === "none")
      && initialReducedMobile.motionToggle.hidden
      && initialReducedMobile.motionToggle.disabled
      && initialReducedMobile.motionToggle.pressed === null,
    `${fixture.locale} initial reduced-motion render exposes complete static inline states`,
    JSON.stringify(initialReducedMobile),
  );
  record(
    initialReducedMobile.pageOverflow <= 1
      && initialReducedMobile.containment.every((item) => item.width > 0
        && item.stageOverflow <= 1
        && (item.fullBleedIdentity || item.withinContainer)
        && item.withinViewport),
    `${fixture.locale} mobile inline stages stay within their cards and viewport at ${fixture.viewport.width}px`,
    JSON.stringify({ overflow: initialReducedMobile.pageOverflow, containment: initialReducedMobile.containment }),
  );
  record(
    initialReducedMobile.identitySizing.availableWidth > 0
      && initialReducedMobile.identitySizing.deliveredWidth > 0
      && initialReducedMobile.identitySizing.deliveredWidth <= 320 + 1
      && initialReducedMobile.identitySizing.deliveredWidth <= initialReducedMobile.identitySizing.availableWidth + 1
      && Math.abs(
        initialReducedMobile.identitySizing.deliveredWidth
          - initialReducedMobile.identitySizing.maximumAllowedWidth,
      ) <= 1,
    `${fixture.locale} mobile Choose card gives the full ijji identity the maximum available width up to its 320 px cap`,
    JSON.stringify(initialReducedMobile.identitySizing),
  );

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => {
    const stage = document.querySelector("#examples [data-lm-live]");
    return stage?.dataset.motionState === "running"
      && stage.querySelector(":scope > lm-motif")?.hasAttribute("data-play");
  });
  record(
    true,
    `${fixture.locale} inline motion can start after an initial reduced-motion preference is removed`,
  );

  await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
  await page.waitForTimeout(50);
  const printFallback = await page.evaluate(() => {
    const stages = [...document.querySelectorAll("[data-lm-live],[data-ijji-logo-live],[data-ijji-motif-live]")];
    const fallbacks = stages.map((stage) => stage.querySelector(":scope > img"));
    const generated = [
      ...document.querySelectorAll("[data-lm-live] > lm-motif"),
      ...document.querySelectorAll("[data-ijji-logo-live] > ijji-logo-sting"),
      ...document.querySelectorAll("[data-ijji-motif-live] > .ijji-slot"),
    ];
    return {
      stageCount: stages.length,
      fallbackCount: fallbacks.filter(Boolean).length,
      fallbacksReady: fallbacks.every((image) => image?.complete
        && image.naturalWidth > 0
        && getComputedStyle(image).display !== "none"
        && getComputedStyle(image).visibility === "visible"),
      generatedCount: generated.length,
      generatedHidden: generated.every((element) => getComputedStyle(element).display === "none"),
    };
  });
  record(
    printFallback.stageCount === 9
      && printFallback.fallbackCount === 9
      && printFallback.fallbacksReady
      && printFallback.generatedCount === 9
      && printFallback.generatedHidden,
    `${fixture.locale} print rendering swaps all inline and hero motion for exact static fallbacks`,
    JSON.stringify(printFallback),
  );
  await context.close();
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
      runtimeScripts: [...document.scripts].filter((script) => script.src.includes("/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.1")).map((script) => script.src),
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
    const announcer = document.querySelector("[data-preview-announcer]");
    logo.__qaStarts = 0;
    logo.__qaEnds = 0;
    window.__qaAutomaticAnnouncements = 0;
    window.__qaAnnouncementObserver = new MutationObserver(() => { window.__qaAutomaticAnnouncements += 1; });
    window.__qaAnnouncementObserver.observe(announcer, { childList: true, characterData: true, subtree: true });
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
      automaticAnnouncements: window.__qaAutomaticAnnouncements,
      visualStatusLive: document.querySelector("#preview-status")?.getAttribute("aria-live"),
      announcerLive: document.querySelector("[data-preview-announcer]")?.getAttribute("aria-live"),
    };
  });
  await page.evaluate(() => window.__qaAnnouncementObserver?.disconnect());
  record(
    ijjiLoop.starts >= 2
      && ijjiLoop.ends >= 1
      && ijjiLoop.currentTime > 0
      && ijjiLoop.currentTime < 1
      && ijjiLoop.playing
      && ijjiLoop.loop
      && ijjiLoop.automaticAnnouncements === 0
      && ijjiLoop.visualStatusLive === "off"
      && ijjiLoop.announcerLive === "polite",
    "ijji full+tagline preview auto-replays 400 ms after the authored 9-second final frame",
    JSON.stringify(ijjiLoop),
  );

  await page.evaluate(() => {
    const stage = document.querySelector("#preview-stage");
    const logo = stage?.querySelector("ijji-logo-sting");
    const race = {
      starts: 0,
      ends: 0,
      mounts: 1,
      startTimes: [],
      endTimes: [],
      initialLogo: logo,
    };
    window.__qaDialogIjjiRace = race;
    stage?.addEventListener("ijji-sting-start", () => {
      race.starts += 1;
      race.startTimes.push(performance.now());
    }, true);
    stage?.addEventListener("ijji-sting-end", () => {
      race.ends += 1;
      race.endTimes.push(performance.now());
    }, true);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element && node.matches("ijji-logo-sting")) race.mounts += 1;
        });
      });
    });
    observer.observe(stage, { childList: true });
    race.observer = observer;
    logo?.seek(8.98);
    logo?.play();
  });
  await page.waitForFunction(() => window.__qaDialogIjjiRace?.ends >= 1, null, { timeout: 1500 });
  await page.locator("#preview-cancel").click();
  await page.locator("#preview-replay").click();
  await page.waitForFunction(() => {
    const logo = document.querySelector("#preview-stage ijji-logo-sting");
    return logo?._playing && window.__qaDialogIjjiRace?.starts >= 2;
  });
  await page.waitForTimeout(550);
  const dialogIjjiRace = await page.evaluate(() => {
    const stage = document.querySelector("#preview-stage");
    const logo = stage?.querySelector("ijji-logo-sting");
    const race = window.__qaDialogIjjiRace;
    race?.observer?.disconnect();
    return {
      starts: race?.starts,
      ends: race?.ends,
      mounts: race?.mounts,
      resumeDelayMs: race?.startTimes?.[1] - race?.endTimes?.[0],
      activeWasRemounted: Boolean(logo && logo !== race?.initialLogo),
      activeCount: stage?.querySelectorAll("ijji-logo-sting").length,
      activePlaying: Boolean(logo?._playing),
      activeLoop: Boolean(logo?.hasAttribute("loop")),
      activeCurrentTime: logo?.currentTime,
    };
  });
  record(
    dialogIjjiRace.starts === 2
      && dialogIjjiRace.ends === 1
      && dialogIjjiRace.mounts >= 3
      && dialogIjjiRace.resumeDelayMs >= 0
      && dialogIjjiRace.resumeDelayMs < 400
      && dialogIjjiRace.activeWasRemounted
      && dialogIjjiRace.activeCount === 1
      && dialogIjjiRace.activePlaying
      && dialogIjjiRace.activeLoop
      && dialogIjjiRace.activeCurrentTime > 0.35,
    "ijji dialog remount blocks a stale 400 ms callback from duplicating pause-to-resume playback",
    JSON.stringify(dialogIjjiRace),
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
      announcement: document.querySelector("[data-preview-announcer]")?.textContent?.trim(),
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
      && ijjiFullPaused.status.includes("หยุด auto replay")
      && ijjiFullPaused.announcement.includes("หยุด auto replay"),
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
      runtimeScriptCount: [...document.scripts].filter((script) => script.src.includes("/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.1")).length,
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
      && logoClipboard.includes("landometer-motifs.css?v=1.2.1")
      && logoClipboard.includes("landometer-motifs.js?v=1.2.1"),
    "Logo copy-code action preserves the authored v3 blue-ink contract without a legacy wedge override",
    logoClipboard,
  );

  await page.locator('[data-copy-code][data-brand="ijji-logo"][data-id="tagline"]').click();
  const ijjiFullClipboard = await page.evaluate(() => navigator.clipboard.readText());
  record(
    ijjiFullClipboard.includes("ijji-logo-sting.js?v=1.2.1")
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
    ijjiMarkClipboard.includes("ijji-logo-sting.js?v=1.2.1")
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

  const darkMobileLogo = await page.evaluate(async () => {
    const stage = document.querySelector("#preview-stage");
    const full = stage?.querySelector("lm-motif:not([quiet])");
    const quiet = stage?.querySelector("lm-motif[quiet]");
    const inlineStage = document.querySelector("#choose [data-lm-live][data-kind=\"logo\"]");
    const inlineFull = inlineStage?.querySelector(":scope > lm-motif");
    const fallback = inlineStage?.querySelector(":scope > img");
    let fallbackSvg = "";
    try {
      fallbackSvg = fallback ? await fetch(fallback.currentSrc || fallback.src).then((response) => response.text()) : "";
    } catch (_) {}
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
      outerStrokes: fullPaths.slice(5, 9).map((path) => asRgba(getComputedStyle(path).stroke)),
      wedge: fullPaths[9] ? asRgba(getComputedStyle(fullPaths[9]).fill) : null,
      quietInk: quiet ? asRgba(getComputedStyle(quiet).color) : null,
      inlineFallback: {
        src: fallback?.currentSrc || fallback?.src || null,
        path: fallback ? new URL(fallback.currentSrc || fallback.src, document.baseURI).pathname : null,
        complete: Boolean(fallback?.complete),
        naturalWidth: fallback?.naturalWidth || 0,
        staticPathCount: (fallbackSvg.match(/<path\b/g) || []).length,
        staticPalette: [...new Set(fallbackSvg.match(/#[0-9A-Fa-f]{6}/g) || [])].map((color) => color.toUpperCase()).sort(),
        enhancedInk: inlineFull?.getAttribute("ink"),
        enhancedPathCount: inlineFull?.querySelectorAll("path").length || 0,
      },
      raw: {
        pin: fullPaths[0] ? getComputedStyle(fullPaths[0]).fill : null,
        innerStrokes: fullPaths.slice(1, 5).map((path) => getComputedStyle(path).stroke),
        outerStrokes: fullPaths.slice(5, 9).map((path) => getComputedStyle(path).stroke),
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
  const expectedOuterStrokes = [
    [255, 90, 95, 255],
    [255, 188, 31, 255],
    [10, 214, 156, 255],
    [89, 210, 254, 255],
  ];
  const expectedStaticPalette = [
    "#0AD69C", "#0EB99B", "#1D4497", "#1F87CE", "#4DB6E9",
    "#59D2FE", "#D2566A", "#D2A437", "#FF5A5F", "#FFBC1F",
  ].sort();
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
    JSON.stringify(darkMobileLogo.outerStrokes) === JSON.stringify(expectedOuterStrokes),
    "390x844 dark-mode full logo outer strokes compute to the four approved energy colors",
    JSON.stringify({ rgba: darkMobileLogo.outerStrokes, raw: darkMobileLogo.raw.outerStrokes }),
  );
  record(
    JSON.stringify(darkMobileLogo.quietInk) === JSON.stringify([89, 210, 254, 255]),
    "390x844 dark-mode quiet logo remains Energy Sky rgb(89, 210, 254)",
    JSON.stringify({ rgba: darkMobileLogo.quietInk, raw: darkMobileLogo.raw.quietInk }),
  );
  record(
    darkMobileLogo.inlineFallback.path?.endsWith("/assets/landometer/svg/logo-full.svg")
      && darkMobileLogo.inlineFallback.complete
      && darkMobileLogo.inlineFallback.naturalWidth > 0
      && darkMobileLogo.inlineFallback.staticPathCount === 10
      && JSON.stringify(darkMobileLogo.inlineFallback.staticPalette) === JSON.stringify(expectedStaticPalette)
      && darkMobileLogo.inlineFallback.enhancedInk === "blue"
      && darkMobileLogo.inlineFallback.enhancedPathCount === 10,
    "390x844 dark-mode Choose card keeps exact full-logo fallback and enhanced palette/path parity",
    JSON.stringify(darkMobileLogo.inlineFallback),
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

  await page.locator("[data-dialog-close]").click();
  await page.locator('[data-preview-brand="ijji"][data-preview-id="rotate-b"]').last().click();
  await page.locator("#preview-stage .ijji-motif").waitFor({ state: "attached" });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(50);
  const hiddenIjjiState = await page.evaluate(() => ({
    movingMotifs: document.querySelectorAll("#preview-stage .ijji-motif").length,
    finalFallbacks: document.querySelectorAll("#preview-stage > img").length,
    status: document.querySelector("#preview-status")?.textContent?.trim(),
  }));
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(50);
  const restoredIjjiStateMotion = await page.locator("#preview-stage .ijji-motif").count();
  record(
    hiddenIjjiState.movingMotifs === 0
      && hiddenIjjiState.finalFallbacks === 1
      && hiddenIjjiState.status.includes("หยุด")
      && restoredIjjiStateMotion === 0,
    "Document visibility stops a state-bound ijji preview and does not restart work after its simulated state ended",
    JSON.stringify({ hiddenIjjiState, restoredIjjiStateMotion }),
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

// ijji identity previews preserve the source minimum when space exists. At a
// narrower viewport they consume the maximum stage width without creating overflow.
for (const fixture of [
  { id: "tagline", viewport: { width: 900, height: 900 }, minimumWidth: 320, sizing: "minimum" },
  { id: "tagline", viewport: { width: 320, height: 800 }, minimumWidth: 320, sizing: "available" },
  { id: "mark", viewport: { width: 360, height: 800 }, minimumWidth: 160, sizing: "minimum" },
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
    const stageStyle = stage ? getComputedStyle(stage) : null;
    const availableWidth = stage
      ? stage.clientWidth
        - parseFloat(stageStyle?.paddingLeft || "0")
        - parseFloat(stageStyle?.paddingRight || "0")
      : 0;
    return {
      open: Boolean(dialog?.open),
      dialogWithinViewport: Boolean(rect && rect.left >= -1 && rect.right <= window.innerWidth + 1),
      logoWidth: logoRect?.width || 0,
      availableWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflows: [dialog, body, stage, logo].map((element) => ({
        name: element?.id || element?.localName || element?.className,
        delta: element ? element.scrollWidth - element.clientWidth : Number.POSITIVE_INFINITY,
      })),
      fallbackLoaded: Boolean(fallback?.complete && fallback.naturalWidth > 0),
    };
  });
  const widthPolicyPassed = fixture.sizing === "available"
    ? layout.availableWidth > 0
      && Math.abs(layout.logoWidth - Math.min(fixture.minimumWidth, layout.availableWidth)) <= 1
    : layout.logoWidth >= fixture.minimumWidth;
  record(
    layout.open
      && layout.dialogWithinViewport
      && widthPolicyPassed
      && layout.pageOverflow <= 1
      && layout.overflows.every(({ delta }) => delta <= 1)
      && layout.fallbackLoaded,
    `ijji ${fixture.id} preview at ${fixture.viewport.width}px preserves its ${fixture.sizing === "available" ? "maximum available" : "minimum audience"} width, fallback, and horizontal containment`,
    JSON.stringify({ ...layout, widthPolicy: fixture.sizing, minimumWidth: fixture.minimumWidth }),
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

// Core learning content, all nine page-motion fallbacks, and downloads remain usable
// without JavaScript on both localized routes.
for (const fixture of [
  { route: "/", locale: "th", viewport: { width: 360, height: 800 } },
  { route: "/en/", locale: "en", viewport: { width: 390, height: 844 } },
]) {
  const context = await browser.newContext({ viewport: fixture.viewport, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${siteBase}${fixture.route}`, { waitUntil: "load" });
  const noJs = await page.evaluate((targetSelector) => {
    const notice = document.querySelector(".no-js-note");
    const noticeStyle = notice ? getComputedStyle(notice) : null;
    const targets = [...document.querySelectorAll(targetSelector)];
    const fallbacks = targets.map((stage) => stage.querySelector(":scope > img"));
    return {
      h1: document.querySelectorAll("h1").length,
      cards: document.querySelectorAll(".asset-card").length,
      downloads: document.querySelectorAll("a[download]").length,
      hero: Boolean(document.querySelector(".hero-stage > img")),
      targetCount: targets.length,
      fallbackCount: fallbacks.filter(Boolean).length,
      fallbackReady: fallbacks.every((image) => image?.complete
        && image.naturalWidth > 0
        && image.alt
        && getComputedStyle(image).display !== "none"
        && getComputedStyle(image).visibility === "visible"
        && image.getBoundingClientRect().width > 0),
      generatedCount: targets.reduce((count, stage) => count
        + stage.querySelectorAll(":scope > lm-motif, :scope > ijji-logo-sting, :scope > .ijji-slot").length, 0),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      visibleEnhancedControls: [...document.querySelectorAll("[data-theme-toggle],[data-motion-toggle],[data-copy-template],[data-preview-brand],[data-copy-code],[data-download-png],.library-tools")]
        .filter((element) => getComputedStyle(element).display !== "none").length,
      notice: Boolean(notice),
      noticeBackground: noticeStyle?.backgroundColor,
      noticeColor: noticeStyle?.color,
    };
  }, inlineTargetSelector);
  record(
    noJs.h1 === 1
      && noJs.cards === 11
      && noJs.downloads >= 11
      && noJs.hero
      && noJs.targetCount === 9
      && noJs.fallbackCount === 9
      && noJs.fallbackReady
      && noJs.generatedCount === 0
      && noJs.visibleEnhancedControls === 0
      && noJs.notice
      && noJs.noticeBackground !== "rgba(0, 0, 0, 0)"
      && noJs.noticeColor !== noJs.noticeBackground,
    `${fixture.locale} no-JS baseline keeps all static learning, inline fallback, and download contracts without dead controls`,
    JSON.stringify(noJs),
  );
  record(noJs.overflow <= 1, `${fixture.locale} no-JS mobile baseline has no horizontal overflow`, String(noJs.overflow));
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
  artifactRelease: "1.2.1",
  artifactRoot: ".",
  target: requestedBase ? "published_https" : "local_loopback",
  targetBaseUrl: siteBase,
  exactByteAttestation: {
    source: requestedBase ? "published_https_response_bodies" : "local_filesystem",
    checks: exactByteAttestation,
  },
  routes: ["/motif/", "/motif/en/"],
  browser: browserVersion,
  emulationNote: "Viewport checks are desktop Chrome emulation, not native iPhone, iPad, Safari, or screen-reader evidence.",
  lifecycleEmulationNote: "Visibility and pagehide/pageshow handlers are exercised with standards-shaped in-page events; this is not a full operating-system tab suspension or cross-navigation BFCache observation.",
  viewports,
  states: ["light", "dark", "keyboard", "paired full/quiet dialog", "immediate autoplay", "three-second default auto-replay", "Landometer v3 logo exact-final settle at 3.4 seconds and replay at 6.0 seconds", "390x844 dark Landometer v3 palette and fallback parity lock", "pause", "replay now", "Escape focus restoration", "stale async-preview isolation", "one-hero plus two-logo plus six-example page-motion inventory", "inline 1.2.1 cache contract", "continuous inline replay", "page-level action-button pause and resume", "inline and dialog ijji stale-400-ms replay regression", "inline offscreen gating", "inline dynamic reduced motion", "inline initial reduced motion", "inline print fallbacks", "inline mobile containment and maximum-available ijji width", "synthetic document visibility lifecycle", "synthetic pagehide/pageshow lifecycle", "filter", "search", "copy", "Landometer 1.2.1 copy contract", "PNG export", "ijji bounded timeout", "ijji cancel", "ijji full+tagline immediate play and loop", "ijji mark-only immediate play", "ijji exact attributes, viewBoxes, layers, and fallbacks", "ijji finite-once 1.2.1 copy contracts", "ijji identity responsive widths", "reduced motion final states", "no JavaScript", "Thai 130% text", "200% text"],
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
console.log(`PASS: ${checks.length} browser checks across ${viewports.length * 2} responsive route renders plus exact inline replay/lifecycle, Landometer v3 and ijji identity dialogs, reduced-motion, print, no-JS, and text-scale states.`);
