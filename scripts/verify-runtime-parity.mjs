import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "..");
const shouldWriteReport = process.env.MOTIF_QA_WRITE !== "0";

const paths = {
  landometerCss: "assets/landometer/landometer-motifs.css",
  landometerJs: "assets/landometer/landometer-motifs.js",
  ijjiJs: "assets/ijji/logo-sting/ijji-logo-sting.js",
  ijjiLayers: "assets/ijji/logo-sting/layers",
};

const expectedSourceHashes = {
  [paths.landometerCss]: "7cc2deb475a8d6e4af331407b2b4b741716c458a8ce885e2fb2859374b93912e",
  [paths.landometerJs]: "3a5caef7918a85885b61dd53e049ea8bf2b0a3cea508f587bb14970bfe6deaf2",
  [paths.ijjiJs]: "1a1d1bc247b5deb92aa19e4d84524ac1f823454a9401b6ce53acf8716010433e",
};

const expectedIjjiFiles = {
  "i-1.png": "df5fb769b2bcf84a5bbb64a5b7be424463b3883632b722cebc5d9c4a29362ac6",
  "i-2.png": "857ca5198e350fd02f644d492f1b7b0b14b9cacb9f2dd21f2031788678ce80f5",
  "ijji-logo-still.png": "bb1bc80e0c79a10dedb1b48c39efd187e97fe429adec4917975e265f610ccaac",
  "ijji-mark-still.png": "acac2c65b1a17c1956686c3fdbb2a0a6dc3c547c35be1ca128675d28b0ffc630",
  "jj.png": "cb2743b05ee7d3270bef5e5f5a5bec2916e6fe6b1e99d85793ebbd1ec398dd93",
  "tag-1-1.png": "6b51513e93df40e2a00b928d606373e688a3b6dd9e6869a6e803a7bef5ab7784",
  "tag-1-2.png": "fb72390fe3125ed5c5ab9c2bafd03fb71cb74e751ebd7f14737ac7c0367117fa",
  "tag-1-3.png": "5e01f5a2303ba67e18e69153003ba1f363e6eb1c80b67aa68115b8e434072ff0",
  "tag-2-1.png": "2e4529e6961ffa9508ae12e4346cba6870f009cc4851e2a9c613e69ef7999cf8",
  "tag-2-2.png": "ea066302ab3f407d258260f85ba19cd184b5ddbfa313f1f480726639b9ef3713",
  "tag-2-3.png": "3821e99ab1ff83edc12b95e06c2d2fc2cd1019905900a8f15fc57481b7d367c4",
};

const expectedLandometerTimelinesMs = {
  "dial-full": 1260,
  "dial-quiet": 1260,
  "slice-full": 1220,
  "slice-quiet": 1220,
  "rings-full": 1660,
  "rings-quiet": 1820,
  "layers-full": 1460,
  "layers-quiet": 1320,
  "cultivate-full": 2260,
  "cultivate-quiet": 2080,
  "logo-full": 2870,
  "logo-quiet": 3360,
};

const expectedLandometerKinds = ["dial", "slice", "rings", "layers", "cultivate", "logo"];
const landometerCss = fs.readFileSync(path.join(root, paths.landometerCss), "utf8");
const landometerRuntime = fs.readFileSync(path.join(root, paths.landometerJs), "utf8");
const siteRuntime = fs.readFileSync(path.join(root, "site.js"), "utf8");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const actualSourceHashes = Object.fromEntries(
  Object.keys(expectedSourceHashes).map((relativePath) => [relativePath, sha256(fs.readFileSync(path.join(root, relativePath)))]),
);

const actualIjjiFiles = Object.fromEntries(
  fs.readdirSync(path.join(root, paths.ijjiLayers), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => [entry.name, sha256(fs.readFileSync(path.join(root, paths.ijjiLayers, entry.name)))])
    .sort(([a], [b]) => a.localeCompare(b)),
);

function pngDimensions(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const logoBandSrgb = {
  "color-mix(in srgb, #FF5A5F 80%, #1D4497)": "#D2566A",
  "color-mix(in srgb, #FFBC1F 80%, #1D4497)": "#D2A437",
  "color-mix(in srgb, #0AD69C 80%, #1D4497)": "#0EB99B",
  "color-mix(in srgb, #59D2FE 80%, #1D4497)": "#4DB6E9",
};

function portableLandometerSvg(runtimeMarkup, quiet) {
  const color = quiet ? "#59D2FE" : "#1D4497";
  let svg = runtimeMarkup
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replaceAll("var(--energy-coral,#FF5A5F)", "#FF5A5F")
    .replaceAll("var(--energy-yellow,#FFBC1F)", "#FFBC1F")
    .replaceAll("var(--energy-mint,#0AD69C)", "#0AD69C")
    .replaceAll("var(--energy-sky,#59D2FE)", "#59D2FE")
    .replaceAll("var(--lm-wedge, #3F93D1)", "#1F87CE")
    .replaceAll("currentColor", color);
  for (const [mix, srgb] of Object.entries(logoBandSrgb)) svg = svg.replaceAll(mix, srgb);
  return svg
    .replace(/ style="stroke:(#[A-Fa-f0-9]{6});[^"]*"/g, ' stroke="$1"')
    .replace(/ class="lm-step"/g, ' transform="translate(12 -12)" class="lm-step"')
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/\sstyle="[^"]*--lm-[^"]*"/g, "");
}

function mimeFor(file) {
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  }[path.extname(file).toLowerCase()] || "application/octet-stream";
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname === "/__runtime_qa__") {
    const body = "<!doctype html><html><head><meta charset=\"utf-8\"></head><body></body></html>";
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": Buffer.byteLength(body) });
    response.end(body);
    return;
  }
  const relative = pathname.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  if (!candidate.startsWith(`${root}${path.sep}`) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "content-type": mimeFor(candidate),
    "content-length": fs.statSync(candidate).size,
    "cache-control": "no-cache",
  });
  fs.createReadStream(candidate).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let browser;
let browserVersion = null;
let landometerComputed;
let ijjiComputed;
let ijjiFidelity;
const failedResponses = [];

async function comparePngBuffers(page, first, second) {
  return page.evaluate(async ([firstBase64, secondBase64]) => {
    async function decode(base64) {
      const response = await fetch(`data:image/png;base64,${base64}`);
      return createImageBitmap(await response.blob());
    }
    const [a, b] = await Promise.all([decode(firstBase64), decode(secondBase64)]);
    if (a.width !== b.width || a.height !== b.height) {
      return { widthA: a.width, heightA: a.height, widthB: b.width, heightB: b.height, comparable: false };
    }
    const canvas = document.createElement("canvas");
    canvas.width = a.width;
    canvas.height = a.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(a, 0, 0);
    const pixelsA = context.getImageData(0, 0, a.width, a.height).data;
    context.clearRect(0, 0, a.width, a.height);
    context.drawImage(b, 0, 0);
    const pixelsB = context.getImageData(0, 0, b.width, b.height).data;
    let absoluteDifference = 0;
    let changedPixels = 0;
    for (let pixel = 0; pixel < pixelsA.length; pixel += 4) {
      let changed = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const difference = Math.abs(pixelsA[pixel + channel] - pixelsB[pixel + channel]);
        absoluteDifference += difference;
        if (difference > 16) changed = true;
      }
      if (changed) changedPixels += 1;
    }
    const pixelCount = a.width * a.height;
    return {
      comparable: true,
      width: a.width,
      height: a.height,
      meanAbsoluteChannelDifferenceOf255: Number((absoluteDifference / pixelsA.length).toFixed(3)),
      changedPixelRatioOver16: Number((changedPixels / pixelCount).toFixed(5)),
    };
  }, [first.toString("base64"), second.toString("base64")]);
}

async function inspectIjjiVariant(page, { markOnly, width, height, fallback }) {
  await page.evaluate(({ originValue, mark, frameWidth, frameHeight }) => {
    document.body.innerHTML = "";
    document.body.style.cssText = "margin:0;background:#1D4497";
    const frame = document.createElement("div");
    frame.id = "qa-frame";
    frame.style.cssText = `width:${frameWidth}px;height:${frameHeight}px;overflow:hidden;background:#1D4497`;
    const logo = document.createElement("ijji-logo-sting");
    logo.id = "qa-logo";
    logo.setAttribute("manual", "");
    logo.setAttribute("assets", `${originValue}/assets/ijji/logo-sting/layers/`);
    logo.setAttribute("bounce", mark ? "extra" : "playful");
    if (mark) logo.setAttribute("notagline", "");
    else logo.setAttribute("surface", "brand-blue");
    logo.style.width = "100%";
    frame.append(logo);
    document.body.append(frame);
    logo.finish();
  }, { originValue: origin, mark: markOnly, frameWidth: width, frameHeight: height });

  await page.waitForFunction(() => {
    const logo = document.querySelector("#qa-logo");
    const images = [...(logo?.shadowRoot?.querySelectorAll("image") || [])];
    return images.length === 9 && images.every((image) => image.href.baseVal);
  });
  await page.waitForTimeout(250);

  const record = await page.evaluate(() => {
    const logo = document.querySelector("#qa-logo");
    const root = logo.shadowRoot;
    const snapshot = () => ({
      time: logo.currentTime,
      pieceOpacities: [...root.querySelectorAll("image")].slice(0, 3).map((node) => Number(node.getAttribute("opacity"))),
      wordOpacities: [...root.querySelectorAll("image")].slice(3).map((node) => Number(node.getAttribute("opacity"))),
      headTransforms: [...root.querySelectorAll("circle")].map((node) => node.getAttribute("transform")),
    });
    logo.seek(0);
    const start = snapshot();
    logo.seek(3.8);
    const bodiesComplete = snapshot();
    logo.finish();
    const final = snapshot();
    const svg = root.querySelector("svg");
    return {
      duration: logo.duration,
      currentTime: logo.currentTime,
      notagline: logo.hasAttribute("notagline"),
      surface: logo.getAttribute("surface"),
      surfaceFill: root.querySelector("rect").getAttribute("fill"),
      viewBox: svg.getAttribute("viewBox"),
      ariaLabel: svg.getAttribute("aria-label"),
      pieceCount: logo._pieces.length,
      headCount: logo._heads.length,
      wordCount: logo._words.length,
      hiddenWordCount: logo._words.filter((node) => node.getAttribute("display") === "none").length,
      layerFiles: [...root.querySelectorAll("image")].map((node) => new URL(node.href.baseVal).pathname.split("/").at(-1)),
      methods: ["play", "pause", "seek", "finish", "replay"].filter((name) => typeof logo[name] === "function"),
      start,
      bodiesComplete,
      final,
    };
  });

  const componentPng = await page.locator("#qa-frame").screenshot();
  await page.evaluate(({ originValue, filename }) => {
    const frame = document.querySelector("#qa-frame");
    const image = document.createElement("img");
    image.id = "qa-fallback";
    image.src = `${originValue}/assets/ijji/logo-sting/layers/${filename}`;
    image.style.cssText = "display:block;width:100%;height:100%";
    frame.replaceChildren(image);
  }, { originValue: origin, filename: fallback });
  await page.locator("#qa-fallback").evaluate((image) => image.complete ? Promise.resolve() : image.decode());
  const fallbackPng = await page.locator("#qa-frame").screenshot();
  return { record, fidelity: await comparePngBuffers(page, componentPng, fallbackPng) };
}

try {
  browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}),
  });
  browserVersion = browser.version();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1200 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => failedResponses.push(`FAILED ${request.url()} ${request.failure()?.errorText || ""}`));
  await page.goto(`${origin}/__runtime_qa__`, { waitUntil: "load" });
  await page.addStyleTag({ content: landometerCss });
  await page.addScriptTag({ content: landometerRuntime });

  landometerComputed = await page.evaluate(async () => {
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

    const variants = {};
    for (const kind of window.LandometerMotifs.kinds) {
      for (const quiet of [false, true]) {
        const key = `${kind}-${quiet ? "quiet" : "full"}`;
        const element = document.createElement("lm-motif");
        element.setAttribute("kind", kind);
        element.setAttribute("autoplay", "false");
        element.style.width = "600px";
        if (quiet) element.setAttribute("quiet", "");
        else element.setAttribute("ink", "blue");
        document.body.append(element);
        const svg = element.querySelector("svg");
        const geometry = [...svg.querySelectorAll("path,rect,circle")];
        const final = {
          markup: window.LandometerMotifs.svg(kind, quiet),
          geometryCount: geometry.length,
          pathCount: svg.querySelectorAll("path").length,
          rectCount: svg.querySelectorAll("rect").length,
          circleCount: svg.querySelectorAll("circle").length,
          paints: geometry.map((node) => ({
            fill: getComputedStyle(node).fill === "none" ? null : toHex(getComputedStyle(node).fill),
            stroke: getComputedStyle(node).stroke === "none" ? null : toHex(getComputedStyle(node).stroke),
            fillOpacity: getComputedStyle(node).fillOpacity,
            strokeOpacity: getComputedStyle(node).strokeOpacity,
          })),
        };
        element.setAttribute("data-play", "");
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const animations = element.getAnimations({ subtree: true }).map((animation) => ({
          name: animation.animationName || null,
          endTimeMs: Number(animation.effect.getComputedTiming().endTime),
        }));
        variants[key] = {
          ...final,
          animationCount: animations.length,
          animations,
          timelineEndMs: Math.max(0, ...animations.map((animation) => animation.endTimeMs)),
        };
        element.remove();
      }
    }

    function inspectPresentedLogo(theme, quiet) {
      if (theme === "dark") document.documentElement.dataset.theme = "dark";
      else document.documentElement.removeAttribute("data-theme");
      const element = document.createElement("lm-motif");
      element.setAttribute("kind", "logo");
      element.setAttribute("autoplay", "false");
      if (quiet) element.setAttribute("quiet", "");
      else element.setAttribute("ink", "blue");
      document.body.append(element);
      const geometry = [...element.querySelectorAll("path,rect,circle")];
      const record = {
        theme,
        quiet,
        hostInk: element.getAttribute("ink"),
        inlineWedge: element.style.getPropertyValue("--lm-wedge"),
        hostColorHex: toHex(getComputedStyle(element).color),
        wedgeFillHex: quiet ? null : toHex(getComputedStyle(geometry.at(-1)).fill),
        geometryCount: geometry.length,
      };
      element.remove();
      return record;
    }

    const previews = {
      fullLight: inspectPresentedLogo("light", false),
      fullDark: inspectPresentedLogo("dark", false),
      quietLight: inspectPresentedLogo("light", true),
      quietDark: inspectPresentedLogo("dark", true),
    };
    document.documentElement.removeAttribute("data-theme");
    return { kinds: window.LandometerMotifs.kinds, variants, previews };
  });

  await page.addScriptTag({ url: `${origin}/${paths.ijjiJs}` });
  const full = await inspectIjjiVariant(page, {
    markOnly: false,
    width: 891,
    height: 1087,
    fallback: "ijji-logo-still.png",
  });
  const mark = await inspectIjjiVariant(page, {
    markOnly: true,
    width: 849,
    height: 840,
    fallback: "ijji-mark-still.png",
  });

  async function inspectFinitePlayback(markOnly) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(({ originValue, markOnlyValue }) => {
      document.body.innerHTML = "";
      const logo = document.createElement("ijji-logo-sting");
      logo.id = "qa-finite";
      logo.setAttribute("manual", "");
      logo.setAttribute("speed", "50");
      logo.setAttribute("assets", `${originValue}/assets/ijji/logo-sting/layers/`);
      if (markOnlyValue) logo.setAttribute("notagline", "");
      window.__ijjiEvents = { starts: 0, ends: 0 };
      logo.addEventListener("ijji-sting-start", () => { window.__ijjiEvents.starts += 1; });
      logo.addEventListener("ijji-sting-end", () => { window.__ijjiEvents.ends += 1; });
      document.body.append(logo);
      logo.replay();
    }, { originValue: origin, markOnlyValue: markOnly });
    await page.waitForFunction(() => window.__ijjiEvents.ends === 1, null, { timeout: 2000 });
    await page.waitForTimeout(250);
    return page.evaluate(() => {
      const logo = document.querySelector("#qa-finite");
      return {
        starts: window.__ijjiEvents.starts,
        ends: window.__ijjiEvents.ends,
        duration: logo.duration,
        currentTime: logo.currentTime,
        playing: Boolean(logo._playing),
        loop: logo.hasAttribute("loop"),
      };
    });
  }

  const finiteFull = await inspectFinitePlayback(false);
  const finiteMark = await inspectFinitePlayback(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.evaluate(({ originValue }) => {
    document.body.innerHTML = "";
    const logo = document.createElement("ijji-logo-sting");
    logo.id = "qa-reduced";
    logo.setAttribute("manual", "");
    logo.setAttribute("assets", `${originValue}/assets/ijji/logo-sting/layers/`);
    document.body.append(logo);
    let ends = 0;
    logo.addEventListener("ijji-sting-end", () => { ends += 1; });
    logo.replay();
    return { duration: logo.duration, currentTime: logo.currentTime, playing: Boolean(logo._playing), ends };
  }, { originValue: origin });

  ijjiComputed = { full: full.record, mark: mark.record, finiteFull, finiteMark, reduced };
  ijjiFidelity = { full: full.fidelity, mark: mark.fidelity };
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const staticParity = Object.fromEntries(
  Object.entries(landometerComputed.variants).map(([variant, record]) => {
    const quiet = variant.endsWith("-quiet");
    const relativePath = `assets/landometer/svg/${variant}.svg`;
    const actual = fs.readFileSync(path.join(root, relativePath), "utf8");
    const expected = `${portableLandometerSvg(record.markup, quiet)}\n`;
    return [variant, {
      path: relativePath,
      byteExactToRuntimeFinal: actual === expected,
      expectedSha256: sha256(expected),
      actualSha256: sha256(actual),
      portable: !/(?:color-mix|currentColor|var\(|\bclass=|\bstyle=)/.test(actual),
    }];
  }),
);

const fullLogo = landometerComputed.variants["logo-full"];
const quietLogo = landometerComputed.variants["logo-quiet"];
const fullPreviewLight = landometerComputed.previews.fullLight;
const fullPreviewDark = landometerComputed.previews.fullDark;
const expectedIjjiLayerOrder = [
  "i-1.png", "jj.png", "i-2.png",
  "tag-1-1.png", "tag-1-2.png", "tag-1-3.png",
  "tag-2-1.png", "tag-2-2.png", "tag-2-3.png",
];

const checks = [
  {
    name: "owner-supplied Landometer v3 and ijji round-3 runtimes remain byte-exact",
    passed: Object.entries(expectedSourceHashes).every(([relativePath, expected]) => actualSourceHashes[relativePath] === expected),
    detail: { expected: expectedSourceHashes, actual: actualSourceHashes },
  },
  {
    name: "all 12 portable Landometer SVGs are exact final-state projections of the v3 runtime",
    passed: Object.keys(staticParity).length === 12
      && Object.values(staticParity).every((record) => record.byteExactToRuntimeFinal && record.portable),
    detail: Object.fromEntries(Object.entries(staticParity).filter(([, record]) => !record.byteExactToRuntimeFinal || !record.portable)),
  },
  {
    name: "Landometer exposes exactly the six approved v3 kinds and full plus quiet variants",
    passed: JSON.stringify(landometerComputed.kinds) === JSON.stringify(expectedLandometerKinds)
      && Object.keys(landometerComputed.variants).length === 12,
    detail: { kinds: landometerComputed.kinds, variantCount: Object.keys(landometerComputed.variants).length },
  },
  {
    name: "every Landometer v3 animation reaches its authored final state inside the measured timeline",
    passed: Object.entries(expectedLandometerTimelinesMs).every(([variant, expected]) => Math.round(landometerComputed.variants[variant]?.timelineEndMs) === expected),
    detail: Object.fromEntries(Object.entries(landometerComputed.variants).map(([variant, record]) => [variant, Math.round(record.timelineEndMs)])),
  },
  {
    name: "logo v3 has the complete 10-path full and 14-path quiet resting geometry",
    passed: fullLogo.pathCount === 10 && fullLogo.geometryCount === 10
      && quietLogo.pathCount === 14 && quietLogo.geometryCount === 14,
    detail: {
      full: { paths: fullLogo.pathCount, geometry: fullLogo.geometryCount },
      quiet: { paths: quietLogo.pathCount, geometry: quietLogo.geometryCount },
    },
  },
  {
    name: "logo v3 full and quiet timelines complete before the 3400 ms inspection settle",
    passed: fullLogo.timelineEndMs === 2870 && quietLogo.timelineEndMs === 3360
      && fullLogo.timelineEndMs <= 3400 && quietLogo.timelineEndMs <= 3400,
    detail: { fullMs: fullLogo.timelineEndMs, quietMs: quietLogo.timelineEndMs, settleMs: 3400 },
  },
  {
    name: "full logo presentation uses ink=blue and the v3 token-derived #1F87CE wedge in light and dark",
    passed: [fullPreviewLight, fullPreviewDark].every((preview) => preview.hostInk === "blue"
      && preview.inlineWedge === ""
      && preview.hostColorHex === "#1D4497"
      && preview.wedgeFillHex === "#1F87CE"
      && preview.geometryCount === 10)
      && staticParity["logo-full"].byteExactToRuntimeFinal
      && fs.readFileSync(path.join(root, "assets/landometer/svg/logo-full.svg"), "utf8").includes('fill="#1F87CE"'),
    detail: { light: fullPreviewLight, dark: fullPreviewDark },
  },
  {
    name: "the release integration contains no superseded #0195CB wedge override",
    passed: !landometerCss.includes("#0195CB")
      && !landometerRuntime.includes("#0195CB")
      && !siteRuntime.includes("#0195CB")
      && !siteRuntime.includes('setProperty("--lm-wedge"')
      && siteRuntime.includes('else motif.setAttribute("ink", "blue");'),
    detail: { fullPreviewHost: "ink=blue", computedWedge: fullPreviewLight.wedgeFillHex },
  },
  {
    name: "ijji runtime layer and final-PNG inventory is exact and contains no missing or extra files",
    passed: JSON.stringify(actualIjjiFiles) === JSON.stringify(expectedIjjiFiles),
    detail: { expected: expectedIjjiFiles, actual: actualIjjiFiles },
  },
  {
    name: "ijji final fallback PNG dimensions match the runtime view-box frames",
    passed: JSON.stringify(pngDimensions(`${paths.ijjiLayers}/ijji-logo-still.png`)) === JSON.stringify({ width: 891, height: 1087 })
      && JSON.stringify(pngDimensions(`${paths.ijjiLayers}/ijji-mark-still.png`)) === JSON.stringify({ width: 849, height: 840 }),
    detail: {
      full: pngDimensions(`${paths.ijjiLayers}/ijji-logo-still.png`),
      mark: pngDimensions(`${paths.ijjiLayers}/ijji-mark-still.png`),
    },
  },
  {
    name: "ijji full and mark components expose the exact layers, lifecycle API, framing, and durations",
    passed: ijjiComputed.full.duration === 9
      && ijjiComputed.mark.duration === 6.4
      && ijjiComputed.full.pieceCount === 3
      && ijjiComputed.full.headCount === 4
      && ijjiComputed.full.wordCount === 6
      && ijjiComputed.mark.hiddenWordCount === 6
      && ijjiComputed.full.surfaceFill.toUpperCase() === "#1D4497"
      && ijjiComputed.mark.surfaceFill === "none"
      && JSON.stringify(ijjiComputed.full.layerFiles) === JSON.stringify(expectedIjjiLayerOrder)
      && JSON.stringify(ijjiComputed.mark.layerFiles) === JSON.stringify(expectedIjjiLayerOrder)
      && ijjiComputed.full.methods.length === 5
      && ijjiComputed.mark.methods.length === 5,
    detail: { full: ijjiComputed.full, mark: ijjiComputed.mark },
  },
  {
    name: "ijji start, bodies, and final states remain complete and fail open",
    passed: ijjiComputed.full.start.pieceOpacities.every((opacity) => opacity === 0)
      && ijjiComputed.full.start.wordOpacities.every((opacity) => opacity === 0)
      && ijjiComputed.full.bodiesComplete.pieceOpacities.every((opacity) => opacity === 1)
      && ijjiComputed.full.final.pieceOpacities.every((opacity) => opacity === 1)
      && ijjiComputed.full.final.wordOpacities.every((opacity) => opacity === 1)
      && ijjiComputed.mark.final.pieceOpacities.every((opacity) => opacity === 1)
      && ijjiComputed.full.currentTime === 9
      && ijjiComputed.mark.currentTime === 6.4,
    detail: { full: ijjiComputed.full, mark: ijjiComputed.mark },
  },
  {
    name: "ijji production playback is finite once and reduced motion resolves immediately to the final logo",
    passed: [ijjiComputed.finiteFull, ijjiComputed.finiteMark].every((record, index) => record.starts === 1
      && record.ends === 1
      && record.playing === false
      && record.loop === false
      && record.currentTime === (index === 0 ? 9 : 6.4))
      && ijjiComputed.reduced.duration === 9
      && ijjiComputed.reduced.currentTime === 9
      && ijjiComputed.reduced.playing === false
      && ijjiComputed.reduced.ends === 1,
    detail: { finiteFull: ijjiComputed.finiteFull, finiteMark: ijjiComputed.finiteMark, reduced: ijjiComputed.reduced },
  },
  {
    name: "ijji layered final render matches both owner-supplied final PNGs within edge-antialiasing tolerance",
    passed: [ijjiFidelity.full, ijjiFidelity.mark].every((record) => record.comparable
      && record.meanAbsoluteChannelDifferenceOf255 <= 1
      && record.changedPixelRatioOver16 <= 0.02),
    detail: ijjiFidelity,
  },
  {
    name: "all runtime QA image requests succeeded",
    passed: failedResponses.length === 0,
    detail: failedResponses,
  },
];

const failed = checks.filter((check) => !check.passed);
const report = {
  schemaVersion: "motif-library-runtime-parity/1.1",
  executedAt: new Date().toISOString(),
  artifactRelease: "1.2.0",
  artifactRoot: ".",
  browser: browserVersion,
  evidenceBoundary: "Landometer parity is evaluated against the byte-exact owner-supplied v3 CSS/JavaScript and all 12 deterministic final-state SVG projections. Full previews select ink=blue only; they do not override the v3 token-derived #1F87CE wedge. Runtime timelines are measured from browser CSS animations and both logo variants finish before the library's 3400 ms settle. ijji parity covers the byte-exact round-3 runtime, exact source-layer and final-PNG inventory, full 9.0 s and mark-only 6.4 s lifecycle, reduced-motion final state, and browser-rendered final fidelity. Small raster differences at antialiased edges are allowed; surrounding library UI and dialog-only replay are integration concerns rather than source-animation changes.",
  landometer: {
    sourceHashes: actualSourceHashes,
    expectedTimelinesMs: expectedLandometerTimelinesMs,
    computed: landometerComputed,
    staticParity,
    inspection: { settleMs: 3400, replayMs: 6000 },
  },
  ijji: {
    sourceInventory: actualIjjiFiles,
    computed: ijjiComputed,
    finalFidelity: ijjiFidelity,
    timelinesSeconds: {
      full: { hop: 0, bodies: 2.7, tagline: 4.2, hello: 6.1, hold: 7.6, end: 9 },
      mark: { hop: 0, bodies: 2.7, hello: 4.2, hold: 5.7, end: 6.4 },
    },
  },
  checks,
  status: failed.length ? "failed" : "passed",
};

if (shouldWriteReport) {
  fs.writeFileSync(path.join(root, "governance/runtime-parity.json"), `${JSON.stringify(report, null, 2)}\n`);
}

if (failed.length) {
  console.error(`FAILED: ${failed.length} of ${checks.length} runtime/static parity checks failed.`);
  for (const check of failed) console.error(`- ${check.name}: ${JSON.stringify(check.detail || null)}`);
  process.exit(1);
}
console.log(`PASS: ${checks.length} release 1.2.0 runtime/static parity checks; report ${shouldWriteReport ? "written" : "not written"}.`);
