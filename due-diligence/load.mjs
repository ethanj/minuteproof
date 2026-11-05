#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { rmSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const directory = path.dirname(fileURLToPath(import.meta.url));
const snapshots = path.resolve(directory, '../site/data/due-diligence');
const duckdb = '/Users/ethan/.local/bin/duckdb';
const names = ['summary', 'red-flags', 'recurring', 'spend', 'items'];
const sqlString = value => `'${String(value).replaceAll("'", "''")}'`;
const pdf = book => `./assets/docs/vaucluse-minutes-${book}.pdf`;
const identity = row => JSON.stringify([row.book, row.meeting_date, row.summary]);

// Specific physical assets take precedence over financial/staff words in a summary.
const buckets = [
  ['white_ants', /\b(white ants?|termites?|borers?)\b/i],
  ['wharf', /\b(wharf|jetty|piles?)\b/i],
  ['tea_room', /\b(tea rooms?|kiosk|lease)\b/i],
  ['roof', /\b(roof\w*|gutter\w*)\b/i],
  ['turrets', /\bturrets?\b/i],
  ['garden', /\b(garden\w*|lawns?|paddock|trees?|mower|greenhouse|pond)\b/i],
  ['stables', /\b(stables?|coach\s?house)\b/i],
  ['kitchen', /\bkitchen\b/i],
  ['walls', /\b(walls?|damp\w*|joists?|termites?)\b/i],
  ['security', /\b(alarm\w*|burgl\w*|security)\b/i],
  ['lifesaving', /\b(lifesav\w*|lifebuoys?|first[ -]?aid|swimming)\b/i],
  ['parking', /\b(parking|roads?|traffic|bus stop|tourist coach)\b/i],
  ['collection', /\b(collection\w*|furniture|paintings?|portraits?|chairs?|mirror|candelabra|rugs?|exhibition|costume|tiles|vases?|reticule|sideboards?|desk|clock|sulky)\b/i],
  ['staff', /\b(staff\w*|salaries|salary|wages?|employees?|resign\w*|rangers?)\b/i],
  ['insurance', /\binsurance\b/i],
  ['finance', /\b(financ\w*|accounts?|recoup\w*|budget\w*|fund\w*|expenditure|income|payment\w*)\b/i],
];
const issue = row => {
  const text = `${row.asset} ${row.summary}`;
  // Clark Island is a separate asset; exclude references in either source field.
  if (/\bClark Island\b/i.test(text)) return 'other';
  const assetText = text.replace(/\b(Sydney|Australian)\s+Bridge\s+and\s+Wharf(\s+Co\.?)?(\s+Pty\.?\s+Ltd\.?)?/gi, '');
  return buckets.find(([, pattern]) => pattern.test(assetText))?.[0] || 'other';
};

function absolutePage(citation, start, end, file) {
  // bbox.page is chunk-relative; original_page is the absolute PDF page.
  const page = citation?.bbox?.original_page;
  if (!Number.isInteger(page) || page < start || page > end) {
    throw new Error(`${file}: citation page ${page} is outside ${start}-${end}`);
  }
  return page;
}

await mkdir(directory, { recursive: true });
const lock = path.join(directory, '.load.lock');
try {
  await mkdir(lock); // Refuse concurrent loaders; never remove another loader's lock.
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.error('Another loader is running, or a stale lock: remove due-diligence/.load.lock');
  process.exit(1);
}
const temporary = path.join(directory, `.load-${process.pid}`);
const cleanup = () => {
  try { rmSync(temporary, { recursive: true, force: true }); }
  finally { rmSync(lock, { recursive: true, force: true }); }
};
const onInterrupt = () => {
  try { cleanup(); }
  finally { process.exit(130); }
};
process.on('SIGINT', onInterrupt);
try {
  await mkdir(temporary);
  await mkdir(snapshots, { recursive: true });
  let previous = [];
  try { previous = (await readFile(path.join(directory, 'items.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const ids = new Map(previous.map(row => [identity(row), row.id]));
  const counters = new Map();
  for (const row of previous) counters.set(row.book, Math.max(counters.get(row.book) || 0, Number(row.id.split('-').at(-1))));

  let files = [];
  try { files = (await readdir(path.join(directory, 'extracts'))).filter(file => file.endsWith('.json')).sort(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const coverage = new Map();
  const durations = new Map();
  const rows = [];
  let filled = 0;
  let partialDates = 0;
  let citationCount = 0;
  let offsetMatches = 0;
  for (const file of files) {
    const match = /^(\d{4}-\d{2})_p(\d+)-(\d+)\.json$/.exec(file);
    if (!match) throw new Error(`Unexpected extract filename: ${file}`);
    const [, book, from, to] = match;
    const start = Number(from), end = Number(to);
    const pages = coverage.get(book) || new Set();
    for (let page = start; page <= end; page++) pages.add(page);
    coverage.set(book, pages);
    const raw = JSON.parse(await readFile(path.join(directory, 'extracts', file), 'utf8'));
    if (!Array.isArray(raw.result?.items)) throw new Error(`${file}: result.items is missing`);
    if (!Number.isFinite(raw.duration) || raw.duration < 0) throw new Error(`${file}: duration must be seconds`);
    durations.set(book, Math.max(durations.get(book) || 0, raw.duration));
    let date = null; // Never invent a date across a chunk boundary.
    for (const entry of raw.result.items) {
      const row = Object.fromEntries(Object.entries(entry).map(([key, field]) => [key, field?.value ?? null]));
      if (row.meeting_date) {
        const parsed = new Date(`${row.meeting_date}T00:00:00Z`);
        if (/^\d{4}-\d{2}-\d{2}$/.test(row.meeting_date) && !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === row.meeting_date) date = row.meeting_date;
        else { date = null; partialDates++; }
      }
      else if (date) filled++;
      row.meeting_date = date;
      const citations = [...(entry.summary?.citations || []), ...Object.entries(entry).filter(([key]) => key !== 'summary').flatMap(([, field]) => field?.citations || [])];
      const firstSummary = entry.summary?.citations?.[0];
      const citation = Number.isInteger(firstSummary?.bbox?.original_page) ? firstSummary
        : citations.filter(c => Number.isInteger(c.bbox?.original_page)).sort((a, b) => a.bbox.original_page - b.bbox.original_page)[0];
      const quote = citation?.parentBlock?.content || citations.find(c => c.parentBlock?.content)?.parentBlock.content;
      if (!quote) throw new Error(`${file}: item has no source paragraph citation`);
      for (const c of citations) {
        citationCount++;
        if (c.bbox?.original_page === c.bbox?.page + start - 1) offsetMatches++;
      }
      rows.push({ ...row, book, page: absolutePage(citation, start, end, file), quote });
    }
    console.log(`Extract ${file}: ${raw.result.items.length} rows; requested pages ${start}-${end}`);
  }
  if (!files.length) {
    rows.push(...JSON.parse(await readFile(path.join(directory, 'fixtures/sample-items.json'), 'utf8')));
    for (const row of rows) {
      const pages = coverage.get(row.book) || new Set();
      pages.add(row.page);
      coverage.set(row.book, pages);
    }
    console.log('Source fixtures/sample-items.json (no completed extracts; pages_read counts cited fixture pages only)');
  }

  const seen = new Set();
  const items = [];
  for (const row of rows) {
    const duplicate = JSON.stringify([row.meeting_date, row.summary]);
    if (seen.has(duplicate)) continue;
    seen.add(duplicate);
    let id = ids.get(identity(row));
    if (!id) {
      const next = (counters.get(row.book) || 0) + 1;
      counters.set(row.book, next);
      id = `${row.book}-${String(next).padStart(4, '0')}`;
    }
    items.push({
      id, book: row.book, pdf: pdf(row.book), meeting_date: row.meeting_date,
      category: row.category || 'other', asset: row.asset || '', issue: issue(row),
      summary: row.summary || '', amount_aud: Number(row.amount_aud) || 0,
      status: row.status || 'noted', counterparty: row.counterparty || '',
      red_flag: row.red_flag === true, red_flag_reason: row.red_flag_reason || '',
      page: row.page, quote: row.quote || '',
    });
  }
  const jsonl = path.join(temporary, 'items.jsonl');
  await writeFile(jsonl, items.map(row => JSON.stringify(row)).join('\n') + (items.length ? '\n' : ''));
  const books = [...coverage].map(([book, pages]) => ({ book, pages: pages.size, pdf: pdf(book) }));
  const db = path.join(temporary, 'minutes.duckdb');
  const columns = { id: 'VARCHAR', book: 'VARCHAR', pdf: 'VARCHAR', meeting_date: 'DATE', category: 'VARCHAR', asset: 'VARCHAR', issue: 'VARCHAR', summary: 'VARCHAR', amount_aud: 'DOUBLE', status: 'VARCHAR', counterparty: 'VARCHAR', red_flag: 'BOOLEAN', red_flag_reason: 'VARCHAR', page: 'INTEGER', quote: 'VARCHAR' };
  const schema = Object.entries(columns).map(([key, type]) => `${key} ${type}`).join(', ');
  const jsonColumns = Object.entries(columns).map(([key, type]) => `${key}: '${type}'`).join(', ');
  const definitions = await readFile(path.join(directory, 'queries.sql'), 'utf8');
  const extractMinutes = Math.round([...durations.values()].reduce((sum, seconds) => sum + seconds, 0) / 60 * 10) / 10;
  const setup = `CREATE TABLE items (${schema});
    ${items.length ? `INSERT INTO items SELECT * FROM read_json(${sqlString(jsonl)}, format='newline_delimited', columns={${jsonColumns}});` : ''}
    CREATE TABLE books (book VARCHAR, pages INTEGER, pdf VARCHAR);
    ${books.length ? `INSERT INTO books VALUES ${books.map(b => `(${sqlString(b.book)}, ${b.pages}, ${sqlString(b.pdf)})`).join(',')};` : ''}
    CREATE TABLE load_metadata AS SELECT ${sqlString(new Date().toISOString())}::VARCHAR AS generated_at,
      ${extractMinutes}::DOUBLE AS extract_minutes, ${files.length}::INTEGER AS extract_jobs;
    ${definitions}`;
  await run(duckdb, [db, setup], { maxBuffer: 32 * 1024 * 1024 });
  const payloads = new Map();
  for (const name of names) {
    const { stdout } = await run(duckdb, ['-readonly', '-json', db, `SELECT * FROM dd_${name.replaceAll('-', '_')};`], { maxBuffer: 32 * 1024 * 1024 });
    const results = JSON.parse(stdout || '[]');
    const payload = name === 'summary' ? results[0] : results;
    payloads.set(name, payload);
    await writeFile(path.join(temporary, `${name}.json`), JSON.stringify(payload, null, 2) + '\n');
  }
  // All queries succeed before publishing. Each rename is atomic on this filesystem.
  await rename(jsonl, path.join(directory, 'items.jsonl'));
  await rename(db, path.join(directory, 'minutes.duckdb'));
  for (const name of names) await rename(path.join(temporary, `${name}.json`), path.join(snapshots, `${name}.json`));
  console.log(JSON.stringify({ ...payloads.get('summary'), duplicates_dropped: rows.length - items.length, dates_forward_filled: filled, partial_dates_left_null: partialDates, undated_items: items.filter(row => !row.meeting_date).length, citation_offset_matches: offsetMatches, citations_checked: citationCount, extract_files: files }, null, 2));
} finally {
  process.off('SIGINT', onInterrupt);
  cleanup();
}
