import type { Team } from './types';

/**
 * Real roster data isn't wired up yet (that's the next stage — querying Teams
 * and Team_Members from DynamoDB at build time). Empty for now so the site
 * reflects that Season 8 doesn't have any teams entered yet, rather than
 * showing stale placeholder rosters.
 */
export const teams: Team[] = [];

export function getTeamBySlug(slug: string): Team | undefined {
  return teams.find((t) => t.slug === slug);
}

export function getTeamsByBracket(bracket: Team['bracket']): Team[] {
  return teams.filter((t) => t.bracket === bracket);
}
