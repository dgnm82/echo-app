import os, sys, tempfile
results, log = sys.argv[1], sys.argv[2]
if not os.path.isfile(results) or not os.path.isfile(log):
    raise SystemExit(0)
text = open(log, encoding="utf-8", errors="replace").read()
if "lock sha" not in text or "is not origin/main" not in text or "0 packed phone files differ" not in text:
    raise SystemExit(0)
note = "known-gate-issue"
if "shared.epk is marked verified=false (built with ECHO_PHONE_SHA_UNVERIFIED=1)" in text:
    note = "known-gate-issue (pack built with ECHO_PHONE_SHA_UNVERIFIED=1)"
rows = open(results, encoding="utf-8").read().splitlines()
out = []
changed = False
for line in rows:
    p = line.split("\t")
    if len(p) >= 2 and p[0] == "FAIL" and p[1] == "device-host":
        while len(p) < 6:
            p.append("")
        p[5] = note
        line = "\t".join(p)
        changed = True
    out.append(line)
if changed:
    fd, tmp = tempfile.mkstemp(prefix="results.", dir=os.path.dirname(results))
    os.write(fd, ("\n".join(out) + "\n").encode())
    os.close(fd)
    os.replace(tmp, results)
    print("device-host: " + note)
