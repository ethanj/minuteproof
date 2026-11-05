# Board Minutes Due Diligence — build contract

One-hour hackathon. The goal is horizontal: something demoable end to end at all times. Ship the thin slice first, then polish.

**Pitch:** a home buyer, funder or auditor gets hundreds of pages of board minutes before a deadline. Reducto turns them into structured, cited rows, DuckDB finds the patterns, and the page shows the red flags with a link to the exact page for each one.
**Demo data:** the Vaucluse House trust minute books (`archives/vaucluse-house/vaucluse-house-minute-book-1972-1973.pdf` with 298 pages, and `...-1974-1975.pdf` with 420 pages).

## Pipeline (already running)

`due-diligence/run-extract.sh` writes Reducto Extract responses (with citations) to
`due-diligence/extracts/<book>_pNNN-MMM.json` (book is `1972-73` or `1974-75`; a 60-page chunk per file; `.part` = still running).
Schema: `due-diligence/schema.json`. Raw shape: `result.items[]`, where every field is `{value, citations[]}` and each citation has
`bbox.page`, `bbox.original_page` and `parentBlock.content` (the source paragraph).
`bbox.original_page` is the **absolute PDF page**; `bbox.page` is relative to the requested chunk's `page_range`.
Set `page` to `bbox.original_page` of the summary field's first citation. If that citation has no original page, use the minimum
`bbox.original_page` across all fields' citations. Use the selected citation's `parentBlock.content` as `quote`, falling back to
another field's source paragraph if needed.

## Flattened item (the shape both sides use)

```json
{
  "id": "1972-73-0007",
  "book": "1972-73",
  "pdf": "./assets/docs/vaucluse-minutes-1972-73.pdf",
  "meeting_date": "1972-02-20",
  "category": "repair_maintenance | capital_works | expenditure | income_funding | dispute_legal | insurance_risk | staffing | acquisition_collection | governance | other",
  "asset": "Nielsen Park wharf",
  "issue": "wharf",
  "summary": "one sentence",
  "amount_aud": 2690,
  "status": "approved | paid | proposed | deferred | rejected | unresolved | noted",
  "counterparty": "R. Contato",
  "red_flag": true,
  "red_flag_reason": "short reason or empty",
  "page": 7,
  "quote": "source paragraph from the citation's parentBlock.content"
}
```

`issue` is a normalized asset key that the data layer computes (lowercase keyword bucket such as `wharf`, `roof`, `turrets`, `garden`,
`stables`, `kitchen`, `collection`, `staff`, `insurance`, `finance`, or `other`), so recurring problems group together.
Match keywords over `asset` + `summary`. Apply `white_ants` (`/\b(white ants?|termites?|borers?)\b/i`) before generic buckets such as
walls or roof. Before matching buckets, strip contractor names with
`/\b(Sydney|Australian)\s+Bridge\s+and\s+Wharf(\s+Co\.?)?(\s+Pty\.?\s+Ltd\.?)?/gi`.
This stripping affects issue matching only; retain the original asset and summary in the flattened item.
Keep `wharf` restricted to wharf/jetty/pile references (`/\b(wharf|jetty|piles?)\b/i`), labelled "Nielsen Park wharf & pool piles";
a bare "Nielsen Park" or "enclosure" reference does not qualify. Assign any item mentioning Clark Island in its asset or summary
to `other`, even if it mentions a wharf. Match `lifebuoy`/`lifebuoys` in `lifesaving`, not `wharf`.
Split `tea_room` (`/\b(tea rooms?|kiosk|lease)\b/i`, label "Tea Room lease") from
`kitchen` (`/\bkitchen\b/i`). The `white_ants` label is "White ants (termites)". Every recurring issue has a human-readable `label`.
Exclude `other` from recurring results entirely; sort the remaining issues by flagged mentions, then mentions, descending.
For each recurring issue, take `latest_status` and `latest_summary` from its latest flagged mention if any exist, otherwise its
latest mention. `latest_date` is the `meeting_date` of that same selected mention (and can be null).
Order dates descending with null dates last, breaking ties by book, page and ID descending. `last_date` remains
the latest date across all mentions, so it can differ from `latest_date`.
Fixture with real rows, available now: `due-diligence/fixtures/sample-items.json` (16 items, no `issue` field yet).

## HTTP API (served by `scripts/serve.mjs`, backed by DuckDB `due-diligence/minutes.duckdb` through the `duckdb` CLI)

All endpoints are GET and return JSON. Each also has a static snapshot at `site/data/due-diligence/<name>.json` with the identical shape,
so the page works without the API (the frontend tries the API first, then the snapshot).

| Endpoint | Snapshot | Shape |
| --- | --- | --- |
| `/api/due-diligence/summary` | `summary.json` | `{ pages_read, books: [{book, pages, pdf}], meetings, items, red_flags, deferred_or_unresolved, total_committed_aud, date_range: {start, end}, reading_time_saved_hours, generated_at, extract_minutes, extract_jobs }` |
| `/api/due-diligence/red-flags` | `red-flags.json` | `[item]` with `red_flag = true`, newest first |
| `/api/due-diligence/recurring` | `recurring.json` | `[{ issue, label, mentions, meetings, flagged_mentions, first_date, last_date, span_days, total_aud, latest_status, latest_summary, latest_date, item_ids: [] }]`, sorted by flagged_mentions then mentions, desc; only issues mentioned at 2 or more meetings |
| `/api/due-diligence/spend` | `spend.json` | `[{ period: "1972-Q1" or "undated", category, amount_aud, items }]` |
| `/api/due-diligence/items` | `items.json` | `[item]`, every item, by date |

`reading_time_saved_hours` = pages_read × 2 minutes / 60. Every number shown in the interface must come from these endpoints, never be hard-coded.
`extract_minutes` = sum of each book's maximum extract response `duration` (seconds), divided by 60 and rounded to one decimal place:
chunks within a book ran in parallel. `extract_jobs` is the number of completed extract JSON files used by the loader.

`spend` includes positive amounts with status `approved` or `paid`, excluding category `income_funding`
and summaries matching `/recoup|voucher/i` (reimbursement bookkeeping that would double count commitments).
Rows without a `meeting_date` use period `"undated"`, grouped by category, rather than being dropped.
`summary.total_committed_aud` is the sum of these spend rows, rounded to cents, so the endpoint totals reconcile.

## Ownership (do not edit the other side's files)

- **Data layer (Codex):** `due-diligence/load.mjs`, `due-diligence/queries.sql`, `due-diligence/minutes.duckdb`,
  `site/data/due-diligence/*.json`, `scripts/serve.mjs` (add the `/api/due-diligence/*` route and serve `.woff2` as `font/woff2`;
  fonts break without it), copying both minute-book PDFs to `site/assets/docs/vaucluse-minutes-<book>.pdf`.
- **Interface (Claude):** `site/due-diligence.html`, `site/due-diligence.css`, `site/due-diligence.js`, plus a link from
  `site/index.html`'s top nav and a call-to-action on the Vaucluse House listing in `site/global.js`.
- **Shared, do not modify:** `site/assets/themes/` (a copy of `@atomicstrata/themes` 0.8.1, commit 41f3a5d), `due-diligence/schema.json`,
  `due-diligence/run-extract.sh`, `due-diligence/extracts/`.

## Environment

- The presenter's server is running on port 4173. **Do not stop it.** For your own testing, start another on `PORT=4180`.
- The Reducto key is in `../.env`. Workers do not need it; do not call Reducto.
- Node 22, DuckDB CLI at `/Users/ethan/.local/bin/duckdb`, no npm installs (the repo has zero dependencies; keep it that way).
- Not a git repo commit task. Do not commit or push.
