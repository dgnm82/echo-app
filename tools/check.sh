#!/usr/bin/env bash
# Build/test gate for Project Echo. Run from anywhere: bash tools/check.sh [--phone]
#   1. JS syntax check   2. Kai's lint (schema/graph/voice/banned)   3. guardrail lint (secrets, watching, put-downs, body, guilt, feelings memory)
#   --phone: also runs the headless phone-viewport playthrough (/workspace/echo-test.py, needs a server on :8765)
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== JS syntax"; for f in config.js art.js dialogue.js game.js fort.js memory.js runner.js bondup.js scenes.js postcards.js pixel.js sound.js alive.js need_select.js foods.js need_tags.js; do node -e "new (require('vm').Script)(require('fs').readFileSync('$f','utf8'),{filename:'$f'})"; done; echo ok
echo "== lint_dialogue.py"; python3 tools/lint_dialogue.py dialogue | tail -4
echo "== guardrail lint"; node tools/lint-dialogue.js dialogue --js game.js --js config.js --js postcards.js | tail -1
echo "== engine unit tests"; node tools/test-engine.js | tail -1
echo "== fort builder tests"; node tools/test-fort.js | tail -1
echo "== shiny pairs tests"; node tools/test-memory.js | tail -1
echo "== postcard tests"; node tools/test-postcards.js | tail -1
echo "== runner tests"; node tools/test-runner.js && node tools/test-runner-paths.js | tail -1
echo "== config tests"; node tools/test-config.js | tail -1
if [[ "${1:-}" == "--phone" ]]; then echo "== phone playthrough"; python3 /workspace/echo-test.py; python3 tests/phone_engine_test.py; python3 tests/phone_fort_test.py; python3 tests/phone_release_test.py; python3 tests/phone_sound_test.py; python3 tests/phone_memory_test.py; python3 tests/phone_whimber_test.py; python3 tests/phone_bondup_test.py; python3 tests/phone_living_test.py; python3 tests/phone_music_test.py; python3 tests/phone_scenes_test.py; ECHO=owl ECHO=owl python3 tests/phone_release_test.py http://localhost:8765/ owl- /tmp/; python3 tests/phone_modal_test.py http://localhost:8765/ /tmp/modaltest after; python3 tests/phone_alive_test.py; python3 tests/phone_farewell_extra_test.py; python3 tests/phone_duck_test.py; fi
echo "ALL CHECKS PASSED"
