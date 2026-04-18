import { BLANK } from './constants.js';

export function buildUnaryTape(a, b, op) {
  return BLANK + '1'.repeat(a) + op + '1'.repeat(b) + BLANK;
}

