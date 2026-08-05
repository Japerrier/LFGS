import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '../lib/dynamodb';
import { CURRENT_SEASON } from '../lib/season';
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
    ExpressionAttributeValues: { ':season': CURRENT_SEASON },
  })
);

export const teams: Team[] = (Items ?? []).map((item) => ({
  teamId: item.teamId,
  slug: slugify(item.name),
  season: item.season,
  name: item.name,
  bracket: normalizeBracket(item.bracket),
  logoKey: item.logoKey,
}));

export function getTeamBySlug(slug: string): Team | undefined {
  return teams.find((t) => t.slug === slug);
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
