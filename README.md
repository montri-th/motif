# Landometer Motif Library

A bilingual learning site and exact-byte asset library for Landometer shared motifs and ijji product-specific motifs.

Artifact release: **1.1.3** · 5 September 2026

Live target: <https://montri-th.github.io/motif/>

## Start here

- Browse the Thai guide at `/` or the English guide at `/en/`.
- Read [`assets/motif-library.json`](assets/motif-library.json) before automated use.
- Read [`docs/usage-guide.md`](docs/usage-guide.md) for implementation and handoff guidance.
- Read [`docs/ai-sync.md`](docs/ai-sync.md) or [`CLAUDE.md`](CLAUDE.md) before Claude/ChatGPT retrieval from the shared Drive mirror.
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

Then open <http://localhost:4173/>. Core content and static motif previews remain available without JavaScript. JavaScript adds search, filters, an owner-selected full + quiet inspection showcase, bounded ijji state previews, theme switching, copy actions, and local PNG export.

## Showcase inspection versus production motion

Since release 1.1.0, opening a Landometer Preview dialog reveals the full and quiet variants side by side and starts both immediately. Dial, rings, layers, slice, and cultivate replay together every 3000 ms. In release 1.1.2, logo settles to its complete authored static state at 2050 ms, holds for inspection, and replays both variants at 5000 ms. The viewer can pause auto-replay or replay immediately. Reduced-motion users receive both stable final states without a replay timer.

This loop is a component-local instructional aid for this library—not a new production motion contract. The exact v2 runtime includes optional replay and loop APIs, but their presence does not authorize downstream use. Implementation snippets, the machine manifest, and the default production recommendation remain `finite_once`; the hero remains one-shot and asset-card thumbnails remain static. ijji is excluded and remains `state_bound_only`. The decisions and stopping rules are recorded in [`governance/showcase-motion-decision.json`](governance/showcase-motion-decision.json), [`governance/logo-preview-final-settle-decision.json`](governance/logo-preview-final-settle-decision.json), and [`governance/logo-preview-theme-color-decision.json`](governance/logo-preview-theme-color-decision.json).

Release 1.1.1 changes only the Landometer `logo-full` assembly geometry and the minimal CSS declaration it requires. Controlled radial and 0.25° angular overlaps close the visible anti-alias gaps in the held final frame. `logo-quiet`, the other five motif kinds, ijji, and the production motion lifecycles are unchanged. The scoped decision and claim boundary are recorded in [`governance/logo-full-geometry-decision.json`](governance/logo-full-geometry-decision.json).

Release 1.1.2 selected the new owner-supplied v2 CSS and JavaScript as exact bytes. It also fixed the mixed library preview state seen in the owner's first screenshot: the dialog removes `data-play` at 2050 ms so authored markup supplies the complete final frame, then holds it until the 5000 ms replay. Its then-scoped local and deployed checks passed the light-theme geometry, outer Energy Sky pixel, and timing gates; they did not exercise the dark-theme logo palette later shown to be wrong.

Release 1.1.3 corrects a separate dark-theme presentation defect exposed by the owner's iPhone screenshot. Release 1.1.2 could settle with complete geometry yet inherit Brand Beige from the general dark-theme motif rule, so its full logo preview did not match the approved mark palette. The exact v2 CSS and JavaScript bytes remain unchanged. Only `logo-full` is locked at the host to `ink="blue"` with `--lm-wedge:#0195CB`, and its generated static SVG uses the same official cyan wedge. The held result therefore keeps the Brand Blue pin `#1D4497`, official inner coral `#D2566A`, yellow `#D2A437`, mint `#0EB99B`, sky `#4DB6E9`, and wedge `#0195CB` in both light and dark themes. The quiet variant and all non-logo theme behavior remain unchanged.

## Shared Google Drive mirror

The complete release is mirrored in the [Landometer Motif Library Drive folder](https://drive.google.com/drive/folders/1JXbcZovWZsOFtA9MykVeLhB_JzHg_nPh) as immutable versioned assets, expanded SVG/CSS/JS files, source archives, manifests, checksums, and ready-to-use ZIPs. Claude and ChatGPT must resolve `release-index.json` and verify the selected release checksum at the start of each task. This is explicit synchronization through one source of truth, not an automatic background sync.

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
docs/ai-sync.md / CLAUDE.md        shared Drive retrieval and update contract
governance/                        owner approval, source ledger, Build Card, QA, hashes
llms.txt                           bounded machine-discovery entrypoint
```

## Deterministic maintenance

Run these scripts after changing source assets:

```sh
node scripts/build-static-assets.mjs
node scripts/build-manifest.mjs
shasum -a 256 assets/motif-library.json
NODE_PATH=/path/to/node_modules node scripts/build-downloads.mjs
node scripts/build-checksums.mjs
node scripts/verify-site.mjs
```

After `build-manifest.mjs`, inspect the contract diff and confirm that the change is within current owner authority. Then bind the reviewed digest to `assetManifestSha256` in `governance/owner-approval.json` before rebuilding downloads and repository checksums. Never re-bind a changed manifest mechanically when its scope lacks owner approval.

Release 1.1.3 carries forward without modification the exact v2 runtime bytes selected in 1.1.2 from `Landometer Brand Motifs Asset and Prompt.zip`: JavaScript `d4e5c636a499d8bfa71a79a03c961fbddd3f237b20f139486316856de7ff12fb` and CSS `e7028286a484c41707ea30dd448fd9d9d6b2106eac4d563f991fd268a9fe1794`. Optional replay/loop APIs are present in those bytes, but remain outside the default `finite_once` production recommendation unless a job receives its own explicit owner decision. Exact source and artifact boundaries are recorded in `governance/source-ledger.json`.

## ภาษาไทยแบบสั้น

คลังนี้ช่วยให้ทีมเลือก motif ตาม brand layer, งาน, channel และ motion mode จากไฟล์จริงที่มี version/hash ชัดเจน ห้ามใช้ motif เป็นโลโก้ ข้อมูล หลักฐาน หรือ claim และห้ามนำ ijji ไปเหมารวมเป็น Landometer ทุกงานควรตรวจ static fallback, reduced motion, accessibility และไฟล์ส่งจริงก่อนเผยแพร่

ตั้งแต่ release 1.1.0 หน้าต่าง Preview ของ Landometer จะแสดง full + quiet พร้อมกัน โดย motif ห้าแบบวนทุก 3 วินาที ส่วน release 1.1.2 ให้ logo เล่นทันที, ลง final state ที่ 2050 ms, ค้างให้ตรวจ และวนใหม่ที่ 5000 ms พฤติกรรมนี้เป็นโหมดสาธิตเฉพาะคลัง ไม่ใช่ค่า production: code snippet, manifest และคำแนะนำเริ่มต้นยังเป็น `finite_once`; hero ยังเล่นครั้งเดียว, card ยังเป็นภาพนิ่ง และ ijji ยังคง `state_bound_only` แม้ runtime v2 จะมี API replay/loop ก็ต้องมี owner decision เฉพาะงานก่อนใช้

Release 1.1.3 แก้ปัญหาอีกจุดที่พบจากภาพ iPhone: ใน dark mode ตัวเต็มเคยรับสี Beige จากกติกาทั่วไปจนไม่เหมือน mark ที่อนุมัติ รุ่นนี้ไม่แก้ไฟล์ runtime ต้นฉบับ แต่ล็อกเฉพาะ `logo-full` ให้ใช้ Brand Blue และ wedge `#0195CB` ทั้ง light/dark พร้อมอัปเดต static SVG ให้ตรงกัน ส่วน quiet และ motif อื่นไม่เปลี่ยน
