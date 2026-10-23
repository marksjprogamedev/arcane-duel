// Copy to the clipboard. The Clipboard API only exists on secure pages, and the game is also served
// over plain HTTP, so fall back to selecting the text on the page and the old copy command.

/** Copies `text`; `shownIn` is the field or element showing it, selected for the fallback. True if copied. */
export async function copyText(text: string, shownIn: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (shownIn instanceof HTMLInputElement || shownIn instanceof HTMLTextAreaElement)
      shownIn.select();
    else {
      const range = document.createRange();
      range.selectNodeContents(shownIn);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    return document.execCommand('copy');
  }
}
