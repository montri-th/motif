# Landometer Motif Library · release QA

Status: `release_1.2.0_passed` · published animation and byte attestation complete

Release date: 2026-09-06 (Asia/Bangkok)

Delivery target: `main:/` on `montri-th/motif`, served at `https://montri-th.github.io/motif/`

## Scope and authority

- Release 1.2.0 updates the library from four owner-supplied archives: two corroborating Landometer set-3 packages and two corroborating ijji animated-logo packages.
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

Parity means the viewer sees the supplied example's authored geometry, layer order, timing, palette, surface, and complete final state. The surrounding library shell and its replay-after-hold inspection controls are intentionally different.

| Preview | Source sequence visible to the audience | Library-only replay behavior | Complete final state |
| --- | --- | --- | --- |
| Landometer · five non-logo kinds | Exact set-3 full and quiet animations begin together | Replay every 3000 ms while the dialog is open and eligible | All authored paths remain visible between cycles |
| Landometer · logo full + quiet | Full ends at 2870 ms; quiet ends at 3360 ms. Full uses `ink="blue"` so the dark library shell cannot recolour the light-reference specimen | Settle both at 3400 ms, hold for 2600 ms, replay at 6000 ms | Full contains all 10 authored geometry elements; quiet contains all 14. The v3 token-derived wedge renders as `#1F87CE`; the historical `#0195CB` host override is not applied |
| ijji · full + tagline | Heads hop 0–2.7 s; bodies land 2.7–4.2 s; tagline enters 4.2–6.1 s; hello beat 6.1–7.6 s; final hold to 9.0 s | Exact component loop is enabled only inside the open preview, with its authored 400 ms gap | Exact full still on Brand Blue |
| ijji · mark only | Heads hop 0–2.7 s; bodies land 2.7–4.2 s; hello beat 4.2–5.7 s; final hold to 6.4 s | Same preview-only loop using the exact superset runtime with `notagline` | Exact mark still on Brand Blue or Dark |

All Landometer full/quiet variants were inspected at 0, 600, 1200, 1800, 2400, and 3400 ms and were coherent, unclipped, and complete at the final sample. The two ijji full sources were pixel-identical at 11 sampled timeline points. Their layered final render differs from the exact PNG fallback only at antialiased edges. Source fixtures showed no broken image or component overflow at 320, 360, 390, and 1440 px.

Reduced motion shows a complete final state without replay. Closing the dialog, hiding the document, or navigating away stops preview motion. Copied production snippets deliberately omit library `loop` and manual-control attributes: Landometer plays finite once and holds final; ijji animated identity plays finite once when visible and holds final; ijji four-beat motifs remain bound to a real pending operation.

## Render ownership

| Surface | Initial/static owner | Enhanced owner | Invariant |
| --- | --- | --- | --- |
| Thai and English routes | Meaningful HTML, guidance, links, and static fallbacks | Search, filters, theme, copy, previews, and PNG export | Core guidance and direct assets remain usable without JavaScript |
| Hero motif | Generated final-state SVG | Exact selected Landometer v3 runtime | Same motif and complete final intent |
| Landometer cards | Twelve deterministic, portable SVGs | None | Thumbnails remain still; full and quiet stay paired |
| Landometer preview | Visible full/quiet labels and complete component markup | Exact v3 runtime plus dialog-local replay orchestration | No geometry edit or wedge override; copied code remains finite-once |
| ijji animated-identity cards | Exact final PNG fallbacks | Exact superset logo-sting runtime and nine exact PNG layers | Full+tagline and mark-only remain identity routes, not shared motifs |
| ijji pending-state cards | Selected static SVGs | Exact existing state-bound CSS/JS pair | Runs only for a real pending state and stops on completion, failure, cancel, or timeout |
| Error route | Project-scoped static HTML and CSS | None | `noindex`, favicon, and both recovery links remain valid under `/motif/` |

## Release 1.2.0 gates

| Check | Candidate result | Evidence boundary |
| --- | --- | --- |
| Canonical Design System resolution | Passed | Landometer 5,394 checks plus 103 package hashes; ijji 1,421 resolver checks |
| Source selection and exact-byte identity | Passed | Both Landometer sources corroborate; ijji superset selected and tagline output corroborated; all runtime, layer, and fallback hashes are bound in the manifest |
| Source-fixture audience review | Passed | 12 Landometer variants sampled across six moments; ijji full sampled at 11 moments; responsive source checks include 320/360/390/1440 px |
| Static final-state generation | Passed | Twelve portable Landometer SVGs contain concrete paint and no runtime class, style, CSS variable, or `currentColor`; logo full/quiet contain 10/14 geometry elements |
| Machine manifest | Passed | Schema `landometer-motif-library/1.1`; release 1.2.0; three distinct families; 46 byte- and hash-bound asset records |
| Local integrated browser, responsive, lifecycle, accessibility, and performance regression | Passed | Browser 406/406; runtime parity 15/15; performance/loading 10/10, all bound to release 1.2.0 |
| Deterministic download kits and repository checksum closure | Passed | Four named 1.2.0 kits plus two byte-identical compatibility aliases are deterministic; the repository checksum is a sorted, exact inventory of every non-Git release file |
| GitHub Pages byte and rendered attestation | Passed | Commit `067a083609b7dc131aac1de0c7dad3c90d448d01`; Pages run `33985336741`; 13/13 exact live bytes and 406/406 rendered browser checks across Thai/English, mobile/desktop, autoplay, hold, replay, pause, reduced motion, no-JavaScript, and text-scale states |
| Immutable Google Drive mirror | Folder reserved; upload and receipt pending | Release folder `1mcsME-10TL_6qpPDk1-RsMqXLNEnatg5` becomes authoritative only after exact files, hashes, inventory, and final commit are verified |

Candidate verification may run with `MOTIF_ALLOW_PENDING_LIVE=1 node scripts/verify-site.mjs`. Strict verification omits that environment flag and must not pass until `governance/audience-animation-parity.json` records both integrated browser QA and live byte/rendered QA as passed.

## Identity, discovery, and distribution

- The favicon remains the site-specific, owner-approved 64×64 transparent crop. It does not turn a motif into a general-purpose identity asset.
- The 1200×630 social image remains a fixed, owner-approved library composition with its hash revision in Open Graph and Twitter metadata.
- Canonical and reciprocal Thai/English `hreflang` metadata, sitemap, robots, JSON-LD, and `llms.txt` use the public project URL.
- Because this is a project site, `/motif/robots.txt` and `/motif/llms.txt` do not claim control of the GitHub Pages hostname root.
- The governed Drive root is `1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh`; the immutable 1.2.0 folder is `1mcsME-10TL_6qpPDk1-RsMqXLNEnatg5`. Drive access remains account-dependent, and no automatic cross-service background synchronization is claimed.

## Historical evidence and exclusions

- Release 1.1.3 geometry, 2050/5000 ms settle/replay, and explicit `#0195CB` palette decisions remain immutable history. `animation-source-v3-decision.json` supersedes them only for release 1.2.0; their files are not rewritten.
- The archived `scripts/logo-full-visual-qa.mjs` harness is guarded and requires an explicit `--historical-1.1.3` flag, preventing an accidental run from overwriting historical evidence with release-1.2.0 inputs.
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
