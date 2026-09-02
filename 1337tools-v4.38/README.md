# 1337tools v4.38

Stability and detail-cleanup release. No new tools.

## Changes
- rebuilt the live entry animation around cached effect snapshots: each effect renders once from the clean wordmark, then only lightweight canvas crossfades run per frame
- removed heavy OUTLINE/TILES-style entry states and cumulative effect chaining, preventing FPS drops and stuck ASCII remnants
- SLICE now uses the exact same glass surface and offset underlay logic as the other tool cards
- Credits only: `1337` uses the same light visual weight as `tools`
- reduced the global gap between `1337` and `tools`
- range controls show a single stable numeric value with tabular digits and fixed-width alignment
- slider thumbs are static circles on a thin track
- HUD section markers are three yellow dots instead of skewed yellow bars
- catalog keeps `visual processing system`; the secondary tagline remains removed
- tool-name hover transformations remain white
- HUD action buttons remain transparent; yellow is a text accent rather than a filled button surface

## Stability
FIELD / SLICE / ASCII / ECHO / EDITOR behavior, ratios, PNG/PNG alpha export, CONTINUE flow, image-load guards, STAMP fill/stroke controls, and the approved Credits copy remain intact.
