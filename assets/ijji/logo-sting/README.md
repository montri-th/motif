# ijji animated logo · round 3

Exact owner-supplied runtime and source layers selected from `ijji animated logo.zip`.

## Full + tagline

```html
<script src="https://montri-th.github.io/motif/assets/ijji/logo-sting/ijji-logo-sting.js?v=1.2.1" defer></script>

<ijji-logo-sting
  surface="brand-blue"
  bounce="playful"
  assets="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/"
  style="width:min(100%,560px)">
  <img src="https://montri-th.github.io/motif/assets/ijji/logo-sting/layers/ijji-logo-still.png"
       alt="ijji — Your business buddy around the corner">
</ijji-logo-sting>
```

Duration: 9 seconds. Minimum delivered width: 320 px.

## Mark only

Add `notagline` and use `ijji-mark-still.png` as the fallback. Duration: 6.4 seconds. Minimum delivered width: 160 px. The mark is transparent, so place it on Brand Blue `#1D4497` or Dark `#11191D`.

The portable component plays once when visible, then holds the complete final state. It also exposes `play()`, `pause()`, `seek(seconds)`, `finish()`, and `replay()` for controlled previews. The release-1.2.1 library webpage has a separate owner-approved orchestration layer that auto-replays the full logo inline and both variants in Preview.

Runtime SHA-256: `1a1d1bc247b5deb92aa19e4d84524ac1f823454a9401b6ce53acf8716010433e`.
