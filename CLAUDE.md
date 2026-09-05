# Claude handoff · Landometer Motif Library 1.2.0

Read [`docs/ai-sync.md`](docs/ai-sync.md), then resolve the current immutable release through `release-index.json` in the shared [Google Drive library](https://drive.google.com/drive/folders/1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh).

Use the exact baseline record, path, and SHA-256 from `assets/motif-library.json`. The three families are distinct: `landometer.motif.v3` uses finite-once production motion; `ijji.logo-sting.r3` is the explicit ijji animated-identity route and also plays once; `ijji.four-beat.selected-3.r3` is state-bound pending motion only. Never infer one lifecycle from another.

For Landometer v3, do not cut the logo at the historical 2050 ms point and do not apply the historical `--lm-wedge:#0195CB` override. For ijji animated identity, load only the selected superset runtime and all exact layer PNGs. Keep final SVG/PNG fallbacks for no-JavaScript and reduced motion. The library's auto-replay is an inspection aid and must not be copied into production unless a new artifact-specific owner decision says so.

Do not edit an immutable Drive release. Publish a new version, verify repository/live/Drive bytes, then update the two stable Drive pointers. There is no automatic background synchronization.
