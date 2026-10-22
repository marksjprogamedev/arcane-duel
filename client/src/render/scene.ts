import { SPELL_COLOR } from '../../../shared/constants';
import type { Wizard } from '../../../shared/types';
import { TAU } from '../../../shared/math';
import { g } from '../dom';
import {
  game,
  greenSide,
  isHidden,
  isUnseen,
  localInput,
  me,
  net,
  others,
  watchers,
} from '../state';
import { drawWizard as drawWizardArt } from './world/wizard';
import { deathDraw } from './world/death';
import { drawZones } from './world/zones';
import { drawBomb } from './world/bombs';
import {
  airborneLift,
  drawBubble,
  drawKnockUp,
  drawPrison,
  drawTrapRune,
} from './world/controlEffects';
import { renderLightningArc, drawWave } from './effects/lightning';
import { renderParticle } from './effects/particles';
import { camera, inView, VIEW_H, VIEW_W } from './camera';
import { drawFog, drawHitHint } from './fog';
import { drawMinimap } from './hud/minimap';
import { drawCountdown } from './hud/countdown';
import { drawTeamHud } from './hud/teamHud';
import { drawProjectile } from './world/projectiles';
import { drawPillar, frontPillars, mapScenery } from './arena/maps';
import { behindPillar, pillarDepth, wizardDepth } from './arena/pillarMath';
import { isPredictedShot } from '../net/earthVisibility';

type Pillar = { x: number; y: number; r: number };
/** Wizards and pillars, nearest last. */
const drawOrder: (Wizard | Pillar)[] = [];
const depth = (o: Wizard | Pillar) => ('seat' in o ? wizardDepth(o) : pillarDepth(o));

function drawShot(s: (typeof game.shots)[number]) {
  // our own plain shots are drawn by the local prediction; variants and reflected shots only come from the server
  if (net.online && isPredictedShot(s, me())) return;
  if (inView(s.x, s.y, 120)) drawProjectile(s);
}

/** Draws a wizard unless it is dying, off screen, or an enemy hidden in the fog or not yet seen. */
function drawWizard(w: Wizard) {
  if ((game.death && w === game.death.wizard) || isHidden(w) || isUnseen(w) || w.fallen) return;
  if (!inView(w.x, w.y, 160)) return;
  if (w.airborne > 0) {
    const lift = airborneLift(w.airborne, game.t);
    drawKnockUp(w.x, w.y, lift, game.t);
    g.save();
    g.translate(0, -lift);
    drawWizardArt(w);
    g.restore();
  } else drawWizardArt(w);
  if (w.prison > 0) drawPrison(w.x, w.y, w.prison, game.t);
}

/** The view runs a little past the bottom of the map (see `cameraOrigin`): that strip is plain dark. */
function drawBelowMap() {
  const edge = game.map.height;
  if (camera.y + VIEW_H <= edge) return;
  g.fillStyle = '#05080d';
  g.fillRect(camera.x, edge, VIEW_W, camera.y + VIEW_H - edge);
}

export function draw() {
  mapScenery();
  drawBelowMap();
  drawZones();
  for (const t of game.traps)
    if (inView(t.x, t.y, 60)) drawTrapRune(t.x, t.y, SPELL_COLOR[t.spell], t.arm <= 0, game.t);
  // lower on the screen is nearer to you: draw those last. Shots hidden by a pillar go first.
  const front = frontPillars();
  for (const s of game.shots) if (behindPillar(front, s.x, s.y)) drawShot(s);
  drawOrder.length = 0;
  drawOrder.push(...game.wizards, ...front);
  drawOrder.sort((a, b) => depth(a) - depth(b));
  for (const o of drawOrder) {
    if ('seat' in o) drawWizard(o);
    else if (inView(o.x, o.y, 100)) drawPillar(o);
  }
  deathDraw();
  for (const b of game.bombs) if (inView(b.x, b.y, 200)) drawBomb(b);
  for (const s of game.shots) if (!behindPillar(front, s.x, s.y)) drawShot(s);
  for (const b of game.bubbles)
    if (inView(b.x, b.y, b.r + 30)) drawBubble(b.x, b.y, b.r, Math.min(1, b.life / 40));
  for (let a of game.arcs) {
    if (a.variant === 'plasma_beam' || a.variant === 'magnetic_pull') {
      // Solo, the beam is drawn only while its caster still holds the button. Online the server
      // only sends beam events while it is held, and other players' inputs aren't known here.
      if (!net.online) {
        const input = game.input[a.castOwner];
        const selected = a.variant === 'plasma_beam' ? 'PLASMA' : 'MAGNETIC';
        if (!input.holding || input.attack !== selected || input.loadout[selected] !== a.variant)
          continue;
      }
      const caster = game.wizards[a.castOwner];
      const target = a.points[a.points.length - 1];
      // Cast from a floating aperture just beyond the wizard's body, at a lower
      // screen position so the glow does not cover the caster's face. A leg turned back by a
      // bubble starts at the bubble's edge instead.
      const dx = target.x - caster.x,
        dy = target.y - caster.y;
      const distance = Math.hypot(dx, dy) || 1;
      const ux = dx / distance,
        uy = dy / distance;
      const start = a.reflected
        ? a.points[0]
        : { x: caster.x + ux * 37, y: caster.y - 8 + uy * 37 };
      const ex = target.x - start.x,
        ey = target.y - start.y;
      const length = Math.hypot(ex, ey);
      const fraction = length ? Math.min(1, (a.reach ?? 0) / length) : 0;
      renderLightningArc({
        ...a,
        points: [start, { x: start.x + ex * fraction, y: start.y + ey * fraction }],
        hit: a.hit && fraction >= 0.98,
      });
    } else renderLightningArc(a);
  }
  g.globalAlpha = 1;
  for (let q of game.waves) {
    if (
      net.online &&
      net.guestFX.some(
        (f) =>
          (f.kind === 'HEAL' || f.kind === 'FORCE') &&
          Math.hypot(q.x - f.x, q.y - f.y) < 75 &&
          f.age < f.life,
      )
    )
      continue;
    drawWave(q);
  }
  g.globalAlpha = 1;
  for (let q of game.particles) {
    if (net.online && q.castOwner === net.seat) continue;
    if (!inView(q.x, q.y, 60)) continue;
    renderParticle(q);
  }
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  for (let q of game.labels) {
    if (!inView(q.x, q.y, 80)) continue;
    g.globalAlpha = Math.min(1, q.life / 18);
    g.font = 'bold 15px monospace';
    g.textAlign = 'center';
    g.fillStyle = q.color;
    g.fillText(q.text, q.x, q.y);
  }
  g.globalAlpha = 1;
  if (game.active) {
    drawFog(watchers());
    drawHitHint();
    const friends = others().filter((w) => greenSide(w) && !w.fallen);
    drawMinimap(
      me(),
      friends,
      others().filter((w) => !greenSide(w) && !w.fallen && !isHidden(w)),
    );
    drawTeamHud();
    drawCountdown();
  }
  g.strokeStyle = '#ffffffaa';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(localInput().mouse.x, localInput().mouse.y, 9, 0, TAU);
  g.moveTo(localInput().mouse.x - 15, localInput().mouse.y);
  g.lineTo(localInput().mouse.x - 5, localInput().mouse.y);
  g.moveTo(localInput().mouse.x + 5, localInput().mouse.y);
  g.lineTo(localInput().mouse.x + 15, localInput().mouse.y);
  g.stroke();
}
