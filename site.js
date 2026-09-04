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
      lmStatus: "แอนิเมชัน finite เล่นหนึ่งครั้ง · ภาพนิ่งคือสถานะสุดท้าย",
      ijjiWorking: "ijji กำลังประมวลผล",
      ijjiElapsed: (seconds) => `${seconds.toFixed(1)} วินาที`,
      ijjiDone: "ตัวอย่างจบแล้ว · motif หยุดพร้อมสถานะ",
      stopped: "หยุดตัวอย่างแล้ว",
      unavailable: "ไม่พบ asset ที่เลือก",
      replay: "เล่นอีกครั้ง",
      stop: "หยุด",
      light: "เปลี่ยนเป็นธีมสว่าง",
      dark: "เปลี่ยนเป็นธีมมืด",
    },
    en: {
      copied: "Copied",
      copyFailed: "Copy failed",
      downloadReady: "PNG created",
      downloadFailed: "Could not create the PNG",
      result: (count) => `${count} assets shown`,
      lmStatus: "Finite animation, played once · the still is the final state",
      ijjiWorking: "ijji is processing",
      ijjiElapsed: (seconds) => `${seconds.toFixed(1)} seconds`,
      ijjiDone: "Specimen complete · the motif stopped with the state",
      stopped: "Preview stopped",
      unavailable: "The selected asset is unavailable",
      replay: "Play again",
      stop: "Stop",
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
      const motif = document.createElement("lm-motif");
      motif.setAttribute("kind", stage.dataset.kind || "dial");
      if (stage.dataset.quiet === "true") motif.setAttribute("quiet", "");
      stage.append(motif);
      requestAnimationFrame(() => {
        if (motif.querySelector("svg")) stage.classList.add("is-enhanced");
      });
    });
  }
  enhanceLandometerStages();

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
        const quiet = button.dataset.quiet === "true" ? " quiet" : "";
        snippet = `<link rel="stylesheet" href="${origin}/assets/landometer/landometer-motifs.css">\n<script src="${origin}/assets/landometer/landometer-motifs.js" defer><\/script>\n<lm-motif kind="${id}"${quiet}></lm-motif>`;
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
  const replayButton = document.querySelector("#preview-replay");
  const cancelButton = document.querySelector("#preview-cancel");
  let previewConfig = null;
  let previewInterval = 0;
  let previewTimeout = 0;
  let ijjiModulePromise = null;

  function clearPreviewTimers() {
    clearInterval(previewInterval);
    clearTimeout(previewTimeout);
    previewInterval = 0;
    previewTimeout = 0;
  }

  function setPreviewStatus(message, elapsed = null) {
    if (dialogMessage) dialogMessage.textContent = message;
    else if (dialogStatus) dialogStatus.textContent = message;
    if (dialogTimer) dialogTimer.textContent = elapsed === null ? "" : ` · ${copy.ijjiElapsed(elapsed)}`;
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

  async function renderPreview() {
    if (!previewConfig || !dialogStage) return;
    clearPreviewTimers();
    dialogStage.replaceChildren();
    dialogStage.classList.toggle("is-dark", previewConfig.brand === "ijji");

    if (previewConfig.brand === "landometer") {
      const motif = document.createElement("lm-motif");
      motif.setAttribute("kind", previewConfig.id);
      motif.setAttribute("autoplay", "false");
      dialogStage.append(motif);
      requestAnimationFrame(() => motif.play?.());
      setPreviewStatus(copy.lmStatus);
      return;
    }

    try {
      const moduleUrl = new URL(`${base}/assets/ijji/ijji-motifs.js`, document.baseURI).href;
      ijjiModulePromise ||= import(moduleUrl);
      const module = await ijjiModulePromise;
      const markup = module.IJJI_MOTIFS?.[`${previewConfig.id}-transparent-mint`];
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
      previewTimeout = window.setTimeout(() => finishIjjiPreview("done"), previewConfig.duration * 1000);
    } catch (_) {
      setPreviewStatus(copy.unavailable);
    }
  }

  document.querySelectorAll("[data-preview-brand]").forEach((button) => {
    button.addEventListener("click", () => {
      previewConfig = {
        brand: button.dataset.previewBrand,
        id: button.dataset.previewId,
        duration: Number(button.dataset.duration || 4),
      };
      if (dialogTitle) dialogTitle.textContent = `${previewConfig.brand === "ijji" ? "ijji" : "Landometer"} · ${previewConfig.id}`;
      if (replayButton) replayButton.textContent = copy.replay;
      if (cancelButton) cancelButton.textContent = copy.stop;
      if (!dialog?.open) dialog?.showModal();
      renderPreview();
    });
  });

  replayButton?.addEventListener("click", renderPreview);
  cancelButton?.addEventListener("click", () => {
    if (previewConfig?.brand === "ijji") finishIjjiPreview("stopped");
    else {
      clearPreviewTimers();
      dialogStage?.querySelector("lm-motif")?.removeAttribute("data-play");
      setPreviewStatus(copy.stopped);
    }
  });
  document.querySelector("[data-dialog-close]")?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("close", () => {
    clearPreviewTimers();
    dialogStage?.replaceChildren();
  });
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
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
