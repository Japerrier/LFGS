import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '../lib/dynamodb';
import { normalizeBracket } from '../lib/brackets';
import { CURRENT_LFGS_SEASON } from '../lib/season';
import { teams } from './teams';
import type { Bracket, Matchup } from './types';

const MATCHUPS_TABLE = 'Matchups';

const { Items } = await dynamoDb.send(
  new QueryCommand({
    TableName: MATCHUPS_TABLE,
    KeyConditionExpression: 'season = :season',
    ExpressionAttributeValues: { ':season': CURRENT_LFGS_SEASON },
  })
);

function resolveTeam(teamId: string) {
  const team = teams.find((t) => t.teamId === teamId);
  if (!team) throw new Error(`Matchups row references unknown or unapproved teamId: ${teamId}`);
  return team;
}

export const matchups: Matchup[] = (Items ?? []).map((item) => ({
  matchId: item.matchId as string,
  season: item.season,
  week: item.week as number,
  bracket: normalizeBracket(item.bracket) as Bracket,
  group: item.group as 'A' | 'B' | undefined,
  team1: resolveTeam(item.team1Id),
  team2: resolveTeam(item.team2Id),
  matchTime: item.matchTime as string | undefined,
}));

// Weeks only show up on the site once a matchup row exists for them — there's
// no separate "week count" config. Adding week 2 is just seeding week 2 rows.
export function getMatchupsByBracket(bracket: Bracket): Matchup[] {
  return matchups.filter((m) => m.bracket === bracket).sort((a, b) => a.week - b.week);
}
