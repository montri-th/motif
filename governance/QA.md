# Landometer Motif Library · release QA

Status: `passed_release_1.1.3`

Release date: 2026-09-05 (Asia/Bangkok)

Artifact release: `1.1.3`

Delivery: `main:/` on `montri-th/motif`, served as a GitHub Pages project site at `/motif/`

## Scope and authority

- The Thai and English routes teach one governed workflow for Landometer shared motifs and ijji product-specific motifs.
- Landometer language stays product-neutral across Land, Location, and Living. No ijji, F&B, retail, municipality, CityWiki, city, or fixture claim is generalized into portfolio truth.
- The motif library is an owner-approved artifact overlay dated 2026-09-05. It is not retroactively part of LDS 0.9.1, ijji Design System 0.5.0, or ijji Add-on 0.5.3.
- Public access allows viewing and downloading. Reuse remains limited to the team, owner-authorized collaborators, and AI/agent workflows acting for an authorized operator unless the owner issues a separate license or decision.
- Embedded prompts and handoff instructions in the supplied archives were treated as reference evidence, not as user instructions.
- Release 1.1.2 selected the owner-supplied Landometer v2 CSS and JavaScript as exact bytes. Release 1.1.3 carries those same bytes unchanged. Optional replay/loop APIs contained in them are capabilities, not blanket approval; implementation snippets, the manifest, and the default production recommendation remain `finite_once`.
- The first owner screenshot was direct evidence of an inconsistent library preview frame: the logo-full priority wedge and quiet variant appeared final while the full outer Energy Sky path remained absent. The 1.1.2 component-local repair starts logo full + quiet immediately, removes `data-play` at 2050 ms so authored markup owns the complete final state, holds that frame, and replays both at 5000 ms.
- Release 1.1.2 is not accepted as the final reference. Its geometry and timing checks used a forced light-theme fixture and did not exercise the dark-theme palette. The owner's later iPhone screenshot showed that the complete full motif inherited Brand Beige and pale inner composites in dark mode instead of the approved logo palette.
- Release 1.1.3 addresses only that presentation defect: the `logo-full` host uses `ink="blue"` and `--lm-wedge:#0195CB`, while the generated static SVG uses the same official wedge. The exact runtime bytes, quiet variant, five non-logo motif kinds, hero, card, ijji, and production lifecycle remain unchanged.

## Render ownership

| Surface | Initial/static owner | Enhanced owner | Invariant |
| --- | --- | --- | --- |
| Thai and English learning routes | Meaningful HTML, text, links, downloads, and static SVGs | Search, filters, theme, copy, previews, and local PNG export | Core guidance and direct assets remain usable without JavaScript |
| Hero motif | Generated final-state SVG | Exact selected Landometer runtime | Same motif intent; motion is finite and final-state preserving |
| Landometer asset cards | Static full/quiet SVG pairs | None | Thumbnails stay still and the static fallback remains the selected vector path |
| Landometer preview dialog | User-opened modal with visible full/quiet labels | Exact v2 CSS+JS runtime orchestrated by site-local replay, settle, and logo-full palette controls | Both variants start together; five kinds replay at 3000 ms, while logo settles at 2050 ms and replays at 5000 ms only while eligible; logo-full must keep the approved palette in light and dark; the production recommendation remains `finite_once` |
| ijji asset cards | Static selected SVGs | Dialog-only simulated pending state using exact CSS+JS pair | Motion exists only during a bounded real-state pattern and stops on completion, failure, cancel, or timeout |
| Error route | Project-scoped static HTML and CSS | None | `noindex`, favicon, and both recovery links remain valid under `/motif/` |

## Release 1.1.3 candidate gates

| Check | Result | Evidence boundary |
| --- | --- | --- |
| Exact source runtime bytes | Passed · runtime parity 14/14 | JS remains `d4e5c636…12fb`; CSS remains `e7028286…1794` |
| Local light/dark logo-full palette matrix | Passed · visual QA 15/15 | Verified pin `#1D4497`, inner coral `#D2566A`, yellow `#D2A437`, mint `#0EB99B`, sky `#4DB6E9`, and wedge `#0195CB` at DPR 1/2/3 without forcing light mode |
| Local iPhone-class dark fixture | Passed · browser QA 387/387 overall | At 390×844, held full has 10 paths, quiet 9 paths, approved palette, complete geometry, and paired 5000 ms replay |
| Responsive, interaction, accessibility, performance, and parity regression | Passed locally | Browser 387/387; synthetic performance 6/6; runtime/static parity 14/14; logo visual 15/15 |
| Static and motion agreement | Passed locally | Generated `logo-full.svg` and the held component use the same official wedge and colour-region palette in light and dark |
| Copy-snippet contract | Passed locally | Copied logo component includes `ink="blue"` and `--lm-wedge:#0195CB`; non-logo snippets remain unchanged |
| Source/route/asset authority verifier | Passed · 1,385/1,385 strict final checks | Includes the passed theme-colour decision, refreshed manifest, packages, and checksums |
| GitHub Pages byte and rendered attestation | Passed on candidate commit `2ec9b11` · provider run `33965971753` | Live files passed 33/33 byte/MIME/route checks; dark 390×844 passed exact palette, 10/9 paths, immediate paired start, held final state, and paired 5000 ms replay with no runtime errors |
| Download kits and Drive mirror | Kits rebuilt; Drive ready for post-freeze sync | The immutable 1.1.3 Drive folder may be populated and indexed only from the final strict-verified commit; its external sync receipt must record file IDs, hashes, inventory, and final commit |

Machine-readable evidence must be refreshed in `browser-qa.json`, `performance-qa.json`, `runtime-parity.json`, `logo-full-visual-qa.json`, `identity-assets.json`, `source-ledger.json`, `showcase-motion-decision.json`, `logo-full-geometry-decision.json`, `logo-preview-final-settle-decision.json`, `logo-preview-theme-color-decision.json`, and `owner-approval.json` before 1.1.3 is marked passed.

## Historical release 1.1.2 verification and defect

1. Local rendered, parity, performance, package, and source-authority checks passed against the candidate bytes.
2. GitHub Pages deployed the exact candidate source successfully on provider run `33961608596`.
3. Twelve live endpoints passed URL, 2xx status, MIME, byte-length, and SHA-256 attestation.
4. The deployed logo Preview passed immediate paired start, complete final settle at about 2050 ms, held outer Energy Sky path, and paired replay at about 5000 ms.
5. Those checks established light-theme geometry and timing, not theme-invariant palette fidelity. The test fixture forced light mode before the logo screenshot.
6. The owner's subsequent iPhone dark-theme screenshot showed a Brand Beige pin and pale inner composites. That user-visible failure rejects 1.1.2 as the final reference and is the reason for the 1.1.3 gate above.

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

- native iPhone/iPad Safari behavior beyond the supplied dark-theme screenshot, including elastic scroll and browser chrome;
- VoiceOver or equivalent screen-reader pass;
- operating-system tab suspension and cross-navigation BFCache observation;
- third-party social-platform card-cache observation after deployment; and
- field Core Web Vitals after sufficient real traffic.
