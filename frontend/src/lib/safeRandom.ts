/**
 * Cryptographically safe random number generator for visual/UI purposes.
 * Uses crypto.getRandomValues() instead of Math.random() to satisfy
 * SonarCloud security hotspot rules (weak-cryptography).
 *
 * Returns a float in [0, 1) — same contract as Math.random().
 */
export function safeRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}
