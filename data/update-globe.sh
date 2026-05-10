#!/usr/bin/env bash
# Refresh globe visitor data from GoatCounter API.
# Usage: GOATCOUNTER_TOKEN=your_token GOATCOUNTER_SITE=yoursite ./update-globe.sh
#
# Requires: curl, jq

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTFILE="$SCRIPT_DIR/globe-data.json"

: "${GOATCOUNTER_TOKEN:?Set GOATCOUNTER_TOKEN env var}"
: "${GOATCOUNTER_SITE:?Set GOATCOUNTER_SITE env var (e.g. rawalkhirodkar)}"

AUTH="Authorization: Bearer $GOATCOUNTER_TOKEN"
BASE="https://${GOATCOUNTER_SITE}.goatcounter.com/api/v0"

locations=$(curl -sf -H "$AUTH" "${BASE}/stats/locations?limit=100&start=2020-01-01&end=$(date +%Y-%m-%d)")
total_response=$(curl -sf -H "$AUTH" "${BASE}/stats/total?start=2020-01-01&end=$(date +%Y-%m-%d)")
total_visitors=$(echo "$total_response" | jq '.total // 0')

if [ "$total_visitors" -eq 0 ] 2>/dev/null; then
  total_visitors=$(echo "$locations" | jq '[.stats[]?.count] | add // 0')
fi

echo "$locations" | jq --argjson total "$total_visitors" '{
  period: "all time",
  updated: (now | strftime("%Y-%m-%d")),
  total_visitors: $total,
  locations: [.stats[]? | {country: .id, count: .count}]
}' > "$OUTFILE"

echo "Updated $OUTFILE with $(echo "$locations" | jq '(.stats // []) | length') locations, $total_visitors total visitors."
