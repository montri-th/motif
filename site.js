(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js-ready");
  const body = document.body;
  const base = body.dataset.base || ".";
  const locale = body.dataset.locale === "en" ? "en" : "th";
  const copy = {
    th: {
      copied: "คัดลอกแล้ว",
      copyFailed: "คัดลอกไม่สำเร็จ",
      downloadReady: "สร้างไฟล์ PNG แล้ว",
      downloadFailed: "สร้างไฟล์ PNG ไม่สำเร็จ",
      result: (count) => `พบ ${count} assets`,
      lmStatus: "ตัวอย่าง full + quiet เล่นทันทีและวนซ้ำอัตโนมัติ",
      lmAssembling: "กำลังประกอบ full + quiet · เมื่อครบแล้วจะค้างท่าสุดท้ายให้ตรวจ",
      lmFinal: "ประกอบครบแล้ว · ค้างท่าสุดท้ายก่อนวนรอบถัดไป",
      lmPaused: "หยุด auto replay แล้ว · ภาพอยู่ที่สถานะสุดท้าย",
      lmReduced: "แสดงสถานะสุดท้ายของ full + quiet · ปิด auto replay ตามการตั้งค่า reduced motion",
      ijjiLogoPlaying: "กำลังประกอบโลโก้ตามจังหวะต้นฉบับ · จะวนใหม่หลังค้างภาพสุดท้าย",
      ijjiLogoFinal: "ประกอบโลโก้ครบแล้ว · ค้างภาพสุดท้ายก่อนวนรอบถัดไป",
      ijjiLogoPaused: "หยุด auto replay แล้ว · แสดงโลโก้ที่ประกอบครบ",
      ijjiLogoReduced: "แสดงโลโก้ที่ประกอบครบ · ปิด animation ตามการตั้งค่า reduced motion",
      replayNow: "เล่นซ้ำตอนนี้",
      pauseAutoplay: "หยุด auto replay",
      fullVariant: "full",
      quietVariant: "quiet",
      ijjiWorking: "ijji กำลังประมวลผล",
      ijjiElapsed: (seconds) => `${seconds.toFixed(1)} วินาที`,
      ijjiDone: "ตัวอย่างจบแล้ว · motif หยุดพร้อมสถานะ",
      stopped: "หยุดตัวอย่างแล้ว",
      unavailable: "ไม่พบ asset ที่เลือก",
      replay: "เล่นอีกครั้ง",
      stop: "หยุด",
      pausePageMotion: "หยุด animation",
      resumePageMotion: "เล่น animation ต่อ",
      light: "เปลี่ยนเป็นธีมสว่าง",
      dark: "เปลี่ยนเป็นธีมมืด",
    },
    en: {
      copied: "Copied",
      copyFailed: "Copy failed",
      downloadReady: "PNG created",
      downloadFailed: "Could not create the PNG",
      result: (count) => `${count} assets shown`,
      lmStatus: "Full + quiet play immediately and auto-replay continuously",
      lmAssembling: "Assembling full + quiet · the complete final state will hold for inspection",
      lmFinal: "Assembly complete · holding the exact final state before the next replay",
      lmPaused: "Auto-replay paused · both motifs are at their final state",
      lmReduced: "Full + quiet final states · auto-replay is off for reduced motion",
      ijjiLogoPlaying: "Building the logo with the source timing · it will replay after the final hold",
      ijjiLogoFinal: "Logo assembly complete · holding the final frame before replay",
      ijjiLogoPaused: "Auto-replay paused · showing the complete logo",
      ijjiLogoReduced: "Complete logo shown · animation is off for reduced motion",
      replayNow: "Replay now",
      pauseAutoplay: "Pause auto-replay",
      fullVariant: "full",
      quietVariant: "quiet",
      ijjiWorking: "ijji is processing",
      ijjiElapsed: (seconds) => `${seconds.toFixed(1)} seconds`,
      ijjiDone: "Specimen complete · the motif stopped with the state",
      stopped: "Preview stopped",
      unavailable: "The selected asset is unavailable",
      replay: "Play again",
      stop: "Stop",
      pausePageMotion: "Pause animation",
      resumePageMotion: "Resume animation",
      light: "Switch to light theme",
      dark: "Switch to dark theme",
    },
  }[locale];

  const toast = document.querySelector("[data-toast]");
  let toastTimer = 0;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.show = "true";
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.dataset.show = "false"; }, 2200);
  }

  function syncThemeButton() {
    const isDark = root.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.textContent = isDark ? "☀" : "◐";
      button.setAttribute("aria-label", isDark ? copy.light : copy.dark);
      button.title = isDark ? copy.light : copy.dark;
    });
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("motif-theme", next); } catch (_) {}
      syncThemeButton();
    });
  });
  syncThemeButton();

  document.querySelectorAll(".mobile-nav-panel a").forEach((link) => {
    link.addEventListener("click", () => link.closest("details")?.removeAttribute("open"));
  });

  async function enhanceLandometerStages() {
    if (!window.customElements?.whenDefined) return;
    await Promise.race([
      customElements.whenDefined("lm-motif"),
      new Promise((resolve) => window.setTimeout(resolve, 1800)),
    ]);
    if (!customElements.get("lm-motif")) return;

    document.querySelectorAll("[data-lm-live]").forEach((stage) => {
      if (stage.querySelector(":scope > lm-motif")) return;
      const motif = document.createElement("lm-motif");
      motif.setAttribute("kind", stage.dataset.kind || "dial");
      motif.setAttribute("autoplay", "false");
      if (stage.dataset.quiet === "true") motif.setAttribute("quiet", "");
      if (stage.dataset.ink) motif.setAttribute("ink", stage.dataset.ink);
      stage.append(motif);
      requestAnimationFrame(() => {
        if (motif.querySelector("svg")) stage.classList.add("is-enhanced");
      });

      const replayMs = Math.max(0, Number(stage.dataset.loop || 0));
      let replayTimer = 0;
      const play = () => {
        motif.removeAttribute("data-play");
        void motif.offsetWidth;
        motif.setAttribute("data-play", "");
        clearTimeout(replayTimer);
        if (replayMs) replayTimer = window.setTimeout(play, replayMs);
      };
      registerInlineMotion(stage, play, () => {
        clearTimeout(replayTimer);
        replayTimer = 0;
        motif.removeAttribute("data-play");
      });
    });
  }

  async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("copy command failed");
  }

  document.querySelectorAll("[data-copy-template]").forEach((button) => {
    button.addEventListener("click", async () => {
      const source = document.querySelector(button.dataset.copyTemplate);
      if (!source) return showToast(copy.copyFailed);
      try {
        await writeClipboard(source.textContent.trim());
        showToast(copy.copied);
      } catch (_) { showToast(copy.copyFailed); }
    });
  });

  document.querySelectorAll("[data-copy-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      const brand = button.dataset.brand;
      const id = button.dataset.id;
      const origin = "https://montri-th.github.io/motif";
      let snippet = "";
      if (brand === "landometer") {
        const isQuiet = button.dataset.quiet === "true";
        const quiet = isQuiet ? " quiet" : "";
        const logoPalette = id === "logo" && !isQuiet ? ' ink="blue"' : "";
        snippet = `<link rel="stylesheet" href="${origin}/assets/landometer/landometer-motifs.css?v=1.2.1">\n<script src="${origin}/assets/landometer/landometer-motifs.js?v=1.2.1" defer><\/script>\n<lm-motif kind="${id}"${quiet}${logoPalette}></lm-motif>`;
      } else if (brand === "ijji-logo") {
        const markOnly = id === "mark";
        const attributes = markOnly ? ' notagline bounce="extra"' : ' surface="brand-blue" bounce="playful"';
        const still = markOnly ? "ijji-mark-still.png" : "ijji-logo-still.png";
        const alt = markOnly ? "ijji" : "ijji — Your business buddy around the corner";
        snippet = `<script src="${origin}/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.1" defer><\/script>\n<ijji-logo-sting${attributes} assets="${origin}/assets/ijji/logo-sting/layers/">\n  <img src="${origin}/assets/ijji/logo-sting/layers/${still}" alt="${alt}">\n</ijji-logo-sting>`;
      } else {
        snippet = `<img src="${origin}/assets/ijji/svg/ijji-${id}-transparent-ink.svg" width="120" height="120" alt="" aria-hidden="true">`;
      }
      try {
        await writeClipboard(snippet);
        showToast(copy.copied);
      } catch (_) { showToast(copy.copyFailed); }
    });
  });

  const cards = [...document.querySelectorAll(".asset-card[data-brand]")];
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const search = document.querySelector("[data-asset-search]");
  const filterStatus = document.querySelector("[data-filter-status]");
  let activeFilter = "all";

  function applyFilters() {
    const query = (search?.value || "").trim().toLocaleLowerCase(locale === "th" ? "th" : "en");
    let visible = 0;
    cards.forEach((card) => {
      const brandMatch = activeFilter === "all" || card.dataset.brand === activeFilter;
      const haystack = `${card.dataset.search || ""} ${card.textContent}`.toLocaleLowerCase(locale === "th" ? "th" : "en");
      const searchMatch = !query || haystack.includes(query);
      card.hidden = !(brandMatch && searchMatch);
      if (!card.hidden) visible += 1;
    });
    document.querySelectorAll("[data-family-grid]").forEach((grid) => {
      const family = grid.dataset.familyGrid;
      const hasVisible = [...grid.querySelectorAll(".asset-card")].some((card) => !card.hidden);
      grid.hidden = !hasVisible;
      document.querySelectorAll(`[data-family="${family}"]`).forEach((head) => { head.hidden = !hasVisible; });
    });
    if (filterStatus) filterStatus.textContent = copy.result(visible);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      applyFilters();
    });
  });
  search?.addEventListener("input", applyFilters);
  applyFilters();

  const dialog = document.querySelector("#preview-dialog");
  const dialogTitle = document.querySelector("#preview-title");
  const dialogStage = document.querySelector("#preview-stage");
  const dialogStatus = document.querySelector("#preview-status");
  const dialogMessage = document.querySelector("[data-preview-message]");
  const dialogTimer = document.querySelector("[data-preview-timer]");
  const dialogAnnouncer = document.querySelector("[data-preview-announcer]");
  const replayButton = document.querySelector("#preview-replay");
  const cancelButton = document.querySelector("#preview-cancel");
  let previewConfig = null;
  let previewInterval = 0;
  let previewTimeout = 0;
  let landometerSettleTimeout = 0;
  let ijjiModulePromise = null;
  let ijjiLogoRuntimePromise = null;
  let ijjiLogoLayersPromise = null;
  let ijjiLogoLayersReady = false;
  let previewRenderGeneration = 0;
  let landometerPreviewPaused = false;
  let landometerReplayGeneration = 0;
  let ijjiLogoPreviewPaused = false;
  const reducedMotionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  const landometerDefaultReplayMs = 3000;
  const landometerLogoReplayMs = 6000;
  const landometerLogoSettleMs = 3400;
  const inlineMotionControllers = [];
  let inlineMotionPaused = false;
  const inlineMotionObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const controller = inlineMotionControllers.find((item) => item.stage === entry.target);
        if (!controller) return;
        controller.inView = entry.isIntersecting && entry.intersectionRatio >= 0.14;
      });
      syncInlineMotion();
    }, { threshold: 0.14, rootMargin: "0px 0px -12% 0px" })
    : null;

  function registerInlineMotion(stage, start, stop) {
    const controller = {
      stage,
      start,
      stop,
      inView: !inlineMotionObserver,
      running: null,
    };
    inlineMotionControllers.push(controller);
    inlineMotionObserver?.observe(stage);
    if (!inlineMotionObserver) syncInlineMotion();
    return controller;
  }

  function syncInlineMotion() {
    inlineMotionControllers.forEach((controller) => {
      const shouldRun = controller.inView
        && document.visibilityState === "visible"
        && !reducedMotionPreference?.matches
        && !inlineMotionPaused;
      controller.stage.dataset.motionState = shouldRun ? "running" : "final";
      if (shouldRun === controller.running) return;
      controller.running = shouldRun;
      if (shouldRun) controller.start();
      else controller.stop();
    });
  }

  const motionToggle = document.querySelector("[data-motion-toggle]");
  function syncMotionToggle() {
    if (!motionToggle) return;
    const isReduced = Boolean(reducedMotionPreference?.matches);
    motionToggle.hidden = isReduced;
    motionToggle.disabled = isReduced;
    motionToggle.textContent = inlineMotionPaused ? "▶" : "Ⅱ";
    motionToggle.removeAttribute("aria-pressed");
    const label = inlineMotionPaused ? copy.resumePageMotion : copy.pausePageMotion;
    motionToggle.setAttribute("aria-label", label);
    motionToggle.title = label;
  }
  motionToggle?.addEventListener("click", () => {
    inlineMotionPaused = !inlineMotionPaused;
    syncMotionToggle();
    syncInlineMotion();
  });
  syncMotionToggle();

  function clearPreviewTimers() {
    clearInterval(previewInterval);
    clearTimeout(previewTimeout);
    clearTimeout(landometerSettleTimeout);
    previewInterval = 0;
    previewTimeout = 0;
    landometerSettleTimeout = 0;
  }

  function landometerPreviewMotifs() {
    return [...(dialogStage?.querySelectorAll("lm-motif") || [])];
  }

  function stopLandometerAutoreplay() {
    landometerReplayGeneration += 1;
    clearTimeout(previewTimeout);
    clearTimeout(landometerSettleTimeout);
    previewTimeout = 0;
    landometerSettleTimeout = 0;
    landometerPreviewMotifs().forEach((motif) => motif.removeAttribute("data-play"));
  }

  function playLandometerPreviewCycle() {
    stopLandometerAutoreplay();
    if (
      landometerPreviewPaused
      || previewConfig?.brand !== "landometer"
      || !dialog?.open
      || document.visibilityState !== "visible"
      || reducedMotionPreference?.matches
    ) return;
    const motifs = landometerPreviewMotifs();
    if (motifs.length !== 2) return;
    motifs.forEach((motif) => motif.removeAttribute("data-play"));
    void dialogStage.offsetWidth;
    motifs.forEach((motif) => motif.setAttribute("data-play", ""));
    setPreviewStatus(copy.lmAssembling);
    const generation = landometerReplayGeneration;
    if (previewConfig.id === "logo") {
      landometerSettleTimeout = window.setTimeout(() => {
        if (generation !== landometerReplayGeneration) return;
        motifs.forEach((motif) => motif.removeAttribute("data-play"));
        setPreviewStatus(copy.lmFinal);
        landometerSettleTimeout = 0;
      }, landometerLogoSettleMs);
    }
    const replayMs = previewConfig.id === "logo" ? landometerLogoReplayMs : landometerDefaultReplayMs;
    previewTimeout = window.setTimeout(() => {
      if (generation === landometerReplayGeneration) playLandometerPreviewCycle();
    }, replayMs);
  }

  function setPreviewStatus(message, elapsed = null) {
    if (dialogMessage) dialogMessage.textContent = message;
    else if (dialogStatus) dialogStatus.textContent = message;
    if (dialogTimer) dialogTimer.textContent = elapsed === null ? "" : ` · ${copy.ijjiElapsed(elapsed)}`;
  }

  function announcePreviewAction(message) {
    if (!dialogAnnouncer) return;
    dialogAnnouncer.textContent = "";
    requestAnimationFrame(() => {
      if (dialog?.open) dialogAnnouncer.textContent = message;
    });
  }

  function finishIjjiPreview(reason = "done") {
    clearPreviewTimers();
    if (!previewConfig || previewConfig.brand !== "ijji") return;
    const img = document.createElement("img");
    img.src = `${base}/assets/ijji/svg/ijji-${previewConfig.id}-transparent-mint.svg`;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.style.width = "min(100%, 280px)";
    dialogStage.replaceChildren(img);
    setPreviewStatus(reason === "done" ? copy.ijjiDone : copy.stopped);
  }

  function loadIjjiLogoRuntime() {
    if (customElements.get("ijji-logo-sting")) return Promise.resolve();
    if (ijjiLogoRuntimePromise) return ijjiLogoRuntimePromise;
    ijjiLogoRuntimePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(`${base}/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.1`, document.baseURI).href;
      script.onload = () => customElements.whenDefined("ijji-logo-sting").then(resolve, reject);
      script.onerror = reject;
      document.head.append(script);
    });
    return ijjiLogoRuntimePromise;
  }

  function preloadIjjiLogoLayers() {
    if (ijjiLogoLayersPromise) return ijjiLogoLayersPromise;
    const files = [
      "i-1.png", "jj.png", "i-2.png",
      "tag-1-1.png", "tag-1-2.png", "tag-1-3.png",
      "tag-2-1.png", "tag-2-2.png", "tag-2-3.png",
    ];
    ijjiLogoLayersPromise = Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = reject;
      image.src = new URL(`${base}/assets/ijji/logo-sting/layers/${file}`, document.baseURI).href;
    }))).then((images) => {
      ijjiLogoLayersReady = true;
      return images;
    });
    return ijjiLogoLayersPromise;
  }

  async function enhanceIjjiLogoStages() {
    const stages = [...document.querySelectorAll("[data-ijji-logo-live]")];
    if (!stages.length) return;
    try {
      await Promise.all([loadIjjiLogoRuntime(), preloadIjjiLogoLayers()]);
      stages.forEach((stage) => {
        let logo = null;
        const dispose = () => {
          const previous = logo;
          if (!previous) return;
          previous.removeAttribute("loop");
          previous.pause?.();
          previous.remove();
          if (logo === previous) logo = null;
        };
        const mount = () => {
          dispose();
          logo = document.createElement("ijji-logo-sting");
          logo.setAttribute("manual", "");
          logo.setAttribute("surface", "brand-blue");
          logo.setAttribute("bounce", "playful");
          logo.setAttribute("assets", new URL(`${base}/assets/ijji/logo-sting/layers/`, document.baseURI).href);
          stage.append(logo);
          requestAnimationFrame(() => {
            if (logo?.shadowRoot) stage.classList.add("is-enhanced");
          });
          return logo;
        };
        const stop = () => {
          dispose();
          mount();
        };
        mount();
        registerInlineMotion(stage, () => {
          const current = mount();
          current.setAttribute("loop", "");
          current.replay?.();
        }, stop);
      });
    } catch (_) {
      // The complete source-image fallback stays visible if the exact runtime fails.
    }
  }

  async function enhanceIjjiMotifStages() {
    const stages = [...document.querySelectorAll("[data-ijji-motif-live]")];
    if (!stages.length) return;
    try {
      const moduleUrl = new URL(`${base}/assets/ijji/ijji-motifs.js?v=1.2.1`, document.baseURI).href;
      ijjiModulePromise ||= import(moduleUrl);
      const module = await ijjiModulePromise;
      stages.forEach((stage) => {
        const key = `${stage.dataset.kind}-${stage.dataset.surface || "transparent-mint"}`;
        const markup = module.IJJI_MOTIFS?.[key];
        if (!markup) return;
        const slot = document.createElement("span");
        slot.className = "ijji-slot";
        slot.innerHTML = markup;
        const svg = slot.querySelector(".ijji-motif");
        svg?.setAttribute("aria-hidden", "true");
        svg?.removeAttribute("role");
        svg?.removeAttribute("aria-label");
        stage.append(slot);
        if (!svg) return slot.remove();
        stage.classList.add("is-enhanced");
        registerInlineMotion(stage, () => {
          stage.classList.remove("is-motion-final");
          stage.classList.remove("is-motion-running");
          void stage.offsetWidth;
          stage.classList.add("is-motion-running");
        }, () => {
          stage.classList.remove("is-motion-running");
          stage.classList.add("is-motion-final");
        });
      });
    } catch (_) {
      // The exact static SVG remains visible if the module cannot be loaded.
    }
  }

  enhanceLandometerStages();
  enhanceIjjiLogoStages();
  enhanceIjjiMotifStages();

  function ijjiLogoElement() {
    return dialogStage?.querySelector("ijji-logo-sting") || null;
  }

  function createIjjiLogoFallback(config) {
    const markOnly = config?.id === "mark";
    const fallback = document.createElement("img");
    fallback.src = `${base}/assets/ijji/logo-sting/layers/${markOnly ? "ijji-mark-still.png" : "ijji-logo-still.png"}`;
    fallback.alt = markOnly ? "ijji" : "ijji — Your business buddy around the corner";
    fallback.style.cssText = "display:block;width:100%;height:auto";
    return fallback;
  }

  function createIjjiLogoPreview(config) {
    if (!config || config.brand !== "ijji-logo") return null;
    const markOnly = config.id === "mark";
    const logo = document.createElement("ijji-logo-sting");
    logo.setAttribute("manual", "");
    logo.setAttribute("assets", new URL(`${base}/assets/ijji/logo-sting/layers/`, document.baseURI).href);
    logo.setAttribute("bounce", markOnly ? "extra" : "playful");
    if (markOnly) logo.setAttribute("notagline", "");
    else logo.setAttribute("surface", "brand-blue");
    logo.append(createIjjiLogoFallback(config));
    logo.addEventListener("ijji-sting-start", () => {
      if (ijjiLogoElement() !== logo) return;
      clearInterval(previewInterval);
      setPreviewStatus(copy.ijjiLogoPlaying, 0);
      previewInterval = window.setInterval(() => {
        if (ijjiLogoElement() !== logo) {
          clearInterval(previewInterval);
          previewInterval = 0;
          return;
        }
        if (dialogTimer) dialogTimer.textContent = ` · ${copy.ijjiElapsed(logo.currentTime)}`;
      }, 100);
    });
    logo.addEventListener("ijji-sting-end", () => {
      if (ijjiLogoElement() !== logo) return;
      clearInterval(previewInterval);
      previewInterval = 0;
      setPreviewStatus(copy.ijjiLogoFinal, logo.duration);
    });
    return logo;
  }

  function disposeIjjiLogoPreview() {
    const previous = ijjiLogoElement();
    if (!previous) return;
    previous.removeAttribute("loop");
    previous.pause?.();
    previous.remove();
  }

  function mountIjjiLogoPreview(config = previewConfig) {
    if (!dialogStage) return null;
    disposeIjjiLogoPreview();
    const logo = createIjjiLogoPreview(config);
    if (!logo) return null;
    dialogStage.replaceChildren(logo);
    return logo;
  }

  function stopIjjiLogoAutoreplay({ finish = true } = {}) {
    clearInterval(previewInterval);
    previewInterval = 0;
    disposeIjjiLogoPreview();
    if (finish && dialog?.open && previewConfig?.brand === "ijji-logo") {
      if (customElements.get("ijji-logo-sting") && ijjiLogoLayersReady) mountIjjiLogoPreview(previewConfig);
      else if (dialogStage) dialogStage.replaceChildren(createIjjiLogoFallback(previewConfig));
    }
  }

  async function startIjjiLogoAutoreplay() {
    const config = previewConfig ? { ...previewConfig } : null;
    if (
      ijjiLogoPreviewPaused
      || config?.brand !== "ijji-logo"
      || !dialog?.open
      || document.visibilityState !== "visible"
      || reducedMotionPreference?.matches
    ) return;
    try {
      await Promise.all([loadIjjiLogoRuntime(), preloadIjjiLogoLayers()]);
    } catch (_) {
      return;
    }
    if (
      ijjiLogoPreviewPaused
      || previewConfig?.brand !== config.brand
      || previewConfig?.id !== config.id
      || !dialog?.open
      || document.visibilityState !== "visible"
      || reducedMotionPreference?.matches
    ) return;
    const logo = mountIjjiLogoPreview(config);
    if (!logo) return;
    logo.setAttribute("loop", "");
    logo.replay?.();
  }

  async function renderPreview() {
    const config = previewConfig ? { ...previewConfig } : null;
    if (!config || !dialogStage) return;
    const generation = ++previewRenderGeneration;
    clearPreviewTimers();
    dialogStage.replaceChildren();
    dialogStage.classList.toggle("is-dark", config.brand === "ijji" || config.brand === "ijji-logo");
    dialogStage.classList.toggle("is-logo-sting", config.brand === "ijji-logo");
    dialog?.classList.toggle("is-logo-sting", config.brand === "ijji-logo");

    if (config.brand === "landometer") {
      const pair = document.createElement("div");
      pair.className = "dialog-motif-pair";
      [
        { quiet: false, label: copy.fullVariant },
        { quiet: true, label: copy.quietVariant },
      ].forEach((variant) => {
        const figure = document.createElement("figure");
        figure.className = "dialog-motif-variant";
        const motif = document.createElement("lm-motif");
        motif.setAttribute("kind", config.id);
        motif.setAttribute("autoplay", "false");
        if (variant.quiet) motif.setAttribute("quiet", "");
        else motif.setAttribute("ink", "blue");
        const caption = document.createElement("figcaption");
        caption.textContent = variant.label;
        figure.append(motif, caption);
        pair.append(figure);
      });
      dialogStage.append(pair);
      landometerPreviewPaused = false;
      if (replayButton) {
        replayButton.hidden = Boolean(reducedMotionPreference?.matches);
        replayButton.disabled = false;
        replayButton.textContent = copy.replayNow;
      }
      if (cancelButton) {
        cancelButton.hidden = Boolean(reducedMotionPreference?.matches);
        cancelButton.disabled = false;
        cancelButton.textContent = copy.pauseAutoplay;
      }
      if (reducedMotionPreference?.matches) {
        setPreviewStatus(copy.lmReduced);
      } else {
        playLandometerPreviewCycle();
      }
      return;
    }

    if (config.brand === "ijji-logo") {
      dialogStage.replaceChildren(createIjjiLogoFallback(config));
      if (replayButton) {
        replayButton.hidden = Boolean(reducedMotionPreference?.matches);
        replayButton.disabled = false;
        replayButton.textContent = copy.replayNow;
      }
      if (cancelButton) {
        cancelButton.hidden = Boolean(reducedMotionPreference?.matches);
        cancelButton.disabled = false;
        cancelButton.textContent = copy.pauseAutoplay;
      }
      try {
        await Promise.all([loadIjjiLogoRuntime(), preloadIjjiLogoLayers()]);
        if (
          generation !== previewRenderGeneration
          || !dialog?.open
          || previewConfig?.brand !== config.brand
          || previewConfig?.id !== config.id
        ) return;
        if (reducedMotionPreference?.matches) {
          mountIjjiLogoPreview(config);
          setPreviewStatus(copy.ijjiLogoReduced);
        } else if (ijjiLogoPreviewPaused) {
          mountIjjiLogoPreview(config);
          if (cancelButton) cancelButton.disabled = true;
          setPreviewStatus(copy.ijjiLogoPaused);
        } else startIjjiLogoAutoreplay();
      } catch (_) {
        if (generation === previewRenderGeneration && dialog?.open) setPreviewStatus(copy.unavailable);
      }
      return;
    }

    if (replayButton) {
      replayButton.hidden = false;
      replayButton.disabled = false;
      replayButton.textContent = copy.replay;
    }
    if (cancelButton) {
      cancelButton.hidden = false;
      cancelButton.disabled = false;
      cancelButton.textContent = copy.stop;
    }

    try {
      const moduleUrl = new URL(`${base}/assets/ijji/ijji-motifs.js?v=1.2.1`, document.baseURI).href;
      ijjiModulePromise ||= import(moduleUrl);
      const module = await ijjiModulePromise;
      if (
        generation !== previewRenderGeneration
        || !dialog?.open
        || previewConfig?.brand !== config.brand
        || previewConfig?.id !== config.id
      ) return;
      const markup = module.IJJI_MOTIFS?.[`${config.id}-transparent-mint`];
      if (!markup) throw new Error("missing asset");
      const slot = document.createElement("span");
      slot.className = "ijji-slot";
      slot.setAttribute("aria-hidden", "true");
      slot.innerHTML = markup;
      dialogStage.append(slot);
      const started = performance.now();
      setPreviewStatus(copy.ijjiWorking, 0);
      previewInterval = window.setInterval(() => {
        if (dialogTimer) dialogTimer.textContent = ` · ${copy.ijjiElapsed((performance.now() - started) / 1000)}`;
      }, 250);
      previewTimeout = window.setTimeout(() => {
        if (generation === previewRenderGeneration && dialog?.open) finishIjjiPreview("done");
      }, config.duration * 1000);
    } catch (_) {
      if (
        generation === previewRenderGeneration
        && dialog?.open
        && previewConfig?.brand === config.brand
        && previewConfig?.id === config.id
      ) setPreviewStatus(copy.unavailable);
    }
  }

  document.querySelectorAll("[data-preview-brand]").forEach((button) => {
    button.addEventListener("click", () => {
      previewConfig = {
        brand: button.dataset.previewBrand,
        id: button.dataset.previewId,
        duration: Number(button.dataset.duration || 4),
      };
      if (previewConfig.brand === "ijji-logo") ijjiLogoPreviewPaused = false;
      if (dialogTitle) {
        const brandLabel = previewConfig.brand === "landometer" ? "Landometer" : "ijji";
        const suffix = previewConfig.brand === "landometer" ? " · full + quiet" : previewConfig.brand === "ijji-logo" ? " · animated identity" : "";
        dialogTitle.textContent = `${brandLabel} · ${previewConfig.id}${suffix}`;
      }
      if (!dialog?.open) dialog?.showModal();
      renderPreview();
    });
  });

  replayButton?.addEventListener("click", () => {
    landometerPreviewPaused = false;
    if (previewConfig?.brand === "ijji-logo") {
      ijjiLogoPreviewPaused = false;
      if (cancelButton) cancelButton.disabled = false;
      startIjjiLogoAutoreplay();
      announcePreviewAction(copy.ijjiLogoPlaying);
    } else {
      renderPreview();
      announcePreviewAction(previewConfig?.brand === "landometer" ? copy.lmAssembling : copy.ijjiWorking);
    }
  });
  cancelButton?.addEventListener("click", () => {
    if (previewConfig?.brand === "ijji") {
      previewRenderGeneration += 1;
      finishIjjiPreview("stopped");
      announcePreviewAction(copy.stopped);
    }
    else if (previewConfig?.brand === "ijji-logo") {
      ijjiLogoPreviewPaused = true;
      stopIjjiLogoAutoreplay();
      if (cancelButton) cancelButton.disabled = true;
      setPreviewStatus(copy.ijjiLogoPaused);
      announcePreviewAction(copy.ijjiLogoPaused);
    } else {
      landometerPreviewPaused = true;
      stopLandometerAutoreplay();
      if (cancelButton) cancelButton.disabled = true;
      setPreviewStatus(copy.lmPaused);
      announcePreviewAction(copy.lmPaused);
    }
  });
  document.querySelector("[data-dialog-close]")?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("close", () => {
    previewRenderGeneration += 1;
    clearPreviewTimers();
    stopIjjiLogoAutoreplay({ finish: false });
    landometerPreviewPaused = false;
    ijjiLogoPreviewPaused = false;
    dialogStage?.replaceChildren();
    if (dialogAnnouncer) dialogAnnouncer.textContent = "";
    previewConfig = null;
  });
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener("visibilitychange", () => {
    syncInlineMotion();
    if (!dialog?.open) return;
    if (previewConfig?.brand === "landometer") {
      if (document.visibilityState === "visible") playLandometerPreviewCycle();
      else stopLandometerAutoreplay();
    } else if (previewConfig?.brand === "ijji-logo") {
      if (document.visibilityState === "visible") startIjjiLogoAutoreplay();
      else stopIjjiLogoAutoreplay();
    } else if (previewConfig?.brand === "ijji" && document.visibilityState !== "visible") {
      previewRenderGeneration += 1;
      finishIjjiPreview("stopped");
    }
  });

  reducedMotionPreference?.addEventListener?.("change", () => {
    syncMotionToggle();
    syncInlineMotion();
    if (!dialog?.open || !["landometer", "ijji-logo"].includes(previewConfig?.brand)) return;
    if (previewConfig?.brand === "landometer") stopLandometerAutoreplay();
    else {
      // The owner-supplied ijji runtime snapshots the media query when the
      // element connects. Recreate it so a live preference change is honoured
      // in both directions without modifying the exact source runtime bytes.
      renderPreview();
      return;
    }
    const isReduced = reducedMotionPreference.matches;
    if (replayButton) replayButton.hidden = isReduced;
    if (cancelButton) cancelButton.hidden = isReduced;
    if (isReduced) setPreviewStatus(previewConfig.brand === "ijji-logo" ? copy.ijjiLogoReduced : copy.lmReduced);
    else if (previewConfig.brand === "ijji-logo" && !ijjiLogoPreviewPaused) {
      if (cancelButton) cancelButton.disabled = false;
      startIjjiLogoAutoreplay();
    } else if (previewConfig.brand === "landometer" && !landometerPreviewPaused) {
      if (cancelButton) cancelButton.disabled = false;
      playLandometerPreviewCycle();
    } else setPreviewStatus(copy.lmPaused);
  });

  window.addEventListener("pagehide", () => {
    inlineMotionControllers.forEach((controller) => {
      controller.running = false;
      controller.stage.dataset.motionState = "final";
      controller.stop();
    });
    previewRenderGeneration += 1;
    if (previewConfig?.brand === "ijji" && dialog?.open) finishIjjiPreview("stopped");
    else if (previewConfig?.brand === "ijji-logo") stopIjjiLogoAutoreplay();
    else stopLandometerAutoreplay();
    clearPreviewTimers();
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    syncInlineMotion();
    if (!dialog?.open) return;
    if (previewConfig?.brand === "landometer") playLandometerPreviewCycle();
    if (previewConfig?.brand === "ijji-logo") startIjjiLogoAutoreplay();
  });

  document.querySelectorAll("[data-download-png]").forEach((button) => {
    button.addEventListener("click", async () => {
      const width = Number(button.dataset.width || 1200);
      const height = Number(button.dataset.height || 600);
      try {
        const response = await fetch(button.dataset.svgUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const svgText = await response.text();
        const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
        const sourceUrl = URL.createObjectURL(svgBlob);
        const image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = sourceUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(sourceUrl);
        const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!png) throw new Error("PNG encoding failed");
        const downloadUrl = URL.createObjectURL(png);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = button.dataset.filename || "motif.png";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        showToast(copy.downloadReady);
      } catch (_) {
        showToast(copy.downloadFailed);
      }
    });
  });
})();
