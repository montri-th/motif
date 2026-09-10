import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let checks = 0;
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
const read = relative => fs.readFileSync(path.join(root, relative));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const exists = relative => fs.existsSync(path.join(root, relative));
const record = JSON.parse(read('governance/integration-source-record.json'));
function verifyFile(entry, context) {
  check(exists(entry.path), `${context}: missing ${entry.path}`);
  if (!exists(entry.path)) return;
  const bytes = read(entry.path);
  check(bytes.length === entry.bytes, `${context}: byte count changed ${entry.path}`);
  check(hash(bytes) === entry.sha256, `${context}: SHA-256 changed ${entry.path}`);
}
for (const entry of record.baseline.files) verifyFile(entry, 'Immutable baseline');
for (const entry of record.attachment.files) verifyFile(entry, 'Exact attachment import');
check(record.baseline.files.length >= 46, 'Baseline inventory is unexpectedly incomplete');
check(record.attachment.files.filter(item => item.role === 'supplied_identity_rendition').length === 12, 'Expected twelve supplied identity renditions');
for (const item of record.exclusions) check(!exists(item.path), `Excluded working/unregistered asset entered production: ${item.path}`);

if (exists('assets/citychat/asset-register.json')) {
  const register = JSON.parse(read('assets/citychat/asset-register.json'));
  for (const item of record.attachment.files.filter(item => item.sourceRegisterSha256)) {
    const relative = item.path.replace(/^assets\/citychat\//, '');
    const registered = register.files.find(entry => entry.file === relative);
    check(registered?.sha256 === item.sha256, `CityChat source register disagrees: ${item.path}`);
  }
}

// Python's HTML parser avoids treating escaped snippets or script strings as DOM tags.
const parseHtml = String.raw`
import sys,json
from html.parser import HTMLParser
class Parser(HTMLParser):
 def __init__(self): super().__init__(convert_charrefs=True); self.tags=[]
 def handle_starttag(self,tag,attrs): self.tags.append({'tag':tag,'attrs':dict(attrs)})
 def handle_startendtag(self,tag,attrs): self.handle_starttag(tag,attrs)
p=Parser();p.feed(sys.stdin.read());print(json.dumps(p.tags))
`;
const pages = new Map();
for (const route of ['index.html', 'en/index.html']) {
  check(exists(route), `Missing locale route ${route}`);
  if (!exists(route)) continue;
  const html = read(route).toString('utf8');
  const parsed = spawnSync(process.env.PYTHON || 'python3', ['-c', parseHtml], { input: html, encoding: 'utf8' });
  if (parsed.status !== 0) throw new Error(`HTML parser failed: ${parsed.stderr}`);
  const tags = JSON.parse(parsed.stdout);
  const ids = tags.map(item => item.attrs.id).filter(Boolean);
  check(ids.length === new Set(ids).size, `${route}: duplicate IDs ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);
  const cards = tags.filter(item => /(?:^|\s)asset-card(?:\s|$)/.test(item.attrs.class || '') && item.attrs['data-brand']);
  check(cards.length === 15, `${route}: expected 15 searchable asset cards, got ${cards.length}`);
  check(!/__bundler\/|DCLogic|component-from-global-scope|sc-camel-|\{\{\s*[\w.]+\s*\}\}/.test(html), `${route}: unresolved export-wrapper markup`);
  const motionButtons = tags.filter(item => Object.hasOwn(item.attrs, 'data-motion-toggle'));
  check(motionButtons.length === 1, `${route}: expected one page-level motion control`);
  pages.set(route, { tags, ids: new Set(ids) });
}
for (const [route, page] of pages) {
  for (const item of page.tags) for (const attr of ['href', 'src', 'poster']) {
    const target = item.attrs[attr];
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
    const [resource, fragment] = target.split('#');
    const pathname = decodeURIComponent(resource.split('?')[0]);
    let local;
    if (!pathname) local = route;
    else if (pathname.startsWith('/motif/')) local = pathname.slice('/motif/'.length);
    else if (pathname.startsWith('/')) local = pathname.slice(1);
    else local = path.posix.join(path.posix.dirname(route), pathname);
    local = path.posix.normalize(local || '.');
    if (local === '.' || local.endsWith('/') || (exists(local) && fs.statSync(path.join(root, local)).isDirectory())) local = path.posix.join(local, 'index.html');
    check(!local.startsWith('../'), `${route}: local target escapes website ${target}`);
    check(exists(local), `${route}: missing local ${attr} target ${target} (${local})`);
    if (fragment && pages.has(local)) check(pages.get(local).ids.has(decodeURIComponent(fragment)), `${route}: missing fragment ${target}`);
  }
}

if (exists('assets/motif-studio-library.json')) {
  const manifest = JSON.parse(read('assets/motif-studio-library.json'));
  check(manifest.webExperienceRelease === '1.3.0', 'Supplemental manifest version mismatch');
  check(manifest.baselineManifest.path === 'assets/motif-library.json', 'Supplemental manifest must reference immutable baseline');
  check(manifest.baselineManifest.sha256 === hash(read('assets/motif-library.json')), 'Supplemental baseline manifest hash mismatch');
  const names = manifest.files.map(item => item.path);
  check(new Set(names).size === names.length, 'Supplemental file manifest contains duplicates');
  for (const entry of manifest.files) verifyFile(entry, 'Supplemental release inventory');
} else check(false, 'Build the integration kit to generate assets/motif-studio-library.json');
check(exists('assets/downloads/motif-studio-v1.3.0.zip'), 'Merged v1.3.0 download kit is missing');
if (exists('assets/downloads/motif-studio-v1.3.0.zip') && exists('assets/motif-studio-library.json')) {
  const verifyZip = String.raw`
import sys,json,pathlib,zipfile,hashlib
root=pathlib.Path(sys.argv[1]);manifest=json.loads((root/'assets/motif-studio-library.json').read_text())
paths=[item['path'] for item in manifest['files']]+['assets/motif-studio-library.json']
expected=sorted(paths+['PACKAGE-SHA256SUMS.txt']);errors=[]
with zipfile.ZipFile(root/'assets/downloads/motif-studio-v1.3.0.zip') as z:
 if sorted(z.namelist())!=expected: errors.append('ZIP file inventory differs from supplemental manifest')
 for name in paths:
  if name not in z.namelist() or z.read(name)!=(root/name).read_bytes(): errors.append('ZIP source bytes differ: '+name)
 sums=''.join(hashlib.sha256((root/name).read_bytes()).hexdigest()+'  '+name+'\n' for name in sorted(paths))
 if 'PACKAGE-SHA256SUMS.txt' not in z.namelist() or z.read('PACKAGE-SHA256SUMS.txt').decode()!=sums: errors.append('ZIP internal checksum inventory differs')
print(json.dumps(errors))
`;
  const result = spawnSync(process.env.PYTHON || 'python3', ['-c', verifyZip, root], { encoding: 'utf8' });
  check(result.status === 0, `Package verification failed: ${result.stderr}`);
  if (result.status === 0) for (const error of JSON.parse(result.stdout)) check(false, error);
}
if (failures.length) {
  console.error(`${failures.length} failure(s) in ${checks} integration checks:\n${failures.map(item => `- ${item}`).join('\n')}`);
  process.exitCode = 1;
} else console.log(`Passed ${checks} integration checks; original asset bytes, supplied imports, both routes and supplemental inventory are intact.`);
