# 1337tools v4.75 — SCAN v1

Adds the experimental **06 SCAN** tool without changing existing tool internals.

SCAN provides FLATBED, OFFICE, COPY OF COPY presets, monochrome or color output, manual tone / defects / geometry / paper controls, image positioning, a repeatable machine seed (`NEW MACHINE`), randomized settings, cumulative `COPY AGAIN`, and `RESTORE ORIGINAL`. Processing happens locally in a deterministic staged canvas pipeline. PNG / PNG α export and transfers to EDITOR / other tools use the rendered scan. PNG α treats light paper as transparent.

No DITHER component was reintroduced. FIELD and EDITOR retain 2× PNG export; EDITOR export dock remains visible. Vercel Analytics now also tracks `tool_open` with `tool: SCAN`.

## Validate

Run `npm run audit`, `npm run build`, then test in browser:

1. Open all six tools from index, check each legacy tool exports correctly.
2. SCAN: upload/drop/paste JPG/PNG, switch ratio, adjust settings, reroll machine.
3. Compare repeated `COPY AGAIN` to the first generation; use `RESTORE ORIGINAL`.
4. Export PNG and PNG α; check both are nonempty and match selected ratio.
5. Test SCAN → EDITOR and SCAN → FIELD / SLICE / ASCII / ECHO; also old tool → SCAN.
6. Recheck EDITOR's persistent export dock and 2× PNG export.

For stability, SCAN currently exports at the chosen document pixel size. Full CMYK screening and physical toner simulation are intentionally deferred.
