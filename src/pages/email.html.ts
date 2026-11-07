// The weekly email, rendered from projects.json in the Organic design.
// Built with the site, so https://<site>/email.html is always this week's email.
// Email-safe: tables, inline styles, no SVG, no flexbox, system font fallbacks.
import { data, projects, byId, events, whatsNew, updated, SHORT, resized, kmLabel, fmtDate, fmtShort, fmtDow, fmtMonth, pd } from '../lib/data';

const SITE = 'https://around-ryan-street.vercel.app';
const C = {
  bg: '#f5ead8', surface: '#ebddc5', text: '#201e1d', accent: '#c67139', a100: '#fff2eb', a700: '#8c491a', a800: '#643312',
  s100: '#f0fae1', s200: '#e1eecc', s700: '#56633f', s800: '#3d472b', s900: '#272e1b',
  n100: '#f9f4ed', n200: '#eee7db', n300: '#dcd3c4', n700: '#645c50', n800: '#474238', divider: '#d4c9b6',
};
const HEAD = `font-family:Caprasimo,Georgia,'Times New Roman',serif;font-weight:400;`;
const BODY = `font-family:Figtree,'Helvetica Neue',Helvetica,Arial,sans-serif;`;
const CATHEX: Record<string, string> = { dev: '#8c491a', street: '#d67f48', park: '#728157', sport: '#3d472b', civic: '#645c50', wide: '#a19786' };
const tint = (hex: string) => { const n = (i: number) => parseInt(hex.slice(i, i + 2), 16); const bg = [245, 234, 216];
  return '#' + [1, 3, 5].map((i, k) => Math.round(n(i) * 0.3 + bg[k] * 0.7).toString(16).padStart(2, '0')).join(''); };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const itemUrl = (id: string) => `${SITE}/item/${id}`;
const tag = (label: string, bg: string, fg: string, border = bg) =>
  `<span style="display:inline-block;${BODY}font-size:12px;font-weight:600;line-height:1;padding:5px 10px;border-radius:999px;background:${bg};color:${fg};border:1px solid ${border};white-space:nowrap">${esc(label)}</span>`;
const TAGS: Record<string, [string, string, string, string?]> = {
  closes: ['Closes', C.a100, C.a800], popup: ['Pop-up', C.s100, C.s800], event: ['Event', C.s100, C.s800],
  decision: ['Decision', C.n100, C.n800], household: ['At home', 'transparent', C.accent, C.accent], works: ['Works', C.n100, C.n800],
};
const section = (title: string, inner: string, link?: [string, string]) => `
  <tr><td style="padding:40px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="${HEAD}font-size:28px;line-height:1.15;color:${C.text}">${esc(title)}</td>
      ${link ? `<td align="right" style="${BODY}font-size:14px;font-weight:600;white-space:nowrap"><a href="${link[1]}" style="color:${C.a700};text-decoration:none">${esc(link[0])} &rarr;</a></td>` : ''}
    </tr></table>
    ${inner}
  </td></tr>`;

export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const plus = (n: number) => { const d = pd(today); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dayDiff = (a: string, b: string) => Math.round((pd(b).getTime() - pd(a).getTime()) / 864e5);

  // 1. Summary
  const summary = (whatsNew.summary || []).map((s: string, i: number) => {
    const k = s.indexOf(':'); const lead = k > 0 ? s.slice(0, k + 1) : ''; const rest = k > 0 ? s.slice(k + 1).trim() : s;
    return `<tr><td width="36" valign="top" style="padding:0 14px 16px 0"><div style="width:32px;height:32px;line-height:32px;border-radius:50%;background:${C.s200};color:${C.s900};text-align:center;${HEAD}font-size:16px">${i + 1}</div></td>
      <td valign="top" style="padding:4px 0 16px;${BODY}font-size:16px;line-height:1.5;color:${C.text}">${lead ? `<strong>${esc(lead)}</strong> ` : ''}${esc(rest)}</td></tr>`;
  }).join('');

  // 2. Have your say
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const closesBy: Record<string, string> = {};
  upcoming.filter((e) => e.kind === 'closes' && e.ref).forEach((e) => { if (!closesBy[e.ref!]) closesBy[e.ref!] = e.date; });
  const open = projects.filter((p) => p.open).sort((a, b) => (closesBy[a.id] || '9').localeCompare(closesBy[b.id] || '9'));
  const sayRows = open.map((p) => {
    const dt = closesBy[p.id]; const n = dt ? dayDiff(today, dt) : null; const urgent = n != null && n <= 7;
    const left = n == null ? 'Ongoing' : n <= 0 ? 'Today' : n === 1 ? '1 day' : `${n} days`;
    return `<tr><td width="84" valign="middle" style="padding:10px 12px 10px 0;border-top:1px solid ${C.divider}">
        <span style="display:inline-block;${BODY}font-size:13px;font-weight:700;padding:6px 10px;border-radius:999px;background:${urgent ? C.accent : C.n100};color:${urgent ? C.bg : C.text};white-space:nowrap">${left}</span></td>
      <td valign="middle" style="padding:10px 0;border-top:1px solid ${C.divider};${BODY}">
        <a href="${itemUrl(p.id)}" style="font-size:16px;font-weight:600;color:${C.text};text-decoration:none">${esc(p.name)}</a><br>
        <span style="font-size:14px;color:${C.n700}">Closes ${dt ? `${fmtDow(dt)} ${fmtShort(dt)}` : 'when the trial ends'}</span></td></tr>`;
  }).join('');
  const sayCard = open.length ? `
  <tr><td style="padding:32px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};border-radius:28px"><tr><td style="padding:24px 24px 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="${HEAD}font-size:24px;color:${C.text};padding-bottom:8px">Have your say</td>
        <td align="right" style="${BODY}font-size:14px;color:${C.n700};padding-bottom:8px">${open.length} open now</td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sayRows}</table>
    </td></tr></table>
  </td></tr>` : '';

  // 3. New near you (2 per row)
  const nearby = [...new Set(whatsNew.ids || [])].map((id) => byId[id]).filter(Boolean).sort((a, b) => (a.km ?? 99) - (b.km ?? 99)).slice(0, 6);
  const card = (p: any) => `<td width="50%" valign="top" style="padding:0 6px 12px">
      <a href="${itemUrl(p.id)}" style="text-decoration:none;color:${C.text};display:block;background:${C.n100};border-radius:24px;padding:8px">
        ${p.image_src ? `<img src="${resized(p.image_src, 560, 420)}" width="100%" alt="" style="display:block;width:100%;height:auto;border-radius:16px;border:0">` : `<div style="height:150px;border-radius:16px;background:${tint(CATHEX[p.cat] || '#a19786')}"></div>`}
        <div style="padding:10px 6px 6px;${BODY}">
          <div style="font-size:12px;font-weight:600;color:${C.a700}">${esc(p.cat === 'dev' ? 'Planning application' : SHORT[p.cat])}${p.km != null ? ` · ${kmLabel(p)}` : ''}</div>
          <div style="${HEAD}font-size:18px;line-height:1.2;margin:4px 0">${esc(p.name)}</div>
          <div style="font-size:13px;color:${C.n700};line-height:1.4">${esc(p.status)}</div>
        </div></a></td>`;
  let nearRows = '';
  for (let i = 0; i < nearby.length; i += 2) nearRows += `<tr>${card(nearby[i])}${nearby[i + 1] ? card(nearby[i + 1]) : '<td width="50%"></td>'}</tr>`;

  // 4. Coming up (next 4 weeks)
  const soon = upcoming.filter((e) => e.date < plus(29) && !e.end_label);
  const agenda = soon.map((e) => {
    const t = TAGS[e.kind] || ['', C.n100, C.n800];
    const href = e.ref ? itemUrl(e.ref) : e.link || SITE + '/#dates';
    return `<tr><td width="56" valign="top" style="padding:12px 14px 12px 0">
        <div style="width:52px;height:52px;border-radius:50%;background:${C.n100};text-align:center">
          <div style="${HEAD}font-size:19px;line-height:1;padding-top:10px;color:${C.text}">${pd(e.date).getUTCDate()}</div>
          <div style="${BODY}font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${C.n700};padding-top:3px">${e.date === today ? 'Today' : fmtDow(e.date)}</div></div></td>
      <td valign="top" style="padding:12px 0;${BODY}">
        ${t[0] ? tag(t[0], t[1], t[2], t[3]) : ''}${e.time ? ` <span style="font-size:13px;color:${C.n700}">${esc(e.time)}</span>` : ''}<br>
        <a href="${href}" style="display:inline-block;margin-top:6px;font-size:16px;font-weight:600;line-height:1.35;color:${C.text};text-decoration:none">${esc(e.title)}</a>
        ${e.where ? `<br><span style="font-size:13px;color:${C.n700}">${esc(e.where)}</span>` : ''}</td></tr>`;
  }).join('');

  // 5. Recently decided (latest two)
  const made = projects.filter((p) => p.decision?.state === 'made').sort((a, b) => (b.decision!.date || '0').localeCompare(a.decision!.date || '0')).slice(0, 2);
  const decided = made.length ? `
  <tr><td style="padding:32px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.s100};border-radius:28px"><tr><td style="padding:22px 24px">
      <div style="${HEAD}font-size:22px;color:${C.s900};padding-bottom:6px">Recently decided</div>
      ${made.map((p) => `<div style="border-top:1px solid #d3dcc4;padding:10px 0;${BODY}"><div style="font-size:13px;font-weight:600;color:${C.s800}">${esc(p.decision!.date ? (p.decision!.date.length === 7 ? fmtMonth(p.decision!.date) : fmtDate(p.decision!.date)) : 'Done')}</div>
        <a href="${itemUrl(p.id)}" style="font-size:15px;line-height:1.4;color:${C.text};text-decoration:none">${esc(p.decision!.text)}</a></div>`).join('')}
    </td></tr></table>
  </td></tr>` : '';

  const btn = (label: string, href: string, primary = true) =>
    `<a href="${href}" style="display:inline-block;${BODY}font-size:15px;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:999px;${primary ? `background:${C.accent};color:${C.bg}` : `background:transparent;color:${C.text};border:1px solid ${C.divider}`}">${esc(label)}</a>`;

  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>Around Ryan St · week of ${esc(fmtDate(whatsNew.week || updated))}</title>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<style>@media (max-width:600px){.stack td[width="50%"]{display:block!important;width:100%!important}}</style></head>
<body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:16px 8px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${C.bg}">
  <tr><td style="padding:12px 28px 0">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td width="34" style="padding-right:10px"><a href="${SITE}"><img src="${SITE}/email/logo.png" width="34" height="34" alt="" style="display:block;border:0"></a></td>
      <td style="${HEAD}font-size:20px;color:${C.text}"><a href="${SITE}" style="color:${C.text};text-decoration:none">Around Ryan St</a></td></tr></table>
  </td></tr>
  <tr><td style="padding:28px 28px 0">
    ${tag('Week of ' + fmtDate(whatsNew.week || updated), C.s100, C.s800)} <span style="${BODY}font-size:13px;color:${C.n700}">&nbsp;Coburg · a neighbour-run briefing</span>
    <h1 style="${HEAD}font-size:40px;line-height:1.05;color:${C.text};margin:16px 0 20px">This week around Ryan St</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>
  </td></tr>
  ${sayCard}
  ${nearby.length ? section('New near you', `<div style="${BODY}font-size:14px;color:${C.n700};padding:6px 0 14px">Closest first · distance from Ryan St</div><table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px">${nearRows}</table>`, ['Map', SITE + '/#map']) : ''}
  ${soon.length ? section('Coming up', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${agenda}</table>`, ['Add to calendar', SITE + '/events.ics']) : ''}
  ${decided}
  <tr><td style="padding:32px 28px 0;${BODY}font-size:15px;line-height:1.5;color:${C.n800}">
    <strong style="color:${C.text}">Trams and trains:</strong> live disruptions for Route 19, the Upfield line and local buses are on the <a href="${SITE}/#dates" style="color:${C.a700}">briefing page</a>.
  </td></tr>
  <tr><td style="padding:28px 28px 0">${btn('Open the full briefing', SITE)}</td></tr>
  <tr><td style="padding:36px 28px 0;${BODY}font-size:13px;line-height:1.5;color:${C.n700}">
    If there's something on or near the street others should know about, just reply.<br><br>
    Mat<br><br>
    A neighbour-run summary, not an official council or government page. Check each item's source for official details. For emergencies, use the VicEmergency app with a watch zone.
  </td></tr>
</table></td></tr></table></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
