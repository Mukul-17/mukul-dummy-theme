# MODRN — Shopify theme (in progress)

This is the Shopify (Online Store 2.0) version of the mobile site. The static
site in the parent folder (`index.html` / `styles.css` / `script.js`) stays as
the design reference; this `theme/` folder is what gets pushed to Shopify.

## What's wired up so far
- `layout/theme.liquid` — page shell (fonts, CSS, JS, header + tab bar)
- `sections/header.liquid` — **dynamic logo** (Theme Editor) + cart count
- `sections/bestsellers.liquid` — **dynamic product slider** from a collection,
  with editable eyebrow / heading / CTA (Theme Editor)
- `sections/tab-bar.liquid` — bottom nav with editable labels + live bag count
- `snippets/product-card.liquid` — the reusable product card (replaces cardHTML)
- `templates/index.json` — homepage section order
- `assets/styles.css` — copied from the static site
- `assets/app.js` — starter JS (rail arrow, reveals, AJAX add-to-cart)

## How to preview
1. Install CLI:  `npm install -g @shopify/cli`
2. From this `theme/` folder:  `shopify theme dev --store YOUR-STORE.myshopify.com`
3. In the store admin, create a **Bestsellers** collection + a few products,
   then in the Theme Editor pick that collection in the Bestsellers section.

## Still to build (next steps)
- Required templates: `product.json`, `collection.json`, `cart.json`,
  `search.json`, `page.json`, `404.json`, `list-collections.json`, customers/*
- Port remaining sections from index.html: hero slider, anatomy, feel-the-fabric,
  trust, stats, reviews, final CTA, footer (each → `sections/*.liquid` + schema)
- Product page + variant picker + add-to-cart UI
- Cart drawer
- Reviews / Instagram via apps
- Trim the old data/cart code out of the ported script.js
