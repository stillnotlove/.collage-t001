# 1337tools v4.54

Entry animation engine rebuild. No UI changes outside the release version.

## What changed
- the landing animation logic was rebuilt from scratch
- the old phase-by-phase transition wiring was replaced with a clean timeline/segment engine
- every cycle is still `clean → 3 generated effects → clean`
- ASCII / SLICE / ECHO variants and the broader random route pool are retained
- transitions are now rendered through one normalized compositor path, with dedicated strip-based reveals for any transition that involves ASCII
- motion states are rendered live during transitions instead of switching between mismatched transition models
- resize / visibility handling is preserved so the main screen does not jump or freeze after tab changes

## Intention
This release is specifically meant to remove the visual bugs and broken feel that appeared after the transition model kept being patched incrementally.

## QA
- internal audit updated to v4.54
- root structure unchanged
