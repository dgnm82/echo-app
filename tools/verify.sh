#!/usr/bin/env bash
# One-command verify for Project Echo. Bots should run this and read the summary.
#
#   tools/verify.sh [--phone] [--device] [--all] [--live <base-url>]
#
# Default is --all (phone + device). Each check is quiet on the terminal, writes
# its full log under tools/verify-logs/<run>/, and prints one line:
#   PASS|FAIL  name  time  log-path
# The .fwlist playthrough (echo-test.py) is marked known-flaky; a failure is
# still a failure. The device phone_src "lock sha is not origin/main; 0 packed
# phone files differ" line is a known gate issue (classified in the summary).
# Exit is nonzero if any check failed.
#
# Each check has a wall-clock limit (VERIFY_TIMEOUT, default 600s; static,
# device, qemu and live have their own). The command is started in a new
# session. A watchdog snapshots the process tree every 2s and, on timeout,
# SIGTERM then SIGKILL the tree, plus any qemu-system-xtensa still holding
# this run's flash image (it can be reparented to init and missed by a
# parent walk). The whole suite also has an overall cap
# (VERIFY_OVERALL_TIMEOUT, default 10800s) enforced by a suite watchdog,
# not only by shortening later checks.
#
# Phone browser tests run in parallel (VERIFY_PHONE_JOBS, default 4), each
# with its own http.server port and log.
#
# Commands are the existing gates, not new tests:
#   phone static  : tools/check.sh
#   phone browser : the --phone list in tools/check.sh (same parse as CI)
#   device        : firmware tools/run_host_tests.sh, then tools/qemu_smoke.sh
#                   (the smoke script builds, boots QEMU, and writes screenshot
#                   sheets when given a shots dir). Firmware lives outside this
#                   repo; default tree is $ECHO_FIRMWARE or
#                   /workspace/echo/firmware_35c_wip (source + scripts).
#                   /workspace/echo/firmware_35c_test is bin output only.
#                   QEMU is invoked only via tools/qemu_smoke.sh (Espressif
#                   9.2.2+, -M esp32s3 -m 8M, octal PSRAM), the same way the
#                   firmware and Zane's builds run it. A "PSRAM not found" or
#                   boot crash in the first (with-PSRAM) boot fails fast.
#   --live URL    : sha256 of published phone + flash files vs this tree
#                   (retries failed fetches 3 times; skips dotfiles).
#
set -uo pipefail

cd "$(dirname "$0")/.."
ROOT=$(pwd)
PHONE=0
DEVICE=0
LIVE=""

usage() {
  sed -n '2,40p' "$0" | sed 's/^# \?//'
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phone) PHONE=1; shift ;;
    --device) DEVICE=1; shift ;;
    --all) PHONE=1; DEVICE=1; shift ;;
    --live)
      [[ $# -ge 2 ]] || usage
      LIVE=$2; shift 2
      ;;
    -h|--help) usage ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done
if [[ $PHONE -eq 0 && $DEVICE -eq 0 && -z "$LIVE" ]]; then
  PHONE=1
  DEVICE=1
fi

STAMP=$(date +%Y%m%d-%H%M%S)
LOGDIR=${VERIFY_LOG_DIR:-"$ROOT/tools/verify-logs/$STAMP"}
mkdir -p "$LOGDIR"
mkdir -p "$ROOT/tools/verify-logs"
ln -sfn "$STAMP" "$ROOT/tools/verify-logs/latest" 2>/dev/null || true
RESULTS="$LOGDIR/results.tsv"
: > "$RESULTS"
RESULTS_LOCK="$LOGDIR/results.lock"
: > "$RESULTS_LOCK"
SERVER_PIDS_FILE="$LOGDIR/http-servers.pids"
: > "$SERVER_PIDS_FILE"
ACTIVE_PIDS_FILE="$LOGDIR/active.pids"
: > "$ACTIVE_PIDS_FILE"
OVERALL_FLAG="$LOGDIR/overall_timeout"
START_S_FILE="$LOGDIR/start_s"
QEMU_FLASH_HINT="$LOGDIR/qemu-flash-path"

now_s() { date +%s; }

date +%s >"$START_S_FILE"
VERIFY_OVERALL_TIMEOUT=${VERIFY_OVERALL_TIMEOUT:-10800}
VERIFY_DEADLINE=$(( $(now_s) + VERIFY_OVERALL_TIMEOUT ))
VERIFY_PHONE_JOBS=${VERIFY_PHONE_JOBS:-4}

overall_expired() {
  [[ -f "$OVERALL_FLAG" ]] || (( $(date +%s) >= VERIFY_DEADLINE ))
}

# List pid and every descendant by walking /proc (not the process group).
# Playwright's Chromium calls setsid(2), so it leaves GNU timeout's process
# group; a group signal never reaches it. Walking the tree still finds those
# children, because setsid changes the session, not the parent pid.
list_tree() {
  local pid=$1 kid
  [[ -n "${pid:-}" && "$pid" =~ ^[0-9]+$ ]] || return 0
  echo "$pid"
  if [[ -d "/proc/$pid/task" ]]; then
    for kid in $(cat /proc/$pid/task/*/children 2>/dev/null); do
      list_tree "$kid"
    done
  fi
}

kill_pid_list() {
  local sig=$1 p
  for p in "$@"; do
    [[ -n "${p:-}" && "$p" =~ ^[0-9]+$ ]] || continue
    kill -s "$sig" "$p" 2>/dev/null || true
  done
}

kill_tree() {
  local sig=$1 pid=$2
  kill_pid_list "$sig" $(list_tree "$pid")
}

# QEMU started by qemu_serial.py can be reparented to init if its helper is
# SIGKILL'd first; a parent walk then misses it. Only touch emulators that
# are still holding this firmware tree's smoke flash image.
kill_run_qemu() {
  local hint pat p
  hint=$(cat "$QEMU_FLASH_HINT" 2>/dev/null || true)
  [[ -n "$hint" ]] || return 0
  pat=$(printf '%s' "$hint" | sed 's/[.[\*^$()+?{}|]/\\&/g')
  for p in $(pgrep -f "qemu-system-xtensa.*${pat}" 2>/dev/null || true); do
    kill -s KILL "$p" 2>/dev/null || true
  done
}

record_active() {
  local p
  for p in "$@"; do
    [[ -n "${p:-}" && "$p" =~ ^[0-9]+$ ]] || continue
    echo "$p" >>"$ACTIVE_PIDS_FILE"
  done
}

forget_active() {
  local p=$1 tmp
  [[ -f "$ACTIVE_PIDS_FILE" ]] || return 0
  tmp="$ACTIVE_PIDS_FILE.tmp.$$"
  grep -vx "$p" "$ACTIVE_PIDS_FILE" >"$tmp" 2>/dev/null || true
  mv "$tmp" "$ACTIVE_PIDS_FILE"
}

kill_recorded_http() {
  local p
  if [[ -f "$SERVER_PIDS_FILE" ]]; then
    for p in $(cat "$SERVER_PIDS_FILE" 2>/dev/null); do
      kill -s KILL "$p" 2>/dev/null || true
    done
  fi
}

kill_all_active() {
  local p
  if [[ -f "$ACTIVE_PIDS_FILE" ]]; then
    for p in $(sort -u "$ACTIVE_PIDS_FILE" 2>/dev/null); do
      kill_tree TERM "$p"
    done
    sleep 2
    for p in $(sort -u "$ACTIVE_PIDS_FILE" 2>/dev/null); do
      kill_tree KILL "$p"
    done
  fi
  kill_run_qemu
  kill_recorded_http
}

append_result() {
  local status=$1 name=$2 elapsed=$3 log=$4 flaky=${5:-} note=${6:-}
  local extra=""
  if [[ -n "$note" ]]; then
    extra="  $note"
  elif [[ -n "$flaky" ]]; then
    extra="  known-flaky (.fwlist)"
  fi
  flock "$RESULTS_LOCK" bash -c '
    printf "%s  %s  %ss  %s%s\n" "$1" "$2" "$3" "$4" "$5"
    printf "%s\t%s\t%s\t%s\t%s\t%s\n" "$1" "$2" "$3" "$4" "$6" "$7" >>"$8"
  ' bash "$status" "$name" "$elapsed" "$log" "$extra" "$flaky" "$note" "$RESULTS"
}

# run_check NAME CMD [known-flaky]
# CMD is a single string, run with bash -c. Name is used as the log file stem.
run_check() {
  local name=$1 cmd=$2 flaky=${3:-}
  local log="$LOGDIR/${name}.log"
  local start rc=0 status elapsed
  local limit=${VERIFY_TIMEOUT:-600}
  local kill_after=15
  local cmd_pid wd_pid flag remain reserve
  start=$(now_s)

  if overall_expired; then
    echo "(skipped: overall time cap reached)" >"$log"
    append_result "FAIL" "$name" "0" "$log" "$flaky" "overall-cap"
    return
  fi
  remain=$(( VERIFY_DEADLINE - start ))
  reserve=30
  if (( remain <= reserve )); then
    echo "(skipped: overall time cap reached)" >"$log"
    : >"$OVERALL_FLAG"
    append_result "FAIL" "$name" "0" "$log" "$flaky" "overall-cap"
    return
  fi
  if (( remain - reserve < limit )); then
    limit=$(( remain - reserve ))
  fi

  flag="$log.timed_out"
  local pidfile="$log.pids"
  rm -f "$flag" "$pidfile"

  # New session (--fork --wait): $! is setsid, which waits for bash. The
  # watchdog re-walks the tree every 2s so late-spawned Chromium/QEMU are
  # recorded, then SIGKILL every recorded pid on timeout.
  setsid --fork --wait bash -c "$cmd" >"$log" 2>&1 &
  cmd_pid=$!
  record_active "$cmd_pid"

  (
    local end=$(( start + limit )) now
    while true; do
      now=$(now_s)
      list_tree "$cmd_pid" >"$pidfile" 2>/dev/null || true
      if [[ -f "$OVERALL_FLAG" ]] || (( now >= end )); then
        if kill -0 "$cmd_pid" 2>/dev/null; then
          : >"$flag"
          list_tree "$cmd_pid" >"$pidfile" 2>/dev/null || true
          kill_pid_list TERM $(cat "$pidfile" 2>/dev/null)
          sleep "$kill_after"
          list_tree "$cmd_pid" >>"$pidfile" 2>/dev/null || true
          kill_pid_list KILL $(sort -u "$pidfile" 2>/dev/null)
          kill -KILL -- "-$cmd_pid" 2>/dev/null || true
          kill_run_qemu
        fi
        break
      fi
      if ! kill -0 "$cmd_pid" 2>/dev/null; then
        break
      fi
      sleep 2
    done
  ) &
  wd_pid=$!
  record_active "$wd_pid"

  wait "$cmd_pid"
  rc=$?
  if [[ -f "$flag" ]]; then
    wait "$wd_pid" 2>/dev/null || true
    if [[ -f "$pidfile" ]]; then
      kill_pid_list KILL $(sort -u "$pidfile" 2>/dev/null)
    fi
    kill_tree KILL "$cmd_pid"
    kill_run_qemu
  else
    kill_tree KILL "$wd_pid" 2>/dev/null || true
    wait "$wd_pid" 2>/dev/null || true
  fi
  forget_active "$cmd_pid"
  forget_active "$wd_pid"
  rm -f "$pidfile"

  elapsed=$(( $(now_s) - start ))
  if [[ -f "$flag" ]]; then
    rm -f "$flag"
    echo "(timed out after ${limit}s, exit $rc)" >>"$log"
    rc=124
  fi
  if [[ $rc -eq 0 ]]; then
    status=PASS
  else
    status=FAIL
  fi
  local note=""
  if [[ -f "$OVERALL_FLAG" && "$status" != "PASS" ]]; then
    note="overall-cap"
  elif [[ -n "$flaky" ]]; then
    note="known-flaky (.fwlist)"
  fi
  append_result "$status" "$name" "$elapsed" "$log" "$flaky" "$note"
}

# Rewrite the out-of-repo echo-test.py path to the in-repo fixture when needed.
echo_test_cmd() {
  local fixture="$ROOT/.github/ci-fixtures/echo-test.py"
  if [[ -f /workspace/echo-test.py ]]; then
    printf '%s' "python3 /workspace/echo-test.py"
  elif [[ -f "$fixture" ]]; then
    printf '%s' "python3 \"$fixture\""
  else
    printf '%s' "python3 /workspace/echo-test.py"
  fi
}

# Phone playthrough commands, taken from tools/check.sh the same way CI does.
phone_playthrough_cmds() {
  local seg
  seg=$(grep -o 'echo "== phone playthrough";.*; fi' tools/check.sh | sed 's/^echo "== phone playthrough"; //; s/; fi$//')
  printf '%s\n' "$seg" | sed 's/; /\n/g' | sed '/^\s*$/d'
}

phone_cmd_name() {
  local cmd=$1 base
  if [[ "$cmd" == *echo-test.py* ]]; then
    printf '%s' "echo-test.py"
    return
  fi
  if [[ "$cmd" == *phone_release_test.py*owl-* ]]; then
    printf '%s' "phone_release_test.py-owl"
    return
  fi
  base=$(printf '%s' "$cmd" | grep -oE '[^ /]+_test\.py' | head -1)
  if [[ -n "$base" ]]; then
    printf '%s' "$base"
    return
  fi
  printf '%s' "$(printf '%s' "$cmd" | tr ' /' '__' | cut -c1-60)"
}

is_fwlist_echo_test() {
  [[ "$1" == *echo-test.py* ]]
}

HTTP_PID=""
HTTP_STARTED=0
PHONE_URL="http://127.0.0.1:8765/"

stop_phone_server() {
  if [[ $HTTP_STARTED -eq 1 && -n "$HTTP_PID" ]]; then
    kill "$HTTP_PID" 2>/dev/null || true
    wait "$HTTP_PID" 2>/dev/null || true
    HTTP_PID=""
    HTTP_STARTED=0
  fi
  kill_recorded_http
}

wait_http() {
  local url=$1 i
  for i in $(seq 30); do
    if curl -sf -o /dev/null "$url"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

pick_free_port() {
  python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()'
}

export_phone_url() {
  export PHONE_URL
  export ECHO_URL="$PHONE_URL"
  export TITLE_SKY_URL="$PHONE_URL"
}

# Start a dedicated http.server for one phone test. Prints pid:url on success.
start_dedicated_server() {
  local name=$1
  local port pid logfile url
  port=$(pick_free_port)
  logfile="$LOGDIR/${name}.server.log"
  python3 -m http.server "$port" --bind 127.0.0.1 >"$logfile" 2>&1 &
  pid=$!
  echo "$pid" >>"$SERVER_PIDS_FILE"
  url="http://127.0.0.1:${port}/"
  if wait_http "$url"; then
    printf '%s:%s' "$pid" "$url"
    return 0
  fi
  echo "http.server on :$port did not become ready" >>"$logfile"
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  return 1
}

stop_dedicated_server() {
  local pid=$1
  [[ -n "${pid:-}" && "$pid" =~ ^[0-9]+$ ]] || return 0
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  if [[ -f "$SERVER_PIDS_FILE" ]]; then
    local tmp="$SERVER_PIDS_FILE.tmp.$$"
    grep -vx "$pid" "$SERVER_PIDS_FILE" >"$tmp" 2>/dev/null || true
    mv "$tmp" "$SERVER_PIDS_FILE"
  fi
}

# Point a check.sh playthrough command at PHONE_URL. Always rewrite :8765
# URLs, and append our URL when the command has no URL yet (tests read it
# from argv, with the 8765 default kept).
adjust_phone_cmd() {
  local cmd=$1
  cmd=${cmd//http:\/\/localhost:8765\//$PHONE_URL}
  cmd=${cmd//http:\/\/127.0.0.1:8765\//$PHONE_URL}
  if [[ "$cmd" != *http://* && "$cmd" != *https://* ]]; then
    if [[ "$cmd" == *echo-test.py* || "$cmd" == *tests/*.py* ]]; then
      cmd="$cmd $PHONE_URL"
    fi
  fi
  printf '%s' "$cmd"
}

run_one_phone_browser_test() {
  local raw=$1
  local cmd name flaky info pid
  if is_fwlist_echo_test "$raw"; then
    cmd=$(echo_test_cmd)
    name="echo-test.py"
    flaky="known-flaky"
  else
    cmd=$raw
    name=$(phone_cmd_name "$cmd")
    flaky=""
  fi
  if ! info=$(start_dedicated_server "$name"); then
    echo "could not start a per-test http.server" >"$LOGDIR/${name}.log"
    append_result "FAIL" "$name" "0" "$LOGDIR/${name}.log" "$flaky" "script"
    return
  fi
  pid=${info%%:*}
  PHONE_URL=${info#*:}
  export_phone_url
  cmd=$(adjust_phone_cmd "$cmd")
  (
    cd "$ROOT"
    run_check "$name" "$cmd" "$flaky"
  )
  stop_dedicated_server "$pid"
}

run_phone() {
  (
    cd "$ROOT"
    VERIFY_TIMEOUT=${VERIFY_STATIC_TIMEOUT:-600} run_check "phone-static" "bash tools/check.sh"
  )
  if overall_expired; then
    echo "skipping phone browser tests (overall time cap reached)"
    return
  fi
  mkdir -p /workspace/shots /tmp/results
  local cmd running=() pid still
  while IFS= read -r cmd; do
    [[ -n "$cmd" ]] || continue
    if overall_expired; then
      local name flaky
      if is_fwlist_echo_test "$cmd"; then
        name="echo-test.py"
        flaky="known-flaky"
      else
        name=$(phone_cmd_name "$cmd")
        flaky=""
      fi
      echo "(skipped: overall time cap reached)" >"$LOGDIR/${name}.log"
      append_result "FAIL" "$name" "0" "$LOGDIR/${name}.log" "$flaky" "overall-cap"
      continue
    fi
    while true; do
      still=()
      for pid in "${running[@]+"${running[@]}"}"; do
        if kill -0 "$pid" 2>/dev/null; then
          still+=("$pid")
        fi
      done
      running=("${still[@]+"${still[@]}"}")
      if (( ${#running[@]} < VERIFY_PHONE_JOBS )); then
        break
      fi
      wait -n || true
    done
    (
      cd "$ROOT"
      run_one_phone_browser_test "$cmd"
    ) &
    running+=($!)
  done < <(phone_playthrough_cmds)
  for pid in "${running[@]+"${running[@]}"}"; do
    wait "$pid" || true
  done
}

firmware_root() {
  if [[ -n "${ECHO_FIRMWARE:-}" ]]; then
    printf '%s' "$ECHO_FIRMWARE"
    return
  fi
  if [[ -x /workspace/echo/firmware_35c_wip/tools/run_host_tests.sh ]]; then
    printf '%s' "/workspace/echo/firmware_35c_wip"
    return
  fi
  if [[ -x /workspace/echo/firmware_35c_test/tools/run_host_tests.sh ]]; then
    printf '%s' "/workspace/echo/firmware_35c_test"
    return
  fi
  printf '%s' "/workspace/echo/firmware_35c_wip"
}

classify_device_host() {
  flock "$RESULTS_LOCK" python3 "$ROOT/tools/verify-classify-host.py" "$RESULTS" "$LOGDIR/device-host.log"
}

run_device() {
  local fw
  fw=$(firmware_root)
  if [[ ! -x "$fw/tools/run_host_tests.sh" ]]; then
    {
      echo "firmware tree not found or has no tools/run_host_tests.sh: $fw"
      echo "Set ECHO_FIRMWARE to the echo-firmware checkout."
      echo "Source and scripts live in /workspace/echo/firmware_35c_wip;"
      echo "/workspace/echo/firmware_35c_test is bin output only."
    } >"$LOGDIR/device-firmware.log"
    append_result "FAIL" "device-firmware" "0" "$LOGDIR/device-firmware.log" "" "script"
    return
  fi
  printf '%s\n' "$fw/build_qemu/qemu_flash.bin" >"$QEMU_FLASH_HINT"
  VERIFY_TIMEOUT=${VERIFY_DEVICE_TIMEOUT:-1800} run_check "device-host" "cd \"$fw\" && bash tools/run_host_tests.sh"
  classify_device_host
  if overall_expired; then
    return
  fi
  mkdir -p "$LOGDIR/device-shots"
  # Call the firmware smoke script the same way Zane's builds do (tools/qemu_smoke.sh
  # uses Espressif QEMU >= 9.2.2, -M esp32s3 -m 8M, octal PSRAM). The wrap fails
  # fast if the with-PSRAM boot has no PSRAM or crashes, and SIGKILLs a leftover
  # smoke qemu if the script's own wait hangs.
  cp "$ROOT/tools/verify-qemu-wrap.py" "$LOGDIR/verify-qemu-wrap.py"
  local qemu_cmd="cd \"$fw\" && "
  if [[ -z "${IDF_PATH:-}" && -f "${HOME}/esp/esp-idf/export.sh" ]]; then
    qemu_cmd+=". \"\$HOME/esp/esp-idf/export.sh\" >/dev/null && "
  fi
  qemu_cmd+="python3 \"$LOGDIR/verify-qemu-wrap.py\" \"$fw\" \"$LOGDIR/device-shots\" \"$fw/build_qemu/qemu_smoke.log\" \"\${QEMU_SMOKE_TIMEOUT:-1200}\" 30"
  VERIFY_TIMEOUT=${VERIFY_QEMU_TIMEOUT:-2400} run_check "device-qemu-smoke" "$qemu_cmd"
}

run_live() {
  cp "$ROOT/tools/verify-live-sha.py" "$LOGDIR/live_sha.py"
  VERIFY_TIMEOUT=${VERIFY_LIVE_TIMEOUT:-1800} run_check "live-sha" "python3 \"$LOGDIR/live_sha.py\" \"$ROOT\" \"${LIVE%/}\" \"$LOGDIR/live-sha.tsv\""
}

print_summary() {
  python3 "$ROOT/tools/verify-summary.py" "$RESULTS" "$START_S_FILE" "$LOGDIR/device-host.log"
}

OVERALL_WD_PID=""
start_overall_watchdog() {
  (
    while (( $(now_s) < VERIFY_DEADLINE )); do
      if [[ -f "$OVERALL_FLAG" ]]; then
        exit 0
      fi
      sleep 2
    done
    : >"$OVERALL_FLAG"
    echo "verify: overall time cap of ${VERIFY_OVERALL_TIMEOUT}s reached, stopping running checks" >>"$LOGDIR/overall.log"
    kill_all_active
  ) &
  OVERALL_WD_PID=$!
}

cleanup() {
  if [[ -n "${OVERALL_WD_PID:-}" ]]; then
    kill "$OVERALL_WD_PID" 2>/dev/null || true
    wait "$OVERALL_WD_PID" 2>/dev/null || true
  fi
  stop_phone_server
  kill_recorded_http
  kill_run_qemu
}

trap cleanup EXIT

start_overall_watchdog

echo "verify: log dir $LOGDIR  overall cap ${VERIFY_OVERALL_TIMEOUT}s  phone jobs ${VERIFY_PHONE_JOBS}"
[[ $PHONE -eq 1 ]] && run_phone
[[ $DEVICE -eq 1 && ! -f "$OVERALL_FLAG" ]] && run_device
[[ -n "$LIVE" && ! -f "$OVERALL_FLAG" ]] && run_live
print_summary
