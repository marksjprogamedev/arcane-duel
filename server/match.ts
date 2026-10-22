import { performance } from 'node:perf_hooks';
import { timeTick } from './stats';
import { styles } from '../shared/constants';
import { newSeed } from '../shared/random';
import { mapFor, type MapId } from '../shared/maps';
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
import { resolveDeaths } from '../shared/sim/update/deaths';
import { update } from '../shared/sim/update';
import { createSimState } from '../shared/simState';
import type { FxEvent, MatchRules, Seat, SimEvent, SpellLoadout } from '../shared/types';

/** Where messages to a player go. Implemented by the room layer (adds latency simulation, etc.). */
export type Outbox = (side: Seat, msg: ServerMessage) => void;
/** Lets the room layer skip snapshots for a player whose socket is backed up. */
export type CanSend = (side: Seat) => boolean;

/** A copy of the list in random order. */
function shuffled<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
 * Runs one match on the server. The simulation is authoritative; every player is a client that
 * send inputs and receive snapshots. Each snapshot is built from the receiving player's
 * perspective (see serializeSnapshot).
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
  private pendingFx: FxEvent[][] = [];
  /** Newest move command applied per player, by seat (reported back in snapshots as `ack`). */
  private lastMoveSeq: number[] = [];
  /** Tick on which each player's newest move command arrived, by seat. */
  private lastMoveTick: number[] = [];
  /** Every tick run this round, including the end-of-round animation. */
  private tickCount = 0;
  /** Ticks left before the match begins: the simulation stands still and inputs are refused. */
  private countdown = 0;
  /** Seats whose player is disconnected past the grace period (kept across rematches). */
  private readonly awaySeats = new Set<Seat>();

  constructor(
    private readonly send: Outbox,
    private readonly canSend: CanSend = () => true,
  ) {}

  get isRunning() {
    return this.running;
  }

  /**
   * Starts (or restarts, for a rematch) a match, which begins after `countdownTicks`. Seat 0 is
   * the room creator.
   */
  start(
    roundId: number,
    mapId: MapId,
    rules: Partial<MatchRules> = {},
    loadouts: SpellLoadout[] = [],
    countdownTicks = 0,
  ) {
    this.stop();
    resetMatch(this.game, {
      mode: 'online',
      seed: newSeed(),
      styles: shuffled(styles), // everyone gets a different look
      rules,
      loadouts,
      dummyHP: 160,
      dummyMoving: false,
      map: mapFor(mapId),
      round: roundId,
    });
    for (const seat of this.awaySeats) this.game.wizards[seat].away = true;
    this.roundId = roundId;
    this.seq = 0;
    this.ticks = 0;
    const seats = this.game.wizards.map(() => 0);
    this.pendingFx = seats.map(() => []);
    this.lastMoveSeq = [...seats];
    this.lastMoveTick = [...seats];
    this.tickCount = 0;
    this.countdown = countdownTicks;
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
    this.lastMoveTick = this.lastMoveTick.map(() => this.tickCount);
    this.nextTickAt = performance.now() + TICK_MS;
    this.sendSnapshots();
    this.schedule();
  }

  /** For a finished match: whether the team in `seat` won; null while it is still on. */
  outcomeFor(seat: Seat): boolean | null {
    if (this.running) return null;
    return (this.game.wizards[seat].team === 0) === this.game.team0Won;
  }

  /** The wizard's name in this match (what the name tag shows). */
  nameOf(seat: Seat): string {
    return this.game.wizards[seat]?.style.name ?? '';
  }

  /**
   * Marks a seat's player as disconnected (or back). An away wizard stands where it is: whatever it
   * was holding is released, it gets no input and no snapshots, and everyone sees it as `away`. It
   * can still be hit and killed.
   */
  setAway(seat: Seat, away: boolean) {
    if (away) this.awaySeats.add(seat);
    else this.awaySeats.delete(seat);
    const wizard = this.game.wizards[seat];
    if (!wizard) return;
    wizard.away = away;
    if (away) applyInput(this.game, seat, { kind: 'clear' });
  }

  /** Applies a (sanitised) input message from a player and acknowledges it. */
  handleInput(side: Seat, m: SanitizedInput) {
    const accepted =
      this.running &&
      !this.awaySeats.has(side) &&
      !this.paused &&
      this.countdown <= 0 &&
      !this.game.ending &&
      m.roundId === this.roundId;
    if (accepted) {
      const ev = inputEventFromWire(m, this.game.map);
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
   * the next one arrives, so a late or bunched-up command never makes the wizard stop. The same
   * seq may arrive twice (sent early on a key change, then on the client's tick); the later
   * one carries the newest keys, so it is applied too.
   */
  handleMove(side: Seat, m: MoveCommand) {
    if (!this.running || m.roundId !== this.roundId || m.seq < this.lastMoveSeq[side]) return;
    if (this.awaySeats.has(side)) return;
    if (this.countdown > 0) return;
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
      timeTick(() => this.step());
      this.nextTickAt += TICK_MS;
      steps++;
    }
    // Fell too far behind: drop the backlog instead of spiralling.
    if (this.nextTickAt <= now) this.nextTickAt = now + TICK_MS;
    if (this.running) this.schedule();
  }

  /** One simulation tick; same order of operations as the offline client loop. */
  step() {
    if (this.countdown > 0) {
      this.countdown--;
      if (this.countdown % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
      return;
    }
    this.tickCount++;
    for (const w of this.game.wizards)
      if (w.away || this.tickCount - this.lastMoveTick[w.seat] > MOVE_TIMEOUT_TICKS)
        this.game.input[w.seat].keys = {};
    if (update(this.game, 1)) {
      if (++this.ticks % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
      resolveDeaths(this.game);
    }
    this.flushEvents();
  }

  private sendSnapshots() {
    for (const { seat, absent } of this.game.wizards) {
      if (absent || this.awaySeats.has(seat) || !this.canSend(seat)) continue;
      const state = serializeSnapshot(
        this.game,
        seat,
        {
          roundId: this.roundId,
          seq: ++this.seq,
          ack: this.lastMoveSeq[seat],
          countdown: this.countdown,
        },
        this.pendingFx[seat],
      );
      this.send(seat, { type: 'state', state });
      this.pendingFx[seat] = [];
    }
  }

  private flushEvents() {
    for (const ev of this.game.events.splice(0)) {
      if (isFxEvent(ev)) {
        for (const queue of this.pendingFx) {
          queue.push(ev);
          if (queue.length > MAX_PENDING_FX) queue.shift();
        }
      } else this.deliver(ev);
    }
  }

  private deliver(ev: SimEvent) {
    // `game.team0Won` is true when team 0 won; each player is told whether theirs did.
    const won = (seat: Seat) => (this.game.wizards[seat].team === 0) === this.game.team0Won;
    if (ev.type === 'death') {
      for (const { seat } of this.game.wizards)
        this.send(seat, { type: 'death_start', loser: ev.loser, winner: won(seat) });
    } else if (ev.type === 'round_over') {
      for (const { seat } of this.game.wizards)
        this.send(seat, { type: 'finished', winner: won(seat) });
      this.stop();
    }
    // 'hint' events are tutorial text for offline play; online clients make their own.
  }
}
