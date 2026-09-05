# Landometer motif v1

Status: owner-approved artifact overlay dated 2026-09-05; not retroactively part of LDS 0.9.1.

## Files

- `landometer-motifs.css` + `landometer-motifs.js`: exact owner-supplied v2 runtime bytes, including the corrected logo-full geometry.
- `svg/`: deterministic final-state SVGs generated from that runtime for static, reduced-motion, print, email, deck, social, and fallback use.

Release runtime hashes:

- CSS: `e7028286a484c41707ea30dd448fd9d9d6b2106eac4d563f991fd268a9fe1794`
- JS: `d4e5c636a499d8bfa71a79a03c961fbddd3f237b20f139486316856de7ff12fb`

Use full motifs for one major orientation, transition, or closure beat. Use quiet motifs for secondary rhythm. The authorized default remains one finite play that holds the final state; the source runtime's optional replay/loop APIs are capabilities, not permission to add repeating downstream motion. Essential content must not depend on motion.

The `logo` kind is an exceptional assembly motif, not the official logo. Release 1.1.2 ships the exact corrected source bytes and makes the library preview leave the animation compositor at 2050 ms, then hold the complete static final state until its 5000 ms replay. `logo-quiet` and every other static motif remain byte-identical to 1.1.0. Never use it as navigation identity, favicon, social identity, or a replacement logo.

See `../../docs/usage-guide.md`, `../motif-library.json`, `../../governance/owner-approval.json`, and `../../LICENSE.md` for the complete contract. These files are included in the downloadable kit.
