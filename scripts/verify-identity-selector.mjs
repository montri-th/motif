// Targeted UI state regression. Run against a locally served checkout:
// MOTIF_IDENTITY_BASE_URL=http://127.0.0.1:8784 node scripts/verify-identity-selector.mjs
// Uses the same optional Playwright dependency as scripts/browser-qa.mjs.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '..');
const origin = process.env.MOTIF_IDENTITY_BASE_URL;
assert(origin, 'Set MOTIF_IDENTITY_BASE_URL to the locally served checkout');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname), 'Regression runner only targets localhost');
const source = JSON.parse(fs.readFileSync(path.join(root, 'governance/integration-source-record.json')));
const files = source.attachment.files.filter(item => item.role === 'supplied_identity_rendition');
assert.equal(files.length, 12);
for (const file of files) {
  const bytes = fs.readFileSync(path.join(root, file.path));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}

// Expected placement behavior is asset-specific, not a universal logo contrast limit.
// Owner clarification: original color files may display on Dark; retain the known
// Brand Blue rejection. A sampled contrast-lab floor does not override that decision.
const accepted = {
  'landometer-symbol-color.png': ['canvas', 'dark.canvas', 'brand.beige'],
  'landometer-symbol-white.png': ['brand.blue', 'dark.canvas'],
  'landometer-symbol-cream.png': ['brand.blue', 'dark.canvas'],
  'landometer-symbol-gray.png': ['canvas', 'dark.canvas', 'brand.beige'],
  'landometer-symbol-mono.png': ['brand.blue', 'dark.canvas'],
  'landometer-symbol-outline-white.png': [],
  'landometer-symbol-outline-cream.png': ['brand.blue', 'dark.canvas'],
  'landometer-symbol-white-square.png': [],
  'landometer-symbol-192.png': ['canvas', 'dark.canvas', 'brand.beige'],
  'landometer-lockup-banner.png': ['canvas', 'dark.canvas', 'brand.beige'],
  'landometer-lockup-color.png': ['canvas', 'dark.canvas', 'brand.beige'],
  'Landometer-Logo-TransparentBG.png': ['canvas', 'dark.canvas', 'brand.beige'],
};
assert.deepEqual(Object.keys(accepted).sort(), files.map(item => path.basename(item.path)).sort());
// Initial/no-JavaScript guidance must match the enhanced selector's current policy.
const identityRuntime = fs.readFileSync(path.join(root, 'contrast-lab.js'), 'utf8');
const colorCopy = identityRuntime.match(/color: en \? ("[^"\n]+") : ("[^"\n]+"),/);
assert(colorCopy, 'Both identity color-guidance strings exist');
for (const [route, text] of [['index.html', JSON.parse(colorCopy[2])], ['en/index.html', JSON.parse(colorCopy[1])]]) {
  const html = fs.readFileSync(path.join(root, route), 'utf8');
  assert.equal(html.match(/data-id-guidance>([^<]+)<\/p>/)?.[1], text, `${route}: initial/enhanced guidance parity`);
  assert(text.includes('Dark'), `${route}: original color files remain available on Dark`);
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
let pairChecks = 0;
try {
  for (const locale of ['th', 'en']) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin.replace(/\/$/, '')}/${locale === 'en' ? 'en/' : ''}#identity`);
    const area = page.locator('[data-identity-selector]');
    const select = area.locator('[data-id-file]');
    await select.waitFor({ state: 'visible' });
    assert.equal(await select.locator('option').count(), 12);
    for (const [file, safe] of Object.entries(accepted)) {
      await select.selectOption(file);
      const surfaces = ['canvas', 'brand.blue', 'dark.canvas', 'brand.beige'];
      for (const surface of surfaces) {
        const context = `${locale}: ${file} on ${surface}`;
        await area.locator(`[data-id-bg="${surface}"]`).click();
        assert.equal(await select.inputValue(), file, `${context}: no silent asset substitution`);
        assert.equal(await area.locator(`[data-id-bg="${surface}"]`).getAttribute('aria-pressed'), 'true');
        const allowed = safe.includes(surface);
        assert.equal(await area.getAttribute('data-id-state'), allowed ? 'preview' : 'rejected', context);
        assert.equal(await area.locator('[data-id-image]').isVisible(), allowed, context);
        assert.equal(await area.locator('[data-id-rejection]').isVisible(), !allowed, context);
        assert.equal(await area.locator('[data-id-download]').isVisible(), allowed, context);
        assert.equal(await area.locator('[data-id-match]').isVisible(), !allowed && safe.length > 0, `${context}: recovery only for rejected pairing`);
        const href = await area.locator('[data-id-download]').getAttribute('href');
        assert.equal(href?.endsWith(`/assets/identity/logo/${file}`) ?? false, allowed, context);
        const guidance = await area.locator('[data-id-guidance]').textContent();
        assert(guidance?.length > 25, `${context}: explanation must be present`);
        if (!allowed) assert(guidance.startsWith(locale === 'en' ? 'Pairing rejected.' : 'ใช้คู่นี้ไม่ได้'), context);
        assert((await area.locator('[data-id-status]').textContent()).includes(guidance), `${context}: announced explanation`);
        pairChecks++;
      }
      if (safe.length) {
        const rejectedSurface = surfaces.find(surface => !safe.includes(surface));
        assert(rejectedSurface, `${locale}: rejection fixture exists for ${file}`);
        await area.locator(`[data-id-bg="${rejectedSurface}"]`).click();
        await area.locator('[data-id-match]').click();
        assert.equal(await select.inputValue(), file, `${locale}: recovery retains ${file}`);
        assert.equal(await area.getAttribute('data-id-state'), 'preview', `${locale}: safe recovery ${file}`);
        assert.equal(await area.locator('[data-id-download]').getAttribute('download'), file);
        assert.equal(await area.locator('[data-id-match]').isVisible(), false, `${locale}: no switch-away prompt after recovery ${file}`);
      } else {
        assert.equal(await area.locator('[data-id-match]').isVisible(), false, `${locale}: no invented carrier for ${file}`);
      }
    }
    // Negative experiments remain available in the separate, explicitly sampled contrast lab.
    await page.locator('[data-cl-asset]').selectOption('id.white');
    await page.locator('[data-cl-carrier]').selectOption('surface.canvas');
    assert.equal(await page.locator('[data-cl-image]').isVisible(), true);
    assert.equal(await page.locator('[data-cl-verdict]').getAttribute('data-state'), 'low');
    assert.equal(await area.locator('.cl-download-all a[download]').count(), 12, `${locale}: original references remain available`);
    assert.deepEqual(errors, [], `${locale}: no runtime errors`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`PASS: ${pairChecks} identity asset/surface states across TH/EN, safe recovery, rejected download guards, original 12 PNG hashes and separate contrast-lab behavior. Visual review is separate.`);
