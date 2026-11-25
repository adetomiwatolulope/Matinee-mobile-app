# Matinee Web SEO Strategy (implemented baseline)

## Goals
- Improve discovery for Matinee (Lagos/Nigeria-first) around films, cinemas, and showtimes.
- Keep sensitive/auth/account/ticket/admin surfaces non-indexable.

## Implemented (frontend/web baseline)
- **Brand favicon:** `assets/favicon.svg` (+ PNG fallback) using brand primary (`#012624`) and white mark; wired in `app.json` web favicon and `web/index.html`.
- **Dynamic titles (per screen/state):** `Welcome | Matinee`, `Create account | Matinee`, `Sign in | Matinee`, `Verify email | Matinee`, `Dashboard | Matinee` (set via `document.title` on web).
- **Head/metadata:** `web/index.html` includes charset/viewport, meta description, theme color, canonical-friendly base meta, Open Graph & Twitter cards (locale `en_NG`), and `WebSite` JSON-LD.
- **Crawl controls:** `public/robots.txt` (allow crawl) and `public/sitemap.xml` baseline. Sensitive flows (auth/verify/dashboard, future checkout/tickets/admin) should be `noindex`/disallowed when exposed as routable web pages.

## Recommended next steps (when public web routes exist)
- Route-based unique titles/descriptions/canonicals per public page (home, cinemas, films, showtimes).
- Add `Movie`, `MovieTheater`, `ScreeningEvent` JSON-LD only for Matinee-authoritative, rights-cleared data (note PRD TMDB commercial-use blocker).
- Generate sitemap from real public URLs; block parameterized/internal/auth/payment/admin paths.
- Optimize Core Web Vitals, semantic headings, internal linking, Lagos-local landing content; monitor via Search Console/analytics (consented).

