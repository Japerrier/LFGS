// Adds results (team1Score, team2Score, maps) to existing Matchups rows from
// match-result-seed.data.mjs. Each entry is matched to its row by season, week
// and team pair; the row is read, updated, and written back whole, so every
// other attribute on it is preserved.
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with read/write access to Teams and Matchups, and the
// correct AWS region resolvable from your environment.
//
// Usage: $env:AWS_PROFILE = "lfgs"; node record-match-results.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { matchResults } from './match-result-seed.data.mjs';
import { CURRENT_LFGS_SEASON } from '../web/src/lib/season.ts';

const MATCHUPS_TABLE = 'Matchups';
const TEAMS_TABLE = 'Teams';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function queryBySeason(table, season) {
  const { Items } = await dynamoClient.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: 'season = :season',
      ExpressionAttributeValues: { ':season': season },
    })
  );
  return Items ?? [];
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

function buildUpdatedMatchup(result, teamIds, matchups) {
  const rawTeam1Id = teamIds.get(result.team1Name);
  const rawTeam2Id = teamIds.get(result.team2Name);
  if (!rawTeam1Id) throw new Error(`No team named "${result.team1Name}" found in Teams for season ${CURRENT_LFGS_SEASON}`);
  if (!rawTeam2Id) throw new Error(`No team named "${result.team2Name}" found in Teams for season ${CURRENT_LFGS_SEASON}`);

  const matchup = findMatchup(matchups, result.week, rawTeam1Id, rawTeam2Id);
  if (!matchup) {
    throw new Error(`No Matchups row found for week ${result.week}: "${result.team1Name}" vs "${result.team2Name}"`);
  }

  // Remap onto whichever side is actually team1Id/team2Id on the Matchups row,
  // regardless of the order the seed data listed them in.
  const sameOrder = matchup.team1Id === rawTeam1Id;
  const updated = {
    ...matchup,
    team1Score: sameOrder ? result.team1Score : result.team2Score,
    team2Score: sameOrder ? result.team2Score : result.team1Score,
  };
  if (result.maps) updated.maps = result.maps;
  return updated;
}

async function recordMatchResults() {
  if (matchResults.length === 0) {
    console.log('No results in match-result-seed.data.mjs — nothing to do.');
    return;
  }

  const [teams, matchups] = await Promise.all([
    queryBySeason(TEAMS_TABLE, CURRENT_LFGS_SEASON),
    queryBySeason(MATCHUPS_TABLE, CURRENT_LFGS_SEASON),
  ]);
  const teamIds = new Map(teams.map((t) => [t.name, t.teamId]));

  // Build everything first so a bad entry fails before any row is written.
  const updated = matchResults.map((r) => buildUpdatedMatchup(r, teamIds, matchups));

  for (const item of updated) {
    await dynamoClient.send(new PutCommand({ TableName: MATCHUPS_TABLE, Item: item }));
  }

  console.log(`Recorded results on ${updated.length} matchup(s) in ${MATCHUPS_TABLE}.`);
}

recordMatchResults();
