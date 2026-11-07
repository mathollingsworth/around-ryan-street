import { events, byId } from '../lib/data';

const pad = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fold = (line: string) => line.match(/.{1,73}/g)!.join('\r\n ');

export function GET() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Around Ryan St//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Around Ryan St', 'X-WR-TIMEZONE:Australia/Melbourne', 'REFRESH-INTERVAL;VALUE=DURATION:P1D'];
  for (const e of events) {
    if (e.end_label) continue; // month-only dates are not real calendar events
    const d = e.date.replace(/-/g, '');
    const next = new Date(Date.UTC(+e.date.slice(0, 4), +e.date.slice(5, 7) - 1, +e.date.slice(8, 10) + 1));
    const d2 = `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
    const p = e.ref ? byId[e.ref] : null;
    const url = p ? `https://ryanstreet.vercel.app/item/${p.id}` : e.link || 'https://ryanstreet.vercel.app';
    const desc = [e.time ? `Time: ${e.time}` : '', p ? p.what : '', url].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:${d}-${(e.ref || e.title).replace(/[^a-z0-9]/gi, '').slice(0, 40)}@ryanstreet`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2}`, fold(`SUMMARY:${esc(e.title)}`), fold(`DESCRIPTION:${esc(desc)}`),
      ...(e.where ? [fold(`LOCATION:${esc(e.where)}`)] : []), fold(`URL:${url}`), 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n'), { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
}
