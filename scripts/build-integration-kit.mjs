import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supplementalPath = 'assets/motif-studio-library.json';
const outputPath = 'assets/downloads/motif-studio-v1.3.2.zip';
const historicalZip = 'assets/downloads/motif-studio-v1.3.1.zip';
const earlierZip = 'assets/downloads/motif-studio-v1.3.0.zip';
const sourceRecordPath = 'governance/integration-source-record.json';
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const read = relative => fs.readFileSync(path.join(root, relative));
const source = JSON.parse(read(sourceRecordPath));
const baseline = new Map(source.baseline.files.map(item => [item.path, item]));
const imported = new Map(source.attachment.files.map(item => [item.path, item]));
const skip = new Set([supplementalPath, outputPath, historicalZip, earlierZip, '.git', '.DS_Store']);
function walk(relative = '') {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const name = path.posix.join(relative, entry.name);
    if (skip.has(name) || entry.name === '.DS_Store' || name.startsWith('.git/')) return [];
    if (entry.isSymbolicLink()) throw new Error(`Cannot package symlink: ${name}`);
    if (entry.isDirectory()) return walk(name);
    return entry.isFile() ? [name] : [];
  });
}
// Fail before packaging if any canonical or imported source bytes have drifted.
for (const item of [...baseline.values(), ...imported.values()]) {
  const bytes = read(item.path);
  if (bytes.length !== item.bytes || sha(bytes) !== item.sha256) throw new Error(`Source-integrity mismatch: ${item.path}`);
}
for (const item of source.exclusions) if (fs.existsSync(path.join(root, item.path))) throw new Error(`Excluded source artifact in package: ${item.path}`);
const files = walk().sort();
const entries = files.map(relative => {
  const bytes = read(relative);
  const origin = imported.get(relative);
  return {
    path: relative,
    bytes: bytes.length,
    sha256: sha(bytes),
    role: origin?.role || (baseline.has(relative) ? 'immutable_legacy_asset' : relative.startsWith('downloads/') ? 'original_reference_archive' : relative.startsWith('governance/') ? 'integration_or_historical_evidence' : 'integrated_web_experience'),
    sourceStatus: origin?.status || (baseline.has(relative) ? 'unchanged_from_git_baseline' : relative.startsWith('downloads/') ? 'original_attachment_status_preserved' : 'current_user_requested_web_integration'),
    ...(origin ? { sourcePath: origin.sourcePath } : {}),
  };
});
const manifest = {
  schemaVersion: 'motif-studio-file-library/1.0',
  webExperienceRelease: '1.3.2',
  releaseDate: '2026-10-01',
  previousStudioRelease: { version: '1.3.1', path: historicalZip, sha256: sha(read(historicalZip)), status: 'historical_exact_bytes' },
  historicalStudioReleases: [{ version: '1.3.0', path: earlierZip, sha256: sha(read(earlierZip)), status: 'historical_exact_bytes' }],
  changeScope: 'Current LDS 0.9.7 guidance and restrained callout/selection presentation; motif, identity and motion assets are unchanged.',
  canonicalUrl: 'https://montri-th.github.io/motif/',
  status: 'current_user_requested_integration',
  instructionBoundary: 'Supplied documents remain reference evidence. This file does not issue new design-system approval, amend source asset permissions, or independently verify a supplied signature.',
  baselineManifest: { path: 'assets/motif-library.json', artifactRelease: '1.2.1', sha256: sha(read('assets/motif-library.json')), relationship: 'Immutable baseline asset records; the web experience has a separate version.' },
  sourceRecord: { path: sourceRecordPath, sha256: sha(read(sourceRecordPath)) },
  citychatSourceRegister: { path: 'assets/citychat/asset-register.json', sha256: sha(read('assets/citychat/asset-register.json')), status: 'Original candidate label preserved; see source record for integration basis and conflicting supplied claims.' },
  inventoryScope: 'Every packaged source file except this supplemental manifest, generated PACKAGE-SHA256SUMS.txt and the ZIP itself; the exact historical Studio 1.3.0 and 1.3.1 ZIPs are also excluded to avoid nesting distribution archives. Original source archives remain original and can contain superseded status text or working files.',
  files: entries,
};
fs.writeFileSync(path.join(root, supplementalPath), `${JSON.stringify(manifest, null, 2)}\n`);
const payload = { root, outputPath, paths: [...files, supplementalPath].sort() };
const python = String.raw`
import sys,json,io,zipfile,hashlib,pathlib
p=json.load(sys.stdin);root=pathlib.Path(p['root'])
data={name:(root/name).read_bytes() for name in p['paths']}
data['PACKAGE-SHA256SUMS.txt']=''.join(hashlib.sha256(data[name]).hexdigest()+'  '+name+'\n' for name in sorted(data)).encode()
def build():
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for name in sorted(data):
   info=zipfile.ZipInfo(name,date_time=(2026,10,1,0,0,0));info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED
   z.writestr(info,data[name],compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
 return out.getvalue()
first=build();second=build()
if first!=second: raise RuntimeError('Repeated deterministic package builds differ')
with zipfile.ZipFile(io.BytesIO(first)) as z:
 if sorted(z.namelist())!=sorted(data): raise RuntimeError('Archive inventory differs')
 for name in data:
  if z.read(name)!=data[name]: raise RuntimeError('Archive bytes differ: '+name)
out=root/p['outputPath'];out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(first)
print(json.dumps({'path':p['outputPath'],'files':len(data),'bytes':len(first),'sha256':hashlib.sha256(first).hexdigest(),'deterministicRebuild':'passed','archivedBytes':'verified'}))
`;
const result = spawnSync(process.env.PYTHON || 'python3', ['-c', python], { input: JSON.stringify(payload), encoding: 'utf8', maxBuffer: 1024 * 1024 });
if (result.status !== 0) throw new Error(`Package build failed: ${result.stderr}`);
console.log(result.stdout.trim());
