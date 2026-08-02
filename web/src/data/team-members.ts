import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '../lib/dynamodb';
import type { TeamMember } from './types';

const TEAM_MEMBERS_TABLE = 'Team_Members';

// battleNet and discordUsername are deliberately excluded via ProjectionExpression,
// not just left out of the template — this is public-facing, and those fields
// would let someone outside the team's own players track a member down elsewhere.
const PUBLIC_MEMBER_FIELDS =
  'memberId, teamId, #season, #name, memberType, captain, registeredForTank, registeredForDps, registeredForSupport, profileImageKey, smallProfileImageKey, seasonScreenshotImageKeys';

export async function getMembersByTeamId(teamId: string): Promise<TeamMember[]> {
  const { Items } = await dynamoDb.send(
    new QueryCommand({
      TableName: TEAM_MEMBERS_TABLE,
      KeyConditionExpression: 'teamId = :teamId',
      ExpressionAttributeValues: { ':teamId': teamId },
      ProjectionExpression: PUBLIC_MEMBER_FIELDS,
      ExpressionAttributeNames: { '#name': 'name', '#season': 'season' },
    })
  );
  return (Items ?? []) as TeamMember[];
}

export function memberRoles(member: TeamMember): string[] {
  return [
    member.registeredForTank && 'Tank',
    member.registeredForDps && 'DPS',
    member.registeredForSupport && 'Support',
  ].filter((role): role is string => Boolean(role));
}
