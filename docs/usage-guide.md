# Landometer + ijji Motif Usage Guide

Version 1.1.2 · 5 September 2026

## คำตอบสั้นที่สุด

1. เลือกชั้นให้ถูก: `landometer.shared` หรือ `ijji.product`.
2. เลือกจาก [`../assets/motif-library.json`](../assets/motif-library.json) โดยใช้ `assetId`, path และ SHA-256 จริง.
3. ให้ motif ทำหน้าที่ orientation, transition, closure หรือ real pending state เท่านั้น.
4. อย่าใช้ motif เป็นโลโก้ ข้อมูล หลักฐาน score, confidence, completion หรือ product claim.
5. ใช้ภาพนิ่งเป็นพื้นฐาน; motion ต้องมี final-state fallback และหยุดตามงาน.
6. ตรวจไฟล์หรือหน้าเว็บที่ส่งจริง—not only the source.

## The shortest useful answer

1. Choose the correct layer: `landometer.shared` or `ijji.product`.
2. Select an exact `assetId`, path, and SHA-256 from the [manifest](../assets/motif-library.json).
3. Give the motif one job: orientation, transition, closure, or a genuine pending state.
4. Never use a motif as a logo, data, evidence, score, confidence, completion, or a product claim.
5. Start with a still. Motion needs a stable final-state fallback and a clear stopping rule.
6. Inspect the real delivered page or export—not only its source.

## คู่มือรายละเอียดภาษาไทย

### เลือกชั้นแบรนด์

- **Landometer shared:** ใช้ภาษาที่เป็นกลางต่อผลิตภัณฑ์ในระดับ portfolio, methodology และ product architecture ครอบคลุม Land, Location และ Living ลายทำหน้าที่จัดจังหวะโดยไม่กล่าวอ้างข้อเท็จจริงของผลิตภัณฑ์ เมือง ตลาด หรือกลุ่มผู้ใช้ใด
- **ijji product-specific:** ใช้ `graph-b`, `rings-c` และ `rotate-b` ภายใน ijji เท่านั้น ตัวอย่างร้านอาหาร ย่าน หรือสถานะจำลองไม่ใช่หลักฐานของ Landometer ผลิตภัณฑ์อื่น หรือเมืองอื่น การเปรียบเทียบข้ามผลิตภัณฑ์/เมืองต้องใช้ schema และ release ที่เข้ากัน หรือระบุ incompatibility

### ขั้นตอนทำเอง

1. **Frame** — ระบุ product scope, งานของ motif, output format, audience และ claim boundary
2. **Choose** — เลือก generated-vector record หนึ่งรายการจาก manifest แล้วคัดลอก `familyId`, `motif`, `assetId`, `variant`, `surface`, path และ SHA-256 ให้ตรง
3. **Place** — รักษา geometry, clear space, aspect ratio และสี ห้าม redraw, recolor, crop geometry หรือยืดสัดส่วน
4. **Pair** — ให้ข้อความ หลักฐาน สถานะ และ action จริงอยู่นอก motif
5. **Fallback** — ใช้ภาพนิ่งสุดท้ายสำหรับ no-JS, reduced motion, print, email และ playback ที่ถูกขัดจังหวะ
6. **Verify** — ตรวจ hash, contrast, accessibility, responsive/format fixture และไฟล์ที่ส่งจริง
7. **Ship** — ส่งพร้อม source, version, permission boundary และข้อจำกัดของ format

### ขั้นตอนสำหรับ AI และ agents

ใช้ `agentContract` ใน [`../assets/motif-library.json`](../assets/motif-library.json) เป็น schema หลัก ค่าที่ส่งต้องตรง enum และ record จริง: `familyId`, `productScope`, `motif`, `assetId`, `allowedJob`, `allowedFormat`, `variant`, `surface`, `motionMode`, `path`, `sha256`, `staticFallback` และ `approvalRef` อย่าแปลหรือเดาค่า enum เอง ทุกครั้งต้องเริ่มจาก `generated_vector` เป็น baseline ภาพนิ่งซึ่งมี `motionMode: static`

ถ้าต้องใช้ motion บนเว็บ ให้เพิ่ม `motionExtension` จาก `agentContract.motionExtensions` เท่านั้น: Landometer ใช้ `finite_once`; ijji ใช้ `state_bound_only` คัดลอก `runtimeAssetIds`, `runtimeAllowedJob`, `runtimeAllowedFormat` และ `lifecycle` ให้ตรง และใช้ `selectedRecord.path` เป็น static fallback ห้ามเดา runtime สำหรับ deck, social, document หรือ video

กำชับ agent ให้ใช้ไฟล์ที่ให้มาแทน screenshot/ความจำ, รักษาขอบเขตผลิตภัณฑ์, แสดง preview ก่อนใช้ composition ที่มี judgment, ทดสอบ static/reduced-motion fallback, ตรวจ output ที่ส่งจริง และรายงาน gate ที่ยังไม่ได้ตรวจ

### การใช้บนเว็บ

- Landometer: ใช้ SVG ภาพนิ่งเป็น baseline; โหลด `landometer-motifs.css` + `landometer-motifs.js` และ `<lm-motif kind="…">` เมื่อต้องการ finite motion หนึ่งครั้ง เนื้อหาสำคัญห้ามพึ่ง custom element
- ijji: ใช้ SVG ภาพนิ่งโดยปริยาย ถ้าต้องใช้ motion ให้ inline markup จาก `ijji-motifs.js` เฉพาะช่วงที่ request จริงกำลังรอ แสดงข้อความสถานะ/เวลา มี cancel ที่ทำงาน และลบ animation เมื่อ success, failure, cancel หรือ timeout

### โหมดสาธิตในคลัง เทียบกับ motion สำหรับงานจริง

ตั้งแต่ release 1.1.0 เมื่อผู้ใช้เปิดหน้าต่าง Preview ของ Landometer ระบบจะแสดง full และ quiet พร้อมกันและเริ่มเล่นทันที Dial, rings, layers, slice และ cultivate เริ่มรอบใหม่พร้อมกันทุก 3000 ms ส่วน release 1.1.2 กำหนดข้อยกเว้นสำหรับ logo: เอา `data-play` ออกจากทั้งสอง variant ที่ 2050 ms เพื่อให้ markup แสดง authored final state ที่สมบูรณ์, ค้างไว้ให้ตรวจ และเริ่มรอบถัดไปพร้อมกันที่ 5000 ms เฉพาะตอนที่ dialog เปิดอยู่, หน้าเว็บมองเห็นได้, ผู้ใช้ไม่ได้เลือก reduced motion และยังไม่ได้กดหยุด ผู้ใช้กด **หยุด auto-replay** หรือ **เล่นใหม่ตอนนี้** ได้ การปิด dialog, ซ่อนหน้า หรือ `pagehide` ต้องยกเลิก settle/replay timer และ animation; reduced motion แสดงภาพสุดท้ายของทั้งสองแบบโดยไม่ตั้ง timer ลายทั้งคู่เป็น decorative, มีป้ายชื่อที่มองเห็นได้ และไม่มี live-region announcement ทุกรอบ

นี่คือ instructional showcase เฉพาะ dialog ตามคำขอของเจ้าของ ไม่ใช่สิทธิ์ให้ทำ ambient loop และไม่แก้คำแนะนำ production: code snippet, manifest และค่าเริ่มต้นยังคง `finite_once`; hero เล่นครั้งเดียวและ card เป็นภาพนิ่ง ส่วน ijji ไม่อยู่ใน decision นี้และยังใช้ `state_bound_only` เท่านั้น Runtime v2 มี API `replay="enter"`, `replay="hover"`, `loop` และ programmatic replay อยู่จริง แต่การมี API ไม่ใช่ approval ต้องมี owner decision ที่ระบุงานและ lifecycle ก่อนใช้ ดูบันทึกที่ [`../governance/showcase-motion-decision.json`](../governance/showcase-motion-decision.json) และ [`../governance/logo-preview-final-settle-decision.json`](../governance/logo-preview-final-settle-decision.json)

Release 1.1.1 แก้เฉพาะ geometry ตอนจบของ `landometer.logo.full`: inner band ซ้อนใต้ outer ring, segment ถัดไปซ้อน 0.25° และ wedge ซ้อนขอบ band เพื่อปิดรอยแหว่งจาก anti-aliasing ภาพสุดท้ายจึงประกอบครบตาม silhouette/ตำแหน่งสีของ mark ทางการ แต่ยังเป็น motif ไม่ใช่ official logo และไม่ได้อ้างว่า pixel-identical กับไฟล์ master ดูขอบเขตที่ [`../governance/logo-full-geometry-decision.json`](../governance/logo-full-geometry-decision.json)

Release 1.1.2 เปลี่ยนจาก scoped derivative ของ release 1.1.1 มาใช้ไฟล์ v2 ของเจ้าของตรง byte (`JS d4e5c636…12fb`, `CSS e7028286…1794`) และเพิ่ม settle/hold เฉพาะ preview เพื่อแก้ mixed frame ที่พบใน screenshot ของผู้ใช้: wedge และ quiet อยู่ปลายทางแล้วแต่ outer Energy Sky path ของ full ยังไม่ปรากฏ การแก้นี้ไม่เปลี่ยน authored runtime timeline และผ่านทั้ง local rendered QA กับการตรวจ animation/bytes บน GitHub Pages จริงแล้ว

สำหรับ Claude/ChatGPT ให้ใช้ [`ai-sync.md`](ai-sync.md) และ Drive `release-index.json` เป็นขั้นตอนค้น release ก่อนอ่าน manifest/hash ทุกครั้ง ไม่มี background sync อัตโนมัติระหว่างบริการ

### เส้นทางตาม format

| Output | วิธีใช้ | สถานะ |
| --- | --- | --- |
| Web | SVG still หรือ motion ตาม lifecycle | เป้าหมาย LDS 360–1600 px |
| Deck | Static SVG/PNG | เป้าหมาย LDS 16:9, 1920×1080 |
| Social | Static SVG/PNG ใน creative ที่เสร็จแล้ว | อ้าง conformance LDS 0.9.1 ได้เฉพาะ 1080×1080 |
| Document/PDF | Static SVG/PNG | เป้าหมาย A4 portrait; ตรวจ PDF ที่ render แล้ว |
| Email | Static PNG | ไม่พึ่ง animation |
| Video | Static หรือ finite sequence ที่เจ้าของกำหนด | owner-approved extension; ไม่อ้าง LDS 0.9.1 video conformance |

### Accessibility และสิทธิ์

ลายตกแต่งใช้ `alt=""` และ `aria-hidden="true"`; ตัวอย่างในคลังอธิบายภาพด้วยข้อความ; pending state ให้ข้อความที่มองเห็นได้เป็นผู้แบกความหมายและไม่ประกาศ timer ถี่ผ่าน live region; reduced motion ต้องเห็น final state ทันที

ทุกคนเปิดดูและดาวน์โหลด repository สาธารณะได้ แต่การนำ asset ไปใช้ต่อสงวนสำหรับทีม ผู้ร่วมงาน และ AI/agent workflows ที่ได้รับอนุญาต เว้นแต่เจ้าของออก license หรือ decision แยก การอนุมัติวันที่ 5 ก.ย. 2026 เป็น artifact overlay และไม่ได้เพิ่มไฟล์ย้อนหลังเข้า LDS 0.9.1 หรือ ijji DS/Add-on 0.5.0/0.5.3

## English detailed guide

## Choose the brand layer

### Landometer shared

Use product-neutral language at the portfolio, methodology, and product-architecture level across Land, Location, and Living. The six motif kinds can frame a story without asserting anything about a named product, city, market, or audience.

### ijji product-specific

Use `graph-b`, `rings-c`, and `rotate-b` only inside ijji. An ijji/F&B or neighbourhood fixture is not evidence for Landometer, another product, or another city. A cross-product or cross-city comparison needs one compatible schema and release—or an explicit incompatibility note.

## Manual workflow

1. **Frame** — brand layer, motif job, output channel, audience, and claim boundary.
2. **Choose** — exact asset ID, static or motion route, surface, and minimum size.
3. **Place** — preserve geometry, clear space, aspect ratio, and palette.
4. **Pair** — keep real content, evidence, state copy, and actions outside the motif.
5. **Fallback** — final still for no-JS, reduced motion, print, email, and interrupted playback.
6. **Verify** — manifest hash, contrast, accessibility, responsive or format fixture, and final bytes.
7. **Ship** — include the source, version, and any format limitation in the handoff.

## AI and agent workflow

Give the agent these fields before asking it to compose:

```yaml
familyId: landometer.motif.v1 | ijji.four-beat.selected-3.r3
productScope: shared_landometer | ijji_product_specific
motif: exact value from the selected record
assetId: exact generated_vector record ID
allowedJob: one exact value from the record's allowedJobs
allowedFormat: web_public | deck_16x9 | social_square_1080 | document_pdf | video_owner_extension
variant: full | quiet | not_applicable
surface: transparent | canvas | brand-blue | ground-mist | dark | transparent-mint | transparent-ink
motionMode: static
path: exact path from the same record
sha256: exact SHA-256 from the same record
staticFallback: exact fallback from the same record
approvalRef: governance/owner-approval.json
motionExtension: none | finite_once | state_bound_only
```

Default `motionExtension` to `none`. A non-static extension is valid only for `web_public`: resolve the matching `familyId` entry in `agentContract.motionExtensions`, copy its exact `runtimeAssetIds`, `runtimeAllowedJob`, `runtimeAllowedFormat`, and `lifecycle`, and keep the selected baseline record's `path` as the fallback. Never infer a runtime for deck, social, document, or video output.

Require the agent to:

- use supplied files rather than screenshots or model memory;
- preserve geometry, color, aspect ratio, and product scope;
- keep motifs separate from identity, data, evidence, and claims;
- show a preview before applying a non-trivial composition;
- test reduced motion and a static fallback;
- inspect the delivered artifact; and
- report every unverified gate.

## Web routes

### Landometer motion component

```html
<link rel="stylesheet" href="https://montri-th.github.io/motif/assets/landometer/landometer-motifs.css?v=1.1.2">
<script src="https://montri-th.github.io/motif/assets/landometer/landometer-motifs.js?v=1.1.2" defer></script>

<lm-motif kind="dial"></lm-motif>
```

With no optional replay attribute, the component plays once when it becomes visible. Do not make it essential content. Put a generated final-state SVG in source HTML when a meaningful visual must survive without JavaScript. The exact v2 runtime also contains `replay="enter"`, `replay="hover"`, `loop`, and programmatic replay APIs, but availability is not permission: keep the production recommendation at `finite_once` unless an explicit job-specific owner decision defines another lifecycle.

### Library showcase behavior versus production behavior

Since release 1.1.0, the library has an owner-selected inspection mode in its Landometer Preview dialog. A user-opened reveal shows full and quiet side by side and starts both immediately. Dial, rings, layers, slice, and cultivate restart together every 3000 ms. Release 1.1.2 adds a logo-specific final settle: remove `data-play` from both variants at 2050 ms so authored markup supplies the complete static final state, hold it for inspection, and restart both at 5000 ms. Playback runs only while the dialog is open, the document is visible, reduced motion is not requested, and the viewer has not paused. **Pause auto-replay** leaves stable final states; **Replay now** restarts both and resumes the timer. Closing the dialog, hiding the document, or `pagehide` clears playback. The motifs remain decorative, their variant labels are visible, and no per-cycle live announcement is made. Reduced motion shows both final states without a timer.

That loop is a component-local instructional showcase, not a portable production pattern. Implementation snippets, the manifest motion extension, and the default production recommendation remain `finite_once`; the hero is still one-shot and asset-card thumbnails stay static. The exact v2 runtime's optional replay/loop APIs require a separate explicit job-specific owner decision. ijji is outside this decision and remains `state_bound_only`. See [`../governance/showcase-motion-decision.json`](../governance/showcase-motion-decision.json) and [`../governance/logo-preview-final-settle-decision.json`](../governance/logo-preview-final-settle-decision.json).

Release 1.1.1 patches only the held final geometry of `landometer.logo.full`. Controlled radial, 0.25° angular, and wedge overlaps remove visible anti-alias gaps while preserving the official mark-aligned silhouette and colour-region layout. It remains a motif rather than the official identity file, and no literal pixel-identity claim is made. See [`../governance/logo-full-geometry-decision.json`](../governance/logo-full-geometry-decision.json). Claude and ChatGPT retrieval/update rules are in [`ai-sync.md`](ai-sync.md).

Release 1.1.2 selects the owner-supplied v2 runtime as exact bytes (`JS d4e5c636…12fb`, `CSS e7028286…1794`) and adds only the library-level logo settle/hold described above. The user's screenshot is evidence of a mixed preview frame—priority wedge and quiet final present while the full outer Energy Sky path remained absent—not authority to alter the authored animation or broaden downstream use. Both local rendered QA and deployed GitHub Pages byte/animation verification passed. Claude and ChatGPT retrieval/update rules remain in [`ai-sync.md`](ai-sync.md).

### ijji static asset

```html
<img
  src="https://montri-th.github.io/motif/assets/ijji/svg/ijji-rings-c-transparent-ink.svg"
  width="120"
  height="120"
  alt=""
  aria-hidden="true"
>
```

### ijji state-bound motion

The supplied motion CSS loops while inline markup exists. Insert it only when a real request begins, keep the motif `aria-hidden`, announce visible status and elapsed time, provide a working cancel action, and remove the animated markup on success, failure, cancel, or timeout. Never leave it as ambient motion.

## Format routes

| Output | Route | Status |
| --- | --- | --- |
| Web | SVG still or governed component/state motion | LDS web target: 360–1600 px |
| Deck | Static SVG/PNG | LDS 16:9 target: 1920×1080 |
| Social | Static SVG/PNG placed in the complete creative | LDS 0.9.1 conformance claim only for 1080×1080 |
| Document/PDF | Static SVG/PNG | A4 portrait target; verify the rendered PDF |
| Email | Static PNG | No animation dependency |
| Video | Static or finite owner-directed sequence | Owner-approved extension; no LDS 0.9.1 video format-conformance claim |

## Accessibility

- Decorative or redundant mark: `alt=""` and `aria-hidden="true"`.
- Learning or asset-catalog specimen: describe the visual plainly.
- Pending state: the visible status text and elapsed time carry meaning; the motif stays hidden from assistive technology.
- Reduced motion: land on the final complete still immediately.
- Keyboard and zoom: preview, copy, filter, cancel, and download controls remain reachable and readable.

## Approval and release status

The owner states that they created the supplied assets, hold full rights, and authorize public display and downloads. Reuse is reserved for the Landometer team, owner-authorized collaborators, and AI/agent workflows acting for an authorized operator unless a separate written license or owner decision says otherwise. That approval is recorded as a 2026-09-05 artifact overlay. It does not retroactively add the motif bytes to LDS 0.9.1 or ijji Design System/Add-on 0.5.0/0.5.3, and it does not turn a public repository into an unrestricted third-party license.
