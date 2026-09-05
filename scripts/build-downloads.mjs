import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");
const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "assets/downloads");
const fixedDate = new Date("2026-09-05T00:00:00.000Z");
const checksumPath = "governance/SHA256SUMS.txt";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = path.posix.join(relativeDirectory, entry.name);
      return entry.isDirectory() ? walk(relative) : [relative];
    })
    .sort();
}

const common = [
  "CLAUDE.md",
  "LICENSE.md",
  "assets/motif-library.json",
  "docs/ai-sync.md",
  "docs/usage-guide.md",
  "governance/logo-full-geometry-decision.json",
  "governance/logo-preview-final-settle-decision.json",
  "governance/owner-approval.json",
  "governance/showcase-motion-decision.json",
  "governance/source-ledger.json",
];
const landometer = walk("assets/landometer");
const ijji = walk("assets/ijji");
const kits = [
  { name: "landometer-motifs-v1.zip", files: [...common, ...landometer] },
  { name: "ijji-motifs-selected-r3.zip", files: [...common, ...ijji] },
  { name: "motif-library-v1.zip", files: ["README.md", ...common, ...landometer, ...ijji] },
];

function packageChecksums(files) {
  return `${files.map((relative) => `${sha256(fs.readFileSync(path.join(root, relative)))}  ${relative}`).join("\n")}\n`;
}

async function assemble(files) {
  const zip = new JSZip();
  for (const relative of [...new Set(files)].sort()) {
    zip.file(relative, fs.readFileSync(path.join(root, relative)), {
      date: fixedDate,
      createFolders: false,
      unixPermissions: 0o100644,
    });
  }
  zip.file(checksumPath, packageChecksums(files), {
    date: fixedDate,
    createFolders: false,
    unixPermissions: 0o100644,
  });
  zip.comment = "Landometer Motif Library · owner-approved artifact overlay · 2026-09-05";
  return zip.generateAsync({
    type: "nodebuffer",
    platform: "UNIX",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    streamFiles: true,
  });
}

fs.mkdirSync(outputDir, { recursive: true });
for (const kit of kits) {
  const files = [...new Set(kit.files)].sort();
  if (files.some((file) => file.includes("exploration"))) throw new Error(`${kit.name}: exploration path leaked into kit`);
  const first = await assemble(files);
  const second = await assemble(files);
  if (!first.equals(second)) throw new Error(`${kit.name}: repeated builds are not byte-identical`);

  const parsed = await JSZip.loadAsync(first);
  const archivedFiles = Object.keys(parsed.files).filter((name) => !parsed.files[name].dir).sort();
  const expectedFiles = [...files, checksumPath].sort();
  if (JSON.stringify(archivedFiles) !== JSON.stringify(expectedFiles)) throw new Error(`${kit.name}: archived file list mismatch`);
  for (const relative of files) {
    const archived = await parsed.file(relative).async("nodebuffer");
    const source = fs.readFileSync(path.join(root, relative));
    if (!archived.equals(source)) throw new Error(`${kit.name}: byte mismatch for ${relative}`);
  }

  const checksumText = await parsed.file(checksumPath).async("string");
  if (checksumText !== packageChecksums(files)) throw new Error(`${kit.name}: internal checksum manifest mismatch`);
  for (const line of checksumText.trimEnd().split("\n")) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`${kit.name}: malformed checksum line`);
    const archived = await parsed.file(match[2])?.async("nodebuffer");
    if (!archived || sha256(archived) !== match[1]) throw new Error(`${kit.name}: internal checksum failed for ${match[2]}`);
  }

  for (const readmePath of archivedFiles.filter((relative) => relative.endsWith("README.md"))) {
    const markdown = await parsed.file(readmePath).async("string");
    for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split(/[?#]/)[0];
      if (!target || /^(?:[a-z]+:|#)/i.test(target)) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(readmePath), target));
      if (!archivedFiles.includes(resolved)) throw new Error(`${kit.name}: ${readmePath} has unresolved link ${match[1]}`);
    }
  }

  const output = path.join(outputDir, kit.name);
  fs.writeFileSync(output, first);
  console.log(`${kit.name}: ${expectedFiles.length} files, ${first.length} bytes, sha256 ${sha256(first)}`);
}
