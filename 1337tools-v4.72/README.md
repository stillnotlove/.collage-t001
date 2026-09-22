# 1337tools v4.72

DITHER release.

## New tool
- 06 DITHER
- Threshold, Bayer 4×4, Bayer 8×8, Floyd–Steinberg, Atkinson and Noise modes
- Detail, levels, threshold, contrast, brightness, amount and noise controls
- Custom ink / paper colors and palette presets
- Randomize + seed reroll
- Drag/drop, paste, ratio support, PNG / PNG alpha export
- CONTINUE routing to every processing tool and SEND TO EDITOR
- Vercel `tool_open` analytics automatically includes DITHER

## QA
The audit now validates six tools, all tool-to-tool routes, analytics mapping, shared range controls, input race guards, export contracts and the catalog integration.

## HQ PNG export patch
- FIELD PNG output and FIELD handoffs render at 2× document resolution.
- EDITOR PNG / PNG alpha render at 2× document resolution; JPEG remains at document resolution.
- EDITOR text and shape layers use adaptive high-resolution rasterization instead of a fixed 1000px intermediate canvas.
- High-quality image smoothing is enabled in the export renderer.
