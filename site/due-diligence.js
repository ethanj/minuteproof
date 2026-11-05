import { bindThemeSelect, getThemeController } from "./assets/themes/dist/index.js";

try {
  bindThemeSelect(document, getThemeController());
} catch (error) {
  console.warn("Theme select unavailable", error);
}

const DATASETS = ["summary", "red-flags", "recurring", "spend", "items"];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CATEGORY_LABELS = {
  repair_maintenance: "Repairs & maintenance",
  capital_works: "Capital works",
  expenditure: "Expenditure",
  income_funding: "Income & funding",
  dispute_legal: "Disputes & legal",
  insurance_risk: "Insurance & risk",
  staffing: "Staffing",
  acquisition_collection: "Collection",
  governance: "Governance",
  other: "Other",
};

const STATUS_TONE = {
  deferred: "warning",
  unresolved: "warning",
  proposed: "info",
  rejected: "danger",
  approved: "success",
  paid: "success",
  noted: "neutral",
};

// Chart colours come only from contract tokens, assigned in order of total spend.
const SERIES_TOKENS = [
  "var(--interactive-primary)",
  "var(--status-warning)",
  "var(--status-success)",
  "var(--status-info)",
  "var(--status-danger)",
  "var(--interactive-secondary)",
];
const OTHER_TOKEN = "var(--text-muted)";

const ISSUE_RULES = [
  ["wharf", /wharf|jetty|pier/i],
  ["roof", /roof|gutter|iron arch/i],
  ["turrets", /turret/i],
  ["garden", /garden|grounds|tree|lawn|seat/i],
  ["stables", /stable/i],
  ["kitchen", /kitchen/i],
  ["insurance", /insur/i],
  ["staff", /staff|employee|wage|salary|increment|caretaker|guide/i],
  ["collection", /candelabra|chair|mirror|portrait|furniture|collection|painting/i],
  ["finance", /budget|account|grant|fund|estate|\$/i],
];

const ui = {
  source: document.getElementById("dd-source"),
  eyebrow: document.getElementById("dd-eyebrow"),
  pagemap: document.getElementById("dd-pagemap-books"),
  recurring: document.getElementById("dd-recurring"),
  chips: document.getElementById("dd-chips"),
  feed: document.getElementById("dd-feed"),
  chart: document.getElementById("dd-chart"),
  legend: document.getElementById("dd-chart-legend"),
  tooltip: document.getElementById("dd-tooltip"),
  chartNote: document.getElementById("dd-chart-note"),
  howBooks: document.getElementById("dd-how-books"),
  generated: document.getElementById("dd-generated"),
  extractTime: document.querySelector('[data-demo="extract-time"]'),
  heroExtract: document.getElementById("dd-hero-extract"),
  feedFilter: document.querySelector('[data-demo="feed-filter"]'),
};

const FEED_PAGE = 12;
const COUNT_MS = 1300;
const state = { data: null, source: "loading", filter: "all", showAll: false, issueFilter: null, itemsById: new Map(), recurringByIssue: new Map() };

/* ---------- formatting ---------- */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

const audFormat = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const intFormat = new Intl.NumberFormat("en-AU");

function formatAUD(value) {
  return audFormat.format(Number(value) || 0).replace("A$", "$");
}

function formatCompactAUD(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, opts = { day: "numeric", month: "short", year: "numeric" }) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-AU", opts) : "Undated";
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || (category ? String(category).replace(/_/g, " ") : "Other");
}

// Only the two minute-book PDFs, and only positive integer pages, ever become links.
const PDF_PATTERN = /^\.\/assets\/docs\/vaucluse-minutes-\d{4}-\d{2}\.pdf$/;

function safePage(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function safePdf(value) {
  return typeof value === "string" && PDF_PATTERN.test(value) ? value : null;
}

function pageHref(item) {
  const pdf = safePdf(item?.pdf);
  const page = safePage(item?.page);
  return pdf && page ? `${pdf}#page=${page}` : null;
}

function pageText(item) {
  const page = safePage(item?.page);
  return page ? String(page) : "?";
}

function plural(n, word) {
  return `${intFormat.format(n)} ${word}${n === 1 ? "" : "s"}`;
}

/* ---------- data loading: API -> snapshot -> fixture ---------- */

async function fetchJSON(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("json")) throw new Error(`${url}: not JSON (${type})`);
  return response.json();
}

// Probe with summary first, so a missing source costs one request (and one console 404), not five.
async function loadFrom(prefix, suffix = "") {
  const summary = await fetchJSON(`${prefix}summary${suffix}`);
  const rest = await Promise.all(DATASETS.filter((name) => name !== "summary").map(async (name) => [name, await fetchJSON(`${prefix}${name}${suffix}`)]));
  return { summary, ...Object.fromEntries(rest) };
}

async function loadData() {
  try {
    return { source: "api", data: await loadFrom("/api/due-diligence/") };
  } catch {}
  try {
    return { source: "snapshot", data: await loadFrom("./data/due-diligence/", ".json") };
  } catch {}
  const items = await fetchJSON("./data/due-diligence/fixture-items.json");
  return { source: "fixture", data: deriveFromItems(items) };
}

function issueKey(item) {
  if (item.issue) return item.issue;
  const text = `${item.asset || ""} ${item.summary || ""}`;
  const hit = ISSUE_RULES.find(([, pattern]) => pattern.test(text));
  return hit ? hit[0] : "other";
}

function quarterOf(dateString) {
  const date = parseDate(dateString);
  if (!date) return null;
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

// Last-resort fallback: build every view from raw fixture rows, with the contract's formulas.
function deriveFromItems(rawItems) {
  const items = rawItems.map((item) => ({ ...item, issue: issueKey(item) })).sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date)));
  const bookPages = new Map();
  for (const item of items) {
    const current = bookPages.get(item.book) || { book: item.book, pages: 0, pdf: item.pdf };
    current.pages = Math.max(current.pages, Number(item.page) || 0);
    bookPages.set(item.book, current);
  }
  const books = [...bookPages.values()];
  const pagesRead = books.reduce((sum, book) => sum + book.pages, 0);
  const meetings = new Set(items.map((item) => item.meeting_date)).size;
  const dates = items.map((item) => item.meeting_date).filter(Boolean).sort();
  const committed = items.filter((item) => ["approved", "paid"].includes(item.status)).reduce((sum, item) => sum + (Number(item.amount_aud) || 0), 0);
  const summary = {
    pages_read: pagesRead,
    books,
    meetings,
    items: items.length,
    red_flags: items.filter((item) => item.red_flag).length,
    deferred_or_unresolved: items.filter((item) => ["deferred", "unresolved"].includes(item.status)).length,
    total_committed_aud: committed,
    date_range: { start: dates[0] || null, end: dates[dates.length - 1] || null },
    reading_time_saved_hours: (pagesRead * 2) / 60,
    generated_at: null,
  };

  const redFlags = items.filter((item) => item.red_flag).sort((a, b) => String(b.meeting_date).localeCompare(String(a.meeting_date)));

  const groups = new Map();
  for (const item of items) {
    if (item.issue === "other") continue;
    const list = groups.get(item.issue) || [];
    list.push(item);
    groups.set(item.issue, list);
  }
  const recurring = [...groups.entries()]
    .map(([issue, list]) => {
      const meetingSet = new Set(list.map((item) => item.meeting_date));
      const first = list[0];
      const last = list[list.length - 1];
      const span = parseDate(last.meeting_date) - parseDate(first.meeting_date);
      return {
        issue,
        label: issue.charAt(0).toUpperCase() + issue.slice(1),
        mentions: list.length,
        meetings: meetingSet.size,
        flagged_mentions: list.filter((item) => item.red_flag).length,
        first_date: first.meeting_date,
        last_date: last.meeting_date,
        span_days: Math.round(span / 86_400_000) || 0,
        total_aud: list.reduce((sum, item) => sum + (Number(item.amount_aud) || 0), 0),
        latest_status: last.status,
        latest_summary: last.summary,
        item_ids: list.map((item) => item.id),
      };
    })
    .filter((row) => row.meetings >= 2)
    .sort((a, b) => b.flagged_mentions - a.flagged_mentions || b.mentions - a.mentions);

  const spendMap = new Map();
  for (const item of items) {
    const amount = Number(item.amount_aud) || 0;
    const period = quarterOf(item.meeting_date);
    if (!amount || !period) continue;
    const key = `${period}|${item.category}`;
    const row = spendMap.get(key) || { period, category: item.category, amount_aud: 0, items: 0 };
    row.amount_aud += amount;
    row.items += 1;
    spendMap.set(key, row);
  }

  return { summary, "red-flags": redFlags, recurring, spend: [...spendMap.values()], items };
}

/* ---------- source badge ---------- */

function renderSource(source) {
  const labels = { api: "Live from DuckDB", snapshot: "DuckDB snapshot", fixture: "Sample fixture", error: "Data unavailable" };
  ui.source.dataset.source = source;
  ui.source.querySelector("span").textContent = labels[source] || source;
  ui.source.title = {
    api: "Answered by /api/due-diligence, querying DuckDB now",
    snapshot: "Answered by the static JSON snapshot exported from DuckDB",
    fixture: "API and snapshot not available yet: views derived in the browser from sample rows",
    error: "No data source answered",
  }[source] || "";
}

/* ---------- hero ---------- */

function animateCount(el, target, format) {
  const render = (value) => {
    if (format === "aud") el.textContent = formatAUD(value);
    else if (format === "hours") el.textContent = intFormat.format(Math.round(value));
    else el.textContent = intFormat.format(Math.round(value));
  };
  if (reduceMotion || !Number.isFinite(target)) {
    render(Number(target) || 0);
    return Promise.resolve();
  }
  const duration = COUNT_MS;
  const start = performance.now();
  let done = false;
  return new Promise((resolve) => {
    const finish = () => {
      if (done) return;
      done = true;
      render(target);
      resolve();
    };
    const step = (now) => {
      if (done) return;
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) return finish();
      render(target * (1 - Math.pow(1 - t, 4)));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // rAF pauses in background tabs; the timer guarantees the final value on time.
    setTimeout(finish, duration + 30);
  });
}

function renderHero(summary) {
  const counters = [...document.querySelectorAll("[data-count]")].map((el) => animateCount(el, Number(summary[el.dataset.count]) || 0, el.dataset.format));
  const minutes = Number(summary.extract_minutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    const text = minutes < 1.5 ? "about a minute" : `about ${Math.round(minutes)} minutes`;
    const jobs = Number(summary.extract_jobs);
    ui.extractTime.textContent = `Extracted in ~${Math.max(1, Math.round(minutes))} min${jobs > 0 ? ` across ${intFormat.format(jobs)} parallel Reducto job${jobs === 1 ? "" : "s"}` : ""}`;
    ui.extractTime.hidden = false;
    ui.heroExtract.textContent = `, extracted in ${text}`;
  }
  const range = summary.date_range || {};
  const startYear = parseDate(range.start)?.getFullYear();
  const endYear = parseDate(range.end)?.getFullYear();
  const years = startYear && endYear ? (startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`) : "";
  const books = summary.books || [];
  ui.eyebrow.textContent = `MinuteProof · Vaucluse House Trust · ${plural(books.length, "minute book")}${years ? ` · ${years}` : ""}`;
  ui.howBooks.textContent = books.map((book) => `${book.book}: ${plural(Number(book.pages) || 0, "page")}`).join(" · ") || "Scanned minute books";
  if (summary.generated_at) {
    ui.generated.textContent = `Generated ${new Date(summary.generated_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}`;
  }
  return Promise.all(counters);
}

function renderPageMap(summary, items) {
  const books = summary.books || [];
  const byPage = new Map();
  for (const item of items) {
    const key = `${item.book}|${item.page}`;
    const entry = byPage.get(key) || { flagged: null, count: 0 };
    entry.count += 1;
    if (item.red_flag && !entry.flagged) entry.flagged = item;
    byPage.set(key, entry);
  }
  ui.pagemap.innerHTML = books
    .map((book) => {
      const pages = Number(book.pages) || 0;
      let flaggedPages = 0;
      const cells = [];
      for (let page = 1; page <= pages; page += 1) {
        const entry = byPage.get(`${book.book}|${page}`);
        const delay = reduceMotion ? 0 : Math.min(page * 2, 900);
        if (entry?.flagged) {
          flaggedPages += 1;
          const item = entry.flagged;
          const href = pageHref({ pdf: book.pdf || item.pdf, page });
          const reason = escapeHTML(item.red_flag_reason || item.summary);
          cells.push(
            href
              ? `<a class="dd-cell is-flag" style="--d:${delay}ms" href="${escapeHTML(href)}" target="_blank" rel="noopener" title="Page ${page}: ${reason}" aria-label="Page ${page}, red flag: ${reason}"></a>`
              : `<span class="dd-cell is-flag" style="--d:${delay}ms" title="Page ${page}: ${reason}"></span>`,
          );
        } else {
          cells.push(`<span class="dd-cell${entry ? " is-item" : ""}" style="--d:${delay}ms" title="Page ${page}${entry ? `: ${plural(entry.count, "decision")}` : ""}"></span>`);
        }
      }
      return `
        <div class="dd-book">
          <div class="dd-book-head"><b>Minute book ${escapeHTML(book.book)}</b><span>${plural(pages, "page")} · <em>${plural(flaggedPages, "flagged page")}</em></span></div>
          <div class="dd-cells">${cells.join("")}</div>
        </div>`;
    })
    .join("");
}

/* ---------- recurring ---------- */

function topAsset(items) {
  const counts = new Map();
  for (const item of items) {
    const asset = String(item.asset || "").trim();
    if (asset && asset.length <= 48) counts.set(asset.toLowerCase(), { name: asset, n: (counts.get(asset.toLowerCase())?.n || 0) + 1 });
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  return best && best.n >= 2 ? best.name : "";
}

function leadFlags(mentions) {
  const flagged = mentions.filter((item) => item.red_flag);
  if (!flagged.length) return "";
  const picks = flagged.length <= 4 ? flagged : [flagged[0], ...flagged.slice(-3)];
  return `
    <ol class="dd-lead-flags" aria-label="Flagged mentions">
      ${picks
        .map(
          (item, i) => `${i === 1 && flagged.length > 4 ? `<li class="dd-lead-gap">… ${plural(flagged.length - 4, "more flag")} in between …</li>` : ""}
        <li>
          <time datetime="${escapeHTML(item.meeting_date)}">${escapeHTML(formatDate(item.meeting_date, { month: "short", year: "numeric" }))}</time>
          <span>${escapeHTML(item.red_flag_reason || item.summary)}</span>
          ${pageHref(item) ? `<a href="${escapeHTML(pageHref(item))}" target="_blank" rel="noopener">p.${pageText(item)} →</a>` : ""}
        </li>`,
        )
        .join("")}
    </ol>`;
}

function renderRecurring(allRecurring, summary) {
  // "other" is the catch-all bucket, not a recurring issue.
  const recurring = allRecurring.filter((row) => row.issue && row.issue !== "other");
  if (!recurring.length) {
    ui.recurring.innerHTML = `<p class="dd-empty">No issue has come up at two or more meetings in the data loaded so far.</p>`;
    return;
  }
  const range = summary.date_range || {};
  const start = parseDate(range.start) || parseDate(recurring.reduce((min, r) => (r.first_date < min ? r.first_date : min), recurring[0].first_date));
  const end = parseDate(range.end) || parseDate(recurring.reduce((max, r) => (r.last_date > max ? r.last_date : max), recurring[0].last_date));
  const total = Math.max(1, end - start);
  const position = (dateString) => {
    const date = parseDate(dateString);
    return date ? Math.min(100, Math.max(0, ((date - start) / total) * 100)) : 0;
  };
  const startLabel = formatDate(start.toISOString(), { month: "short", year: "numeric" });
  const endLabel = formatDate(end.toISOString(), { month: "short", year: "numeric" });

  ui.recurring.innerHTML = recurring
    .slice(0, 9)
    .map((row, index) => {
      const mentions = (row.item_ids || []).map((id) => state.itemsById.get(id)).filter(Boolean);
      // One dot per meeting; red when anything at that meeting was flagged.
      const byMeeting = new Map();
      for (const item of mentions) {
        const list = byMeeting.get(item.meeting_date) || [];
        list.push(item);
        byMeeting.set(item.meeting_date, list);
      }
      const dots = byMeeting.size
        ? [...byMeeting.entries()]
            .map(([date, list]) => {
              const item = list.find((x) => x.red_flag) || list[0];
              const flagged = list.filter((x) => x.red_flag).length;
              const href = pageHref(item);
              const title = escapeHTML(`${formatDate(date)}: ${plural(list.length, "mention")}${flagged ? `, ${flagged} flagged` : ""}. Page ${pageText(item)}: ${item.red_flag_reason || item.summary || ""}`);
              const label = escapeHTML(`${formatDate(date)}, page ${pageText(item)}${flagged ? ", red flag" : ""}`);
              const attrs = `class="dd-dot${flagged ? " is-flag" : ""}" style="left:${position(date)}%" data-flagged="${flagged ? "true" : "false"}" data-date="${escapeHTML(date)}" title="${title}"`;
              return href ? `<a ${attrs} href="${escapeHTML(href)}" target="_blank" rel="noopener" aria-label="${label}"></a>` : `<span ${attrs} aria-label="${label}"></span>`;
            })
            .join("")
        : [row.first_date, row.last_date].map((d) => `<span class="dd-dot" style="left:${position(d)}%"></span>`).join("");
      const firstYear = parseDate(row.first_date)?.getFullYear();
      const lastYear = parseDate(row.last_date)?.getFullYear();
      const yearSpan = firstYear && lastYear ? (firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`) : "";
      const tone = STATUS_TONE[row.latest_status] || "neutral";
      const asset = topAsset(mentions.filter((item) => item.red_flag).length >= 2 ? mentions.filter((item) => item.red_flag) : mentions);
      const years = Math.round((row.span_days / 365) * 10) / 10;
      const spanText = row.span_days >= 330 ? `${years} year${years === 1 ? "" : "s"}` : row.span_days >= 45 ? `${Math.round(row.span_days / 30)} months` : `${row.span_days} days`;
      const unresolved = ["deferred", "unresolved", "proposed"].includes(row.latest_status);
      const displayLabel = asset && asset.toLowerCase().includes(String(row.label).toLowerCase()) ? asset : row.label;
      state.recurringByIssue.set(row.issue, { ...row, displayLabel });
      const flaggedCount = (row.item_ids || []).filter((id) => state.itemsById.get(id)?.red_flag).length || row.flagged_mentions;
      return `
        <article class="dd-issue${index === 0 ? " is-lead" : ""}${row.flagged_mentions ? " has-flags" : ""}" data-demo="recurring-card" data-issue="${escapeHTML(row.issue)}" tabindex="0" role="button" aria-label="Show the ${plural(flaggedCount, "red flag")} for ${escapeHTML(displayLabel)}">
          <header>
            <h3>${escapeHTML(row.label)}${asset && !String(row.label).toLowerCase().includes(asset.toLowerCase()) ? `<small>${escapeHTML(asset)}</small>` : ""}</h3>
            ${unresolved ? `<span class="dd-badge dd-tone-${tone}">Still ${escapeHTML(row.latest_status)}</span>` : ""}
          </header>
          <p class="dd-issue-headline">Raised at <b data-demo="recurring-meetings">${plural(row.meetings, "meeting")}</b> across <b data-demo="recurring-span" title="${escapeHTML(spanText)}">${escapeHTML(yearSpan)}</b>, flagged <b class="dd-flag-ink" data-demo="recurring-flagged">${plural(row.flagged_mentions || 0, "time")}</b>.</p>
          <div class="dd-track" data-demo="recurring-timeline" aria-label="Mentions from ${escapeHTML(formatDate(row.first_date))} to ${escapeHTML(formatDate(row.last_date))}">
            <span class="dd-track-span" style="left:${position(row.first_date)}%;width:${Math.max(0.5, position(row.last_date) - position(row.first_date))}%"></span>
            ${dots}
          </div>
          <div class="dd-track-axis"><span>${escapeHTML(startLabel)}</span><span>${escapeHTML(endLabel)}</span></div>
          <p class="dd-issue-latest" data-demo="recurring-latest"><span>${row.latest_date ? `Latest, ${escapeHTML(formatDate(row.latest_date))}` : `Last mentioned ${escapeHTML(formatDate(row.last_date))}`}</span> <span class="dd-badge dd-tone-${tone}" data-demo="recurring-latest-status">${escapeHTML(row.latest_status || "noted")}</span> ${escapeHTML(row.latest_summary || "")}</p>
          ${flaggedCount ? `<p class="dd-issue-cta">Show the ${plural(flaggedCount, "flag")} <span aria-hidden="true">↓</span></p>` : ""}
          ${row.total_aud ? `<p class="dd-issue-money">${formatAUD(row.total_aud)} recorded against it</p>` : ""}
          ${index === 0 ? leadFlags(mentions) : ""}
        </article>`;
    })
    .join("");
}

/* ---------- red flags ---------- */

function renderChips(flags) {
  const counts = new Map();
  for (const item of flags) counts.set(item.category, (counts.get(item.category) || 0) + 1);
  const chips = [["all", "All", flags.length], ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => [cat, categoryLabel(cat), n])];
  ui.chips.innerHTML = chips
    .map(([value, label, n]) => `<button type="button" class="dd-chip" data-demo="chip" data-category="${escapeHTML(value)}" data-filter="${escapeHTML(value)}" aria-pressed="${state.filter === value}">${escapeHTML(label)} <span>${n}</span></button>`)
    .join("");
}

function renderFeedFilter(count) {
  const f = state.issueFilter;
  if (!f) {
    ui.feedFilter.hidden = true;
    ui.feedFilter.innerHTML = "";
    return;
  }
  ui.feedFilter.innerHTML = `<span>Showing <b>${plural(count, "flag")}</b> for <b>${escapeHTML(f.label)}</b>, oldest first</span> · <button type="button" data-clear-filter>Clear</button>`;
  ui.feedFilter.hidden = false;
}

function renderFeed(flags) {
  let visible;
  if (state.issueFilter) {
    const ids = state.issueFilter.ids;
    visible = flags.filter((item) => ids.has(item.id)).sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date)) || Number(a.page) - Number(b.page));
  } else {
    visible = state.filter === "all" ? flags : flags.filter((item) => item.category === state.filter);
  }
  renderFeedFilter(visible.length);
  if (!visible.length) {
    ui.feed.innerHTML = `<p class="dd-empty">No red flags match this filter.</p>`;
    return;
  }
  const shown = state.showAll || state.issueFilter ? visible : visible.slice(0, FEED_PAGE);
  const more = visible.length - shown.length;
  ui.feed.innerHTML = shown
    .map((item) => {
      const tone = STATUS_TONE[item.status] || "neutral";
      return `
        <article class="dd-flag" data-demo="flag" data-item-id="${escapeHTML(item.id)}" data-issue="${escapeHTML(item.issue || "")}" data-date="${escapeHTML(item.meeting_date)}" data-page="${escapeHTML(safePage(item.page) ?? "")}">
          <header class="dd-flag-meta">
            <time datetime="${escapeHTML(item.meeting_date)}">${escapeHTML(formatDate(item.meeting_date))}</time>
            <span class="dd-cat">${escapeHTML(categoryLabel(item.category))}</span>
            <span class="dd-badge dd-tone-${tone}">${escapeHTML(item.status || "noted")}</span>
            ${Number(item.amount_aud) ? `<span class="dd-amount">${formatAUD(item.amount_aud)}</span>` : ""}
          </header>
          <h3 data-demo="flag-reason">${escapeHTML(item.red_flag_reason || item.summary)}</h3>
          ${item.asset ? `<p class="dd-asset">${escapeHTML(item.asset)}${item.counterparty ? ` · ${escapeHTML(item.counterparty)}` : ""}</p>` : item.counterparty ? `<p class="dd-asset">${escapeHTML(item.counterparty)}</p>` : ""}
          ${item.quote ? `<blockquote data-demo="flag-quote" id="q-${escapeHTML(item.id)}">${escapeHTML(item.quote.replace(/\s*\n\s*/g, " "))}</blockquote><button type="button" class="dd-quote-toggle" aria-expanded="false" aria-controls="q-${escapeHTML(item.id)}">Show full quote</button>` : ""}
          <p class="dd-page-row">${pageHref(item) ? `<a class="dd-page-link" data-demo="flag-page-link" href="${escapeHTML(pageHref(item))}" target="_blank" rel="noopener">View page ${pageText(item)} →</a>` : `<span class="dd-page-link is-missing">Page not cited</span>`}<small>Minute book ${escapeHTML(item.book)}</small></p>
        </article>`;
    })
    .join("") + (more > 0 ? `<button type="button" class="dd-more" data-show-all>Show all ${intFormat.format(visible.length)} red flags</button>` : "");
}

ui.feed.addEventListener("click", (event) => {
  if (event.target.closest("[data-show-all]")) {
    state.showAll = true;
    renderFeed(state.data["red-flags"]);
    return;
  }
  const toggle = event.target.closest(".dd-quote-toggle");
  if (toggle) {
    const quote = document.getElementById(toggle.getAttribute("aria-controls"));
    const open = toggle.getAttribute("aria-expanded") !== "true";
    quote?.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Show less" : "Show full quote";
  }
});

function filterByIssue(issue) {
  const row = state.recurringByIssue.get(issue);
  if (!row || !state.data) return;
  state.issueFilter = { issue, label: row.displayLabel || row.label, ids: new Set(row.item_ids || []) };
  state.filter = "all";
  ui.chips.querySelectorAll("[data-filter]").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.filter === "all")));
  document.querySelectorAll('[data-demo="recurring-card"]').forEach((el) => el.classList.toggle("is-active", el.dataset.issue === issue));
  renderFeed(state.data["red-flags"]);
  document.getElementById("flags").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

function clearIssueFilter() {
  state.issueFilter = null;
  state.showAll = false;
  document.querySelectorAll('[data-demo="recurring-card"].is-active').forEach((el) => el.classList.remove("is-active"));
  renderFeed(state.data["red-flags"]);
}

ui.recurring.addEventListener("click", (event) => {
  if (event.target.closest("a")) return; // dots and page links open the PDF instead
  const card = event.target.closest('[data-demo="recurring-card"]');
  if (card) filterByIssue(card.dataset.issue);
});
ui.recurring.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest('[data-demo="recurring-card"]');
  if (!card || event.target !== card) return;
  event.preventDefault();
  filterByIssue(card.dataset.issue);
});
ui.feedFilter.addEventListener("click", (event) => {
  if (event.target.closest("[data-clear-filter]")) clearIssueFilter();
});

ui.chips.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-filter]");
  if (!chip || !state.data) return;
  state.filter = chip.dataset.filter;
  state.issueFilter = null;
  document.querySelectorAll('[data-demo="recurring-card"].is-active').forEach((el) => el.classList.remove("is-active"));
  state.showAll = false;
  ui.chips.querySelectorAll("[data-filter]").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.filter === state.filter)));
  renderFeed(state.data["red-flags"]);
});

/* ---------- spend chart ---------- */

function renderSpend(spend) {
  // Only real quarters go on the time axis; anything else (the "undated" period) becomes a note under the chart.
  const isQuarter = (row) => /^\d{4}-Q[1-4]$/.test(String(row.period));
  const rows = spend.filter((row) => Number(row.amount_aud) > 0 && isQuarter(row));
  const offAxis = spend.filter((row) => Number(row.amount_aud) > 0 && !isQuarter(row));
  const offAmount = offAxis.reduce((sum, row) => sum + Number(row.amount_aud), 0);
  const offItems = offAxis.reduce((sum, row) => sum + (Number(row.items) || 0), 0);
  ui.chartNote.hidden = !offAmount;
  ui.chartNote.textContent = offAmount ? `Plus ${formatAUD(offAmount)} undated${offItems ? ` (${plural(offItems, "item")})` : ""}: recorded in the minutes without a meeting date, so not on the timeline.` : "";
  if (!rows.length) {
    ui.chart.innerHTML = `<p class="dd-empty">No amounts recorded yet.</p>`;
    ui.legend.innerHTML = "";
    return;
  }
  const totals = new Map();
  for (const row of rows) totals.set(row.category, (totals.get(row.category) || 0) + Number(row.amount_aud));
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([cat]) => cat);
  const named = ranked.slice(0, SERIES_TOKENS.length);
  const colorOf = (cat) => (named.includes(cat) ? SERIES_TOKENS[named.indexOf(cat)] : OTHER_TOKEN);
  const seriesOf = (cat) => (named.includes(cat) ? cat : "__other");

  // Fill every quarter between the first and last so gaps read as gaps.
  const periods = [...new Set(rows.map((row) => row.period))].sort();
  const [y0, q0] = periods[0].split("-Q").map(Number);
  const [y1, q1] = periods[periods.length - 1].split("-Q").map(Number);
  const allPeriods = [];
  for (let y = y0, q = q0; y < y1 || (y === y1 && q <= q1); q === 4 ? ((q = 1), (y += 1)) : (q += 1)) allPeriods.push(`${y}-Q${q}`);

  const stacks = allPeriods.map((period) => {
    const segs = new Map();
    for (const row of rows.filter((r) => r.period === period)) {
      const key = seriesOf(row.category);
      const seg = segs.get(key) || { key, category: key === "__other" ? "Other categories" : categoryLabel(row.category), amount: 0, items: 0, color: colorOf(row.category) };
      seg.amount += Number(row.amount_aud);
      seg.items += Number(row.items) || 0;
      segs.set(key, seg);
    }
    const order = [...named, "__other"];
    const list = [...segs.values()].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    return { period, segs: list, total: list.reduce((s, x) => s + x.amount, 0) };
  });

  const max = Math.max(...stacks.map((s) => s.total));
  const niceMax = (() => {
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((v) => v >= max) || max;
  })();

  const W = 760, H = 300, padL = 52, padR = 8, padT = 12, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const band = plotW / stacks.length;
  const barW = Math.min(44, band * 0.62);
  const y = (v) => padT + plotH - (v / niceMax) * plotH;

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => `<g class="dd-grid"><line x1="${padL}" x2="${W - padR}" y1="${y(niceMax * f)}" y2="${y(niceMax * f)}"/><text x="${padL - 8}" y="${y(niceMax * f) + 4}" text-anchor="end">${formatCompactAUD(niceMax * f)}</text></g>`)
    .join("");

  const bars = stacks
    .map((stack, i) => {
      const x = padL + band * i + (band - barW) / 2;
      let acc = 0;
      const segs = stack.segs
        .map((seg, j) => {
          const top = y(acc + seg.amount);
          const h = Math.max(0, y(acc) - top);
          acc += seg.amount;
          return `<rect class="dd-seg" x="${x}" y="${top}" width="${barW}" height="${h}" rx="${j === stack.segs.length - 1 ? 3 : 0}" style="fill:${seg.color};--i:${i}" data-period="${stack.period}" data-seg="${j}"></rect>`;
        })
        .join("");
      const [yr, q] = stack.period.split("-");
      const label = q === "Q1" || i === 0 ? `<tspan x="${x + barW / 2}" dy="0">${q}</tspan><tspan x="${x + barW / 2}" dy="13" class="dd-year">${yr}</tspan>` : `<tspan x="${x + barW / 2}">${q}</tspan>`;
      return `<g>${segs}<text class="dd-xlabel" x="${x + barW / 2}" y="${H - padB + 16}" text-anchor="middle">${label}</text><rect class="dd-hit" x="${padL + band * i}" y="${padT}" width="${band}" height="${plotH}" data-period="${stack.period}"></rect></g>`;
    })
    .join("");

  ui.chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recorded spend by quarter, ${escapeHTML(allPeriods[0])} to ${escapeHTML(allPeriods[allPeriods.length - 1])}">${grid}${bars}</svg>`;
  ui.legend.innerHTML = [...named.map((cat) => [categoryLabel(cat), colorOf(cat)]), ...(ranked.length > named.length ? [["Other categories", OTHER_TOKEN]] : [])]
    .map(([label, color]) => `<span><i style="background:${color}"></i>${escapeHTML(label)}</span>`)
    .join("");

  const byPeriod = new Map(stacks.map((s) => [s.period, s]));
  const card = ui.chart.parentElement;
  const show = (event) => {
    const target = event.target.closest("[data-period]");
    if (!target) return hide();
    const stack = byPeriod.get(target.dataset.period);
    if (!stack || !stack.total) return hide();
    ui.tooltip.innerHTML = `<b>${escapeHTML(stack.period.replace("-", " "))}</b><span class="dd-tip-total">${formatAUD(stack.total)}</span>${stack.segs
      .slice()
      .reverse()
      .map((seg) => `<span class="dd-tip-row"><i style="background:${seg.color}"></i>${escapeHTML(seg.category)}<em>${formatAUD(seg.amount)}</em></span>`)
      .join("")}`;
    ui.tooltip.hidden = false;
    const rect = card.getBoundingClientRect();
    const tipW = ui.tooltip.offsetWidth;
    let left = event.clientX - rect.left + 14;
    if (left + tipW > rect.width - 8) left = event.clientX - rect.left - tipW - 14;
    ui.tooltip.style.left = `${Math.max(8, left)}px`;
    ui.tooltip.style.top = `${Math.max(8, event.clientY - rect.top - 20)}px`;
    ui.chart.querySelectorAll(".dd-seg").forEach((el) => el.classList.toggle("is-dim", el.dataset.period !== stack.period));
  };
  const hide = () => {
    ui.tooltip.hidden = true;
    ui.chart.querySelectorAll(".is-dim").forEach((el) => el.classList.remove("is-dim"));
  };
  ui.chart.onpointermove = show;
  ui.chart.onpointerdown = show;
  ui.chart.onpointerleave = hide;
}

/* ---------- boot ---------- */

async function boot() {
  let result;
  try {
    result = await loadData();
  } catch (error) {
    console.warn("No due-diligence data source answered", error);
    renderSource("error");
    ui.feed.innerHTML = `<p class="dd-empty">No data yet. The extraction is still running; refresh in a minute.</p>`;
    return;
  }
  const { source, data } = result;
  state.data = data;
  state.source = source;
  const items = Array.isArray(data.items) ? data.items : [];
  state.itemsById = new Map(items.map((item) => [item.id, item]));
  renderSource(source);
  const countersDone = renderHero(data.summary || {});
  renderPageMap(data.summary || {}, items.length ? items : data["red-flags"] || []);
  renderRecurring(data.recurring || [], data.summary || {});
  renderChips(data["red-flags"] || []);
  renderFeed(data["red-flags"] || []);
  try {
    renderSpend(data.spend || []);
  } catch (error) {
    console.warn("Spend chart failed", error);
  }
  document.documentElement.classList.add("dd-ready");
  await countersDone;
  document.body.dataset.ddReady = "true";
}

boot();
