# 1337tools v3.10

Random-selected + HUD optimization update.

## HUD optimization
- Main controls are now grouped into compact collapsible HUD sections instead of one long wall of sliders.
- Groups animate open/closed and remember their state in the browser.
- Left HUD: Shapes, Stamp / Brush, Canvas, System.
- Right HUD is contextual: Layers, Transform / Multi Selection, Type / Shape / Image controls, Repeat, Randomize Selected and Layer Actions.
- Image Lab is split into Image, Adjust and Distress / Random groups.
- Halftone detail controls are nested under a smaller `Halftone controls` disclosure.
- Random-focused groups stay visually highlighted in yellow.

## Random workflow
- `RANDOMIZE SELECTED` works for one or many selected unlocked layers.
- One macro control: `Order ↔ Chaos`.
- Image layers can reroll image treatment; text and shapes can vary styling at higher Chaos.
- `Random Repeat` remains the fast path for procedural repetition.
- One random action = one Undo step.

## Stability kept from previous builds
- Marquee selection fix.
- Clipboard image paste with Ctrl/Cmd+V.
- Layer order controls and visibility/lock Undo.
- REROLL ALL, micro-noise and halftone controls.
- Preview/export procedural parity work.

## Quick checks after deploy
1. Collapse and reopen HUD groups; refresh the page and confirm the state is remembered.
2. Select image / text / shape and verify only relevant contextual groups appear.
3. Test RANDOMIZE SELECTED with one and several layers.
4. Test Random Repeat and one-step Undo.
5. Paste an image with Ctrl/Cmd+V.
6. Export Noise + Halftone and compare preview vs output.

## Deploy
Set Vercel Root Directory to `1337tools-v3.10`.
