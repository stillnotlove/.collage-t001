# SAI — v7, targeted update of approved sai-6

## Changes
- Preserved the existing homepage/intro, navigation, transition cross-dissolve, typography, cart, and product click-to-view logic.
- Replaced the plain text-only collection cards with equal-size **compact rectangular cards**, using product photos on a white surface and the existing black/white/#dddde0 palette.
- Six distinct incense scent SKUs all reference the **one exact user-supplied file** `sticks-approved.png` (no regenerations or color variants).
- Used the approved monochrome matchbox photo `matches-approved.png` for the Matches card and details.
- Used the approved smoking steel holder `holder-white-smoke-approved.png` for the Holder card; retained the original approved HQ gallery in the detail overlay.
- Replaced only the second photo in Philosophy with the exact new image `philosophy-steel-detail.png`.
- Reduced Philosophy headline and row/card dimensions and removed final quote panel.
- Unpriced matches/journal remain not purchasable; journal card retains an empty white photo area ready for the later image.

## Preservation
- Based strictly on approved `sai-6`; original project is untouched.
- No files/credentials/domains belonging to 1337tools involved.

## QA
- JS syntax + static asset verification + build via `npm run check`.
- Manual browser interaction tests reported separately in the final reply.
