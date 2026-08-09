// Batch-inserts the teams listed in teams-seed.data.mjs into the Teams table,
// and creates each team's media folder in S3 before doing so.
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with write access to the table and the media bucket,
// and the correct AWS region resolvable from your environment.
//
// Usage: $env:AWS_PROFILE = "lfgs"; node seed-teams.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { teams } from './teams-seed.data.mjs';

const TABLE_NAME = 'Teams';
const MEDIA_BUCKET = 'lfgs-media-011122914860-us-east-1-an';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function slugifyS3Name(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

async function seedTeams() {
  if (teams.length === 0) {
    console.log('No teams in teams-seed.data.mjs — nothing to do.');
    return;
  }

  // S3Name always carries the teamId suffix, regardless of whether the name
  // actually collides with another team — this is unrelated to the site's
  // URL slugs (web/src/data/teams.ts), which stay clean unless there's a
  // real collision. Keeping S3Name unconditionally unique means no lookup
  // is needed here at all.
  const prepared = teams.map((team) => {
    const teamId = `teamId_${crypto.randomUUID()}`;
    const S3Name = `${slugifyS3Name(team.name)}-${teamId.slice(-6)}`;
    return { ...team, teamId, S3Name };
  });

  for (const team of prepared) {
    const folderKey = `season-${team.season}/teams/${team.S3Name}/`;
    // The SDK prints a "Stream of unknown length" warning here for a
    // bodyless PutObject — it's a known cosmetic quirk, not an actual
    // problem; the empty-marker object is still created correctly.
    await s3Client.send(new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: folderKey }));
    console.log(`Created s3://${MEDIA_BUCKET}/${folderKey}`);
  }

  const items = prepared.map((team) => ({
    PutRequest: { Item: team },
  }));

  // BatchWriteItem caps out at 25 items per request, so send it in chunks.
  for (const batch of chunk(items, 25)) {
    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: { [TABLE_NAME]: batch },
      })
    );
  }

  console.log(`Inserted ${items.length} team(s) into ${TABLE_NAME}.`);
}

seedTeams();
