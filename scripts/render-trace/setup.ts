/**
 * Test setup for the draw-call trace: a fake browser (document, window, Image, localStorage) whose
 * canvas contexts record every call and every property set, plus fixed clocks. Everything lives on
 * `globalThis.__trace` so it survives `vi.resetModules()`.
 */

type Entry = unknown[];

const METHODS = new Set([
  'save',
  'restore',
  'translate',
  'rotate',
  'scale',
  'transform',
  'setTransform',
  'resetTransform',
  'beginPath',
  'closePath',
  'moveTo',
  'lineTo',
  'bezierCurveTo',
  'quadraticCurveTo',
  'arc',
  'arcTo',
  'ellipse',
  'rect',
  'roundRect',
  'fill',
  'stroke',
  'clip',
  'fillRect',
  'strokeRect',
  'clearRect',
  'fillText',
  'strokeText',
  'drawImage',
  'putImageData',
  'setLineDash',
  'isPointInPath',
]);

/** Rounds numbers to 1e-6 and turns objects into stable text, so entries compare as plain JSON. */
function norm(v: unknown): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : String(v);
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') {
    const o = v as { __id?: string; src?: string };
    if (o.__id) return o.__id;
    return `object:${Object.prototype.toString.call(v)}`;
  }
  return v;
}

const T = {
  log: [] as Entry[],
  counter: 0,
  props: new Map<string, Map<string, unknown>>(),
  /** Whether images report themselves loaded (decided per pass of the test). */
  imagesLoaded: true,
  begin() {
    T.log = [];
    T.counter = 0;
    T.props.clear();
  },
  end(): Entry[] {
    const out = T.log;
    T.log = [];
    return out;
  },
  push(tag: string, name: string, args: unknown[]) {
    T.log.push([tag ? `${tag}:${name}` : name, ...args.map(norm)]);
  },
};

/** An object returned by a context method (gradient, pattern, matrix): it logs what is done to it. */
function standIn(kind: string, tag: string) {
  const id = `${kind}#${T.counter++}`;
  const target: Record<string, unknown> = { __id: id };
  return new Proxy(target, {
    get(t, p) {
      if (typeof p === 'symbol') return undefined;
      if (p in t) return t[p];
      return (...args: unknown[]) => T.push(tag, `${id}.${p}`, args);
    },
    set(t, p, v) {
      t[p as string] = v;
      T.push(tag, `${id}.set ${String(p)}`, [v]);
      return true;
    },
  });
}

function recordingContext(tag: string, canvas: unknown) {
  const own: Record<string, unknown> = { canvas };
  return new Proxy(own, {
    get(t, p) {
      if (typeof p === 'symbol') return undefined;
      if (p in t) return t[p];
      if (METHODS.has(p)) return (...args: unknown[]) => T.push(tag, p, args);
      if (
        p === 'createLinearGradient' ||
        p === 'createRadialGradient' ||
        p === 'createConicGradient'
      )
        return (...args: unknown[]) => {
          const r = standIn('gradient', tag);
          T.push(tag, p, [...args, (r as { __id: string }).__id]);
          return r;
        };
      if (p === 'createPattern')
        return (...args: unknown[]) => {
          const r = standIn('pattern', tag);
          T.push(tag, p, [...args, (r as { __id: string }).__id]);
          return r;
        };
      if (p === 'measureText')
        return (text: string) => {
          T.push(tag, p, [text]);
          return {
            width: String(text).length * 6,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
          };
        };
      if (p === 'getTransform')
        return () => {
          T.push(tag, p, []);
          return standIn('matrix', tag);
        };
      if (p === 'getImageData' || p === 'createImageData')
        return (...args: unknown[]) => {
          T.push(tag, p, args);
          return { data: new Uint8ClampedArray(4), width: 1, height: 1 };
        };
      return undefined;
    },
    set(t, p, v) {
      t[p as string] = v;
      T.push(tag, `set ${String(p)}`, [v]);
      return true;
    },
  });
}

let canvases = 0;
function fakeCanvas(id?: string) {
  const n = canvases++;
  const base: Record<string, unknown> = {
    __id: id ? `canvas:${id}` : `canvas#${n}`,
    width: 1067,
    height: 600,
    style: {},
  };
  const tag = id === 'game' ? '' : `c${n}`;
  let ctx: unknown;
  base.getContext = () => (ctx ??= recordingContext(tag, base));
  return base;
}

function element(id: string) {
  const base: Record<string, unknown> =
    id === 'game'
      ? fakeCanvas('game')
      : {
          style: {},
          dataset: {},
          classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
          children: [],
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 1067, height: 600 }),
        };
  return new Proxy(base, {
    get: (t, p) => (p in t ? t[p] : typeof p === 'symbol' ? undefined : () => undefined),
    set: (t, p, v) => ((t[p as string] = v), true),
  });
}

class FakeImage {
  __id = 'image:?';
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private source = '';
  get src() {
    return this.source;
  }
  set src(v: string) {
    this.source = v;
    this.__id = `image:${v}`;
    if (!T.imagesLoaded) return;
    this.complete = true;
    this.naturalWidth = this.width = 4096;
    this.naturalHeight = this.height = 4096;
    this.onload?.();
  }
}

const g = globalThis as Record<string, unknown>;
g.__trace = T;
const elements = new Map<string, unknown>();
g.document = {
  getElementById: (id: string) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  },
  createElement: (tag: string) => (tag === 'canvas' ? fakeCanvas() : element(tag)),
  addEventListener() {},
  body: element('body'),
  documentElement: element('html'),
};
g.window = Object.assign(g, {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  devicePixelRatio: 1,
  innerWidth: 1067,
  innerHeight: 600,
});
g.Image = FakeImage;
const store = new Map<string, string>();
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
g.CustomEvent = class {
  constructor(
    public type: string,
    public init?: unknown,
  ) {}
};

/** Fixed clocks, and a seeded Math.random (reseeded at the start of every case by the test). */
Date.now = () => 1_700_000_000_000;
performance.now = () => 1000;
let seed = 1;
export function seedRandom(s: number) {
  seed = s >>> 0;
}
Math.random = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
g.__seedRandom = seedRandom;
