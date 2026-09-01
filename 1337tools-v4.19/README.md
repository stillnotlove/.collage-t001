# 1337tools v4.19

Vercel Root Directory: `1337tools-v4.19`

## v4.19
- Browser / install / share name is normalized to `1337tools` via Next metadata and web manifest. The version number remains only inside the app UI.
- Added a native 1337tools favicon/app icon instead of relying on a platform/default icon.
- FIELD background control is restored: color picker + PAPER / WHITE / BLUE / BLACK presets.
- FIELD preview now renders the selected background; `PNG α` remains transparent.
- Removed FIELD canvas shadow/background artifacts so the stage does not create stray bands around the render.
- Entry animation now uses a connected generative pipeline instead of isolated effect swaps. Each cycle generates a random valid route through SLICE / ASCII / SCAN / DISTRESS / ECHO and then REBUILDs into the clean wordmark.
- Effects are cumulative during a route, so the mark visibly transforms from the previous state rather than hard-switching to an unrelated render.
- Entry ASCII sampling uses a small proxy grid to keep real-time rendering lighter.
- `1 → 3` local kerning was tightened slightly again in the live mark.

## Validation
- JS/JSX syntax transpile check: passed.
- Local relative import check: passed.
- Full Next browser/build QA was not run in this environment.
