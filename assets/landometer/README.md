# Landometer motifs v3

Status: owner-approved artifact overlay dated 2026-09-06; not retroactively part of LDS 0.9.1.

## Files

- `landometer-motifs.css` + `landometer-motifs.js`: exact set-3 owner-supplied runtime bytes.
- `svg/`: deterministic complete final-state SVGs generated from that runtime for fallback, print, email, deck, social, and static use.

Exact runtime SHA-256:

- CSS: `7cc2deb475a8d6e4af331407b2b4b741716c458a8ce885e2fb2859374b93912e`
- JavaScript: `3a5caef7918a85885b61dd53e049ea8bf2b0a3cea508f587bb14970bfe6deaf2`

The six kinds are `dial`, `rings`, `layers`, `slice`, `cultivate`, and `logo`; each has `full` and `quiet`. The default production route plays once when visible and holds the authored final state. The library Preview may auto-replay so viewers can inspect the whole sequence, but copied production snippets do not carry that loop.

For a theme-invariant library preview, every full variant uses `ink="blue"`; quiet keeps the runtime's default sky ink. The logo wedge stays exactly token-derived as in the supplied HTML and renders as `#1F87CE` in the checked browser. No host wedge override is applied.

Use the official identity files—not a motif—in navigation, favicon, or co-branding. See `../../docs/usage-guide.md`, `../motif-library.json`, and `../../governance/owner-approval.json`.
