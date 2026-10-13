import { performance } from 'node:perf_hooks';
import { styles } from '../shared/constants';
import { newSeed } from '../shared/random';
import {
  SERVER_TICK_HZ,
  SNAPSHOT_EVERY_TICKS,
  type SanitizedInput,
  type ServerMessage,
} from '../shared/protocol';
import { isFxEvent } from '../shared/sim/effects';
import { applyInput, inputEventFromWire } from '../shared/sim/input';
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
/** Cosmetic events kept between snapshots; the oldest are dropped beyond this. */
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
  private timer: NodeJS.Timeout | null = null;
  private nextTickAt = 0;
  private pendingFx: FxEvent[] = [];

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
    this.pendingFx = [];
    this.running = true;
    this.nextTickAt = performance.now() + TICK_MS;
    this.sendSnapshots(); // so clients have a state to draw immediately
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Applies a (sanitised) input message from a player and acknowledges it. */
  handleInput(side: WizardId, m: SanitizedInput) {
    const accepted = this.running && !this.game.ending && m.roundId === this.roundId;
    if (accepted) {
      const ev = inputEventFromWire(m);
      if (ev) applyInput(this.game, side, ev);
    }
    if (m.inputId !== null) this.send(side, { type: 'input_ack', inputId: m.inputId, accepted });
    if (m.castId !== null)
      this.send(side, { type: 'cast_ack', roundId: this.roundId, castId: m.castId, accepted });
  }

  private schedule() {
    const delay = Math.max(0, this.nextTickAt - performance.now());
    this.timer = setTimeout(() => this.loop(), delay);
  }

  private loop() {
    if (!this.running) return;
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
        { roundId: this.roundId, seq: ++this.seq },
        this.pendingFx,
      );
      this.send(side, { type: 'state', state });
    }
    this.pendingFx = [];
  }

  private flushEvents() {
    for (const ev of this.game.events.splice(0)) {
      if (isFxEvent(ev)) {
        this.pendingFx.push(ev);
        if (this.pendingFx.length > MAX_PENDING_FX) this.pendingFx.shift();
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
