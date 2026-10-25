import { SPELL_COLOR } from '../../../shared/constants';
import type { Wizard } from '../../../shared/types';
import { TAU } from '../../../shared/math';
import { ctx } from '../dom';
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
import { drawSmokeShrouds, drawZones } from './world/zones';
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
const depth = (actor: Wizard | Pillar) =>
  'seat' in actor ? wizardDepth(actor) : pillarDepth(actor);

function drawShot(shot: (typeof game.shots)[number]) {
  // our own plain shots are drawn by the local prediction; variants and reflected shots only come from the server
  if (net.online && isPredictedShot(shot, me())) return;
  if (inView(shot.x, shot.y, 120)) drawProjectile(shot);
}

/** Draws a wizard unless it is dying, off screen, or an enemy hidden in the fog or not yet seen. */
function drawWizard(w: Wizard) {
  if ((game.death && w === game.death.wizard) || isHidden(w) || isUnseen(w) || w.fallen) return;
  if (!inView(w.x, w.y, 160)) return;
  if (w.airborne > 0) {
    const lift = airborneLift(w.airborne, game.t);
    drawKnockUp(w.x, w.y, lift, game.t);
    ctx.save();
    ctx.translate(0, -lift);
    drawWizardArt(w);
    ctx.restore();
  } else drawWizardArt(w);
  if (w.prison > 0) drawPrison(w.x, w.y, w.prison, game.t);
}

/** The view runs a little past the bottom of the map (see `cameraOrigin`): that strip is plain dark. */
function drawBelowMap() {
  const edge = game.map.height;
  if (camera.y + VIEW_H <= edge) return;
  ctx.fillStyle = '#05080d';
  ctx.fillRect(camera.x, edge, VIEW_W, camera.y + VIEW_H - edge);
}

export function draw() {
  mapScenery();
  drawBelowMap();
  drawZones();
  for (const t of game.traps)
    if (inView(t.x, t.y, 60)) drawTrapRune(t.x, t.y, SPELL_COLOR[t.spell], t.arm <= 0, game.t);
  // lower on the screen is nearer to you: draw those last. Shots hidden by a pillar go first.
  const front = frontPillars();
  for (const shot of game.shots) if (behindPillar(front, shot.x, shot.y)) drawShot(shot);
  drawOrder.length = 0;
  drawOrder.push(...game.wizards, ...front);
  drawOrder.sort((a, b) => depth(a) - depth(b));
  for (const actor of drawOrder) {
    if ('seat' in actor) drawWizard(actor);
    else if (inView(actor.x, actor.y, 100)) drawPillar(actor);
  }
  drawSmokeShrouds();
  deathDraw();
  for (const bomb of game.bombs) if (inView(bomb.x, bomb.y, 200)) drawBomb(bomb);
  for (const shot of game.shots) if (!behindPillar(front, shot.x, shot.y)) drawShot(shot);
  for (const b of game.bubbles)
    if (inView(b.x, b.y, b.r + 30)) drawBubble(b.x, b.y, b.r, Math.min(1, b.life / 40));
  for (let arc of game.arcs) {
    if (arc.variant === 'plasma_beam' || arc.variant === 'magnetic_pull') {
      // Solo, the beam is drawn only while its caster still holds the button. Online the server
      // only sends beam events while it is held, and other players' inputs aren't known here.
      if (!net.online) {
        const input = game.input[arc.castOwner];
        const selected = arc.variant === 'plasma_beam' ? 'PLASMA' : 'MAGNETIC';
        if (!input.holding || input.attack !== selected || input.loadout[selected] !== arc.variant)
          continue;
      }
      // A caster we can't see is only where we last saw them, which may be nowhere near the beam. Start from where
      // the server fired it instead (the event's first point is the caster, raised 20 for the chest).
      const seat = game.wizards[arc.castOwner];
      const caster =
        !arc.reflected && (isHidden(seat) || isUnseen(seat))
          ? { x: arc.points[0].x, y: arc.points[0].y + 20 }
          : seat;
      const target = arc.points[arc.points.length - 1];
      // Cast from a floating aperture just beyond the wizard's body, at a lower
      // screen position so the glow does not cover the caster's face. A leg turned back by a
      // bubble starts at the bubble's edge instead.
      const dx = target.x - caster.x,
        dy = target.y - caster.y;
      const distance = Math.hypot(dx, dy) || 1;
      const ux = dx / distance,
        uy = dy / distance;
      const start = arc.reflected
        ? arc.points[0]
        : { x: caster.x + ux * 37, y: caster.y - 8 + uy * 37 };
      const ex = target.x - start.x,
        ey = target.y - start.y;
      const length = Math.hypot(ex, ey);
      const fraction = length ? Math.min(1, (arc.reach ?? 0) / length) : 0;
      renderLightningArc({
        ...arc,
        points: [start, { x: start.x + ex * fraction, y: start.y + ey * fraction }],
        hit: arc.hit && fraction >= 0.98,
      });
    } else renderLightningArc(arc);
  }
  ctx.globalAlpha = 1;
  for (let wave of game.waves) {
    if (
      net.online &&
      net.castPreviews.some(
        (f) =>
          (f.kind === 'HEAL' || f.kind === 'FORCE') &&
          Math.hypot(wave.x - f.x, wave.y - f.y) < 75 &&
          f.age < f.life,
      )
    )
      continue;
    drawWave(wave);
  }
  ctx.globalAlpha = 1;
  for (let particle of game.particles) {
    if (net.online && particle.castOwner === net.seat) continue;
    if (!inView(particle.x, particle.y, 60)) continue;
    renderParticle(particle);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  for (let label of game.labels) {
    if (!inView(label.x, label.y, 80)) continue;
    ctx.globalAlpha = Math.min(1, label.life / 18);
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = label.color;
    ctx.fillText(label.text, label.x, label.y);
  }
  ctx.globalAlpha = 1;
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
  ctx.strokeStyle = '#ffffffaa';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(localInput().mouse.x, localInput().mouse.y, 9, 0, TAU);
  ctx.moveTo(localInput().mouse.x - 15, localInput().mouse.y);
  ctx.lineTo(localInput().mouse.x - 5, localInput().mouse.y);
  ctx.moveTo(localInput().mouse.x + 5, localInput().mouse.y);
  ctx.lineTo(localInput().mouse.x + 15, localInput().mouse.y);
  ctx.stroke();
}
