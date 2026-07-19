import type { Bracket } from '../data/types';

export const BRACKETS: Bracket[] = ['Diamond', 'Platinum'];

export function bracketToSlug(bracket: Bracket): string {
  return bracket.toLowerCase();
}

export function bracketFromSlug(slug: string): Bracket {
  const match = BRACKETS.find((b) => bracketToSlug(b) === slug);
  if (!match) throw new Error(`Unknown bracket slug: ${slug}`);
  return match;
}
