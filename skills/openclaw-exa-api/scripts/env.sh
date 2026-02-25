#!/bin/bash
# Load EXA_API_KEY from .env if not already set
if [ -z "${EXA_API_KEY:-}" ]; then
  _env_file="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)/../.env"
  if [ -f "$_env_file" ]; then
    # Safe parse: only extract EXA_API_KEY lines, never execute .env content
    _val="$(grep -E '^(export[[:space:]]+)?EXA_API_KEY=' "$_env_file" | tail -n1 | sed 's/^export[[:space:]]*//' | cut -d'=' -f2-)"
    # Strip optional surrounding quotes
    _val="${_val#\"}" ; _val="${_val%\"}"
    _val="${_val#\'}" ; _val="${_val%\'}"
    if [ -n "$_val" ]; then
      export EXA_API_KEY="$_val"
    fi
  fi
  unset _env_file _val
fi

# Post JSON payload to Exa API with resilient response handling.
# - Separates HTTP status from response body.
# - Validates JSON before returning.
# - Retries parsing after removing non-printable control characters.
exa_post_json() {
  local endpoint="$1"
  local payload="$2"
  local raw http body clean
  local retry_count="${EXA_RETRY_COUNT:-2}"
  local retry_delay="${EXA_RETRY_DELAY:-1}"

  if [ -z "${EXA_API_KEY:-}" ]; then
    echo "Error: EXA_API_KEY is not set." >&2
    return 1
  fi

  raw="$(
    LC_ALL=C curl -sS --fail-with-body \
      --retry "$retry_count" \
      --retry-delay "$retry_delay" \
      -X POST "$endpoint" \
      -H "x-api-key: $EXA_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      -w $'\n%{http_code}'
  )"

  http="${raw##*$'\n'}"
  body="${raw%$'\n'*}"

  if ! [[ "$http" =~ ^[0-9]{3}$ ]]; then
    echo "Error: Unable to parse HTTP status from Exa response." >&2
    printf "%s\n" "$raw" >&2
    return 1
  fi

  if [[ "$http" != 2* ]]; then
    echo "Error: Exa API returned HTTP $http." >&2
    printf "%s\n" "$body" >&2
    return 1
  fi

  if printf "%s" "$body" | jq -e . >/dev/null 2>&1; then
    printf "%s\n" "$body"
    return 0
  fi

  clean="$(printf "%s" "$body" | tr -d '\000-\010\013\014\016-\037')"
  if printf "%s" "$clean" | jq -e . >/dev/null 2>&1; then
    printf "%s\n" "$clean"
    return 0
  fi

  echo "Error: Exa API response is not valid JSON (even after sanitize)." >&2
  return 1
}
