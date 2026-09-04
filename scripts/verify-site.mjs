import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sha256File(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

const required = [
  "index.html",
  "en/index.html",
  "404.html",
  "site.css",
  "site.js",
  ".nojekyll",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "assets/motif-library.json",
  "assets/social/motif-library-1200x630.png",
  "assets/identity/landometer-favicon-64-v1.png",
  "assets/downloads/landometer-motifs-v1.zip",
  "assets/downloads/ijji-motifs-selected-r3.zip",
  "assets/downloads/motif-library-v1.zip",
  "governance/owner-approval.json",
  "governance/showcase-motion-decision.json",
  "governance/source-ledger.json",
  "governance/build-card.json",
  "governance/identity-assets.json",
  "governance/browser-qa.json",
  "governance/performance-qa.json",
  "governance/runtime-parity.json",
  "governance/QA.md",
  "governance/SHA256SUMS.txt",
];
required.forEach((file) => check(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`));

if (fs.existsSync(path.join(root, "governance/SHA256SUMS.txt"))) {
  const checksumLines = read("governance/SHA256SUMS.txt").trimEnd().split("\n");
  const checksummedPaths = new Set();
  for (const line of checksumLines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    check(Boolean(match), `Malformed repository checksum line: ${line}`);
    if (!match) continue;
    const [, expected, relative] = match;
    checksummedPaths.add(relative);
    check(relative !== "governance/SHA256SUMS.txt", "Repository checksum file must not hash itself");
    check(!relative.startsWith(".git/"), `Repository checksum must exclude Git internals: ${relative}`);
    check(fs.existsSync(path.join(root, relative)), `Repository checksum path is missing: ${relative}`);
    if (fs.existsSync(path.join(root, relative))) check(sha256File(relative) === expected, `Repository checksum mismatch: ${relative}`);
  }
  for (const relative of ["index.html", "en/index.html", "404.html", "assets/motif-library.json", "assets/downloads/landometer-motifs-v1.zip", "assets/downloads/ijji-motifs-selected-r3.zip", "assets/downloads/motif-library-v1.zip"]) {
    check(checksummedPaths.has(relative), `Repository checksum omits release-critical file: ${relative}`);
  }
}

const manifest = JSON.parse(read("assets/motif-library.json"));
const approval = JSON.parse(read("governance/owner-approval.json"));
const sourceLedger = JSON.parse(read("governance/source-ledger.json"));
const showcaseDecision = JSON.parse(read("governance/showcase-motion-decision.json"));
const buildCard = JSON.parse(read("governance/build-card.json"));
const identityAssets = JSON.parse(read("governance/identity-assets.json"));
check(manifest.schemaVersion === "landometer-motif-library/1.0", "Unexpected manifest schema version");
check(manifest.artifactRelease === "1.1.0", "Manifest must identify artifact release 1.1.0");
check(manifest.families.length === 2, "Manifest must contain exactly two brand families");
check(manifest.families.flatMap((family) => family.assets).length === 34, "Manifest must contain 34 asset records");
check(manifest.agentContract?.schemaVersion === "motif-library-agent-contract/1.0", "Deterministic agent contract is missing");
check(manifest.agentContract?.fieldDerivation?.allowedJob === "Choose one exact value from selectedRecord.allowedJobs.", "Agent contract must derive allowedJob from the selected record");
check(manifest.agentContract?.fieldDerivation?.allowedFormat === "Choose one exact value from selectedRecord.allowedFormats.", "Agent contract must derive allowedFormat from the selected record");
check(manifest.agentContract?.baselineMotionMode === "static", "Agent contract must select a static baseline before any motion extension");
check(manifest.showcaseExperience?.authorityRef === "governance/showcase-motion-decision.json", "Showcase experience must resolve its authority decision");
check(manifest.showcaseExperience?.replayIntervalMs === 3000, "Showcase replay interval must remain 3000 ms");
check(manifest.showcaseExperience?.scope === "landometer_preview_dialog_only", "Showcase replay must remain dialog-scoped");
check(manifest.agentContract?.showcaseBoundary?.includes("Do not copy"), "Agent contract must distinguish showcase replay from downstream motion");
check(buildCard.routes.length === 2, "Build Card must declare two locale routes");
check(identityAssets.assets.length === 2, "Identity manifest must declare favicon and social preview");
check(sourceLedger.embeddedInstructionBoundary.includes("did not expand"), "Source ledger must preserve the embedded-instruction boundary");
check(Boolean(sourceLedger.authorityByDimension?.motifGeometryAndSourceBytes), "Source authority must be separated by dimension");
check(approval.publicRepositoryAccess.join(",") === "view,download", "Public repository access must be limited to view/download");
check(approval.authorizedOperators.length === 3, "Authorized reuse operators must be explicit");
check(showcaseDecision.status === "owner_selected_for_named_artifact", "Showcase motion decision must retain owner-selected status");
check(showcaseDecision.scope?.surface === "landometer_preview_dialog_only", "Showcase decision must remain dialog-scoped");
check(showcaseDecision.productionBoundary?.landometerRuntime === "finite_once_unchanged", "Showcase decision must preserve the production runtime lifecycle");

const manifestHash = sha256File("assets/motif-library.json");
check(approval.assetManifestSha256 === manifestHash, "Owner approval does not bind the current asset manifest hash");
check(approval.status === "approved_for_named_publication", "Owner approval status is not publishable");
check(approval.releaseMembership.lds_0_9_1 === false, "Overlay must not claim LDS 0.9.1 release membership");
check(approval.releaseMembership.ijji_addon_0_5_3 === false, "Overlay must not claim ijji Add-on 0.5.3 release membership");

const allAssets = manifest.families.flatMap((family) => family.assets);
const assetsById = new Map(allAssets.map((asset) => [asset.assetId, asset]));

for (const asset of allAssets) {
  check(fs.existsSync(path.join(root, asset.path)), `Manifest asset missing: ${asset.path}`);
  if (!fs.existsSync(path.join(root, asset.path))) continue;
  const bytes = fs.statSync(path.join(root, asset.path)).size;
  check(asset.bytes === bytes, `Byte mismatch: ${asset.path}`);
  check(asset.sha256 === sha256File(asset.path), `SHA-256 mismatch: ${asset.path}`);
  check(asset.publicationPermission === true, `Publication permission missing: ${asset.path}`);
  check(asset.approvalRef === "governance/owner-approval.json", `Approval ref mismatch: ${asset.path}`);
  if (asset.role === "generated_vector") {
    check(typeof asset.familyId === "string" && asset.familyId.length > 0, `Generated vector is missing familyId: ${asset.assetId}`);
    check(typeof asset.productScope === "string" && asset.productScope.length > 0, `Generated vector is missing productScope: ${asset.assetId}`);
    check(typeof asset.motif === "string" && asset.motif.length > 0, `Generated vector is missing motif: ${asset.assetId}`);
    check(typeof asset.variant === "string" && asset.variant.length > 0, `Generated vector is missing variant: ${asset.assetId}`);
    check(typeof asset.surface === "string" && asset.surface.length > 0, `Generated vector is missing surface: ${asset.assetId}`);
    check(asset.motionMode === "static", `Generated vector must declare static motionMode: ${asset.assetId}`);
    check(Array.isArray(asset.allowedJobs) && asset.allowedJobs.length > 0, `Generated vector has no selectable allowedJob: ${asset.assetId}`);
    check(Array.isArray(asset.allowedFormats) && asset.allowedFormats.length > 0, `Generated vector has no selectable allowedFormat: ${asset.assetId}`);
    check(asset.allowedFormats.every((value) => manifest.agentContract.allowedFormat.includes(value)), `Generated vector has an unknown allowedFormat: ${asset.assetId}`);
  } else if (asset.role === "web_runtime") {
    check(asset.staticFallbackBinding === "selectedRecord.path", `Runtime fallback must bind to the selected baseline path: ${asset.assetId}`);
    check(!asset.staticFallback, `Runtime record must not publish an ambiguous fallback template: ${asset.assetId}`);
  }
}

for (const [extensionId, extension] of Object.entries(manifest.agentContract.motionExtensions || {})) {
  check(extension.motionMode === extensionId, `Motion extension key/mode mismatch: ${extensionId}`);
  check(extension.runtimeAllowedFormat === "web_public", `Motion extension must be web-only: ${extensionId}`);
  check(extension.staticFallback === "selectedRecord.path", `Motion extension fallback is not baseline-bound: ${extensionId}`);
  check(Array.isArray(extension.runtimeAssetIds) && extension.runtimeAssetIds.length === 2, `Motion extension must resolve an exact CSS+JS pair: ${extensionId}`);
  const runtimeAssets = extension.runtimeAssetIds.map((assetId) => assetsById.get(assetId));
  check(runtimeAssets.every(Boolean), `Motion extension references a missing runtime record: ${extensionId}`);
  check(runtimeAssets.every((asset) => asset?.role === "web_runtime" && asset.familyId === extension.familyId && asset.motionMode === extension.motionMode), `Motion extension runtime pair is incompatible: ${extensionId}`);
  check(new Set(runtimeAssets.map((asset) => asset?.runtimeGroupId)).size === 1, `Motion extension runtime pair does not share one group: ${extensionId}`);
}

check(
  sha256File("assets/landometer/landometer-motifs.css") === "d736cdb0cbd65bf8e1f199a600df120eaa8062928337efdfeb384048b857a0d8",
  "Selected Landometer CSS hash changed",
);
check(
  sha256File("assets/landometer/landometer-motifs.js") === "605129c765a3e1da91313467aeac46f5bd60223f1359b78d62b4b2e0a0325702",
  "Selected Landometer JS hash changed",
);

const staticLandometer = fs.readdirSync(path.join(root, "assets/landometer/svg")).filter((name) => name.endsWith(".svg"));
check(staticLandometer.length === 12, "Expected 12 static Landometer SVGs");
for (const name of staticLandometer) {
  const svg = read(`assets/landometer/svg/${name}`);
  check(!svg.includes("var("), `Portable Landometer SVG retains a CSS variable: ${name}`);
  check(!svg.includes("currentColor"), `Portable Landometer SVG retains currentColor: ${name}`);
  check(svg.includes('xmlns="http://www.w3.org/2000/svg"'), `SVG namespace missing: ${name}`);
}
check(read("assets/landometer/svg/slice-full.svg").includes('transform="translate(12 -12)"'), "Static full slice must bake the runtime final transform");
check(read("assets/landometer/svg/slice-quiet.svg").includes('transform="translate(12 -12)"'), "Static quiet slice must bake the runtime final transform");

const ijjiManifest = JSON.parse(read("assets/ijji/manifest.json"));
check(ijjiManifest.files.length === 18, "Expected 18 selected ijji SVG records");
for (const asset of ijjiManifest.files) {
  const local = `assets/ijji/${asset.file}`;
  check(fs.existsSync(path.join(root, local)), `Selected ijji file missing: ${local}`);
  if (!fs.existsSync(path.join(root, local))) continue;
  if (Number.isInteger(asset.bytes)) {
    check(fs.statSync(path.join(root, local)).size === asset.bytes, `ijji byte mismatch: ${local}`);
  }
}

function verifyHtml(relativePath, locale, expectedCanonical) {
  const html = read(relativePath);
  check(new RegExp(`<html\\s+lang="${locale}"`).test(html), `${relativePath}: wrong lang`);
  check((html.match(/<h1\b/g) || []).length === 1, `${relativePath}: expected exactly one H1`);
  check((html.match(/<main\b/g) || []).length === 1, `${relativePath}: expected one main landmark`);
  check(html.includes(`<link rel="canonical" href="${expectedCanonical}">`), `${relativePath}: canonical mismatch`);
  check(html.includes('hreflang="th"') && html.includes('hreflang="en"'), `${relativePath}: hreflang pair missing`);
  check(html.includes("landometer-favicon-64-v1.png"), `${relativePath}: favicon declaration missing`);
  check((html.match(/class="asset-card"/g) || []).length === 9, `${relativePath}: expected nine asset cards`);
  check(!html.includes("explorations/"), `${relativePath}: exploration asset leaked into the page`);
  check(!html.includes("assets/ijji/manifest.json"), `${relativePath}: historical ijji source manifest must not be presented as current authority`);
  check(!html.includes("Landometer-Logo-TransparentBG"), `${relativePath}: candidate logo asset must not be used`);
  check(html.includes("authorized") || html.includes("ได้รับอนุญาต"), `${relativePath}: authorized reuse boundary missing near downloads`);

  const vectorIds = new Set(manifest.families.flatMap((family) => family.assets).filter((asset) => asset.role === "generated_vector").map((asset) => asset.assetId));
  const displayedAssetIds = [...html.matchAll(/(?:shown )?assetIds:\s*([^<]+)/g)]
    .flatMap((match) => match[1].split("/").map((value) => value.trim()));
  displayedAssetIds.forEach((assetId) => check(vectorIds.has(assetId), `${relativePath}: displayed assetId is absent from manifest: ${assetId}`));

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  check(ids.length === new Set(ids).size, `${relativePath}: duplicate IDs found`);

  const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  images.forEach((tag, index) => check(/\salt="[^"]*"/.test(tag), `${relativePath}: image ${index + 1} has no alt attribute`));

  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  check(jsonLdBlocks.length === 1, `${relativePath}: expected one JSON-LD block`);
  jsonLdBlocks.forEach((block) => {
    try { JSON.parse(block); check(true, `${relativePath}: JSON-LD parses`); }
    catch { check(false, `${relativePath}: invalid JSON-LD`); }
  });

  const localRefs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of localRefs) {
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
    const clean = ref.split(/[?#]/)[0];
    if (!clean) continue;
    const resolved = clean.startsWith("/motif/")
      ? path.join(root, clean.slice("/motif/".length))
      : path.resolve(path.dirname(path.join(root, relativePath)), clean);
    check(fs.existsSync(resolved), `${relativePath}: unresolved local reference ${ref}`);
  }
}

verifyHtml("index.html", "th", "https://montri-th.github.io/motif/");
verifyHtml("en/index.html", "en", "https://montri-th.github.io/motif/en/");

const errorHtml = read("404.html");
check(errorHtml.includes('<meta name="robots" content="noindex">'), "404.html: noindex directive missing");
check(errorHtml.includes('/motif/assets/identity/landometer-favicon-64-v1.png'), "404.html: favicon path is not project-scoped");
check(errorHtml.includes('href="/motif/site.css"'), "404.html: stylesheet path is not project-scoped");
check(errorHtml.includes('href="/motif/"') && errorHtml.includes('href="/motif/en/"'), "404.html: recovery routes are missing");
check(!/\b(?:href|src)="\/(?!motif\/)/.test(errorHtml), "404.html: root-absolute asset escaped the /motif/ project path");

const siteJs = read("site.js");
check(!/https?:\/\/(?!montri-th\.github\.io\/motif)/.test(siteJs), "Site runtime contains an unexpected external URL");
check(!siteJs.includes("eval("), "Site runtime must not use eval");
check(siteJs.includes("document.baseURI"), "Dynamic asset imports must resolve from the locale document URL");
check(siteJs.includes("const landometerReplayMs = 3000"), "Landometer showcase replay cadence is missing");
check(siteJs.includes('pair.className = "dialog-motif-pair"'), "Landometer showcase must render the full/quiet pair");
check(siteJs.includes('window.addEventListener("pagehide"'), "Preview timers must stop on pagehide");
check(read("index.html").includes("full + quiet") && read("index.html").includes("finite once"), "Thai route must explain showcase versus production motion");
check(read("en/index.html").includes("full + quiet") && read("en/index.html").includes("finite once"), "English route must explain showcase versus production motion");
check(read("index.html").includes('"version": "1.1.0"') && read("en/index.html").includes('"version": "1.1.0"'), "Structured data must declare artifact release 1.1.0");
check(read("index.html").includes('site.js?v=1.1.0') && read("en/index.html").includes('site.js?v=1.1.0'), "Locale routes must cache-bust the updated site runtime");
check(read("site.css").includes("html:not(.js-ready)"), "No-JS enhancement controls must fail closed");
check(read("sitemap.xml").includes("https://montri-th.github.io/motif/en/"), "English route missing from sitemap");
check(read("robots.txt").includes("Sitemap: https://montri-th.github.io/motif/sitemap.xml"), "robots.txt sitemap mismatch");

if (failures.length) {
  console.error(`FAILED: ${failures.length} of ${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS: ${checks} source, route, asset, authority, and hash checks.`);
