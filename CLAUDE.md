# namou.ae — Video Deck UI

Interactive deal-structuring web app for Namou Properties LLC (UAE land & commercial real estate brokerage). Used by specialists during investor video calls to present plots, calculate ROI live, and drive toward offer submission.

## Stack

- Next.js 16 + React 19 + TypeScript 5
- Tailwind CSS 4
- Leaflet (interactive maps)
- Deployed via Vercel

## Structure

- `src/app/(dashboard)/` — main app pages behind sidebar layout
- `src/app/` — top-level routes (login, home, client)
- `src/components/` — shared components (Sidebar, TopBar, ContentCard, FilterPills, PlotMap)
- `src/data/` — mock data
- `spec/` — Jad's product requirements, UI reference screenshots, deck structure docx
- `reference/` — VC landing page mockups and concept images
- `brand/` — brand guideline PDF
- `public/` — static assets (images, fonts, icons)

## Key pages

- **Overview** — landing / intro to the opportunity
- **Master Plan** — interactive map via Leaflet
- **Categories** — land types (residential, commercial, industrial, mixed-use)
- **Assets / Asset Specs** — individual plot pages with specs
- **ROI** — explanation + interactive calculator (core feature)
- **JV Simulators** — build-sell, build-lease, build-hotel joint venture models
- **Gallery** — land photos, drone shots
- **CTA / Offer** — schedule site visit, submit offer
- **Agreement** — property introduction, A2A
- **Backend / Database** — admin pages

## Git

- **origin** → `will-rads/namou.ae_v1` (push + pull)
- **faxation** → `faxation/namou.ae1` (pull-only, never push)
- To sync latest from faxation: `git fetch faxation && git merge faxation/main`

## Current state

App is functional with all major sections built. Recent work focused on JV simulator layouts — 2x2 quadrant grids, compact spacing, P&L waterfall fitting at 100% zoom.

---

## Changelog

| Date | What changed |
|------|-------------|
| 2026-03-23 | Reorganized parent folder. Cloned latest from faxation/namou.ae1, set origin to will-rads. Added reference/ (VC mockups) and deck structure docx to spec/. |
