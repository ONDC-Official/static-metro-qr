# ONDC Metro Discover — Static QR Pages

A lightweight, zero-build static site that powers the QR codes placed at metro stations across India. When a commuter scans a QR code, they land on a city-specific page listing the authorised ONDC buyer apps they can use to purchase metro tickets.

## How it works

```
QR code at station  →  /delhi  →  index.html (dispatcher)
                                      │
                                      └── fetches /delhi/index.html
                                              └── renders seller list
```

The root `index.html` reads the city slug from the URL path, sets the page title, and dynamically fetches the matching city page (`/{city}/index.html`) to render its seller list. Each city page is also a fully self-contained HTML file that works when opened directly.

## Project structure

```
.
├── index.html              # Root dispatcher — resolves city from URL path
├── public/
│   ├── buyers-config.json  # Authorised sellers per city (source of truth)
│   ├── ondc-logo.svg
│   ├── icons.svg
│   ├── favicon.svg
│   ├── _redirects          # Netlify / Cloudflare Pages SPA fallback rule
│   └── _headers            # HTTP response headers (caching, security)
├── delhi/
│   └── index.html
├── mumbai/
│   └── index.html
├── bangalore/
│   └── index.html
├── hyderabad/
│   └── index.html
└── chennai/
    └── index.html
```

## Supported cities

| City      | URL path     |
|-----------|--------------|
| Delhi     | `/delhi`     |
| Mumbai    | `/mumbai`    |
| Bangalore | `/bangalore` |
| Hyderabad | `/hyderabad` |
| Chennai   | `/chennai`   |

## Adding a new city

1. Create a new directory named after the city slug (e.g. `kolkata/`).
2. Copy an existing city's `index.html` into it and update the title, meta description, and seller list.
3. Add the city's sellers to `public/buyers-config.json`.

## Updating sellers

Edit `public/buyers-config.json` — it is the canonical list of authorised sellers per city. Each entry needs a `name` and a `url`:

```json
{
  "delhi": [
    { "name": "Paytm",   "url": "https://paytm.com/metro/delhi" },
    { "name": "PhonePe", "url": "https://www.phonepe.com/metro" }
  ]
}
```

Also update the corresponding `{city}/index.html` seller list to keep the static fallback in sync.

## Deployment

The site is designed for **Netlify** or **Cloudflare Pages** — drop the repository root as the publish directory (no build command needed).

The `public/_redirects` file ensures all paths fall back to `index.html` so the dispatcher can handle city routes correctly.

## Local development

Open any city page directly in a browser, or serve the root with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080/delhi` (or any city slug).

## About ONDC

[ONDC (Open Network for Digital Commerce)](https://ondc.org) is an initiative by the Government of India to democratise digital commerce. This site is part of ONDC's metro ticketing discovery effort.
