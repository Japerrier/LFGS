// Batch-inserts the teams listed in teams-seed.data.mjs into the Teams table.
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with write access to the table, and the correct AWS
// region resolvable from your environment.
//
// Usage: node seed-teams.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { teams } from './teams-seed.data.mjs';

const TABLE_NAME = 'Teams';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function seedTeams() {
  if (teams.length === 0) {
    console.log('No teams in teams-seed.data.mjs — nothing to do.');
    return;
  }

  const items = teams.map((team) => ({
    PutRequest: {
      Item: {
        ...team,
        teamId: `team_${crypto.randomUUID()}`,
      },
    },
  }));

  // BatchWriteItem caps out at 25 items per request, so send it in chunks.
  for (const batch of chunk(items, 25)) {
    await client.send(
      new BatchWriteCommand({
        RequestItems: { [TABLE_NAME]: batch },
      })
    );
  }

  console.log(`Inserted ${items.length} team(s) into ${TABLE_NAME}.`);
}

seedTeams();
