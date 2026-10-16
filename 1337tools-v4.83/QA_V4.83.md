# Manual smoke test — 1337tools v4.83

1. Deploy a Preview on Vercel; verify all seven catalog cards visible at wide desktop, tablet and phone sizes.
2. Hover or focus any card: same subtle white highlight; no text morph, moving geometry, or heavy animation.
3. Use wheel / trackpad over each catalog card; document should scroll freely, including Safari.
4. Open each tool and return to catalog. Ensure FIELD / SLICE / ASCII / EDITOR / ECHO / SCAN preserve existing behavior.
5. Open GLASS: available presets should be CLEAR / PRISM / LIQUID / SATIN. FROSTED is absent.
6. Test GLASS drag, hide guides, RANDOMIZE, PNG and PNG alpha output; exported image must contain refraction but no guide rings.
7. Send GLASS into EDITOR; ensure image and tool-open analytics are preserved without duplicate GLASS events.
8. Smoke-test FIELD/EDITOR 2× PNG export and editor color NONE toggles.
