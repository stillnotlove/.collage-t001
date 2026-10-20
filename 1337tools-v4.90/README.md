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
