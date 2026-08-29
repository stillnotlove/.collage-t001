# 1337tools v3.4

Experimental collage / poster playground.

## v3.4
- Multi-select: Ctrl/Cmd+A, Shift-click, group move/resize/rotate
- Stronger Stamp / Repeat chaos
- Alpha-safe distress overlays for transparent PNGs
- Local Remove BG beta + Restore BG
- ERASE ALL with Undo
- Numeric inputs next to sliders
- Text outline inside / center / outside
- Stamp / Brush: text and shapes, one stroke = one Undo

## Run
```bash
npm install
npm run dev
```

## Deploy
Set Vercel Root Directory to `1337tools-v3.4`.


## v3.4.2 bugfix
- Export inlines canvas images before html-to-image serialization (Safari/blob-safe), skips external font embedding during export, and reports the actual error.
- Star shape now uses scalable SVG geometry and follows the same width/height resize model as other layers.


## v3.4.2
- Marquee area selection (Shift adds, Alt removes)
- Group image effects for multi-selection
- Line outline rendering fixed
- Generate Variation uses a stable base and symmetric random ranges
- Canvas ratio display fix (removed conflicting max-height constraint)
