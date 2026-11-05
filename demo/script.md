# MinuteProof (Board Minutes Due Diligence) — demo script (3 minutes, for a novice viewer)

Companion to `demo/creative-brief.md`. Page: `http://127.0.0.1:4173/due-diligence.html`. Viewport assumption: 1440 × 900, theme `nebula-dark` (the page default). Rewritten on 2026-11-04 for the user's decision: "target 3 minutes for the demo video and make the script more accessible and explanatory to a novice."

**Planned vs observed.** Everything on screen is *planned* until a capture verifies it. Every number in narration is *bound* to a live field (`{summary.red_flags}` etc.); the spoken form shown in each scene is the value read from `http://127.0.0.1:4173/api/due-diligence/{summary,recurring,red-flags,spend}` on 2026-11-04. The scenario reads each value from the rendered element and checks it before narrating; if a spoken number would not match, the narration line changes, not the page.

**Voice (the user's decision):** Heart (`af_heart`, Kokoro, local stock voice) at speed 1.0, with subtle room tone, reverb and microphone character explicitly on. Captions, chapter titles and music off. **Timing basis:** a conservative 2.4 words/s (af_heart at speed 1.0 runs about 2.4–2.6), numbers counted as spoken words ("seven hundred eighteen" = 3), plus real holds so a novice can read what is named.

**Length:** target 180 s (the user's decision); ceiling 200 s (assumption), both cards included. Estimate: **≈ 193 s at 2.4 words/s, ≈ 180 s at 2.6** (391 spoken words).

## Writing rules for this cut (the user's decision: accessible to a novice)

- Every term is defined in plain words the first time: board minutes (the official record of what a board decided), due diligence (checking for problems before you buy or fund), red flag (something a buyer or funder should worry about), citation (the page it came from), Reducto (an AI document reader that turns pages into data you can check), DuckDB (a fast database that spots the patterns), piles (the posts in the water), deferred (put off).
- No unexplained jargon: no "extract", "schema", "endpoint" or "pipeline" in narration.
- Short sentences, one idea each; the narration tells the viewer where to look ("At the top", "Below", "Each dot", "This grid").
- **Product name (the user's decision; name chosen by the coordinator):** MinuteProof, tagline "Red flags from board minutes, with proof." It is the demo's name for this page and its Reducto + DuckDB pipeline; nothing implies a shipped product beyond the demo.
- Vision only over the outro card, worded as vision ("imagine…", "could…"); nothing visionary is stated as shipped.

## Cards (exact text)

**Intro card — hold ≈ 28 s; narration runs over it from ≈ 0.5 s; ≈ 1.5 s after it to finish reading line 3.** Order, per the user: the pain → what the system does → what you'll see.
- Headline: **MinuteProof**
- Line 1 (tagline + pain): Red flags from board minutes, with proof. Hundreds of pages, one deadline.
- Line 2 (system): Built on Reducto, an AI document reader that cites every finding to its page, and DuckDB, a database that finds what repeats.
- Line 3 (preview): You'll see: 718 pages of 1970s minutes → red flags → a problem that kept coming back → the original page.
- Narration (63 words; the name comes right after the pain beat):
  > When you buy a home or fund a group, you get its board minutes: the official record of what the board decided. Often hundreds of pages. Checking them for problems is called due diligence. This is MinuteProof. It uses Reducto, an AI document reader, to turn the pages into data you can check, and DuckDB, a fast database, to spot the patterns.
- 718 must equal `summary.pages_read` (the books' page count). No result claims.

**Outro card — hold ≈ 21 s; narration over the first ≈ 17 s, then ≈ 3.5 s silent hold so the last line is read.**
- Headline: **MinuteProof: 718 pages → cited red flags, with Reducto + DuckDB**
- Line 1: Next: a cited due-diligence report for every buyer, in minutes.
- Line 2 (last line, the user's decision): **Thank you for watching**
- Narration (40 words; the name, then vision only):
  > That's MinuteProof. Next, imagine this on any pile of minutes: a homeowners' association packet before a home closing, city council and school board minutes, nonprofits, or a lender's files. Every buyer could get a cited due-diligence report in minutes.

**Production note:** if a card can't carry narration, its narration moves into the adjacent scene (intro → start of scene 1, outro → end of scene 9) and each card holds silently for ≈ 5 s; the outro still ends on "Thank you for watching".

## Scenes

### 1. The result at the top — ≈ 13.5 s
- **On screen:** the hero: "718 pages of trust minutes → 128 red flags, each one quoted and linked to its page in the minutes".
- **Actions:** load the page; wait for `body[data-dd-ready="true"]`. No scrolling.
- **Focus:** "seven hundred eighteen pages" → `.dd-hero-title [data-count="pages_read"]`; "red flags" → `.dd-hero-title [data-count="red_flags"]`.
- **Narration (28 words, ≈ 11.5 s + 2 s hold):**
  > At the top: {summary.pages_read} pages of minutes became {summary.red_flags} red flags. A red flag is something a buyer or funder should worry about.
- **Values:** pages_read 718; red_flags 128.

### 2. The six tiles — ≈ 12 s
- **On screen:** the six stat tiles (Pages read, Meetings, Decisions extracted, Red flags, Deferred or unresolved, Approved spend) and the "≈ 24 hours of reading saved" pill.
- **Actions:** none or a short scroll so the tiles and pill sit mid-frame. Hold.
- **Focus:** the tile row `.dd-stats`; "put off or left unresolved" → `[data-count="deferred_or_unresolved"]`; "twenty-four hours" → `.dd-saved [data-count="reading_time_saved_hours"]`.
- **Narration (24 words, ≈ 10 s + 2 s hold):**
  > In the tiles below, {summary.deferred_or_unresolved} items were put off or left unresolved. And you skip about {round(summary.reading_time_saved_hours)} hours of reading.
- **Values:** deferred_or_unresolved 134; reading_time_saved_hours 23.93 → tile shows 24. Approved spend ($59,252; `total_committed_aud` 59,252.49), meetings (38) and decisions (968) are on screen, not narrated.

### 3. Every page, read — ≈ 8 s
- **On screen:** the "Every page, read." page map: one square per page across both books, red squares for flagged pages.
- **Actions:** scroll to `#dd-pagemap`. Hold. Do not click a square (it opens a new tab).
- **Focus:** the map `#dd-pagemap`; "Red squares" → a few `.dd-cell.is-flag` (or the legend `.dd-key-flag`).
- **Narration (14 words, ≈ 6 s + 2 s hold):**
  > This grid is every page, one square each. Red squares hold a red flag.

### 4. What keeps coming back: the wharf — ≈ 31 s
- **On screen:** "What keeps coming back"; the lead card "Nielsen Park wharf & pool piles": "Raised at 14 meetings across 1972–1975, flagged 19 times", its timeline dots, "Still deferred", and "Latest, 16 Mar 1975 · deferred" (the dangerous pile stump).
- **Actions:** smooth scroll to `[data-demo="recurring"]`. Hold on the lead card.
- **Focus:** card `[data-demo="recurring-card"][data-issue="wharf"]`; "fourteen meetings" → `[data-demo="recurring-meetings"]`; "flagged nineteen times" → `[data-demo="recurring-flagged"]`; "Each dot" → `[data-demo="recurring-timeline"]`; "The latest" → `[data-demo="recurring-latest"]` and `[data-demo="recurring-latest-status"]`.
- **Narration (68 words, ≈ 28.5 s + 2.5 s hold):**
  > Next: what keeps coming back. The top issue is the Nielsen Park wharf and its pool piles, the posts in the water. It was raised at {recurring[wharf].meetings} meetings, from {year(first_date)} to {year(last_date)}, and flagged {recurring[wharf].flagged_mentions} times. Each dot is a meeting. Red dots were flagged. The latest, in {month year(latest_date)}, is a dangerous old pile stump. It's still deferred, meaning put off.
- **Values (`recurring.json`, issue `wharf`):** label "Nielsen Park wharf & pool piles", 23 mentions, 14 meetings, 19 flagged, 1972-02-20 → 1975-03-16; latest 1975-03-16, `deferred`: "The Trust drew attention to the dangerous stump of the original Nielsen Park Pool concrete pile…" (p. 273).

### 5. Every flag carries its proof — ≈ 26.5 s
- **On screen:** after clicking the card, the red-flag list filtered to the wharf, oldest first ("Showing N flags for … oldest first · Clear"); the 20 Feb 1972 card with its reason, its quoted source text and "View page 7 →"; then the original PDF open at page 7.
- **Actions:** click the wharf card (filters and scrolls to the list). Hold on `[data-demo="flag"][data-item-id="1972-73-0017"]`. Click its `[data-demo="flag-page-link"]` (opens `./assets/docs/vaucluse-minutes-1972-73.pdf#page=7` in a new tab). Hold ≈ 3 s on the page.
- **Focus:** "Click the card" → `[data-demo="feed-filter"]`; "The board warned" → `[data-demo="flag-reason"]`; "exact text" → `[data-demo="flag-quote"]`; "citation … one click" → the link. No overlay on the PDF.
- **Narration (53 words, ≈ 22 s + ≈ 1.5 s click/load + ≈ 3 s on the page):**
  > Click the card. Its first flag is from February 1972. The board warned the wharf was getting worse, and two agencies couldn't agree who should maintain it. Below is the exact text, with its citation: the page it came from. One click opens that page, so you can check it yourself.
- **Observed source:** 1972–73 book, 20 Feb 1972, page 7; reason "The wharf's maintenance responsibility was unresolved, repairs were lacking, and the Trustees warned that deterioration could endanger public safety." Quote: "…expressing concern at the delay in the Service and the Maritime Services Board coming to an agreement as to the responsibility for maintaining the wharf." The page number is left to the link text.

### 6. Other problems that repeat — ≈ 10.5 s
- **On screen:** back on the page tab, scrolled up to the recurring cards: "White ants (termites)" (raised at 6 meetings, flagged 7 times) and "Kitchen restoration" (14 meetings, "Still deferred").
- **Actions:** close or leave the PDF tab; scroll to `[data-demo="recurring-card"][data-issue="white_ants"]` and `[data-issue="kitchen"]`. Hold.
- **Focus:** white ants card's `[data-demo="recurring-meetings"]`; kitchen card's "Still deferred" badge (`[data-issue="kitchen"] .dd-badge`).
- **Narration (21 words, ≈ 8.5 s + 2 s hold):**
  > Other problems repeat too. White ants, which are termites, come up at {recurring[white_ants].meetings} meetings. The kitchen restoration is still deferred, too.
- **Values:** white_ants: 6 meetings, 7 flagged, 1972-10-15 → 1975-03-16. kitchen: 14 meetings, 7 flagged, latest `deferred` (1975-04-13).

### 7. Filter by type — ≈ 6 s
- **On screen:** the red-flag list with its category buttons; "Repairs & maintenance" pressed, the list narrowed.
- **Actions:** scroll to `#dd-chips`; click `[data-demo="chip"][data-category="repair_maintenance"]` (this also clears the wharf filter). Hold.
- **Focus:** the chip row `#dd-chips`, then the pressed chip.
- **Narration (7 words, ≈ 3 s + 3 s hold):**
  > These buttons filter the flags by type.

### 8. Follow the money — ≈ 7.5 s
- **On screen:** "Spend over time": stacked bars by quarter, coloured by category; tooltip on one bar.
- **Actions:** scroll to `[data-demo="spend-chart"]`; hover `.dd-hit[data-period="1972-Q4"]` (the tallest quarter) so `#dd-tooltip` shows. Hold.
- **Focus:** the chart; then the tooltip.
- **Narration (9 words, ≈ 4 s + 3.5 s hold):**
  > This chart follows the money, three months per bar.
- **Values (`spend.json`):** the quarters sum to $59,252.49, matching "Approved spend"; 1972-Q4 is the tallest bar ($9,800); repairs & maintenance is the largest category ($31,698). No amount is narrated.

### 9. How it works, in plain words — ≈ 29 s
- **On screen:** the how-it-works strip (PDF minute books → Reducto Extract → DuckDB → This page) and "Extracted in ~6 min across 12 parallel Reducto jobs".
- **Actions:** scroll to `[data-demo="how-it-works"]`. Hold to the cut to the outro card.
- **Focus:** each step of `.dd-steps li` as it is named (one, two, three, four); "about six minutes" → `[data-demo="extract-time"]`.
- **Narration (64 words, ≈ 26.5 s + 2.5 s hold), ending on the user's takeaway verbatim:**
  > Here's how it works. One: Reducto reads every page. Two: it pulls out each decision, repair, dollar amount and dispute, and notes its page. Three: DuckDB groups them over time, to find what keeps coming back. Four: every claim links to its page. Here, the reading took about {round(summary.extract_minutes)} minutes. Hundreds of pages of board minutes became a cited red-flag report in minutes.
- **Values:** extract_minutes 5.8 → strip shows "~6 min"; extract_jobs 12 (on screen, not narrated).

### Optional opening, cut at this length: the listing (≈ 10 s)
On The Unlisted Project (`http://127.0.0.1:4173/#house=vaucluse-house`), highlight and click `[data-demo="listing-cta"]` ("Run due diligence on the board minutes →"). Narration (17 words): "This is the Vaucluse House listing on The Unlisted Project. Its board minutes are one click away." It would take the estimate to ≈ 203 s, over the ceiling; add only if the user wants it, ideally by trimming scene 4 or 9.

### Timing summary (Heart at Kokoro speed 1.0, budgeted at 2.4 words/s)

| # | Segment | Words | Est. seconds |
| --- | --- | --- | --- |
| card | Intro card (pain → MinuteProof and its system → preview) | 63 | 28 |
| 1 | The result at the top | 28 | 13.5 |
| 2 | The six tiles | 24 | 12 |
| 3 | Every page, read (page map) | 14 | 8 |
| 4 | What keeps coming back: the wharf | 68 | 31 |
| 5 | Cited flag → PDF page | 53 | 26.5 |
| 6 | Other problems that repeat | 21 | 10.5 |
| 7 | Filter by type | 7 | 6 |
| 8 | Follow the money | 9 | 7.5 |
| 9 | How it works + takeaway | 64 | 29 |
| card | Outro card ("That's MinuteProof", vision, then "Thank you for watching") | 40 | 21 |
| | **Total** | **391** | **≈ 193** (≈ 180 at 2.6 words/s); target 180, ceiling 200 (assumption) |

## Build priority

All elements below exist on the live page (checked in `site/due-diligence.html`, `site/due-diligence.js` and `site/global.js` on 2026-11-04); the cards are composition-level and need nothing on the page. Data: `/api/due-diligence/{summary,recurring,red-flags,spend}` (snapshots in `site/data/due-diligence/`).

### P0 — the video can't be made without it
1. **Ready signal:** `body[data-dd-ready="true"]` (set in `due-diligence.js`). Depends on: summary, recurring, red-flags.
2. **Hero counters (scene 1):** `[data-demo="hero"]`, `.dd-hero-title [data-count="pages_read"]`, `.dd-hero-title [data-count="red_flags"]`. Note: each `data-count` appears twice (hero title and tile), so scope the selector. Depends on: summary.
3. **Wharf card (scene 4):** `[data-demo="recurring-card"][data-issue="wharf"]` with `[data-demo="recurring-meetings"]`, `[data-demo="recurring-span"]`, `[data-demo="recurring-flagged"]`, `[data-demo="recurring-timeline"]` (`.dd-dot.is-flag`), `[data-demo="recurring-latest"]`, `[data-demo="recurring-latest-status"]`; `other` hidden. Depends on: recurring, items.
4. **Filtered list and the cited flag (scene 5):** clicking the card shows `[data-demo="feed-filter"]`; `[data-demo="flag"][data-item-id="1972-73-0017"]` with `[data-demo="flag-reason"]`, `[data-demo="flag-quote"]`, `a[data-demo="flag-page-link"]`. Depends on: red-flags, recurring.item_ids.
5. **The PDF opens at the page (scene 5):** `site/assets/docs/vaucluse-minutes-1972-73.pdf#page=7`, new tab. Risk for the first preview: the capture follows the new tab and Chrome's PDF viewer renders there.
6. **How-it-works strip (scene 9):** `[data-demo="how-it-works"]`, `.dd-steps li`, `[data-demo="extract-time"]`. Depends on: summary.extract_minutes, extract_jobs.

### P1 — the 3-minute story uses it
1. **Stat tiles and reading-time pill (scene 2):** `.dd-stats`, `[data-count="deferred_or_unresolved"]`, `.dd-saved [data-count="reading_time_saved_hours"]`. Depends on: summary.
2. **Page map (scene 3):** `#dd-pagemap`, `.dd-cell.is-flag`, legend `.dd-key-flag`. Depends on: items, red-flags.
3. **More recurring cards (scene 6):** `[data-demo="recurring-card"][data-issue="white_ants"]` and `[data-issue="kitchen"]` (with its `.dd-badge` "Still deferred"). Depends on: recurring.
4. **Category chips (scene 7):** `#dd-chips`, `[data-demo="chip"][data-category="repair_maintenance"]` (a chip click also clears the issue filter). Depends on: red-flags.
5. **Spend chart (scene 8):** `[data-demo="spend-chart"]`, hover target `.dd-hit[data-period="1972-Q4"]`, tooltip `#dd-tooltip`. Depends on: spend.

### P2 — optional
1. **Listing opening:** `[data-demo="listing-cta"]` on `index.html#house=vaucluse-house` (cut at this length).
2. **Theme switch:** `[data-demo="theme-select"]` (not used).
3. **Source badge:** `[data-demo="source-badge"]` (on screen, not narrated).

### Build gaps
None blocking. Two conveniences, not required: the stat-tile row and the page map have no `data-demo` attribute (the capture uses `.dd-stats` and `#dd-pagemap`, both stable today); adding `data-demo="stats"` and `data-demo="pagemap"` would make the scenario independent of class names.

## Strongest findings in the data (observed, absolute PDF pages, complete extracts)

Recurring issues in the final `recurring.json`, by flagged mentions: Nielsen Park wharf & pool piles 19 flagged / 14 meetings; Tea Room lease 15 / 22; Gardens and grounds 12 / 19; Finance and funding 9 / 35 (see the snapshot for the rest).

1. **Nielsen Park wharf & pool piles (1972-02-20 → 1975-03-16; 14 meetings, 19 flagged).** p. 7 (1972–73) the National Parks Service and the Maritime Services Board couldn't agree who maintains it, and deterioration could endanger public safety; p. 25 (12 Mar 1972) repairs urgent, no reply, risk notice and barrier required; p. 35 pile quotes with extra costs, acceptance left to the Service. In 1974–75: p. 13 (21 Jul 1974) no action on the dangerous wharf area until the Service made recommendations; p. 45 (31 Aug 1974) the damaged section is the Trust's responsibility, old timbers unusable, estimate $4,000–6,000 plus $30,000–40,000; p. 59 (15 Sep 1974) serious winter-gale damage, trustees split on repair or dismantling; p. 61 demolition or reconstruction discussed; p. 111 (20 Oct 1974) the Service will make it safe, future depends on Commonwealth storm funds, public advised it is unsafe; pp. 151, 163, 191, 243 the new pool pile unsatisfactory, payment withheld; p. 273 (16 Mar 1975) the original concrete pile stump is dangerous.
2. **Kitchen restoration stalled on the architect (my keyword count: 7 flagged meetings).** 1974–75 pp. 63, 157, 161, 189 no decision on the chimney breast and wind-break; p. 275 kitchen roof $3,256.62 "could not be met from currently available funds"; p. 311 still unresolved.
3. **White ants (termites) in the house (1972-10-15 → 1975-04).** 1972–73 p. 117 joists and ceilings ($1,000); p. 169 six Drawing Room floor joists ($230); p. 229 active infestation, serious structural damage, no regular pest control arrangement; p. 243 door-frame damage; 1974–75 p. 195 three more areas; p. 317 fresh outbreak in the costume room.
4. **Lifesaving liability.** 1972–73 p. 165 the Lifesaving Club can't provide patrols; p. 193 the Trust's legal liability to provide a lifesaver referred to the Crown Solicitor; pp. 217, 223, 241 no replies from the Service or the Crown Solicitor.
5. **Money running short.** 1972–73 p. 177 half-year shortfall $23,241.61 (expenditure $39,902.62, revenue $16,661.01); 1974–75 p. 321 maintenance funds exhausted; p. 391 architectural survey about $1,900 over its $3,000 ceiling; p. 403 commitments exceed the Special Purposes Account by $1,418.66.
6. **Tea Room lease and licence (1974-07 → 1975-06).** 1974–75 pp. 113, 153 (wine licence opposed by residents and council), 187, 311, 319, 355 lease cannot be finalised, lessee viability doubted.
7. **Rising damp.** 1974–75 pp. 195, 317, 351.
