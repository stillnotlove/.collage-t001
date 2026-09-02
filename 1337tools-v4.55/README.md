# 1337tools v4.55

Performance rebuild of the landing animation only.

## Animation engine
- removes the multi-strip/full-frame transition compositor from v4.54
- ASCII transitions now use one blended source image that continues moving inside SLICE/ECHO
- SLICE/ECHO geometry is precomputed once per effect instead of rebuilt every animation frame
- next cycle (including ASCII raster generation) is prepared during browser idle time to avoid periodic hitches
- internal landing canvas resolution is capped at 1366×820 instead of rendering at full Retina/4K backing resolution
- animation work is capped around 60 fps on high-refresh displays instead of needlessly painting at 120/144 Hz
- route grammar keeps ASCII between different motion families, avoiding expensive simultaneous SLICE + ECHO transition frames
- exactly three randomized effects remain between clean states

No catalog, HUD, tools, editor or credits layout was changed.
