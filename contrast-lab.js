(() => {
  "use strict";

  const lab = document.querySelector("[data-contrast-lab]");
  if (!lab) return;
  const en = document.body.dataset.locale === "en";
  const base = (document.body.dataset.base || ".").replace(/\/$/, "");
  const url = path => `${base}/${path}`;
  const $ = selector => lab.querySelector(selector);
  const words = {
    light: en ? "Light surfaces" : "พื้นสว่าง",
    deep: en ? "Deep surfaces" : "พื้นลึก",
    low: en ? "Some sampled parts stay subtle" : "บางส่วนยังเบาอยู่",
    mixed: en ? "Strong accents, softer details" : "ส่วนเด่นชัด รายละเอียดยังเบา",
    high: en ? "All listed samples clear your reference" : "ตัวอย่างสีที่ระบุถึงเส้นอ้างอิงทุกค่า",
    none: en ? "No listed surface lifts the weakest sample to this reference. Try a different supplied variant, give it space, or leave it out." : "ยังไม่มีพื้นในชุดนี้ที่พาส่วนอ่อนสุดถึงเส้นอ้างอิง ลองเปลี่ยน variant เพิ่มพื้นที่ว่าง หรือเว้นลายออก",
    currentBest: en ? "Your current surface is the only listed pairing that reaches this reference. Try its sibling file to explore another direction." : "พื้นปัจจุบันเป็นคู่เดียวในชุดที่ถึงเส้นอ้างอิงนี้ ลองสลับไฟล์เพื่อสำรวจอีกทิศทางได้",
    recommendation: en ? "Try these surfaces — ranked by the weakest listed sample" : "ลองพื้นเหล่านี้ — เรียงตามค่าของตัวอย่างส่วนอ่อนสุด",
    provisional: en ? "These lift the strongest sample only. Check the softer details too." : "พื้นเหล่านี้ช่วยให้ส่วนเด่นถึงเส้นอ้างอิง แต่ยังต้องดูรายละเอียดที่เบากว่าด้วย",
    copied: en ? "Result copied — ready for your handoff." : "คัดลอกผลแล้ว พร้อมส่งต่อให้ทีม",
    failed: en ? "Clipboard is unavailable. Select and copy the result below." : "ใช้คลิปบอร์ดไม่ได้ เลือกและคัดลอกผลด้านล่างได้เลย",
    sample: en ? "Sampled inks" : "ตัวอย่างสีที่คำนวณ",
    alpha: en ? "Authored alpha" : "Alpha จากไฟล์ต้นฉบับ",
    download: en ? "Download this asset" : "ดาวน์โหลดชิ้นนี้",
    idDownload: en ? "Download this PNG" : "ดาวน์โหลด PNG นี้",
    approximation: en ? "Approximate opaque sample of a translucent overlay; the real background changes its result." : "ค่าสีทึบโดยประมาณของ overlay โปร่งใส พื้นด้านหลังจริงทำให้ผลเปลี่ยนได้",
    gradient: en ? "One listed gradient stop, shown as a solid sample. Check every stop and the final composition." : "แสดงหนึ่ง stop ของ gradient เป็นสีทึบ ต้องตรวจทุก stop และภาพที่จัดวางจริง",
    solid: en ? "Solid carrier sample. Check at the final size and placement." : "ตัวอย่างพื้นสีทึบ ตรวจซ้ำที่ขนาดและตำแหน่งใช้งานจริง",
    backdrop: en ? "Preview surface" : "พื้นสำหรับดูตัวอย่าง",
  };

  // These are the 20 carriers and 20 sampled records supplied with the handoff.
  // A sampled ink range is useful for placement; it is not whole-asset certification.
  const carriers = [
    ["surface.card", "--surface-card", "#FCFCFA", "light"],
    ["surface.canvas", "--surface-canvas", "#F6F7F3", "light"],
    ["brand.beige", "--brand-beige", "#F2F1DF", "light"],
    ["surface.alt", "--surface-alt", "#EEF1EE", "light"],
    ["semantic.info.fill", "--semantic-info-fill", "#E8EEF0", "light"],
    ["surface.soft", "--surface-soft", "#E5E9E6", "light"],
    ["surface.blueTint", "--surface-blue-tint", "#E2E9ED", "light"],
    ["ground.mist", "ground.mist · listed stop", "#B2E2E2", "light", "gradient"],
    ["dark.canvas", "--surface-canvas (dark)", "#11191D", "deep"],
    ["overlay.glass", "--overlay-glass ≈", "#111A1E", "deep", "approximation"],
    ["dark.alt", "--surface-alt (dark)", "#172126", "deep"],
    ["dark.card", "--surface-card (dark)", "#20292D", "deep"],
    ["dark.blueTint", "--surface-blue-tint (dark)", "#18333E", "deep"],
    ["dark.raised", "--surface-raised (dark)", "#293337", "deep"],
    ["brand.blue", "--brand-blue", "#1D4497", "deep"],
    ["ground.current.start", "ground.current · start", "#0F5773", "deep", "gradient"],
    ["ground.current.mid", "ground.current · mid", "#006A6A", "deep", "gradient"],
    ["measure.deep.mid", "measure.deep · mid", "#176B82", "deep", "gradient"],
    ["ground.current.end", "ground.current · end", "#1F744F", "deep", "gradient"],
    ["measure.deep.end", "measure.deep · end", "#08756F", "deep", "gradient"],
  ].map(([id, token, hex, kind, caveat = "solid"]) => ({ id, token, hex, kind, caveat }));
  const energy = ["#FF5A5F", "#FFBC1F", "#0AD69C", "#59D2FE", "#1D4497"];
  const assets = [];
  function motif(kind, widthFull, widthQuiet, qMax, qMin, fMin, inks = energy) {
    for (const variant of ["full", "quiet"]) {
      const quiet = variant === "quiet";
      assets.push({ id: `lm.${kind}.${variant}`, label: `${kind} · ${variant}`, assetId: `landometer.${kind}.${variant}`, path: `assets/landometer/svg/${kind}-${variant}.svg`, inks: quiet ? ["#59D2FE"] : inks, minAlpha: quiet ? qMin : fMin, maxAlpha: quiet ? qMax : 1, width: quiet ? widthQuiet : widthFull, family: "landometer.motif.v3", sibling: `lm.${kind}.${quiet ? "full" : "quiet"}` });
    }
  }
  motif("dial", 280, 200, 1, .4, 1);
  motif("rings", 280, 200, 1, .24, 1);
  motif("layers", 280, 200, .72, .18, .56);
  motif("slice", 240, 180, .56, .4, 1, ["#1D4497", "#59D2FE"]);
  motif("cultivate", 280, 200, 1, .56, 1);
  motif("logo", 240, 200, 1, .24, 1, ["#1D4497", "#D2566A", "#D2A437", "#0EB99B", "#4DB6E9", "#FF5A5F", "#FFBC1F", "#0AD69C", "#59D2FE", "#1F87CE"]);
  assets.push(
    { id: "ijji.ink", label: "ijji rotate-b · ink", assetId: "ijji.rotate-b-transparent-ink", path: "assets/ijji/svg/ijji-rotate-b-transparent-ink.svg", inks: ["#182327"], family: "ijji.four-beat.selected-3.r3", width: 96, sibling: "ijji.mint" },
    { id: "ijji.mint", label: "ijji rotate-b · mint", assetId: "ijji.rotate-b-transparent-mint", path: "assets/ijji/svg/ijji-rotate-b-transparent-mint.svg", inks: ["#0AD69C"], family: "ijji.four-beat.selected-3.r3", width: 96, sibling: "ijji.ink" },
    ...[["color", "#1D4497", "white"], ["white", "#FFFFFF", "color"], ["cream", "#EFEFD0", "white"], ["gray", "#757575", "color"]].map(([name, ink, sibling]) => ({ id: `id.${name}`, label: `Landometer symbol · ${name}`, assetId: `landometer-symbol-${name}`, path: `assets/identity/logo/landometer-symbol-${name}.png`, inks: [ink], family: "official identity", width: 120, sibling: `id.${sibling}` })),
    ...[["light", "#007A58", "dark"], ["dark", "#3BD19B", "light"]].map(([name, ink, sibling]) => ({ id: `cc.${name}`, label: `CityChat 3a · ${name}`, assetId: `3a-voice-home-${name}`, path: `assets/citychat/assets/3a-voice-home-${name}.svg`, inks: [ink], family: "citychat-motif-set", width: 240, sibling: `cc.${sibling}` })),
  );
  assets.forEach(asset => { asset.minAlpha ??= 1; asset.maxAlpha ??= 1; });
  const lum = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
  const composite = (ink, bg, alpha) => "#" + [1, 3, 5].map(i => Math.round(parseInt(ink.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, "0")).join("");
  function range(asset, bg) {
    const samples = asset.inks.flatMap(ink => [asset.minAlpha, asset.maxAlpha].map(alpha => contrast(composite(ink, bg, alpha), bg)));
    return { min: Math.min(...samples), max: Math.max(...samples) };
  }
  const ratio = n => `${n.toFixed(2)} : 1`;
  let currentAsset = assets.find(asset => asset.id === "lm.dial.quiet");
  let currentCarrier = carriers.find(carrier => carrier.id === "surface.canvas");
  let floor = 3;

  const assetSelect = $("[data-cl-asset]");
  const carrierSelect = $("[data-cl-carrier]");
  for (const family of [...new Set(assets.map(asset => asset.family))]) {
    const group = document.createElement("optgroup");
    group.label = family;
    assets.filter(asset => asset.family === family).forEach(asset => group.append(new Option(asset.label, asset.id)));
    assetSelect.append(group);
  }
  for (const kind of ["light", "deep"]) {
    const group = document.createElement("optgroup");
    group.label = words[kind];
    carriers.filter(carrier => carrier.kind === kind).forEach(carrier => group.append(new Option(`${carrier.id} · ${carrier.hex}`, carrier.id)));
    carrierSelect.append(group);
    const swatchGroup = document.createElement("div");
    swatchGroup.className = "cl-swatches";
    swatchGroup.setAttribute("role", "group");
    swatchGroup.setAttribute("aria-label", words[kind]);
    carriers.filter(carrier => carrier.kind === kind).forEach(carrier => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cl-swatch";
      button.style.setProperty("--cl-swatch", carrier.hex);
      button.dataset.clSwatch = carrier.id;
      button.setAttribute("aria-label", `${carrier.id} · ${carrier.hex}`);
      button.setAttribute("title", `${carrier.id} · ${carrier.hex}`);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => { currentCarrier = carrier; render(true); });
      swatchGroup.append(button);
    });
    $("[data-cl-swatches]").append(swatchGroup);
  }

  function render(announce = false) {
    assetSelect.value = currentAsset.id;
    carrierSelect.value = currentCarrier.id;
    const measured = range(currentAsset, currentCarrier.hex);
    const state = measured.min >= floor ? "high" : measured.max >= floor ? "mixed" : "low";
    const preview = $("[data-cl-preview]");
    preview.style.backgroundColor = currentCarrier.hex;
    const img = $("[data-cl-image]");
    const nextSource = url(currentAsset.path);
    if (img.getAttribute("src") !== nextSource) img.src = nextSource;
    img.alt = currentAsset.label;
    img.style.width = `${currentAsset.width}px`;
    $("[data-cl-name]").textContent = currentAsset.label;
    $("[data-cl-surface]").textContent = `${currentCarrier.id} · ${currentCarrier.hex}`;
    $("[data-cl-min]").textContent = ratio(measured.min);
    $("[data-cl-max]").textContent = ratio(measured.max);
    $("[data-cl-verdict]").textContent = words[state];
    $("[data-cl-verdict]").dataset.state = state;
    $("[data-cl-meta]").textContent = `${words.sample}: ${currentAsset.inks.join(" · ")} / ${words.alpha}: ${currentAsset.minAlpha}–${currentAsset.maxAlpha}`;
    $("[data-cl-carrier-note]").textContent = words[currentCarrier.caveat];
    $("[data-cl-threshold-value]").value = `${floor.toFixed(1)} : 1`;
    $("[data-cl-threshold]").setAttribute("aria-valuetext", `${floor.toFixed(1)} to 1`);
    const download = $("[data-cl-download]");
    download.href = url(currentAsset.path);
    download.download = currentAsset.path.split("/").pop();
    download.textContent = words.download;
    $("[data-cl-sibling]").textContent = en ? `Try ${assets.find(a => a.id === currentAsset.sibling).label}` : `ลอง ${assets.find(a => a.id === currentAsset.sibling).label}`;
    lab.querySelectorAll("[data-cl-swatch]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.clSwatch === currentCarrier.id)));
    const ranked = carriers.filter(c => c.id !== currentCarrier.id && !(currentAsset.id.startsWith("lm.") && currentAsset.id.endsWith(".full") && c.id === "brand.blue")).map(carrier => ({ carrier, ...range(currentAsset, carrier.hex) })).sort((a, b) => b.min - a.min);
    const clear = ranked.filter(item => item.min >= floor);
    const stronger = ranked.filter(item => item.max >= floor);
    const choices = (clear.length ? clear : stronger).slice(0, 3);
    $("[data-cl-suggestion-note]").textContent = clear.length ? words.recommendation : choices.length ? words.provisional : measured.max >= floor ? words.currentBest : words.none;
    const suggestions = $("[data-cl-suggestions]");
    suggestions.replaceChildren();
    choices.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cl-suggestion";
      const swatch = document.createElement("span");
      swatch.className = "cl-suggestion-dot";
      swatch.style.backgroundColor = item.carrier.hex;
      const label = document.createElement("span");
      label.textContent = item.carrier.id;
      const detail = document.createElement("small");
      detail.textContent = `${item.min.toFixed(2)}–${item.max.toFixed(2)} : 1`;
      button.append(swatch, label, detail);
      button.addEventListener("click", () => { currentCarrier = item.carrier; render(true); carrierSelect.focus({ preventScroll: true }); });
      suggestions.append(button);
    });
    if (announce) $("[data-cl-status]").textContent = `${currentAsset.label} · ${currentCarrier.id}. ${en ? "Sampled range" : "ช่วงค่าตัวอย่าง"} ${measured.min.toFixed(2)}–${measured.max.toFixed(2)} : 1. ${words[state]}`;
  }
  assetSelect.addEventListener("change", () => { currentAsset = assets.find(asset => asset.id === assetSelect.value); render(true); });
  carrierSelect.addEventListener("change", () => { currentCarrier = carriers.find(carrier => carrier.id === carrierSelect.value); render(true); });
  $("[data-cl-threshold]").addEventListener("input", event => { floor = Number(event.target.value); render(); });
  $("[data-cl-threshold]").addEventListener("change", () => render(true));
  $("[data-cl-sibling]").addEventListener("click", () => { currentAsset = assets.find(asset => asset.id === currentAsset.sibling); render(true); });
  lab.querySelectorAll("[data-cl-preset]").forEach(button => button.addEventListener("click", () => {
    currentAsset = assets.find(asset => asset.id === button.dataset.clPreset);
    currentCarrier = carriers.find(carrier => carrier.id === button.dataset.clPresetCarrier);
    render(true);
  }));
  $("[data-cl-copy]").addEventListener("click", async () => {
    const measured = range(currentAsset, currentCarrier.hex);
    const text = [
      "Motif placement · sampled contrast record",
      `assetId: ${currentAsset.assetId}`,
      `family: ${currentAsset.family}`,
      `assetPath: ${currentAsset.path}`,
      `hostSurfaceToken: ${currentCarrier.token}`,
      `hostSurfaceHex: ${currentCarrier.hex}`,
      `authoredAlphaSample: ${currentAsset.minAlpha}–${currentAsset.maxAlpha}`,
      `sampledInks: ${currentAsset.inks.join(", ")}`,
      `sampledContrastMin: ${measured.min.toFixed(2)}:1`,
      `sampledContrastMax: ${measured.max.toFixed(2)}:1`,
      `comparisonReference: ${floor.toFixed(1)}:1`,
      `surfaceNote: ${words[currentCarrier.caveat]}`,
      "scope: listed ink/alpha samples only; not all pixels, all components, or an accessibility certification",
      "next: inspect the exact output, all gradient stops, size, meaning and text alternatives",
    ].join("\n");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      $("[data-cl-copy-status]").textContent = words.copied;
      $("[data-cl-manual-copy]").hidden = true;
    } catch {
      const fallback = $("[data-cl-manual-copy]");
      fallback.hidden = false;
      fallback.querySelector("textarea").value = text;
      fallback.querySelector("textarea").focus();
      fallback.querySelector("textarea").select();
      $("[data-cl-copy-status]").textContent = words.failed;
    }
  });
  render();
  lab.classList.add("cl-ready");
  lab.querySelectorAll("[data-cl-enhanced]").forEach(element => { element.hidden = false; });

  const identity = document.querySelector("[data-identity-selector]");
  if (!identity) return;
  const i$ = selector => identity.querySelector(selector);
  const guidance = {
    color: en ? "Start on a light surface. The blue base can blend into Brand Blue. Keep all authored colors." : "เริ่มที่พื้นสว่าง ฐานสีน้ำเงินอาจกลืนกับ Brand Blue คงทุกสีตามไฟล์เดิม",
    white: en ? "Start on a deep surface. White details fade into a light canvas." : "เริ่มที่พื้นลึก รายละเอียดสีขาวจะจางบนพื้นสว่าง",
    cream: en ? "This supplied cream is the legacy #EFEFD0. Preview it on deep surfaces; a replacement export is still needed for the updated cream." : "ครีมในไฟล์นี้เป็นรุ่นเดิม #EFEFD0 ลองบนพื้นลึก ไฟล์ครีมที่อัปเดตยังต้องรอ export ใหม่",
    gray: en ? "Compare the actual background. Gray separates from both light and dark canvas, but is weaker on Brand Blue and several deep gradients." : "เทียบกับพื้นจริง สีเทาแยกจาก canvas ทั้งสว่างและมืดได้ แต่จางลงบน Brand Blue และ gradient ลึกบางชุด",
  };
  const identityFiles = [
    ["landometer-symbol-color.png", "Symbol · color", "color", 1601, 1601],
    ["landometer-symbol-white.png", "Symbol · white", "white", 3457, 3661],
    ["landometer-symbol-cream.png", "Symbol · cream", "cream", 3457, 3661],
    ["landometer-symbol-gray.png", "Symbol · gray", "gray", 3457, 3661],
    ["landometer-symbol-mono.png", "Symbol · mono", "white", 6402, 6402],
    ["landometer-symbol-outline-white.png", "Symbol · outline white", "white", 6402, 6402],
    ["landometer-symbol-outline-cream.png", "Symbol · outline cream", "cream", 3457, 3661],
    ["landometer-symbol-white-square.png", "Symbol · white square", "white", 6402, 6402],
    ["landometer-symbol-192.png", "Symbol · 192 px", "color", 192, 192],
    ["landometer-lockup-banner.png", "Lockup · banner", "color", 3818, 1048],
    ["landometer-lockup-color.png", "Lockup · color master", "color", 23324, 6402],
    ["Landometer-Logo-TransparentBG.png", "Logo · transparent master", "color", 23324, 6402],
  ].map(([file, label, tone, width, height]) => ({ file, label, tone, width, height }));
  const idSelect = i$("[data-id-file]");
  identityFiles.forEach(file => idSelect.append(new Option(file.label, file.file)));
  const idSurfaces = [{ id: "canvas", hex: "#F6F7F3" }, { id: "brand.blue", hex: "#1D4497" }, { id: "dark.canvas", hex: "#11191D" }, { id: "brand.beige", hex: "#F2F1DF" }];
  let idSurface = idSurfaces[0];
  function renderIdentity(announce = false) {
    const file = identityFiles.find(item => item.file === idSelect.value) || identityFiles[0];
    const img = i$("[data-id-image]");
    const nextSource = url(`assets/identity/logo/${file.file}`);
    if (img.getAttribute("src") !== nextSource) img.src = nextSource;
    img.alt = `Landometer · ${file.label}`;
    img.style.width = file.width / file.height > 2 ? "min(100%, 420px)" : "min(100%, 180px)";
    i$("[data-id-preview]").style.backgroundColor = idSurface.hex;
    i$("[data-id-guidance]").textContent = guidance[file.tone];
    i$("[data-id-caption]").textContent = `${file.label} · ${file.width} × ${file.height} px`;
    i$("[data-id-surface]").textContent = `${idSurface.id} · ${idSurface.hex}`;
    i$("[data-id-download]").href = url(`assets/identity/logo/${file.file}`);
    i$("[data-id-download]").download = file.file;
    identity.querySelectorAll("[data-id-bg]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.idBg === idSurface.id)));
    if (announce) i$("[data-id-status]").textContent = `${file.label}. ${words.backdrop}: ${idSurface.id}. ${guidance[file.tone]}`;
  }
  idSelect.addEventListener("change", () => renderIdentity(true));
  identity.querySelectorAll("[data-id-bg]").forEach(button => button.addEventListener("click", () => { idSurface = idSurfaces.find(surface => surface.id === button.dataset.idBg); renderIdentity(true); }));
  i$("[data-id-match]").addEventListener("click", () => {
    const file = identityFiles.find(item => item.file === idSelect.value) || identityFiles[0];
    idSurface = idSurfaces[file.tone === "white" || file.tone === "cream" ? 2 : 0];
    renderIdentity(true);
  });
  renderIdentity();
  identity.querySelectorAll("[data-cl-enhanced]").forEach(element => { element.hidden = false; });
})();
