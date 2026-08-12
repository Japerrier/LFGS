// One-time backfill: stamps `approved: true` on every existing Team, and on
// every existing Team_Members row with memberType "Player", so they keep
// showing on the site once the read path starts requiring `approved === true`
// (see web/src/data/teams.ts and web/src/data/team-members.ts).
//
// Coach/manager rows are left untouched — they're exempt from the approved
// check entirely, so they don't need the field set.
//
// Defaults to a dry run (prints what would change, writes nothing). Pass
// --apply to actually perform the updates.
//
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with read+write access to both tables, and the
// correct AWS region resolvable from your environment.
//
// Usage:
//   $env:AWS_PROFILE = "lfgs"; node backfill-approved.mjs            # dry run
//   $env:AWS_PROFILE = "lfgs"; node backfill-approved.mjs --apply    # writes

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TEAMS_TABLE = 'Teams';
const TEAM_MEMBERS_TABLE = 'Team_Members';

const apply = process.argv.includes('--apply');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function scanAll(TableName) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await dynamoClient.send(new ScanCommand({ TableName, ExclusiveStartKey }));
    items.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function backfillTeams() {
  const teams = await scanAll(TEAMS_TABLE);
  const needsUpdate = teams.filter((team) => team.approved !== true);

  console.log(`${TEAMS_TABLE}: ${needsUpdate.length} of ${teams.length} team(s) need approved: true`);
  for (const team of needsUpdate) {
    console.log(`  - ${team.name} (${team.teamId}, season ${team.season})`);
    if (apply) {
      await dynamoClient.send(
        new UpdateCommand({
          TableName: TEAMS_TABLE,
          Key: { teamId: team.teamId, season: team.season },
          UpdateExpression: 'SET approved = :true',
          ExpressionAttributeValues: { ':true': true },
        })
      );
    }
  }
}

async function backfillPlayers() {
  const members = await scanAll(TEAM_MEMBERS_TABLE);
  const needsUpdate = members.filter((member) => member.memberType === 'Player' && member.approved !== true);

  console.log(`${TEAM_MEMBERS_TABLE}: ${needsUpdate.length} player(s) need approved: true`);
  for (const member of needsUpdate) {
    console.log(`  - ${member.name} (${member.memberId}, team ${member.teamId})`);
    if (apply) {
      await dynamoClient.send(
        new UpdateCommand({
          TableName: TEAM_MEMBERS_TABLE,
          Key: { teamId: member.teamId, memberId: member.memberId },
          UpdateExpression: 'SET approved = :true',
          ExpressionAttributeValues: { ':true': true },
        })
      );
    }
  }
}

async function main() {
  if (!apply) {
    console.log('Dry run (no writes) — pass --apply to actually update DynamoDB.\n');
  }
  await backfillTeams();
  await backfillPlayers();
}

main();
