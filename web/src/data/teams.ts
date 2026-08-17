import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '../lib/dynamodb';
import { CURRENT_LFGS_SEASON } from '../lib/season';
import { slugify } from '../lib/slug';
import type { Bracket, Team } from './types';

const TEAMS_TABLE = 'Teams';

// DynamoDB test data has been entered as lowercase ("diamond"); normalize to
// the capitalized form the rest of the app compares against.
function normalizeBracket(bracket: string): Bracket {
  return (bracket.charAt(0).toUpperCase() + bracket.slice(1).toLowerCase()) as Bracket;
}

const { Items } = await dynamoDb.send(
  new QueryCommand({
    TableName: TEAMS_TABLE,
    KeyConditionExpression: 'season = :season',
    ExpressionAttributeValues: { ':season': CURRENT_LFGS_SEASON },
  })
);

// Only approved === true shows a team — missing/false/null all hide it, so
// unreviewed signup-form submissions never render.
const rawTeams = (Items ?? [])
  .filter((item) => item.approved === true)
  .map((item) => ({
    teamId: item.teamId as string,
    baseSlug: slugify(item.name),
    season: item.season,
    name: item.name as string,
    bracket: normalizeBracket(item.bracket),
    logoKey: item.logoKey,
  }));

// Names aren't required to be unique, so slugs derived from them aren't
// either. Keep URLs clean (just the name) in the normal case; only when two
// teams actually collide on the same slug do both get a 6-hex-character
// suffix from their teamId to disambiguate — teamId's UUID always ends in a
// 12-char hex segment with no hyphens, so slicing the last 6 is always safe.
const baseSlugCounts = new Map<string, number>();
for (const t of rawTeams) {
  baseSlugCounts.set(t.baseSlug, (baseSlugCounts.get(t.baseSlug) ?? 0) + 1);
}

export const teams: Team[] = rawTeams.map(({ baseSlug, ...t }) => ({
  ...t,
  slug: (baseSlugCounts.get(baseSlug) ?? 0) > 1 ? `${baseSlug}-${t.teamId.slice(-6)}` : baseSlug,
}));

export function getTeamBySlug(slug: string): Team | undefined {
  return teams.find((t) => t.slug === slug);
}

// For historical seasons (Hall of Fame), which don't have a `bracket`
// attribute on their Teams rows — this intentionally skips the bracket
// mapping the main `teams` query does, since there's nothing to normalize.
export async function getTeamsBySeason(season: number): Promise<Pick<Team, 'teamId' | 'name' | 'logoKey'>[]> {
  const { Items } = await dynamoDb.send(
    new QueryCommand({
      TableName: TEAMS_TABLE,
      KeyConditionExpression: 'season = :season',
      ExpressionAttributeValues: { ':season': season },
      ProjectionExpression: 'teamId, #n, logoKey, approved',
      ExpressionAttributeNames: { '#n': 'name' },
    })
  );
  return ((Items ?? []) as (Pick<Team, 'teamId' | 'name' | 'logoKey'> & { approved?: boolean })[])
    .filter((item) => item.approved === true)
    .map(({ approved: _approved, ...item }) => item);
}

export function getTeamsByBracket(bracket: Bracket): Team[] {
  return teams.filter((t) => t.bracket === bracket);
}

// Fallback for teams without a logo yet — e.g. "Rat Tunnelers" -> "RT".
export function teamInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
