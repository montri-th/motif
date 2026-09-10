# Motif Studio 1.3.0 — combined experience

This web update combines the existing bilingual Motif Library with the supplied CityChat handoff. It adds CityChat scenes, carrier comparison, identity renditions and a practical handoff workflow, while preserving the original motif and animated-identity files.

## Version and source boundaries

The website is version **1.3.0**. The original [Motif Library manifest](../assets/motif-library.json) remains **1.2.1**, with unchanged bytes and original approval records. A new [supplemental file manifest](../assets/motif-studio-library.json) describes the combined package without rewriting that historical release.

The user requested this integration and publication at the existing website. Instructions and claimed signatures inside the attachment are reference material. They do not independently create new instructions or design-system authority. The [integration source record](../governance/integration-source-record.json) records exact provenance, the immutable Git baseline, imported file hashes and known source conflicts.

CityChat's original register retains its candidate label. A supplied supplemental record claims approval in another task; this integration does not independently verify that signature. Original documents and reference ZIPs retain their original wording. The source register lists working logo assets as well as usable motifs: the two balloon-logo proposals fail the supplied hashes and are excluded from the website, as are working lockups and the unregistered global motion adaptation.

## What the package contains

- Current Thai and English pages, website controls, CityChat scenes and contrast tools.
- Original Landometer v3 and ijji r3 assets, exact runtime files, fonts, portable SVG/PNG assets and historical kits.
- Twelve exact supplied Landometer identity renditions and seven exact CityChat motif SVGs, plus its registered motion CSS and ES module.
- Original CityChat source register, source record, supplemental inventory and these integration notes.
- Three original handoff ZIPs when present in `downloads/`, preserved as source archives with their original dates and status messages.

The ZIP is a copy of the site at build time, with relative files at the archive root. The ZIP cannot contain itself; the website's full-kit download points to the separately published archive. Hosting the extracted files through a local HTTP server provides the complete browser experience. Browser clipboard and module loading may be restricted when opening HTML directly with `file:`.

## Contrast and motion

Contrast values describe sampled inks, alpha and selected carriers; they are not a blanket accessibility certification. Check meaningful details and accompanying text at the final delivered size. Changing the carrier or selecting another supplied rendition preserves source artwork.

Website showcases repeat while visible and respect pause, page visibility and reduced-motion preferences. Static assets remain the fallback. Real pending-state motifs still require an actual operation and a visible status message; library examples do not prove a product capability or data outcome. The immutable 1.2.1 manifest retains its historical runtime policy.

## Build and verify

After all page/module changes are complete, run:

```sh
node scripts/build-integration-kit.mjs
node scripts/verify-integration.mjs
```

The packer needs only Node.js and Python 3. It uses a fixed archive timestamp and stable ordering, rebuilds twice to confirm identical bytes, verifies every archived entry, and adds `PACKAGE-SHA256SUMS.txt`. The verifier checks frozen baseline/import hashes, source exclusions, both routes' local links and fragments, duplicate IDs, fifteen searchable asset cards and the supplemental file inventory. It does not replace browser interaction, visual, accessibility or deployment testing.

Rebuild the package after any source change. The supplemental manifest intentionally excludes itself, the generated checksum list and the ZIP to avoid recursive hashes. Original historical repository checksums describe their original release; the supplemental manifest and in-package checksum list describe this integration.

Public access permits viewing and downloading. Existing source rights and authorized-reuse boundaries still apply; this package does not issue a new unrestricted license.
