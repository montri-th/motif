import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "assets/social");
const source = pathToFileURL(path.join(root, "scripts/social-card.html")).href;

fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(source, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDir, "motif-library-1200x630.png"), type: "png" });
await browser.close();
console.log("Rendered assets/social/motif-library-1200x630.png");
