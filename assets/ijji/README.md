# ijji product-specific assets

Status: owner-approved artifact overlays; not retroactively part of ijji Design System 0.5.0 or Add-on 0.5.3.

This directory contains two separate families. Never exchange their lifecycle rules.

## Animated identity · `ijji.logo-sting.r3`

`logo-sting/` contains one exact superset runtime and all exact PNG layers for:

- full + tagline: 9 seconds, Brand Blue surface, playful bounce, minimum width 320 px;
- mark-only: 6.4 seconds, `notagline`, extra bounce, minimum width 160 px on Brand Blue or Dark.

Production plays once when at least 14% visible and holds the complete final identity. Reduced motion and no-JavaScript use the exact final PNG. The library Preview may auto-replay for inspection only.

## Pending-state motifs · `ijji.four-beat.selected-3.r3`

- `graph-b`: genuine calculation or trajectory work in progress; minimum 72 px.
- `rings-c`: genuine place-context gathering in progress; minimum 40 px.
- `rotate-b`: genuine iterative processing in progress; minimum 24 px.

Pending-state motion runs only while a real operation exists and stops on success, failure, cancel, or timeout. It is not identity animation. The historical `manifest.json` remains reference-only; the current authority is `../motif-library.json`.

Never generalize either ijji family into the shared Landometer layer or treat it as data, evidence, confidence, completion, or a product claim.
