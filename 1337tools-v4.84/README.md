# 1337tools v4.83 — lighter catalog + GLASS cleanup

This update builds on v4.82. All seven tools remain: FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN and GLASS.

## Catalog
- Replaced expensive, animated per-tool canvas hover artwork with a single CSS highlight on all seven cards.
- Hover/focus uses a subtle white glow and border emphasis, without moving cards or tool names.
- Eliminated catalog hover React state updates and perpetual requestAnimationFrame loops; CSS-only hover does not obstruct scrolling.
- Preserved the existing responsive seven-tool layout, branding, credits and entrance screen.

## GLASS
- Removed FROSTED mode. Modes are now CLEAR / PRISM / LIQUID / SATIN.
- Kept lens positions, lens visibility toggle and clean PNG / PNG alpha / EDITOR exports.
- Fixed duplicate GLASS tool_open tracking so navigation generates one Vercel Analytics event.

## Verification
Run `npm run audit` to check imports, routes, seven tools, high-resolution exports, the new hover architecture and GLASS controls.
Full Next.js production build requires npm dependencies and was not run in this environment.
