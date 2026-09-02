# 1337tools v4.53

Landing refinement release. No new tools.

## Main screen
- CLEAN → exactly 3 generated effects → CLEAN is retained
- route pool is broader, so the entry motion stays more random without breaking the current system grammar
- ASCII now has extra style patterns (tight / airy / ghost / stagger) on top of the existing glyph / block / braille / square families
- SLICE now has additional motion grammars (ripple / hinge / sweep / comb) so the band behavior feels less repetitive
- ECHO now has multiple trail patterns (trail / stack / spray / swell) with softer motion and more variation
- SLICE → ASCII and ECHO → ASCII transitions stay live for longer and morph progressively instead of feeling like a late switch
- motion-to-motion and ASCII-to-motion overlaps were softened so transitions feel less abrupt overall

## Brand / credits
- refined digit spacing in the 1337 wordmark: the gap between 1 and the first 3 is tighter, while the space between the two 3s is slightly opened up
- the same spacing logic is applied both in UI wordmarks and the animated landing mark
- the obsolete grey `PROCESS / IMAGE / SYSTEM / 1337` line remains removed

## QA
- static audit page updated to v4.52
- internal audit contract updated to the new version
- project structure / imports / tool checks preserved

## v4.53 transition rollback
- restored the v4.49 ASCII → motion exit model: same staggered strip reveal, same delayed ASCII dissolve and same motion-in curve
- restored the earlier ASCII → SLICE/ECHO transition timing and incoming intensity
- kept the broader v4.52 pattern pools and the newer SLICE/ECHO → ASCII morph work
