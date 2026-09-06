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
        ijjiLogoRuntimeRequests: resources.filter((entry) => entry.name.includes("/assets/ijji/logo-sting/ijji-logo-sting.js")).length,
        ijjiMotifModuleRequests: resources.filter((entry) => entry.name.includes("/assets/ijji/ijji-motifs.js")).length,
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

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => {
    const logoStage = document.querySelector("[data-ijji-logo-live]");
    const logo = logoStage?.querySelector(":scope > ijji-logo-sting");
    const landometerStages = [...document.querySelectorAll("[data-lm-live]")];
    const ijjiMotifStages = [...document.querySelectorAll("[data-ijji-motif-live]")];
    return Boolean(
      logoStage?.classList.contains("is-enhanced")
      && logoStage.dataset.motionState === "final"
      && logo?.shadowRoot
      && !logo.hasAttribute("notagline")
      && landometerStages.length > 0
      && landometerStages.every((stage) => stage.querySelector(":scope > lm-motif"))
      && ijjiMotifStages.length > 0
      && ijjiMotifStages.every((stage) => stage.querySelector(":scope > .ijji-slot"))
    );
  });
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    const lifecycle = {
      startEvents: 0,
      endEvents: 0,
      componentMounts: logo ? 1 : 0,
      lastStartMs: null,
      lastEndMs: null,
      cycleDurationsMs: [],
      loopGapsMs: [],
    };
    window.__motifInlineLifecycle = lifecycle;
    // Capture on the stable stage: stop/start intentionally remounts the exact
    // component so a detached runtime cannot execute its stale 400 ms callback.
    stage?.addEventListener("ijji-sting-start", () => {
      const now = performance.now();
      lifecycle.startEvents += 1;
      if (lifecycle.lastEndMs !== null) lifecycle.loopGapsMs.push(now - lifecycle.lastEndMs);
      lifecycle.lastStartMs = now;
    }, true);
    stage?.addEventListener("ijji-sting-end", () => {
      const now = performance.now();
      lifecycle.endEvents += 1;
      if (lifecycle.lastStartMs !== null) lifecycle.cycleDurationsMs.push(now - lifecycle.lastStartMs);
      lifecycle.lastStartMs = null;
      lifecycle.lastEndMs = now;
    }, true);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element && node.matches("ijji-logo-sting")) lifecycle.componentMounts += 1;
        });
      });
    });
    observer.observe(stage, { childList: true });
    window.__motifInlineLifecycleObserver = observer;
  });

  async function inspectInlineMotion(label) {
    return page.evaluate((inspectionLabel) => {
      const resources = performance.getEntriesByType("resource");
      const logoStage = document.querySelector("[data-ijji-logo-live]");
      const logo = logoStage?.querySelector(":scope > ijji-logo-sting");
      const logoRect = logoStage?.getBoundingClientRect();
      const lifecycle = window.__motifInlineLifecycle || {};
      const logoLayerEntries = resources.filter((entry) => entry.name.includes("/assets/ijji/logo-sting/layers/"));
      return {
        label: inspectionLabel,
        pageMotionStages: document.querySelectorAll("[data-lm-live],[data-ijji-logo-live],[data-ijji-motif-live]").length,
        heroLandometerComponents: document.querySelectorAll(".hero-stage[data-lm-live] > lm-motif").length,
        logoStages: document.querySelectorAll("[data-ijji-logo-live]").length,
        inlineFullLogoComponents: document.querySelectorAll("[data-ijji-logo-live] > ijji-logo-sting:not([notagline])").length,
        inlineLogoComponents: document.querySelectorAll("[data-ijji-logo-live] > ijji-logo-sting").length,
        dialogLogoComponents: document.querySelectorAll("#preview-dialog ijji-logo-sting").length,
        documentLogoComponents: document.querySelectorAll("ijji-logo-sting").length,
        inlineLandometerComponents: document.querySelectorAll("[data-lm-live] > lm-motif").length,
        inlineIjjiMotifSlots: document.querySelectorAll("[data-ijji-motif-live] > .ijji-slot").length,
        totalDomElements: document.querySelectorAll("*").length,
        logoStageChildren: logoStage?.children.length || 0,
        logoShadowElements: logo?.shadowRoot?.querySelectorAll("*").length || 0,
        runtimeScriptElements: document.querySelectorAll('script[src*="/assets/ijji/logo-sting/ijji-logo-sting.js"]').length,
        resourceCount: resources.length,
        logoRuntimeRequests: resources.filter((entry) => entry.name.includes("/assets/ijji/logo-sting/ijji-logo-sting.js")).length,
        motifModuleRequests: resources.filter((entry) => entry.name.includes("/assets/ijji/ijji-motifs.js")).length,
        logoLayerRequests: resources.filter((entry) => entry.name.includes("/assets/ijji/logo-sting/layers/")).length,
        uniqueLogoLayerUrls: new Set(logoLayerEntries.map((entry) => entry.name)).size,
        logoLayerTransferBytes: Math.round(logoLayerEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)),
        motionState: logoStage?.dataset.motionState || null,
        manual: logo?.hasAttribute("manual") || false,
        loop: logo?.hasAttribute("loop") || false,
        notagline: logo?.hasAttribute("notagline") || false,
        surface: logo?.getAttribute("surface") || null,
        duration: logo?.duration || 0,
        currentTime: Number((logo?.currentTime || 0).toFixed(3)),
        playing: Boolean(logo?._playing),
        layout: {
          width: Number((logoRect?.width || 0).toFixed(3)),
          height: Number((logoRect?.height || 0).toFixed(3)),
          documentHeight: document.documentElement.scrollHeight,
        },
        timing: {
          cumulativeLayoutShift: Number((window.__motifPerf?.cls || 0).toFixed(4)),
          longTaskMs: Math.round(window.__motifPerf?.longTaskMs || 0),
        },
        lifecycle: {
          startEvents: lifecycle.startEvents || 0,
          endEvents: lifecycle.endEvents || 0,
          componentMounts: lifecycle.componentMounts || 0,
          cycleDurationsMs: (lifecycle.cycleDurationsMs || []).map((value) => Math.round(value)),
          loopGapsMs: (lifecycle.loopGapsMs || []).map((value) => Math.round(value)),
        },
      };
    }, label);
  }

  const inlineInitial = await inspectInlineMotion("initial_offscreen");
  await page.locator("[data-ijji-logo-live]").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return stage?.dataset.motionState === "running"
      && logo?.hasAttribute("loop")
      && logo.currentTime > 0
      && window.__motifInlineLifecycle?.startEvents >= 1;
  });
  await page.waitForLoadState("networkidle");
  const inlineActiveStart = await inspectInlineMotion("first_cycle_running");

  await page.waitForFunction(() => window.__motifInlineLifecycle?.cycleDurationsMs.length >= 2, null, { timeout: 25000 });
  const inlineAfterTwoCycles = await inspectInlineMotion("after_two_complete_cycles");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return stage?.dataset.motionState === "final" && !logo?.hasAttribute("loop") && !logo?._playing;
  });
  await page.waitForTimeout(500);
  const inlineOffscreen = await inspectInlineMotion("offscreen_final");

  const startsBeforeResume = inlineOffscreen.lifecycle.startEvents;
  await page.locator("[data-ijji-logo-live]").scrollIntoViewIfNeeded();
  await page.waitForFunction((previousStarts) => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return stage?.dataset.motionState === "running"
      && logo?.hasAttribute("loop")
      && logo?._playing
      && window.__motifInlineLifecycle?.startEvents > previousStarts;
  }, startsBeforeResume);
  const inlineResumed = await inspectInlineMotion("onscreen_resumed");

  await page.evaluate(() => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    const race = {
      starts: 0,
      ends: 0,
      startTimes: [],
      endTimes: [],
      initialLogo: logo,
    };
    window.__motifInlineRace = race;
    stage?.addEventListener("ijji-sting-start", () => {
      race.starts += 1;
      race.startTimes.push(performance.now());
    }, true);
    stage?.addEventListener("ijji-sting-end", () => {
      race.ends += 1;
      race.endTimes.push(performance.now());
    }, true);
    logo?.seek(8.98);
    logo?.play();
  });
  await page.waitForFunction(() => window.__motifInlineRace?.ends >= 1, null, { timeout: 1500 });
  await page.locator("[data-motion-toggle]").evaluate((button) => button.click());
  await page.waitForFunction(() => document.querySelector("[data-ijji-logo-live]")?.dataset.motionState === "final");
  await page.locator("[data-motion-toggle]").evaluate((button) => button.click());
  await page.waitForFunction(() => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return stage?.dataset.motionState === "running"
      && logo?._playing
      && window.__motifInlineRace?.starts >= 2;
  });
  await page.waitForTimeout(550);
  const inlineRace = await page.evaluate(() => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    const race = window.__motifInlineRace;
    return {
      starts: race?.starts || 0,
      ends: race?.ends || 0,
      resumeDelayMs: (race?.startTimes?.[1] ?? Number.POSITIVE_INFINITY)
        - (race?.endTimes?.[0] ?? 0),
      activeWasRemounted: Boolean(logo && logo !== race?.initialLogo),
      activeComponents: stage?.querySelectorAll(":scope > ijji-logo-sting").length || 0,
      playing: Boolean(logo?._playing),
      loop: Boolean(logo?.hasAttribute("loop")),
      currentTime: Number((logo?.currentTime || 0).toFixed(3)),
    };
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => {
    const stage = document.querySelector("[data-ijji-logo-live]");
    const logo = stage?.querySelector(":scope > ijji-logo-sting");
    return stage?.dataset.motionState === "final" && !logo?.hasAttribute("loop") && !logo?._playing;
  });
  const inlineFinal = await inspectInlineMotion("final_offscreen");

  const inlineLifecycle = {
    initial: inlineInitial,
    activeStart: inlineActiveStart,
    afterTwoCycles: inlineAfterTwoCycles,
    offscreen: inlineOffscreen,
    resumed: inlineResumed,
    staleTimerRace: inlineRace,
    final: inlineFinal,
  };

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
        inlineCount: document.querySelectorAll("[data-ijji-logo-live] > ijji-logo-sting").length,
        documentCount: document.querySelectorAll("ijji-logo-sting").length,
      };
    });
    await closePreviewDialog();
    return record;
  }

  const ijjiFullDialog = await inspectIjjiDialog("tagline");
  const afterFullClose = await page.evaluate(() => ({
    dialogOpen: document.querySelector("#preview-dialog").open,
    dialogLogoComponents: document.querySelectorAll("#preview-dialog ijji-logo-sting").length,
    inlineLogoComponents: document.querySelectorAll("[data-ijji-logo-live] > ijji-logo-sting").length,
    logoComponents: document.querySelectorAll("ijji-logo-sting").length,
  }));
  const ijjiMarkDialog = await inspectIjjiDialog("mark");
  const afterAllClose = await page.evaluate(() => ({
    dialogOpen: document.querySelector("#preview-dialog").open,
    dialogLogoComponents: document.querySelectorAll("#preview-dialog ijji-logo-sting").length,
    inlineLogoComponents: document.querySelectorAll("[data-ijji-logo-live] > ijji-logo-sting").length,
    logoComponents: document.querySelectorAll("ijji-logo-sting").length,
    landometerComponents: document.querySelectorAll("lm-motif").length,
    logoRuntimeRequests: performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/assets/ijji/logo-sting/ijji-logo-sting.js")).length,
    motifModuleRequests: performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/assets/ijji/ijji-motifs.js")).length,
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
    inlineLifecycle,
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
const inlineReplaySourceBounded = siteRuntime.includes("const inlineMotionControllers = [];")
  && siteRuntime.includes("inlineMotionObserver?.observe(stage);")
  && siteRuntime.includes("controller.inView = entry.isIntersecting && entry.intersectionRatio >= 0.14;")
  && siteRuntime.includes('&& document.visibilityState === "visible"')
  && siteRuntime.includes("&& !reducedMotionPreference?.matches")
  && siteRuntime.includes("&& !inlineMotionPaused;")
  && siteRuntime.includes('motionToggle?.addEventListener("click"')
  && siteRuntime.includes('motionToggle.removeAttribute("aria-pressed")')
  && siteRuntime.includes("motionToggle.hidden = isReduced;")
  && siteRuntime.includes("motionToggle.disabled = isReduced;")
  && siteRuntime.includes('window.addEventListener("pagehide"')
  && siteRuntime.includes('window.addEventListener("pageshow"');
const ijjiRemountSourceBounded = siteRuntime.includes("const previous = logo;")
  && siteRuntime.includes("previous.removeAttribute(\"loop\");")
  && siteRuntime.includes("previous.pause?.();")
  && siteRuntime.includes("previous.remove();")
  && siteRuntime.includes("const current = mount();")
  && siteRuntime.includes("disposeIjjiLogoPreview();")
  && siteRuntime.includes("const logo = mountIjjiLogoPreview(config);");
const dialogReplaySourceBounded = siteRuntime.includes('previewConfig?.brand !== "landometer"')
  && siteRuntime.includes('config?.brand !== "ijji-logo"')
  && (siteRuntime.match(/!dialog\?\.open/g) || []).length >= 2
  && (siteRuntime.match(/document\.visibilityState !== "visible"/g) || []).length >= 2
  && (siteRuntime.match(/reducedMotionPreference\?\.matches/g) || []).length >= 2
  && siteRuntime.includes('dialog?.addEventListener("close"')
  && siteRuntime.includes('window.addEventListener("pagehide"')
  && siteRuntime.includes("stopIjjiLogoAutoreplay({ finish: false })")
  && siteRuntime.includes("stopLandometerAutoreplay();");

const inlineBaseline = inspection.inlineLifecycle.activeStart;
const inlineLifecycleSnapshots = [
  inspection.inlineLifecycle.afterTwoCycles,
  inspection.inlineLifecycle.offscreen,
  inspection.inlineLifecycle.resumed,
  inspection.inlineLifecycle.final,
];
const inlineCountsAndRequestsStable = inlineLifecycleSnapshots.every((snapshot) => (
  snapshot.pageMotionStages === inlineBaseline.pageMotionStages
  && snapshot.heroLandometerComponents === inlineBaseline.heroLandometerComponents
  && snapshot.logoStages === inlineBaseline.logoStages
  && snapshot.inlineFullLogoComponents === inlineBaseline.inlineFullLogoComponents
  && snapshot.inlineLogoComponents === inlineBaseline.inlineLogoComponents
  && snapshot.dialogLogoComponents === inlineBaseline.dialogLogoComponents
  && snapshot.documentLogoComponents === inlineBaseline.documentLogoComponents
  && snapshot.inlineLandometerComponents === inlineBaseline.inlineLandometerComponents
  && snapshot.inlineIjjiMotifSlots === inlineBaseline.inlineIjjiMotifSlots
  && snapshot.totalDomElements === inlineBaseline.totalDomElements
  && snapshot.logoStageChildren === inlineBaseline.logoStageChildren
  && snapshot.logoShadowElements === inlineBaseline.logoShadowElements
  && snapshot.runtimeScriptElements === inlineBaseline.runtimeScriptElements
  && snapshot.logoRuntimeRequests === inlineBaseline.logoRuntimeRequests
  && snapshot.motifModuleRequests === inlineBaseline.motifModuleRequests
  && snapshot.uniqueLogoLayerUrls === inlineBaseline.uniqueLogoLayerUrls
  && snapshot.logoLayerTransferBytes === inlineBaseline.logoLayerTransferBytes
));
const inlineRemountLifecycleObserved = inspection.inlineLifecycle.offscreen.lifecycle.componentMounts
  > inspection.inlineLifecycle.afterTwoCycles.lifecycle.componentMounts
  && inspection.inlineLifecycle.resumed.lifecycle.componentMounts
    > inspection.inlineLifecycle.offscreen.lifecycle.componentMounts
  && inspection.inlineLifecycle.final.lifecycle.componentMounts
    > inspection.inlineLifecycle.resumed.lifecycle.componentMounts;
const inlineLayoutStable = inlineLifecycleSnapshots.every((snapshot) => (
  Math.abs(snapshot.layout.width - inlineBaseline.layout.width) <= 0.5
  && Math.abs(snapshot.layout.height - inlineBaseline.layout.height) <= 0.5
  && snapshot.layout.documentHeight === inlineBaseline.layout.documentHeight
));
const observedFullCycleDurations = inspection.inlineLifecycle.afterTwoCycles.lifecycle.cycleDurationsMs.slice(0, 2);
const observedLoopGap = inspection.inlineLifecycle.afterTwoCycles.lifecycle.loopGapsMs[0];
const inlineCycleTimingStable = observedFullCycleDurations.length === 2
  && observedFullCycleDurations.every((duration) => duration >= 8900 && duration <= 10000)
  && observedLoopGap >= 300
  && observedLoopGap <= 800;
const lifecycleLongTaskDeltaMs = Math.max(
  0,
  inspection.inlineLifecycle.final.timing.longTaskMs - inlineBaseline.timing.longTaskMs,
);
const staleTimerRacePassed = inspection.inlineLifecycle.staleTimerRace.starts === 2
  && inspection.inlineLifecycle.staleTimerRace.ends === 1
  && inspection.inlineLifecycle.staleTimerRace.resumeDelayMs >= 0
  && inspection.inlineLifecycle.staleTimerRace.resumeDelayMs < 400
  && inspection.inlineLifecycle.staleTimerRace.activeWasRemounted
  && inspection.inlineLifecycle.staleTimerRace.activeComponents === 1
  && inspection.inlineLifecycle.staleTimerRace.playing
  && inspection.inlineLifecycle.staleTimerRace.loop
  && inspection.inlineLifecycle.staleTimerRace.currentTime > 0.35;

const checks = [
  { name: "zero failed HTTP responses", passed: failedResponses.length === 0, detail: failedResponses },
  { name: "no duplicate resource URLs on cold visit", passed: cold.duplicateUrls.length === 0, detail: cold.duplicateUrls },
  { name: "no duplicate resource URLs on repeat visit", passed: repeat.duplicateUrls.length === 0, detail: repeat.duplicateUrls },
  {
    name: "each navigation requests the ijji identity runtime and motif module exactly once",
    passed: cold.ijjiLogoRuntimeRequests === 1
      && cold.ijjiMotifModuleRequests === 1
      && repeat.ijjiLogoRuntimeRequests === 1
      && repeat.ijjiMotifModuleRequests === 1,
    detail: {
      cold: { logoRuntime: cold.ijjiLogoRuntimeRequests, motifModule: cold.ijjiMotifModuleRequests },
      repeat: { logoRuntime: repeat.ijjiLogoRuntimeRequests, motifModule: repeat.ijjiMotifModuleRequests },
    },
  },
  {
    name: "local CLS stays at or below 0.1 through inline replay and scroll lifecycle",
    passed: cold.timing.cumulativeLayoutShift <= 0.1
      && inspection.inlineLifecycle.final.timing.cumulativeLayoutShift <= 0.1,
    detail: {
      cold: cold.timing.cumulativeLayoutShift,
      lifecycleFinal: inspection.inlineLifecycle.final.timing.cumulativeLayoutShift,
    },
  },
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
    name: "nine scoped page-motion stages start with one complete inline ijji full logo fallback",
    passed: indexHtml.match(/data-ijji-logo-live/g)?.length === 1
      && inspection.inlineLifecycle.initial.pageMotionStages === 9
      && inspection.inlineLifecycle.initial.heroLandometerComponents === 1
      && inspection.inlineLifecycle.initial.inlineLandometerComponents === 6
      && inspection.inlineLifecycle.initial.inlineIjjiMotifSlots === 2
      && inspection.inlineLifecycle.initial.logoStages === 1
      && inspection.inlineLifecycle.initial.inlineFullLogoComponents === 1
      && inspection.inlineLifecycle.initial.inlineLogoComponents === 1
      && inspection.inlineLifecycle.initial.documentLogoComponents === 1
      && inspection.inlineLifecycle.initial.dialogLogoComponents === 0
      && inspection.inlineLifecycle.initial.manual
      && !inspection.inlineLifecycle.initial.loop
      && !inspection.inlineLifecycle.initial.notagline
      && inspection.inlineLifecycle.initial.surface === "brand-blue"
      && inspection.inlineLifecycle.initial.duration === 9
      && inspection.inlineLifecycle.initial.currentTime === 9
      && inspection.inlineLifecycle.initial.motionState === "final"
      && inspection.inlineLifecycle.initial.lifecycle.componentMounts === 1,
    detail: inspection.inlineLifecycle.initial,
  },
  {
    name: "inline ijji full logo completes two exact-runtime cycles before scroll suspension and resume",
    passed: ijjiTimingSourceExact
      && ijjiRemountSourceBounded
      && inlineCycleTimingStable
      && inspection.inlineLifecycle.afterTwoCycles.lifecycle.startEvents >= 2
      && inspection.inlineLifecycle.afterTwoCycles.lifecycle.endEvents >= 2
      && inspection.inlineLifecycle.offscreen.motionState === "final"
      && !inspection.inlineLifecycle.offscreen.loop
      && !inspection.inlineLifecycle.offscreen.playing
      && inspection.inlineLifecycle.offscreen.currentTime === 9
      && inspection.inlineLifecycle.resumed.motionState === "running"
      && inspection.inlineLifecycle.resumed.loop
      && inspection.inlineLifecycle.resumed.playing
      && inspection.inlineLifecycle.resumed.lifecycle.startEvents > inspection.inlineLifecycle.offscreen.lifecycle.startEvents
      && inspection.inlineLifecycle.final.motionState === "final"
      && !inspection.inlineLifecycle.final.loop
      && !inspection.inlineLifecycle.final.playing,
    detail: {
      sourceExact: ijjiTimingSourceExact,
      observedFullCycleDurations,
      observedLoopGap,
      lifecycle: inspection.inlineLifecycle,
    },
  },
  {
    name: "inline ijji pause-to-resume remount defeats the stale 400 ms runtime callback",
    passed: ijjiRemountSourceBounded && staleTimerRacePassed,
    detail: {
      sourceRemountBounded: ijjiRemountSourceBounded,
      race: inspection.inlineLifecycle.staleTimerRace,
    },
  },
  {
    name: "inline replay and remount lifecycle keep DOM, runtime requests, transfer, and layout geometry stable",
    passed: inlineCountsAndRequestsStable
      && inlineLayoutStable
      && inlineRemountLifecycleObserved
      && inlineBaseline.logoRuntimeRequests === 1
      && inlineBaseline.motifModuleRequests === 1
      && inspection.inlineLifecycle.final.timing.cumulativeLayoutShift <= 0.1
      && lifecycleLongTaskDeltaMs <= 100,
    detail: {
      countsAndRequestsStable: inlineCountsAndRequestsStable,
      layoutStable: inlineLayoutStable,
      remountLifecycleObserved: inlineRemountLifecycleObserved,
      lifecycleLongTaskDeltaMs,
      baseline: inlineBaseline,
      snapshots: inlineLifecycleSnapshots,
    },
  },
  {
    name: "inline and dialog replay retain scoped visibility, reduced-motion, close, and pagehide bounds",
    passed: inlineReplaySourceBounded
      && dialogReplaySourceBounded
      && ijjiRemountSourceBounded
      && inspection.landometerDialog.dialogLocalCount === 2
      && inspection.landometerDialog.documentCount === inlineBaseline.inlineLandometerComponents + 2
      && inspection.ijjiFullDialog.dialogLocalCount === 1
      && inspection.ijjiFullDialog.inlineCount === 1
      && inspection.ijjiFullDialog.documentCount === inlineBaseline.inlineLogoComponents + 1
      && inspection.ijjiMarkDialog.dialogLocalCount === 1
      && inspection.ijjiMarkDialog.inlineCount === 1
      && inspection.ijjiMarkDialog.documentCount === inlineBaseline.inlineLogoComponents + 1
      && inspection.ijjiFullDialog.manual
      && inspection.ijjiFullDialog.loop
      && inspection.ijjiFullDialog.surface === "brand-blue"
      && !inspection.ijjiFullDialog.notagline
      && inspection.ijjiMarkDialog.manual
      && inspection.ijjiMarkDialog.loop
      && inspection.ijjiMarkDialog.notagline
      && !inspection.afterFullClose.dialogOpen
      && inspection.afterFullClose.dialogLogoComponents === 0
      && inspection.afterFullClose.inlineLogoComponents === 1
      && inspection.afterFullClose.logoComponents === 1
      && !inspection.afterAllClose.dialogOpen
      && inspection.afterAllClose.dialogLogoComponents === 0
      && inspection.afterAllClose.inlineLogoComponents === 1
      && inspection.afterAllClose.logoComponents === 1
      && inspection.afterAllClose.landometerComponents === inlineBaseline.inlineLandometerComponents
      && inspection.afterAllClose.logoRuntimeRequests === 1
      && inspection.afterAllClose.motifModuleRequests === 1,
    detail: {
      inlineSourceBounded: inlineReplaySourceBounded,
      dialogSourceBounded: dialogReplaySourceBounded,
      remountSourceBounded: ijjiRemountSourceBounded,
      inspection,
    },
  },
];
const failed = checks.filter((check) => !check.passed);
const report = {
  schemaVersion: "motif-library-performance-qa/1.2",
  executedAt: new Date().toISOString(),
  artifactRelease: "1.2.1",
  artifactRoot: ".",
  browser: browserVersion,
  route: "/motif/",
  evidenceBoundary: "Local synthetic timing is diagnostic evidence only. It is not field p75 Core Web Vitals and does not predict GitHub Pages or end-user network performance. Page motion checks attest nine governed stages, two observed ijji full-logo cycles, offscreen/resume remounts, and one forced pause-to-resume race inside the 400 ms hold at 1440x900; source timing and lifecycle checks do not replace audience-view visual QA.",
  paintRisk: "bounded gradients and page-scoped auto-replay. Six Landometer stages, one ijji full identity, and two ijji state motifs retain complete static fallbacks; IntersectionObserver, page visibility, reduced motion, pagehide, and the page motion action control bound active work. The ijji full logo runs 9000 ms with the exact runtime's 400 ms hold-to-loop gap; mark-only remains 6400 ms in its dialog preview. Stop/start deliberately remounts the identity component so detached callbacks cannot restart it, while the exact runtime and motif module each load once per navigation.",
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
console.log(`PASS: ${checks.length} release 1.2.1 performance/loading checks. Cold ${cold.requestCount} requests / ${cold.transferBytes} transfer bytes; repeat ${repeat.zeroTransferResourceCount} zero-transfer cache hits; report ${shouldWriteReport ? "written" : "not written"}.`);
