import os, sys, time
rows = []
for line in open(sys.argv[1], encoding="utf-8"):
    if not line.strip():
        continue
    p = line.rstrip("\n").split("\t")
    while len(p) < 6:
        p.append("")
    rows.append(p)
n = len(rows)
passed = sum(1 for r in rows if r[0] == "PASS")
failed = [r for r in rows if r[0] != "PASS"]
flaky_fail = [r for r in failed if r[4] or "known-flaky" in r[5]]
gate_fail = [r for r in failed if "known-gate-issue" in (r[5] or "")]
try:
    wall = int(time.time()) - int(open(sys.argv[2], encoding="utf-8").read().strip())
except Exception:
    wall = sum(int(r[2] or 0) for r in rows)
secs = sum(int(r[2] or 0) for r in rows)
print("---")
print(f"{passed} passed, {len(failed)} failed ({len(flaky_fail)} known-flaky, {len(gate_fail)} known-gate-issue) of {n} in {wall}s wall ({secs}s summed)")
host_log = sys.argv[3] if len(sys.argv) > 3 else ""
if failed:
    print("failed:")
    for r in failed:
        note = r[5] or (("known-flaky (.fwlist)" if r[4] else ""))
        extra = f"  {note}" if note else ""
        print(f"  {r[0]}  {r[1]}  {r[2]}s  {r[3]}{extra}")
        if r[1] == "device-host" and "known-gate-issue" in (r[5] or "") and os.path.isfile(host_log):
            for line in open(host_log, encoding="utf-8", errors="replace"):
                if "phone_src:" in line or line.startswith("FAIL: phone_src"):
                    print("    " + line.rstrip())
sys.exit(1 if failed else 0)
