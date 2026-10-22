export const TAU = Math.PI * 2;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
