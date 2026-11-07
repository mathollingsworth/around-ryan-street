// Live public transport disruptions near Ryan St, Coburg.
// Vercel serverless function: fetches Transport Victoria GTFS-Realtime service alerts
// (trams, Metro trains, buses), decodes the protobuf, keeps what affects Route 19,
// the Upfield line and local buses, and returns JSON. The API key stays server-side
// in the TRANSPORT_VIC_KEY environment variable. Responses are cached for 5 minutes.

const BASE = 'https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1';
const FEEDS = [
  { mode: 'tram', path: '/tram/service-alerts' },
  { mode: 'train', path: '/metro/service-alerts' },
  { mode: 'bus', path: '/bus/service-alerts' },
];
// Route ids look like aus:vic:vic-03-19: (tram 19), aus:vic:vic-02-UFD: (Upfield line), aus:vic:vic-04-510: (bus 510)
const LOCAL_ROUTES = /vic-03-19:|vic-02-UFD|vic-04-(503|504|506|508|509|510|512|513|526|527|530|531|532|534|536|537|538|903):/i;
const LOCAL_TEXT = /Route 19\b|Sydney R(oa)?d|Coburg|Brunswick|Upfield|Moreland|Anstey|Jewell|Batman|Merlynston|Gowrie|Fawkner|Bell St/i;

function readVarint(buf, pos) {
  let result = 0, shift = 0, b;
  do { b = buf[pos++]; result += (b & 0x7f) * Math.pow(2, shift); shift += 7; } while (b & 0x80);
  return [result, pos];
}
function parse(buf) {
  const out = {}; let pos = 0;
  while (pos < buf.length) {
    let key; [key, pos] = readVarint(buf, pos);
    const field = Math.floor(key / 8), wt = key & 7; let val;
    if (wt === 0) [val, pos] = readVarint(buf, pos);
    else if (wt === 2) { let len; [len, pos] = readVarint(buf, pos); val = buf.subarray(pos, pos + len); pos += len; }
    else if (wt === 1) { val = buf.subarray(pos, pos + 8); pos += 8; }
    else if (wt === 5) { val = buf.subarray(pos, pos + 4); pos += 4; }
    else break;
    (out[field] = out[field] || []).push(val);
  }
  return out;
}
const str = (b) => Buffer.from(b).toString('utf8');
function translated(b) {
  if (!b) return '';
  const tr = (parse(b)[1] || []).map((x) => { const p = parse(x); return { text: p[1] ? str(p[1][0]) : '', lang: p[2] ? str(p[2][0]) : '' }; });
  const en = tr.find((x) => !x.lang || x.lang.startsWith('en')) || tr[0];
  return en ? en.text : '';
}
const EFFECT = { 1: 'No service', 2: 'Reduced service', 3: 'Significant delays', 4: 'Detour', 5: 'Additional service', 6: 'Modified service', 7: 'Other', 8: 'Unknown', 9: 'Stop moved' };
const iso = (s) => (s ? new Date(s * 1000).toISOString() : null);

function decode(buf, mode) {
  const feed = parse(buf); const alerts = [];
  for (const e of feed[2] || []) {
    const ent = parse(e); if (!ent[5]) continue;
    const a = parse(ent[5][0]);
    const periods = (a[1] || []).map((p) => { const t = parse(p); return { start: iso(t[1] && t[1][0]), end: iso(t[2] && t[2][0]) }; });
    const routes = [...new Set((a[5] || []).map((x) => { const s = parse(x); return s[2] ? str(s[2][0]) : null; }).filter(Boolean))];
    alerts.push({
      mode, id: ent[1] ? str(ent[1][0]) : '',
      header: translated(a[10] && a[10][0]), description: translated(a[11] && a[11][0]), url: translated(a[8] && a[8][0]),
      effect: EFFECT[a[7] && a[7][0]] || null, periods, routes,
    });
  }
  return alerts;
}
const routeLabel = (r) => {
  const m = r.match(/vic-0(\d)-([A-Z0-9-]+):/i); if (!m) return r;
  if (m[1] === '3') return `Route ${m[2]}`;
  if (m[1] === '4') return `Bus ${m[2]}`;
  if (/^UFD/i.test(m[2])) return 'Upfield line';
  return `${m[2]} line`;
};

export default async function handler(req, res) {
  const key = process.env.TRANSPORT_VIC_KEY;
  if (!key) { res.status(503).json({ error: 'TRANSPORT_VIC_KEY is not set' }); return; }
  const now = Date.now();
  const status = {}; const all = [];
  await Promise.all(FEEDS.map(async (f) => {
    try {
      const r = await fetch(BASE + f.path, { headers: { KeyID: key, Accept: 'application/x-protobuf' } });
      status[f.mode] = r.status;
      if (!r.ok) return;
      all.push(...decode(Buffer.from(await r.arrayBuffer()), f.mode));
    } catch (e) { status[f.mode] = 'error'; }
  }));
  const local = all
    .filter((a) => a.routes.some((r) => LOCAL_ROUTES.test(r)) || LOCAL_TEXT.test(a.header + ' ' + a.description))
    .map((a) => {
      const ends = a.periods.map((p) => p.end && Date.parse(p.end)).filter(Boolean);
      const starts = a.periods.map((p) => p.start && Date.parse(p.start)).filter(Boolean);
      const active = a.periods.length === 0 || a.periods.some((p) => (!p.start || Date.parse(p.start) <= now) && (!p.end || Date.parse(p.end) >= now));
      return { ...a, lines: [...new Set(a.routes.filter((r) => LOCAL_ROUTES.test(r)).map(routeLabel))], active,
        starts: starts.length ? new Date(Math.min(...starts)).toISOString() : null, ends: ends.length ? new Date(Math.max(...ends)).toISOString() : null };
    })
    .filter((a) => !a.ends || Date.parse(a.ends) >= now)
    .sort((x, y) => (y.active - x.active) || ((x.starts || '').localeCompare(y.starts || '')));
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).json({ fetched_at: new Date().toISOString(), feeds: status, total_network_alerts: all.length, alerts: local });
}
