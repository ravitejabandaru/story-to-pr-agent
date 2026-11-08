#!/usr/bin/env bash
# One command for the agent to verify its work. Prints a short summary and ONLY the
# failures, so the agent spends tokens on fixing problems, not reading passing logs.
# Wire it up in package.json:  "agent:check": "bash scripts/agent-check.sh"
# Optional: pass changed files to scope Jest, e.g.  npm run agent:check -- --changed

set -uo pipefail
FAIL=0
LOG_DIR="$(mktemp -d)"

run_step () {
  local name="$1"; shift
  if "$@" >"$LOG_DIR/$name.log" 2>&1; then
    echo "PASS  $name"
  else
    echo "FAIL  $name"
    # Show only the tail of the failing output — enough to diagnose, not the full log.
    grep -E "error|Error|FAIL|✕|expected|Expected|at .*:[0-9]+" "$LOG_DIR/$name.log" | head -n 40
    FAIL=1
  fi
}

JEST_SCOPE=""
if [[ "${1:-}" == "--changed" ]]; then
  JEST_SCOPE="--onlyChanged"
fi

run_step prettier  npx prettier --check "force-app/**/*.{cls,js,html,json}" --log-level warn
run_step eslint    npx eslint "force-app/**/lwc/**/*.js" --quiet
run_step json      npm run --silent validate:json          # <your JSON schema validator>
run_step jest      npx sfdx-lwc-jest -- --silent --reporters=summary $JEST_SCOPE
# run_step apex    <command that runs Apex tests in CI / scratch org, if available>

echo "----"
if [[ $FAIL -eq 0 ]]; then echo "ALL CHECKS PASSED"; else echo "CHECKS FAILED"; fi
exit $FAIL
