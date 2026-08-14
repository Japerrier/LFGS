// Deletes all Teams/Team_Members rows and S3 objects for a given season —
// meant for wiping out test-registration data (e.g. season 99, the season
// local-server.mjs and the registration wizard's dev flow write to) without
// touching real seasons.
//
// Defaults to a dry run (prints what would be deleted, deletes nothing).
// Pass --apply to actually delete. Defaults to season 99; pass --season=N
// to target a different one.
//
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with delete access to both tables and the media
// bucket, and the correct AWS region resolvable from your environment.
//
// Usage:
//   $env:AWS_PROFILE = "lfgs"; node cleanup-season.mjs                  # dry run, season 99
//   $env:AWS_PROFILE = "lfgs"; node cleanup-season.mjs --apply          # deletes, season 99
//   $env:AWS_PROFILE = "lfgs"; node cleanup-season.mjs --season=7 --apply

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const TEAMS_TABLE = 'Teams';
const TEAM_MEMBERS_TABLE = 'Team_Members';
const MEDIA_BUCKET = 'lfgs-media-011122914860-us-east-1-an';

const apply = process.argv.includes('--apply');
const seasonArg = process.argv.find((arg) => arg.startsWith('--season='));
const SEASON = Number(seasonArg ? seasonArg.split('=')[1] : 99);

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function scanAll(TableName, FilterExpression, ExpressionAttributeValues) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await dynamoClient.send(
      new ScanCommand({ TableName, FilterExpression, ExpressionAttributeValues, ExclusiveStartKey })
    );
    items.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function deleteDynamoRows(TableName, items, keyOf) {
  if (items.length === 0) return;
  const requests = items.map((item) => ({ DeleteRequest: { Key: keyOf(item) } }));
  for (const batch of chunk(requests, 25)) {
    await dynamoClient.send(new BatchWriteCommand({ RequestItems: { [TableName]: batch } }));
  }
}

async function cleanupTeams() {
  const teams = await scanAll(TEAMS_TABLE, 'season = :season', { ':season': SEASON });
  console.log(`${TEAMS_TABLE}: ${teams.length} team(s) in season ${SEASON}`);
  for (const team of teams) console.log(`  - ${team.name} (${team.teamId})`);
  if (apply) await deleteDynamoRows(TEAMS_TABLE, teams, (t) => ({ teamId: t.teamId, season: t.season }));
  return teams;
}

async function cleanupTeamMembers() {
  const members = await scanAll(TEAM_MEMBERS_TABLE, 'season = :season', { ':season': SEASON });
  console.log(`${TEAM_MEMBERS_TABLE}: ${members.length} member(s) in season ${SEASON}`);
  for (const member of members) console.log(`  - ${member.name} (${member.memberId}, team ${member.teamId})`);
  if (apply) await deleteDynamoRows(TEAM_MEMBERS_TABLE, members, (m) => ({ teamId: m.teamId, memberId: m.memberId }));
  return members;
}

async function cleanupMedia() {
  const prefix = `season-${SEASON}/`;
  const keys = [];
  let ContinuationToken;
  do {
    const result = await s3Client.send(
      new ListObjectsV2Command({ Bucket: MEDIA_BUCKET, Prefix: prefix, ContinuationToken })
    );
    keys.push(...(result.Contents ?? []).map((obj) => obj.Key));
    ContinuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (ContinuationToken);

  console.log(`s3://${MEDIA_BUCKET}/${prefix}: ${keys.length} object(s)`);
  for (const key of keys) console.log(`  - ${key}`);

  if (apply) {
    // DeleteObjects caps out at 1000 keys per request.
    for (const batch of chunk(keys, 1000)) {
      if (batch.length === 0) continue;
      await s3Client.send(
        new DeleteObjectsCommand({ Bucket: MEDIA_BUCKET, Delete: { Objects: batch.map((Key) => ({ Key })) } })
      );
    }
  }
  return keys;
}

async function main() {
  if (!apply) {
    console.log(`Dry run (no deletes) — pass --apply to actually delete season ${SEASON} data.\n`);
  } else {
    console.log(`Deleting all season ${SEASON} data — this cannot be undone.\n`);
  }
  await cleanupTeams();
  await cleanupTeamMembers();
  await cleanupMedia();
}

main();
