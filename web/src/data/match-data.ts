import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '../lib/dynamodb';
import { CURRENT_LFGS_SEASON } from '../lib/season';
import type { MapResult, PlayerMapStat } from './types';

const MATCH_DATA_TABLE = 'Match_Data';

// battleNet is deliberately excluded here, same reasoning as Team_Members'
// PUBLIC_MEMBER_FIELDS — the full BattleTag (with #discriminator) would let
// someone outside the team track a player down elsewhere. `name` (the
// BattleTag with its discriminator stripped, same convention as
// TeamMember.name) is what's safe to show.
const PROJECTION =
  'matchDataId, #season, itemType, matchId, mapNumber, mapName, team1Score, team2Score, #name, memberId, teamId, ringer, eliminations, assists, deaths, damage, healing, mitigation';

const { Items } = await dynamoDb.send(
  new QueryCommand({
    TableName: MATCH_DATA_TABLE,
    KeyConditionExpression: 'season = :season',
    ExpressionAttributeValues: { ':season': CURRENT_LFGS_SEASON },
    ProjectionExpression: PROJECTION,
    ExpressionAttributeNames: { '#season': 'season', '#name': 'name' },
  })
);

const rawItems = Items ?? [];

export const mapResults: MapResult[] = rawItems
  .filter((item) => item.itemType === 'map')
  .map((item) => ({
    matchDataId: item.matchDataId as string,
    season: item.season,
    matchId: item.matchId as string,
    mapNumber: item.mapNumber as number,
    mapName: item.mapName as string,
    team1Score: item.team1Score as number,
    team2Score: item.team2Score as number,
  }));

export const playerMapStats: PlayerMapStat[] = rawItems
  .filter((item) => item.itemType === 'player')
  .map((item) => ({
    matchDataId: item.matchDataId as string,
    season: item.season,
    matchId: item.matchId as string,
    mapNumber: item.mapNumber as number,
    name: item.name as string,
    memberId: item.memberId as string | undefined,
    teamId: item.teamId as string,
    ringer: item.ringer as boolean | undefined,
    eliminations: item.eliminations as number,
    assists: item.assists as number,
    deaths: item.deaths as number,
    damage: item.damage as number,
    healing: item.healing as number,
    mitigation: item.mitigation as number,
  }));

export function getMapsForMatch(matchId: string): MapResult[] {
  return mapResults.filter((m) => m.matchId === matchId).sort((a, b) => a.mapNumber - b.mapNumber);
}

export function getPlayerStatsForMap(matchId: string, mapNumber: number): PlayerMapStat[] {
  return playerMapStats.filter((p) => p.matchId === matchId && p.mapNumber === mapNumber);
}

// Match score (maps won) and each map's winner are derived from map scores
// rather than stored — same reasoning as Team.slug being derived rather than
// a stored attribute.
export function getMapWinner(map: MapResult): 'team1' | 'team2' | 'draw' {
  if (map.team1Score > map.team2Score) return 'team1';
  if (map.team2Score > map.team1Score) return 'team2';
  return 'draw';
}

export function getMatchMapWins(matchId: string): { team1Wins: number; team2Wins: number } {
  return getMapsForMatch(matchId).reduce(
    (wins, map) => {
      const winner = getMapWinner(map);
      if (winner === 'team1') wins.team1Wins++;
      else if (winner === 'team2') wins.team2Wins++;
      return wins;
    },
    { team1Wins: 0, team2Wins: 0 }
  );
}
