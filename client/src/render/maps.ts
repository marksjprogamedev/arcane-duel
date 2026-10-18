// Map artwork is client-only; what is solid and where things stand comes from shared/maps.ts.
import { g } from '../dom';
import { ARENA_HEIGHT, ARENA_STRETCH, ARENA_WIDTH, pillars } from '../../../shared/constants';
import { MAPS as MAP_DEFS, type MapId } from '../../../shared/maps';
import { TAU } from '../../../shared/math';
import { pillar, scenery as enchantedArena } from './primitives';
import { PILLAR_FOOT } from './pillarMath';
import { darkCircleScenery } from './darkCircle';
import { devBattlegroundScenery } from './devBattleground';
import { ruinsScenery } from './ruins';

export const MAPS = [
  { id: 'enchanted', name: 'Enchanted Arena', icon: '🌲' },
  { id: 'temple', name: 'Forgotten Temple', icon: '🏛️' },
  { id: 'volcano', name: 'Volcanic Crucible', icon: '🌋' },
  { id: 'frozen', name: 'Frozen Lake', icon: '❄️' },
  { id: 'colosseum', name: 'Sunken Colosseum', icon: '🏜️' },
  { id: 'astral', name: 'Astral Platform', icon: '✨' },
  { id: 'graveyard', name: 'Haunted Graveyard', icon: '🪦' },
  { id: 'grove', name: 'Enchanted Grove', icon: '🍄' },
  { id: 'tower', name: "Archmage's Tower", icon: '🔮' },
  { id: 'darkcircle', name: "Dark Wizards' Circle", icon: '🧙' },
  { id: 'ruins', name: 'Ruined Keep', icon: '🏰' },
  { id: 'devbattle', name: 'Development Battleground', icon: '🗺️' },
] as const satisfies readonly { id: MapId; name: string; icon: string }[];

const KIND_LABELS = { arena: 'Arenas', battleground: 'Battlegrounds' } as const;

/** `<option>`s for a map picker, grouped by kind; a kind with no maps yet is left out. */
export function mapPickerHtml(): string {
  return (Object.keys(KIND_LABELS) as (keyof typeof KIND_LABELS)[])
    .map((kind) => {
      const options = MAPS.filter((m) => MAP_DEFS[m.id].kind === kind).map(
        (m) => `<option value="${m.id}">${m.icon} ${m.name}</option>`,
      );
      return options.length
        ? `<optgroup label="${KIND_LABELS[kind]}">${options.join('')}</optgroup>`
        : '';
    })
    .join('');
}

let selected: MapId = 'enchanted';
export function selectMap(id: string) {
  if (MAPS.some((m) => m.id === id)) selected = id as MapId;
}
export function currentMap(): MapId {
  return selected;
}

/** The arena's middle line. */
const MID = ARENA_WIDTH / 2;

function oval(x: number, y: number, rx: number, ry: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}
function line(x: number, y: number, xx: number, yy: number, color: string, width = 2) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(xx, yy);
  g.stroke();
}
function crystal(x: number, y: number, color: string, scale = 1) {
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, -35);
  g.lineTo(15, -9);
  g.lineTo(11, 16);
  g.lineTo(-9, 21);
  g.lineTo(-16, -7);
  g.closePath();
  g.fill();
  line(0, -35, 0, 14, '#ffffff66');
  line(0, 14, 15, -9, '#ffffff55');
  g.restore();
}
function rock(x: number, y: number, color: string, r = 24) {
  oval(x + 5, y + 8, r * 1.1, r * 0.46, '#070d1680');
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x - r, y + 5);
  g.lineTo(x - r * 0.65, y - r * 0.65);
  g.lineTo(x + r * 0.35, y - r);
  g.lineTo(x + r, y - r * 0.15);
  g.lineTo(x + r * 0.8, y + r * 0.55);
  g.lineTo(x - r * 0.2, y + r * 0.6);
  g.closePath();
  g.fill();
  line(x - r * 0.65, y - r * 0.65, x + r * 0.25, y - r * 0.2, '#ffffff44', 2);
}
function ruins(x: number, y: number, color: string) {
  oval(x + 9, y + 13, 29, 10, '#050d1688');
  g.fillStyle = color;
  g.fillRect(x - 15, y - 45, 30, 57);
  g.fillStyle = '#ffffff44';
  g.fillRect(x - 19, y - 46, 38, 8);
  g.fillRect(x - 19, y + 6, 38, 9);
  for (let j = 0; j < 3; j++) line(x - 11, y - 34 + j * 14, x + 11, y - 34 + j * 14, '#11182744');
}
function edgeObjects(draw: (x: number, y: number, i: number) => void) {
  let i = 0;
  for (let x = 48; x < ARENA_WIDTH; x += 115) {
    draw(x, 45, i++);
    draw(x + 30, 565, i++);
  }
  for (let y = 155; y < 550; y += 110) {
    draw(26, y, i++);
    draw(ARENA_WIDTH - 23, y + 12, i++);
  }
}
function floor(base: string, inner: string, rim: string) {
  const bg = g.createLinearGradient(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  bg.addColorStop(0, base);
  bg.addColorStop(1, '#090e19');
  g.fillStyle = bg;
  g.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  oval(MID, 310, 346 * ARENA_STRETCH, 254, rim);
  oval(MID, 305, 317 * ARENA_STRETCH, 224, inner);
  g.strokeStyle = '#ffffff24';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(MID, 305, 317 * ARENA_STRETCH, 224, 0, 0, TAU);
  g.stroke();
}
function tiles(color: string, spacing = 55) {
  const left = 100 * ARENA_STRETCH,
    right = 710 * ARENA_STRETCH;
  for (let x = left; x < right; x += spacing) line(x, 90, x, 522, color, 1);
  for (let y = 100; y < 520; y += spacing) line(84 * ARENA_STRETCH, y, right + 5, y, color, 1);
}
function rune(x: number, y: number, color: string, r = 42) {
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.stroke();
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    const px = x + Math.cos(a) * r * 0.78,
      py = y + Math.sin(a) * r * 0.78;
    if (!i) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.stroke();
}
/** How the arenas dress the simulation's pillars; the Enchanted Arena has the tall stone pillar. */
const PILLAR_ROCKS: Partial<Record<MapId, string>> = {
  temple: '#7b9585',
  volcano: '#30252b',
  frozen: '#93d8e9',
  colosseum: '#b58f69',
  astral: '#6555aa',
  graveyard: '#626c6c',
  grove: '#42695a',
  tower: '#8192b6',
};

/** The pillars drawn with the wizards (in front of what stands behind them), none on battlegrounds. */
export const frontPillars = () =>
  selected === 'enchanted' || selected in PILLAR_ROCKS ? pillars : [];

export function drawPillar(p: { x: number; y: number; r: number }) {
  if (selected === 'enchanted') pillar(p);
  // the rock's base lines up with the tall pillar's, which stands PILLAR_FOOT below the circle
  else rock(p.x, p.y + PILLAR_FOOT - 20, PILLAR_ROCKS[selected] ?? '#888', p.r + 10);
}
export function mapScenery() {
  if (selected === 'enchanted') {
    enchantedArena();
    return;
  }
  if (selected === 'devbattle') {
    devBattlegroundScenery(g);
    return;
  }
  if (selected === 'ruins') {
    ruinsScenery(g);
    return;
  }
  if (selected === 'darkcircle') {
    darkCircleScenery(g);
    return;
  }
  g.save();
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  switch (selected) {
    case 'temple':
      floor('#172e29', '#4b6259', '#283d34');
      tiles('#d5e6cc19');
      rune(MID, 306, '#91f4cb66', 72);
      edgeObjects((x, y, i) => (i % 3 === 0 ? rock(x, y, '#5a7364', 23) : ruins(x, y, '#71897a')));
      break;
    case 'volcano':
      floor('#2a0c0e', '#3b2a2a', '#110d13');
      for (let i = 0; i < 21; i++) {
        let x = (90 + ((i * 151) % 630)) * ARENA_STRETCH,
          y = 105 + ((i * 97) % 410);
        line(x, y, x + 20, y + 13, '#ff5a1f88', 2);
        line(x + 20, y + 13, x + 30, y + 7, '#ffbd5288', 2);
      }
      edgeObjects((x, y, i) => {
        oval(x, y, 36, 20, i % 2 ? '#f97316' : '#b91c1c');
        rock(x, y, '#241c22', 24);
      });
      break;
    case 'frozen':
      floor('#183a50', '#a7dbe4', '#426f83');
      for (let i = 0; i < 23; i++) {
        const x = (115 + ((i * 137) % 580)) * ARENA_STRETCH,
          y = 115 + ((i * 79) % 390);
        line(x, y, x + 29, y - 13, '#efffff88');
        line(x + 29, y - 13, x + 43, y - 7, '#efffff66');
      }
      edgeObjects((x, y, i) => (i % 2 ? crystal(x, y, '#7dd3fc', 1.1) : rock(x, y, '#e2f7fb', 23)));
      break;
    case 'colosseum':
      floor('#62412d', '#c4a477', '#826349');
      for (let r = 170; r < 390; r += 37) {
        g.strokeStyle = '#76533c66';
        g.lineWidth = 9;
        g.beginPath();
        g.ellipse(MID, 305, r * ARENA_STRETCH, r * 0.71, 0, 0, TAU);
        g.stroke();
      }
      edgeObjects((x, y, i) => (i % 2 ? ruins(x, y, '#ad8860') : rock(x, y, '#d7b17e', 24)));
      break;
    case 'astral':
      floor('#08091d', '#25204e', '#8b5cf6');
      for (let i = 0; i < 100; i++) {
        const x = (i * 163 + 37) % ARENA_WIDTH,
          y = (i * 79 + 17) % ARENA_HEIGHT;
        oval(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1, '#d9d5ff99');
      }
      rune(MID, 306, '#a78bfa99', 110);
      rune(MID, 306, '#d8b4fe77', 65);
      edgeObjects((x, y, i) => crystal(x, y, i % 2 ? '#a855f7' : '#60a5fa', 1.1));
      break;
    case 'graveyard':
      floor('#111d22', '#35403e', '#192a2e');
      for (let i = 0; i < 40; i++) {
        let x = (90 + ((i * 127) % 620)) * ARENA_STRETCH,
          y = 115 + ((i * 71) % 390);
        oval(x, y, 24, 7, '#b6c9be0d');
      }
      edgeObjects((x, y, i) => {
        oval(x + 5, y + 8, 18, 7, '#0008');
        g.fillStyle = i % 3 ? '#6b7778' : '#88918c';
        g.fillRect(x - 12, y - 23, 24, 35);
        oval(x, y - 23, 12, 12, i % 3 ? '#6b7778' : '#88918c');
        line(x, y - 24, x, y - 5, '#1f293755');
      });
      break;
    case 'grove':
      floor('#0b2a28', '#315a48', '#173e36');
      for (let i = 0; i < 47; i++) {
        const x = (90 + ((i * 97) % 625)) * ARENA_STRETCH,
          y = 105 + ((i * 113) % 415);
        oval(x, y, 2, 2, i % 3 ? '#b9fbc0' : '#7dd3fc');
      }
      edgeObjects((x, y, i) => {
        oval(x, y + 8, 22, 8, '#030f12a0');
        g.fillStyle = '#d8c7b5';
        g.fillRect(x - 5, y - 18, 10, 26);
        oval(x, y - 20, 24, 14, i % 2 ? '#9f7aea' : '#2dd4bf');
        for (let k = -1; k <= 1; k++) oval(x + k * 11, y - 22, 2, 2, '#fff9d0');
      });
      break;
    case 'tower':
      floor('#17233c', '#526080', '#303956');
      tiles('#e0e7ff33', 48);
      rune(MID, 305, '#f9c7ff88', 95);
      rune(MID, 305, '#a5b4fc99', 48);
      edgeObjects((x, y, i) =>
        i % 3 === 0 ? crystal(x, y, '#d8b4fe', 0.85) : ruins(x, y, '#8492af'),
      );
      break;
  }
  g.restore();
}
