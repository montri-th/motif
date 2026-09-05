# Landometer + ijji Motif Usage Guide

Version 1.2.0 · 6 September 2026

## คำตอบสั้นที่สุด

1. เลือก family ให้ถูก: `landometer.motif.v3`, `ijji.logo-sting.r3` หรือ `ijji.four-beat.selected-3.r3`.
2. เลือก exact `assetId`, path และ SHA-256 จาก [`../assets/motif-library.json`](../assets/motif-library.json).
3. ใช้ไฟล์จริง ห้าม redraw/recolor/crop/distort หรือสร้างจาก screenshot/ความจำ.
4. Landometer ต้อง product-neutral ในระดับ portfolio/methodology/product architecture; ijji ต้องอยู่ใน product scope ของ ijji.
5. Motion ทุกแบบต้องมี final fallback; reduced motion และ no-JavaScript ต้องเห็นภาพจบครบ.
6. ตรวจหน้า/ไฟล์ส่งจริง—not only source code.

## เลือก family และ lifecycle

| Family | งาน | Baseline | Motion สำหรับงานจริง |
| --- | --- | --- | --- |
| `landometer.motif.v3` | orientation, transition, layering, closure, animated brand opening | final-state SVG | `finite_once`: เล่นครั้งเดียวแล้วค้าง final |
| `ijji.logo-sting.r3` | ijji animated identity with tagline หรือ mark-only | exact final PNG | `finite_once_logo_sting`: เล่นเมื่อเห็น ≥14% แล้วค้าง final |
| `ijji.four-beat.selected-3.r3` | real calculation / area gathering / iterative pending state | SVG | `state_bound_only`: แสดงเฉพาะตอน request กำลังทำงานจริง |

ijji animated identity เป็น artifact overlay ที่เจ้าของอนุมัติสำหรับงานนี้ ไม่ใช่ motif สถานะรอ และไม่ใช่การแก้ ijji DS/Add-on 0.5.3 ย้อนหลัง

## ขั้นตอน manual

1. **Frame** — ระบุ product scope, job, output, audience และ claim boundary.
2. **Choose** — คัดลอก `familyId`, `assetId`, `path`, `sha256`, `variant`, `surface`, `allowedJob`, `allowedFormat` จาก record เดียว.
3. **Place** — รักษาสัดส่วน สี ขนาดขั้นต่ำ และ host surface.
4. **Pair** — เก็บเนื้อหา หลักฐาน สถานะ และ action จริงไว้นอก motif/animation.
5. **Fallback** — ใช้ final SVG/PNG สำหรับ no-JS, reduced motion, print, email และ interrupted playback.
6. **Verify** — ตรวจ hash, contrast, responsive, keyboard, reduced motion และ output จริง.
7. **Ship** — ส่งพร้อม source version และข้อจำกัด.

## ขั้นตอน AI/agent

ส่ง contract นี้ก่อนขอให้ compose:

```yaml
familyId: landometer.motif.v3 | ijji.logo-sting.r3 | ijji.four-beat.selected-3.r3
productScope: shared_landometer | ijji_product_specific
assetId: exact baseline record ID
allowedJob: one exact value from selectedRecord.allowedJobs
allowedFormat: web_public | deck_16x9 | social_square_1080 | document_pdf | video_owner_extension
variant: exact value from selectedRecord.variant
surface: exact value from selectedRecord.surface
motionMode: static
path: exact path from selectedRecord.path
sha256: exact value from selectedRecord.sha256
staticFallback: self
approvalRef: governance/owner-approval.json
motionExtension: none | finite_once | finite_once_logo_sting | state_bound_only
```

ถ้า `motionExtension` ไม่ใช่ `none` ให้ใช้เฉพาะ `web_public`, เลือก extension ที่ `familyId` ตรงกัน แล้วคัดลอก `runtimeAssetIds`, `runtimeAllowedJob`, `runtimeAllowedFormat` และ `lifecycle` จาก `agentContract.motionExtensions` ห้ามเดา runtime ข้าม family

## Web: Landometer v3

```html
<link rel="stylesheet" href="https://montri-th.github.io/motif/assets/landometer/landometer-motifs.css?v=1.2.0">
<script src="https://montri-th.github.io/motif/assets/landometer/landometer-motifs.js?v=1.2.0" defer></script>

<lm-motif kind="dial"></lm-motif>
<lm-motif kind="rings" quiet></lm-motif>

<!-- Keeps the light-reference blue ink even inside a dark host. -->
<lm-motif kind="logo" ink="blue"></lm-motif>
```

ไม่มี optional replay attribute = เล่นหนึ่งครั้งเมื่อเข้า viewport แล้วค้าง final. อย่าใส่ essential content ไว้ใน custom element. ใช้ SVG final-state เป็น source-HTML fallback เมื่อภาพจำเป็นต้องปรากฏโดยไม่มี JavaScript

เวลา longest visual timeline ของ v3:

- dial 1.26s;
- slice 1.22s;
- rings full/quiet 1.66/1.82s;
- layers full/quiet 1.46/1.32s;
- cultivate full/quiet 2.26/2.08s;
- logo full/quiet 2.87/3.36s.

อย่าตัด logo ที่ 2.05s แบบ release เก่า. ถ้าต้อง settle ด้วย host ให้รออย่างน้อย 3.4s. Runtime และ HTML ชุด 3 ใช้ token-derived wedge ซึ่ง browser ที่ตรวจแสดงเป็น `#1F87CE`; ห้ามนำ host override `#0195CB` ของ release 1.1.3 มาใส่ใน v3

## Web: ijji animated identity

### Full + tagline

```html
<script src="https://montri-th.github.io/motif/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.0" defer></script>

<ijji-logo-sting
  surface="brand-blue"
  bounce="playful"
  assets="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/"
  style="width:min(100%,560px)">
  <img src="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/ijji-logo-still.png"
       alt="ijji — Your business buddy around the corner">
</ijji-logo-sting>
```

9.0s: Hop 0–2.7, Bodies 2.7–4.2, Tagline 4.2–6.1, Hello 6.1–7.6, Hold 7.6–9.0. ขั้นต่ำ 320 px

### Mark-only

```html
<ijji-logo-sting
  notagline
  bounce="extra"
  assets="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/"
  style="width:min(100%,420px)">
  <img src="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/ijji-mark-still.png" alt="ijji">
</ijji-logo-sting>
```

6.4s: Hop 0–2.7, Bodies 2.7–4.2, Hello 4.2–5.7, Hold 5.7–6.4. ขั้นต่ำ 160 px. ตัว mark โปร่งใสจึงต้องอยู่บน Brand Blue `#1D4497` หรือ Dark `#11191D`

ทั้งสองแบบเล่นครั้งเดียวเมื่อเห็นอย่างน้อย 14% แล้วค้าง final. Reduced motion แสดง final ทันที. Runtime มี `play()`, `pause()`, `seek()`, `finish()`, `replay()` และ `loop`; การมี API ไม่ใช่เหตุผลให้เปิด loop ใน production

## Web: ijji pending-state motifs

`graph-b`, `rings-c`, `rotate-b` เป็นคนละ family กับ animated identity. แสดงพร้อม visible status text และ cancel ที่ทำงานจริง เริ่มเมื่อ request เริ่ม และ remove เมื่อ success, failure, cancel หรือ timeout ห้ามใช้เป็น ambient spinner หรือ logo

## Preview library เทียบกับ production

Preview เล่นทันทีและวนซ้ำเพื่อให้ผู้ชมตรวจครบ:

- Landometer non-logo: full + quiet วนพร้อมกันทุก 3s.
- Landometer logo: รอครบ 3.4s, ค้าง final, วนใหม่ที่ 6s.
- ijji full logo: 9s + hold gap 0.4s.
- ijji mark-only: 6.4s + hold gap 0.4s.

กด **หยุด auto replay** แล้วต้องเห็น final ครบ; กด **เล่นซ้ำตอนนี้** เพื่อเริ่มใหม่ การปิด dialog, ซ่อนหน้า หรือ `pagehide` ต้องหยุด playback. `prefers-reduced-motion` ปิด replay และแสดง final. พฤติกรรม loop นี้เป็น instructional showcase ของคลัง ไม่ถูกใส่ใน code snippet สำหรับ production

## Format routes

| Output | Route | Status |
| --- | --- | --- |
| Web | SVG/PNG fallback หรือ governed component | target 360–1600 px |
| Deck | Static SVG/PNG | 16:9, 1920×1080 target |
| Social | Static SVG/PNG ใน complete creative | LDS claim เฉพาะ 1080×1080 |
| Document/PDF | Static SVG/PNG | A4 portrait; ตรวจ rendered PDF |
| Email | Static PNG | ไม่พึ่ง animation |
| Video | Static หรือ finite owner-directed sequence | owner extension; ไม่อ้าง LDS video conformance |

## Accessibility และสิทธิ์

- Decorative motif ใช้ `alt=""` / `aria-hidden="true"`.
- Identity fallback ใช้ alt ที่ระบุ `ijji` และ tagline เมื่อมี.
- Timer ที่เปลี่ยนถี่ไม่ถูกส่งเข้า live region.
- Keyboard, zoom, pause/replay และ close ต้องใช้งานได้.
- ทุกคนเปิดดู/ดาวน์โหลด repo ได้ แต่การ reuse สงวนสำหรับทีม ผู้ร่วมงาน และ AI/agent workflows ที่เจ้าของอนุญาต เว้นแต่มี license แยก.

## English summary

Select one exact record from the manifest, preserve its family and product scope, and verify the delivered output. Landometer v3 is product-neutral shared framing with finite-once production motion. `ijji.logo-sting.r3` is the explicit ijji animated-identity overlay, with exact 9-second full and 6.4-second mark-only routes. The three existing ijji motifs remain state-bound pending indicators. The library auto-replays for inspection; production snippets play once and hold the exact final fallback.
