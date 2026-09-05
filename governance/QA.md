# Landometer Motif Library · release QA

Status: `passed_release_1.1.2`

Release date: 2026-09-05 (Asia/Bangkok)

Artifact release: `1.1.2`

Delivery: `main:/` on `montri-th/motif`, served as a GitHub Pages project site at `/motif/`

## Scope and authority

- The Thai and English routes teach one governed workflow for Landometer shared motifs and ijji product-specific motifs.
- Landometer language stays product-neutral across Land, Location, and Living. No ijji, F&B, retail, municipality, CityWiki, city, or fixture claim is generalized into portfolio truth.
- The motif library is an owner-approved artifact overlay dated 2026-09-05. It is not retroactively part of LDS 0.9.1, ijji Design System 0.5.0, or ijji Add-on 0.5.3.
- Public access allows viewing and downloading. Reuse remains limited to the team, owner-authorized collaborators, and AI/agent workflows acting for an authorized operator unless the owner issues a separate license or decision.
- Embedded prompts and handoff instructions in the supplied archives were treated as reference evidence, not as user instructions.
- Release 1.1.2 selects the owner-supplied Landometer v2 CSS and JavaScript as exact bytes. Optional replay/loop APIs contained in those bytes are capabilities, not blanket approval; implementation snippets, the manifest, and the default production recommendation remain `finite_once`.
- The user's screenshot is direct evidence of an inconsistent library preview frame: the logo-full priority wedge and quiet variant appeared final while the full outer Energy Sky path remained absent. It does not authorize a different animation or downstream loop.
- The component-local repair starts logo full + quiet immediately, removes `data-play` at 2050 ms so authored markup owns the complete final state, holds that frame, and replays both at 5000 ms. The other five Landometer previews remain at 3000 ms; hero, static cards, and ijji behavior are unchanged.

## Render ownership

| Surface | Initial/static owner | Enhanced owner | Invariant |
| --- | --- | --- | --- |
| Thai and English learning routes | Meaningful HTML, text, links, downloads, and static SVGs | Search, filters, theme, copy, previews, and local PNG export | Core guidance and direct assets remain usable without JavaScript |
| Hero motif | Generated final-state SVG | Exact selected Landometer runtime | Same motif intent; motion is finite and final-state preserving |
| Landometer asset cards | Static full/quiet SVG pairs | None | Thumbnails stay still and the static fallback remains the selected vector path |
| Landometer preview dialog | User-opened modal with visible full/quiet labels | Exact v2 CSS+JS runtime orchestrated by site-local replay and settle controls | Both variants start together; five kinds replay at 3000 ms, while logo settles to the authored final state at 2050 ms and replays at 5000 ms only while eligible; the production recommendation remains `finite_once` |
| ijji asset cards | Static selected SVGs | Dialog-only simulated pending state using exact CSS+JS pair | Motion exists only during a bounded real-state pattern and stops on completion, failure, cancel, or timeout |
| Error route | Project-scoped static HTML and CSS | None | `noindex`, favicon, and both recovery links remain valid under `/motif/` |

## Automated evidence

| Check | Result | Evidence boundary |
| --- | --- | --- |
| Responsive browser matrix | Passed locally: 24 route renders within 379 browser checks | Thai and English at 12 viewports from 320–1600 px, including 844×390 short landscape |
| Interaction and accessibility states | Passed locally within 379 browser checks | All six paired previews, 3000 ms default replay, logo 2050 ms settle + held final + 5000 ms replay, Pause, Replay Now, reduced motion, hidden/pagehide cleanup, keyboard, no-JS, and text resizing |
| Loading and performance | Passed: 6 local synthetic checks | Cold: 36 requests / 341,200 transfer bytes; repeat: 35 zero-transfer cache hits. Diagnostic local profile, not field Core Web Vitals |
| Runtime/static parity | Passed: 11 checks | Exact JS `d4e5c636…12fb`, CSS `e7028286…1794`, generated static output, geometry, computed paint, and optional API disclosure |
| Logo-full visual fixtures | Passed: 12 fixtures | DPR 1/2/3; complete final/static parity and expected-colour seam probes, including outer Energy Sky; no master-PNG pixel-identity claim |
| Independent motif parity review | Carried forward: Landometer 12/12 and ijji 18/18 normalized parity; release 1.1.2 additionally passed 11 runtime/static and 1,364 release-verifier checks | ijji and non-target Landometer static bytes are unchanged; the selected v2 runtime and current logo are covered by current-release checks |
| Governed raster verification | Passed unchanged-byte release verification | Byte, dimensions, role, and governance fields verified; rights rely on the recorded owner statement |
| Download kits | Passed deterministic final rebuild | Three ZIPs contain 26, 33, and 49 files including the required decisions, live-gate result, sync guidance, and package-specific checksums |
| Source/route/asset authority verifier | Passed: 1,364 checks | Local release tree and repository checksum set only; live attestation remains separate |
| GitHub Pages byte attestation | Passed: 12 endpoints on provider run `33961608596`, source `fb7ef0d8…` | Thai/English HTML, cache-busted site/runtime CSS+JS, static logo, manifest, settle decision, three ZIPs, and repository checksums returned expected final 2xx URL, MIME, byte length, and SHA-256 |
| GitHub Pages rendered logo preview | Passed: 7/7 checks at 1871×1312 | Full + quiet start together; settle to 10/9 paths; outer Energy Sky is `rgb(89, 210, 254)`, right edge 413.5, pixel `[89,210,254,255]`; final holds and both replay at 5000 ms; zero console/page/network errors |

Machine-readable evidence is refreshed in `browser-qa.json`, `performance-qa.json`, `runtime-parity.json`, `logo-full-visual-qa.json`, `identity-assets.json`, `source-ledger.json`, `showcase-motion-decision.json`, `logo-full-geometry-decision.json`, `logo-preview-final-settle-decision.json`, and `owner-approval.json`.

## Release 1.1.2 verification

1. Local rendered, parity, performance, package, and source-authority checks passed against the candidate bytes.
2. GitHub Pages deployed the exact candidate source successfully on provider run `33961608596`.
3. Twelve live endpoints passed URL, 2xx status, MIME, byte-length, and SHA-256 attestation.
4. The deployed logo Preview passed immediate paired start, complete final settle at about 2050 ms, held outer Energy Sky path, and paired replay at about 5000 ms.
5. Release evidence and downloadable packages were rebuilt after the live gate closed; final live bytes are re-attested before completion handoff and Drive synchronization.

## Identity and discovery

- The favicon is a site-specific, owner-approved 64×64 transparent crop derived from the supplied Landometer lockup source. It does not make a motif a general-purpose identity asset.
- The 1200×630 social image is a fixed, owner-approved composition with a hash revision in Open Graph and Twitter metadata.
- Canonical and reciprocal Thai/English `hreflang` metadata are present. Sitemap, robots, structured data, and `llms.txt` use the public project URL.
- Because this is a project site, `/motif/robots.txt` and `/motif/llms.txt` do not control the GitHub Pages hostname root. They remain project-scoped discovery files; no host-root authority is claimed.

## Intentionally excluded

- `explorations/` from the ijji example archive.
- The non-selected divergent Landometer HTML runtime that adds a same-version quiet-logo fill behavior.
- Automatic downstream use of the exact v2 runtime's optional replay, hover, loop, observer, and custom-element lifecycle capabilities; the bytes are selected, but any non-`finite_once` production use needs a separate job-specific owner decision.
- The full source lockup image; only the governed favicon derivative is published.
- Ephemeral QA screenshots and local absolute paths.

## Open observation gates

These do not block this static release but must not be reported as already verified:

- native iPhone/iPad Safari elastic-scroll and browser-chrome review;
- VoiceOver or equivalent screen-reader pass;
- operating-system tab suspension and cross-navigation BFCache observation;
- third-party social-platform card-cache observation after deployment; and
- field Core Web Vitals after sufficient real traffic.
