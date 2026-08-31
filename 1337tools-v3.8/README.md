# 1337tools v3.8

Small stabilization + process-first patch.

## Changes
- Fixed marquee selection using a live pointer rectangle instead of stale React state; the canvas click after a marquee no longer clears the new selection.
- `REROLL ALL` now rerolls the whole Image Lab treatment state in useful ranges, not only a texture seed.
- Removed the remaining scratches default from the effects model.
- Repeat is now random-first: one-click `Random repeat`, with manual sliders collapsed into `Manual controls`.
- Kept manual `Repeat current` for fine-tuned values.
- Preserved v3.7 clipboard paste, text stamp fonts, halftone controls, micro-noise, layer-order controls and export parity work.

## Deploy
Set Vercel Root Directory to `1337tools-v3.8`.
