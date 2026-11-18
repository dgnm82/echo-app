import os, signal, subprocess, sys, time

fw, shots, bootlog, smoke_to, grace = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
flash = os.path.join(fw, "build_qemu", "qemu_flash.bin")

def kill_qemu():
    try:
        out = subprocess.check_output(["pgrep", "-af", "qemu-system-xtensa"], text=True)
    except subprocess.CalledProcessError:
        return
    for line in out.splitlines():
        if "qemu-system-xtensa" not in line:
            continue
        if flash not in line and "build_qemu/qemu_flash.bin" not in line:
            continue
        if "/build_qemu/qemu_flash.bin" in line and flash not in line:
            continue
        pid = line.split(None, 1)[0]
        if pid.isdigit():
            try:
                os.kill(int(pid), signal.SIGKILL)
            except OSError:
                pass

try:
    os.remove(bootlog)
except FileNotFoundError:
    pass

proc = subprocess.Popen(["bash", "tools/qemu_smoke.sh", shots], cwd=fw)
t0 = time.time()
rc = None
reason = None
while True:
    rc = proc.poll()
    if rc is not None:
        break
    elapsed = time.time() - t0
    try:
        text = open(bootlog, "rb").read().decode("utf-8", "replace")
    except FileNotFoundError:
        text = ""
    # First-boot log only. The intentional no-PSRAM phase uses qemu_smoke_nopsram.log.
    if "PSRAM not found" in text or "showing the error screen" in text:
        reason = "fail-fast: first boot has no PSRAM (PSRAM not found / error screen in %s)" % bootlog
        break
    if "Guru Meditation" in text or "abort() was called" in text:
        reason = "fail-fast: boot crash in %s" % bootlog
        break
    # qemu_smoke.sh caps the walk at smoke_to, then wait() can hang for hours
    # if QEMU ignores SIGTERM. Bound that hang, leaving room for the idf build.
    if elapsed > smoke_to + grace + 900:
        reason = "fail-fast: qemu_smoke.sh still running %ds after launch" % int(elapsed)
        break
    time.sleep(1)

if rc is None:
    print(reason or "fail-fast: stopping qemu_smoke.sh", flush=True)
    proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(15)
    except subprocess.TimeoutExpired:
        proc.kill()
        try:
            proc.wait(5)
        except subprocess.TimeoutExpired:
            pass
    kill_qemu()
    sys.exit(1)

kill_qemu()
sys.exit(rc)
