# Landometer motif v1

Status: owner-approved artifact overlay dated 2026-09-05; not retroactively part of LDS 0.9.1.

## Files

- `landometer-motifs.css` + `landometer-motifs.js`: governed finite-once runtime with the owner-scoped logo-full geometry patch.
- `svg/`: deterministic final-state SVGs generated from that runtime for static, reduced-motion, print, email, deck, social, and fallback use.

Release runtime hashes:

- CSS: `d2b32686ea49c9fa0b55ae3cd29953365f826833fa0021bdaba7f7d8be41e0af`
- JS: `985b3a163bcdfb78098de52aaa0a7f5fc809f52fe08a53ecfcbe55850dac1cac`

Use full motifs for one major orientation, transition, or closure beat. Use quiet motifs for secondary rhythm. Motion plays once; essential content must not depend on it.

The `logo` kind is an exceptional assembly motif, not the official logo. Release 1.1.1 closes visible final-frame seams in `logo-full` through controlled subpixel overlaps; `logo-quiet` and every other static motif remain byte-identical to 1.1.0. Never use it as navigation identity, favicon, social identity, or a replacement logo.

See `../../docs/usage-guide.md`, `../motif-library.json`, `../../governance/owner-approval.json`, and `../../LICENSE.md` for the complete contract. These files are included in the downloadable kit.
