# Echo handheld v0.1: flashing and troubleshooting

Current build: **v0.1.1**. It turns on the speaker (I2S amp on BCLK 44, LRCLK 18, DIN 43), and logs are over USB only.

Board: Waveshare ESP32-S3-Touch-LCD-2 in case v2/v3, board rotated 180°, camera unplugged (Option B). Pins come from Nya's `echo_pins_poc_v01.h`. This firmware has not run on real hardware yet, so the hardware test screen is how to check the wiring.

## Flash (one click)
1. Open https://dgnm82.github.io/echo-app/flash/ in **Chrome or Edge on a computer**.
2. Plug in the USB-C on the top edge with a **data** cable. Click **Connect**, pick **USB JTAG/serial debug unit**, and allow the erase the first time.
3. When it says "Installation complete", unplug and replug, or press **R** with a paperclip.

**If no port shows up, or it hangs at "Connecting":** put the board in download mode. Hold **B** (pinhole, BOOT), tap **R** (pinhole, RESET), release B, then click Connect again. After flashing, tap R to start the new firmware.

**Manual flash:**
```
esptool.py --chip esp32s3 write_flash 0x0 echo_fw_v0.1.1.bin
```
(The bin is in this folder; it's a merged image at offset 0.)

## What you should see
- **ECHO splash** (1.5 s) with a small green square in the **top-left** corner. If the square is bottom-right, the picture is upside down: see Screen below.
- **Hardware test:** hold the **B button**, or touch the screen, while the splash shows. In the test screen:
  - every part shows **OK** or **--** with a note;
  - it shows the button name and the ladder **mV**, the touch point and a crosshair, the battery voltage, and the IMU tilt (a green dot moves as you lean the case);
  - **A** plays a 3-note chime, **B** buzzes, **L/R** change the glow colour, **Vol+/-** change the volume, and a tap gives a tick and a soft buzz. **Hold B** to leave.
- **Demo:** Pipsong the fox at home. Tap Pipsong to pet: hearts, a pink glow and a soft buzz. Tap the **note bubble** (or press **A**) for Echo It Back.
  - In Echo It Back, Pipsong sings and you tap the coloured pads back. **L/R** gives fewer or more notes (tiers 1-4); **Done** or **B** goes home.
  - **Hold Power** (about 1 s) to sleep. **Hold Power** again to wake: other buttons can wake it for a moment, but it goes back to sleep unless Power is held.
  - A boot after a crash is fine; after 3 crashes in a row it opens the test screen in **safe mode** (no sound, glow or motor).

## Troubleshooting (use the test screen)
| Symptom | Check |
|---|---|
| Black screen, but the backlight glows | SPI wires on the FPC. If the image is noisy, lower `LCD_PCLK_HZ` to 40 MHz in `main/echo_pins.h`. |
| Picture upside down / touch in the wrong place | Flip `LCD_ROTATE_180` in `echo_pins.h`; it changes the screen and touch together. |
| "Touch --  no ACK" | The CST816D sleeps until touched: tap once and it should turn OK. If it never does, check the I2C pins 47/48. |
| "Buttons --  idle xxxx mV" (should be about 3300) | The ladder isn't on GPIO2 or the 10k pull-up is missing. In that case sleep is refused (it could never wake). |
| A button reads as the wrong one | Compare the mV shown with the table in `echo_pins.h` (Power 0, L 300, R 595, A 1055, B 1650, Vol+ 2269, Vol- 2721). Two buttons at once read as nonsense: this is normal for a ladder. |
| No sound | MAX98357A: BCLK **GPIO4**, LRC **GPIO6**, DIN **GPIO18**, VIN on VBAT, GND. "Speaker OK" only means I2S is running, so listen. Try **Vol+**. |
| Brief click at power-on | Expected. The amp has no shutdown pin (SD and GAIN are unconnected), so it powers up with the board. The ROM boot log on UART0 (GPIO43/44) no longer reaches the amp now that I2S is on 4/6/18, and the firmware console is USB only. A click on **every** reset means the amp is still wired to 43/44: move it to 4/6/18. |
| No glow | NeoPixel data on **GPIO15**, powered from VBAT. The colours run as GRB. The chain order is 0 top-right, 1 right, 2 bottom, 3 left, 4 top-left. |
| "Motor --" | DRV2605L at 0x5A on I2C 47/48. The motor is an ERM on the DRV's OUT+/OUT-. |
| "IMU --" | The QMI8658C (0x6B) is on the board; a miss here points to the I2C bus itself. |
| Battery reads 0 or odd | BAT_ADC is GPIO5 through the 200k/100k divider (×3). There's no fuel gauge, so the reading jumps a little under load. |
| Drains while "off" | Known: the board's red LED, the idle NeoPixels and the amp draw about 3-8 mA in deep sleep (days, not months). |

## Logs
Connect with any serial monitor on the same USB port (115200 baud; the rate doesn't matter for USB-JTAG), or run `idf.py monitor`. Every part logs OK/MISS at boot, along with button presses, touches and Pipsong's lines.

## Source
The firmware source is in `/workspace/echo/firmware/echo_fw` (ESP-IDF 5.4.1). Every pin is in `main/echo_pins.h`. Art and data are converted from this app at build time by `tools/convert_assets.py`.
