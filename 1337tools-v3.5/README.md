# 1337tools v3.5

Stabilization + foundation release of the experimental graphic playground.

## Main fixes
- Export is independent of selection state and uses explicit document dimensions.
- Canvas ratios map to real export sizes (1:1, 4:5, 9:16, 16:9, 3:2).
- Layer ordering uses integer `order` values; Stamp/Brush no longer appears under images while listed above them.
- All shapes render through one SVG system; fill/stroke works on rect, circle, triangle, star, cross and line.
- Text renders as scalable SVG; resize handles now scale text and outline modes are visible.
- Multi-selection can change Fill, Stroke, Stroke width, Opacity, Blend and image effects.
- Noise is procedural dot noise instead of repeating lines.
- Scratches use seeded randomized geometry; `Reroll noise / scratches` generates a new texture.
- `Remove BG β` is renamed to experimental `Cutout β`; `Re-cut β` intentionally produces a new edge interpretation.
- Rotated objects use rotated bounding boxes for marquee/group selection.
- Slider edits are grouped into one Undo transaction per gesture.
- Generate Variation keeps a stable base until the scene is manually edited.

## Run
```bash
npm install
npm run dev
```

## Deploy
Set Vercel Root Directory to `1337tools-v3.5`.
