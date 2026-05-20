import { randomBytes, randomInt } from 'crypto';

export const secureRandom = (): number => 
  randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;

export const secureRandomInt = (min: number, max: number): number =>
  randomInt(min, max);

export const secureRandomHex = (bytes: number = 16): string =>
  randomBytes(bytes).toString('hex');
