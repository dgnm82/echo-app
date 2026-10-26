#!/usr/bin/env bash
# Build/test gate for Project Echo. Run from anywhere: bash tools/check.sh [--phone]
#   1. JS syntax check   2. Kai's lint (schema/graph/voice/banned)   3. guardrail lint (secrets, watching, put-downs, body, guilt, feelings memory)
#   --phone: also runs the headless phone-viewport playthrough (/workspace/echo-test.py, needs a server on :8765)
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== cache-bust stamps"; python3 tools/bust.py --check   # after set -e: a stale stamp fails the gate
echo "== JS syntax"; for f in families.js config.js games_tuning.js needs.js catch.js stack.js art.js dialogue.js dialogue_engine.js game.js lines.js affection.js memory.js runner.js bondup.js scenes.js postcards.js pixel.js sound.js alive.js need_select.js foods.js need_tags.js echoback.js difficulty.js camera_match.js weather_engine.js; do node -e "new (require('vm').Script)(require('fs').readFileSync('$f','utf8'),{filename:'$f'})"; done; echo ok
echo "== lint_dialogue.py"; python3 tools/lint_dialogue.py dialogue | tail -4
echo "== guardrail lint"; node tools/lint-dialogue.js dialogue --js game.js --js dialogue_engine.js --js config.js --js postcards.js | tail -1
echo "== engine unit tests"; node tools/test-engine.js | tail -1
echo "== den dig / nest weave tests"; node tools/test-lines.js | tail -1
echo "== needs v2 tests"; node tools/test-needs.js | tail -1
echo "== affection v2 tests"; node tools/test-affection.js | tail -1
echo "== catch / stack tests"; node tools/test-catch.js | tail -1; node tools/test-stack.js | tail -1
echo "== shiny pairs tests"; node tools/test-memory.js | tail -1
echo "== postcard tests"; node tools/test-postcards.js | tail -1
echo "== runner tests"; node tools/test-runner.js && node tools/test-runner-paths.js | tail -1
echo "== family words"; node tools/test-family-words.js
echo "== third family (dummy manifest)"; node tools/test-third-family.js | tail -1
echo "== whimber rename"; node tools/test-whimber-rename.js | tail -1
echo "== config tests"; node tools/test-config.js | tail -1
echo "== musicfx (Batch D)"; node tools/test-musicfx.js | tail -1
echo "== no undefined (E6)"; node tools/test-no-undefined.js
echo "== echo it back (Batch F)"; node tools/test-echoback.js | tail -1
echo "== no weather NETWORK + Batch F corpus rule (H9)"; node tools/test-no-weather.js
echo "== age-based starts (Batch G)"; node tools/test-age-start.js | tail -1
echo "== hoo for owls only (H14)"; node tools/lint-hoo.js | tail -1
echo "== batch H (camera, origin, sky, den, solar, weather, hotspots, pacing, hum, bird)"; node tools/test-batch-h.js | tail -1
echo "== weather-sense lint (weather lines must not ask the child to sense the Echo's weather; hard error; questions about the child's own sky allowed)"; node tools/lint-weather-sense.js | tail -1; node tools/test-weather-sense.js | tail -1
echo "== batch H final (weather off at runtime, corpus = WEATHER_CTX.md, pairs callout, prop waypoints, camera copy)"; node tools/test-batch-h-final.js | tail -1
echo "== camera fallback frequency (H1 conservative gate)"; node tools/test-camera-fallback.js | tail -2
echo "== sprite unification, den, hotspots & dialogue v2"; node tools/test-sprite-unification-and-den.js | tail -1
if [[ "${1:-}" == "--phone" ]]; then echo "== phone playthrough"; python3 /workspace/echo-test.py; python3 tests/phone_engine_test.py; python3 tests/phone_dig_test.py; python3 tests/phone_glow_test.py; python3 tests/phone_release_test.py; python3 tests/phone_sound_test.py; python3 tests/phone_memory_test.py; python3 tests/phone_whimber_test.py; python3 tests/phone_bondup_test.py; python3 tests/phone_living_test.py; python3 tests/phone_music_test.py; python3 tests/phone_scenes_test.py; ECHO=owl ECHO=owl python3 tests/phone_release_test.py http://localhost:8765/ owl- /tmp/; python3 tests/phone_modal_test.py http://localhost:8765/ /tmp/modaltest after; python3 tests/phone_alive_test.py; python3 tests/phone_nap_test.py; python3 tests/phone_farewell_extra_test.py; python3 tests/phone_duck_test.py; python3 tests/phone_onboarding_test.py; python3 tests/phone_families_test.py; python3 tests/phone_runner_test.py; python3 tests/phone_catch_test.py; python3 tests/phone_stack_test.py; python3 tests/phone_needs_test.py; python3 tests/phone_home_test.py; python3 tests/phone_wander_test.py; python3 tests/phone_affection_test.py; python3 tests/test_catch_ears.py; python3 tests/phone_camera_origin_test.py; python3 tests/phone_batchd_test.py; python3 tests/phone_batche_test.py; python3 tests/phone_batchf_test.py; python3 tests/phone_batchg_test.py; python3 tests/phone_purrlings_test.py; python3 tests/phone_ornext_test.py; python3 tests/phone_thirdfam_test.py; python3 tests/phone_ui_fixes_test.py; python3 tests/phone_picker_labels_test.py; python3 tests/phone_title_ground_test.py; python3 tests/phone_home_ground_test.py; fi
echo "ALL CHECKS PASSED"
