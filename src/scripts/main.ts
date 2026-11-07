import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { icon, CAT_ICON } from '../lib/icons';

type P = {
  id: string; cat: string; name: string; sub?: string; lat?: number; lon?: number; km?: number | null; open: boolean;
  status: string; what: string; when: string; why?: string; href: string; hrefLabel: string; img: string | null;
  first_seen?: string; decision?: { state: string; date?: string; text: string }; isNew: boolean; kids: boolean;
};
const D = JSON.parse(document.getElementById('site-data')!.textContent!);
const P: P[] = D.projects;
const byId: Record<string, P> = Object.fromEntries(P.map((p) => [p.id, p]));
const COL: Record<string, string> = D.col;
const SHORT: Record<string, string> = D.short;
const SHOW_WHY = true;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const mq = matchMedia('(max-width: 719px)');
const isMobile = () => mq.matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MON[m - 1]} ${y}`; };
const melbToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date()); // YYYY-MM-DD
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const kmLabel = (p: P) => (p.km != null ? `${p.km.toFixed(1)} km` : '');

/* ---------- Toast ---------- */
const toastEl = document.getElementById('toast')!;
let toastT: number;
function toast(msg: string) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = window.setTimeout(() => toastEl.classList.remove('show'), 1800); }

/* ---------- Keep dates honest between weekly builds ---------- */
document.querySelectorAll<HTMLElement>('.left[data-closes]').forEach((pill) => {
  const n = dayDiff(melbToday, pill.dataset.closes!);
  pill.textContent = n <= 0 ? 'closes today' : n === 1 ? '1 day left' : `${n} days left`;
  pill.classList.toggle('urgent', n <= 7);
});
document.querySelectorAll<HTMLElement>('.dow[data-date]').forEach((el) => { if (el.dataset.date === melbToday) el.textContent = 'Today'; });

/* ---------- Agenda filter ---------- */
const agendaRows = [...document.querySelectorAll<HTMLElement>('#agenda .arow')];
agendaRows.forEach((r) => { if (r.dataset.date! < melbToday) r.remove(); });
const AG_LIMIT = 6;
let agExpanded = false, agFilter = 'all';
const agMore = document.getElementById('agenda-more') as HTMLButtonElement;
function filterAgenda(f: string) {
  agFilter = f;
  let n = 0;
  document.querySelectorAll<HTMLElement>('#agenda .month').forEach((m) => {
    let shown = 0;
    m.querySelectorAll<HTMLElement>('.arow').forEach((r) => {
      const match = f === 'all' || r.dataset.ag === f;
      const ok = match && (agExpanded || n < AG_LIMIT);
      r.hidden = !ok; if (ok) shown++; if (match) n++;
    });
    m.hidden = shown === 0;
  });
  document.getElementById('agenda-empty')!.hidden = n > 0;
  agMore.hidden = agExpanded || n <= AG_LIMIT;
  agMore.textContent = `Show all ${n} dates`;
}
agMore.addEventListener('click', () => { agExpanded = true; filterAgenda(agFilter); });
document.querySelectorAll<HTMLButtonElement>('#agenda-chips .chip').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#agenda-chips .chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true'); filterAgenda(b.dataset.af!);
}));
filterAgenda('all');

/* ---------- Detail sheet ---------- */
const root = document.getElementById('sheet')!;
const sheet = root.querySelector<HTMLElement>('.sheet')!;
const sbody = document.getElementById('sbody')!;
const sbar = document.getElementById('sbar')!;
let lastFocus: HTMLElement | null = null;

function render(p: P) {
  const tags = [
    `<span class="tag ${p.open ? 'tag-accent' : 'tag-neutral'}">${esc(p.status)}</span>`,
    p.km != null ? `<span class="tag ${p.km <= 2.1 ? 'tag-accent-2' : 'tag-neutral'}">${kmLabel(p)} from Ryan St</span>` : '',
    p.isNew ? '<span class="tag tag-outline">New this week</span>' : '',
  ].join('');
  const dl = [
    `<dt>When</dt><dd>${esc(p.when)}</dd>`,
    p.decision ? `<dt>${p.decision.state === 'made' ? 'Decided' : 'Decision'}</dt><dd>${esc(p.decision.text)}</dd>` : '',
    p.first_seen ? `<dt>Tracked</dt><dd>Since ${fmtDate(p.first_seen)}</dd>` : '',
  ].join('');
  sbody.innerHTML = `
    <div class="shead"><span class="kicker">${esc(SHORT[p.cat])}${p.sub ? ' · ' + esc(p.sub) : ''}</span>
      <button class="btn btn-secondary btn-icon close" data-close aria-label="Close">${icon('x', 20)}</button></div>
    <h2 id="d-title">${esc(p.name)}</h2>
    <div class="tags">${tags}</div>
    ${p.img ? `<img class="washed" src="${esc(p.img)}" alt="">` : ''}
    ${SHOW_WHY && p.why ? `<div class="why"><span>Why it matters here</span><p>${esc(p.why)}</p></div>` : ''}
    <p class="what">${esc(p.what)}</p>
    <dl>${dl}</dl>`;
  const cta = p.open ? 'Have your say' : p.hrefLabel === 'Council project page' ? 'Official page' : p.hrefLabel;
  sbar.innerHTML = `<a class="btn btn-primary" href="${esc(p.href)}" target="_blank" rel="noopener">${esc(cta)}${icon('arrow-up-right', 16)}</a>
    ${p.lat != null ? `<button class="btn btn-secondary" data-showmap="${p.id}">Map</button>` : ''}
    <button class="btn btn-secondary" data-share="${p.id}">Share</button>`;
}
function openItem(id: string, push = true) {
  const p = byId[id]; if (!p) return;
  render(p);
  if (!root.hasAttribute('open')) lastFocus = document.activeElement as HTMLElement;
  root.setAttribute('open', ''); root.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  sbody.scrollTop = 0; sheet.focus({ preventScroll: true });
  if (push) history.pushState({ item: id }, '', `?item=${encodeURIComponent(id)}${location.hash}`);
}
function closeItem(push = true) {
  if (!root.hasAttribute('open')) return;
  root.removeAttribute('open'); root.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (push && new URLSearchParams(location.search).has('item')) history.pushState({}, '', location.pathname + location.hash);
  lastFocus?.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-close]')) { closeItem(); return; }
  const sm = t.closest<HTMLElement>('[data-showmap]');
  if (sm) { closeItem(); showOnMap(sm.dataset.showmap!); return; }
  const sh = t.closest<HTMLElement>('[data-share]');
  if (sh) {
    const url = `${location.origin}/item/${sh.dataset.share}`;
    (navigator.share ? navigator.share({ url, title: byId[sh.dataset.share!]?.name }) : navigator.clipboard.writeText(url).then(() => toast('Link copied'))).catch(() => {});
    return;
  }
  const opener = t.closest<HTMLElement>('[data-open]');
  if (opener) {
    if (opener.dataset.open) { e.preventDefault(); openItem(opener.dataset.open); }
    else if (opener.dataset.link) window.open(opener.dataset.link, '_blank', 'noopener');
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeItem(); });
window.addEventListener('popstate', () => {
  const id = new URLSearchParams(location.search).get('item');
  if (id) openItem(id, false); else closeItem(false);
});

/* ---------- Register: filters, search, sort, show all ---------- */
const reg = document.getElementById('register')!;
const cards = [...reg.querySelectorAll<HTMLElement>('.pcard')];
const q = document.getElementById('q') as HTMLInputElement;
const sortSel = document.getElementById('sort') as HTMLSelectElement;
const moreBtn = document.getElementById('more') as HTMLButtonElement;
const LIMIT = 9;
let rf = 'all'; let showAll = false;
const CAT_ORDER = ['dev', 'street', 'park', 'sport', 'civic', 'wide'];
const RF: Record<string, (p: P) => boolean> = {
  all: () => true, open: (p) => p.open, near: (p) => p.km != null && p.km <= 2.1, kids: (p) => p.kids,
  dev: (p) => p.cat === 'dev', wide: (p) => p.lat == null, new: (p) => p.isNew,
};
function applyRegister() {
  const terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matched = cards.filter((c) => { const p = byId[c.dataset.id!]; return RF[rf](p) && terms.every((t) => c.dataset.text!.includes(t)); });
  const s = sortSel.value;
  matched.sort((a, b) => {
    const pa = byId[a.dataset.id!], pb = byId[b.dataset.id!];
    if (s === 'new') return (pb.first_seen || '').localeCompare(pa.first_seen || '');
    if (s === 'cat') return (CAT_ORDER.indexOf(pa.cat) - CAT_ORDER.indexOf(pb.cat)) || ((pa.km ?? 99) - (pb.km ?? 99));
    return (pa.km ?? 99) - (pb.km ?? 99);
  });
  const limited = !(showAll || terms.length || rf !== 'all');
  const visible = new Set(limited ? matched.slice(0, LIMIT) : matched);
  cards.forEach((c) => { c.hidden = !visible.has(c); });
  matched.forEach((c) => reg.appendChild(c));
  document.getElementById('count')!.textContent = `${matched.length} of ${cards.length}`;
  moreBtn.hidden = !(limited && matched.length > LIMIT);
  document.getElementById('more-n')!.textContent = String(matched.length);
  document.getElementById('empty')!.hidden = matched.length > 0;
}
document.querySelectorAll<HTMLButtonElement>('#reg-chips .chip').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#reg-chips .chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true'); rf = b.dataset.rf!; applyRegister();
}));
q.addEventListener('input', applyRegister); sortSel.addEventListener('change', applyRegister);
moreBtn.addEventListener('click', () => { showAll = true; applyRegister(); });
applyRegister();

/* ---------- Map ---------- */
const home: [number, number] = [D.home.lat, D.home.lon];
const mobileAtStart = isMobile();
const map = L.map('leaflet-map', { scrollWheelZoom: false, dragging: !mobileAtStart, zoomControl: !mobileAtStart, tap: false } as any).setView(home, 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
map.on('click', () => map.scrollWheelZoom.enable());
map.getContainer().addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
[1000, 2000, 3000].forEach((r) => {
  L.circle(home, { radius: r, color: '#8c491a', weight: 1.5, dashArray: '2 7', lineCap: 'round', fill: false, interactive: false }).addTo(map);
  L.marker(L.latLng(home[0] + r / 111200, home[1]), { icon: L.divIcon({ className: '', html: `<span class="ring-label">${r / 1000} km</span>`, iconSize: [44, 18], iconAnchor: [22, 9] }), interactive: false, keyboard: false }).addTo(map);
});
L.marker(home, { icon: L.divIcon({ className: '', html: '<div class="home-pin"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }), zIndexOffset: 1000, title: 'Ryan St', keyboard: false })
  .addTo(map).bindTooltip('Ryan St', { direction: 'top' });

const cluster = (L as any).markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 36, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 17 });
map.addLayer(cluster);
const markers: Record<string, L.Marker> = {};
const located = P.filter((p) => p.lat != null && p.lon != null);
for (const p of located) {
  const m = L.marker([p.lat!, p.lon!], { icon: L.divIcon({ className: '', html: `<div class="pin" data-pin="${p.id}" style="background:${COL[p.cat]}">${icon(CAT_ICON[p.cat] || 'map', 15, '#fff', '')}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }), title: p.name, riseOnHover: true });
  m.on('click', () => openItem(p.id));
  markers[p.id] = m;
}
const hidden = new Set<string>();
function refreshMarkers() {
  cluster.clearLayers();
  cluster.addLayers(located.filter((p) => !hidden.has(p.cat)).map((p) => markers[p.id]));
  refreshList();
}
document.querySelectorAll<HTMLButtonElement>('#map-toggles .chip').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.cat!; if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
  b.setAttribute('aria-pressed', String(!hidden.has(k))); refreshMarkers();
}));

// Mobile: tap-to-explore guard and Map/List switch
const guard = document.getElementById('guard')!;
const wrap = document.getElementById('mapwrap')!;
if (mobileAtStart) guard.classList.add('on');
guard.addEventListener('click', () => { map.dragging.enable(); (map as any).touchZoom?.enable(); guard.classList.remove('on'); });
document.querySelectorAll<HTMLButtonElement>('#map-views .seg-btn').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#map-views .seg-btn').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true'); wrap.dataset.view = b.dataset.view!;
  setTimeout(() => map.invalidateSize(), 50);
}));

// Side list
const listEl = document.getElementById('maplist')!;
const mapSearch = document.getElementById('map-search') as HTMLInputElement;
function refreshList() {
  const b = map.getBounds();
  const term = mapSearch.value.trim().toLowerCase();
  const inView = located.filter((p) => !hidden.has(p.cat))
    .filter((p) => (term ? (p.name + ' ' + (p.sub || '') + ' ' + p.what).toLowerCase().includes(term) : b.contains([p.lat!, p.lon!])))
    .sort((a, c) => (a.km ?? 99) - (c.km ?? 99));
  document.getElementById('inview')!.textContent = term ? `${inView.length} matches` : `${inView.length} places in view, nearest first`;
  document.getElementById('list-n')!.textContent = String(inView.length);
  listEl.innerHTML = inView.map((p) => `<button class="unbtn mrow" data-fly="${p.id}"><i class="dot" style="background:${COL[p.cat]}"></i><span class="n">${esc(p.name)}</span><span class="k">${kmLabel(p)}</span></button>`).join('')
    || '<p class="empty">Nothing here. Zoom out or clear the search.</p>';
}
map.on('moveend', refreshList);
mapSearch.addEventListener('input', refreshList);
listEl.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fly]'); if (!b) return;
  const p = byId[b.dataset.fly!];
  if (!isMobile()) map.setView([p.lat!, p.lon!], 17);
  openItem(p.id);
});
listEl.addEventListener('mouseover', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fly]'); highlight(b?.dataset.fly); });
listEl.addEventListener('mouseleave', () => highlight());
function highlight(id?: string) {
  document.querySelectorAll('.pin.hl').forEach((x) => x.classList.remove('hl'));
  if (id) document.querySelector(`.pin[data-pin="${CSS.escape(id)}"]`)?.classList.add('hl');
}
function showOnMap(id: string) {
  const p = byId[id]; if (!p || p.lat == null) return;
  if (hidden.has(p.cat)) { hidden.delete(p.cat); document.querySelector(`#map-toggles [data-cat="${p.cat}"]`)?.setAttribute('aria-pressed', 'true'); refreshMarkers(); }
  if (wrap.dataset.view === 'list') (document.querySelector('#map-views [data-view="map"]') as HTMLButtonElement)?.click();
  const el = document.getElementById('map')!;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: reduced ? 'auto' : 'smooth' });
  setTimeout(() => { map.invalidateSize(); map.setView([p.lat!, p.lon!], 17); highlight(id); }, reduced ? 0 : 400);
}
refreshMarkers();

/* ---------- Mobile tab bar: highlight the section in view ---------- */
const tabs = [...document.querySelectorAll<HTMLAnchorElement>('.tabbar a')];
const tabSecs = tabs.map((a) => document.getElementById(a.dataset.tab!)).filter(Boolean) as HTMLElement[];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) tabs.forEach((a) => a.setAttribute('aria-current', String(a.dataset.tab === e.target.id)));
}, { rootMargin: '-45% 0px -50% 0px' });
tabSecs.forEach((s) => io.observe(s));

/* ---------- Live transport disruptions (from /api/disruptions) ---------- */
(async () => {
  const el = document.getElementById('live'); if (!el) return;
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Melbourne' }) : '');
  try {
    const r = await fetch('/api/disruptions');
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const meta = document.getElementById('live-meta');
    if (meta) meta.textContent = `Route 19, the Upfield line and local buses · checked ${fmt(d.fetched_at)}`;
    if (!d.alerts.length) { el.innerHTML = '<p style="margin:0;font-size:15px">No current disruptions. Services are running normally.</p>'; return; }
    el.innerHTML = d.alerts.map((a: any) => `<div class="row">
      <span class="tags">${a.lines.map((l: string) => `<span class="tag tag-accent">${esc(l)}</span>`).join('')}<span class="tag tag-neutral">${a.active ? 'Now' : 'From ' + esc(fmt(a.starts))}</span></span>
      <span class="t">${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.header || 'Service change')}</a>` : esc(a.header || 'Service change')}</span>
      ${a.active && a.ends ? `<span class="meta">Until ${esc(fmt(a.ends))}</span>` : ''}
      ${a.description ? `<details><summary>Details</summary><p style="margin:6px 0 0">${esc(a.description)}</p></details>` : ''}</div>`).join('');
  } catch {
    el.innerHTML = '<p style="margin:0;font-size:15px">Live disruptions are unavailable right now. Check <a href="https://www.ptv.vic.gov.au/disruptions/" target="_blank" rel="noopener">PTV disruptions</a>.</p>';
  }
})();

/* ---------- Open an item from the URL ---------- */
const initial = new URLSearchParams(location.search).get('item');
if (initial) openItem(initial, false);
