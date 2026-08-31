# 1337tools v4.1 — SYSTEM SHELL

v4.1 changes the product flow before adding more tools.

## New flow
ENTRY → SYSTEM INDEX → TOOL → STAGE → OUTPUT

## What changed
- Added a dedicated ENTRY screen instead of opening directly into a tool.
- Added SYSTEM INDEX as the main menu for FIELD / ECHO / TYPE / STAMP / STAGE.
- FIELD is the only active tool for now; future systems stay visible as SOON instead of becoming fake features.
- Removed the old four-button tool switcher from FIELD.
- Added shared STAGE as a slide-over layer available from FIELD and the index.
- FIELD output is sent to STAGE as a transparent PNG, so multiple system outputs can actually stack.
- STAGE supports output ordering, opacity, blend mode, removal and flattened PNG export.
- Direct FIELD PNG export remains available.
- Product language is now centered on systems and process instead of editor features.

## Current product rule
INPUT → RULE → RANDOM → LOCK → REROLL → OUTPUT

## Deploy
Set Vercel Root Directory to `1337tools-v4.1`.
