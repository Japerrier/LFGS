// Batch-inserts the team members listed in team-members-seed.data.mjs into the
// Team_Members table. Looks up each referenced teamId in the Teams table first,
// both to catch typos (DynamoDB won't enforce this relationship for you) and to
// stamp the correct season onto each member automatically.
//
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with read access to Teams and write access to
// Team_Members, plus the correct AWS region resolvable from your environment.
//
// Usage: node seed-team-members.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { teamMembers } from './team-members-seed.data.mjs';

const TEAMS_TABLE = 'Teams';
const TEAM_MEMBERS_TABLE = 'Team_Members';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function getSeasonByTeamId() {
  const { Items } = await client.send(new ScanCommand({ TableName: TEAMS_TABLE }));
  return new Map((Items ?? []).map((team) => [team.teamId, team.season]));
}

async function seedTeamMembers() {
  if (teamMembers.length === 0) {
    console.log('No team members in team-members-seed.data.mjs — nothing to do.');
    return;
  }

  const seasonByTeamId = await getSeasonByTeamId();

  const missingTeamIds = [...new Set(teamMembers.map((m) => m.teamId))].filter(
    (teamId) => !seasonByTeamId.has(teamId)
  );
  if (missingTeamIds.length > 0) {
    throw new Error(
      `These teamIds don't exist in ${TEAMS_TABLE} — check for typos:\n${missingTeamIds.join('\n')}`
    );
  }

  const items = teamMembers.map((member) => ({
    PutRequest: {
      Item: {
        ...member,
        memberId: `member_${crypto.randomUUID()}`,
        season: seasonByTeamId.get(member.teamId),
      },
    },
  }));

  // BatchWriteItem caps out at 25 items per request, so send it in chunks.
  for (const batch of chunk(items, 25)) {
    await client.send(
      new BatchWriteCommand({
        RequestItems: { [TEAM_MEMBERS_TABLE]: batch },
      })
    );
  }

  console.log(`Inserted ${items.length} team member(s) into ${TEAM_MEMBERS_TABLE}.`);
}

seedTeamMembers();
