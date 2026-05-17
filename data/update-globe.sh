#!/usr/bin/env bash
# Refresh globe visitor data from GoatCounter API.
# Usage: GOATCOUNTER_TOKEN=your_token GOATCOUNTER_SITE=yoursite ./update-globe.sh
#
# Strategy: query only the window since the prior run's "updated" date and add
# the new visits to the running totals in globe-data.json. This makes the count
# monotonically cumulative even though GoatCounter's free tier ages out old
# pageview records, and lets a missed cron day backfill on the next run.
#
# Requires: curl, jq

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTFILE="$SCRIPT_DIR/globe-data.json"

: "${GOATCOUNTER_TOKEN:?Set GOATCOUNTER_TOKEN env var}"
: "${GOATCOUNTER_SITE:?Set GOATCOUNTER_SITE env var (e.g. rawalkhirodkar)}"

AUTH="Authorization: Bearer $GOATCOUNTER_TOKEN"
BASE="https://${GOATCOUNTER_SITE}.goatcounter.com/api/v0"

# Retry on transient HTTP errors (429, 5xx, network blips) instead of failing
# the whole job on the first hiccup.
fetch() {
  curl -sfS \
    --retry 5 --retry-delay 10 --retry-all-errors \
    --max-time 60 \
    -H "$AUTH" "$1"
}

today=$(date -u +%Y-%m-%d)

if [ -f "$OUTFILE" ]; then
  prior=$(cat "$OUTFILE")
else
  prior='{"period":"all time","updated":"2020-01-01","total_visitors":0,"locations":[]}'
fi

# Start from the day after the prior snapshot so we don't double-count. If the
# job missed days, this naturally backfills.
last_updated=$(echo "$prior" | jq -r '.updated // "2020-01-01"')
start=$(date -u -j -v+1d -f "%Y-%m-%d" "$last_updated" +%Y-%m-%d 2>/dev/null \
        || date -u -d "$last_updated + 1 day" +%Y-%m-%d)

if [[ "$start" > "$today" ]]; then
  echo "Already up to date through $last_updated; nothing to fetch."
  exit 0
fi

echo "Fetching new visits from $start to $today (prior snapshot dated $last_updated)."

locations=$(fetch "${BASE}/stats/locations?limit=200&start=${start}&end=${today}")
total_response=$(fetch "${BASE}/stats/total?start=${start}&end=${today}")
delta_total=$(echo "$total_response" | jq '.total // 0')

if [ "$delta_total" -eq 0 ] 2>/dev/null; then
  delta_total=$(echo "$locations" | jq '[.stats[]?.count] | add // 0')
fi

delta=$(echo "$locations" | jq --argjson total "$delta_total" '{
  total_visitors: $total,
  locations: [.stats[]? | {country: .id, count: .count}]
}')

jq -n --argjson prior "$prior" --argjson delta "$delta" --arg today "$today" '
  ($prior.locations + $delta.locations)
  | group_by(.country)
  | map({country: .[0].country, count: ([.[].count] | add)})
  | sort_by(-.count) as $merged
  | {
      period: "all time",
      updated: $today,
      total_visitors: ($prior.total_visitors + $delta.total_visitors),
      locations: $merged
    }
' > "$OUTFILE"

echo "Updated $OUTFILE: +$delta_total visitors (total $(jq '.total_visitors' "$OUTFILE"), $(jq '.locations | length' "$OUTFILE") countries)."
