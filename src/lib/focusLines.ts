import type { FocusLineElement } from '../types/manga';

export interface FocusLineSegment {
  points: [number, number, number, number];
}

function random(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function buildFocusLines(effect: FocusLineElement): FocusLineSegment[] {
  const rand = random(effect.seed);
  const count = Math.max(1, Math.floor(effect.count));
  return Array.from({ length: count }, (_, index) => {
    const baseAngle = (Math.PI * 2 * index) / count;
    const jitter = (rand() - 0.5) * (Math.PI * 2 / count) * 0.8;
    const angle = baseAngle + jitter;
    const inner = effect.innerRadius * (0.75 + rand() * 0.45);
    const outer = effect.outerRadius * (0.92 + rand() * 0.16);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
      points: [cos * inner, sin * inner, cos * outer, sin * outer]
    };
  });
}
