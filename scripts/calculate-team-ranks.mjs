// Computes each team's `teamRank` (top-5-by-SR average, floored to a rank
// label — see web/src/lib/rank.ts) from its roster's peakRank* fields, and
// writes it to the Teams table. Run this by hand whenever peakRank* data
// changes for a team's roster; the site reads the stored teamRank value at
// build time rather than recomputing it, so a rebuild+deploy won't pick up
// the new value until this has been run.
//
// Imports computeTeamRank and normalizeBracket straight from web/src/lib/
// (the site's own copies — no duplicated ladder or bracket logic to keep in
// sync) rather than local copies. Node strips the TypeScript types at
// import time automatically; this needs Node 23.6+ for that to work without
// a flag (web/'s own package.json requires only >=22.12.0, so if this
// errors on an older Node, upgrade Node rather than trying to work around
// it).
//
// Teams without a recognized bracket (e.g. historical Hall of Fame seasons,
// which don't have a `bracket` attribute at all) are skipped. Teams with no
// player on the roster having a valid rank for any role are also skipped —
// existing teamRank values are left untouched rather than guessed at.
//
// Defaults to a dry run (prints what would change, writes nothing). Pass
// --apply to actually perform the updates.
//
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with read access to Team_Members and read+write
// access to Teams, plus the correct AWS region resolvable from your
// environment.
//
// Usage:
//   $env:AWS_PROFILE = "lfgs"; node calculate-team-ranks.mjs            # dry run
//   $env:AWS_PROFILE = "lfgs"; node calculate-team-ranks.mjs --apply    # writes

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { computeTeamRank } from '../web/src/lib/rank.ts';
import { BRACKETS, normalizeBracket } from '../web/src/lib/brackets.ts';

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

async function getMembersByTeamId(teamId) {
  const { Items } = await dynamoClient.send(
    new QueryCommand({
      TableName: TEAM_MEMBERS_TABLE,
      KeyConditionExpression: 'teamId = :teamId',
      ExpressionAttributeValues: { ':teamId': teamId },
    })
  );
  return Items ?? [];
}

async function main() {
  if (!apply) {
    console.log('Dry run (no writes) — pass --apply to actually update DynamoDB.\n');
  }

  const teams = await scanAll(TEAMS_TABLE);

  for (const team of teams) {
    const bracket = normalizeBracket(team.bracket);
    if (!BRACKETS.includes(bracket)) {
      console.log(`${team.name} (${team.teamId}): skipped — no recognized bracket`);
      continue;
    }

    const members = await getMembersByTeamId(team.teamId);
    const result = computeTeamRank(members, bracket);

    if (!result) {
      console.log(`${team.name}: skipped — no player has a valid rank for any role yet`);
      continue;
    }

    console.log(
      `${team.name}: ${result.rank} (avg ${result.averageSR} SR across top ${result.playerCount} player${result.playerCount === 1 ? '' : 's'})`
    );

    if (apply) {
      await dynamoClient.send(
        new UpdateCommand({
          TableName: TEAMS_TABLE,
          Key: { teamId: team.teamId, season: team.season },
          UpdateExpression: 'SET teamRank = :teamRank',
          ExpressionAttributeValues: { ':teamRank': result.rank },
        })
      );
    }
  }
}

main();
