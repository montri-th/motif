/* Landometer motion motifs — v1.1.1 · 5 September 2026
   <lm-motif kind="dial|slice|rings|layers|cultivate|logo" [quiet] [ink="beige"] [autoplay="false"] [run="n"]></lm-motif>
   Renders an inline SVG in its FINAL state (fail-open). When the element scrolls into view it plays once;
   change the `run` attribute (or call el.play()) to replay. Requires landometer-motifs.css.
   The motifs are decoration: the element is aria-hidden and never carries data, copy or a control. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || (window.customElements && window.customElements.get('lm-motif'))) return;

  var C = {
    coral: 'var(--energy-coral,#FF5A5F)', yellow: 'var(--energy-yellow,#FFBC1F)',
    mint: 'var(--energy-mint,#0AD69C)', sky: 'var(--energy-sky,#59D2FE)'
  };
  var SVG_OPEN = '<svg viewBox="0 0 600 300" aria-hidden="true" focusable="false">';

  function stroke(d, color, width, cls, delay, opacity) {
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '"' +
      (opacity ? ' stroke-opacity="' + opacity + '"' : '') +
      ' stroke-dasharray="90" class="' + cls + '" style="--lm-delay:' + delay + 'ms"></path>';
  }

  var build = {
    dial: function (q) {
      var w = q ? 6 : 34, op = q ? 0.4 : 0, ink = 'currentColor';
      var segs = [
        ['M187 200 A113 113 0 0 1 220.10 120.10', C.coral, 0, op],
        ['M220.10 120.10 A113 113 0 0 1 300 87', C.yellow, 150, op],
        ['M300 87 A113 113 0 0 1 379.90 120.10', C.mint, 300, op],
        ['M379.90 120.10 A113 113 0 0 1 413 200', C.sky, 450, 0]
      ].map(function (s) { return stroke(s[0], q ? ink : s[1], w, 'lm-draw', s[2], s[3]); }).join('');
      return SVG_OPEN + segs +
        '<rect x="170" y="210" width="260" height="' + (q ? 2 : 8) + '" fill="currentColor" class="lm-growx-c" style="--lm-delay:640ms"></rect></svg>';
    },
    slice: function (q) {
      var disc = q ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-opacity=".4"' : 'fill="currentColor"';
      var slice = q ? 'fill="currentColor" fill-opacity=".56"' : 'fill="' + C.sky + '"';
      return SVG_OPEN +
        '<path d="M300 150 L396 150 A96 96 0 1 1 300 54 Z" ' + disc + ' class="lm-fade"></path>' +
        '<path d="M300 150 L396 150 A96 96 0 0 0 300 54 Z" ' + slice + ' class="lm-step"></path></svg>';
    },
    rings: function (q) {
      var cls = 'lm-radial ' + (q ? 'lm-approach' : 'lm-radiate');
      function ring(d, color, delay) {
        var paint = q ? 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity=".4"' : 'fill="' + color + '"';
        return '<path d="' + d + '" ' + paint + ' class="' + cls + '" style="--lm-delay:' + delay + 'ms"></path>';
      }
      return SVG_OPEN +
        ring('M80 30 A230 230 0 0 1 310 260 L270 260 A190 190 0 0 0 80 70 Z', C.sky, 450) +
        ring('M80 80 A180 180 0 0 1 260 260 L220 260 A140 140 0 0 0 80 120 Z', C.mint, 450) +
        ring('M80 130 A130 130 0 0 1 210 260 L170 260 A90 90 0 0 0 80 170 Z', C.yellow, 300) +
        ring('M80 180 A80 80 0 0 1 160 260 L120 260 A40 40 0 0 0 80 220 Z', C.coral, 150) +
        '<path d="M80 230 A30 30 0 0 1 110 260 L80 260 Z" fill="currentColor" class="lm-fade"></path></svg>';
    },
    layers: function (q) {
      if (q) {
        function disc(cx, delay) {
          return '<circle cx="' + cx + '" cy="142" r="42" fill="currentColor" fill-opacity=".24" stroke="currentColor" stroke-opacity=".56" stroke-width="1.5" class="lm-unfold" style="--lm-dx:' + (300 - cx) + 'px;--lm-delay:' + delay + 'ms"></circle>';
        }
        return SVG_OPEN + disc(300, 0) + disc(250.5, 150) + disc(349.5, 150) + disc(201, 300) + disc(399, 300) + disc(151.5, 450) + disc(448.5, 450) + disc(102, 450) + disc(498, 450) + '</svg>';
      }
      function top(x, color, delay) { return '<rect x="' + x + '" y="100" width="120" height="20" fill="' + color + '" class="lm-growx" style="--lm-delay:' + delay + 'ms"></rect>'; }
      function inner(x, color) { return '<rect x="' + x + '" y="148" width="108" height="36" fill="' + color + '"></rect>'; }
      return SVG_OPEN +
        '<rect x="60" y="120" width="480" height="64" fill="currentColor" class="lm-growx" style="--lm-dur:920ms;--lm-ease:var(--motion-ease-settle,cubic-bezier(.2,.9,.25,1.08))"></rect>' +
        top(60, C.coral, 300) + top(180, C.yellow, 450) + top(300, C.mint, 600) + top(420, C.sky, 750) +
        '<g fill-opacity=".56" class="lm-settle">' + inner(84, C.coral) + inner(192, C.yellow) + inner(300, C.mint) + inner(408, C.sky) + '</g></svg>';
    },
    cultivate: function (q) {
      if (q) {
        function sprout(x, hgt, delay, last) {
          return '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" stroke-opacity="' + (last ? 1 : 0.56) + '">' +
            '<path d="M' + x + ' 200 V' + (200 - hgt) + '" class="lm-growy" style="--lm-delay:' + delay + 'ms"></path>' +
            '<path d="M' + x + ' ' + (200 - hgt) + ' L' + (x - 10) + ' ' + (182 - hgt) + ' M' + x + ' ' + (200 - hgt) + ' L' + (x + 10) + ' ' + (182 - hgt) + '" stroke-dasharray="90" class="lm-draw" style="--lm-delay:' + (delay + 240) + 'ms"></path></g>';
        }
        return SVG_OPEN +
          '<rect x="120" y="199" width="360" height="2" fill="currentColor" class="lm-growx-c"></rect>' +
          sprout(180, 28, 300) + sprout(240, 40, 450) + sprout(300, 52, 600) + sprout(360, 64, 750) + sprout(420, 76, 750, true) + '</svg>';
      }
      var w = 16, op = 0, ink = 'currentColor';
      var shoot = function (d) { return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="90" class="lm-draw" style="--lm-delay:1200ms"></path>'; };
      var roots = [
        ['M200 150 A100 100 0 0 0 229.29 220.71', C.coral, 600],
        ['M229.29 220.71 A100 100 0 0 0 300 250', C.yellow, 750],
        ['M300 250 A100 100 0 0 0 370.71 220.71', C.mint, 900],
        ['M370.71 220.71 A100 100 0 0 0 400 150', C.sky, 1050]
      ].map(function (s) { return stroke(s[0], q ? ink : s[1], w, 'lm-draw', s[2], op); }).join('');
      return SVG_OPEN +
        '<rect x="120" y="149" width="360" height="2" fill="currentColor" class="lm-growx-c"></rect>' +
        '<circle cx="300" cy="140" r="9" fill="currentColor" class="lm-drop"></circle>' +
        shoot('M300 131 L288 106') + shoot('M300 131 L312 106') + roots + '</svg>';
    },
    /* logo assembly — owner-approved exception to "the official logo never animates":
       the mark's PARTS assemble once; the official artwork file itself is never animated,
       and the assembled state never replaces the official logo in nav, favicon or OG images. */
    logo: function (q) {
      /* Normalized final silhouette aligned to the owner-supplied official lockup:
         centre (300,143) · outer ring r 99–128 · band r 71–99 at .8 over the pin · head r 71 · body = r 99 disc to 27°
         below the baseline, then a fitted cubic to the tip (300,286) · priority wedge = sector 0°–45° r 71. */
      var pin = 'M201 143 A99 99 0 0 1 399 143 A99 99 0 0 1 388.21 187.95 C367.78 228.04 328.12 265.17 300 286 C271.88 265.17 232.22 228.04 211.79 187.95 A99 99 0 0 1 201 143 Z';
      var wedge = 'M300 143 L371 143 A71 71 0 0 0 350.2 92.8 Z';
      if (q) {
        var line = function (d, cls, delay, dash) { return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="' + dash + '" class="' + cls + '" style="--lm-delay:' + delay + 'ms"></path>'; };
        return SVG_OPEN +
          line(pin, 'lm-draw700', 0, 700) +
          line('M172 143 A128 128 0 0 1 428 143', 'lm-draw420', 300, 420) +
          line('M201 143 A99 99 0 0 1 399 143', 'lm-draw420', 450, 420) +
          line('M229 143 A71 71 0 0 1 371 143', 'lm-draw420', 600, 420) +
          line('M172 143 H428', 'lm-draw420', 750, 420) +
          line('M249.8 92.8 L209.49 52.49', 'lm-draw', 900, 90) +
          line('M300 72 V15', 'lm-draw', 900, 90) +
          line('M300 143 L390.51 52.49', 'lm-draw420', 900, 420) +
          '<path d="' + wedge + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="420" class="lm-draw420" style="--lm-delay:1200ms"></path></svg>';
      }
      /* The owner-supplied seam fix extends the inner band one unit beneath the outer ring. Each later
         colour begins .25deg early, and the wedge extends
         .6 units over the inner band. Those controlled overlaps prevent anti-alias seams or missing
         slivers while preserving the same assembled silhouette. Only this full variant is patched. */
      var point = function (r, a) {
        var t = a * Math.PI / 180;
        return (300 + r * Math.cos(t)).toFixed(2) + ' ' + (143 - r * Math.sin(t)).toFixed(2);
      };
      var segment = function (r, a1, a2, paint, dash, delay) {
        return '<path d="M' + point(r, a1) + ' A' + r + ' ' + r + ' 0 0 1 ' + point(r, a2) + '" fill="none" stroke-width="29" stroke-dasharray="' + dash + '" class="lm-drawv" style="' + paint + ';--lm-dash:' + dash + ';--lm-delay:' + delay + 'ms"></path>';
      };
      var colors = [C.coral, C.yellow, C.mint, C.sky];
      var output = '<path d="' + pin + '" fill="currentColor" class="lm-drop"></path>';
      var i;
      for (i = 0; i < 4; i++) output += segment(85.5, 180 - 45 * i + (i ? .25 : 0), 135 - 45 * i, 'stroke:color-mix(in srgb, ' + colors[i] + ' 80%, currentColor)', 69, 450 + 150 * i);
      for (i = 0; i < 4; i++) output += segment(113.5, 180 - 45 * i + (i ? .25 : 0), 135 - 45 * i, 'stroke:' + colors[i], 91, 300 + 150 * i);
      output += '<path d="M300 143 L371.6 143 A71.6 71.6 0 0 0 350.63 92.37 Z" fill="var(--lm-wedge, #3F93D1)" class="lm-step-in" style="--lm-delay:1200ms"></path>';
      return SVG_OPEN + output + '</svg>';
    }
  };

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = null;
  function observer() {
    if (io || !('IntersectionObserver' in window)) return io;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.play();
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -12% 0px' });
    return io;
  }

  class LmMotif extends HTMLElement {
    static get observedAttributes() { return ['kind', 'quiet', 'run']; }
    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');
      this.render();
      if (reduced || this.getAttribute('autoplay') === 'false') return;
      var o = observer();
      if (o) o.observe(this);
    }
    disconnectedCallback() { if (io) io.unobserve(this); }
    attributeChangedCallback(name, oldValue, newValue) {
      if (!this.isConnected || oldValue === newValue) return;
      if (name === 'run') { this.play(); return; }
      this.render();
    }
    render() {
      var kind = this.getAttribute('kind');
      var fn = build[kind] || build.dial;
      this.innerHTML = fn(this.hasAttribute('quiet'));
    }
    play() {
      if (reduced) return;
      this.removeAttribute('data-play');
      void this.offsetWidth; // restart CSS animations
      this.setAttribute('data-play', '');
    }
  }
  window.customElements.define('lm-motif', LmMotif);
  window.LandometerMotifs = { svg: function (kind, quiet) { return (build[kind] || build.dial)(!!quiet); }, kinds: Object.keys(build) };
})();
