// Batch-inserts the map results listed in map-result-seed.data.mjs into the
// Match_Data table: one "map" item per map (final score) plus one "player"
// item per player's stats on that map.
//
// For each map result, resolves team1Name/team2Name to teamIds via the Teams
// table, then looks up the matching Matchups row (by season/week/team pair)
// to get the matchId — remapping team1Score/team2Score/team1Players/
// team2Players onto whichever side is actually team1Id/team2Id on that row,
// so Match_Data always agrees with Matchups regardless of the order teams
// were listed in the seed data.
//
// Each player is identified by battleNet (BattleTag, e.g. "Name#1234") rather
// than display name, since names aren't guaranteed unique. Every registered
// Team_Members row for the season is scanned once to build a battleNet ->
// {memberId, teamId} lookup; a player whose BattleTag matches gets memberId
// attached (even if it's a ringer whose real team differs from the teamId
// they're credited to on this map). A BattleTag with no match is a
// completely unregistered outside ringer — memberId is simply omitted.
//
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with read access to Teams/Matchups/Team_Members and
// write access to Match_Data, plus the correct AWS region resolvable from
// your environment.
//
// Usage: $env:AWS_PROFILE = "lfgs"; node seed-map-result.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mapResults } from './map-result-seed.data.mjs';
import { CURRENT_LFGS_SEASON } from '../web/src/lib/season.ts';

const TEAMS_TABLE = 'Teams';
const MATCHUPS_TABLE = 'Matchups';
const TEAM_MEMBERS_TABLE = 'Team_Members';
const MATCH_DATA_TABLE = 'Match_Data';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function teamIdsByName(season) {
  const { Items } = await dynamoClient.send(
    new QueryCommand({
      TableName: TEAMS_TABLE,
      KeyConditionExpression: 'season = :season',
      ExpressionAttributeValues: { ':season': season },
    })
  );
  const byName = new Map();
  for (const item of Items ?? []) {
    byName.set(item.name, item.teamId);
  }
  return byName;
}

async function matchupsForSeason(season) {
  const { Items } = await dynamoClient.send(
    new QueryCommand({
      TableName: MATCHUPS_TABLE,
      KeyConditionExpression: 'season = :season',
      ExpressionAttributeValues: { ':season': season },
    })
  );
  return Items ?? [];
}

async function battleNetLookupForSeason(season) {
  const { Items } = await dynamoClient.send(new ScanCommand({ TableName: TEAM_MEMBERS_TABLE }));
  const lookup = new Map();
  for (const item of Items ?? []) {
    if (item.season !== season || !item.battleNet) continue;
    lookup.set(item.battleNet, { memberId: item.memberId, teamId: item.teamId });
  }
  return lookup;
}

function findMatchup(matchups, week, team1Id, team2Id) {
  const matches = matchups.filter(
    (m) =>
      m.week === week &&
      ((m.team1Id === team1Id && m.team2Id === team2Id) || (m.team1Id === team2Id && m.team2Id === team1Id))
  );
  if (matches.length === 0) return undefined;
  if (matches.length > 1) {
    throw new Error(`Multiple Matchups rows found for week ${week} between teamIds ${team1Id} and ${team2Id}`);
  }
  return matches[0];
}

function buildPlayerItem(season, matchId, mapNumber, teamId, player, battleNetLookup) {
  const resolved = battleNetLookup.get(player.battleNet);
  const item = {
    season,
    matchDataId: `matchDataId_${crypto.randomUUID()}`,
    itemType: 'player',
    matchId,
    mapNumber,
    battleNet: player.battleNet,
    // Display name is just the BattleTag with the #discriminator stripped —
    // same convention as Team_Members' name field.
    name: player.battleNet.split('#')[0],
    teamId,
    eliminations: player.eliminations,
    assists: player.assists,
    deaths: player.deaths,
    damage: player.damage,
    healing: player.healing,
    mitigation: player.mitigation,
  };
  if (resolved) item.memberId = resolved.memberId;
  if (player.ringer) item.ringer = true;
  return item;
}

function buildItemsForMapResult(mapResult, teamIds, matchups, battleNetLookup) {
  const rawTeam1Id = teamIds.get(mapResult.team1Name);
  const rawTeam2Id = teamIds.get(mapResult.team2Name);
  if (!rawTeam1Id) throw new Error(`No team named "${mapResult.team1Name}" found in Teams for season ${CURRENT_LFGS_SEASON}`);
  if (!rawTeam2Id) throw new Error(`No team named "${mapResult.team2Name}" found in Teams for season ${CURRENT_LFGS_SEASON}`);

  const matchup = findMatchup(matchups, mapResult.week, rawTeam1Id, rawTeam2Id);
  if (!matchup) {
    throw new Error(
      `No Matchups row found for week ${mapResult.week}: "${mapResult.team1Name}" vs "${mapResult.team2Name}"`
    );
  }

  // Remap onto whichever side is actually team1Id/team2Id on the Matchups
  // row, regardless of the order the seed data listed them in.
  const seedTeam1IsMatchTeam1 = matchup.team1Id === rawTeam1Id;
  const team1Id = seedTeam1IsMatchTeam1 ? rawTeam1Id : rawTeam2Id;
  const team2Id = seedTeam1IsMatchTeam1 ? rawTeam2Id : rawTeam1Id;
  const team1Score = seedTeam1IsMatchTeam1 ? mapResult.team1Score : mapResult.team2Score;
  const team2Score = seedTeam1IsMatchTeam1 ? mapResult.team2Score : mapResult.team1Score;
  const team1Players = seedTeam1IsMatchTeam1 ? mapResult.team1Players : mapResult.team2Players;
  const team2Players = seedTeam1IsMatchTeam1 ? mapResult.team2Players : mapResult.team1Players;

  const mapItem = {
    season: CURRENT_LFGS_SEASON,
    matchDataId: `matchDataId_${crypto.randomUUID()}`,
    itemType: 'map',
    matchId: matchup.matchId,
    mapNumber: mapResult.mapNumber,
    mapName: mapResult.mapName,
    team1Score,
    team2Score,
  };

  return [
    mapItem,
    ...team1Players.map((p) =>
      buildPlayerItem(CURRENT_LFGS_SEASON, matchup.matchId, mapResult.mapNumber, team1Id, p, battleNetLookup)
    ),
    ...team2Players.map((p) =>
      buildPlayerItem(CURRENT_LFGS_SEASON, matchup.matchId, mapResult.mapNumber, team2Id, p, battleNetLookup)
    ),
  ];
}

async function seedMapResults() {
  if (mapResults.length === 0) {
    console.log('No map results in map-result-seed.data.mjs — nothing to do.');
    return;
  }

  const [teamIds, matchups, battleNetLookup] = await Promise.all([
    teamIdsByName(CURRENT_LFGS_SEASON),
    matchupsForSeason(CURRENT_LFGS_SEASON),
    battleNetLookupForSeason(CURRENT_LFGS_SEASON),
  ]);

  const items = mapResults.flatMap((mapResult) =>
    buildItemsForMapResult(mapResult, teamIds, matchups, battleNetLookup)
  );

  const putRequests = items.map((item) => ({ PutRequest: { Item: item } }));

  // BatchWriteItem caps out at 25 items per request, so send it in chunks.
  for (const batch of chunk(putRequests, 25)) {
    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: { [MATCH_DATA_TABLE]: batch },
      })
    );
  }

  console.log(`Inserted ${items.length} Match_Data item(s) for ${mapResults.length} map(s).`);
}

seedMapResults();
