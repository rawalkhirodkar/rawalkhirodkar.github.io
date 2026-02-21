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

API_URL="https://${GOATCOUNTER_SITE}.goatcounter.com/api/v0/stats/locations?limit=50"

response=$(curl -sf -H "Authorization: Bearer $GOATCOUNTER_TOKEN" "$API_URL")

echo "$response" | jq '{
  period: "30 days",
  updated: (now | strftime("%Y-%m-%d")),
  total_visitors: ([.locations[].count] | add // 0),
  locations: [.locations[] | {country: .country, count: .count}]
}' > "$OUTFILE"

echo "Updated $OUTFILE with $(echo "$response" | jq '.locations | length') locations."
