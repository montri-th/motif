import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function mimeFor(relativePath) {
  if (relativePath.endsWith(".svg")) return "image/svg+xml";
  if (relativePath.endsWith(".png")) return "image/png";
  if (relativePath.endsWith(".css")) return "text/css";
  if (relativePath.endsWith(".js")) return "text/javascript";
  if (relativePath.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

function record(relativePath, extra) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  const text = relativePath.endsWith(".svg") ? bytes.toString("utf8") : "";
  const viewBox = text.match(/viewBox="([^"]+)"/)?.[1] || null;
  return {
    ...extra,
    path: relativePath,
    mime: mimeFor(relativePath),
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    ...(viewBox ? { viewBox } : {}),
  };
}

const common = {
  approvalStatus: "owner_approved_artifact_overlay",
  approvalRef: "governance/owner-approval.json",
  publicationPermission: true,
  rights: "owner_created_and_holds_full_rights; public availability is not an unrestricted third-party license",
  permittedTransformations: ["resize_proportionally", "rasterize_exact_geometry"],
  prohibitedTransformations: ["redraw", "recolor", "crop_geometry", "distort", "trace_from_screenshot_or_memory"],
  approvedOutputAudiences: ["internal_preview", "internal_operational", "client", "public"],
  authorizedOperators: ["landometer_team", "owner_authorized_collaborator", "authorized_ai_or_agent_workflow"],
  reusePermission: "authorized_operators_only; public access permits viewing and downloading but is not an unrestricted reuse license",
};

const landometerJobs = {
  dial: ["orientation", "opening"],
  rings: ["spatial_transition", "section_orientation"],
  layers: ["layering", "quiet_divider"],
  slice: ["action_closure"],
  cultivate: ["cultural_closure", "handoff"],
  logo: ["animated_brand_opening"],
};

const landometerAssets = [];
for (const kind of Object.keys(landometerJobs)) {
  for (const variant of ["full", "quiet"]) {
    landometerAssets.push(record(`assets/landometer/svg/${kind}-${variant}.svg`, {
      ...common,
      assetId: `landometer.${kind}.${variant}`,
      familyId: "landometer.motif.v3",
      productScope: "shared_landometer",
      role: "generated_vector",
      identityRole: kind === "logo" ? "animated_mark_assembly_reference" : "none",
      motif: kind,
      variant,
      surface: "transparent",
      motionMode: "static",
      allowedJobs: landometerJobs[kind],
      prohibitedJobs: ["data_encoding", "evidence", "measured_state", "loading_state", "official_navigation_identity", "favicon", "co_brand_lockup"],
      allowedFormats: ["web_public", "deck_16x9", "social_square_1080", "document_pdf", "video_owner_extension"],
      staticFallback: "self",
      altPolicy: "empty_when_decorative; describe the motif only in a learning or asset-catalog context",
      sourceRuntime: "assets/landometer/landometer-motifs.js",
      ...(kind === "logo" && variant === "full" ? {
        referencePresentation: {
          hostAttributeForThemeInvariantPreview: "ink=blue",
          wedgeDerivation: "color-mix(in lch, energy-sky 48%, brand-blue)",
          browserSrgbWedge: "#1F87CE",
          referenceHtml: "owner-supplied set-3 example",
        },
      } : {}),
    }));
  }
}

landometerAssets.push(
  record("assets/landometer/landometer-motifs.css", {
    ...common,
    assetId: "landometer.motif.runtime.css.v3",
    familyId: "landometer.motif.v3",
    productScope: "shared_landometer",
    role: "web_runtime",
    identityRole: "not_applicable",
    allowedJobs: ["finite_once_motion"],
    prohibitedJobs: ["essential_content"],
    allowedFormats: ["web_public"],
    motionMode: "finite_once",
    runtimeGroupId: "landometer.motif.runtime.web.v3",
    permittedTransformations: [],
    staticFallbackBinding: "selectedRecord.path",
  }),
  record("assets/landometer/landometer-motifs.js", {
    ...common,
    assetId: "landometer.motif.runtime.js.v3",
    familyId: "landometer.motif.v3",
    productScope: "shared_landometer",
    role: "web_runtime",
    identityRole: "not_applicable",
    allowedJobs: ["finite_once_motion"],
    prohibitedJobs: ["essential_content"],
    allowedFormats: ["web_public"],
    motionMode: "finite_once",
    runtimeGroupId: "landometer.motif.runtime.web.v3",
    permittedTransformations: [],
    staticFallbackBinding: "selectedRecord.path",
  }),
);

const ijjiSourceManifest = JSON.parse(fs.readFileSync(path.join(root, "assets/ijji/manifest.json"), "utf8"));
const ijjiMeaning = {
  "graph-b": { allowedJobs: ["real_calculation_pending_state", "secondary_orientation"], minDeliveredPx: 72 },
  "rings-c": { allowedJobs: ["real_area_gathering_pending_state", "secondary_orientation"], minDeliveredPx: 40 },
  "rotate-b": { allowedJobs: ["real_iterative_pending_state", "secondary_orientation"], minDeliveredPx: 24 },
};

const ijjiMotifAssets = ijjiSourceManifest.files.map((file) => {
  const meta = ijjiMeaning[file.motif];
  return record(`assets/ijji/${file.file}`, {
    ...common,
    assetId: `ijji.${file.id}`,
    familyId: "ijji.four-beat.selected-3.r3",
    productScope: "ijji_product_specific",
    role: "generated_vector",
    identityRole: "none",
    motif: file.motif,
    variant: "not_applicable",
    surface: file.surface,
    motionMode: "static",
    loopSeconds: file.loopSeconds,
    minDeliveredPx: meta.minDeliveredPx,
    allowedJobs: meta.allowedJobs,
    prohibitedJobs: ["shared_landometer_identity", "logo", "data_encoding", "evidence", "sales_growth_claim", "confidence", "completion", "map_legend", "legal_or_high_stress_state"],
    allowedFormats: ["web_public", "deck_16x9", "social_square_1080", "document_pdf", "video_owner_extension"],
    motionPolicy: "state_bound_only; stop on success, failure, cancel, or timeout; visible status text required",
    staticFallback: "self",
    altPolicy: "empty when decorative or redundant; visible status text carries pending-state meaning",
  });
});

ijjiMotifAssets.push(
  record("assets/ijji/ijji-motion.css", {
    ...common,
    assetId: "ijji.four-beat.runtime.css",
    familyId: "ijji.four-beat.selected-3.r3",
    productScope: "ijji_product_specific",
    role: "web_runtime",
    identityRole: "not_applicable",
    allowedJobs: ["real_pending_state"],
    prohibitedJobs: ["ambient_or_unbounded_loop", "shared_landometer_loader"],
    allowedFormats: ["web_public"],
    motionMode: "state_bound_only",
    runtimeGroupId: "ijji.four-beat.runtime.web.r3",
    permittedTransformations: [],
    staticFallbackBinding: "selectedRecord.path",
  }),
  record("assets/ijji/ijji-motifs.js", {
    ...common,
    assetId: "ijji.four-beat.runtime.js",
    familyId: "ijji.four-beat.selected-3.r3",
    productScope: "ijji_product_specific",
    role: "web_runtime",
    identityRole: "not_applicable",
    allowedJobs: ["real_pending_state"],
    prohibitedJobs: ["ambient_or_unbounded_loop", "shared_landometer_loader"],
    allowedFormats: ["web_public"],
    motionMode: "state_bound_only",
    runtimeGroupId: "ijji.four-beat.runtime.web.r3",
    permittedTransformations: [],
    staticFallbackBinding: "selectedRecord.path",
  }),
);

const logoRoot = "assets/ijji/logo-sting";
const ijjiLogoAssets = [
  record(`${logoRoot}/layers/ijji-logo-still.png`, {
    ...common,
    assetId: "ijji.logo-sting.tagline",
    familyId: "ijji.logo-sting.r3",
    productScope: "ijji_product_specific",
    role: "raster_identity",
    identityRole: "animated_logo_final_fallback",
    motif: "logo-sting",
    variant: "tagline",
    surface: "brand-blue",
    motionMode: "static",
    minDeliveredPx: 320,
    allowedJobs: ["ijji_animated_identity_with_tagline"],
    prohibitedJobs: ["shared_landometer_identity", "data_encoding", "evidence", "pending_state"],
    allowedFormats: ["web_public", "deck_16x9", "social_square_1080", "document_pdf", "video_owner_extension"],
    staticFallback: "self",
    altPolicy: "ijji — Your business buddy around the corner",
  }),
  record(`${logoRoot}/layers/ijji-mark-still.png`, {
    ...common,
    assetId: "ijji.logo-sting.mark",
    familyId: "ijji.logo-sting.r3",
    productScope: "ijji_product_specific",
    role: "raster_identity",
    identityRole: "animated_mark_final_fallback",
    motif: "logo-sting",
    variant: "mark_only",
    surface: "transparent",
    compatibleHostSurfaces: ["brand-blue", "dark"],
    motionMode: "static",
    minDeliveredPx: 160,
    allowedJobs: ["ijji_animated_identity_mark_only"],
    prohibitedJobs: ["shared_landometer_identity", "data_encoding", "evidence", "pending_state"],
    allowedFormats: ["web_public", "deck_16x9", "social_square_1080", "document_pdf", "video_owner_extension"],
    staticFallback: "self",
    altPolicy: "ijji",
  }),
  record(`${logoRoot}/ijji-logo-sting.js`, {
    ...common,
    assetId: "ijji.logo-sting.runtime.r3",
    familyId: "ijji.logo-sting.r3",
    productScope: "ijji_product_specific",
    role: "web_runtime",
    identityRole: "animated_identity_runtime",
    allowedJobs: ["finite_once_logo_sting"],
    prohibitedJobs: ["shared_landometer_identity", "data_encoding", "evidence", "pending_state"],
    allowedFormats: ["web_public"],
    motionMode: "finite_once_logo_sting",
    runtimeGroupId: "ijji.logo-sting.runtime.web.r3",
    permittedTransformations: [],
    staticFallbackBinding: "selectedRecord.path",
  }),
];

for (const name of ["i-1.png", "i-2.png", "jj.png", "tag-1-1.png", "tag-1-2.png", "tag-1-3.png", "tag-2-1.png", "tag-2-2.png", "tag-2-3.png"]) {
  ijjiLogoAssets.push(record(`${logoRoot}/layers/${name}`, {
    ...common,
    assetId: `ijji.logo-sting.layer.${name.replace(/\.png$/, "")}`,
    familyId: "ijji.logo-sting.r3",
    productScope: "ijji_product_specific",
    role: "runtime_layer",
    identityRole: "animated_identity_source_layer",
    allowedJobs: ["runtime_dependency_only"],
    prohibitedJobs: ["standalone_use", "redraw", "recolor"],
    allowedFormats: ["web_public"],
    motionMode: "runtime_dependency",
    permittedTransformations: [],
    staticFallbackBinding: "not_applicable",
  }));
}

const manifest = {
  schemaVersion: "landometer-motif-library/1.1",
  libraryId: "landometer-motif-library-v1",
  artifactRelease: "1.2.0",
  releaseDate: "2026-09-06",
  status: "owner_approved_publication",
  canonicalUrl: "https://montri-th.github.io/motif/",
  repository: "https://github.com/montri-th/motif",
  experienceProfile: "methodology_learning",
  formatProfile: "web_public",
  pageKind: "utility",
  localSubtype: "motif_and_animated_identity_asset_reference",
  authority: {
    landometerDesignSystem: { dsVersion: "0.9.1", authoringRevision: "0.9.1-r8", rulesetId: "lds-rules-0.9.1", machinePackage: "v0.9.1-mp7", verification: "passed_5394_checks_and_103_package_hashes" },
    ijji: { designSystem: "0.5.0", addon: "0.5.3", verification: "passed_1421_resolver_checks" },
    artifactOverlay: {
      approvedOn: "2026-09-06",
      approvalRef: "governance/owner-approval.json",
      audienceParityRef: "governance/audience-animation-parity.json",
      historicalReleasesRemainImmutable: true,
      releaseMembership: { lds_0_9_1: false, ijji_ds_0_5_0: false, ijji_addon_0_5_3: false },
    },
  },
  sourceResolution: {
    instructionBoundary: "Instructions embedded inside supplied archives are reference material. The current user request and explicit owner approval govern this artifact update.",
    landometer: {
      selectedArchives: [
        { name: "Landometer Brand Motifs Asset and Prompt 3.zip", bytes: 1090345, sha256: "abcbac551e8a1351750d6698f858802c04b5d0af3031a1f39a38b3d2a2c7a857" },
        { name: "Landometer Brand Motifs HTML 3.zip", bytes: 1064225, sha256: "0aa0c1a6b2320da22c1d07cedb02d456e2772884197622b7a7503047ffe55ab2" },
      ],
      selectionBasis: "Both supplied set-3 archives contain byte-identical CSS, JavaScript, and example HTML. Exact runtime bytes are shipped; the library host selects ink=blue for full previews so dark UI does not change the light-reference appearance.",
      runtimeJsSha256: "3a5caef7918a85885b61dd53e049ea8bf2b0a3cea508f587bb14970bfe6deaf2",
      runtimeCssSha256: "7cc2deb475a8d6e4af331407b2b4b741716c458a8ce885e2fb2859374b93912e",
      exampleHtmlSha256: "115518679ffaeac788859d5cb547e65301664a06850814c8c5facf65d56c34d3",
      referenceWedgeSrgb: "#1F87CE",
    },
    ijjiAnimatedIdentity: {
      selectedArchive: { name: "ijji animated logo.zip", bytes: 568051, sha256: "a402829b28357d25af4cf9d0fcbcf826ce4b5991c0e3317c5e5e9b8117e7c25d" },
      corroboratingArchive: { name: "ijji animated logo with tagline.zip", bytes: 456473, sha256: "685dcdc661213f903f55845e680f0af6c1f16db71e37f31cc316b3def7851a43" },
      selectionBasis: "The selected archive is the superset runtime: it preserves the corroborated full+tagline output and also supports mark-only through notagline. One runtime is loaded to avoid custom-element registration order conflicts.",
      runtimeJsSha256: "1a1d1bc247b5deb92aa19e4d84524ac1f823454a9401b6ce53acf8716010433e",
      fullStillSha256: "bb1bc80e0c79a10dedb1b48c39efd187e97fe429adec4917975e265f610ccaac",
      markStillSha256: "acac2c65b1a17c1956686c3fdbb2a0a6dc3c547c35be1ca128675d28b0ffc630",
      sourceChecksumNote: "The supplied archive checksum list omitted ijji-mark-still.png; this release hashes that file in both the machine manifest and repository checksum set.",
    },
    ijjiSelectedMotifs: "Selected graph-b, rings-c, and rotate-b from the earlier owner-approved revision-3 overlay remain unchanged and separate from animated identity.",
    explorations: "decision_history_only_not_distributed",
  },
  showcaseExperience: {
    classification: "component_local_instructional_showcase",
    authorityRef: "governance/showcase-motion-decision.json",
    revealTrigger: "user_opens_preview_dialog",
    autoplay: "immediate",
    activeConditions: ["dialog_open", "document_visible", "reduced_motion_off", "not_manually_paused"],
    controls: ["pause_auto_replay", "replay_now"],
    landometer: { variants: ["full", "quiet"], defaultReplayIntervalMs: 3000, logo: { settleAtMs: 3400, replayIntervalMs: 6000, fullEndMs: 2870, quietEndMs: 3360, hostAttribute: "ink=blue", wedgeSrgb: "#1F87CE" } },
    ijjiLogoSting: { full: { durationMs: 9000, loopGapMs: 400, surface: "brand-blue", bounce: "playful" }, mark: { durationMs: 6400, loopGapMs: 400, notagline: true, bounce: "extra" } },
    reducedMotion: "show_complete_final_state_without_replay",
    boundary: "Auto-replay exists only so library visitors can inspect the full sequence. Copied production snippets use the exact runtime's finite-once, final-hold behavior.",
  },
  distributionMirrors: {
    googleDrive: {
      role: "governed_asset_mirror_for_authorized_human_and_agent_retrieval",
      rootUrl: "https://drive.google.com/drive/folders/1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh",
      immutableReleaseUrl: "https://drive.google.com/drive/folders/1mcsME-10TL_6qpPDk1-RsMqXLNEnatg5",
      syncGuide: "docs/ai-sync.md",
      releaseIdentityRule: "Resolve release-index.json, then verify the exact manifest and checksum before use.",
    },
  },
  agentContract: {
    schemaVersion: "motif-library-agent-contract/1.1",
    selectionRule: "Choose one exact baseline record from families[].assets. Copy scalar fields and choose allowedJob and allowedFormat from that same record. Do not infer an animated-identity route from a motif record.",
    requiredFields: ["familyId", "productScope", "assetId", "allowedJob", "allowedFormat", "surface", "variant", "motionMode", "path", "sha256", "staticFallback", "approvalRef"],
    baselineMotionMode: "static",
    showcaseBoundary: "Do not copy the library preview auto-replay behavior into production. It is an inspection aid.",
    motionExtensionRule: "For web_public only, select the one extension whose familyId matches the baseline record. Copy its exact runtimeAssetIds and lifecycle, and keep the selected baseline path as fallback.",
    motionExtensions: {
      finite_once: { familyId: "landometer.motif.v3", eligibleBaselineRole: "generated_vector", motionMode: "finite_once", runtimeAssetIds: ["landometer.motif.runtime.css.v3", "landometer.motif.runtime.js.v3"], runtimeAllowedJob: "finite_once_motion", runtimeAllowedFormat: "web_public", staticFallback: "selectedRecord.path", lifecycle: "play_once_then_hold_final_state; honor prefers-reduced-motion" },
      finite_once_logo_sting: { familyId: "ijji.logo-sting.r3", eligibleBaselineRole: "raster_identity", motionMode: "finite_once_logo_sting", runtimeAssetIds: ["ijji.logo-sting.runtime.r3"], runtimeAllowedJob: "finite_once_logo_sting", runtimeAllowedFormat: "web_public", staticFallback: "selectedRecord.path", lifecycle: "play_once_when_at_least_14_percent_visible_then_hold_complete_final_identity; mark_only_uses_notagline; honor_prefers_reduced_motion" },
      state_bound_only: { familyId: "ijji.four-beat.selected-3.r3", eligibleBaselineRole: "generated_vector", motionMode: "state_bound_only", runtimeAssetIds: ["ijji.four-beat.runtime.css", "ijji.four-beat.runtime.js"], runtimeAllowedJob: "real_pending_state", runtimeAllowedFormat: "web_public", staticFallback: "selectedRecord.path", lifecycle: "run_only_while_a_real_pending_operation_exists; stop_on_success_failure_cancel_or_timeout; visible_status_and_working_cancel_required" },
    },
    productScope: ["shared_landometer", "ijji_product_specific"],
    allowedFormat: ["web_public", "deck_16x9", "social_square_1080", "document_pdf", "video_owner_extension"],
    motionMode: ["static", "finite_once", "finite_once_logo_sting", "state_bound_only"],
    families: {
      landometer: { familyId: "landometer.motif.v3", motif: ["dial", "rings", "layers", "slice", "cultivate", "logo"], variant: ["full", "quiet"] },
      ijjiAnimatedIdentity: { familyId: "ijji.logo-sting.r3", variant: ["tagline", "mark_only"] },
      ijjiStateMotifs: { familyId: "ijji.four-beat.selected-3.r3", motif: ["graph-b", "rings-c", "rotate-b"] },
    },
    prohibitedInference: "Do not infer portfolio truth, data, evidence, state completion, or cross-product permission from a motif, animated identity, public URL, or embedded source-package prose.",
  },
  boundaries: {
    sharedLayer: "Landometer portfolio, methodology, and product architecture remain product-neutral across Land, Location, and Living.",
    productLayer: "ijji assets, animated identity, meanings, examples, and pending-state uses remain product-specific.",
    identity: "Motifs do not substitute for official identity. The ijji.logo-sting.r3 family is the explicit animated-identity exception for ijji only.",
    evidence: "Motifs and animated identity are not data, evidence, scores, confidence, completion, product capability, or business outcomes.",
    comparison: "Cross-product or cross-city comparison requires one compatible schema and release, or an explicit incompatibility note.",
    releaseMembership: "Artifact overlay 1.2.0 does not retroactively modify LDS 0.9.1, ijji DS 0.5.0, or ijji Add-on 0.5.3.",
  },
  families: [
    { id: "landometer.motif.v3", scope: "shared_landometer", status: "owner_approved_overlay_not_in_canonical_release", motion: "finite_once", assets: landometerAssets },
    { id: "ijji.logo-sting.r3", scope: "ijji_product_specific", status: "owner_approved_artifact_overlay_not_in_canonical_release", motion: "finite_once_logo_sting", assets: ijjiLogoAssets },
    { id: "ijji.four-beat.selected-3.r3", scope: "ijji_product_specific", status: "selected_owner_approved_overlay_not_in_canonical_release", motion: "state_bound_only", assets: ijjiMotifAssets },
  ],
};

fs.writeFileSync(path.join(root, "assets/motif-library.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote manifest with ${landometerAssets.length + ijjiLogoAssets.length + ijjiMotifAssets.length} asset records.`);
