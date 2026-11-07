import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

type P = {
  id: string; cat: string; name: string; sub?: string; lat?: number; lon?: number; km?: number | null;
  open?: boolean; status: string; what: string; when: string; why?: string; img: string | null; href: string; hrefLabel: string;
  icon: string; isNew: boolean; decision?: { state: string; date?: string; text: string }; first_seen?: string;
};
const D = JSON.parse(document.getElementById('site-data')!.textContent!);
const P: P[] = D.projects;
const byId: Record<string, P> = Object.fromEntries(P.map((p) => [p.id, p]));
const CATS: Record<string, { name: string; colour: string; icon: string }> = D.cats;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v.replace(/^var\((.*)\)$/, '$1')).trim();

/* ---------- Toast ---------- */
const toastEl = document.getElementById('toast')!;
let toastT: number;
function toast(msg: string) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = window.setTimeout(() => toastEl.classList.remove('show'), 1800); }

/* ---------- Scroll spy for sticky nav ---------- */
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.navlinks a')];
const sections = navLinks.map((a) => document.querySelector<HTMLElement>(a.hash)).filter(Boolean) as HTMLElement[];
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      navLinks.forEach((a) => a.setAttribute('aria-current', String(a.hash === '#' + e.target.id)));
      const cur = navLinks.find((a) => a.hash === '#' + e.target.id);
      const bar = document.querySelector<HTMLElement>('.navlinks');
      if (cur && bar) bar.scrollLeft = cur.offsetLeft - bar.offsetLeft - 16; // never scrollIntoView: it cancels the page's smooth scroll
    }
  }
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => spy.observe(s));

/* ---------- Drawer (item details) ---------- */
const drawer = document.getElementById('drawer')!;
const body = document.getElementById('d-body')!;
const sheet = drawer.querySelector<HTMLElement>('.sheet')!;
let lastFocus: HTMLElement | null = null;

function render(p: P) {
  const c = CATS[p.cat];
  const img = p.img ? `<img class="simg" src="${esc(p.img)}" alt="">` : `<div class="sph" style="background:color-mix(in srgb, ${c.colour} 18%, transparent)">${p.icon}</div>`;
  const dec = p.decision ? `<dt>Decision</dt><dd>${esc(p.decision.text)}${p.decision.date ? ` (${esc(p.decision.date)})` : ''}</dd>` : '';
  body.innerHTML = `${img}<div class="sbody">
    <div class="mono">${c.icon} ${esc(c.name)}${p.sub ? ' · ' + esc(p.sub) : ''}</div>
    <h2 id="d-title">${p.icon} ${esc(p.name)}</h2>
    <div class="tags"><span class="tag${p.open ? ' open' : ''}">${esc(p.status)}</span>${p.km != null ? `<span class="tag${p.km <= 2.1 ? ' near' : ''}">${p.km.toFixed(1)} km from Ryan St</span>` : ''}${p.isNew ? '<span class="tag new">New</span>' : ''}</div>
    <p>${esc(p.what)}</p>
    <dl><dt>When</dt><dd>${esc(p.when)}</dd>${dec}${p.first_seen ? `<dt>Tracked</dt><dd>since ${esc(p.first_seen)}</dd>` : ''}</dl>
    <div class="actions">
      <a class="btn primary" href="${esc(p.href)}" target="_blank" rel="noopener">${esc(p.hrefLabel)} ↗</a>
      ${p.lat != null ? `<button class="btn" data-showmap="${p.id}">🗺️ Show on map</button>` : ''}
      <button class="btn" data-share="${p.id}">🔗 Copy link</button>
    </div>
  </div>`;
}
function openItem(id: string, push = true) {
  const p = byId[id]; if (!p) return;
  render(p);
  lastFocus = document.activeElement as HTMLElement;
  drawer.setAttribute('open', ''); drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  sheet.scrollTop = 0; sheet.focus();
  if (push) history.pushState({ item: id }, '', `?item=${encodeURIComponent(id)}${location.hash}`);
}
function closeItem(push = true) {
  if (!drawer.hasAttribute('open')) return;
  drawer.removeAttribute('open'); drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (push && new URLSearchParams(location.search).has('item')) history.pushState({}, '', location.pathname + location.hash);
  lastFocus?.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const opener = t.closest<HTMLElement>('[data-open]');
  if (opener) { e.preventDefault(); openItem(opener.dataset.open!); return; }
  if (t.closest('[data-close]')) { closeItem(); return; }
  const sm = t.closest<HTMLElement>('[data-showmap]');
  if (sm) { closeItem(); showOnMap(sm.dataset.showmap!); return; }
  const sh = t.closest<HTMLElement>('[data-share]');
  if (sh) {
    const url = `${location.origin}/item/${sh.dataset.share}`;
    (navigator.share ? navigator.share({ url, title: byId[sh.dataset.share!]?.name }) : navigator.clipboard.writeText(url).then(() => toast('Link copied'))).catch(() => {});
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeItem(); });
window.addEventListener('popstate', () => {
  const id = new URLSearchParams(location.search).get('item');
  if (id) openItem(id, false); else closeItem(false);
});
const initial = new URLSearchParams(location.search).get('item');
if (initial) openItem(initial, false);

/* ---------- Register filters ---------- */
const reg = document.getElementById('register')!;
const cards = [...reg.querySelectorAll<HTMLElement>('.card')];
const KIDS = /play|school|kids|children|famil|pool|aquatic|swim|library|festival|carols|childcare|disc golf/i;
let filter = 'all';
const q = document.getElementById('q') as HTMLInputElement;
const catSel = document.getElementById('cat') as HTMLSelectElement;
const sortSel = document.getElementById('sort') as HTMLSelectElement;
function applyFilters() {
  const term = q.value.trim().toLowerCase();
  const terms = term.split(/\s+/).filter(Boolean);
  let n = 0;
  for (const c of cards) {
    const p = byId[c.dataset.id!];
    let ok = true;
    if (filter === 'near') ok = p.km != null && p.km <= 2.1;
    if (filter === 'kids') ok = p.cat === 'park' || KIDS.test(p.name + ' ' + p.what);
    if (filter === 'open') ok = !!p.open;
    if (filter === 'new') ok = p.isNew;
    if (ok && catSel.value) ok = p.cat === catSel.value;
    if (ok && terms.length) ok = terms.every((t) => c.dataset.text!.includes(t));
    c.hidden = !ok; if (ok) n++;
  }
  const order = Object.keys(CATS);
  const sorted = [...cards].sort((a, b) => {
    const pa = byId[a.dataset.id!], pb = byId[b.dataset.id!];
    if (sortSel.value === 'near') return (pa.km ?? 99) - (pb.km ?? 99);
    if (sortSel.value === 'new') return (pb.first_seen || '').localeCompare(pa.first_seen || '');
    return (order.indexOf(pa.cat) - order.indexOf(pb.cat)) || ((pa.km ?? 99) - (pb.km ?? 99));
  });
  sorted.forEach((c) => reg.appendChild(c));
  document.getElementById('count')!.textContent = `${n} of ${cards.length} items`;
  document.getElementById('empty')!.hidden = n > 0;
}
document.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true'); filter = b.dataset.f!; applyFilters();
}));
q.addEventListener('input', applyFilters); catSel.addEventListener('change', applyFilters); sortSel.addEventListener('change', applyFilters);

/* ---------- Map ---------- */
const home: [number, number] = [D.home.lat, D.home.lon];
const map = L.map('leaflet-map', { scrollWheelZoom: false, zoomControl: true }).setView(home, 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
// Enable wheel zoom only after the map is clicked, so page scrolling isn't hijacked
map.on('click', () => map.scrollWheelZoom.enable());
map.getContainer().addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

const accent = cssVar('--accent') || '#2f6b4f';
[1000, 2000, 3000].forEach((r) => {
  L.circle(home, { radius: r, color: accent, weight: 1.2, dashArray: '4 6', fill: false, interactive: false }).addTo(map);
  L.marker(L.latLng(home[0] + r / 111200, home[1]), { icon: L.divIcon({ className: '', html: `<span class="mono" style="color:${accent};background:var(--surface);padding:0 4px;border-radius:3px">${r / 1000} km</span>`, iconSize: [40, 14], iconAnchor: [20, 7] }), interactive: false, keyboard: false }).addTo(map);
});
L.marker(home, { icon: L.divIcon({ className: '', html: '<div class="home-pin" title="Ryan St"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), title: 'Ryan St', zIndexOffset: 1000 })
  .addTo(map).bindTooltip('Ryan St', { permanent: false, direction: 'top' });

const cluster = (L as any).markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 36, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 17 });
map.addLayer(cluster);
const markers: Record<string, L.Marker> = {};
const located = P.filter((p) => p.lat != null && p.lon != null);
for (const p of located) {
  const col = CATS[p.cat].colour;
  const icon = L.divIcon({ className: '', html: `<div class="pin${p.km != null && p.km <= 1 ? ' near' : ''}" data-pin="${p.id}" style="border-color:${col}">${p.icon}</div>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
  const m = L.marker([p.lat!, p.lon!], { icon, title: p.name, riseOnHover: true });
  m.bindPopup(() => `<div class="pop">${p.img ? `<img src="${esc(p.img)}" alt="">` : ''}<h3>${p.icon} ${esc(p.name)}</h3><div class="small">${esc(p.status)}${p.km != null ? ' · ' + p.km.toFixed(1) + ' km' : ''}</div><p style="margin:6px 0">${esc(p.what.length > 140 ? p.what.slice(0, 137) + '…' : p.what)}</p><button class="btn" data-open="${p.id}">More details</button></div>`, { maxWidth: 260 });
  (m as any).cat = p.cat;
  markers[p.id] = m;
}
const hidden = new Set<string>();
function refreshMarkers() {
  cluster.clearLayers();
  cluster.addLayers(located.filter((p) => !hidden.has(p.cat)).map((p) => markers[p.id]));
  refreshList();
}
document.querySelectorAll<HTMLButtonElement>('#map-toggles .tog').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.cat!; if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
  b.setAttribute('aria-pressed', String(!hidden.has(k))); refreshMarkers();
}));

// Side list of places in view
const listEl = document.getElementById('maplist')!;
const mapSearch = document.getElementById('map-search') as HTMLInputElement;
function refreshList() {
  const b = map.getBounds();
  const term = mapSearch.value.trim().toLowerCase();
  const inView = located
    .filter((p) => !hidden.has(p.cat))
    .filter((p) => term ? (p.name + ' ' + (p.sub || '') + ' ' + p.what).toLowerCase().includes(term) : b.contains([p.lat!, p.lon!]))
    .sort((a, c) => (a.km ?? 99) - (c.km ?? 99));
  document.getElementById('inview')!.textContent = term ? `${inView.length} matches` : `${inView.length} in view`;
  listEl.innerHTML = inView.map((p) => `<button data-fly="${p.id}"><span>${p.icon}</span><span>${esc(p.name)}</span><span class="d">${p.km?.toFixed(1)} km</span></button>`).join('') || '<p class="empty">Nothing here. Zoom out or clear the search.</p>';
}
map.on('moveend', refreshList);
mapSearch.addEventListener('input', refreshList);
listEl.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fly]'); if (b) flyTo(b.dataset.fly!); });
listEl.addEventListener('mouseover', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fly]'); highlight(b?.dataset.fly); });
listEl.addEventListener('mouseleave', () => highlight());
function highlight(id?: string) {
  document.querySelectorAll('.pin.hl').forEach((x) => x.classList.remove('hl'));
  if (id) document.querySelector(`.pin[data-pin="${CSS.escape(id)}"]`)?.classList.add('hl');
}
function flyTo(id: string) {
  const m = markers[id]; if (!m) return;
  const p = byId[id];
  if (hidden.has(p.cat)) { hidden.delete(p.cat); document.querySelector(`#map-toggles [data-cat="${p.cat}"]`)?.setAttribute('aria-pressed', 'true'); refreshMarkers(); }
  cluster.zoomToShowLayer(m, () => m.openPopup());
}
function showOnMap(id: string) {
  document.getElementById('leaflet-map')!.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  setTimeout(() => flyTo(id), reduced ? 0 : 450);
}

// Reset view control
const Reset = L.Control.extend({
  onAdd() {
    const d = L.DomUtil.create('div', 'leaflet-bar');
    d.innerHTML = '<a href="#" title="Back to Ryan St" role="button" aria-label="Back to Ryan St">⌂</a><a href="#" title="Show everything" role="button" aria-label="Show everything">⤢</a>';
    const [h, all] = d.querySelectorAll('a');
    L.DomEvent.on(h, 'click', (e) => { L.DomEvent.preventDefault(e); map.setView(home, 15); });
    L.DomEvent.on(all, 'click', (e) => { L.DomEvent.preventDefault(e); map.fitBounds(cluster.getBounds(), { padding: [20, 20] }); });
    L.DomEvent.disableClickPropagation(d);
    return d;
  },
});
new Reset({ position: 'topleft' }).addTo(map);
refreshMarkers();
