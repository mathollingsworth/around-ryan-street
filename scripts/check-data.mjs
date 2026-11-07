// Validates src/data/projects.json before a build. Run: npm run check-data
import fs from 'node:fs';
const D = JSON.parse(fs.readFileSync(new URL('../src/data/projects.json', import.meta.url)));
const ids = new Set(D.projects.map((p) => p.id));
const errs = [];
for (const p of D.projects) {
  for (const k of ['id', 'cat', 'name', 'status', 'what', 'when']) if (!p[k]) errs.push(`${p.id}: missing ${k}`);
  if (!p.url && !p.link) errs.push(`${p.id}: needs url or link`);
  if (p.image_src && !/^https:\/\//.test(p.image_src)) errs.push(`${p.id}: image_src must be an https URL`);
  if (p.lat != null && (Math.abs(p.lat + 37.74) > 0.2 || Math.abs(p.lon - 144.96) > 0.2)) errs.push(`${p.id}: lat/lon looks outside Merri-bek`);
}
for (const e of D.events || []) if (e.ref && !ids.has(e.ref)) errs.push(`event ${e.title}: unknown ref ${e.ref}`);
for (const i of D.whats_new?.items || []) if (i.ref && !ids.has(i.ref)) errs.push(`whats_new item: unknown ref ${i.ref}`);
for (const id of D.whats_new?.ids || []) if (!ids.has(id)) errs.push(`whats_new ids: unknown ${id}`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`ok: ${D.projects.length} projects, ${(D.events || []).length} events`);
