# UI design system

One look for every menu, defined in one place. Read this before building or changing any menu
screen. Live preview of everything below: `/styleguide.html` (e.g. http://159.13.37.255:8082/styleguide.html).

## The three layers

| Layer          | File                                          | What it holds                                                                      |
| -------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Tokens**     | `client/src/ui/theme.css`                     | Every colour, size, radius, font, motion value and art slot. Change the feel here. |
| **Components** | `client/src/ui/components.css`                | `.ui-*` classes that read only tokens. Never hard-code a colour or size here.      |
| **Pages**      | `client/index.html`, `client/src/ui/**/*.css` | Compose components; place things on the screen. No button, panel or field looks.   |

Page stylesheets, one per screen, next to their code: `client/src/ui/page.css` (header, stage, which screens start hidden),
`client/src/ui/menus/` (`menu.css`, `settings.css`, `lobby.css`, `spellbook.css`, `results.css`), `client/src/workshop/workshop.css`
and `client/src/ui/hud/hud.css` (in-match action bar, cooldowns, player info). They are plain `<link>` tags in `index.html`
pointing at `/src/...`; Vite bundles them in that order, so the order is part of the look. Images live in `client/public/art/`
(`menu/`, `results/`, `workshop/`) and CSS refers to them as `/art/...`. The style guide is its own Vite page
(`client/styleguide.html`, via `src/ui/styleguide.css`). Link order: `page`, `hud`, `spellbook` and
`results` load before `theme` and `components`, the rest after.

Rules for new UI: build it from `.ui-*` classes; if a component is missing, add it to
`components.css` (and the style guide), not to a page. No hex colours, no inline `style=""` for
looks, no new `button { ... }` rules. In-match HUD (action bar, minimap, cooldowns) is not part of this
system yet.

## Buttons: a type and a colour

Add `.ui-btn`, one type, one colour: `<button class="ui-btn ui-btn--menu is-gold">`.

| Type | Class               | Use                                              | Default colour |
| ---- | ------------------- | ------------------------------------------------ | -------------- |
| 1    | `ui-btn--hero`      | The one main action on a screen (Start, Rematch) | gold           |
| 2    | `ui-btn--menu`      | Full-width entry in a menu stack (`.ui-stack`)   | gold           |
| 3    | `ui-btn--secondary` | Supporting action (Copy, Resume, Reset)          | beige          |
| 4    | `ui-btn--icon`      | Square, one glyph (close, cog, copy, play)       | beige          |

Colours say what a button does, not what it looks like:

| Colour | Class      | Means                              | Examples                                   |
| ------ | ---------- | ---------------------------------- | ------------------------------------------ |
| Gold   | `is-gold`  | Primary entry, main-menu look      | menu stack                                 |
| Green  | `is-green` | Go / confirm / start something     | Start, Resume, Join, Ready, Play, Preview  |
| Beige  | `is-beige` | Neutral, harmless                  | Copy, Reset, page arrows                   |
| Brown  | `is-brown` | Leave this screen, nothing is lost | Back, Close                                |
| Red    | `is-red`   | Destructive or leaves the game     | Leave room, Main menu (in a match), Delete |

One hero per screen; destructive actions are red and never the hero. Toggles and sliders stay gold.

**Art slot.** To use finished artwork for a button instead of the CSS look, add `ui-btn--art` and set
`--ui-btn-art: url(...)` and `--ui-btn-ratio: <width>/<height>` on it (the main menu does this in
`ui/menus/menu.css`). The text stays in the markup for screen readers. Only the middle 76% of an art
button is clickable. Panels have a similar slot (`--ui-art-panel-border`, a 9-slice).

## Containers and forms

- `.ui-screen`: every menu overlay (dim backdrop, centred column). `.ui-screen__footer` for Back.
- `.ui-panel` (`--wide`, `.ui-panel__title`): parchment frame for content.
- `.ui-stack`: vertical stack of menu buttons (alternate ones lean). `.ui-row`: wrapping row.
- `.ui-field` (inputs, selects; `--code` for room codes), `.ui-label`, `.ui-toggle`, `.ui-slider`. A `select.ui-field` is
  upgraded to the styled dropdown (`.ui-select`) by `client/src/ui/select.ts`: call `enhanceSelects()` once at start-up (the game
  does it in `main.ts`, the style guide in `styleguideMain.ts`). Keep using the native `<select>` in code (`value`, `disabled`, options, `change`).
- `.ui-card` (+ colour, with `__icon`, `__name`, `__text`): a button that presents one choice; put several in a `.ui-row`.
- `.ui-title`, `.ui-note`: text on the backdrop or inside a panel.

## Screen layout

Every screen follows the main menu: a centred column on the shared backdrop, title (art or
`.ui-title`) at the top, one panel or stack in the middle, one hero action, and a footer with Back.

## Changing the look

- Restyle everything: edit `theme.css` (palette, radius, border width, font, lean, hover lift).
- Replace the look of a button type with art: art slot above. Replace a colour: change that colour's
  `--ui-<colour>-*` tokens.
- Font: change `--ui-font`; sizes are `--ui-text-*`.

## Status (0.34.3-0)

On the system: main menu (with the Practice panel), settings, pause, lobby, spellbook, the Wizard Workshop (`workshop/workshop.css`; its code is in `client/src/workshop/`); menu code is in `client/src/ui/menus/`, and the "Back to lobby"
button on the results screen. Not yet:

- **Results Rematch and Main Menu** are bespoke art buttons with their own glow and sparkle animation
  (`#end .result-action` in `ui/menus/results.css`). They could move onto `ui-btn--art` if the sparkles become a token.
- **Spell cards** in the spellbook (`.spellbook-family`, `.spellbook-option`) take their colours from the theme but
  are still spellbook-only CSS. Its demo arena (0.31.0-0) sits in a plain `ui-panel` with a `ui-note` hint. If a second screen needs a selectable card, make it a component.
- **In-match HUD** (action bar, minimap, cooldowns, team panel) is separate and has its own CSS (`ui/hud/hud.css`; code in `client/src/ui/hud/hud.ts` and `client/src/render/hud/`).
- **Page header and diagnostics** above and below the stage (`.top`, `#netdiag`, `#hint`) are not menus.
- The old global `button`, `select`, `.panel`, `.overlay`, `.btns` rules (`legacy.css`) are gone. The Rematch / Main Menu
  buttons, the spellbook slots and cards, and `.ui-card` now set the few properties they used to inherit (colour, font
  weight) themselves. One quirk of the old rules was kept on purpose:
  `optgroup` headings in a `.ui-field` dropdown keep the dark purple (`--ui-optgroup-bg`). (A disabled button no
  longer turns slate on hover since 0.33.14-0.)
- The hidden legacy controls in the main menu (`.menu-online`, `.menu-solo`, ...) stay because the menu buttons
  click them; folding them into the real handlers would let that block go.
