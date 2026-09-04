import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = "governance/SHA256SUMS.txt";

function walk(relativeDirectory = "") {
  const absoluteDirectory = path.join(root, relativeDirectory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (relative === ".git" || relative.startsWith(".git/")) return [];
    if (relative === output) return [];
    if (entry.isSymbolicLink()) throw new Error(`Refusing to checksum symlink: ${relative}`);
    if (entry.isDirectory()) return walk(relative);
    if (!entry.isFile()) throw new Error(`Unsupported filesystem entry: ${relative}`);
    return [relative];
  });
}

const files = walk().sort();
const lines = files.map((relative) => {
  const bytes = fs.readFileSync(path.join(root, relative));
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  return `${digest}  ${relative}`;
});

fs.writeFileSync(path.join(root, output), `${lines.join("\n")}\n`);
console.log(`Wrote ${output} with ${files.length} file hashes.`);
