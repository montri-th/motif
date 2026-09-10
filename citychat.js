(() => {
  'use strict';
  const root = document.documentElement;
  const lang = document.body.dataset.locale === 'en' ? 'en' : 'th';
  const th = lang === 'th';
  const t = (thai, english) => th ? thai : english;
  const base = new URL(`${document.body.dataset.base || '.'}/assets/citychat/`, location.href);
  const publicBase = 'https://montri-th.github.io/motif/assets/citychat/';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const printing = matchMedia('print');
  const data = {
    a: { stem: '3a-voice-home', cycle: 2800, title: t('3a · เสียงบ้านเรา', '3a · Voices from home') },
    b: { stem: '3b-live-visit-trade', cycle: 3400, title: t('3b · น่าอยู่ น่าเที่ยว น่าค้าขาย', '3b · Live, visit, trade') },
    c: { stem: '3c-our-voice-here', cycle: 3000, title: t('3c · เสียงเราอยู่ตรงนี้', '3c · Our voice is here') },
    motif: { stem: 'conversation-motif-original', cycle: 2600, title: t('ConversationMotif · ต้นฉบับ', 'ConversationMotif · original') },
  };
  const cards = [...document.querySelectorAll('[data-cc-card]')];
  const dialog = document.getElementById('cc-dialog');
  if (!dialog || !cards.length) return;
  const stage = dialog.querySelector('[data-cc-stage]');
  const status = dialog.querySelector('[data-cc-status]');
  const pauseButton = dialog.querySelector('[data-cc-pause]');
  const replayButton = dialog.querySelector('[data-cc-replay]');
  const loop = dialog.querySelector('[data-cc-loop]');
  const feedback = document.getElementById('cc-feedback');
  let current = null;
  let pagePaused = false;
  let pageAway = false;
  let localPaused = false;
  let generation = 0;
  let cycleTimer = 0;
  let runtimePromise;
  let feedbackTimer = 0;
  const inline = new Map(cards.map(card => [card, { visible: false, generation: 0, timer: 0 }]));

  function file(slot, surface) {
    return `assets/${data[slot].stem}${slot === 'motif' ? '' : `-${surface}`}.svg`;
  }
  function stillURL(slot, surface) { return new URL(file(slot, surface), base).href; }
  function announce(message) {
    feedback.textContent = message;
    const toast = document.querySelector('[data-toast]');
    if (toast) {
      toast.textContent = message;
      toast.dataset.show = 'true';
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => { toast.dataset.show = 'false'; }, 2600);
    }
  }
  function setStatus(message) { if (status.textContent !== message) status.textContent = message; }
  function surfaceFor(card) { return card.querySelector('[data-cc-surface]').dataset.ccSurface; }
  function setCardSurface(card, surface) {
    const slot = card.dataset.ccCard;
    if (slot === 'motif') surface = 'light';
    const preview = card.querySelector('[data-cc-surface]');
    preview.dataset.ccSurface = surface;
    stopInline(card);
    inlineFallback(card);
    card.querySelector('[data-cc-svg]').href = stillURL(slot, surface);
    if (slot !== 'motif') card.querySelector('[data-cc-rendition]').textContent = `${surface} · ${surface === 'dark' ? '#11191D' : '#F6F7F3'}`;
    card.querySelectorAll('[data-cc-card-surface]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.ccCardSurface === surface));
    });
    syncInlineCard(card);
  }
  function stopInline(card) {
    const controller = inline.get(card);
    controller.generation += 1;
    clearTimeout(controller.timer);
    controller.timer = 0;
    card.querySelector('[data-cc-art]').getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  }
  function inlineFallback(card) {
    const slot = card.dataset.ccCard;
    const image = document.createElement('img');
    image.dataset.ccStill = '';
    image.src = stillURL(slot, surfaceFor(card));
    image.alt = data[slot].title;
    image.width = 180;
    image.height = 180;
    const art = card.querySelector('[data-cc-art]');
    art.replaceChildren(image);
    art.dataset.ccMotionState = 'static';
  }
  function inlineEligible(card) {
    return inline.get(card).visible && !card.hidden && !dialog.open && !pagePaused && !pageAway && !document.hidden && !reduced.matches && !printing.matches;
  }
  async function playInline(card) {
    stopInline(card);
    const controller = inline.get(card);
    const token = controller.generation;
    const slot = card.dataset.ccCard;
    const surface = surfaceFor(card);
    try {
      const module = await runtime();
      if (token !== controller.generation || !inlineEligible(card)) return;
      const template = document.createElement('template');
      template.innerHTML = module.svg[slot][surface];
      const svg = template.content.querySelector('svg');
      if (!svg) throw new Error('Missing CityChat rendition');
      svg.setAttribute('aria-label', data[slot].title);
      const art = card.querySelector('[data-cc-art]');
      art.replaceChildren(svg);
      art.dataset.ccMotionState = 'playing';
      controller.timer = setTimeout(() => {
        if (token === controller.generation && inlineEligible(card)) playInline(card);
      }, data[slot].cycle);
    } catch (_) {
      if (token === controller.generation) inlineFallback(card);
    }
  }
  function syncInlineCard(card) {
    if (inlineEligible(card)) playInline(card);
    else { stopInline(card); inlineFallback(card); }
  }
  function syncInline() { cards.forEach(syncInlineCard); }
  function fallback() {
    if (!current) return;
    const image = document.createElement('img');
    image.src = stillURL(current.slot, current.surface);
    image.alt = data[current.slot].title;
    image.width = 280;
    image.height = 280;
    stage.replaceChildren(image);
    stage.dataset.ccSurface = current.surface;
    stage.dataset.ccMotionState = 'static';
  }
  function stop() {
    generation += 1;
    clearTimeout(cycleTimer);
    cycleTimer = 0;
    stage.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  }
  function blocked() {
    return !dialog.open || !current || localPaused || pagePaused || pageAway || document.hidden || reduced.matches || printing.matches;
  }
  function syncControls() {
    const disabled = pagePaused || pageAway || document.hidden || reduced.matches || printing.matches;
    replayButton.disabled = disabled;
    pauseButton.disabled = disabled;
    pauseButton.setAttribute('aria-pressed', String(localPaused));
    pauseButton.textContent = localPaused ? t('เล่น motion ต่อ', 'Resume motion') : t('พัก motion', 'Pause motion');
    loop.disabled = disabled;
  }
  function staticReason() {
    if (reduced.matches) return t('แสดงภาพนิ่งตามการตั้งค่าลดการเคลื่อนไหวของคุณ', 'Showing the still for your reduced-motion preference.');
    if (pagePaused) return t('พัก motion ทั้งหน้าอยู่ · แสดงภาพนิ่งพร้อมใช้', 'Page motion is paused. The still remains visible.');
    return t('พักแล้ว · ภาพนิ่งพร้อมให้ดูรายละเอียด', 'Paused. Take a closer look at the still.');
  }
  async function runtime() {
    if (!runtimePromise) {
      runtimePromise = import(new URL('motion/citychat-motif-motion.js', base).href).then(module => {
        if (!module.svg || typeof module.css !== 'string') throw new Error('CityChat runtime is incomplete');
        if (!document.getElementById('cc-source-motion-style')) {
          const style = document.createElement('style');
          style.id = 'cc-source-motion-style';
          style.textContent = module.css;
          document.head.append(style);
        }
        return module;
      }).catch(error => { runtimePromise = null; throw error; });
    }
    return runtimePromise;
  }
  async function play({ announcePlay = false } = {}) {
    stop();
    fallback();
    syncControls();
    if (blocked()) { setStatus(staticReason()); return; }
    const token = generation;
    const chosen = { ...current };
    if (announcePlay) setStatus(t('กำลังเปิดบทสนทนา…', 'Starting the conversation…'));
    try {
      const module = await runtime();
      if (token !== generation || blocked()) return;
      const markup = module.svg[chosen.slot]?.[chosen.surface];
      if (!markup) throw new Error('Missing rendition');
      const template = document.createElement('template');
      template.innerHTML = markup;
      const svg = template.content.querySelector('svg');
      if (!svg) throw new Error('Missing SVG');
      svg.setAttribute('aria-label', data[chosen.slot].title);
      stage.replaceChildren(svg);
      stage.dataset.ccMotionState = 'playing';
      if (announcePlay) setStatus(loop.checked
        ? t(`กำลังเล่น · วนทุก ${data[chosen.slot].cycle / 1000} วินาที ลองพักเพื่อดูภาพนิ่ง`, `Playing every ${data[chosen.slot].cycle / 1000} seconds. Pause to inspect the still.`)
        : t('กำลังเล่นหนึ่งครั้ง แล้วค้างภาพสุดท้าย', 'Playing once, then holding the final frame.'));
      cycleTimer = setTimeout(() => {
        if (token !== generation || blocked()) return;
        if (loop.checked) play();
        else {
          stage.dataset.ccMotionState = 'complete';
          setStatus(t('เล่าจบแล้ว · ค้างภาพสุดท้าย กดเล่นอีกครั้งได้เสมอ', 'Complete. The final frame stays; replay whenever you like.'));
        }
      }, data[chosen.slot].cycle);
    } catch (_) {
      if (token !== generation || !dialog.open) return;
      fallback();
      setStatus(t('เปิด motion ไม่สำเร็จ แต่ภาพนิ่งยังพร้อมใช้งาน · ลองเล่นอีกครั้งได้', 'Motion could not load. The still is ready; you can try replay again.'));
    }
  }
  function chooseDialogSurface(surface) {
    if (!current) return;
    current.surface = current.slot === 'motif' ? 'light' : surface;
    dialog.querySelectorAll('[data-cc-dialog-surface]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.ccDialogSurface === current.surface));
    });
    play({ announcePlay: true });
  }
  function openPreview(card) {
    current = { slot: card.dataset.ccCard, surface: surfaceFor(card) };
    localPaused = false;
    document.getElementById('cc-dialog-title').textContent = data[current.slot].title;
    dialog.querySelector('[data-cc-dialog-surfaces]').hidden = current.slot === 'motif';
    dialog.showModal();
    syncInline();
    chooseDialogSurface(current.surface);
  }

  async function exportPNG(card, button) {
    const slot = card.dataset.ccCard;
    const surface = surfaceFor(card);
    let objectURL;
    button.disabled = true;
    try {
      const response = await fetch(stillURL(slot, surface));
      if (!response.ok) throw new Error('SVG unavailable');
      const source = await response.text();
      const parsed = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
      const view = parsed.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
      const ratio = view?.length === 4 && view[2] > 0 && view[3] > 0 ? view[3] / view[2] : 1;
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = Math.round(canvas.width * ratio);
      objectURL = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = objectURL; });
      const context = canvas.getContext('2d');
      context.fillStyle = surface === 'dark' ? '#11191D' : '#F6F7F3';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG unavailable');
      const downloadURL = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadURL;
      link.download = `citychat-${data[slot].stem}-${surface}-2048.png`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadURL), 10000);
      announce(t('ดาวน์โหลด PNG แล้ว · พื้นตรงกับที่เลือก', 'PNG downloaded with the selected surface.'));
    } catch (_) {
      announce(t('สร้าง PNG ไม่สำเร็จ · ดาวน์โหลด SVG ของชิ้นนี้ได้', 'PNG could not be created. You can download this motif’s SVG.'));
    } finally {
      if (objectURL) URL.revokeObjectURL(objectURL);
      button.disabled = false;
    }
  }

  function portableCode(slot, surface) {
    const id = `citychat-${slot}-${surface}-${Date.now().toString(36)}`;
    const source = `${publicBase}${file(slot, surface)}`;
    const background = surface === 'dark' ? '#11191D' : '#F6F7F3';
    // The selected surface and registered paths travel with the snippet. Replay is
    // finite once; the library's inspection loop never becomes an exported default.
    return `<!-- CityChat ${data[slot].stem} · ${surface} · source register: citychat-motif-set 1.0.1-proposal
     Keep the registered artwork unchanged. One motif per scene; live copy outside it.
     This portable example plays once on entry, with still fallback and lifecycle cleanup. -->
<div id="${id}" aria-hidden="true" style="width:240px;max-width:100%;box-sizing:border-box;padding:24px;background:${background}">
  <img src="${source}" alt="" width="192" height="192" style="display:block;width:100%;height:auto">
</div>
<script type="module">
(() => {
  const host = document.getElementById('${id}');
  if (!host) return;
  const still = host.firstElementChild.cloneNode(true);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let visible = false, played = false, paused = false, disposed = false, epoch = 0, style;
  const showStill = () => {
    epoch++;
    host.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    host.replaceChildren(still.cloneNode(true));
  };
  const eligible = () => host.isConnected && visible && !document.hidden && !paused && !media.matches && !disposed;
  const start = async () => {
    if (!eligible() || played) return;
    const ticket = ++epoch;
    try {
      const motion = await import('${publicBase}motion/citychat-motif-motion.js');
      if (ticket !== epoch || !eligible() || played) return;
      style = document.createElement('style');
      style.textContent = motion.css;
      document.head.append(style);
      const template = document.createElement('template');
      template.innerHTML = motion.svg['${slot}']['${surface}'];
      const art = template.content.querySelector('svg');
      if (!art) throw new Error('Missing CityChat rendition');
      art.setAttribute('aria-hidden', 'true');
      art.style.cssText = 'display:block;width:100%;height:auto;overflow:visible';
      host.replaceChildren(art);
      played = true;
    } catch (_) { showStill(); }
  };
  const sync = () => eligible() ? start() : showStill();
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, {threshold:0.14});
  observer.observe(host);
  document.addEventListener('visibilitychange', sync, {signal:events.signal});
  media.addEventListener('change', sync, {signal:events.signal});
  window.addEventListener('motif:motion', event => { paused = !!event.detail?.paused; sync(); }, {signal:events.signal});
  window.addEventListener('beforeprint', showStill, {signal:events.signal});
  window.addEventListener('pagehide', showStill, {signal:events.signal});
  window.addEventListener('pageshow', sync, {signal:events.signal});
  const removal = new MutationObserver(() => { if (!host.isConnected) dispose(); });
  removal.observe(document.documentElement, {childList:true,subtree:true});
  function dispose() {
    disposed = true;
    showStill();
    observer.disconnect();
    removal.disconnect();
    events.abort();
    style?.remove();
  }
  host.addEventListener('citychat:dispose', dispose, {signal:events.signal});
})();
<\/script>`;
  }
  async function copyCode(card) {
    const code = portableCode(card.dataset.ccCard, surfaceFor(card));
    try {
      await navigator.clipboard.writeText(code);
      announce(t('คัดลอกโค้ดพร้อม runtime และภาพนิ่งแล้ว', 'Copied code with the runtime and still fallback.'));
    } catch (_) {
      let panel = card.querySelector('.cc-code-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'cc-code-panel';
        const label = document.createElement('label');
        label.textContent = t('คัดลอกโค้ดจากช่องนี้', 'Copy the code from this field');
        const field = document.createElement('textarea');
        field.readOnly = true;
        field.spellcheck = false;
        label.append(field);
        panel.append(label);
        card.querySelector('.asset-body').append(panel);
      }
      const field = panel.querySelector('textarea');
      field.value = code;
      field.focus(); field.select();
      announce(t('แสดงโค้ดให้เลือกคัดลอกแล้ว', 'The code is selected and ready to copy.'));
    }
  }

  cards.forEach(card => {
    setCardSurface(card, root.dataset.theme === 'dark' ? 'dark' : 'light');
    card.querySelectorAll('[data-cc-card-surface]').forEach(button => button.addEventListener('click', () => setCardSurface(card, button.dataset.ccCardSurface)));
    card.querySelector('[data-cc-preview]').addEventListener('click', () => openPreview(card));
    const png = card.querySelector('[data-cc-png]');
    png.addEventListener('click', () => exportPNG(card, png));
    card.querySelector('[data-cc-code]').addEventListener('click', () => copyCode(card));
  });
  dialog.querySelector('[data-cc-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { stop(); current = null; stage.replaceChildren(); setStatus(''); syncInline(); });
  dialog.querySelectorAll('[data-cc-dialog-surface]').forEach(button => button.addEventListener('click', () => chooseDialogSurface(button.dataset.ccDialogSurface)));
  replayButton.addEventListener('click', () => { localPaused = false; play({ announcePlay: true }); });
  pauseButton.addEventListener('click', () => { localPaused = !localPaused; play({ announcePlay: true }); });
  loop.addEventListener('change', () => { if (!localPaused) play({ announcePlay: true }); });
  function syncLifecycle() {
    syncInline();
    if (!dialog.open) return;
    if (blocked()) { stop(); fallback(); syncControls(); setStatus(staticReason()); }
    else play({ announcePlay: true });
  }
  reduced.addEventListener('change', syncLifecycle);
  printing.addEventListener('change', syncLifecycle);
  window.addEventListener('beforeprint', () => { cards.forEach(card => { stopInline(card); inlineFallback(card); }); if (current) { stop(); fallback(); } });
  window.addEventListener('afterprint', syncLifecycle);
  document.addEventListener('visibilitychange', syncLifecycle);
  window.addEventListener('motif:motion', event => { pagePaused = !!event.detail?.paused; syncLifecycle(); });
  window.addEventListener('pagehide', () => { pageAway = true; syncLifecycle(); });
  window.addEventListener('pageshow', () => { pageAway = false; syncLifecycle(); });
  const intersection = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const card = entry.target.closest('[data-cc-card]');
      inline.get(card).visible = entry.isIntersecting;
      syncInlineCard(card);
    });
  }, { threshold: 0.14 });
  cards.forEach(card => {
    intersection.observe(card.querySelector('.cc-preview'));
    new MutationObserver(() => syncInlineCard(card)).observe(card, { attributes: true, attributeFilter: ['hidden'] });
  });
  new MutationObserver(() => {
    cards.forEach(card => setCardSurface(card, root.dataset.theme === 'dark' ? 'dark' : 'light'));
    if (current) chooseDialogSurface(root.dataset.theme === 'dark' ? 'dark' : 'light');
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
