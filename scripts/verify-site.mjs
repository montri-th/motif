import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const release = "1.2.1";
const allowPendingLive = process.env.MOTIF_ALLOW_PENDING_LIVE === "1";
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    check(false, `${relativePath}: invalid JSON (${error.message})`);
    return {};
  }
}

function sha256File(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolute(relativePath))).digest("hex");
}

function sameMembers(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && [...actual].sort().join("\n") === [...expected].sort().join("\n");
}

function listFiles(relativeDirectory = "") {
  const directory = absolute(relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (relative === ".git" || relative.startsWith(".git/")) return [];
    if (relative === "governance/SHA256SUMS.txt") return [];
    if (entry.isSymbolicLink()) {
      check(false, `Release tree must not contain a symlink: ${relative}`);
      return [];
    }
    if (entry.isDirectory()) return listFiles(relative);
    if (!entry.isFile()) {
      check(false, `Release tree contains an unsupported entry: ${relative}`);
      return [];
    }
    return [relative];
  });
}

const required = [
  ".nojekyll",
  "404.html",
  "CLAUDE.md",
  "LICENSE.md",
  "README.md",
  "assets/downloads/ijji-animated-logo-r3.zip",
  "assets/downloads/ijji-motifs-selected-r3.zip",
  "assets/downloads/landometer-motifs-v1.zip",
  "assets/downloads/landometer-motifs-v3.zip",
  "assets/downloads/motif-library-v1.zip",
  "assets/downloads/motif-library-v1.2.0.zip",
  "assets/downloads/motif-library-v1.2.1.zip",
  "assets/identity/landometer-favicon-64-v1.png",
  "assets/ijji/logo-sting/README.md",
  "assets/ijji/logo-sting/ijji-logo-sting.js",
  "assets/ijji/logo-sting/layers/ijji-logo-still.png",
  "assets/ijji/logo-sting/layers/ijji-mark-still.png",
  "assets/landometer/landometer-motifs.css",
  "assets/landometer/landometer-motifs.js",
  "assets/motif-library.json",
  "assets/social/motif-library-1200x630.png",
  "docs/ai-sync.md",
  "docs/usage-guide.md",
  "en/index.html",
  "governance/QA.md",
  "governance/SHA256SUMS.txt",
  "governance/animation-source-v3-decision.json",
  "governance/audience-animation-parity.json",
  "governance/browser-qa.json",
  "governance/build-card.json",
  "governance/identity-assets.json",
  "governance/inline-autoreplay-decision.json",
  "governance/owner-approval.json",
  "governance/performance-qa.json",
  "governance/runtime-parity.json",
  "governance/showcase-motion-decision.json",
  "governance/source-ledger.json",
  "index.html",
  "llms.txt",
  "robots.txt",
  "site.css",
  "site.js",
  "sitemap.xml",
  // Immutable release history referenced by the current build card.
  "governance/logo-full-geometry-decision.json",
  "governance/logo-preview-final-settle-decision.json",
  "governance/logo-preview-theme-color-decision.json",
];
required.forEach((file) => check(exists(file), `Missing required file: ${file}`));

// The repository checksum is a closed, sorted inventory of every release file.
if (exists("governance/SHA256SUMS.txt")) {
  const lines = read("governance/SHA256SUMS.txt").trimEnd().split("\n").filter(Boolean);
  const checksummedPaths = [];
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  ([^\0]+)$/);
    check(Boolean(match), `Malformed repository checksum line: ${line}`);
    if (!match) continue;
    const [, expectedHash, relative] = match;
    checksummedPaths.push(relative);
    check(relative !== "governance/SHA256SUMS.txt", "Repository checksum file must not hash itself");
    check(!relative.startsWith(".git/"), `Repository checksum must exclude Git internals: ${relative}`);
    check(exists(relative), `Repository checksum path is missing: ${relative}`);
    if (exists(relative)) check(sha256File(relative) === expectedHash, `Repository checksum mismatch: ${relative}`);
  }
  check(new Set(checksummedPaths).size === checksummedPaths.length, "Repository checksum inventory contains duplicate paths");
  check(checksummedPaths.join("\n") === [...checksummedPaths].sort().join("\n"), "Repository checksum inventory must be path-sorted");
  const releaseFiles = listFiles().sort();
  check(sameMembers(checksummedPaths, releaseFiles), "Repository checksum inventory must cover every non-Git release file exactly once");
  for (const relative of [
    "index.html",
    "en/index.html",
    "404.html",
    "assets/motif-library.json",
    "assets/downloads/landometer-motifs-v3.zip",
    "assets/downloads/landometer-motifs-v1.zip",
    "assets/downloads/ijji-animated-logo-r3.zip",
    "assets/downloads/ijji-motifs-selected-r3.zip",
    "assets/downloads/motif-library-v1.2.0.zip",
    "assets/downloads/motif-library-v1.2.1.zip",
    "assets/downloads/motif-library-v1.zip",
  ]) check(checksummedPaths.includes(relative), `Repository checksum omits release-critical file: ${relative}`);
}

if (exists("assets/downloads/landometer-motifs-v1.zip") && exists("assets/downloads/landometer-motifs-v3.zip")) {
  check(
    sha256File("assets/downloads/landometer-motifs-v1.zip") === sha256File("assets/downloads/landometer-motifs-v3.zip"),
    "Stable Landometer kit alias must be byte-identical to the v3 kit",
  );
}
if (exists("assets/downloads/motif-library-v1.zip") && exists("assets/downloads/motif-library-v1.2.1.zip")) {
  check(
    sha256File("assets/downloads/motif-library-v1.zip") === sha256File("assets/downloads/motif-library-v1.2.1.zip"),
    "Stable full-library kit alias must be byte-identical to the 1.2.1 kit",
  );
}

const manifest = readJson("assets/motif-library.json");
const approval = readJson("governance/owner-approval.json");
const sourceLedger = readJson("governance/source-ledger.json");
const buildCard = readJson("governance/build-card.json");
const showcaseDecision = readJson("governance/showcase-motion-decision.json");
const inlineDecision = readJson("governance/inline-autoreplay-decision.json");
const sourceDecision = readJson("governance/animation-source-v3-decision.json");
const audienceParity = readJson("governance/audience-animation-parity.json");
const identityAssets = readJson("governance/identity-assets.json");

const driveRootUrl = "https://drive.google.com/drive/folders/1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh";
const driveReleaseUrl = "https://drive.google.com/drive/folders/15WwfIGVgWDy-Cxjemz0_3xNbvkc6ud-B";
const expectedFamilyCounts = new Map([
  ["landometer.motif.v3", 14],
  ["ijji.logo-sting.r3", 12],
  ["ijji.four-beat.selected-3.r3", 20],
]);

check(manifest.schemaVersion === "landometer-motif-library/1.1", "Unexpected manifest schema version");
check(manifest.artifactRelease === release, `Manifest must identify artifact release ${release}`);
check(manifest.status === "owner_approved_publication", "Manifest status must identify an owner-approved publication");
check(manifest.canonicalUrl === "https://montri-th.github.io/motif/", "Manifest canonical URL mismatch");
check(manifest.repository === "https://github.com/montri-th/motif", "Manifest repository URL mismatch");
check(Array.isArray(manifest.families) && manifest.families.length === 3, "Manifest must contain exactly three separately governed families");

const families = Array.isArray(manifest.families) ? manifest.families : [];
const familyIds = families.map((family) => family.id);
check(sameMembers(familyIds, [...expectedFamilyCounts.keys()]), "Manifest family IDs do not match the selected release families");
for (const family of families) {
  check(expectedFamilyCounts.get(family.id) === family.assets?.length, `${family.id}: unexpected asset-record count`);
  check(family.scope === (family.id === "landometer.motif.v3" ? "shared_landometer" : "ijji_product_specific"), `${family.id}: product scope mismatch`);
}

const allAssets = families.flatMap((family) => family.assets || []);
check(allAssets.length === 46, "Manifest must contain exactly 46 asset records");
check(new Set(allAssets.map((asset) => asset.assetId)).size === allAssets.length, "Manifest asset IDs must be unique");
check(new Set(allAssets.map((asset) => asset.path)).size === allAssets.length, "Manifest asset paths must be unique");
const assetsById = new Map(allAssets.map((asset) => [asset.assetId, asset]));

check(manifest.agentContract?.schemaVersion === "motif-library-agent-contract/1.1", "Agent contract 1.1 is missing");
check(manifest.agentContract?.baselineMotionMode === "static", "Agent contract must select a static baseline before motion");
check(manifest.agentContract?.showcaseBoundary?.includes("Do not copy"), "Agent contract must distinguish library auto-replay from production motion");
check(manifest.agentContract?.prohibitedInference?.includes("portfolio truth"), "Agent contract must preserve the evidence and product-truth boundary");
check(manifest.boundaries?.sharedLayer?.includes("Land, Location, and Living"), "Shared Landometer boundary must remain product-neutral");
check(manifest.boundaries?.identity?.includes("ijji.logo-sting.r3"), "Animated ijji identity exception must remain explicit and product-specific");
check(manifest.boundaries?.comparison?.includes("compatible schema and release"), "Cross-product comparison compatibility boundary is missing");

const expectedExtensions = {
  finite_once: ["landometer.motif.runtime.css.v3", "landometer.motif.runtime.js.v3"],
  finite_once_logo_sting: ["ijji.logo-sting.runtime.r3"],
  state_bound_only: ["ijji.four-beat.runtime.css", "ijji.four-beat.runtime.js"],
};
const extensions = manifest.agentContract?.motionExtensions || {};
check(sameMembers(Object.keys(extensions), Object.keys(expectedExtensions)), "Agent contract must expose exactly the three approved motion extensions");
for (const [extensionId, expectedRuntimeIds] of Object.entries(expectedExtensions)) {
  const extension = extensions[extensionId] || {};
  check(extension.motionMode === extensionId, `${extensionId}: motion extension key and mode differ`);
  check(extension.runtimeAllowedFormat === "web_public", `${extensionId}: runtime must remain web-only`);
  check(extension.staticFallback === "selectedRecord.path", `${extensionId}: fallback must bind to the selected baseline record`);
  check(sameMembers(extension.runtimeAssetIds, expectedRuntimeIds), `${extensionId}: exact runtime asset set mismatch`);
  for (const assetId of expectedRuntimeIds) {
    const asset = assetsById.get(assetId);
    check(Boolean(asset), `${extensionId}: missing runtime asset ${assetId}`);
    if (!asset) continue;
    check(asset.role === "web_runtime", `${extensionId}: ${assetId} is not a web runtime`);
    check(asset.familyId === extension.familyId, `${extensionId}: ${assetId} belongs to the wrong family`);
    check(asset.motionMode === extensionId, `${extensionId}: ${assetId} has an incompatible motion mode`);
  }
}

for (const family of families) {
  for (const asset of family.assets || []) {
    check(asset.familyId === family.id, `${asset.assetId}: familyId disagrees with its container`);
    check(asset.productScope === family.scope, `${asset.assetId}: productScope disagrees with its family`);
    check(typeof asset.assetId === "string" && asset.assetId.length > 0, `${asset.path}: assetId is missing`);
    check(typeof asset.path === "string" && !path.isAbsolute(asset.path) && !asset.path.includes(".."), `${asset.assetId}: path must be repository-relative`);
    check(exists(asset.path), `Manifest asset missing: ${asset.path}`);
    if (exists(asset.path)) {
      check(fs.statSync(absolute(asset.path)).size === asset.bytes, `Byte count mismatch: ${asset.path}`);
      check(sha256File(asset.path) === asset.sha256, `SHA-256 mismatch: ${asset.path}`);
    }
    check(asset.publicationPermission === true, `Publication permission missing: ${asset.path}`);
    check(asset.approvalRef === "governance/owner-approval.json", `Approval ref mismatch: ${asset.path}`);
    check(Array.isArray(asset.allowedJobs) && asset.allowedJobs.length > 0, `Allowed jobs missing: ${asset.assetId}`);
    check(Array.isArray(asset.allowedFormats) && asset.allowedFormats.length > 0, `Allowed formats missing: ${asset.assetId}`);
    check(asset.allowedFormats.every((format) => manifest.agentContract?.allowedFormat?.includes(format)), `Unknown allowed format: ${asset.assetId}`);
    if (asset.role === "generated_vector" || asset.role === "raster_identity") {
      check(asset.motionMode === "static", `Baseline asset must be static: ${asset.assetId}`);
      check(asset.staticFallback === "self", `Baseline asset must identify itself as the fallback: ${asset.assetId}`);
      check(typeof asset.motif === "string" && asset.motif.length > 0, `Baseline motif is missing: ${asset.assetId}`);
      check(typeof asset.variant === "string" && asset.variant.length > 0, `Baseline variant is missing: ${asset.assetId}`);
      check(typeof asset.surface === "string" && asset.surface.length > 0, `Baseline surface is missing: ${asset.assetId}`);
    } else if (asset.role === "web_runtime") {
      check(asset.allowedFormats.length === 1 && asset.allowedFormats[0] === "web_public", `Runtime must be web-only: ${asset.assetId}`);
      check(asset.staticFallbackBinding === "selectedRecord.path", `Runtime fallback is not baseline-bound: ${asset.assetId}`);
      check(typeof asset.runtimeGroupId === "string" && asset.runtimeGroupId.length > 0, `Runtime group is missing: ${asset.assetId}`);
    } else if (asset.role === "runtime_layer") {
      check(asset.familyId === "ijji.logo-sting.r3", `Only ijji animated identity may publish runtime layers: ${asset.assetId}`);
      check(asset.motionMode === "runtime_dependency", `Runtime layer has the wrong motion mode: ${asset.assetId}`);
      check(asset.staticFallbackBinding === "not_applicable", `Runtime layer fallback boundary is missing: ${asset.assetId}`);
      check(asset.allowedJobs.length === 1 && asset.allowedJobs[0] === "runtime_dependency_only", `Runtime layer cannot be authorized for standalone work: ${asset.assetId}`);
    } else check(false, `Unknown manifest asset role: ${asset.role}`);
  }
}

const expectedLandometerHashes = {
  "assets/landometer/landometer-motifs.css": "7cc2deb475a8d6e4af331407b2b4b741716c458a8ce885e2fb2859374b93912e",
  "assets/landometer/landometer-motifs.js": "3a5caef7918a85885b61dd53e049ea8bf2b0a3cea508f587bb14970bfe6deaf2",
  "assets/landometer/svg/cultivate-full.svg": "ce494d792c12d73949a3dc8e6d18f6f93faa6aeab33d18b2de0889ab4af5af12",
  "assets/landometer/svg/cultivate-quiet.svg": "edf8538107d30b078f0d7657bac054722ee88bdc10ddf7db00e63f44d077935f",
  "assets/landometer/svg/dial-full.svg": "7ecfd1165a3e7ad25a0bb01b9680c35f71ff8a98edfd411dfe1b712cee12654d",
  "assets/landometer/svg/dial-quiet.svg": "2e624d80b604891ad2ed3e4d5cc6268d2383f39f740ef1def5012c49aee0da1f",
  "assets/landometer/svg/layers-full.svg": "a94a59a342df39591f490deec960bba2263bc1c453620c557ff84a1c47901843",
  "assets/landometer/svg/layers-quiet.svg": "e3e2bf65bcd38d34d0a07910bef44917eab76fdaf097131ec133d163f6a65a03",
  "assets/landometer/svg/logo-full.svg": "90e9543f2f86a18f891331c13be25038b4334ca7dbe55b194650bc441e3558e1",
  "assets/landometer/svg/logo-quiet.svg": "5b6798cdb6c3ada246286e6ce3386644f383c4f987a267e5c5db392809403e14",
  "assets/landometer/svg/rings-full.svg": "b50ec8fa3828ee5b3504ff05e0c47c1ae55f6b644225482454ec319809552286",
  "assets/landometer/svg/rings-quiet.svg": "d494be1f72e833704cd3c20d9d41f60599991d6efd5f670a86e40a7296eb566b",
  "assets/landometer/svg/slice-full.svg": "8d0dfb62d1ac92738afcd76e8b61b544a5c72bf10b165983235900558447b2df",
  "assets/landometer/svg/slice-quiet.svg": "c72114d43b81584cbb46251a5519f768087259bf135216f6ea7933a83df4de6b",
};
for (const [relative, expectedHash] of Object.entries(expectedLandometerHashes)) {
  check(exists(relative) && sha256File(relative) === expectedHash, `Selected Landometer v3 byte identity changed: ${relative}`);
  const asset = allAssets.find((candidate) => candidate.path === relative);
  check(asset?.sha256 === expectedHash, `Manifest does not bind selected Landometer v3 hash: ${relative}`);
}

const staticLandometer = exists("assets/landometer/svg")
  ? fs.readdirSync(absolute("assets/landometer/svg")).filter((name) => name.endsWith(".svg")).sort()
  : [];
check(staticLandometer.length === 12, "Expected exactly 12 static Landometer SVGs");
for (const name of staticLandometer) {
  const svg = read(`assets/landometer/svg/${name}`);
  check(svg.includes('xmlns="http://www.w3.org/2000/svg"'), `SVG namespace missing: ${name}`);
  check(!/(?:\bclass=|\bstyle=|var\(|currentColor)/.test(svg), `Portable Landometer SVG retains runtime-only styling: ${name}`);
}
const logoFullSvg = read("assets/landometer/svg/logo-full.svg");
const logoQuietSvg = read("assets/landometer/svg/logo-quiet.svg");
check((logoFullSvg.match(/<(?:path|circle|rect|ellipse|polygon|polyline|line)\b/g) || []).length === 10, "Landometer logo-full final state must contain all 10 authored geometry elements");
check((logoQuietSvg.match(/<(?:path|circle|rect|ellipse|polygon|polyline|line)\b/g) || []).length === 14, "Landometer logo-quiet final state must contain all 14 authored geometry elements");
check(logoFullSvg.includes('fill="#1F87CE"'), "Landometer v3 logo-full must retain the reference token-derived #1F87CE wedge");
check(!logoFullSvg.includes("#0195CB"), "Historical release-1.1.3 wedge override leaked into v3 logo-full");

const expectedIjjiLogoHashes = {
  "assets/ijji/logo-sting/ijji-logo-sting.js": "1a1d1bc247b5deb92aa19e4d84524ac1f823454a9401b6ce53acf8716010433e",
  "assets/ijji/logo-sting/layers/i-1.png": "df5fb769b2bcf84a5bbb64a5b7be424463b3883632b722cebc5d9c4a29362ac6",
  "assets/ijji/logo-sting/layers/i-2.png": "857ca5198e350fd02f644d492f1b7b0b14b9cacb9f2dd21f2031788678ce80f5",
  "assets/ijji/logo-sting/layers/ijji-logo-still.png": "bb1bc80e0c79a10dedb1b48c39efd187e97fe429adec4917975e265f610ccaac",
  "assets/ijji/logo-sting/layers/ijji-mark-still.png": "acac2c65b1a17c1956686c3fdbb2a0a6dc3c547c35be1ca128675d28b0ffc630",
  "assets/ijji/logo-sting/layers/jj.png": "cb2743b05ee7d3270bef5e5f5a5bec2916e6fe6b1e99d85793ebbd1ec398dd93",
  "assets/ijji/logo-sting/layers/tag-1-1.png": "6b51513e93df40e2a00b928d606373e688a3b6dd9e6869a6e803a7bef5ab7784",
  "assets/ijji/logo-sting/layers/tag-1-2.png": "fb72390fe3125ed5c5ab9c2bafd03fb71cb74e751ebd7f14737ac7c0367117fa",
  "assets/ijji/logo-sting/layers/tag-1-3.png": "5e01f5a2303ba67e18e69153003ba1f363e6eb1c80b67aa68115b8e434072ff0",
  "assets/ijji/logo-sting/layers/tag-2-1.png": "2e4529e6961ffa9508ae12e4346cba6870f009cc4851e2a9c613e69ef7999cf8",
  "assets/ijji/logo-sting/layers/tag-2-2.png": "ea066302ab3f407d258260f85ba19cd184b5ddbfa313f1f480726639b9ef3713",
  "assets/ijji/logo-sting/layers/tag-2-3.png": "3821e99ab1ff83edc12b95e06c2d2fc2cd1019905900a8f15fc57481b7d367c4",
};
for (const [relative, expectedHash] of Object.entries(expectedIjjiLogoHashes)) {
  check(exists(relative) && sha256File(relative) === expectedHash, `Selected ijji animated-identity byte changed: ${relative}`);
  const asset = allAssets.find((candidate) => candidate.path === relative);
  check(asset?.sha256 === expectedHash, `Manifest does not bind selected ijji animated-identity hash: ${relative}`);
}
const ijjiLogoAssets = allAssets.filter((asset) => asset.familyId === "ijji.logo-sting.r3");
check(ijjiLogoAssets.filter((asset) => asset.role === "raster_identity").length === 2, "ijji animated identity must provide two final fallbacks");
check(ijjiLogoAssets.filter((asset) => asset.role === "runtime_layer").length === 9, "ijji animated identity must provide all nine exact runtime layers");
check(ijjiLogoAssets.filter((asset) => asset.role === "web_runtime").length === 1, "ijji animated identity must load one superset runtime only");

check(manifest.sourceResolution?.landometer?.runtimeCssSha256 === expectedLandometerHashes["assets/landometer/landometer-motifs.css"], "Manifest source resolution has the wrong Landometer CSS hash");
check(manifest.sourceResolution?.landometer?.runtimeJsSha256 === expectedLandometerHashes["assets/landometer/landometer-motifs.js"], "Manifest source resolution has the wrong Landometer JS hash");
check(manifest.sourceResolution?.landometer?.exampleHtmlSha256 === "115518679ffaeac788859d5cb547e65301664a06850814c8c5facf65d56c34d3", "Manifest source resolution has the wrong Landometer example-HTML hash");
check(manifest.sourceResolution?.landometer?.referenceWedgeSrgb === "#1F87CE", "Manifest must bind the v3 reference wedge colour");
check(manifest.sourceResolution?.ijjiAnimatedIdentity?.runtimeJsSha256 === expectedIjjiLogoHashes["assets/ijji/logo-sting/ijji-logo-sting.js"], "Manifest source resolution has the wrong ijji runtime hash");
check(manifest.sourceResolution?.ijjiAnimatedIdentity?.fullStillSha256 === expectedIjjiLogoHashes["assets/ijji/logo-sting/layers/ijji-logo-still.png"], "Manifest source resolution has the wrong ijji full fallback hash");
check(manifest.sourceResolution?.ijjiAnimatedIdentity?.markStillSha256 === expectedIjjiLogoHashes["assets/ijji/logo-sting/layers/ijji-mark-still.png"], "Manifest source resolution has the wrong ijji mark fallback hash");

check(manifest.showcaseExperience?.landometer?.defaultReplayIntervalMs === 3000, "Default Landometer showcase replay must remain 3000 ms");
check(manifest.showcaseExperience?.landometer?.logo?.settleAtMs === 3400, "Landometer logo v3 preview must settle at 3400 ms");
check(manifest.showcaseExperience?.landometer?.logo?.replayIntervalMs === 6000, "Landometer logo v3 preview must replay at 6000 ms");
check(manifest.showcaseExperience?.landometer?.logo?.fullEndMs === 2870, "Landometer logo-full authored end must be 2870 ms");
check(manifest.showcaseExperience?.landometer?.logo?.quietEndMs === 3360, "Landometer logo-quiet authored end must be 3360 ms");
check(manifest.showcaseExperience?.landometer?.logo?.hostAttribute === "ink=blue", "Full Landometer previews must use blue ink in both library themes");
check(manifest.showcaseExperience?.landometer?.logo?.wedgeSrgb === "#1F87CE", "Showcase metadata must retain the v3 token-derived wedge");
check(manifest.showcaseExperience?.ijjiLogoSting?.full?.durationMs === 9000, "ijji full+tagline duration must be 9000 ms");
check(manifest.showcaseExperience?.ijjiLogoSting?.mark?.durationMs === 6400, "ijji mark-only duration must be 6400 ms");
check(manifest.showcaseExperience?.ijjiLogoSting?.mark?.notagline === true, "ijji mark-only route must bind notagline");
check(manifest.showcaseExperience?.reducedMotion === "show_complete_final_state_without_replay", "Reduced motion must show a complete final state without replay");
check(manifest.showcaseExperience?.authorityRef === "governance/inline-autoreplay-decision.json", "Manifest must resolve the current inline replay decision");
check(manifest.showcaseExperience?.dialogAuthorityRef === "governance/showcase-motion-decision.json", "Manifest must retain the dialog replay decision");
check(manifest.showcaseExperience?.inlinePerLocaleRoute?.total === 9, "Manifest must declare all nine inline motion surfaces per locale route");
check(manifest.showcaseExperience?.controls?.includes("page_pause_resume"), "Manifest must declare the page-level motion control");

check(sourceDecision.artifactRelease === "1.2.0" && sourceDecision.status === "owner_selected_sources_verified", "The exact source decision must remain bound to its 1.2.0 introduction");
check(sourceDecision.landometer?.cssSha256 === expectedLandometerHashes["assets/landometer/landometer-motifs.css"], "Animation-source decision has the wrong Landometer CSS hash");
check(sourceDecision.landometer?.jsSha256 === expectedLandometerHashes["assets/landometer/landometer-motifs.js"], "Animation-source decision has the wrong Landometer JS hash");
check(sourceDecision.ijji?.jsSha256 === expectedIjjiLogoHashes["assets/ijji/logo-sting/ijji-logo-sting.js"], "Animation-source decision has the wrong ijji runtime hash");
check(sourceDecision.supersedesForCurrentRelease?.some((value) => value.includes("logo-preview-final-settle-decision.json")), "Current source decision must supersede the historical v2 settle decision");
check(sourceDecision.supersedesForCurrentRelease?.some((value) => value.includes("#0195CB")), "Current source decision must explicitly supersede the historical wedge override");

check(sourceLedger.schemaVersion === "motif-library-source-ledger/1.1", "Unexpected source-ledger schema");
check(sourceLedger.artifact === `Landometer Motif Library v${release}`, "Source ledger release mismatch");
check(sourceLedger.embeddedInstructionBoundary?.includes("did not expand or replace"), "Source ledger must preserve the attached-document instruction boundary");
check(sourceLedger.selectedArtifactRuntime?.landometer?.logoQuietEndMs === 3360, "Source ledger must record the complete Landometer quiet timeline");
check(sourceLedger.selectedArtifactRuntime?.ijjiAnimatedIdentity?.fullDurationMs === 9000, "Source ledger must record the ijji full duration");
check(sourceLedger.selectedArtifactRuntime?.ijjiAnimatedIdentity?.markDurationMs === 6400, "Source ledger must record the ijji mark duration");

check(approval.schemaVersion === "motif-library-owner-approval/1.1", "Unexpected owner-approval schema");
check(approval.artifactRelease === release && approval.status === "approved_for_named_publication", `Owner approval does not authorize release ${release} publication`);
check(approval.rightsEvidenceClass === "owner_stated_not_independently_verified", "Owner-stated rights must retain their evidence classification");
check(sameMembers(approval.publicRepositoryAccess, ["view", "download"]), "Public repository access must remain view/download only");
check(approval.authorizedOperators?.length === 3, "Authorized reuse operators must remain explicit");
check(approval.releaseMembership?.lds_0_9_1 === false, "Artifact overlay must not claim LDS 0.9.1 membership");
check(approval.releaseMembership?.ijji_design_system_0_5_0 === false, "Artifact overlay must not claim ijji DS 0.5.0 membership");
check(approval.releaseMembership?.ijji_addon_0_5_3 === false, "Artifact overlay must not claim ijji Add-on 0.5.3 membership");
check(approval.assetManifestSha256 === sha256File("assets/motif-library.json"), "Owner approval does not bind the current manifest hash");

check(buildCard.schemaVersion === "motif-library-build-card/1.1", "Unexpected Build Card schema");
check(buildCard.artifactRelease === release, "Build Card release mismatch");
check(buildCard.routes?.length === 2, "Build Card must declare exactly two locale routes");
check(buildCard.decisionRecords?.sourceSelection === "governance/animation-source-v3-decision.json", "Build Card must resolve the v3 source decision");
check(buildCard.decisionRecords?.audienceParity === "governance/audience-animation-parity.json", "Build Card must resolve audience-animation parity evidence");
check(buildCard.decisionRecords?.inlineAutoreplay === "governance/inline-autoreplay-decision.json", "Build Card must resolve the current inline replay decision");
check(buildCard.capabilities?.exactLandometerV3Runtime === true, "Build Card must declare the exact Landometer v3 runtime");
check(buildCard.capabilities?.exactIjjiAnimatedIdentityR3 === true, "Build Card must declare the exact ijji animated identity runtime");
check(buildCard.capabilities?.inlineFullBrandLogoAutoreplay === true, "Build Card must declare inline brand-logo auto-replay");
check(buildCard.capabilities?.inlineIntentAhaNextActionAutoreplay === true, "Build Card must declare example-section auto-replay");
check(buildCard.capabilities?.pageLevelMotionPauseResume === true, "Build Card must declare the page-level pause/resume control");

check(showcaseDecision.schemaVersion === "motif-library-showcase-motion-decision/1.1", "Unexpected showcase-decision schema");
check(showcaseDecision.artifactRelease === "1.2.0" && showcaseDecision.status === "owner_selected_for_named_artifact", "Historical dialog showcase decision must remain bound to its 1.2.0 introduction");
check(showcaseDecision.showcaseBehavior?.landometer?.logo?.settleAtMs === 3400, "Showcase decision has the wrong Landometer settle time");
check(showcaseDecision.showcaseBehavior?.landometer?.logo?.replayIntervalMs === 6000, "Showcase decision has the wrong Landometer replay time");
check(showcaseDecision.showcaseBehavior?.ijjiAnimatedIdentity?.full?.durationMs === 9000, "Showcase decision has the wrong ijji full duration");
check(showcaseDecision.showcaseBehavior?.ijjiAnimatedIdentity?.mark?.durationMs === 6400, "Showcase decision has the wrong ijji mark duration");
check(showcaseDecision.productionBoundary?.portableLoopPermission === false, "Library replay must not grant portable loop permission");
check(showcaseDecision.productionBoundary?.implementationSnippets === "no_loop_attribute", "Copied snippets must remain finite-once");

check(inlineDecision.schemaVersion === "motif-library-inline-autoreplay-decision/1.0", "Unexpected inline-autoreplay decision schema");
check(inlineDecision.artifactRelease === release && inlineDecision.status === "owner_selected_for_named_artifact", "Inline auto-replay decision is not authorized for the current release");
check(inlineDecision.surfacesPerLocaleRoute?.total === 9, "Inline replay decision must enumerate nine surfaces per locale route");
check(inlineDecision.surfacesPerLocaleRoute?.brandLayer?.length === 2, "Inline replay decision must include both full brand logos");
check(inlineDecision.surfacesPerLocaleRoute?.intentAhaNextAction?.length === 6, "Inline replay decision must include all six example motifs");
check(inlineDecision.playback?.replay === "continuous_while_eligible", "Inline replay decision must authorize continuous eligible replay");
check(inlineDecision.viewerControl?.control === "one page-level pause/resume button", "Inline replay decision must preserve one page-level motion control");
check(inlineDecision.productionBoundary?.exactSourceRuntimeBytesEdited === false, "Inline orchestration must not edit exact source runtime bytes");
check(inlineDecision.productionBoundary?.normativeDesignSystemChange === false, "Inline replay must remain an artifact-local behavior");

check(audienceParity.artifactRelease === release, "Audience-animation parity record release mismatch");
const acceptableParityStatus = audienceParity.status === "passed"
  || audienceParity.status === "passed_live"
  || (allowPendingLive && audienceParity.status === "local_source_and_reference_qa_passed_live_pending");
check(acceptableParityStatus, `Audience-animation parity status is not ${allowPendingLive ? "candidate-" : "release-"}ready`);
check(audienceParity.landometer?.variantsChecked === 12, "Audience parity must cover all 12 Landometer variants");
check(audienceParity.landometer?.maximumTimelinesMs?.logo?.quiet === 3360, "Audience parity must cover the complete quiet-logo timeline");
check(audienceParity.landometer?.hostAdaptation?.includes("no timing, geometry, or wedge override"), "Audience parity must preserve exact v3 geometry and wedge behavior");
check(audienceParity.ijji?.corroboratingRuntimeResult === "pixel_identical_at_all_11_sampled_times", "ijji full runtimes were not corroborated across all sampled frames");
check(audienceParity.ijji?.responsiveSourceCheck?.includes("320, 360, 390, and 1440"), "Audience parity must cover narrow and wide source fixtures");
check(audienceParity.integrationChecks?.exactRuntimeAndLayerHashes === "passed", "Audience parity exact-byte integration gate failed");
check(audienceParity.integrationChecks?.finalFallbacks === "passed", "Audience parity final-fallback gate failed");
if (!allowPendingLive) {
  check(audienceParity.integrationChecks?.libraryBrowserQa === "passed", "Strict release verification requires passed library browser QA");
  check(audienceParity.integrationChecks?.liveByteAndRenderedQa === "passed", "Strict release verification requires passed live byte/rendered QA");
}

check(identityAssets.assets?.length === 2, "Identity manifest must declare favicon and social preview");
for (const asset of identityAssets.assets || []) {
  check(exists(asset.path), `Identity asset missing: ${asset.path}`);
  if (exists(asset.path)) {
    check(fs.statSync(absolute(asset.path)).size === asset.bytes, `Identity byte count mismatch: ${asset.path}`);
    check(sha256File(asset.path) === asset.sha256, `Identity hash mismatch: ${asset.path}`);
  }
}

check(manifest.distributionMirrors?.googleDrive?.rootUrl === driveRootUrl, "Manifest Drive root mismatch");
check(manifest.distributionMirrors?.googleDrive?.immutableReleaseUrl === driveReleaseUrl, "Manifest Drive release folder mismatch");
check(approval.distributionMirror?.rootUrl === driveRootUrl, "Owner approval Drive root mismatch");
check(approval.distributionMirror?.immutableReleaseUrl === driveReleaseUrl, "Owner approval Drive release folder mismatch");
check(buildCard.distributionMirrors?.googleDrive === driveRootUrl, "Build Card Drive root mismatch");
check(buildCard.distributionMirrors?.immutableRelease === driveReleaseUrl, "Build Card Drive release folder mismatch");
check(read("docs/ai-sync.md").includes(driveReleaseUrl), "AI sync guide must resolve the immutable Drive 1.2.1 folder");
check(read("CLAUDE.md").includes(driveRootUrl) && read("CLAUDE.md").includes("release-index.json"), "Claude handoff must resolve immutable releases through the governed Drive index");

function verifyHtml(relativePath, locale, expectedCanonical) {
  const html = read(relativePath);
  check(new RegExp(`<html\\s+lang="${locale}"`).test(html), `${relativePath}: wrong language`);
  check((html.match(/<h1\b/g) || []).length === 1, `${relativePath}: expected exactly one H1`);
  check((html.match(/<main\b/g) || []).length === 1, `${relativePath}: expected exactly one main landmark`);
  check(html.includes(`<link rel="canonical" href="${expectedCanonical}">`), `${relativePath}: canonical mismatch`);
  check(html.includes('hreflang="th"') && html.includes('hreflang="en"') && html.includes('hreflang="x-default"'), `${relativePath}: complete hreflang set missing`);
  check(html.includes("landometer-favicon-64-v1.png"), `${relativePath}: favicon declaration missing`);
  check((html.match(/class="asset-card"/g) || []).length === 11, `${relativePath}: expected exactly 11 asset cards`);
  check((html.match(/<article class="asset-card"[^>]*data-brand="landometer"/g) || []).length === 6, `${relativePath}: expected six Landometer cards`);
  check((html.match(/<article class="asset-card"[^>]*data-brand="ijji"/g) || []).length === 5, `${relativePath}: expected five ijji-grouped cards`);
  check((html.match(/data-preview-brand="ijji-logo"/g) || []).length === 2, `${relativePath}: expected two ijji animated-identity preview routes`);
  check((html.match(/data-preview-brand="landometer"/g) || []).length === 6, `${relativePath}: expected six paired Landometer preview routes`);
  check(html.includes('id="ijji-animated-logo-tagline"') && html.includes('id="ijji-animated-logo-mark"'), `${relativePath}: ijji full and mark cards are missing`);
  check(html.includes("assets/downloads/landometer-motifs-v3.zip?v=1.2.1"), `${relativePath}: revisioned Landometer v3 kit link missing`);
  check(html.includes("assets/downloads/ijji-animated-logo-r3.zip?v=1.2.1"), `${relativePath}: revisioned ijji animated-logo kit link missing`);
  check(html.includes("assets/downloads/ijji-motifs-selected-r3.zip?v=1.2.1"), `${relativePath}: revisioned ijji selected-motif kit link missing`);
  check(html.includes("assets/downloads/motif-library-v1.2.1.zip"), `${relativePath}: full release kit link missing`);
  check(!html.includes("landometer-motifs-v1.zip") && !html.includes("motif-library-v1.zip"), `${relativePath}: stale kit link leaked into the current route`);
  check(!html.includes("explorations/"), `${relativePath}: exploration asset leaked into the page`);
  check(!html.includes("Landometer-Logo-TransparentBG"), `${relativePath}: source lockup leaked into the page`);
  check(html.includes("authorized") || html.includes("ได้รับอนุญาต"), `${relativePath}: authorized-reuse boundary missing`);
  check(html.includes('"version": "1.2.1"'), `${relativePath}: JSON-LD release version mismatch`);
  check(html.includes("site.js?v=1.2.1"), `${relativePath}: site runtime cache revision mismatch`);
  check(html.includes("landometer-motifs.css?v=1.2.1") && html.includes("landometer-motifs.js?v=1.2.1"), `${relativePath}: exact Landometer runtime cache revision mismatch`);
  check(html.includes("logo-full.svg?v=1.2.1") && html.includes("logo-quiet.svg?v=1.2.1"), `${relativePath}: v3 logo static assets are not cache-busted`);
  check((html.match(/data-motion-toggle/g) || []).length === 1, `${relativePath}: expected one page-level motion control`);
  check(!/data-motion-toggle[^>]*aria-pressed/.test(html), `${relativePath}: action-style motion control must not expose toggle-state semantics`);
  check(/id="preview-status" aria-live="off"/.test(html), `${relativePath}: automatic preview cycles must not repeatedly announce`);
  check(/data-preview-announcer role="status" aria-live="polite"/.test(html), `${relativePath}: preview user actions need a dedicated one-shot announcer`);
  check((html.match(/data-lm-live/g) || []).length === 6, `${relativePath}: expected six inline Landometer motion surfaces`);
  check((html.match(/data-ijji-logo-live/g) || []).length === 1, `${relativePath}: expected one inline ijji full-logo motion surface`);
  check((html.match(/data-ijji-motif-live/g) || []).length === 2, `${relativePath}: expected two inline ijji motif surfaces`);
  check(html.includes('data-lm-live data-kind="logo" data-ink="blue" data-loop="6000"'), `${relativePath}: Landometer full-logo inline replay is missing`);
  check(html.includes('data-lm-live data-kind="dial" data-ink="blue" data-loop="3000"'), `${relativePath}: full hero motif must keep the exact Brand Blue palette`);
  check(html.includes('data-lm-live data-kind="rings" data-ink="blue" data-loop="3000"'), `${relativePath}: full example motif must keep the exact Brand Blue palette`);
  check(html.includes('data-ijji-logo-live'), `${relativePath}: ijji full-logo inline replay is missing`);
  check(!html.includes("ใช้ภาพนิ่งเพื่อรักษาจังหวะเดียวกัน") && !html.includes("Use stable stills across decks"), `${relativePath}: superseded static-first paragraph remains visible`);

  for (const assetId of [
    "landometer.dial.full", "landometer.dial.quiet", "landometer.rings.full", "landometer.rings.quiet",
    "landometer.layers.full", "landometer.layers.quiet", "landometer.slice.full", "landometer.slice.quiet",
    "landometer.cultivate.full", "landometer.cultivate.quiet", "landometer.logo.full", "landometer.logo.quiet",
    "ijji.logo-sting.tagline", "ijji.logo-sting.mark", "ijji.graph-b-transparent-ink", "ijji.graph-b-transparent-mint",
    "ijji.rings-c-transparent-ink", "ijji.rings-c-transparent-mint", "ijji.rotate-b-transparent-ink", "ijji.rotate-b-transparent-mint",
  ]) check(html.includes(assetId), `${relativePath}: displayed asset ID is missing: ${assetId}`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  check(ids.length === new Set(ids).size, `${relativePath}: duplicate HTML IDs found`);
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  images.forEach((tag, index) => check(/\salt="[^"]*"/.test(tag), `${relativePath}: image ${index + 1} has no alt attribute`));

  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  check(jsonLdBlocks.length === 1, `${relativePath}: expected one JSON-LD block`);
  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block);
      check(parsed.version === release, `${relativePath}: JSON-LD parsed but has the wrong release`);
    } catch {
      check(false, `${relativePath}: invalid JSON-LD`);
    }
  }

  const localRefs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of localRefs) {
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
    const clean = ref.split(/[?#]/)[0];
    if (!clean) continue;
    const resolved = clean.startsWith("/motif/")
      ? path.join(root, clean.slice("/motif/".length))
      : path.resolve(path.dirname(absolute(relativePath)), clean);
    check(fs.existsSync(resolved), `${relativePath}: unresolved local reference ${ref}`);
  }
}

verifyHtml("index.html", "th", "https://montri-th.github.io/motif/");
verifyHtml("en/index.html", "en", "https://montri-th.github.io/motif/en/");

const errorHtml = read("404.html");
check(errorHtml.includes('<meta name="robots" content="noindex">'), "404 route must remain noindex");
check(errorHtml.includes('/motif/assets/identity/landometer-favicon-64-v1.png'), "404 favicon path must remain project-scoped");
check(errorHtml.includes('href="/motif/site.css"'), "404 stylesheet path must remain project-scoped");
check(errorHtml.includes('href="/motif/"') && errorHtml.includes('href="/motif/en/"'), "404 recovery routes are missing");
check(!/\b(?:href|src)="\/(?!motif\/)/.test(errorHtml), "404 asset escaped the /motif/ project path");

const siteJs = read("site.js");
check(!/https?:\/\/(?!montri-th\.github\.io\/motif)/.test(siteJs), "Site runtime contains an unexpected external URL");
check(!siteJs.includes("eval("), "Site runtime must not use eval");
check(siteJs.includes("document.baseURI"), "Dynamic assets must resolve from the locale document URL");
check(siteJs.includes("const landometerDefaultReplayMs = 3000"), "Default Landometer replay cadence is missing");
check(siteJs.includes("const landometerLogoReplayMs = 6000"), "Landometer v3 logo replay cadence is missing");
check(siteJs.includes("const landometerLogoSettleMs = 3400"), "Landometer v3 complete-final settle timing is missing");
check(siteJs.includes('pair.className = "dialog-motif-pair"'), "Landometer preview must render full and quiet together");
check(siteJs.includes('motif.setAttribute("ink", "blue")'), "Full Landometer preview must preserve the light-reference blue ink in dark mode");
check(!siteJs.includes("--lm-wedge"), "Historical wedge override must not be applied by the v3 site runtime");
check(siteJs.includes("ijji-logo-sting.js?v=1.2.1"), "ijji animated-identity runtime is not cache-busted to release 1.2.1");
check(siteJs.includes('logo.setAttribute("manual", "")'), "Library must take explicit control of ijji logo showcase replay");
check(siteJs.includes('logo.setAttribute("loop", "")') && siteJs.includes('previous.removeAttribute("loop")'), "ijji showcase auto-replay start/stop lifecycle is incomplete");
check(siteJs.includes("disposeIjjiLogoPreview") && siteJs.includes("mountIjjiLogoPreview"), "ijji showcase must replace stopped components so stale source-runtime loop callbacks cannot restart them");
check(siteJs.includes("preloadIjjiLogoLayers"), "ijji identity must preload every exact layer before replacing its complete fallback");
check(siteJs.includes('logo.setAttribute("notagline", "")'), "ijji mark-only preview does not bind notagline");
check(siteJs.includes('logo.setAttribute("surface", "brand-blue")'), "ijji full preview does not bind its reference Brand Blue surface");
check(siteJs.includes('window.addEventListener("pagehide"'), "Preview timers must stop on pagehide");
check(siteJs.includes('document.addEventListener("visibilitychange"'), "Preview motion must respond to document visibility");
check(siteJs.includes('previewConfig?.brand === "ijji" && document.visibilityState !== "visible"'), "State-bound ijji preview must stop when the document is hidden");
check(siteJs.includes('prefers-reduced-motion: reduce'), "Preview motion must honor reduced-motion preference");
check(siteJs.includes("const inlineMotionControllers = []"), "Inline motion controller registry is missing");
check(siteJs.includes("IntersectionObserver") && siteJs.includes("threshold: 0.14") && siteJs.includes("entry.intersectionRatio >= 0.14"), "Inline motion 14-percent visibility lifecycle is missing");
check(siteJs.includes("inlineMotionPaused") && siteJs.includes("syncMotionToggle"), "Page-level inline motion pause/resume lifecycle is missing");
check(siteJs.includes('motionToggle.removeAttribute("aria-pressed")') && siteJs.includes("motionToggle.hidden = isReduced"), "Page-level motion action semantics or reduced-motion visibility is incomplete");
check(siteJs.includes('if (previewConfig.brand === "ijji-logo") ijjiLogoPreviewPaused = false') && !siteJs.includes("preservedIjjiPause"), "ijji preview must reset pause only for a fresh selection and preserve live user intent across async/remount lifecycles");
check(siteJs.includes("announcePreviewAction") && siteJs.includes("dialogAnnouncer"), "Preview user actions need one-shot accessibility announcements separate from automatic cycles");
check(siteJs.includes('data.motionState') || siteJs.includes('dataset.motionState'), "Inline motion final/running state marker is missing");

const historicalLogoHarness = read("scripts/logo-full-visual-qa.mjs");
check(
  historicalLogoHarness.includes('--historical-1.1.3') && historicalLogoHarness.includes("process.exit(2)"),
  "Historical 1.1.3 logo harness must fail closed unless explicitly invoked for historical reproduction",
);

const ijjiCopyStart = siteJs.indexOf('} else if (brand === "ijji-logo") {');
const ijjiCopyEnd = siteJs.indexOf("} else {", ijjiCopyStart + 1);
check(ijjiCopyStart >= 0 && ijjiCopyEnd > ijjiCopyStart, "Unable to resolve the ijji animated-identity copy snippet");
if (ijjiCopyStart >= 0 && ijjiCopyEnd > ijjiCopyStart) {
  const copiedIjjiSnippet = siteJs.slice(ijjiCopyStart, ijjiCopyEnd);
  check(!copiedIjjiSnippet.includes(" manual"), "Production ijji snippet must not copy library manual control");
  check(!copiedIjjiSnippet.includes(" loop"), "Production ijji snippet must remain finite-once");
  check(copiedIjjiSnippet.includes('notagline bounce="extra"'), "Copied ijji mark snippet must preserve its exact variant attributes");
  check(copiedIjjiSnippet.includes('surface="brand-blue" bounce="playful"'), "Copied ijji full snippet must preserve its exact reference presentation");
  check(copiedIjjiSnippet.includes("ijji-logo-still.png") && copiedIjjiSnippet.includes("ijji-mark-still.png"), "Copied ijji snippets must retain exact final fallbacks");
}

const siteCss = read("site.css");
check(siteCss.includes("html:not(.js-ready)"), "No-JavaScript enhancement controls must fail closed");
check(siteCss.includes(".dialog-stage.is-logo-sting"), "ijji animated-identity dialog surface is missing");
check(siteCss.includes("dialog.is-logo-sting { width: calc(100% - 4px)"), "Narrow ijji animation dialog must preserve the 320 px source minimum where possible");
check(siteCss.includes("@media (max-width: 340px)"), "Edge-to-edge smallest-screen ijji treatment is missing");
check(read("sitemap.xml").includes("https://montri-th.github.io/motif/en/"), "English route missing from sitemap");
check(read("robots.txt").includes("Sitemap: https://montri-th.github.io/motif/sitemap.xml"), "robots.txt sitemap mismatch");

// Local machine-readable QA belongs to this release and must contain no failed checks.
for (const relative of ["governance/browser-qa.json", "governance/performance-qa.json", "governance/runtime-parity.json"]) {
  const evidence = readJson(relative);
  check(evidence.artifactRelease === release, `${relative}: evidence is stale and must bind release ${release}`);
  if (Array.isArray(evidence.checks)) {
    const failed = evidence.checks.filter((item) => item.passed === false || item.status === "failed");
    check(failed.length === 0, `${relative}: contains ${failed.length} failed checks`);
  }
  if (evidence.totals) check(evidence.totals.failed === 0 && evidence.totals.passed === evidence.totals.checks, `${relative}: aggregate check totals do not pass`);
}

if (failures.length) {
  console.error(`FAILED: ${failures.length} of ${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS: ${checks} release ${release} source, route, asset, authority, audience-parity, and hash checks.`);
