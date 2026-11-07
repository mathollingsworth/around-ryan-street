import raw from '../data/projects.json';

export const HOME = { lat: -37.7353031, lon: 144.9639773 };

export type Decision = { state: 'made' | 'due'; date?: string; text: string };
export type Project = {
  id: string; cat: string; name: string; sub?: string; lat?: number; lon?: number;
  open?: boolean; status: string; what: string; when: string; why?: string;
  url?: string; link?: string; link_label?: string; first_seen?: string;
  short?: string; left?: boolean; nolabel?: boolean; image?: string; image_src?: string;
  icon?: string; decision?: Decision; km?: number | null;
};
export type Event = { date: string; time?: string; title: string; kind: string; where?: string; ref?: string; link?: string; end_label?: string };
export type WhatsNewItem = { group: 'dates' | 'new'; date?: string; label?: string; sub?: string; kind: string; tag: string; text: string; ref?: string };

export const CATS: Record<string, { name: string; colour: string; icon: string }> = {
  dev: { name: 'Development & planning', colour: 'var(--c-dev)', icon: '🏗️' },
  street: { name: 'Streets, transport & schools', colour: 'var(--c-street)', icon: '🚸' },
  park: { name: 'Parks & playgrounds', colour: 'var(--c-park)', icon: '🌳' },
  sport: { name: 'Sport & recreation', colour: 'var(--c-sport)', icon: '⚽' },
  civic: { name: 'Rubbish, rules & council business', colour: 'var(--c-civic)', icon: '📜' },
  wide: { name: 'Council-wide plans & programs', colour: 'var(--c-wide)', icon: '🏛️' },
};
export const KINDS: Record<string, { label: string; icon: string }> = {
  closes: { label: 'Closes', icon: '🗣️' }, popup: { label: 'Pop-up', icon: '📍' }, event: { label: 'Event', icon: '🎉' },
  decision: { label: 'Decision', icon: '🏛️' }, household: { label: 'Household', icon: '🗑️' }, works: { label: 'Works', icon: '🚧' },
  planning: { label: 'Planning', icon: '🏗️' }, new: { label: 'New', icon: '✨' },
};

function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const t = (x: number) => (x * Math.PI) / 180;
  const dLa = t(b.lat - a.lat), dLo = t(b.lon - a.lon);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const data = raw as any;
export const projects: Project[] = (data.projects as Project[]).map((p) => ({
  ...p,
  km: p.lat != null && p.lon != null ? Math.round(km(HOME, { lat: p.lat, lon: p.lon }) * 100) / 100 : null,
}));
export const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
export const events: Event[] = data.events || [];
export const whatsNew: { week?: string; items?: WhatsNewItem[]; ids?: string[]; summary?: string[] } = data.whats_new || {};
export const liveLinks: { label: string; url: string }[] = data.live_links || [];
export const updated: string = data.updated;

export const iconOf = (p: Project) => p.icon || CATS[p.cat]?.icon || '•';
export const SHORT: Record<string, string> = { dev: 'Planning', street: 'Streets & schools', park: 'Parks', sport: 'Sport', civic: 'Council business', wide: 'Council-wide' };
export const COL: Record<string, string> = { dev: 'var(--cat-dev)', street: 'var(--cat-street)', park: 'var(--cat-park)', sport: 'var(--cat-sport)', civic: 'var(--cat-civic)', wide: 'var(--cat-wide)' };
export const SHOW_WHY = true; // "Why it matters here" block in the detail sheet
export const kmLabel = (p: Project) => (p.km != null ? `${p.km.toFixed(1)} km` : '');
export const linkOf = (p: Project) => p.link || `https://conversations.merri-bek.vic.gov.au/${p.url}`;
export const labelOf = (p: Project) => p.link_label || 'Council project page';
// Images are served from the original public source through a free resizing CDN (wsrv.nl),
// so the repo holds no binary files and the weekly update only edits JSON.
export const resized = (src: string, w = 720, h = 405) =>
  `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${w}&h=${h}&fit=cover&output=jpg&q=72`;
export const imgOf = (p: Project) => (p.image_src ? resized(p.image_src) : null);
export const OG_DEFAULT = resized('https://hdp-au-prod-app-more-conversations-files.s3.ap-southeast-2.amazonaws.com/3317/7318/6014/20260306_-_Aerial_Image_Extended_crop.jpg', 1200, 630);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d || 1)); };
export const fmtDate = (s: string) => { const d = pd(s); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const fmtShort = (s: string) => { const d = pd(s); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
export const fmtDow = (s: string) => DOW[pd(s).getUTCDay()];
export const fmtMonth = (s: string) => (s.length === 7 ? `${MON[+s.slice(5) - 1]} ${s.slice(0, 4)}` : fmtDate(s));
