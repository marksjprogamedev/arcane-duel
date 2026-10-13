import { performance } from 'node:perf_hooks';
import { styles } from '../shared/constants';
import { newSeed } from '../shared/random';
import {
  SERVER_TICK_HZ,
  SNAPSHOT_EVERY_TICKS,
  type MoveCommand,
  type SanitizedInput,
  type ServerMessage,
} from '../shared/protocol';
import { isFxEvent } from '../shared/sim/effects';
import { applyInput, inputEventFromWire, MOVE_KEYS } from '../shared/sim/input';
import { moveKeysFromBits } from '../shared/sim/movement';
import { resetMatch } from '../shared/sim/match';
import { serializeSnapshot } from '../shared/sim/snapshot';
import { resolveDeaths, update } from '../shared/sim/update';
import { createSimState } from '../shared/simState';
import type { FxEvent, SimEvent, WizardId } from '../shared/types';

/** Where messages to a player go. Implemented by the room layer (adds latency simulation, etc.). */
export type Outbox = (side: WizardId, msg: ServerMessage) => void;
/** Lets the room layer skip snapshots for a player whose socket is backed up. */
export type CanSend = (side: WizardId) => boolean;

const TICK_MS = 1000 / SERVER_TICK_HZ;
/** Never try to catch up more than this many ticks at once (e.g. after the process stalls). */
const MAX_CATCHUP_TICKS = 5;
/**
 * Clients send a move command every tick. If none arrives for this long (tab hidden, client
 * stalled, connection hiccup) the player's movement keys are released rather than held forever.
 */
const MOVE_TIMEOUT_TICKS = 15;
/** Cosmetic events kept per player until their next snapshot; the oldest are dropped beyond this. */
const MAX_PENDING_FX = 256;

/**
 * Runs one match on the server. The simulation is authoritative; both players are clients that
 * send inputs and receive snapshots. Each snapshot is built from the receiving player's
 * perspective (see serializeSnapshot), so both clients run the same code and each sees themselves as wizard `e`.
 */
export class MatchRunner {
  readonly game = createSimState(1);
  private roundId = 0;
  private seq = 0;
  private ticks = 0;
  private running = false;
  /** Paused while a player is reconnecting: no ticks, inputs are refused. */
  private paused = false;
  private timer: NodeJS.Timeout | null = null;
  private nextTickAt = 0;
  /**
   * Cosmetic events not yet delivered, per player. A player whose snapshot is skipped (socket
   * backed up) keeps theirs and gets them with the next snapshot that is sent.
   */
  private pendingFx: Record<WizardId, FxEvent[]> = { p: [], e: [] };
  /** Newest move command applied per player (reported back in snapshots as `ack`). */
  private lastMoveSeq: Record<WizardId, number> = { p: 0, e: 0 };
  /** Tick on which each player's newest move command arrived. */
  private lastMoveTick: Record<WizardId, number> = { p: 0, e: 0 };
  /** Every tick run this round, including the end-of-round animation. */
  private tickCount = 0;

  constructor(
    private readonly send: Outbox,
    private readonly canSend: CanSend = () => true,
  ) {}

  get isRunning() {
    return this.running;
  }

  /** Starts (or restarts, for a rematch) a match. Player `p` is the room creator. */
  start(roundId: number) {
    this.stop();
    const a = Math.floor(Math.random() * styles.length);
    let b = Math.floor(Math.random() * (styles.length - 1));
    if (b >= a) b++;
    resetMatch(this.game, {
      mode: 'online',
      seed: newSeed(),
      styles: [styles[a], styles[b]],
      dummyHP: 160,
      dummyMoving: false,
    });
    this.roundId = roundId;
    this.seq = 0;
    this.ticks = 0;
    this.pendingFx = { p: [], e: [] };
    this.lastMoveSeq = { p: 0, e: 0 };
    this.lastMoveTick = { p: 0, e: 0 };
    this.tickCount = 0;
    this.running = true;
    this.paused = false;
    this.nextTickAt = performance.now() + TICK_MS;
    this.sendSnapshots(); // so clients have a state to draw immediately
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Freezes the match (a player lost their connection). Does nothing if no match is running. */
  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Continues a paused match where it stopped, and sends everyone a fresh snapshot. */
  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    // nobody sent move commands while paused; don't release their keys straight away
    this.lastMoveTick = { p: this.tickCount, e: this.tickCount };
    this.nextTickAt = performance.now() + TICK_MS;
    this.sendSnapshots();
    this.schedule();
  }

  /** Applies a (sanitised) input message from a player and acknowledges it. */
  handleInput(side: WizardId, m: SanitizedInput) {
    const accepted =
      this.running && !this.paused && !this.game.ending && m.roundId === this.roundId;
    if (accepted) {
      const ev = inputEventFromWire(m);
      // movement keys only come from move commands, so the two can never disagree
      if (ev && !(ev.kind === 'key' && MOVE_KEYS.includes(ev.code)))
        applyInput(this.game, side, ev);
    }
    if (m.inputId !== null) this.send(side, { type: 'input_ack', inputId: m.inputId, accepted });
    if (m.castId !== null)
      this.send(side, { type: 'cast_ack', roundId: this.roundId, castId: m.castId, accepted });
  }

  /**
   * Applies a player's move command. Only the newest command matters: its keys stay held until
   * the next one arrives, so a late or bunched-up command never makes the wizard stop.
   */
  handleMove(side: WizardId, m: MoveCommand) {
    if (!this.running || m.roundId !== this.roundId || m.seq <= this.lastMoveSeq[side]) return;
    this.lastMoveSeq[side] = m.seq;
    this.lastMoveTick[side] = this.tickCount;
    const input = this.game.input[side];
    input.keys = moveKeysFromBits(m.keys);
    input.mouse = { x: m.x, y: m.y };
  }

  private schedule() {
    const delay = Math.max(0, this.nextTickAt - performance.now());
    this.timer = setTimeout(() => this.loop(), delay);
  }

  private loop() {
    if (!this.running || this.paused) return;
    const now = performance.now();
    let steps = 0;
    while (this.nextTickAt <= now && steps < MAX_CATCHUP_TICKS && this.running) {
      this.step();
      this.nextTickAt += TICK_MS;
      steps++;
    }
    // Fell too far behind: drop the backlog instead of spiralling.
    if (this.nextTickAt <= now) this.nextTickAt = now + TICK_MS;
    if (this.running) this.schedule();
  }

  /** One simulation tick; same order of operations as the offline client loop. */
  step() {
    this.tickCount++;
    for (const side of ['p', 'e'] as const)
      if (this.tickCount - this.lastMoveTick[side] > MOVE_TIMEOUT_TICKS)
        this.game.input[side].keys = {};
    if (update(this.game, 1)) {
      if (++this.ticks % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
      resolveDeaths(this.game);
    }
    this.flushEvents();
  }

  private sendSnapshots() {
    for (const side of ['p', 'e'] as const) {
      if (!this.canSend(side)) continue;
      const state = serializeSnapshot(
        this.game,
        side,
        { roundId: this.roundId, seq: ++this.seq, ack: this.lastMoveSeq[side] },
        this.pendingFx[side],
      );
      this.send(side, { type: 'state', state });
      this.pendingFx[side] = [];
    }
  }

  private flushEvents() {
    for (const ev of this.game.events.splice(0)) {
      if (isFxEvent(ev)) {
        for (const queue of Object.values(this.pendingFx)) {
          queue.push(ev);
          if (queue.length > MAX_PENDING_FX) queue.shift();
        }
      } else this.deliver(ev);
    }
  }

  private deliver(ev: SimEvent) {
    if (ev.type === 'death') {
      // `winner` is true when the local-side wizard `p` won. Viewer `e` sees it as-is, viewer `p`
      // sees themselves in the `e` slot, so loser and winner are swapped for them.
      this.send('e', { type: 'death_start', loser: ev.loser, winner: ev.winner });
      this.send('p', {
        type: 'death_start',
        loser: ev.loser === 'p' ? 'e' : 'p',
        winner: !ev.winner,
      });
    } else if (ev.type === 'round_over') {
      this.send('e', { type: 'finished', winner: this.game.winner });
      this.send('p', { type: 'finished', winner: !this.game.winner });
      this.stop();
    }
    // 'hint' events are tutorial text for offline play; online clients make their own.
  }
}
