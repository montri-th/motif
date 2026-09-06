# Landometer Motif Library · release QA

Status: `release_1.2.1_local_live_and_drive_passed`

Release date: 2026-09-06 (Asia/Bangkok)

Delivery target: `main:/` on `montri-th/motif`, served at `https://montri-th.github.io/motif/`

## Scope and authority

- Release 1.2.1 preserves the exact runtime/assets selected from the four owner-supplied archives in 1.2.0 and adds owner-selected inline auto-replay to the named webpage surfaces.
- Instructions, prompts, and handoff prose inside those archives were treated as reference evidence. They did not replace or expand the user's request.
- Landometer remains the shared, product-neutral layer across Land, Location, and Living. ijji animated identity and pending-state motifs remain ijji-specific; no F&B, retail, municipality, CityWiki, city, or fixture claim is generalized into portfolio truth.
- This is an owner-approved artifact overlay dated 2026-09-06. It does not retroactively modify LDS 0.9.1, ijji Design System 0.5.0, or ijji Add-on 0.5.3.
- Public access permits viewing and downloading. Reuse remains limited to the team, owner-authorized collaborators, and AI or agent workflows acting for an authorized operator unless the owner issues a separate license or decision.
- The owner's request authorizes publication and states full creation rights. That rights statement is owner evidence and was not independently verified.
- No skill was created or updated as part of this candidate. The user explicitly asked that reusable skill guidance wait until the audience-visible result is correct.

## Selected source bytes

| Source | Selected result | SHA-256 |
| --- | --- | --- |
| Landometer set-3 CSS | Exact bytes from both corroborating archives | `7cc2deb475a8d6e4af331407b2b4b741716c458a8ce885e2fb2859374b93912e` |
| Landometer set-3 JavaScript | Exact bytes from both corroborating archives | `3a5caef7918a85885b61dd53e049ea8bf2b0a3cea508f587bb14970bfe6deaf2` |
| Landometer example HTML | Byte-identical in both set-3 archives | `115518679ffaeac788859d5cb547e65301664a06850814c8c5facf65d56c34d3` |
| ijji logo-sting JavaScript | Exact superset runtime from `ijji animated logo.zip` | `1a1d1bc247b5deb92aa19e4d84524ac1f823454a9401b6ce53acf8716010433e` |
| ijji full final fallback | Exact `ijji-logo-still.png` | `bb1bc80e0c79a10dedb1b48c39efd187e97fe429adec4917975e265f610ccaac` |
| ijji mark final fallback | Exact `ijji-mark-still.png` | `acac2c65b1a17c1956686c3fdbb2a0a6dc3c547c35be1ca128675d28b0ffc630` |

The two Landometer archives contain the same CSS, JavaScript, and example HTML. The ijji superset runtime is selected because it preserves the corroborated full+tagline output and also provides the `notagline` mark-only route. Loading only that runtime prevents custom-element registration order from selecting an incomplete implementation.

## Audience-visible animation contract

Parity means the viewer sees the supplied example's authored geometry, layer order, timing, palette, surface, and complete final state. The surrounding library shell adds replay-after-hold orchestration without editing those runtime bytes.

| Surface | Source sequence visible to the audience | Library replay behavior | Complete final state |
| --- | --- | --- | --- |
| Landometer · non-logo | Exact set-3 animation | Hero and four example motifs replay every 3000 ms while visible; Preview full + quiet uses the same cadence | All authored paths remain visible between cycles |
| Landometer · logo full + quiet | Full ends at 2870 ms; quiet ends at 3360 ms. Full uses `ink="blue"` so the dark library shell cannot recolour the light-reference specimen | Inline full logo and paired Preview replay at 6000 ms after the complete authored sequence | Full contains all 10 authored geometry elements; quiet contains all 14. The v3 token-derived wedge renders as `#1F87CE`; the historical `#0195CB` host override is not applied |
| ijji · full + tagline | Heads hop 0–2.7 s; bodies land 2.7–4.2 s; tagline enters 4.2–6.1 s; hello beat 6.1–7.6 s; final hold to 9.0 s | Inline full logo and Preview use the exact component loop with its authored 400 ms gap | Exact full still on Brand Blue |
| ijji · mark only | Heads hop 0–2.7 s; bodies land 2.7–4.2 s; hello beat 4.2–5.7 s; final hold to 6.4 s | Preview uses the exact superset runtime loop with `notagline` | Exact mark still on Brand Blue or Dark |
| ijji · selected motifs | Exact `graph-b` and `rotate-b` source markup/CSS on the two named examples | CSS cycles continuously while visible | Exact final SVG remains in source HTML |

All Landometer full/quiet variants were inspected at 0, 600, 1200, 1800, 2400, and 3400 ms and were coherent, unclipped, and complete at the final sample. The two ijji full sources were pixel-identical at 11 sampled timeline points. Their layered final render differs from the exact PNG fallback only at antialiased edges. Source fixtures showed no broken image or component overflow at 320, 360, 390, and 1440 px.

Each locale route contains nine inline motion surfaces: one hero, two full brand logos, and six INTENT → AHA → NEXT ACTION motifs. They start when visible and replay continuously; one page-level control pauses them all at complete final states. Offscreen, hidden-document, pagehide, reduced-motion, no-JavaScript, and print paths stop work or use complete final fallbacks. Portable snippets retain their finite-once or state-bound family lifecycle.

## Render ownership

| Surface | Initial/static owner | Enhanced owner | Invariant |
| --- | --- | --- | --- |
| Thai and English routes | Meaningful HTML, guidance, links, and static fallbacks | Search, filters, theme, copy, previews, and PNG export | Core guidance and direct assets remain usable without JavaScript |
| Hero motif | Generated final-state SVG | Exact selected Landometer v3 runtime plus visible auto-replay | Same motif and complete final intent |
| Brand-layer cards | Exact Landometer SVG and ijji full PNG fallbacks | Exact Landometer v3 and ijji logo-sting runtimes with visible auto-replay | Both complete full logos remain available in every fallback path |
| INTENT → AHA → NEXT ACTION | Six exact SVG fallbacks | Exact Landometer runtime or exact ijji selected-motif markup/CSS with visible auto-replay | Geometry, colour, and layout remain stable across cycles |
| Asset cards | Twelve deterministic Landometer SVGs, two exact ijji identity PNGs, and selected ijji SVGs | None until Preview is opened | Direct-download thumbnails remain stable |
| Landometer preview | Visible full/quiet labels and complete component markup | Exact v3 runtime plus dialog-local replay orchestration | No geometry edit or wedge override; copied code remains finite-once |
| ijji animated-identity cards | Exact final PNG fallbacks | Exact superset logo-sting runtime and nine exact PNG layers | Full+tagline and mark-only remain identity routes, not shared motifs |
| ijji pending-state cards | Selected static SVGs | Exact existing state-bound CSS/JS pair | Runs only for a real pending state and stops on completion, failure, cancel, or timeout |
| Error route | Project-scoped static HTML and CSS | None | `noindex`, favicon, and both recovery links remain valid under `/motif/` |

## Release 1.2.1 gates

| Check | Candidate result | Evidence boundary |
| --- | --- | --- |
| Canonical Design System resolution | Passed | Landometer 5,394 checks plus 103 package hashes; ijji 1,421 resolver checks |
| Source selection and exact-byte identity | Passed | Both Landometer sources corroborate; ijji superset selected and tagline output corroborated; all runtime, layer, and fallback hashes are bound in the manifest |
| Source-fixture audience review | Passed | 12 Landometer variants sampled across six moments; ijji full sampled at 11 moments; responsive source checks include 320/360/390/1440 px |
| Static final-state generation | Passed | Twelve portable Landometer SVGs contain concrete paint and no runtime class, style, CSS variable, or `currentColor`; logo full/quiet contain 10/14 geometry elements |
| Machine manifest | Passed | Schema `landometer-motif-library/1.1`; release 1.2.1; three distinct families; 46 byte- and hash-bound asset records |
| Local integrated browser, responsive, lifecycle, accessibility, and performance regression | Passed | Browser 465/465; runtime parity 15/15; performance/loading 14/14, all bound to release 1.2.1 |
| Inline replay inventory and lifecycle | Passed | Exactly 2 full brand logos + 6 section motifs per route, plus the hero; two complete ijji-logo cycles; pause/resume, offscreen, hidden-page, pagehide/pageshow, dynamic reduced motion, no-JS, print, and 320/390 px containment all passed |
| Deterministic download kits and repository checksum closure | Passed | Six current kits rebuilt byte-identically across repeated runs; compatibility aliases match their 1.2.1/v3 targets; 118 path-sorted repository hashes close the candidate inventory; historical `motif-library-v1.2.0.zip` remains unchanged |
| GitHub Pages byte and rendered attestation | Passed | Content commit `addbf4db9468a76082f29701152542b3e864bb0d`; Pages run `34004963954`; nine exact live response-byte checks plus 465/465 rendered checks in `browser-qa-live.json` |
| Immutable Google Drive mirror | Passed | Release folder `15WwfIGVgWDy-Cxjemz0_3xNbvkc6ud-B`; 86/86 files verified by raw-byte readback; receipt file `1LogNncisB07AO-2bhO5vNANPRvq20QH4`; stable pointers updated only after closure |

Candidate verification may run with `MOTIF_ALLOW_PENDING_LIVE=1 node scripts/verify-site.mjs`. Strict verification omits that environment flag and must not pass until `governance/audience-animation-parity.json` records both integrated browser QA and live byte/rendered QA as passed.

## Identity, discovery, and distribution

- The favicon remains the site-specific, owner-approved 64×64 transparent crop. It does not turn a motif into a general-purpose identity asset.
- The 1200×630 social image remains a fixed, owner-approved library composition with its hash revision in Open Graph and Twitter metadata.
- Canonical and reciprocal Thai/English `hreflang` metadata, sitemap, robots, JSON-LD, and `llms.txt` use the public project URL.
- Because this is a project site, `/motif/robots.txt` and `/motif/llms.txt` do not claim control of the GitHub Pages hostname root.
- The governed Drive root is `1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh`; the reserved immutable 1.2.1 folder is `15WwfIGVgWDy-Cxjemz0_3xNbvkc6ud-B`. Drive access remains account-dependent, and no automatic cross-service background synchronization is claimed.

## Historical evidence and exclusions

- Release 1.1.3 geometry, 2050/5000 ms settle/replay, and explicit `#0195CB` palette decisions remain immutable history. `animation-source-v3-decision.json` records the exact source change introduced in release 1.2.0; its source bytes carry forward unchanged.
- The dialog-only decision in `showcase-motion-decision.json` remains the 1.2.0 introduction record. `inline-autoreplay-decision.json` adds the owner-selected 1.2.1 webpage behavior without rewriting it.
- The archived `scripts/logo-full-visual-qa.mjs` harness is guarded and requires an explicit `--historical-1.1.3` flag, preventing an accidental run from overwriting historical evidence with current inputs.
- `explorations/` and non-selected archive variants remain decision history and are not distributed.
- The full source Landometer lockup remains excluded; only the approved favicon derivative is published.
- Runtime-layer PNGs for ijji animated identity are dependencies, not standalone creative assets.
- Ephemeral screenshots, temporary absolute paths, credentials, and machine-local state are excluded.

## Open observation gates

These do not replace the required local and live release checks and must not be reported as already verified:

- native iPhone/iPad Safari playback beyond the supplied screenshots, including elastic scroll and browser chrome;
- VoiceOver or an equivalent assistive-technology pass;
- operating-system tab suspension and cross-navigation BFCache observation;
- third-party social-platform card-cache observation after deployment; and
- field Core Web Vitals after sufficient real traffic.
