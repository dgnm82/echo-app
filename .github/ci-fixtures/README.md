# CI fixtures (CI only)
Copies of the out-of-repo test inputs, staged by `.github/workflows/ci.yml` at the same `/workspace/...` paths the tests read:
`echo-test.py` (phone playthrough, first entry of `tools/check.sh --phone`), `echo/batch_H/H1_camera_copy.json` (read by
`tools/test-batch-h-final.js`) and `echo/ios_design/batch_h/h_followup_hotspots_for_jay.json` (read by `tools/test-batch-h.js`).
Copied Nov 1, 2026; refresh them when the originals change.
