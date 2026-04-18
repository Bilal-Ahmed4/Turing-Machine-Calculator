import { BLANK as DEFAULT_BLANK } from './constants.js';

export class Tape {
  constructor(str = '', blank = DEFAULT_BLANK) {
    this.cells = str.split('');
    this.blank = blank;
  }

  get(i) {
    if (i < 0) {
      this.#growLeft(-i);
      i = 0;
    }
    return i < this.cells.length ? this.cells[i] : this.blank;
  }

  set(i, ch) {
    if (i < 0) {
      this.#growLeft(-i);
      i = 0;
    }
    while (i >= this.cells.length) this.cells.push(this.blank);
    this.cells[i] = ch;
  }

  #growLeft(n) {
    const fill = Array(n).fill(this.blank);
    this.cells = fill.concat(this.cells);
  }

  toString() {
    return this.cells.join('');
  }

  toArray() {
    return [...this.cells];
  }
}

