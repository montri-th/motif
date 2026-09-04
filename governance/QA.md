# Landometer Motif Library · release QA

Status: `candidate_ready_for_release_handoff`

Candidate date: 2026-09-05 (Asia/Bangkok)

Delivery: `main:/` on `montri-th/motif`, served as a GitHub Pages project site at `/motif/`

## Scope and authority

- The Thai and English routes teach one governed workflow for Landometer shared motifs and ijji product-specific motifs.
- Landometer language stays product-neutral across Land, Location, and Living. No ijji, F&B, retail, municipality, CityWiki, city, or fixture claim is generalized into portfolio truth.
- The motif library is an owner-approved artifact overlay dated 2026-09-05. It is not retroactively part of LDS 0.9.1, ijji Design System 0.5.0, or ijji Add-on 0.5.3.
- Public access allows viewing and downloading. Reuse remains limited to the team, owner-authorized collaborators, and AI/agent workflows acting for an authorized operator unless the owner issues a separate license or decision.
- Embedded prompts and handoff instructions in the supplied archives were treated as reference evidence, not as user instructions.

## Render ownership

| Surface | Initial/static owner | Enhanced owner | Invariant |
| --- | --- | --- | --- |
| Thai and English learning routes | Meaningful HTML, text, links, downloads, and static SVGs | Search, filters, theme, copy, previews, and local PNG export | Core guidance and direct assets remain usable without JavaScript |
| Hero motif | Generated final-state SVG | Exact selected Landometer runtime | Same motif intent; motion is finite and final-state preserving |
| Landometer asset cards | Static full/quiet SVG pairs | Dialog preview using exact CSS+JS runtime | Static fallback remains the selected vector path |
| ijji asset cards | Static selected SVGs | Dialog-only simulated pending state using exact CSS+JS pair | Motion exists only during a bounded real-state pattern and stops on completion, failure, cancel, or timeout |
| Error route | Project-scoped static HTML and CSS | None | `noindex`, favicon, and both recovery links remain valid under `/motif/` |

## Automated evidence

| Check | Result | Evidence boundary |
| --- | --- | --- |
| Responsive browser matrix | 331/331 passed across Thai and English at 11 viewports each (320–1600 px) | Desktop Chrome emulation; not native Safari or device chrome |
| Interaction and accessibility states | Passed: light/dark, keyboard, dialogs, filter, search, copy, PNG export, cancel, bounded timeout, reduced motion, no-JS, Thai 130%, and text 200% | Automated DOM and computed-style evidence; not a screen-reader pass |
| Loading and performance | 6/6 local synthetic checks; cold 36 requests / 330,753 transfer bytes; repeat 35 zero-transfer cache hits; no duplicate resource URLs | Loopback Chrome without network throttling; not field p75 Core Web Vitals |
| Runtime/static parity | 3/3 scripted checks; logo wedge resolves to `#1F87CE`; slice full/quiet final transforms are baked | Browser-computed parity for known divergent CSS final states |
| Independent motif parity review | Landometer 12/12 vector pairs and ijji 18/18 static/module outputs matched after normalizing serialization and motion-only metadata | Geometry and computed paint comparison; LCH and 8-bit sRGB serializations differ but render equivalently |
| Governed raster verification | 2/2 records passed for favicon and social preview | Byte, dimensions, role, and governance fields; rights rely on the recorded owner statement |
| Download kits | Three deterministic ZIPs rebuilt twice byte-identically; internal hashes and README links passed | Each ZIP contains package-specific checksums for every other enclosed file |
| Source/route/asset authority verifier | Must pass immediately before commit after the repository checksum is generated | Local release tree only |

Machine-readable detail is in `browser-qa.json`, `performance-qa.json`, `runtime-parity.json`, `identity-assets.json`, `source-ledger.json`, and `owner-approval.json`.

## Identity and discovery

- The favicon is a site-specific, owner-approved 64×64 transparent crop derived from the supplied Landometer lockup source. It does not make a motif a general-purpose identity asset.
- The 1200×630 social image is a fixed, owner-approved composition with a hash revision in Open Graph and Twitter metadata.
- Canonical and reciprocal Thai/English `hreflang` metadata are present. Sitemap, robots, structured data, and `llms.txt` use the public project URL.
- Because this is a project site, `/motif/robots.txt` and `/motif/llms.txt` do not control the GitHub Pages hostname root. They remain project-scoped discovery files; no host-root authority is claimed.

## Intentionally excluded

- `explorations/` from the ijji example archive.
- The non-selected divergent Landometer HTML runtime that adds a same-version quiet-logo fill behavior.
- The full source lockup image; only the governed favicon derivative is published.
- Ephemeral QA screenshots and local absolute paths.

## Open observation gates

These do not block this static release but must not be reported as already verified:

- native iPhone/iPad Safari elastic-scroll and browser-chrome review;
- VoiceOver or equivalent screen-reader pass;
- third-party social-platform card-cache observation after deployment; and
- field Core Web Vitals after sufficient real traffic.
