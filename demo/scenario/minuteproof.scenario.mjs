// MinuteProof demo scenario for demo-studio (read-only walkthrough of /due-diligence.html).
// Narration words are the approved script (demo/script.md), spoken numbers written out.
// Every narrated number is read from the rendered page and checked before its chapter's voice starts
// (ctx.screenShown() after the checks; scenario timing narrationDelayMs).

const PAGE = "/due-diligence.html";
const PDF_PATH = "/assets/docs/vaucluse-minutes-1972-73.pdf";

// Length of each chapter's narration WAV (narration 20261104T233350Z-narration-169e40), used only to turn
// word times into ctx.cue fractions. Cues are estimates; they only pace focus moments and clicks.
const NARRATION_MS = {
  hero: 9602,
  tiles: 7567,
  pagemap: 4587,
  recurring: 25365,
  "open-card": 1173,
  "first-flag": 13380,
  "source-page": 3264,
  "other-issues": 7823,
  filters: 2304,
  spend: 2944,
  "how-it-works": 24695,
};

/** Hold until `ms` into this chapter's narration. */
async function at(ctx, chapter, name, ms) {
  await ctx.cue(name, Math.min(1, Math.max(0, ms / NARRATION_MS[chapter])));
}

/** Text of exactly one element, whitespace collapsed. */
async function textOf(locator) {
  await locator.waitFor({ state: "visible" });
  return (await locator.innerText()).replace(/\s+/g, " ").trim();
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label}: expected "${expected}", page shows "${actual}"`);
}

function expectIncludes(label, actual, expected) {
  if (!actual.includes(expected)) throw new Error(`${label}: expected to include "${expected}", page shows "${actual}"`);
}

/**
 * Smoothly scroll so the element's top sits `viewportTop` px below the top of the viewport
 * (clamped to the page), and wait until the scroll has settled.
 */
async function scrollElementTo(page, selector, viewportTop) {
  await page.locator(selector).first().waitFor({ state: "attached" });
  await page.evaluate(
    ({ selector, viewportTop }) =>
      new Promise((resolve) => {
        const el = document.querySelector(selector);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const target = Math.max(0, Math.min(max, Math.round(el.getBoundingClientRect().top + window.scrollY - viewportTop)));
        if (Math.abs(window.scrollY - target) < 2) return resolve();
        window.scrollTo({ top: target, behavior: "smooth" });
        let last = -1;
        let still = 0;
        const tick = () => {
          const y = Math.round(window.scrollY);
          still = y === last ? still + 1 : 0;
          last = y;
          if (still >= 8 && Math.abs(y - target) < 2) return resolve();
          if (still >= 30) {
            window.scrollTo({ top: target, behavior: "auto" });
            return resolve();
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { selector, viewportTop },
  );
  await page.waitForTimeout(150);
}

/** Move the real mouse to the centre of a locator in steps, so the motion is recorded, not a jump. */
async function glideTo(page, locator, steps = 24) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("the element to move to has no box on screen");
  await page.mouse.move(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2), { steps });
}

const hero = (page) => ({
  pages: page.locator('.dd-hero-title [data-count="pages_read"]'),
  flags: page.locator('.dd-hero-title [data-count="red_flags"]'),
});
const wharf = (page) => page.locator('[data-demo="recurring-card"][data-issue="wharf"]');
const firstFlag = (page) => page.locator('[data-demo="flag"][data-item-id="1972-73-0017"]');

export default {
  id: "minuteproof",
  title: "MinuteProof: red flags from board minutes, with proof",
  viewport: { width: 1600, height: 900 },
  mutations: [],
  requiredChecks: [
    "page-ready",
    "hero-counts",
    "tiles-values",
    "pagemap-shown",
    "wharf-card",
    "wharf-filter",
    "first-flag-card",
    "pdf-page-7",
    "other-cards",
    "repairs-filtered",
    "spend-chart",
    "spend-tooltip",
    "how-it-works",
  ],
  timing: { narrationDelayMs: 300 },

  prepare: async (ctx) => {
    const { page } = ctx;
    await ctx.step("Ask the page for reduced motion (the browser's own preference; the page then stops its looping pulse and arrow animations)", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
    });
    await ctx.step(`Open ${PAGE}`, async () => {
      await page.goto(PAGE);
    });
    await ctx.check("page-ready", "The page has loaded its data and is titled MinuteProof", async () => {
      await page.locator('body[data-dd-ready="true"]').waitFor({ timeout: 30000 });
      const title = await page.title();
      expectIncludes("document.title", title, "MinuteProof");
      return `body[data-dd-ready="true"] is set; document.title is "${title}".`;
    });
  },

  chapters: [
    {
      id: "hero",
      title: "The result at the top",
      narration:
        "At the top: seven hundred eighteen pages of minutes became one hundred twenty-eight red flags. A red flag is something a buyer or funder should worry about.",
      run: async (ctx) => {
        const { page } = ctx;
        const h = hero(page);
        await ctx.check("hero-counts", "The hero reads 718 pages and 128 red flags", async () => {
          await page.waitForFunction(
            () =>
              document.querySelector('.dd-hero-title [data-count="pages_read"]')?.textContent.trim() === "718" &&
              document.querySelector('.dd-hero-title [data-count="red_flags"]')?.textContent.trim() === "128",
            null,
            { timeout: 10000 },
          );
          expectEqual("hero pages_read", await textOf(h.pages), "718");
          expectEqual("hero red_flags", await textOf(h.flags), "128");
          const title = await textOf(page.locator(".dd-hero-title"));
          return `Hero title reads "${title}".`;
        });
        ctx.screenShown();
        await at(ctx, "hero", "say-pages", 1100);
        await ctx.target("hero-pages", h.pages, { kind: "text" });
        await at(ctx, "hero", "say-flags", 3300);
        await ctx.target("hero-flags", h.flags, { kind: "text" });
        await ctx.cue("hero-end", 1);
        await ctx.hold("read-hero", 800);
      },
    },
    {
      id: "tiles",
      title: "The six tiles",
      narration:
        "In the tiles below, one hundred thirty-four items were put off or left unresolved. And you skip about twenty-four hours of reading.",
      run: async (ctx) => {
        const { page } = ctx;
        const deferred = page.locator('.dd-stats [data-count="deferred_or_unresolved"]');
        const saved = page.locator('.dd-saved [data-count="reading_time_saved_hours"]');
        await ctx.check("tiles-values", "The tiles show 134 deferred or unresolved and about 24 hours saved", async () => {
          expectEqual("deferred_or_unresolved tile", await textOf(deferred), "134");
          expectEqual("reading_time_saved_hours pill", await textOf(saved), "24");
          const tiles = await textOf(page.locator(".dd-stats"));
          const pill = await textOf(page.locator(".dd-saved"));
          return `Tiles read "${tiles}"; pill reads "${pill}".`;
        });
        ctx.screenShown();
        await at(ctx, "tiles", "say-tiles", 150);
        await ctx.target("stats-row", page.locator(".dd-stats"), { kind: "region" });
        await at(ctx, "tiles", "say-deferred", 1350);
        await ctx.target("deferred-tile", deferred, { kind: "text" });
        await at(ctx, "tiles", "say-hours", 5400);
        await ctx.target("saved-pill", page.locator(".dd-saved"), { kind: "text" });
        await ctx.cue("tiles-end", 1);
        await ctx.hold("read-tiles", 800);
      },
    },
    {
      id: "pagemap",
      title: "Every page, read",
      narration: "This grid is every page, one square each. Red squares hold a red flag.",
      run: async (ctx) => {
        const { page } = ctx;
        await ctx.step("Scroll to the page map", () => scrollElementTo(page, "#dd-pagemap", 280));
        await ctx.check("pagemap-shown", "The page map has one square per page (718) with red squares for flagged pages", async () => {
          const cells = await page.locator("#dd-pagemap .dd-cell").count();
          const flagged = await page.locator("#dd-pagemap .dd-cell.is-flag").count();
          if (cells !== 718) throw new Error(`page map has ${cells} squares, expected 718`);
          if (flagged < 1) throw new Error("page map has no red squares");
          const caption = await textOf(page.locator("#dd-pagemap figcaption"));
          return `Page map shows ${cells} squares, ${flagged} of them red; caption "${caption}".`;
        });
        ctx.screenShown();
        await ctx.target("pagemap", page.locator("#dd-pagemap"), { kind: "region" });
        await at(ctx, "pagemap", "say-red", 2700);
        await ctx.target("pagemap-legend", page.locator("#dd-pagemap .dd-legend"), { kind: "text" });
        await ctx.cue("pagemap-end", 1);
        await ctx.hold("read-pagemap", 800);
      },
    },
    {
      id: "recurring",
      title: "What keeps coming back: the wharf",
      narration:
        "Next: what keeps coming back. The top issue is the Nielsen Park wharf and its pool piles, the posts in the water. It was raised at fourteen meetings, from nineteen seventy-two to nineteen seventy-five, and flagged nineteen times. Each dot is a meeting. Red dots were flagged. The latest, in March nineteen seventy-five, is a dangerous old pile stump. It's still deferred, meaning put off.",
      run: async (ctx) => {
        const { page } = ctx;
        const card = wharf(page);
        await ctx.step("Scroll to What keeps coming back", () => scrollElementTo(page, '[data-demo="recurring"]', 80));
        await ctx.step("Rest the pointer at the right edge, clear of the cards", () => page.mouse.move(1520, 760));
        await ctx.check("wharf-card", "The lead card is the wharf: 14 meetings, 1972–1975, flagged 19 times, latest 16 Mar 1975, deferred", async () => {
          const first = page.locator('[data-demo="recurring-card"]').first();
          expectEqual("lead card issue", await first.getAttribute("data-issue"), "wharf");
          expectIncludes("wharf card title", await textOf(card.locator("h3").first()), "Nielsen Park wharf");
          expectEqual("wharf meetings", await textOf(card.locator('[data-demo="recurring-meetings"]')), "14 meetings");
          expectEqual("wharf span", await textOf(card.locator('[data-demo="recurring-span"]')), "1972–1975");
          expectEqual("wharf flagged", await textOf(card.locator('[data-demo="recurring-flagged"]')), "19 times");
          const latest = await textOf(card.locator('[data-demo="recurring-latest"]'));
          expectIncludes("wharf latest", latest, "Latest, 16 Mar 1975");
          expectIncludes("wharf latest", latest, "stump");
          expectEqual("wharf latest status", (await textOf(card.locator('[data-demo="recurring-latest-status"]'))).toLowerCase(), "deferred");
          const dots = await card.locator('[data-demo="recurring-timeline"] .dd-dot').count();
          const red = await card.locator('[data-demo="recurring-timeline"] .dd-dot.is-flag').count();
          const headline = await textOf(card.locator(".dd-issue-headline"));
          return `Lead card "${await textOf(card.locator("h3").first())}": "${headline}"; timeline ${dots} dots, ${red} red; "${latest.slice(0, 120)}".`;
        });
        ctx.screenShown();
        await at(ctx, "recurring", "say-wharf", 3100);
        await ctx.target("wharf-card", card, { kind: "region" });
        await at(ctx, "recurring", "say-meetings", 8050);
        await ctx.target("wharf-meetings", card.locator(".dd-issue-headline"), { kind: "text" });
        await at(ctx, "recurring", "say-dots", 14550);
        await ctx.target("wharf-timeline", card.locator('[data-demo="recurring-timeline"]'), { kind: "region" });
        await at(ctx, "recurring", "say-latest", 17750);
        await ctx.target("wharf-latest", card.locator('[data-demo="recurring-latest"]'), { kind: "text" });
        await ctx.cue("recurring-end", 1);
        await ctx.hold("read-recurring", 1200);
      },
    },
    {
      id: "open-card",
      title: "Click the card",
      narration: "Click the card.",
      run: async (ctx) => {
        const { page } = ctx;
        const card = wharf(page);
        ctx.screenShown();
        await ctx.step("Select the wharf card", async () => {
          await glideTo(page, card.locator("h3").first(), 20);
          await card.locator("h3").first().click();
        });
        await ctx.check("wharf-filter", "The red-flag list now shows the wharf's 19 flags, oldest first, starting 20 Feb 1972", async () => {
          const filter = page.locator('[data-demo="feed-filter"]');
          await filter.waitFor({ state: "visible" });
          const text = await textOf(filter);
          expectIncludes("feed filter", text, "19 flags");
          expectIncludes("feed filter", text, "Nielsen Park wharf");
          expectIncludes("feed filter", text, "oldest first");
          const first = page.locator('[data-demo="flag"]').first();
          expectEqual("first flag id", await first.getAttribute("data-item-id"), "1972-73-0017");
          expectEqual("first flag date", await first.getAttribute("data-date"), "1972-02-20");
          return `Filter reads "${text}"; the first flag is ${await first.getAttribute("data-item-id")} dated ${await first.getAttribute("data-date")}.`;
        });
        await ctx.step("Bring the first wharf flag fully into view", () => scrollElementTo(page, "#dd-chips", 70));
        await ctx.target("feed-filter", page.locator('[data-demo="feed-filter"]'), { kind: "text" });
        await ctx.hold("see-filter", 1500);
      },
    },
    {
      id: "first-flag",
      title: "Every flag carries its proof",
      narration:
        "Its first flag is from February nineteen seventy-two. The board warned the wharf was getting worse, and two agencies couldn't agree who should maintain it. Below is the exact text, with its citation: the page it came from.",
      run: async (ctx) => {
        const { page } = ctx;
        const flag = firstFlag(page);
        await ctx.check("first-flag-card", "The 20 Feb 1972 flag shows its reason, quoted source text and a link to page 7", async () => {
          await flag.waitFor({ state: "visible" });
          const box = await flag.boundingBox();
          if (!box || box.y < 60 || box.y + box.height > 900) throw new Error(`the first flag is not wholly on screen (${JSON.stringify(box)})`);
          const header = await textOf(flag.locator(".dd-flag-meta"));
          expectIncludes("flag date", header, "20 Feb 1972");
          const reason = await textOf(flag.locator('[data-demo="flag-reason"]'));
          expectIncludes("flag reason", reason, "endanger public safety");
          const quote = (await flag.locator('[data-demo="flag-quote"]').textContent()).replace(/\s+/g, " ").trim();
          expectIncludes("flag quote", quote, "Maritime Services Board");
          const link = flag.locator('[data-demo="flag-page-link"]');
          expectEqual("flag link text", await textOf(link), "View page 7 →");
          expectEqual("flag link href", await link.getAttribute("href"), "./assets/docs/vaucluse-minutes-1972-73.pdf#page=7");
          return `Flag "${header}": "${reason}" Quote: "${quote.slice(0, 160)}…" Link "View page 7 →" to ./assets/docs/vaucluse-minutes-1972-73.pdf#page=7.`;
        });
        ctx.screenShown();
        await ctx.target("flag-date", flag.locator(".dd-flag-meta time"), { kind: "text" });
        await at(ctx, "first-flag", "say-warned", 3550);
        await ctx.target("flag-reason", flag.locator('[data-demo="flag-reason"]'), { kind: "text" });
        await at(ctx, "first-flag", "say-quote", 9050);
        await ctx.target("flag-quote", flag.locator('[data-demo="flag-quote"]'), { kind: "region" });
        await at(ctx, "first-flag", "say-citation", 10850);
        await ctx.target("flag-page-link", flag.locator('[data-demo="flag-page-link"]'), { kind: "control" });
        await ctx.cue("first-flag-end", 1);
        await ctx.hold("read-flag", 800);
      },
    },
    {
      id: "source-page",
      title: "The original page",
      narration: "One click opens that page, so you can check it yourself.",
      run: async (ctx) => {
        const { page } = ctx;
        const link = firstFlag(page).locator('[data-demo="flag-page-link"]');
        let opened = "";
        await ctx.step('Select "View page 7 →" (the product opens it in a new tab; that tab is closed and the same address is shown in the recorded tab)', async () => {
          await glideTo(page, link, 20);
          const [popup] = await Promise.all([page.context().waitForEvent("page", { timeout: 10000 }), link.click()]);
          opened = popup.url();
          await popup.close();
          await page.goto(opened);
          await page.waitForLoadState("load");
        });
        await ctx.check("pdf-page-7", "The link opened the 1972–73 minute book PDF at page 7", async () => {
          const url = new URL(opened);
          expectEqual("opened path", url.pathname, PDF_PATH);
          expectEqual("opened page", url.hash, "#page=7");
          expectEqual("shown address", page.url(), opened);
          const type = await page.evaluate(() => document.contentType);
          expectEqual("document type", type, "application/pdf");
          await page.waitForTimeout(1200);
          return `The link opened ${url.pathname}${url.hash} (document type ${type}); the recorded tab now shows it.`;
        });
        ctx.screenShown();
        await ctx.cue("source-page-end", 1);
        await ctx.hold("read-page-7", 2200);
      },
    },
    {
      id: "other-issues",
      title: "Other problems that repeat",
      narration:
        "Other problems repeat too. White ants, which are termites, come up at six meetings. The kitchen restoration is still deferred, too.",
      run: async (ctx) => {
        const { page } = ctx;
        await ctx.step("Go back to MinuteProof", async () => {
          await page.goBack();
          await page.locator('body[data-dd-ready="true"]').waitFor({ timeout: 30000 });
        });
        await ctx.step("Scroll to the kitchen and white ants cards", () =>
          scrollElementTo(page, '[data-demo="recurring-card"][data-issue="kitchen"]', 300),
        );
        const ants = page.locator('[data-demo="recurring-card"][data-issue="white_ants"]');
        const kitchen = page.locator('[data-demo="recurring-card"][data-issue="kitchen"]');
        await ctx.check("other-cards", "White ants: 6 meetings; kitchen restoration: still deferred", async () => {
          expectIncludes("white ants title", await textOf(ants.locator("h3").first()), "White ants");
          expectEqual("white ants meetings", await textOf(ants.locator('[data-demo="recurring-meetings"]')), "6 meetings");
          expectIncludes("kitchen title", await textOf(kitchen.locator("h3").first()), "Kitchen restoration");
          const badge = await textOf(kitchen.locator(".dd-badge").first());
          expectEqual("kitchen badge", badge.toLowerCase(), "still deferred");
          return `"${await textOf(ants.locator(".dd-issue-headline"))}" (white ants); kitchen restoration badge "${badge}".`;
        });
        ctx.screenShown();
        await at(ctx, "other-issues", "say-ants", 2000);
        await ctx.target("ants-meetings", ants.locator(".dd-issue-headline"), { kind: "text" });
        await at(ctx, "other-issues", "say-kitchen", 4900);
        await ctx.target("kitchen-badge", kitchen.locator(".dd-badge").first(), { kind: "text" });
        await ctx.cue("other-issues-end", 1);
        await ctx.hold("read-other", 800);
      },
    },
    {
      id: "filters",
      title: "Filter by type",
      narration: "These buttons filter the flags by type.",
      run: async (ctx) => {
        const { page } = ctx;
        const chip = page.locator('[data-demo="chip"][data-category="repair_maintenance"]');
        await ctx.step("Scroll to the red-flag list and its category buttons", () => scrollElementTo(page, "#flags", 70));
        ctx.screenShown();
        await ctx.target("chips", page.locator("#dd-chips"), { kind: "region" });
        await at(ctx, "filters", "say-type", 1250);
        await ctx.step('Select "Repairs & maintenance"', async () => {
          await chip.click();
        });
        await ctx.check("repairs-filtered", "Repairs & maintenance is pressed and the list shows only that category", async () => {
          await page.waitForFunction(
            () => document.querySelector('[data-demo="chip"][data-category="repair_maintenance"]')?.getAttribute("aria-pressed") === "true",
            null,
            { timeout: 5000 },
          );
          const label = await textOf(chip);
          const shown = page.locator('#flags [data-demo="flag"]');
          const n = await shown.count();
          if (n < 1) throw new Error("no flags are shown after filtering");
          const cats = await shown.evaluateAll((els) => els.map((e) => e.innerText).filter((t) => !t.includes("Repairs & maintenance")).length);
          if (cats !== 0) throw new Error(`${cats} shown flags are not Repairs & maintenance`);
          return `"${label}" is pressed; ${n} flags are listed, all Repairs & maintenance.`;
        });
        await page.waitForTimeout(200);
        await ctx.target("chip-pressed", chip, { kind: "control" });
        await ctx.cue("filters-end", 1);
        await ctx.hold("read-filtered", 2000);
      },
    },
    {
      id: "spend",
      title: "Follow the money",
      narration: "This chart follows the money, three months per bar.",
      run: async (ctx) => {
        const { page } = ctx;
        const chart = page.locator('[data-demo="spend-chart"]');
        await ctx.step("Scroll to Spend over time", () => scrollElementTo(page, '[data-demo="spend-chart"]', 230));
        await ctx.check("spend-chart", "The spend chart has one bar per quarter", async () => {
          await chart.waitFor({ state: "visible" });
          const bars = await chart.locator(".dd-hit[data-period]").count();
          const periods = await chart.locator(".dd-hit[data-period]").evaluateAll((els) => els.map((e) => e.dataset.period));
          if (!periods.every((p) => /^\d{4}-Q[1-4]$/.test(p))) throw new Error(`unexpected bar periods: ${periods.join(", ")}`);
          return `Spend chart shows ${bars} quarterly bars, ${periods[0]} to ${periods[periods.length - 1]}.`;
        });
        ctx.screenShown();
        await ctx.target("spend-chart", chart, { kind: "region" });
        await at(ctx, "spend", "say-quarters", 1600);
        await ctx.step("Point at the 1972 Q4 bar", async () => {
          await page.locator('.dd-hit[data-period="1972-Q4"]').hover();
        });
        await ctx.check("spend-tooltip", "Hovering the 1972 Q4 bar shows its tooltip", async () => {
          const tip = page.locator("#dd-tooltip");
          await tip.waitFor({ state: "visible" });
          const text = await textOf(tip);
          expectIncludes("tooltip", text, "1972 Q4");
          return `Tooltip reads "${text}".`;
        });
        await page.waitForTimeout(200);
        await ctx.target("spend-tooltip", page.locator("#dd-tooltip"), { kind: "region" });
        await ctx.cue("spend-end", 1);
        await ctx.hold("read-spend", 2000);
      },
    },
    {
      id: "how-it-works",
      title: "How it works",
      narration:
        "Here's how it works. One: Reducto reads every page. Two: it pulls out each decision, repair, dollar amount and dispute, and notes its page. Three: DuckDB groups them over time, to find what keeps coming back. Four: every claim links to its page. Here, the reading took about six minutes. Hundreds of pages of board minutes became a cited red-flag report in minutes.",
      run: async (ctx) => {
        const { page } = ctx;
        const steps = page.locator('[data-demo="how-it-works"] .dd-steps li');
        await ctx.step("Move the pointer off the chart", () => page.mouse.move(1520, 860));
        await ctx.step("Scroll to How it works", () => scrollElementTo(page, '[data-demo="how-it-works"]', 400));
        await ctx.check("how-it-works", "The strip shows the four steps and an extraction time of about 6 minutes across 12 jobs", async () => {
          if ((await steps.count()) !== 4) throw new Error(`expected 4 steps, found ${await steps.count()}`);
          const labels = [];
          for (let i = 0; i < 4; i++) labels.push(await textOf(steps.nth(i)));
          expectIncludes("step 2", labels[1], "Reducto");
          expectIncludes("step 3", labels[2], "DuckDB");
          const time = await textOf(page.locator('[data-demo="extract-time"]'));
          expectIncludes("extract time", time, "~6 min");
          expectIncludes("extract time", time, "12");
          return `Steps: ${labels.map((l) => `"${l}"`).join(" → ")}; "${time}".`;
        });
        ctx.screenShown();
        await at(ctx, "how-it-works", "say-one", 1650);
        await ctx.target("step-1", steps.nth(0), { kind: "region" });
        await at(ctx, "how-it-works", "say-two", 4050);
        await ctx.target("step-2", steps.nth(1), { kind: "region" });
        await at(ctx, "how-it-works", "say-three", 10100);
        await ctx.target("step-3", steps.nth(2), { kind: "region" });
        await at(ctx, "how-it-works", "say-four", 14500);
        await ctx.target("step-4", steps.nth(3), { kind: "region" });
        await at(ctx, "how-it-works", "say-minutes", 17300);
        await ctx.target("extract-time", page.locator('[data-demo="extract-time"]'), { kind: "text" });
        await ctx.cue("how-it-works-end", 1);
        await ctx.hold("read-how", 1500);
      },
    },
  ],
};
