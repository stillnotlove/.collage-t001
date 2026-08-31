# 1337tools v3.7

Random-first workflow update.

## What changed
- Removed scratches from the working UI and replaced the weak reroll button with a stronger `REROLL ALL` workflow for image distress values.
- Added clipboard image paste support with `Ctrl/Cmd+V` for pasted files and many copied web images.
- Added stamp text font controls: font family, weight, tracking, fill, outline and outline color.
- Added repeat randomization to speed up the process-driven workflow.
- Added layer movement controls in the action area plus fixed per-layer order bumping buttons.
- Halftone now has deeper controls: intensity, dot size, density, opacity, angle and dot color.
- Noise was rebuilt to use much smaller dots for a Photoshop-like micro-noise feel.
- Export keeps render parity with the updated procedural noise and halftone logic.

## Quick checks
1. Paste an image from another tab with `Ctrl/Cmd+V`.
2. Add stamp text and change its font.
3. Try `REROLL ALL` on an image.
4. Compare preview/export with halftone + micro-noise.
5. Use `Randomize` in Repeat and move layers with Forward/Backward.

## Deploy
Set Vercel Root Directory to `1337tools-v3.7`.
