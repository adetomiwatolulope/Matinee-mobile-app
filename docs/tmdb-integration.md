# TMDB integration

## Status

The backend integration is implemented but disabled by default. It cannot be enabled until Product/Legal close PRD blocker D-02 and the operator sets both `TMDB_ENABLED=true` and `TMDB_COMMERCIAL_USE_APPROVED=true` with a valid `TMDB_API_KEY`.

No TMDB API key was obtained as part of this change. Apply for a key in your TMDB account settings.

## Official requirements

Sources:

- <https://developer.themoviedb.org/docs/faq>
- <https://developer.themoviedb.org/docs/rate-limiting>
- <https://developer.themoviedb.org/docs/errors>

TMDB states that the API is free for non-commercial use when TMDB is attributed, commercial use requires a licence, there is no SLA, and the API can change. The current upper rate limit is around 40 requests/second and may change; `429` responses must be respected.

Required attribution:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

The notice must be prominent, the approved TMDB logo must identify use of the API, the logo must be less prominent than the Matinee mark, attribution must live in the app's About/Credits section, and links should point to <https://www.themoviedb.org>. The API responses include the notice and link so a future discovery UI can render it.

## Backend boundary

The mobile app never receives or uses a TMDB key. It calls these authenticated backend endpoints:

- `GET /movies/now-playing?page=1`
- `GET /movies/search?q=...&page=1`
- `GET /movies/:id`

Only `Backend/tmdbAdapter.js` knows TMDB URL paths, response fields, and error codes. It maps those fields to Matinee-owned normalized movie types before anything else sees them. Unknown fields are ignored, so additive TMDB changes should not break the app.

## Cache TTLs

| Data | Fresh TTL | Rationale |
|---|---:|---|
| Now playing lists | 24 hours | Requirement says these change daily; one day bounds stale listings while avoiding repeated calls per user. |
| Movie details | 7 days | Core film metadata changes rarely. |
| Search results | 1 hour | Query results are more volatile and have a long tail of keys. |
| Stale fallback | 7 days maximum | If TMDB fails, cached data can be served past fresh TTL with `meta.stale=true`, but never beyond this bound. |

Redis stores each value as JSON with `cachedAt` and applies the longer of the fresh TTL and stale maximum as the Redis key expiry. Cache reads/writes are best-effort: a Redis read failure falls through to TMDB, and a Redis write failure does not fail the response. The Redis-backed rate limiter fails closed when Redis is unavailable.

Responses include `X-Matinee-Cache-Source` (`cache`, `network`, or `stale`), `X-Matinee-Cache-Age-Seconds`, and a JSON `meta` object so the UI can distinguish fresh, cached, stale, and failure states.

## Failures and rate limits

- Network errors, `429`, and `5xx` are retried with bounded exponential backoff plus jitter.
- `Retry-After` is honoured when TMDB supplies it.
- `4xx` errors other than `429` are not retried.
- Exhausted failures return `503 { "error": "Movie catalog temporarily unavailable" }` unless fresh or permitted stale cache exists.
- Each authenticated user is limited to 60 movie requests per 60 seconds by a shared Redis counter; configure with `MOVIE_API_RATE_LIMIT_MAX` and `MOVIE_API_RATE_LIMIT_WINDOW_SECONDS`.

## Configuration

Copy `Backend/.env.example` values into `Backend/.env` and set:

- `TMDB_ENABLED=true`
- `TMDB_COMMERCIAL_USE_APPROVED=true`
- `TMDB_API_KEY=<your key>`
- `REDIS_URL=<your Redis URL>`

Keep the API key server-side only. Logs intentionally omit TMDB URLs because they contain the key as a query parameter.
