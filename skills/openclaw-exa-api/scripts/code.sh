#!/bin/bash
# Exa code context search
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

QUERY="$1"
NUM_RESULTS="${2:-10}"

if [ -z "$QUERY" ]; then
    echo "Usage: $0 \"query\" [num_results]" >&2
    exit 1
fi

if [ -z "${EXA_API_KEY:-}" ]; then
    echo "Error: EXA_API_KEY is not set." >&2
    echo "Set EXA_API_KEY (env var or .env file)." >&2
    exit 1
fi

# Optimized settings for code/docs
# No domain restrictions - let Exa's neural search find the best docs/repos
PAYLOAD=$(jq -n \
    --arg query "$QUERY" \
    --argjson numResults "$NUM_RESULTS" \
    '{
        query: $query,
        type: "auto",
        numResults: $numResults,
        contents: {
            text: true,
            highlights: true
        }
    }')

exa_post_json "https://api.exa.ai/search" "$PAYLOAD"
