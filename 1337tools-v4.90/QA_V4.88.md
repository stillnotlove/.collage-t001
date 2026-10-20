# QA v4.88 — darker saturated blue

- Main UI blue: `#0035BD`; darker panels: `#002785`; deep shadows: `#00165B`.
- Main intro, INDEX, CREDITS, tool interfaces, transitions and browser theme share the updated palette.
- Main application favicon, 512px icon and Apple touch icon use updated primary blue; clear browser favicon cache when testing.
- BLUE preset in FIELD / ECHO / EDITOR uses the updated `#0035BD`.
- Catalogue remains seven tools. Hover still shifts each card by 4px and changes the large dark background word, not the label animation.
- Main intro→catalog curtain stays 720 ms; tool→index stays fast.
- No tool-specific behavior changed beyond the BLUE color preset.
- `npm run audit` performs structural checks; Next production build / WebKit browser QA remain independent checks.
