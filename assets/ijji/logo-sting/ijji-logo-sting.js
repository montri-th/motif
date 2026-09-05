/* ijji-logo-sting.js — <ijji-logo-sting> · ijji animated logo · round 3 · 5 September 2026
   The logo builds itself: four heads hop up from the baseline, the i · jj · i letter bodies drop in,
   the tagline pops in word by word, a small hello wave, then hold. 9 s, plays once.
   Every layer is a crop of the approved logo file; geometry is in the file's own 2000-px space.
   No dependencies. Classic script: <script src="ijji-logo-sting.js" defer></script>
   Layer images resolve relative to this file (./layers/) — override with the assets="" attribute.
   notagline attribute = mark only (four heads + i·jj·i), 6.4 s, framed to the mark. */
(function () {
  'use strict';
  var G = {"sourcePx":2000,"ink":"#0AD69C","heads":[{"cx":732.4,"cy":707.6,"r":29.2},{"cx":887.3,"cy":700,"r":44.3},{"cx":1063.4,"cy":659.8,"r":63.9},{"cx":1293.4,"cy":586.4,"r":93.3}],"startY":1178.8,"union":{"x0":616,"y0":493.1,"x1":1386.7,"y1":1460},"pieces":[{"file":"i-1.png","x":658,"y":743,"w":111,"h":299,"heads":[0]},{"file":"jj.png","x":712,"y":745,"w":475,"h":468,"heads":[1,2]},{"file":"i-2.png","x":1230,"y":743,"w":110,"h":299,"heads":[3]}],"words":[{"file":"tag-1-1.png","line":0,"x":612,"y":1290,"w":183,"h":96,"baseline":1360},{"file":"tag-1-2.png","line":0,"x":811,"y":1290,"w":327,"h":96,"baseline":1360},{"file":"tag-1-3.png","line":0,"x":1154,"y":1290,"w":235,"h":96,"baseline":1360},{"file":"tag-2-1.png","line":1,"x":684,"y":1390,"w":252,"h":80,"baseline":1457},{"file":"tag-2-2.png","line":1,"x":954,"y":1390,"w":113,"h":80,"baseline":1457},{"file":"tag-2-3.png","line":1,"x":1080,"y":1390,"w":240,"h":80,"baseline":1457}]};
  var T = { hop: 0, bodies: 2.7, tagline: 4.2, hello: 6.1, hold: 7.6, end: 9 };
  var BOUNCE = { soft: 0.6, playful: 1, extra: 1.3 };
  var SURFACE = { 'brand-blue': '#1D4497', dark: '#11191D' };
  var MARGIN = 60, WORD_DROP = 21, LABEL = 'ijji — Your business buddy around the corner';
  var VB = { x: G.union.x0 - MARGIN, y: G.union.y0 - MARGIN, w: G.union.x1 - G.union.x0 + 2 * MARGIN, h: G.union.y1 - G.union.y0 + 2 * MARGIN };
  // mark only (notagline): frame the four heads + letter bodies, and drop the tagline beats — 6.4 s
  var MARK = (function () { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, p, h;
    for (i = 0; i < G.pieces.length; i++) { p = G.pieces[i]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h); }
    for (i = 0; i < G.heads.length; i++) { h = G.heads[i]; x0 = Math.min(x0, h.cx - h.r); y0 = Math.min(y0, h.cy - h.r); x1 = Math.max(x1, h.cx + h.r); }
    return { x: x0 - MARGIN, y: y0 - MARGIN, w: x1 - x0 + 2 * MARGIN, h: y1 - y0 + 2 * MARGIN }; })();
  var T_MARK = { hop: 0, bodies: 2.7, tagline: 1e9, hello: 4.2, hold: 5.7, end: 6.4 };
  var SCRIPT_URL = (document.currentScript && document.currentScript.src) || null;
  var SVGNS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function seg(t, s, d, e) { return e(clamp((t - s) / d, 0, 1)); }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function inOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function back(c1) { return function (x) { var c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }; }
  function jelly(v, A, f, k) { return v <= 0 ? 0 : A * Math.exp(-k * v) * Math.sin(2 * Math.PI * f * v); }
  function pieceOf(i) { for (var p = 0; p < G.pieces.length; p++) if (G.pieces[p].heads.indexOf(i) >= 0) return p; return 0; }
  function n(v) { return Math.round(v * 1000) / 1000; }

  // one head: anticipate (squash) → hop (stretch, grow) → land (jelly); recoil when its body drops; hello hop
  function head(i, th, tb, tw, k) {
    var h = G.heads[i], r0 = G.heads[0].r, s = 0.3 + i * 0.24, ANT = 0.16, FLY = 0.62;
    var y = G.startY, r = r0, sx = 1, sy = 1;
    if (th >= s) {
      var a = clamp((th - s) / ANT, 0, 1), f = clamp((th - s - ANT) / FLY, 0, 1);
      if (f === 0) { sy = 1 - 0.25 * k * Math.sin(Math.PI / 2 * a); sx = 1 + 0.18 * k * Math.sin(Math.PI / 2 * a); }
      else {
        y = lerp(G.startY, h.cy, back(1.4 * k)(f));
        r = lerp(r0, h.r, outCubic(f));
        sy = f < 0.25 ? lerp(1 - 0.25 * k, 1 + 0.22 * k, outCubic(f / 0.25)) : lerp(1 + 0.22 * k, 1, inOutCubic((f - 0.25) / 0.75));
        sx = 1 - (sy - 1) * 0.6;
      }
      var land = jelly(th - s - ANT - FLY, 0.22 * k, 2.6, 5); sy -= land; sx += land * 0.6;
    }
    var rel = 0.15 + pieceOf(i) * 0.16, rc = jelly(tb - rel, 1, 3, 6);
    sy -= 0.18 * k * rc; sx += 0.1 * k * rc; y += 0.25 * rc * h.r;
    var ws = 0.1 + i * 0.12, u = clamp((tw - ws) / 0.42, 0, 1), lift = Math.sin(Math.PI * u);
    y -= lift * 0.42 * h.r; sy += 0.1 * k * lift; sx -= 0.06 * k * lift;
    var wl = jelly(tw - ws - 0.42, 0.12 * k, 3.2, 7); sy -= wl; sx += wl * 0.6;
    return { x: h.cx, y: y, r: r, sx: sx, sy: sy };
  }
  function frame(t, k, TL) {
    var th = t - TL.hop, tb = t - TL.bodies, tt = t - TL.tagline, tw = t - TL.hello, i;
    var heads = [], pieces = [], words = [];
    for (i = 0; i < G.heads.length; i++) heads.push(head(i, th, tb, tw, k));
    for (i = 0; i < G.pieces.length; i++) {
      var pc = G.pieces[i], rel = 0.15 + i * 0.16, q = back(1.9 * k)(clamp((tb - rel) / 0.7, 0, 1));
      var boing = jelly(tw - (0.1 + pc.heads[0] * 0.12) - 0.42, 0.05 * k, 3.2, 7);
      pieces.push({ sx: q > 1 ? Math.max(0.9, 1 - 0.5 * (q - 1)) : 1, sy: Math.max(0, q - boing), o: clamp((tb - rel) / 0.1, 0, 1) });
    }
    for (i = 0; i < G.words.length; i++) {
      var wd = G.words[i], s = 0.1 + i * 0.14 + (wd.line ? 0.18 : 0), qq = back(2.2 * k)(clamp((tt - s) / 0.5, 0, 1));
      words.push({ sc: 0.35 + 0.65 * qq, rot: (1 - qq) * (i % 2 ? 9 : -9) * k, dy: (1 - qq) * WORD_DROP, o: clamp((tt - s) / 0.15, 0, 1) });
    }
    return { heads: heads, pieces: pieces, words: words };
  }

  function el(tag, attrs) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  var IjjiLogoSting = function () { return Reflect.construct(HTMLElement, [], IjjiLogoSting); };
  IjjiLogoSting.prototype = Object.create(HTMLElement.prototype, { constructor: { value: IjjiLogoSting } });
  Object.setPrototypeOf(IjjiLogoSting, HTMLElement);
  IjjiLogoSting.observedAttributes = ['surface', 'bounce', 'notagline'];
  var P = IjjiLogoSting.prototype;

  P.connectedCallback = function () {
    if (!this._built) this._build();
    this._reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this._render(this._T().end);                      // final state first — the logo is always complete unless it is playing
    if (!this.hasAttribute('manual')) this._arm();
  };
  P.disconnectedCallback = function () { this.pause(); if (this._io) { this._io.disconnect(); this._io = null; } };
  P.attributeChangedCallback = function (name) { if (!this._built) return; if (name === 'surface') this._paintSurface(); else if (name === 'notagline') { this._frame(); this._render(this._T().end); } else this._render(this._t || 0); };
  P._T = function () { return this.hasAttribute('notagline') ? T_MARK : T; };
  Object.defineProperty(P, 'duration', { get: function () { return this._T().end; } });
  Object.defineProperty(P, 'currentTime', { get: function () { return this._t || 0; } });

  P._layers = function () {
    var a = this.getAttribute('assets');
    if (a) return a.replace(/\/?$/, '/');
    try { return new URL('layers/', SCRIPT_URL || location.href).href; } catch (e) { return 'layers/'; }
  };
  P._build = function () {
    var root = this.attachShadow({ mode: 'open' }), base = this._layers(), i;
    var style = document.createElement('style');
    style.textContent = ':host{display:block;line-height:0}svg{display:block;width:100%;height:auto;overflow:visible}';
    root.appendChild(style);
    var svg = el('svg', { viewBox: [VB.x, VB.y, VB.w, VB.h].map(n).join(' '), role: 'img', 'aria-label': LABEL, xmlns: SVGNS });
    this._rect = el('rect', { x: n(VB.x), y: n(VB.y), width: n(VB.w), height: n(VB.h), fill: 'none' });
    svg.appendChild(this._rect);
    this._pieces = []; this._heads = []; this._words = [];
    for (i = 0; i < G.pieces.length; i++) this._pieces.push(svg.appendChild(this._image(G.pieces[i], base)));
    for (i = 0; i < G.heads.length; i++) this._heads.push(svg.appendChild(el('circle', { r: G.heads[i].r, fill: G.ink })));
    for (i = 0; i < G.words.length; i++) this._words.push(svg.appendChild(this._image(G.words[i], base)));
    root.appendChild(svg);
    this._svg = svg; this._built = true; this._paintSurface(); this._frame();
  };
  P._image = function (r, base) {
    var im = el('image', { x: r.x, y: r.y, width: r.w, height: r.h });
    im.setAttribute('href', base + r.file); im.setAttributeNS(XLINK, 'xlink:href', base + r.file);
    return im;
  };
  P._frame = function () {
    var mark = this.hasAttribute('notagline'), box = mark ? MARK : VB, i;
    this._svg.setAttribute('viewBox', [box.x, box.y, box.w, box.h].map(n).join(' '));
    this._svg.setAttribute('aria-label', mark ? 'ijji' : LABEL);
    this._rect.setAttribute('x', n(box.x)); this._rect.setAttribute('y', n(box.y)); this._rect.setAttribute('width', n(box.w)); this._rect.setAttribute('height', n(box.h));
    for (i = 0; i < this._words.length; i++) this._words[i].setAttribute('display', mark ? 'none' : '');
  };
  P._paintSurface = function () { var s = SURFACE[this.getAttribute('surface')]; this._rect.setAttribute('fill', s || 'none'); };
  P._k = function () { return BOUNCE[this.getAttribute('bounce') || 'playful'] || 1; };
  P._render = function (t) {
    this._t = t;
    var f = frame(t, this._k(), this._T()), i, o;
    for (i = 0; i < f.heads.length; i++) { var h = f.heads[i], R = G.heads[i].r;
      this._heads[i].setAttribute('transform', 'translate(' + n(h.x) + ' ' + n(h.y) + ') scale(' + n(h.sx * h.r / R) + ' ' + n(h.sy * h.r / R) + ')'); }
    for (i = 0; i < f.pieces.length; i++) { var p = f.pieces[i], g = G.pieces[i]; o = [g.x + g.w / 2, g.y];
      this._pieces[i].setAttribute('transform', 'translate(' + n(o[0]) + ' ' + n(o[1]) + ') scale(' + n(p.sx) + ' ' + n(p.sy) + ') translate(' + n(-o[0]) + ' ' + n(-o[1]) + ')');
      this._pieces[i].setAttribute('opacity', n(p.o)); }
    for (i = 0; i < f.words.length; i++) { var w = f.words[i], gw = G.words[i]; o = [gw.x + gw.w / 2, gw.baseline];
      this._words[i].setAttribute('transform', 'translate(' + n(o[0]) + ' ' + n(o[1] + w.dy) + ') rotate(' + n(w.rot) + ') scale(' + n(w.sc) + ') translate(' + n(-o[0]) + ' ' + n(-o[1]) + ')');
      this._words[i].setAttribute('opacity', n(w.o)); }
  };
  P._arm = function () {
    var self = this; if (this._reduce) return;
    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver(function (es) { for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { self._io.disconnect(); self._io = null; self.replay(); break; } }, { threshold: 0.14 });
      this._io.observe(this);
    } else this.replay();
  };
  P.play = function () {
    if (this._reduce) { this._render(this._T().end); this._end(); return; }
    if (this._playing) return;
    if ((this._t || 0) >= this._T().end) this._t = 0;
    var self = this, speed = parseFloat(this.getAttribute('speed')) || 1, start = performance.now() - this._t * 1000 / speed;
    this._playing = true; this.dispatchEvent(new CustomEvent('ijji-sting-start'));
    var END = this._T().end;
    function tick(now) { if (!self._playing) return; var t = (now - start) / 1000 * speed;
      if (t >= END) { self._render(END); self._playing = false; self._end(); return; }
      self._render(t); self._raf = requestAnimationFrame(tick); }
    this._raf = requestAnimationFrame(tick);
  };
  P.pause = function () { this._playing = false; if (this._raf) cancelAnimationFrame(this._raf); };
  P.seek = function (s) { this.pause(); this._render(clamp(+s || 0, 0, this._T().end)); };
  P.finish = function () { this.pause(); this._render(this._T().end); this._end(); };
  P.replay = function () { this.pause(); this._render(0); this.play(); };
  P._end = function () {
    this.dispatchEvent(new CustomEvent('ijji-sting-end'));
    var self = this;
    if (this.hasAttribute('loop') && !this._reduce) setTimeout(function () { if (self.isConnected && self.hasAttribute('loop')) self.replay(); }, 400);
  };
  if (window.customElements && !customElements.get('ijji-logo-sting')) customElements.define('ijji-logo-sting', IjjiLogoSting);
})();
