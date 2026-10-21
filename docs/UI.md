# UI design system

One look for every menu, defined in one place. Read this before building or changing any menu
screen. Live preview of everything below: `/ui/styleguide.html` (e.g. http://159.13.37.255:8082/ui/styleguide.html).

## The three layers

| Layer          | File                                        | What it holds                                                                      |
| -------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Tokens**     | `client/public/ui/theme.css`                | Every colour, size, radius, font, motion value and art slot. Change the feel here. |
| **Components** | `client/public/ui/components.css`           | `.ui-*` classes that read only tokens. Never hard-code a colour or size here.      |
| **Pages**      | `client/index.html`, `illustrated-menu.css` | Compose components; place things on the screen. No button, panel or field looks.   |

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
| 3    | `ui-btn--secondary` | Supporting action (Back, Copy, Leave, Resume)    | blue           |
| 4    | `ui-btn--icon`      | Square, one glyph (close, cog, copy)             | blue           |

Colours: `is-gold` (primary), `is-blue` (neutral/back), `is-red` (leave, quit, destructive),
`is-green` (confirm, start, ready). One hero per screen; destructive actions are red and never
the hero.

**Art slot.** To use finished artwork for a button instead of the CSS look, add `ui-btn--art` and set
`--ui-btn-art: url(...)` and `--ui-btn-ratio: <width>/<height>` on it (the main menu does this in
`illustrated-menu.css`). The text stays in the markup for screen readers. Only the middle 76% of an art
button is clickable. Panels have a similar slot (`--ui-art-panel-border`, a 9-slice).

## Containers and forms

- `.ui-screen`: every menu overlay (dim backdrop, centred column). `.ui-screen__footer` for Back.
- `.ui-panel` (`--wide`, `.ui-panel__title`): parchment frame for content.
- `.ui-stack`: vertical stack of menu buttons (alternate ones lean). `.ui-row`: wrapping row.
- `.ui-field` (inputs, selects; `--code` for room codes), `.ui-label`, `.ui-toggle`, `.ui-slider`.
- `.ui-title`, `.ui-note`: text on the backdrop or inside a panel.

## Screen layout

Every screen follows the main menu: a centred column on the shared backdrop, title (art or
`.ui-title`) at the top, one panel or stack in the middle, one hero action, and a footer with Back.

## Changing the look

- Restyle everything: edit `theme.css` (palette, radius, border width, font, lean, hover lift).
- Replace the look of a button type with art: art slot above. Replace a colour: change that colour's
  `--ui-<colour>-*` tokens.
- Font: change `--ui-font`; sizes are `--ui-text-*`.
