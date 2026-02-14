#!/bin/bash
# Exa Research: one-shot (create + poll until finished)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
source "$SCRIPT_DIR/env.sh"

INSTRUCTIONS="$1"

if [ -z "$INSTRUCTIONS" ]; then
  echo "Usage: bash research.sh \"instructions\"" >&2
  echo "" >&2
  echo "Options (env vars):" >&2
  echo "  MODEL=exa-research        Research model: exa-research, exa-research-pro" >&2
  echo "  SCHEMA_FILE=path.json     JSON Schema file for outputSchema (optional)" >&2
  echo "  POLL_INTERVAL=2           Seconds between polls" >&2
  echo "  MAX_WAIT_SECONDS=240      Max wait time before timing out" >&2
  echo "  EVENTS=true               Include detailed event log in final result" >&2
  exit 1
fi

create_resp="$(MODEL="${MODEL:-exa-research}" SCHEMA_FILE="${SCHEMA_FILE:-}" bash "$(dirname "$0")/research_create.sh" "$INSTRUCTIONS")"
research_id="$(echo "$create_resp" | jq -r '.researchId // empty')"

if [ -z "$research_id" ]; then
  echo "$create_resp"
  echo "Error: create did not return researchId" >&2
  exit 2
fi

EVENTS="${EVENTS:-false}" POLL_INTERVAL="${POLL_INTERVAL:-2}" MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-240}" \
  bash "$(dirname "$0")/research_poll.sh" "$research_id"

