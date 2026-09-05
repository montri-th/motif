# Claude + ChatGPT asset sync

Version 1.1.3 · 5 September 2026

This is the shared retrieval and update contract for Claude, ChatGPT, Codex, and other owner-authorized agents using the Landometer Motif Library.

## Sources of truth

- Public documentation and web runtime: <https://montri-th.github.io/motif/>
- Public source repository: <https://github.com/montri-th/motif>
- Shared Drive library root: <https://drive.google.com/drive/folders/1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh>
- Immutable Drive release 1.1.3: <https://drive.google.com/drive/folders/1yrcgZf8C8Fk2EOABDtGgdDKtJBAzKpz6>

The Google Drive folder is a governed mirror for easy agent retrieval. It does not replace the public repository, and it is deliberately outside the immutable LDS 0.9.1 and ijji DS/Add-on release folders.

## Retrieval protocol for Claude and ChatGPT

1. Open the Drive root and read `release-index.json`; do not treat a filename such as `latest` as release identity.
2. Resolve the exact immutable release folder named by `recommendedRelease`.
3. Read `00_MANIFEST/motif-library.json`, `00_MANIFEST/SHA256SUMS.txt`, and `00_MANIFEST/sync-receipt.json` before selecting a file.
4. Select one exact `generated_vector` record as the static baseline and verify its SHA-256. Copy enum values without renaming or translating them.
5. Use the expanded SVG/CSS/JS file for direct work, or one of the ready-to-use ZIPs for a complete handoff.
6. Preserve the product and evidence boundaries: shared Landometer stays product-neutral across Land, Location, and Living; ijji remains product-specific.
7. Inspect the final web, video, social, slide, or document output. Report any verification gate that was not run.

## Motion and identity boundaries

- Default to a static SVG.
- Landometer web motion defaults to `finite_once` and must hold the complete final state. The exact v2 bytes expose optional replay/loop APIs, but their presence is not downstream authorization. The library dialog's 3000 ms default replay—and its logo-specific 2050 ms final settle followed by a 5000 ms replay—is an inspection aid only.
- ijji motion is `state_bound_only`: run it only during a genuine pending operation and stop on success, failure, cancel, or timeout.
- The corrected `landometer.logo.full` ends as a complete, seam-free composition aligned to the official mark silhouette and colour regions. Its generated SVG and motion usage must keep the same approved palette in light and dark themes: pin `#1D4497`, inner coral `#D2566A`, yellow `#D2A437`, mint `#0EB99B`, sky `#4DB6E9`, and wedge `#0195CB`. For the exact unchanged v2 runtime, select that presentation with `ink="blue"` and `style="--lm-wedge:#0195CB"` on `logo-full` only. It remains a motif and must not replace the official logo asset.
- Never redraw, recolor, crop geometry, distort, trace from a screenshot, or reconstruct from model memory.

## Update protocol

Drive release folders are immutable. To publish a change:

1. make and review the change in the repository;
2. create a new semantic version rather than overwriting an existing release;
3. regenerate the manifest, packages, and checksums;
4. verify the final web and Drive bytes;
5. upload a new version folder with a sync receipt; and
6. update only `release-index.json` and `00_AI_READ_FIRST__MOTIF_LIBRARY.md` in place after all checks pass.

If a same-version file has different bytes, stop and resolve the conflict; never accept a Drive-generated `(1)` duplicate as the new authority.

## Access note

Drive access is account-dependent. The current library is stored under the connected Landometer Drive. Claude or ChatGPT must be connected to an account that can open the folder; otherwise the owner must grant access separately. This protocol coordinates explicit per-task synchronization—it does not claim an automatic background sync between services.
