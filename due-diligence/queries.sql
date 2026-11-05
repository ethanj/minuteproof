-- Named views shared by live endpoints and static snapshots.
CREATE VIEW dd_items AS
SELECT * FROM items ORDER BY meeting_date ASC NULLS LAST, book, page, id;

CREATE VIEW dd_red_flags AS
SELECT * FROM items WHERE red_flag ORDER BY meeting_date DESC NULLS LAST, book, page, id;

-- Committed spend: approved/paid amounts, excluding income/funding and recoup/voucher bookkeeping.
-- These are extracted amounts, not a reconciled ledger; repeated approvals may overlap.
CREATE VIEW dd_spend AS
SELECT coalesce(year(meeting_date)::VARCHAR || '-Q' || quarter(meeting_date)::VARCHAR, 'undated') AS period,
       category, round(sum(amount_aud), 2) AS amount_aud, count(*) AS items
FROM items
WHERE amount_aud > 0 AND status IN ('approved', 'paid')
  AND category <> 'income_funding' AND NOT regexp_matches(summary, 'recoup|voucher', 'i')
GROUP BY period, category ORDER BY period, category;

CREATE VIEW dd_recurring AS
SELECT issue, CASE issue
         WHEN 'wharf' THEN 'Nielsen Park wharf & pool piles'
         WHEN 'white_ants' THEN 'White ants (termites)'
         WHEN 'tea_room' THEN 'Tea Room lease'
         WHEN 'roof' THEN 'Roof and gutters'
         WHEN 'turrets' THEN 'Turrets'
         WHEN 'garden' THEN 'Gardens and grounds'
         WHEN 'stables' THEN 'Stables and coach house'
         WHEN 'kitchen' THEN 'Kitchen restoration'
         WHEN 'walls' THEN 'Walls and damp'
         WHEN 'security' THEN 'Security and alarms'
         WHEN 'lifesaving' THEN 'Lifesaving and first aid'
         WHEN 'parking' THEN 'Roads and parking'
         WHEN 'collection' THEN 'Collection and furnishings'
         WHEN 'staff' THEN 'Staff and wages'
         WHEN 'insurance' THEN 'Insurance and risk'
         WHEN 'finance' THEN 'Finance and funding'
         ELSE upper(left(issue, 1)) || replace(substring(issue, 2), '_', ' ')
       END AS label,
       count(*) AS mentions, count(DISTINCT meeting_date) AS meetings,
       count(*) FILTER (WHERE red_flag) AS flagged_mentions,
       min(meeting_date) AS first_date, max(meeting_date) AS last_date,
       date_diff('day', min(meeting_date), max(meeting_date)) AS span_days,
       round(sum(amount_aud), 2) AS total_aud,
       first(status ORDER BY red_flag DESC, meeting_date DESC NULLS LAST, book DESC, page DESC, id DESC) AS latest_status,
       first(summary ORDER BY red_flag DESC, meeting_date DESC NULLS LAST, book DESC, page DESC, id DESC) AS latest_summary,
       first(meeting_date ORDER BY red_flag DESC, meeting_date DESC NULLS LAST, book DESC, page DESC, id DESC) AS latest_date,
       list(id ORDER BY meeting_date ASC NULLS LAST, book, page, id) AS item_ids
FROM items WHERE issue <> 'other'
GROUP BY issue HAVING count(DISTINCT meeting_date) >= 2
ORDER BY flagged_mentions DESC, mentions DESC, issue;

CREATE VIEW dd_summary AS
SELECT (SELECT coalesce(sum(pages), 0)::BIGINT FROM books) AS pages_read,
       (SELECT coalesce(list(struct_pack(book := book, pages := pages, pdf := pdf) ORDER BY book), []) FROM books) AS books,
       count(DISTINCT meeting_date) AS meetings, count(*) AS items,
       count(*) FILTER (WHERE red_flag) AS red_flags,
       count(*) FILTER (WHERE status IN ('deferred', 'unresolved')) AS deferred_or_unresolved,
       (SELECT round(coalesce(sum(amount_aud), 0), 2) FROM dd_spend) AS total_committed_aud,
       struct_pack(start := min(meeting_date), "end" := max(meeting_date)) AS date_range,
       (SELECT coalesce(sum(pages), 0) * 2.0 / 60 FROM books) AS reading_time_saved_hours,
       (SELECT generated_at FROM load_metadata) AS generated_at,
       (SELECT extract_minutes FROM load_metadata) AS extract_minutes,
       (SELECT extract_jobs FROM load_metadata) AS extract_jobs
FROM items;
