// Batch-inserts the matchups listed in matchups-seed.data.mjs into the
// Matchups table, resolving each team1Name/team2Name to that team's teamId
// via the Teams table first.
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with write access to the table, and the correct AWS
// region resolvable from your environment.
//
// Usage: $env:AWS_PROFILE = "lfgs"; node seed-matchups.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { matchups } from './matchups-seed.data.mjs';
import { CURRENT_LFGS_SEASON } from '../web/src/lib/season.ts';

const MATCHUPS_TABLE = 'Matchups';
const TEAMS_TABLE = 'Teams';

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

async function seedMatchups() {
  if (matchups.length === 0) {
    console.log('No matchups in matchups-seed.data.mjs — nothing to do.');
    return;
  }

  const teamIds = await teamIdsByName(CURRENT_LFGS_SEASON);

  const items = matchups.map((m) => {
    const team1Id = teamIds.get(m.team1Name);
    const team2Id = teamIds.get(m.team2Name);
    if (!team1Id) throw new Error(`No team named "${m.team1Name}" found in Teams for season ${CURRENT_LFGS_SEASON}`);
    if (!team2Id) throw new Error(`No team named "${m.team2Name}" found in Teams for season ${CURRENT_LFGS_SEASON}`);

    const matchId = `matchId_${crypto.randomUUID()}`;
    const item = {
      matchId,
      season: CURRENT_LFGS_SEASON,
      week: m.week,
      bracket: m.bracket,
      team1Id,
      // Denormalized alongside team1Id/team2Id purely so the row is readable
      // in the DynamoDB console — the site itself resolves names from
      // teamId at build time (web/src/data/matchups.ts) and ignores these.
      team1Name: m.team1Name,
      team2Id,
      team2Name: m.team2Name,
    };
    if (m.group) item.group = m.group;
    return { PutRequest: { Item: item } };
  });

  // BatchWriteItem caps out at 25 items per request, so send it in chunks.
  for (const batch of chunk(items, 25)) {
    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: { [MATCHUPS_TABLE]: batch },
      })
    );
  }

  console.log(`Inserted ${items.length} matchup(s) into ${MATCHUPS_TABLE}.`);
}

seedMatchups();
