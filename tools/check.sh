#!/usr/bin/env bash
# Build/test gate for Project Echo. Run from anywhere: bash tools/check.sh [--phone]
echo "== cache-bust stamps"; python3 tools/bust.py --check
#   1. JS syntax check   2. Kai's lint (schema/graph/voice/banned)   3. guardrail lint (secrets, watching, put-downs, body, guilt, feelings memory)
#   --phone: also runs the headless phone-viewport playthrough (/workspace/echo-test.py, needs a server on :8765)
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== JS syntax"; for f in families.js config.js games_tuning.js needs.js catch.js stack.js art.js dialogue.js game.js lines.js affection.js memory.js runner.js bondup.js scenes.js postcards.js pixel.js sound.js alive.js need_select.js foods.js need_tags.js; do node -e "new (require('vm').Script)(require('fs').readFileSync('$f','utf8'),{filename:'$f'})"; done; echo ok
echo "== lint_dialogue.py"; python3 tools/lint_dialogue.py dialogue | tail -4
echo "== guardrail lint"; node tools/lint-dialogue.js dialogue --js game.js --js config.js --js postcards.js | tail -1
echo "== engine unit tests"; node tools/test-engine.js | tail -1
echo "== den dig / nest weave tests"; node tools/test-lines.js | tail -1
echo "== needs v2 tests"; node tools/test-needs.js | tail -1
echo "== affection v2 tests"; node tools/test-affection.js | tail -1
echo "== catch / stack tests"; node tools/test-catch.js | tail -1; node tools/test-stack.js | tail -1
echo "== shiny pairs tests"; node tools/test-memory.js | tail -1
echo "== postcard tests"; node tools/test-postcards.js | tail -1
echo "== runner tests"; node tools/test-runner.js && node tools/test-runner-paths.js | tail -1
echo "== family words"; node tools/test-family-words.js
echo "== config tests"; node tools/test-config.js | tail -1
if [[ "${1:-}" == "--phone" ]]; then echo "== phone playthrough"; python3 /workspace/echo-test.py; python3 tests/phone_engine_test.py; python3 tests/phone_dig_test.py; python3 tests/phone_glow_test.py; python3 tests/phone_release_test.py; python3 tests/phone_sound_test.py; python3 tests/phone_memory_test.py; python3 tests/phone_whimber_test.py; python3 tests/phone_bondup_test.py; python3 tests/phone_living_test.py; python3 tests/phone_music_test.py; python3 tests/phone_scenes_test.py; ECHO=owl ECHO=owl python3 tests/phone_release_test.py http://localhost:8765/ owl- /tmp/; python3 tests/phone_modal_test.py http://localhost:8765/ /tmp/modaltest after; python3 tests/phone_alive_test.py; python3 tests/phone_nap_test.py; python3 tests/phone_farewell_extra_test.py; python3 tests/phone_duck_test.py; python3 tests/phone_onboarding_test.py; python3 tests/phone_families_test.py; python3 tests/phone_runner_test.py; python3 tests/phone_catch_test.py; python3 tests/phone_stack_test.py; python3 tests/phone_needs_test.py; python3 tests/phone_home_test.py; python3 tests/phone_wander_test.py; python3 tests/phone_affection_test.py; python3 tests/test_catch_ears.py; fi
echo "ALL CHECKS PASSED"
