# Art style

The target is the look of the wizard atlas (`client/public/art/workshop/wizard_workshop_game_atlas.png`)
and the spellbook icons: **pixel art with a dark outline and flat shading**. New art (the map first)
is drawn to match it. Compare against the real thing on `/art/map/pixel-test.html` before calling a
piece done.

## The rules

1. **Light comes from the top left.** Always. Light faces point up and left, dark faces point down and
   right, highlights sit on the top-left edge, cast shadows fall down and to the right. Never flip a
   sprite horizontally to make a variant (it reverses the light); draw it again.
2. **Pixel art, no smoothing.** Every piece is drawn pixel by pixel in a pixel editor. The game draws
   with smoothing off, so pixels stay crisp. No anti-aliased brushes, no blur, no gradients.
3. **One dark outline, 1 px.** A dark blue-grey from the palette (not pure black) all the way round.
4. **Flat shading with 3 or 4 tones per material.** Light, mid, dark (and a highlight). Hard edges between
   tones, no blending.
5. **Chunky, simple shapes.** Few details, all the same size. A few straight edges and corners rather than
   perfect curves. No tiny noise.
6. **One palette.** Only colours from the project palette (see below). Do not add colours; if a colour is
   missing, change the palette in this file and tell everyone.
7. **Matte.** No glossy sparkle highlights. A highlight is 2 to 4 pixels of the lightest tone.

## Palette

TBD: write the palette name, its Lospec link and the file name here once chosen, and commit the `.gpl`
to `art-src/palette/`.

## Sizes and scale

- The wizard parts are drawn in game at **0.32 of the atlas size** (`scale` in `client/src/workshop/inMatch.ts`),
  with smoothing off. The head is about 50 px tall on screen.
- A boulder is drawn about **2.7 times its collision radius wide** (radius 28 to 52 gives 76 to 140 px).
  A 64x64 canvas with the rock about 50 to 56 px wide gives about the same pixel size as the wizards.
- Leave 1 to 2 px of transparent margin round every sprite.
- Keep a sprite's base (where it touches the ground) near the bottom centre; the game anchors map pieces
  by their base.

## Shadows

Where a piece has a ground shadow it is baked into the PNG as a flat, dark, slightly see-through shape
under the piece, a little to the lower right. Same direction for every asset.
