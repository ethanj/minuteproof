#!/usr/bin/env bash
# Usage: due-diligence/run-extract.sh <pdf> <label> <total_pages> [chunk]
# Extracts minute-book items in page chunks, in parallel, into due-diligence/extracts/.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ../.env; set +a
pdf="$1"; label="$2"; total="$3"; chunk="${4:-60}"
mkdir -p due-diligence/extracts
handle=$(reducto upload "$pdf" -q)
echo "uploaded $pdf -> $handle"
start=1
while [ "$start" -le "$total" ]; do
  end=$(( start + chunk - 1 )); [ "$end" -gt "$total" ] && end="$total"
  out=$(printf 'due-diligence/extracts/%s_p%03d-%03d.json' "$label" "$start" "$end")
  if [ ! -s "$out" ]; then
    ( reducto extract "$handle" -s due-diligence/schema.json --citations \
        -S parsing.settings.page_range.start=$start -S parsing.settings.page_range.end=$end \
        -o json -q > "$out.part" && mv "$out.part" "$out" && echo "done $out" ) || echo "FAILED $out" &
  fi
  start=$(( end + 1 ))
done
wait
