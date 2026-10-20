# QA v4.86

- Homepage catalogue displays exactly seven distinct tools, ending with 07 GLASS.
- WEAVE no longer appears in navigation or CONTINUE.
- Hover on every card translates the *card* by 4px up-left with a 6px offset shadow. Text does not animate independently.
- Wheel/trackpad scroll should work while pointer is directly above any card.
- Tap/focus on mobile and with reduced-motion preferences do not trigger hover animation.
- FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN, GLASS route and exports should work unchanged.
- `npm run audit` checks structural integrity only; it is not a production build.

## Background lettering regression
- Hover FIELD, SLICE, ASCII, EDITOR, ECHO, SCAN, GLASS: the large dark background word and number must match the card.
- Hover ECHO: background reads ECHO, not FIELD.
- Move pointer away: background resets to FIELD.
- Keyboard tab/focus: background matches focused card.
- Card shift and static label remain unchanged.


## Entry / color regression (user feedback)
- Click the static splash: the catalog fades in smoothly over 720 ms.
- Return from a tool to INDEX: returns immediately, without the splash reveal.
- Confirm trackpad scrolling on INDEX is not blocked by the curtain or cards.
- Brand canvas/splash/index/workspaces/browser theme are a consistent, clean blue `#0052F5`; no purple Discord cast.
- The BLUE canvas-background presets in FIELD/ECHO/EDITOR use the same blue.
- Reduced motion: the reveal animation is disabled.
