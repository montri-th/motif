import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function record(relativePath, extra) {
  const absolutePath = path.join(root, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  const text = relativePath.endsWith(".svg") ? bytes.toString("utf8") : "";
  const viewBox = text.match(/viewBox="([^"]+)"/)?.[1] || null;
  return {
    ...extra,
    path: relativePath,
    mime: relativePath.endsWith(".svg") ? "image/svg+xml"
      : relativePath.endsWith(".css") ? "text/css"
        : relativePath.endsWith(".js") ? "text/javascript"
          : "application/octet-stream",
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    ...(viewBox ? { viewBox } : {}),
  };
}

const common = {
  approvalStatus: "owner_approved_overlay",
  approvalRef: "governance/owner-approval.json",
  publicationPermission: true,
  rights: "owner_created_and_holds_full_rights; public availability is not an unrestricted third-party license",
  identityRole: "none",
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
  logo: ["exceptional_opening_once_per_page"],
};

const landometerAssets = [];
for (const kind of Object.keys(landometerJobs)) {
  for (const variant of ["full", "quiet"]) {
    landometerAssets.push(record(`assets/landometer/svg/${kind}-${variant}.svg`, {
      ...common,
      assetId: `landometer.${kind}.${variant}`,
      familyId: "landometer.motif.v1",
      productScope: "shared_landometer",
      role: "generated_vector",
      motif: kind,
      variant,
      surface: "transparent",
      motionMode: "static",
      allowedJobs: landometerJobs[kind],
      prohibitedJobs: ["identity", "data_encoding", "evidence", "measured_state", "loading_state"],
      allowedFormats: ["web_public", "deck_16x9", "social_square_1080", "document_pdf", "video_owner_extension"],
      staticFallback: "self",
      altPolicy: "empty_when_decorative; describe the motif only in a learning or asset-catalog context",
      sourceRuntime: "assets/landometer/landometer-motifs.js",
      ...(kind === "logo" && variant === "full" ? {
        themeInvariantPalette: {
          hostAttribute: "ink=blue",
          hostStyle: "--lm-wedge:#0195CB",
          pin: "#1D4497",
          inner: ["#D2566A", "#D2A437", "#0EB99B", "#4DB6E9"],
          wedge: "#0195CB",
          decisionRef: "governance/logo-preview-theme-color-decision.json",
        },
      } : {}),
    }));
  }
}

landometerAssets.push(
  record("assets/landometer/landometer-motifs.css", {
    ...common,
    assetId: "landometer.motif.runtime.css",
    familyId: "landometer.motif.v1",
    productScope: "shared_landometer",
    role: "web_runtime",
    identityRole: "not_applicable",
    allowedJobs: ["finite_once_motion"],
    prohibitedJobs: ["perpetual_attention_motion"],
    allowedFormats: ["web_public"],
    motionMode: "finite_once",
    runtimeGroupId: "landometer.motif.runtime.web.v1",
    permittedTransformations: [],
    staticFallbackBinding: "selectedRecord.path",
  }),
  record("assets/landometer/landometer-motifs.js", {
    ...common,
    assetId: "landometer.motif.runtime.js",
    familyId: "landometer.motif.v1",
    productScope: "shared_landometer",
    role: "web_runtime",
    identityRole: "not_applicable",
    allowedJobs: ["finite_once_motion"],
    prohibitedJobs: ["data_encoding", "essential_content", "perpetual_attention_motion"],
    allowedFormats: ["web_public"],
    motionMode: "finite_once",
    runtimeGroupId: "landometer.motif.runtime.web.v1",
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

const ijjiAssets = ijjiSourceManifest.files.map((file) => {
  const meta = ijjiMeaning[file.motif];
  return record(`assets/ijji/${file.file}`, {
    ...common,
    assetId: `ijji.${file.id}`,
    familyId: "ijji.four-beat.selected-3.r3",
    productScope: "ijji_product_specific",
    role: "generated_vector",
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

ijjiAssets.push(
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

const manifest = {
  schemaVersion: "landometer-motif-library/1.0",
  libraryId: "landometer-motif-library-v1",
  artifactRelease: "1.1.3",
  releaseDate: "2026-09-05",
  status: "owner_approved_publication",
  canonicalUrl: "https://montri-th.github.io/motif/",
  repository: "https://github.com/montri-th/motif",
  experienceProfile: "methodology_learning",
  formatProfile: "web_public",
  pageKind: "utility",
  localSubtype: "motif_asset_reference",
  authority: {
    landometerDesignSystem: {
      dsVersion: "0.9.1",
      authoringRevision: "0.9.1-r8",
      rulesetId: "lds-rules-0.9.1",
      machinePackage: "v0.9.1-mp7",
      verification: "passed_5394_checks_and_103_package_hashes",
    },
    ijji: {
      designSystem: "0.5.0",
      addon: "0.5.3",
      verification: "passed_1421_resolver_checks",
    },
    motifOverlay: {
      approvedOn: "2026-09-05",
      approvalRef: "governance/owner-approval.json",
      logoFullGeometryDecisionRef: "governance/logo-full-geometry-decision.json",
      logoPreviewFinalSettleDecisionRef: "governance/logo-preview-final-settle-decision.json",
      logoPreviewThemeColorDecisionRef: "governance/logo-preview-theme-color-decision.json",
      historicalReleasesRemainImmutable: true,
      releaseMembership: { lds_0_9_1: false, ijji_ds_0_5_0: false, ijji_addon_0_5_3: false },
    },
  },
  sourceResolution: {
    landometerBaseRuntimeArchive: "Landometer Brand Motifs Asset and Prompt.zip",
    selectedRuntimeArchives: ["Landometer Brand Motifs Asset and Prompt.zip", "Landometer Brand Motifs HTML2.zip"],
    selectionBasis: "The two 2026-09-05 owner-supplied packages corroborate each other byte-for-byte. Release 1.1.3 keeps that CSS and JavaScript exact, while the library host selects the runtime's blue-ink route and the official #0195CB wedge for logo-full in every theme; its portable static derivative carries the same governed palette.",
    selectedRuntimeSha256: "d4e5c636a499d8bfa71a79a03c961fbddd3f237b20f139486316856de7ff12fb",
    selectedRuntimeCssSha256: "e7028286a484c41707ea30dd448fd9d9d6b2106eac4d563f991fd268a9fe1794",
    ownerSuppliedV2RuntimeSha256: "d4e5c636a499d8bfa71a79a03c961fbddd3f237b20f139486316856de7ff12fb",
    ownerSuppliedV2CssSha256: "e7028286a484c41707ea30dd448fd9d9d6b2106eac4d563f991fd268a9fe1794",
    includedOptionalRuntimeApis: ["replay=enter", "replay=hover", "loop attribute"],
    optionalRuntimeApiBoundary: "The exact owner-supplied runtime includes optional replay and loop capabilities. Their presence is not authorization to use repeating motion in a downstream artifact; finite_once remains the recommended default unless that artifact has a separate owner-approved motion decision.",
    nonSelectedHtmlRuntimeSha256: "464ecb032c9a39a05022f7cbfb21e8e18b7baafbf9da686d781aba51bb9ab51f",
    divergence: "The earlier non-selected HTML package adds logo quiet mode=fill without a version bump. The two selected 2026-09-05 packages corroborate each other byte-for-byte and are shipped exactly; their optional replay and loop APIs remain capability rather than downstream authorization.",
    ijjiSelectedSource: "selected/ from ijji motif example.zip; selected bytes match ijji motif.zip",
    ijjiOriginalManifestStatus: "The bundled assets/ijji/manifest.json preserves historical source metadata that says candidate/exploration. It is reference-only; this main manifest plus the dated owner approval is the current artifact authority.",
    explorations: "decision_history_only_not_distributed",
  },
  showcaseExperience: {
    classification: "component_local_instructional_showcase",
    authorityRef: "governance/showcase-motion-decision.json",
    scope: "landometer_preview_dialog_only",
    variants: ["full", "quiet"],
    revealTrigger: "user_opens_preview_dialog",
    autoplay: "immediate",
    replayIntervalMs: 3000,
    replayExceptions: {
      logo: {
        settleAtMs: 2050,
        settleAction: "remove_data_play_to_show_authored_final_state",
        finalStateHoldMs: 2950,
        replayIntervalMs: 5000,
        decisionRef: "governance/logo-preview-final-settle-decision.json",
        presentationPalette: {
          hostAttribute: "ink=blue",
          hostStyle: "--lm-wedge:#0195CB",
          pin: "#1D4497",
          inner: ["#D2566A", "#D2A437", "#0EB99B", "#4DB6E9"],
          wedge: "#0195CB",
          invariantAcrossThemes: true,
          decisionRef: "governance/logo-preview-theme-color-decision.json",
        },
      },
    },
    activeConditions: ["dialog_open", "document_visible", "reduced_motion_off", "not_manually_paused"],
    controls: ["pause_auto_replay", "replay_now"],
    boundary: "The repeating pair is an inspection aid in this library UI. It is not a reusable motion extension and does not change the finite_once production lifecycle.",
  },
  distributionMirrors: {
    googleDrive: {
      role: "governed_asset_mirror_for_authorized_human_and_agent_retrieval",
      rootUrl: "https://drive.google.com/drive/folders/1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh",
      immutableReleaseUrl: "https://drive.google.com/drive/folders/1yrcgZf8C8Fk2EOABDtGgdDKtJBAzKpz6",
      syncGuide: "docs/ai-sync.md",
      releaseIdentityRule: "Resolve release-index.json, then verify the exact manifest and checksum before use."
    }
  },
  agentContract: {
    schemaVersion: "motif-library-agent-contract/1.0",
    selectionRule: "Choose one exact generated_vector record from families[].assets as the static baseline. Copy its scalar fields without translating enum values, then choose allowedJob and allowedFormat from that same record only, using fieldDerivation. The baseline record always has motionMode static.",
    requiredFields: ["familyId", "productScope", "motif", "assetId", "allowedJob", "allowedFormat", "surface", "variant", "motionMode", "path", "sha256", "staticFallback", "approvalRef"],
    fieldDerivation: {
      allowedJob: "Choose one exact value from selectedRecord.allowedJobs.",
      allowedFormat: "Choose one exact value from selectedRecord.allowedFormats.",
    },
    baselineMotionMode: "static",
    showcaseBoundary: "Do not copy or infer the library preview dialog's auto-replay behavior. Downstream Landometer web motion remains finite_once unless a separately authorized artifact-level decision says otherwise.",
    runtimeCapabilityBoundary: "The Landometer runtime exposes optional replay=enter, replay=hover, and loop attributes because the owner-supplied runtime is distributed byte-exact. Their presence is not permission or a recommendation to use them; finite_once remains the default recommendation.",
    logoFullThemeInvariant: "When using landometer.logo.full on web, preserve the official palette in every theme by applying ink=blue and --lm-wedge:#0195CB to the lm-motif host. Do not apply this logo-specific exception to other motifs or to logo.quiet.",
    motionExtensionRule: "Default to no extension. Only for allowedFormat web_public, choose the one extension whose familyId equals selectedRecord.familyId; copy its exact runtimeAssetIds and lifecycle. For Landometer, recommend finite_once by default and do not enable optional replay or loop APIs without a separate artifact-level authorization. Keep selectedRecord.path as the static fallback. Do not infer a motion runtime for deck, social, document, or video outputs.",
    motionExtensionRequiredFields: ["motionMode", "runtimeAssetIds", "runtimeAllowedJob", "runtimeAllowedFormat", "staticFallback"],
    motionExtensions: {
      finite_once: {
        familyId: "landometer.motif.v1",
        eligibleBaselineRole: "generated_vector",
        motionMode: "finite_once",
        runtimeAssetIds: ["landometer.motif.runtime.css", "landometer.motif.runtime.js"],
        runtimeAllowedJob: "finite_once_motion",
        runtimeAllowedFormat: "web_public",
        staticFallback: "selectedRecord.path",
        lifecycle: "play_once_then_hold_final_state; honor prefers-reduced-motion",
      },
      state_bound_only: {
        familyId: "ijji.four-beat.selected-3.r3",
        eligibleBaselineRole: "generated_vector",
        motionMode: "state_bound_only",
        runtimeAssetIds: ["ijji.four-beat.runtime.css", "ijji.four-beat.runtime.js"],
        runtimeAllowedJob: "real_pending_state",
        runtimeAllowedFormat: "web_public",
        staticFallback: "selectedRecord.path",
        lifecycle: "run_only_while_a_real_pending_operation_exists; stop_on_success_failure_cancel_or_timeout; visible_status_and_working_cancel_required",
      },
    },
    productScope: ["shared_landometer", "ijji_product_specific"],
    allowedFormat: ["web_public", "deck_16x9", "social_square_1080", "document_pdf", "video_owner_extension"],
    motionMode: ["static", "finite_once", "state_bound_only"],
    landometer: {
      familyId: "landometer.motif.v1",
      motif: ["dial", "rings", "layers", "slice", "cultivate", "logo"],
      variant: ["full", "quiet"],
      surface: ["transparent"],
      assetIdPattern: "landometer.{motif}.{variant}",
    },
    ijji: {
      familyId: "ijji.four-beat.selected-3.r3",
      motif: ["graph-b", "rings-c", "rotate-b"],
      variant: ["not_applicable"],
      surface: ["canvas", "brand-blue", "ground-mist", "dark", "transparent-mint", "transparent-ink"],
      assetIdPattern: "ijji.{motif}-{surface}",
    },
    prohibitedInference: "Do not infer product truth, identity, data, evidence, state completion, or cross-product permission from the motif name, shape, public URL, or source-package prose.",
  },
  boundaries: {
    sharedLayer: "Landometer portfolio, methodology, and product architecture remain product-neutral across Land, Location, and Living.",
    productLayer: "ijji assets, meanings, examples, and pending-state uses remain product-specific.",
    evidence: "Motifs are not identity, data, evidence, scores, confidence, completion, product capability, or business outcomes.",
    comparison: "Cross-product or cross-city comparison requires one compatible schema and release, or an explicit incompatibility note.",
    video: "Owner-approved extension; no LDS 0.9.1 format-conformance claim.",
    social: "LDS 0.9.1 format conformance is limited to the 1080 x 1080 square target.",
  },
  families: [
    {
      id: "landometer.motif.v1",
      scope: "shared_landometer",
      status: "owner_approved_overlay_not_in_canonical_release",
      motion: "finite_once",
      assets: landometerAssets,
    },
    {
      id: "ijji.four-beat.selected-3.r3",
      scope: "ijji_product_specific",
      status: "selected_owner_approved_overlay_not_in_canonical_release",
      motion: "state_bound_only",
      assets: ijjiAssets,
    },
  ],
};

fs.writeFileSync(path.join(root, "assets/motif-library.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote manifest with ${landometerAssets.length + ijjiAssets.length} asset records.`);
