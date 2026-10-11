#!/usr/bin/env bash
# Build/test gate for Project Echo. Run from anywhere: bash tools/check.sh [--phone]
#   1. JS syntax check   2. Kai's lint (schema/graph/voice/banned)   3. guardrail lint (secrets, watching, put-downs, body, guilt, feelings memory)
#   --phone: also runs the headless phone-viewport playthrough (/workspace/echo-test.py, needs a server on :8765)
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== JS syntax"; for f in config.js art.js dialogue.js game.js; do node -e "new (require('vm').Script)(require('fs').readFileSync('$f','utf8'),{filename:'$f'})"; done; echo ok
echo "== lint_dialogue.py"; python3 tools/lint_dialogue.py dialogue | tail -4
echo "== guardrail lint"; node tools/lint-dialogue.js dialogue --js game.js --js config.js | tail -1
echo "== engine unit tests"; node tools/test-engine.js | tail -1
if [[ "${1:-}" == "--phone" ]]; then echo "== phone playthrough"; python3 /workspace/echo-test.py; python3 tests/phone_engine_test.py; fi
echo "ALL CHECKS PASSED"
