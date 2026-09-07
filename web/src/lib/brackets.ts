import type { Bracket } from '../data/types';

export const BRACKETS: Bracket[] = ['Emerald', 'Diamond'];

export function bracketToSlug(bracket: Bracket): string {
  return bracket.toLowerCase();
}

export function bracketFromSlug(slug: string): Bracket {
  const match = BRACKETS.find((b) => bracketToSlug(b) === slug);
  if (!match) throw new Error(`Unknown bracket slug: ${slug}`);
  return match;
}

// DynamoDB test data has been entered as lowercase ("diamond"); normalize to
// the capitalized form the rest of the app compares against. Doesn't
// validate the result against BRACKETS — callers that need a real Bracket
// (not just a capitalized string) should check that themselves, since some
// rows (e.g. historical Hall of Fame seasons) have no bracket at all.
export function normalizeBracket(bracket: string): string {
  if (typeof bracket !== 'string' || bracket.length === 0) return bracket;
  return bracket.charAt(0).toUpperCase() + bracket.slice(1).toLowerCase();
}
