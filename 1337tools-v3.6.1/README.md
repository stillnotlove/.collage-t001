# 1337tools v3.6.1

COMPOSE stabilization / render-parity patch.

## What changed
- Export and preview now share the same deterministic procedural noise and scratch data. A given `fxSeed` produces the same dots/scratches on screen and in the exported file.
- Grain, halftone and xerox preview textures were moved from CSS-only patterns to normalized SVG textures; export renders the same normalized geometry instead of unrelated patterns.
- Fixed transparent PNG + Blur parity: export no longer reapplies the original alpha mask after the base image filter, which previously cut off the blur visible in the editor.
- Text export baseline, line positioning and letter spacing were aligned to the inline SVG preview model. Canvas `letterSpacing` is used where the browser supports it, with a tracked-text fallback.
- Export explicitly waits for every font used by visible text layers before rendering.
- Export keeps one integer `order` sort for the whole scene and remains independent from Select All / selection handles / HUD state.
- Repeated identical render assets are cached during one export (image decode + rendered layer cache).
- Image layer preview components are memoized; generated procedural SVG backgrounds are cached to avoid rebuilding large data URLs on unrelated React renders.
- Exact document dimensions still come from the selected canvas ratio, not the responsive viewport size.
- Next.js remains on 15.5.24.

## Regression checks after deploy
1. Export the same composition with nothing selected and with Select All — outputs should match.
2. Transparent PNG + Blur + Halftone/Noise/Scratches.
3. Stretched/outlined text and Stamp text.
4. Shapes with stroke and blend modes.
5. 1:1, 4:5, 9:16 and 16:9 export dimensions.

## Deploy
Set Vercel Root Directory to `1337tools-v3.6.1`.
