#!/bin/bash
# Exa neural web search with full options
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

QUERY="$1"

if [ -z "$QUERY" ]; then
    echo "Usage: bash search.sh \"query\"" >&2
    echo "" >&2
    echo "Options (env vars):" >&2
    echo "  NUM=10          Number of results" >&2
    echo "  TYPE=auto       Search type: auto, neural, fast, deep, instant" >&2
    echo "  CATEGORY=       Category: company, research paper, news, tweet, personal site, financial report, people" >&2
    echo "  DOMAINS=        Include domains (comma-separated)" >&2
    echo "  EXCLUDE=        Exclude domains (comma-separated; not supported with CATEGORY=company|people)" >&2
    echo "  SINCE=          Published after (YYYY-MM-DD; not supported with CATEGORY=company|people)" >&2
    echo "  UNTIL=          Published before (YYYY-MM-DD; not supported with CATEGORY=company|people)" >&2
    echo "  LOCATION=       User location (country code)" >&2
    exit 1
fi

if [ -z "${EXA_API_KEY:-}" ]; then
    echo "Error: EXA_API_KEY is not set." >&2
    echo "Set EXA_API_KEY (env var or .env file)." >&2
    exit 1
fi

# Defaults
NUM="${NUM:-10}"
TYPE="${TYPE:-auto}"
LOCATION="${LOCATION:-NL}"

# Build base payload
PAYLOAD=$(jq -n \
    --arg query "$QUERY" \
    --arg type "$TYPE" \
    --argjson numResults "$NUM" \
    --arg location "$LOCATION" \
    '{
        query: $query,
        type: $type,
        numResults: $numResults,
        userLocation: $location,
        contents: {
            text: { maxCharacters: 500 },
            highlights: { numSentences: 2, highlightsPerUrl: 1 },
            summary: {}
        }
    }')

# Add category if set
if [ -n "${CATEGORY:-}" ]; then
    PAYLOAD=$(echo "$PAYLOAD" | jq --arg cat "$CATEGORY" '. + {category: $cat}')
fi

# Add includeDomains if set
if [ -n "${DOMAINS:-}" ]; then
    # people category only accepts LinkedIn domains
    if [ "${CATEGORY:-}" = "people" ]; then
        IFS=',' read -r -a DOMAIN_ARRAY <<< "$DOMAINS"
        FILTERED_DOMAINS=()
        for d in "${DOMAIN_ARRAY[@]}"; do
            # Trim whitespace
            domain="$(echo "$d" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
            case "$domain" in
                linkedin.com|www.linkedin.com|*.linkedin.com)
                    FILTERED_DOMAINS+=("$domain")
                    ;;
                *)
                    ;;
            esac
        done
        if [ "${#FILTERED_DOMAINS[@]}" -eq 0 ]; then
            echo "Warning: CATEGORY=people only accepts LinkedIn domains in DOMAINS; skipping includeDomains" >&2
        else
            DOMAINS_CSV="$(IFS=,; echo "${FILTERED_DOMAINS[*]}")"
            PAYLOAD=$(echo "$PAYLOAD" | jq --arg domains "$DOMAINS_CSV" '. + {includeDomains: ($domains | split(","))}')
        fi
    else
        PAYLOAD=$(echo "$PAYLOAD" | jq --arg domains "$DOMAINS" '. + {includeDomains: ($domains | split(","))}')
    fi
fi

# Add excludeDomains if set (not supported with category=company or people; API returns INVALID_REQUEST_BODY)
if [ -n "${EXCLUDE:-}" ]; then
    case "${CATEGORY:-}" in
        company|people)
            echo "Warning: EXCLUDE is not supported with CATEGORY=$CATEGORY; skipping excludeDomains" >&2
            ;;
        *)
            PAYLOAD=$(echo "$PAYLOAD" | jq --arg domains "$EXCLUDE" '. + {excludeDomains: ($domains | split(","))}')
            ;;
    esac
fi

# Add date filters if set
if [ -n "${SINCE:-}" ]; then
    case "${CATEGORY:-}" in
        company|people)
            echo "Warning: SINCE is not supported with CATEGORY=$CATEGORY; skipping startPublishedDate" >&2
            ;;
        *)
            PAYLOAD=$(echo "$PAYLOAD" | jq --arg date "${SINCE}T00:00:00.000Z" '. + {startPublishedDate: $date}')
            ;;
    esac
fi

if [ -n "${UNTIL:-}" ]; then
    case "${CATEGORY:-}" in
        company|people)
            echo "Warning: UNTIL is not supported with CATEGORY=$CATEGORY; skipping endPublishedDate" >&2
            ;;
        *)
            PAYLOAD=$(echo "$PAYLOAD" | jq --arg date "${UNTIL}T23:59:59.999Z" '. + {endPublishedDate: $date}')
            ;;
    esac
fi

# Call API
exa_post_json "https://api.exa.ai/search" "$PAYLOAD"
