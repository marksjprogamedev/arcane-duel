export const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

export const cv = $<HTMLCanvasElement>('game');

export const g = cv.getContext('2d');
