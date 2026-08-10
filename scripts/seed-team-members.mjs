// Batch-inserts the team members listed in team-members-seed.data.mjs into the
// Team_Members table. Looks up each referenced teamId in the Teams table first,
// both to catch typos (DynamoDB won't enforce this relationship for you) and to
// stamp the correct season and locate the team's S3 folder automatically.
//
// For members with memberType "Player", also creates that player's media
// folder inside their team's S3 folder — coaches/managers/other staff don't
// get one.
//
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with read access to Teams, write access to
// Team_Members, and write access to the media bucket, plus the correct AWS
// region resolvable from your environment.
//
// Usage: $env:AWS_PROFILE = "lfgs"; node seed-team-members.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { teamMembers } from './team-members-seed.data.mjs';

const TEAMS_TABLE = 'Teams';
const TEAM_MEMBERS_TABLE = 'Team_Members';
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

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getTeamInfoByTeamId() {
  const { Items } = await dynamoClient.send(new ScanCommand({ TableName: TEAMS_TABLE }));
  return new Map((Items ?? []).map((team) => [team.teamId, { season: team.season, S3Name: team.S3Name }]));
}

async function seedTeamMembers() {
  if (teamMembers.length === 0) {
    console.log('No team members in team-members-seed.data.mjs — nothing to do.');
    return;
  }

  const teamInfoByTeamId = await getTeamInfoByTeamId();

  const missingTeamIds = [...new Set(teamMembers.map((m) => m.teamId))].filter(
    (teamId) => !teamInfoByTeamId.has(teamId)
  );
  if (missingTeamIds.length > 0) {
    throw new Error(
      `These teamIds don't exist in ${TEAMS_TABLE} — check for typos:\n${missingTeamIds.join('\n')}`
    );
  }

  const prepared = teamMembers.map((member) => {
    const memberId = `memberId_${crypto.randomUUID()}`;
    const { season, S3Name: teamS3Name } = teamInfoByTeamId.get(member.teamId);
    return { ...member, memberId, season, teamS3Name };
  });

  for (const member of prepared) {
    if (member.memberType !== 'Player') continue;

    const playerS3Name = `${slugifyName(member.name)}-${member.memberId.slice(-6)}`;
    const folderKey = `season-${member.season}/teams/${member.teamS3Name}/${playerS3Name}/`;
    // An explicit zero-length Body (rather than omitting it) avoids the
    // SDK's "Stream of unknown length" warning for bodyless PutObject calls.
    await s3Client.send(new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: folderKey, Body: Buffer.alloc(0) }));
    console.log(`Created s3://${MEDIA_BUCKET}/${folderKey}`);
  }

  const items = prepared.map(({ teamS3Name, ...member }) => ({
    PutRequest: { Item: member },
  }));

  // BatchWriteItem caps out at 25 items per request, so send it in chunks.
  for (const batch of chunk(items, 25)) {
    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: { [TEAM_MEMBERS_TABLE]: batch },
      })
    );
  }

  console.log(`Inserted ${items.length} team member(s) into ${TEAM_MEMBERS_TABLE}.`);
}

seedTeamMembers();
