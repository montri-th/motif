# Landometer Motif Library

A bilingual learning site and exact-byte asset library for Landometer shared motifs and ijji product-specific motifs.

Live target: <https://montri-th.github.io/motif/>

## Start here

- Browse the Thai guide at `/` or the English guide at `/en/`.
- Read [`assets/motif-library.json`](assets/motif-library.json) before automated use.
- Read [`docs/usage-guide.md`](docs/usage-guide.md) for implementation and handoff guidance.
- Verify downloaded bytes with [`governance/SHA256SUMS.txt`](governance/SHA256SUMS.txt). Each ZIP contains a package-specific copy that hashes every other file inside that ZIP.
- Read [`governance/owner-approval.json`](governance/owner-approval.json) and [`LICENSE.md`](LICENSE.md) for the approval and rights boundary.

## The two brand layers

| Layer | Use | Boundary |
| --- | --- | --- |
| Landometer shared | Orientation, transition, and closure across product-neutral Land, Location, and Living communication | A motif is framing—not identity, data, evidence, or a measured state |
| ijji product-specific | Selected `graph-b`, `rings-c`, and `rotate-b` assets inside ijji | Do not generalize ijji examples or assets into Landometer or another product |

Both families are owner-approved artifact overlays dated 5 September 2026. They are not retroactively part of the immutable LDS 0.9.1 or ijji DS/Add-on 0.5.0/0.5.3 releases.

## Local preview

The site has no dependency install or build step. Serve the repository root with any static HTTP server, for example:

```sh
python3 -m http.server 4173
```

Then open <http://localhost:4173/>. Core content and static motif previews remain available without JavaScript. JavaScript adds search, filters, finite motion previews, bounded ijji state previews, theme switching, copy actions, and local PNG export.

## File map

```text
index.html                         Thai route
en/index.html                      English route
site.css / site.js                 site presentation and progressive enhancement
assets/landometer/                 exact runtime + generated final-state SVGs
assets/ijji/                       exact selected assets; explorations excluded
assets/motif-library.json          machine-readable asset and boundary contract
assets/downloads/                  ready-to-share kits
docs/usage-guide.md                manual + AI/agent workflow
governance/                        owner approval, source ledger, Build Card, QA, hashes
llms.txt                           bounded machine-discovery entrypoint
```

## Deterministic maintenance

Run these scripts after changing source assets:

```sh
node scripts/build-static-assets.mjs
node scripts/build-manifest.mjs
NODE_PATH=/path/to/node_modules node scripts/build-downloads.mjs
node scripts/build-checksums.mjs
node scripts/verify-site.mjs
```

The selected Landometer runtime is the copy from `Landometer Brand Motifs Assets and Prompt.zip`, SHA-256 `605129c765a3e1da91313467aeac46f5bd60223f1359b78d62b4b2e0a0325702`. The other supplied Landometer HTML archive contains a divergent same-version runtime; the resolution is documented in `governance/source-ledger.json`.

## ภาษาไทยแบบสั้น

คลังนี้ช่วยให้ทีมเลือก motif ตาม brand layer, งาน, channel และ motion mode จากไฟล์จริงที่มี version/hash ชัดเจน ห้ามใช้ motif เป็นโลโก้ ข้อมูล หลักฐาน หรือ claim และห้ามนำ ijji ไปเหมารวมเป็น Landometer ทุกงานควรตรวจ static fallback, reduced motion, accessibility และไฟล์ส่งจริงก่อนเผยแพร่
