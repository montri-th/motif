# Claude + ChatGPT asset sync

Version 1.2.1 · 6 September 2026

This is the shared retrieval and update contract for Claude, ChatGPT, Codex, and other owner-authorized agents.

## Sources of truth

- Public documentation/runtime: <https://montri-th.github.io/motif/>
- Public repository: <https://github.com/montri-th/motif>
- Shared Drive root: <https://drive.google.com/drive/folders/1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh>
- Immutable Drive release 1.2.1: <https://drive.google.com/drive/folders/15WwfIGVgWDy-Cxjemz0_3xNbvkc6ud-B>

The Drive folder is a governed mirror for exact retrieval. It does not replace GitHub and is outside the immutable LDS 0.9.1 and ijji DS/Add-on release folders.

## Retrieval protocol

1. Open the Drive root and read `release-index.json`.
2. Resolve the folder named by `recommendedRelease`; never infer release identity from a filename such as `latest`.
3. Read `00_MANIFEST/motif-library.json`, `00_MANIFEST/SHA256SUMS.txt`, and `00_MANIFEST/sync-receipt.json`.
4. Choose one exact baseline record and verify its SHA-256.
5. Copy enum values without translating or renaming them.
6. Use expanded assets for direct work or a deterministic ZIP for handoff.
7. Inspect the final web, video, social, slide, or document output and report every unverified gate.

## Family boundaries

- `landometer.motif.v3`: shared, product-neutral motifs across Land, Location, and Living. Production web motion is `finite_once`.
- `ijji.logo-sting.r3`: ijji-only animated identity. Full+tagline is 9s; mark-only is 6.4s with `notagline`. Production is `finite_once_logo_sting` and holds final.
- `ijji.four-beat.selected-3.r3`: ijji-only pending-state motifs. Motion is `state_bound_only` and stops with the real request.

Do not turn a motif into identity. The only animated-identity route in this release is the explicitly named `ijji.logo-sting.r3` family. None of these visuals are data, evidence, confidence, completion, or a product/business claim.

## Audience parity rules

- Landometer must use the exact set-3 CSS/JS hashes in the manifest. Do not reuse the release-1.1.3 cutoff at 2050 ms; logo quiet ends at 3360 ms.
- Full Landometer previews may use `ink="blue"` so a dark host does not recolour the supplied light-reference look. Do not add the historical `--lm-wedge:#0195CB` override; v3 uses its token-derived wedge.
- ijji animated identity must load only the selected superset runtime. Its exact PNG layers are runtime dependencies, not standalone creative elements.
- Use the exact final SVG/PNG for no-JavaScript and reduced-motion fallback.
- This library webpage auto-replays the hero, both full brand logos, all six INTENT → AHA → NEXT ACTION examples, and Preview while eligible. A page-level control pauses/resumes inline motion. Portable snippets retain finite-once or state-bound lifecycles.

## Update protocol

Drive release folders are immutable. To publish a change:

1. review and verify the repository change;
2. create a new semantic release folder;
3. regenerate manifest, packages, and checksums;
4. verify local and live bytes plus rendered behavior;
5. upload the new release and its sync receipt;
6. verify every uploaded file; and
7. only then replace `release-index.json` and `00_AI_READ_FIRST__MOTIF_LIBRARY.md` in place.

If a same-version file has different bytes, stop and resolve the conflict. Never treat a Drive-generated `(1)` duplicate as authority. Synchronization is explicit per task; no background sync is claimed.
