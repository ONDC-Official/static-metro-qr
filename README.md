# ONDC Discover Metro — Static QR Pages

Static, zero-build landing pages for ONDC metro station QR codes. Each physical
QR at a station points to a city page that lists the authorised ONDC buyer apps
a commuter can use to buy a metro ticket.

Live at [metro.ondc.tech](https://metro.ondc.tech).

## How it's structured

The site has **two levels**, each a thin static HTML shell rendered by one
shared script. Every real URL is root-relative:

```
/                                  → pick a city
/<city>/                           → pick a buyer app to book with
```

For example:

```
/bangalore/
/delhi/
```

Generated pages live at the **repo root** (not under `public/`) so that the
bare `/` URL itself resolves — `public/` holds only the shared,
non-generated assets (`public/js/`, `public/css/`, `public/images/`).

There is no build step for the _runtime_ — every page is a plain `.html` file
that:

1. Sets its own `<title>`/`<meta>` tags (so link previews and SEO work without JS).
2. Declares which city it needs via a `data-group` attribute on `<body>`.
3. Links shared stylesheets (`public/css/picker.css` for root city picker and
   `public/css/entity.css` for city buyer pages) instead of inlining CSS per page.
4. Loads `public/js/app.js`, which fetches `data/entities.json` and renders
   everything dynamic — the navbar, footer, header logo, and the list itself
   (cities or buyer apps) — into placeholder elements (`#navbar-slot`,
   `#footer-slot`, `#header-logo`, `#main-content`).

All of those HTML files are **generated** — see [Generating pages](#generating-pages)
below. You never hand-write or copy city folders; you edit `data/entities.json`
and run one script.

```
index.html                         # city picker (generated)
bangalore/index.html               # buyer-app list (generated, data-group="bangalore")
delhi/index.html
…

data/entities.json                 # single source of truth for all content + site config
data/analytics.json                # per-city GA4 measurement IDs (optional per city)
scripts/generate.mjs               # reads JSON, writes index.html + <city>/index.html
scripts/templates/root.html        # template for the city picker
scripts/templates/group.html       # template for the buyer-app list
.github/workflows/deploy.yml       # generate + deploy to GitHub Pages on push
public/js/app.js                   # shared renderer + navbar/footer + GA4 tracking
public/css/picker.css              # shared styles for root city picker
public/css/entity.css              # shared styles for city buyer pages
public/images/buyers/              # buyer app logos + metro logos
public/images/ondc-logo.svg
public/images/favicon.png
CNAME                              # custom domain for GitHub Pages
```

## Editing content

All city, buyer-app, and site-level data lives in **`data/entities.json`** —
nothing else needs to change for day-to-day updates.

```json
{
  "site": {
    "productName": "Metro Ticketing",
    "orgName": "ONDC"
  },
  "groups": [
    {
      "slug": "bangalore",
      "name": "Bangalore",
      "productName": "Metro Ticketing",
      "title": "Get Bangalore Metro Digital Tickets via ONDC",
      "subtitle": "Book your tickets from the below apps",
      "logo": "/public/images/buyers/banglore_metro.svg.webp",
      "buyers": [
        {
          "label": "EaseMyTrip",
          "logo": "/public/images/buyers/EaseMyTrip%20Logo.svg",
          "url": "https://www.easemytrip.com/metro/"
        }
      ]
    }
  ]
}
```

- **`site`**: project-wide defaults (`productName`, `orgName`) for titles/meta.
- **`groups`**: cities. Each group has a `buyers` array (no nested entity level).
- **`productName`** (group): optional override for the navbar label
  (`Metro Ticketing` vs `Discover Metro`).
- **`logo`** (buyer): optional. If omitted, the row falls back to a colored dot.
- **`darkLogo`**: optional; applies a dark background behind the buyer logo
  (e.g. Namma Yatri).
- **`androidUrl` / `iosUrl`**: optional platform-specific deep links (e.g. Kochi1).
- Asset filenames with spaces must be percent-encoded in the JSON.

Per-city GA4 IDs live in **`data/analytics.json`**. Only cities listed there
load gtag. Cities without an entry have no analytics (same as the previous
Delhi / Mumbai / Hyderabad pages).

### Adding a buyer app to an existing city

Add an entry to that city's `buyers` array and re-run the generator.

### Adding a new city

Add an entry to the `groups` array in `data/entities.json` (and an analytics
entry in `data/analytics.json` only if that city should track GA). Re-run the
generator.

## Generating pages

```
node scripts/generate.mjs
```

This reads `data/entities.json` + `data/analytics.json`, validates them
(unique slugs, https buyer URLs, referenced local images exist, etc.), and
writes `index.html` plus every `<city>/index.html` at the repo root. It also
deletes any previously generated city folder that's no longer in the JSON.
Generated HTML is git-ignored — rebuild before every deploy.

## Local development

```
node scripts/generate.mjs
python3 -m http.server 8000
```

Then open `http://localhost:8000/` or `http://localhost:8000/bangalore/`.

## Deployment

Deployed to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
on every push to `main`, it runs `node scripts/generate.mjs` and publishes the
result. Generated HTML is **never committed** — it's rebuilt fresh on every
deploy, so it can't drift out of sync with `data/entities.json`.

This requires the repo's Pages source (Settings → Pages → Build and
deployment) to be set to **"GitHub Actions"** (a one-time setting).

- `CNAME` — custom domain (`metro.ondc.tech`), included in the deploy artifact.

## Analytics (frozen contract)

Do **not** rename events or parameters — existing GA4 reports depend on them.

Cities with a `measurementId` in `data/analytics.json` load GA4 via the
generated page's `gtag.js` script tag. `public/js/app.js` then:

| Call                          | When                                        | Parameters                                   |
| ----------------------------- | ------------------------------------------- | -------------------------------------------- |
| `user_properties.platform_os` | On load                                     | `Android` / `iOS` / `Other`                  |
| `platform_detected`           | `DOMContentLoaded` on GA-enabled city pages | `platform_os`                                |
| `buyer_app_click`             | Tap on a buyer app link                     | `app_name`, `platform_os`, `destination_url` |

If a buyer has `androidUrl` / `iosUrl`, the click handler may `preventDefault`
and `window.open` the platform-specific URL (same as the previous Kochi1
behaviour). The root city picker does **not** load GA.

Current measurement IDs:

| City                     | Measurement ID |
| ------------------------ | -------------- |
| Bangalore                | `G-17W29WN58K` |
| Kochi                    | `G-17W29WN58K` |
| Chennai                  | `G-5F86E5ZX67` |
| Delhi, Mumbai, Hyderabad | _(none)_       |

## About ONDC

[ONDC (Open Network for Digital Commerce)](https://ondc.org) is an initiative
by the Government of India to democratise digital commerce. This site is part
of ONDC's metro ticketing discovery effort.
