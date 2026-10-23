// Tabs (`.ui-tabs`, components.css): tab buttons that show one panel at a time. Each `[role=tab]` names
// its panel in `aria-controls`. Keyboard as the WAI-ARIA tabs pattern: only the selected tab is in the Tab
// order, Left/Right (and Home/End) move between tabs and show their panel at once.

export interface Tabs {
  /** Shows the tab whose panel has this id (focus stays where it is). */
  select(panelId: string): void;
  /** The id of the panel showing now. */
  current(): string;
}

/** Wires every `[role=tab]` inside `root`. `onChange` runs after the user (or `select`) switches tabs. */
export function initTabs(root: HTMLElement, onChange?: (panelId: string) => void): Tabs {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panelOf = (tab: HTMLElement) => tab.getAttribute('aria-controls') ?? '';
  let shown = panelOf(tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0]);

  const select = (panelId: string) => {
    shown = panelId;
    for (const tab of tabs) {
      const on = panelOf(tab) === panelId;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(panelOf(tab));
      if (panel) panel.hidden = !on;
    }
    onChange?.(panelId);
  };

  tabs.forEach((tab, i) => {
    tab.type = 'button';
    tab.addEventListener('click', () => select(panelOf(tab)));
    tab.addEventListener('keydown', (ev) => {
      const next =
        ev.key === 'ArrowRight'
          ? (i + 1) % tabs.length
          : ev.key === 'ArrowLeft'
            ? (i - 1 + tabs.length) % tabs.length
            : ev.key === 'Home'
              ? 0
              : ev.key === 'End'
                ? tabs.length - 1
                : -1;
      if (next < 0) return;
      ev.preventDefault();
      tabs[next].focus();
      select(panelOf(tabs[next]));
    });
  });
  select(shown);
  return { select, current: () => shown };
}
