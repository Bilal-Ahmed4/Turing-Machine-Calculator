import { BLANK, HALT } from './constants.js';
import { Tape } from './tape.js';

export class TuringMachine {
  constructor(tapeStr, blank = BLANK) {
    this.tape = new Tape(tapeStr, blank);
    this.head = 0;
    this.state = 0;
    this.step = 0;
    this.halted = false;
    this.error = null;
    this.lastRead = null;
    this.lastWrite = null;
    this.lastDir = null;
    this.lastNextState = null;
  }

  /**
   * Execute one step. Returns a snapshot object.
   */
  tick(machine) {
    if (this.halted || this.error) return this.snapshot();

    const stateTable = machine[this.state];
    if (!stateTable) {
      this.error = `Unknown state: ${this.state}`;
      return this.snapshot();
    }

    const sym = this.tape.get(this.head);
    const rule = stateTable[sym];
    if (!rule) {
      if (this.state === HALT) {
        this.halted = true;
        return this.snapshot();
      }
      this.error = `No rule for state=${this.state}, symbol='${sym}'`;
      return this.snapshot();
    }

    const [, write, nextState, dir] = rule;
    this.lastRead = sym;
    this.lastWrite = write;
    this.lastDir = dir;
    this.lastNextState = nextState;

    this.tape.set(this.head, write);
    this.head += dir;
    this.state = nextState;
    this.step++;

    if (this.state === HALT) this.halted = true;
    return this.snapshot();
  }

  snapshot() {
    const arr = this.tape.toArray();
    // ensure some padding around head
    while (this.head >= arr.length) arr.push(this.tape.blank);
    while (this.head < 0) {
      arr.unshift(this.tape.blank);
      this.head = 0;
    }
    return {
      tape: arr,
      head: this.head,
      state: this.state,
      step: this.step,
      halted: this.halted,
      error: this.error,
      lastRead: this.lastRead,
      lastWrite: this.lastWrite,
      lastDir: this.lastDir,
      lastNextState: this.lastNextState,
    };
  }

  countOnes() {
    return this.tape.toArray().filter((c) => c === '1').length;
  }
}

