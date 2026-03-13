#!/bin/bash
# Exa Research: poll a research task until completion
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

RESEARCH_ID="$1"

if [ -z "$RESEARCH_ID" ]; then
  echo "Usage: bash research_poll.sh \"researchId\"" >&2
  echo "" >&2
  echo "Options (env vars):" >&2
  echo "  POLL_INTERVAL=2       Seconds between polls" >&2
  echo "  MAX_WAIT_SECONDS=240  Max wait time before timing out" >&2
  echo "  EVENTS=true           Include detailed event log in each poll response" >&2
  exit 1
fi

if [ -z "${EXA_API_KEY:-}" ]; then
  echo "Error: EXA_API_KEY is not set." >&2
  echo "Set EXA_API_KEY (env var or .env file)." >&2
  exit 1
fi

POLL_INTERVAL="${POLL_INTERVAL:-2}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-240}"

start_ts="$(date +%s)"

while true; do
  now_ts="$(date +%s)"
  elapsed="$(( now_ts - start_ts ))"
  if [ "$elapsed" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "Error: timed out after ${MAX_WAIT_SECONDS}s waiting for ${RESEARCH_ID}" >&2
    exit 2
  fi

  resp="$(EVENTS="${EVENTS:-false}" bash "$(dirname "$0")/research_get.sh" "$RESEARCH_ID")"
  status="$(echo "$resp" | jq -r '.status // empty')"
  status_lc="$(echo "$status" | tr '[:upper:]' '[:lower:]')"

  if [ -z "$status_lc" ]; then
    echo "$resp"
    echo "Error: could not parse status for ${RESEARCH_ID}" >&2
    exit 2
  fi

  if [ "$status_lc" = "completed" ]; then
    echo "$resp"
    exit 0
  fi

  if [ "$status_lc" = "failed" ] || [ "$status_lc" = "canceled" ] || [ "$status_lc" = "cancelled" ]; then
    echo "$resp"
    exit 2
  fi

  sleep "$POLL_INTERVAL"
done

