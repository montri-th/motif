# Landometer Motif Library

A bilingual learning site and exact-byte asset library for Landometer motifs, ijji animated identity, and selected ijji pending-state motifs.

Artifact release: **1.2.0** · 6 September 2026
Live target: <https://montri-th.github.io/motif/>

## Start here

- Browse Thai at `/` or English at `/en/`.
- Read [`assets/motif-library.json`](assets/motif-library.json) before automated use.
- Read [`docs/usage-guide.md`](docs/usage-guide.md) for implementation guidance.
- Read [`docs/ai-sync.md`](docs/ai-sync.md) or [`CLAUDE.md`](CLAUDE.md) before Claude/ChatGPT retrieval from Drive.
- Verify bytes with [`governance/SHA256SUMS.txt`](governance/SHA256SUMS.txt).
- Read [`governance/owner-approval.json`](governance/owner-approval.json) and [`LICENSE.md`](LICENSE.md) for the rights boundary.

## Three distinct families

| Family | Use | Motion |
| --- | --- | --- |
| `landometer.motif.v3` | Six shared, product-neutral Landometer motifs in full + quiet | Finite once in production; paired auto-replay in library Preview |
| `ijji.logo-sting.r3` | ijji animated identity, with tagline or mark-only | Finite once in production; auto-replay in library Preview |
| `ijji.four-beat.selected-3.r3` | Genuine ijji pending states: `graph-b`, `rings-c`, `rotate-b` | State-bound only; stop with the real request |

The 1.2.0 assets are an owner-approved artifact overlay. They do not retroactively modify LDS 0.9.1, ijji Design System 0.5.0, or ijji Add-on 0.5.3.

## Audience-reference update

Release 1.2.0 replaces the prior Landometer v2 runtime with the exact set-3 CSS and JavaScript. Both supplied Landometer ZIPs corroborate the same example and runtime bytes. The paired logo Preview now lets full finish at about 2.87 seconds and quiet at about 3.36 seconds, settles at 3.4 seconds, and replays at 6 seconds. The prior 2.05-second cutoff is historical and must not be used with v3.

The Preview sets `ink="blue"` on full Landometer motifs so the library's dark theme cannot recolour a light-reference specimen. It deliberately does not apply the old `#0195CB` wedge override: the v3 example uses its token-derived wedge, rendered as `#1F87CE` in the checked browser. All 12 variants were inspected across key timeline frames and finish complete and unclipped.

Release 1.2.0 also adds the exact ijji round-3 animated-identity superset. The full version runs 9 seconds on Brand Blue; mark-only runs 6.4 seconds with `notagline`. The supplied full-only archive matches the superset full animation pixel-for-pixel at 11 sampled times. The component's final layered render differs from its PNG fallback only at antialiased edges.

The library Preview starts immediately and replays automatically so a visitor can inspect each animation. Copied production snippets keep the supplied one-shot, final-hold behavior. Reduced-motion users receive the complete final state without replay.

## Local preview

The site is static and has no dependency build step. Serve the repository root, then open it in a browser:

```sh
python3 -m http.server 4173
```

Source HTML contains static fallbacks. JavaScript progressively adds search, filters, animation previews, theme switching, copy actions, and local PNG export.

## File map

```text
index.html / en/index.html          Thai and English routes
site.css / site.js                  presentation and progressive enhancement
assets/landometer/                  exact v3 runtime + final-state SVGs
assets/ijji/logo-sting/             exact animated-identity runtime + PNG layers
assets/ijji/svg/                    selected ijji pending-state SVGs
assets/motif-library.json           machine-readable asset contract
assets/downloads/                   deterministic handoff kits
docs/usage-guide.md                 manual + AI/agent workflow
docs/ai-sync.md / CLAUDE.md         Drive retrieval and update contract
governance/                         approval, source, QA, and hashes
```

`motif-library-v1.zip` and `landometer-motifs-v1.zip` remain current compatibility aliases; their bytes are rebuilt from the same file lists as `motif-library-v1.2.0.zip` and `landometer-motifs-v3.zip` so older links cannot silently serve obsolete assets.

## Deterministic maintenance

```sh
node scripts/build-static-assets.mjs
node scripts/build-manifest.mjs
node scripts/build-downloads.mjs
node scripts/build-checksums.mjs
node scripts/verify-site.mjs
```

After regenerating the manifest, review its scope and bind the reviewed SHA-256 in `governance/owner-approval.json` before packaging. Exact runtime and source-layer hashes are recorded in [`governance/source-ledger.json`](governance/source-ledger.json).

## ภาษาไทยแบบสั้น

รุ่น 1.2.0 ใช้ animation จากไฟล์ชุดใหม่ตรง byte และเทียบสิ่งที่ผู้ชมเห็นกับ HTML ตัวอย่างแล้ว: Landometer มี 6 ลายแบบ full + quiet; ijji เพิ่ม animated logo แบบมีคำโปรยและ mark-only โดยแยกจาก motif สถานะรอเดิมอย่างชัดเจน Preview เล่นทันทีและวนซ้ำเพื่อดูงาน ส่วนโค้ดที่คัดลอกไปใช้จริงเล่นหนึ่งครั้งและค้างภาพจบ ทุกงานต้องเลือก family/path/hash จาก manifest และห้ามนำ ijji ไปเหมารวมเป็น Landometer
