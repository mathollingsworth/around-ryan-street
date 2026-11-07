# Around Ryan St

A neighbour-run weekly briefing on council, state and development activity around Ryan St, Coburg.
Live at https://around-ryan-street.vercel.app

## How it works

- **Static site** built with [Astro](https://astro.build) and [Leaflet](https://leafletjs.com) (OpenStreetMap tiles, marker clustering).
- **All content lives in one file:** `src/data/projects.json`. Images live in `public/img/<id>.jpg`.
- **Weekly update:** a scheduled Claude task gathers news (Merri-bek Council, PlanningAlerts, the state planning register, Transport Victoria, VicEmergency), edits `projects.json`, adds any new images and commits to `main`. Vercel rebuilds and deploys automatically on every push.
- Every push runs `npm run check-data` first, so a broken data file fails the build instead of breaking the site.

## Pages

| Path | What |
|---|---|
| `/` | The briefing: this week, coming up, decisions, interactive map, rules and policy, full searchable list |
| `/?item=<id>` | Opens an item's detail panel (shareable) |
| `/item/<id>` | Stand-alone page per item, with a proper link preview for WhatsApp |
| `/api/disruptions` | Live tram, Upfield line and local bus disruptions (Vercel function, cached 5 min) |
| `/events.ics` | Calendar feed of dated items (subscribe in Google or Apple Calendar) |

## Data model (`src/data/projects.json`)

- `projects[]`: `id`, `cat` (dev, street, park, sport, civic, wide), `name`, `sub`, `lat`/`lon` (omit when there is no single location), `open`, `status`, `what`, `when`, `url` (Conversations Merri-bek slug) or `link` + `link_label`, `first_seen`, `icon` (one emoji), `image` (`img/<id>.jpg`), `image_src`, `decision` `{state: made|due, date, text}`.
- `events[]`: `date`, `time`, `title`, `kind` (closes, popup, event, decision, household, works), `where`, `ref` (project id) or `link`, `end_label` for month-only dates.
- `whats_new`: `week`, `items[]` (group `dates` or `new`), `ids[]` (picture tiles).
- `live_links[]`, `subscribe_url`, `image_credit`, `updated`.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # runs the data check, then builds to dist/
```

## Environment variables (Vercel)

| Name | What |
|---|---|
| `TRANSPORT_VIC_KEY` | Transport Victoria open data API key (opendata.transport.vic.gov.au → My Account → Profile → API tokens). Used only by `/api/disruptions`, never sent to the browser. |
