# Manual browser smoke test — v4.78

1. In the index, check all six tiles at large and narrow widths; click ECHO and SCAN independently.
2. In SCAN, upload a colored image, select COLOR, START SCAN; drag while the scanner line moves. Repeat with B/W.
3. Set SCAN EFFECT to 0 and then 100; verify the visual difference. Adjust FINE GRAIN and check for fine texture (not black blobs).
4. Click RANDOMIZE twice; verify the scan moves automatically and produces different results, without changing COLOR/BW or direction.
5. Try CLEAN/RAW/BROKEN; PAUSE, resume, CLEAR PASS; and both scan directions.
6. Export PNG/PNG alpha; verify size, content and whether scan distortion matches the on-screen preview.
7. Send a scan to EDITOR, test EDITOR PNG and PNG alpha export, then return to FIELD and check its HQ PNG export.
8. Try CONTINUE from SCAN to another effect, and back to the index. Check console errors.
