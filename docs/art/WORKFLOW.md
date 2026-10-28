# Art workflow

## Tools

- **Pixelorama** (free, open source) for drawing. Aseprite works too. Palette from Lospec: download the `.gpl`
  and import it into the palette panel.
- Draw each piece on its own canvas (64x64 for a boulder). Keep the fill, the shadow and any guide outline on separate layers; delete or hide the guide outline before exporting (no outlines in final art, see `STYLE.md`).

## Files

- **Source files** (the Pixelorama `.pxo` project, palettes) go in `art-src/`, which is not served to players:
  `art-src/map/rock_a.pxo`, `art-src/palette/`.
- **Game files** are exported PNGs (lossless, transparent background, RGBA) in `client/public/art/<area>/`,
  e.g. `client/public/art/map/rock_a.png`. PNG is the format of record; do not use lossy formats for
  pixel art. File names are lower_snake_case.
- Commit the source and the export together.

## Checking a piece

1. Open `/art/map/pixel-test.html` (on your slot, or `npm run dev`), drop the PNG on it.
2. Compare with the wizard parts at 1x and 2x zoom: number of tones, light direction, and that the shape still reads against the ground without an outline.
3. Set "Width in game px" to the size it will have, and "Collision radius" to see the circle it must match.
4. Toggle "smooth" to confirm you can tell a crisp pixel from a blurry one.

## Getting it into the game

Map pictures are loaded by `client/src/render/arena/mapArt.ts` and drawn by the map's file in
`client/src/render/arena/` (the dev battleground: `devBattleground.ts`). Add the file name to `FILES` in
`mapArt.ts`, then draw it where needed. Art code stays client-only; collision stays in `shared/maps.ts`.

Every art change also needs a `CHANGELOG.md` entry and manual test items in `docs/TEST-CHECKLIST.md`
(see `AGENTS.md`).
