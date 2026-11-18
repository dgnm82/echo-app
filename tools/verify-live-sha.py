import hashlib, os, posixpath, sys, time, urllib.request
root, base, out = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3]
ok = bad = 0
rows = []

def skip_rel(rel):
    parts = rel.split("/")
    # .git as a file (worktrees), .github/, .gitignore, other dotfiles,
    # and anything under a dotted directory is not a published path.
    if any(p.startswith(".") for p in parts):
        return True
    if rel.startswith(("tests/", "tools/")):
        return True
    return False

def fetch(url):
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return "OK", hashlib.sha256(r.read()).hexdigest()
        except Exception as e:
            last = type(e).__name__ + ":" + str(e).split("\n")[0][:80]
            if attempt < 2:
                time.sleep(2 ** attempt)
    return "FAIL", last

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if not d.startswith(".")]
    for n in filenames:
        rel = os.path.relpath(os.path.join(dirpath, n), root).replace(os.sep, "/")
        if skip_rel(rel):
            continue
        path = os.path.join(dirpath, n)
        with open(path, "rb") as f:
            local = hashlib.sha256(f.read()).hexdigest()
        url = base + "/" + posixpath.normpath(rel)
        status, remote = fetch(url)
        if status == "OK" and remote != local:
            status = "MISMATCH"
        if status == "OK":
            ok += 1
        else:
            bad += 1
        rows.append(f"{status}\t{rel}\t{local}\t{remote}")
with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(rows) + ("\n" if rows else ""))
print(f"{ok} of {ok + bad} match; {bad} differ or missing")
if bad:
    print("problems:")
    shown = 0
    remain = bad
    for row in rows:
        if row.startswith("OK\t"):
            continue
        parts = row.split("\t")
        print(parts[0], parts[1])
        shown += 1
        remain -= 1
        if shown >= 40:
            print(f"... and {remain} more (see {out})")
            break
sys.exit(1 if bad else 0)
