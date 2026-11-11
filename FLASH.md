# 3.5C care/home preview — LOCAL installer checkpoint

**Waveshare ESP32-S3-Touch-LCD-3.5-C only.** Firmware `413bd291faa51db699308cb4f87648e9445fe0d1` (C4), C3 `0ddca125fddc64eb031b4f0d681a413b9e0b3585`; phone pin `f5f8eaa7f2ed5d7cb1fc4ce148c8de00857e148c`. DIO / 80MHz / 16MB, unchanged W4 partition bytes. Local-only: **not deployed or pushed**.

**Production linked. Corresponding engine booted in QEMU with HAL stubs. NOT verified on the board.** QEMU does not validate real LCD/touch/audio/power peripherals.

## Recommend four-part UPDATE — keep saves and NVS

Use **UPDATE — care/home preview** in `flash/index.html` on an HTTPS/local-development installer in Chrome/Edge desktop. Not the 2-inch installer or Start fresh. Use a USB-C data cable. Download mode: hold BOOT, tap RESET, release BOOT. Holding PWR about6s turns off, not download mode.

| Offset | Part | Bytes | SHA256 |
|---|---|---:|---|
| `0x0` | `echo_35c_core_preview_bootloader.bin` | 22320 | `8b8944b0d8d59ae07f5a535289d7b97dd6dccf2d276ed12607a020913e428d9e` |
| `0x8000` | `echo_35c_core_preview_partitions.bin` | 3072 | `3d99bd6ff8f3e1f2fcc437f788f6a38da209864e0cc1dca10180b99c18fabb3c` |
| `0x20000` | `echo_35c_core_preview_app.bin` | 714960 | `920f3ccaa0699ddb26878be2c853e1222a5e0fd4fa5d578e676a3360a1f15a95` |
| `0x330000` | `echo_35c_core_preview_core.bin` | 6291456 | `63a6b0d98aeff752ed6f9f6cd6e527c9163f2c75981e5a8cc98b58d2d75accbb` |

`flash/manifest_35c_companion.json` has these four parts; `flash/SHA256SUMS_core_preview` authenticates them. None of their4KiB erase/write-sector ranges touches **NVS `[0x9000,0x19000)`** or **saves `[0xF80000,0x1000000)`**. No global erase. Device reset is Echo-only and retains child/music; successful new Echo clears the previous book. Game/mission data are preserved but feature-filtered.

Manual four-part update from `flash/` (port selection omitted):

```sh
esptool.py --chip esp32s3 write_flash 0x0 echo_35c_core_preview_bootloader.bin 0x8000 echo_35c_core_preview_partitions.bin 0x20000 echo_35c_core_preview_app.bin 0x330000 echo_35c_core_preview_core.bin
```

## Destructive alternatives — NOT UPDATE

- **Start fresh** adds `echo_35c_blank_saves.bin` at`0xF80000`: irreversibly erases **ALL child/Echo/music/book/progress saves**, unlike firmware Echo-only delete. NVS remains. `manifest_35c_fresh.json` labels this erasure.
- `/workspace/echo/firmware_35c_test/echo_35c_full_core_preview.bin` is a **16MiB FACTORY image** with blank NVS/saves. **Never use it to update W4.** UPDATE does not reference it. Full-image SHA256: `d559b083302274c09ce1ef0d61d2fe595896f9ea8f1db6948ca8b8f7d3f8fc3c`.
- **Bench check** is the unchanged, separate hardware-test build, not the preview; saves/NVS kept.

## Evidence and preview gaps

C3 full host197,331/0 (C3:36,954, including4096 actual-phone scene cases). Final C4 full host/gates are in firmware `docs/CORE_C4.md`; extra C4 ASan/UBSan11,102/0 (11,082 native +20 allocation regressions). Production/QEMU187-symbol +6-module/60-hook link gates, real-core C1–C4 probes, inherited7/7 regressions and no-PSRAM rescue pass. Real c10r/W4 old-app saves and NVS survive app-only migration and a second boot. The staged four-part package also passes unchanged-partition/protected-sector/byte preservation checks; staged `core_preview_report.json` and `core_preview_update_preservation.json` retain evidence. Not a physical-board flash test.

**Care/home preview; book/release/recorded sound incomplete.** Not complete core-phone parity. Warm-up is omitted at the preserved post-commit `orFinish` seam. No games/launch chips/invites, substitute care rewards, need-decay rebalance, mission offers or camera. Full book/farewell/postcards/away-treasure/second-card UI, recorded clips/loops and saved music playback remain C5/C6. Legacy book data remain physically stored on UPDATE, but pre-owner book replay/migration is not delivered here; bounded album capacity is not yet chosen.

C1 Unicode/reading/visual, C2 care/Alive/nap/Bye/bond-up choreography/touch sampling, and C3 thumbnail/wipe/effect/parallax/recorded-hotspot gaps remain. Grown-up music/quiet/chirp/3D-den/stay/shared rows are explicitly **read-only preview information** pending real audio/renderer/farewell dependencies, not fake working switches. Full planned settings acceptance is not closed. Active names/age/always-yes/holiday/weather/clock and coherent continuation are implemented.

Offline decay/daily rules require trusted time. Configure the fixed UTC offset (PST−480 minutes); no automatic IANA/DST transitions. Unset RTC never fabricates elapsed time; cooldown conservatively restarts60s on reboot. Ordinary care has an inherited30s checkpoint window: abrupt power loss may lose the most recent uncheckpointed action. Critical sleep/settings/new-Echo/delete/ceremony commit/reload reconciliation is tested; physical power-loss testing remains.

## Daniel's board checklist

1. Back up saves if needed. On W4 note child/Echo names, bond, music and settings. Use **four-part UPDATE**, not factory/Start fresh; verify retained identity/music after reset. Book playback remains incomplete.
2. Check Clock/PST, Home, pet/feed/hug/sit/nap/Bye/wake. Open settings mid-hold: no delayed reward. Check crop, touch alignment/stale/missed touches, scene travel/hotspots.
3. Change name/age/weather; sleep normally, wake/reset, confirm persistence. Holiday should stop away drain and end on next open. Uncheckpointed hard-unplug actions are not promised durable.
4. Confirm no Play/game launch/invitation, mission offer, coming-soon placeholder or fake care replacement. Bench check is separate.
5. **Touch timing, no UART:** Home/Origin **Lock hold3s → release → solve multiplication → Next → Touch timing**. Wait at least5s. Last completed5s-window maxima: lock wait, input/update, draw, present (µs); touch report sample age and changed-report→present-return (ms). UI navigation is included; tap/B returns. Software values exclude sensor-before-report and LCD scanout;0 means no changed sample in that window, not zero physical latency.
6. Only with expendable data: Echo-only delete must retain child/music; successfully finish a new Echo to clear its old book. Do not use all-saves-erasing Start fresh for that test.

## Part SHA256s

```text
8b8944b0d8d59ae07f5a535289d7b97dd6dccf2d276ed12607a020913e428d9e  echo_35c_core_preview_bootloader.bin
3d99bd6ff8f3e1f2fcc437f788f6a38da209864e0cc1dca10180b99c18fabb3c  echo_35c_core_preview_partitions.bin
920f3ccaa0699ddb26878be2c853e1222a5e0fd4fa5d578e676a3360a1f15a95  echo_35c_core_preview_app.bin
63a6b0d98aeff752ed6f9f6cd6e527c9163f2c75981e5a8cc98b58d2d75accbb  echo_35c_core_preview_core.bin
```

# 3.5C Full-screen preview (touch, layout, font) — v0v9c test

**Waveshare ESP32-S3-Touch-LCD-3.5-C only.** Firmware `d2002a6` (v0v9c test: live phone intro, title and return title stacked like the phone (logo, tagline, cast), cast uncovered). DIO / 80 MHz / 16 MB, unchanged W4/care-home-preview partition bytes. Replaces v0v9a as the Full-screen preview installer option; the care/home preview, bench, and other existing entries are unchanged.

**NOT verified on the board.**

## Recommend four-part UPDATE — keep saves and NVS

Use **UPDATE — Full-screen preview (touch, layout, font)** in `flash/index.html` on an HTTPS or local-development installer in Chrome/Edge desktop. Not the 2-inch installer, not the care/home preview buttons, and not Start fresh. Use a USB-C data cable. Download mode: hold BOOT, tap RESET, release BOOT. Holding PWR about 6s turns off, not download mode.

| Offset | Part | Bytes | SHA256 |
|---|---|---:|---|
| `0x0` | `echo_35c_visual_v0v9c_bootloader.bin` | 22320 | `84db85da12b3f5f11c3ac47634a71a4b9a6a7cf295116bc622cfedab73950cab` |
| `0x8000` | `echo_35c_visual_v0v9c_partitions.bin` | 3072 | `3d99bd6ff8f3e1f2fcc437f788f6a38da209864e0cc1dca10180b99c18fabb3c` |
| `0x20000` | `echo_35c_visual_v0v9c_app.bin` | 741344 | `04ff543f3a8dee670fa133233cc3f32d507d2a57dd1be14c096751c3ee8937cd` |
| `0x330000` | `echo_35c_visual_v0v9c_core.bin` | 6291456 | `9455b0310462469fd601a3c66cf3fe504f8fee6e3da5251bb986130372ef785d` |

`flash/manifest_35c_visual_v0v9c.json` has these four parts; `flash/SHA256SUMS_visual_v0v9c` authenticates them. None of their 4 KiB erase/write-sector ranges touches **NVS `[0x9000,0x19000)`** or **saves `[0xF80000,0x1000000)`**. No global erase.

Manual four-part update from `flash/` (port selection omitted):

```sh
esptool.py --chip esp32s3 write_flash 0x0 echo_35c_visual_v0v9c_bootloader.bin 0x8000 echo_35c_visual_v0v9c_partitions.bin 0x20000 echo_35c_visual_v0v9c_app.bin 0x330000 echo_35c_visual_v0v9c_core.bin
```

## Destructive alternatives — NOT UPDATE

- **Start fresh — Full-screen preview (erases all saves)** adds `echo_35c_blank_saves.bin` at `0xF80000`: irreversibly erases **ALL child/Echo/music/book/progress saves**, unlike firmware Echo-only delete. NVS remains. `manifest_35c_visual_v0v9c_fresh.json` labels this erasure.
- `/workspace/echo/firmware_35c_test/echo_35c_visual_v0v9c.bin` is a **16 MiB FACTORY image** with blank NVS/saves. It is **not staged in `flash/`**. **Never use it to update a device that should keep saves.** UPDATE does not reference it. Full-image SHA256: `0836cac18e74b34c4fd441ddfbc63fda565539d4331131c9150a6c683492819d`.

The care/home preview **Start fresh** button still installs the care/home preview, not this build.

## Part SHA256s

```text
84db85da12b3f5f11c3ac47634a71a4b9a6a7cf295116bc622cfedab73950cab  echo_35c_visual_v0v9c_bootloader.bin
3d99bd6ff8f3e1f2fcc437f788f6a38da209864e0cc1dca10180b99c18fabb3c  echo_35c_visual_v0v9c_partitions.bin
04ff543f3a8dee670fa133233cc3f32d507d2a57dd1be14c096751c3ee8937cd  echo_35c_visual_v0v9c_app.bin
9455b0310462469fd601a3c66cf3fe504f8fee6e3da5251bb986130372ef785d  echo_35c_visual_v0v9c_core.bin
043e238a765f7cfbc62596a50e53c8ffb6b188a99357b0ebede251725d67589f  echo_35c_blank_saves.bin
```
