## v4.94 — GLASS clear-only and artifact-free CLEAN view

Based on v4.93. The only tool changed is **05 GLASS**.

- Removed alternative lens textures: CLEAR is now the only glass character. RANDOMIZE keeps CLEAR while varying lenses and distortion.
- `HIDE HUD → CLEAN` now hides **both** editing guides/handles and the white lens surface / highlight circles; refracted geometry, RGB dispersion and the source remain. `SHOW HUD → EDIT` restores editable lens controls and the original visual character.
- PNG, PNG α, SEND TO EDITOR and CONTINUE render without guides. Their lens sheen follows the active EDIT/CLEAN state, so a CLEAN preview exports CLEAN as well.
- Images with transparency automatically display over a checkerboard **in the GLASS preview only**. The checkerboard is never exported. PNG α preserves actual transparency.
- Existing lens positions, strengths, drag interaction, RANDOMIZE, export resolution, blue palette, navigation and SCAN optimizations remain unchanged.
- Tested the GLASS Canvas renderer in Chromium with transparent and opaque samples. The EDIT result matches the v4.93 CLEAR renderer byte-for-byte; CLEAN has no decorative glow. The transparent sample kept the same alpha mask. Source audit and TypeScript JSX syntax parsing pass. **The full Next.js production build and React E2E flow were not run.**

See `QA_V4.94.md` for details.

## v4.93 — presentation-safe performance pass

Based on v4.92. **No visual changes**, tool numbering, color (#0047DE), catalog navigation or output formats changed.

- SCAN: the live scan source, including costly B/W conversion, now renders only when its image, position, scale, output mode or canvas size changes. The scanner strip capture still runs at the normal frame rate; React HUD progress updates are throttled to about 10 updates per second.
- GLASS: preallocated four-channel sampling buffers replace per-pixel array allocations in CLEAR, PRISM, LIQUID and SATIN. Pixel comparisons with v4.92 passed with zero differences in the tested images/modes.
- GLASS: stabilised the preview drawing callback so toggling lens guides or dragging a lens never retriggers incoming image-file loading.
- Tests: 25 JSX/JS source files parse without syntax errors; CSS parses; original source audit passes. Browser-integrated Next.js tests and production build remain unverified because npm registry DNS is unavailable in this environment. See QA_V4.93.md.

## v4.92 — quicker splash-to-index transition

Reduced the entry-to-catalog blue-curtain fade from **720 ms to 460 ms**, preserving the existing easing, motion-free catalog container, seven tools, card hover, and rapid reverse navigation. Based on v4.91; no tool changes.

## v4.91 — translucent catalog cards restored

Based on v4.90, with the same **#0047DE** cobalt throughout splash, catalog, and tool interfaces. The seven INDEX tiles again have semi-transparent white fills (6.5% default, 12% EDITOR, 7.5% GLASS), a thin white border, and a subtle 5px glass blur. On hover/focus, the tile brightens and shifts (-4px, -4px) with its offset shadow. Text remains static; the dark background word follows the hovered/focused tool. No changes to the seven tool implementations, COLOR/NONE controls, exports, or site navigation.

## v4.90 — technical blue palette adjustment

The primary interface blue is now **#0047DE**, between v4.88/4.89's darker #0035BD and the older bright #0052F5. The stage is **#0035A9** and the shadow/deep tone is **#001B66**. Updated global CSS, browser/PWA theme, app icons and BLUE presets in FIELD, ECHO and EDITOR. No behavior changes to tools, NONE painting, index hover, navigation, or exports.

# 1337tools v4.89 — deeper cobalt blue

This release is based on v4.84. **08 WEAVE has been removed completely** from the catalogue, routing, CONTINUE and implementation. Seven tools remain: FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN, GLASS.

Hovering a catalog card now moves the whole card up-left by 4px and reveals the original offset shadow. Card text stays static; no animated canvas labels. Keyboard focus has equivalent feedback and reduced motion is respected.

No other tool rendering or exports were intentionally changed. Run `npm run audit` for structural checks. Full Next.js build requires project dependencies; browser verification should be repeated on Vercel Preview, especially Safari.

## v4.86

Restores dynamic dark background tool lettering on catalog hover and keyboard focus. The card shifts remain CSS-only while labels stay static. The background returns to FIELD when no card is hovered, and hover state clears on wheel scroll.


## v4.86 — entry pacing and blue correction

- INTRO (splash → catalog): blue cover dissolves over **720 ms**, with no transform on the catalog and no interactive scroll blocker.
- Tool / credits → INDEX remains immediate; the return path is intentionally faster.
- The brand UI blue is now `#0052F5` (with matching blue-dark/deep), shifting from violet-indigo to a cooler, cleaner blue. Theme metadata and BLUE presets are aligned.
- Hover switches the oversized dark background text to the hovered or keyboard-focused tool, while the card itself translates and its label stays static.

## v4.87 — tool order and numbering

The catalog and workspace headers now use **05 GLASS → 06 ECHO → 07 SCAN**. This matches the existing visual grid position: GLASS beside EDITOR, then ECHO and SCAN on the following row. All seven tool implementations, hover motion, blue palette and entry timing are otherwise unchanged.

## v4.88 — deep saturated blue

The primary brand blue is now `#0035BD` instead of the lighter `#0052F5`, with a matched stage tone `#002785` and depth tone `#00165B`. Theme metadata, application icons, and the BLUE choices in FIELD / ECHO / EDITOR are synchronized. Layout, animations, numbering and tool functionality are unchanged from v4.87.


## v4.89 — consistent site blue and true NONE paint

- Primary UI surfaces use one saturated cobalt `#0035BD`, including splash, index, tool chrome. Removed translucent blue/white idle-index card films and catalog atmosphere wash. The hover card translation and deep background tool word remain.
- EDITOR paint controls: separate COLOR and NONE choices, preserve previous paint when switching back. Applies to text fill/outline, shapes fill/stroke, stamp brush and group editing.
- A null fill/stroke is preserved on subsequent stamp edits and in the SVG/Canvas PNG export. OUTSIDE text stroke no longer fills the glyph when fill is NONE.
- Fresh deployment is required. A previous production page still showing `#0052F5` is serving old version/assets.
