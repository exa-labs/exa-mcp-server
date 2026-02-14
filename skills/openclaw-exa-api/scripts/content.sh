#!/bin/bash
# Exa contents retrieval (URLs/IDs) + optional subpage crawling
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

if [ $# -eq 0 ]; then
    echo "Usage: bash content.sh \"url1\" \"url2\" ..." >&2
    exit 1
fi

if [ -z "${EXA_API_KEY:-}" ]; then
    echo "Error: EXA_API_KEY is not set." >&2
    echo "Set EXA_API_KEY (env var or .env file)." >&2
    exit 1
fi

# Defaults (optional env vars)
MAX_CHARACTERS="${MAX_CHARACTERS:-2000}"
HIGHLIGHT_SENTENCES="${HIGHLIGHT_SENTENCES:-3}"
HIGHLIGHTS_PER_URL="${HIGHLIGHTS_PER_URL:-2}"

# Optional crawling (see docs: https://docs.exa.ai/reference/crawling-subpages)
# SUBPAGES=10
# SUBPAGE_TARGET="docs,tutorial"
# LIVECRAWL="preferred"|"always"|"fallback"
# LIVECRAWL_TIMEOUT=12000

# Build ids array (Exa accepts URLs as ids for /contents)
IDS=$(printf '%s\n' "$@" | jq -R . | jq -s .)

# Build payload
PAYLOAD=$(jq -n \
    --argjson ids "$IDS" \
    --argjson maxChars "$MAX_CHARACTERS" \
    --argjson numSentences "$HIGHLIGHT_SENTENCES" \
    --argjson highlightsPerUrl "$HIGHLIGHTS_PER_URL" \
    '{
        ids: $ids,
        text: { maxCharacters: $maxChars },
        highlights: { numSentences: $numSentences, highlightsPerUrl: $highlightsPerUrl },
        summary: {}
    }')

# Add subpage crawling if set
if [ -n "${SUBPAGES:-}" ]; then
    PAYLOAD=$(echo "$PAYLOAD" | jq --argjson subpages "$SUBPAGES" '. + {subpages: $subpages}')
fi

if [ -n "${SUBPAGE_TARGET:-}" ]; then
    PAYLOAD=$(echo "$PAYLOAD" | jq --arg t "$SUBPAGE_TARGET" '. + {subpageTarget: ($t | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0)))}')
fi

# Add livecrawl settings if set
if [ -n "${LIVECRAWL:-}" ]; then
    PAYLOAD=$(echo "$PAYLOAD" | jq --arg mode "$LIVECRAWL" '. + {livecrawl: $mode}')
fi

if [ -n "${LIVECRAWL_TIMEOUT:-}" ]; then
    PAYLOAD=$(echo "$PAYLOAD" | jq --argjson ms "$LIVECRAWL_TIMEOUT" '. + {livecrawlTimeout: $ms}')
fi

# Call API
exa_post_json "https://api.exa.ai/contents" "$PAYLOAD"
