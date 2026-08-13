import type { Bracket } from '../data/types';
import type { PlayerFormState } from '../components/PlayerBlock';

// Mirrors infra/lambda/registration-handler/index.mjs — duplicated rather
// than shared since the wizard and the Lambda are separate deployables
// (same convention scripts/ already uses for its own small helpers). Keep
// these two files in sync if either side's rules change.
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 8;
export const MAX_SCREENSHOTS_PER_PLAYER = 3;
export const MAX_SHORT_STRING = 100;
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// The Lambda doesn't cap file size (presigned PUT URLs don't carry a size
// condition) — this is a client-side-only guard to stop someone accidentally
// uploading something huge, not a security boundary.
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const BATTLE_TAG_PATTERN = /^(.+)#\d+$/;

function isNonEmptyString(value: string, maxLength = MAX_SHORT_STRING): boolean {
  return value.trim().length > 0 && value.length <= maxLength;
}

function validateImageFile(file: File | null, label: string): string | null {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return `${label} must be a PNG, JPEG, or WEBP image`;
  if (file.size > MAX_FILE_SIZE_BYTES) return `${label} must be under ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`;
  return null;
}

// A staff member (Head Coach / Assistant Coach) is entirely optional, but
// once either of their two fields has anything in it, both are required —
// there's no such thing as a half-entered coach.
function validateOptionalStaff(discordTag: string, battleTag: string, label: string): string[] {
  const errors: string[] = [];
  const hasAny = discordTag.trim().length > 0 || battleTag.trim().length > 0;
  if (!hasAny) return errors;

  if (!isNonEmptyString(discordTag)) errors.push(`${label}'s Discord Tag is required`);
  if (!isNonEmptyString(battleTag) || !BATTLE_TAG_PATTERN.test(battleTag)) {
    errors.push(`${label}'s Battle.net Tag must look like "Name#1234"`);
  }
  return errors;
}

export interface TeamInfoInput {
  teamName: string;
  bracket: Bracket | '';
  captainDiscordTag: string;
  logo: File | null;
  headCoachDiscordTag: string;
  headCoachBattleTag: string;
  hasAssistantCoach: boolean;
  assistantCoachDiscordTag: string;
  assistantCoachBattleTag: string;
}

export function validateTeamInfo(team: TeamInfoInput): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(team.teamName)) errors.push('Team Name is required');
  if (!team.bracket) errors.push('Bracket is required');
  if (!isNonEmptyString(team.captainDiscordTag)) errors.push("Team Captain's Discord Tag is required");

  const logoError = validateImageFile(team.logo, 'Team Logo');
  if (logoError) errors.push(logoError);

  errors.push(...validateOptionalStaff(team.headCoachDiscordTag, team.headCoachBattleTag, 'Head Coach'));

  // Unlike Head Coach, Assistant Coach is only "in play" once the user has
  // opted into it via the + Add Assistant Coach toggle — while that's off,
  // whatever's in these two fields (should be empty, but just in case) is
  // ignored rather than validated.
  if (team.hasAssistantCoach) {
    if (!isNonEmptyString(team.assistantCoachDiscordTag)) errors.push("Assistant Coach's Discord Tag is required");
    if (!isNonEmptyString(team.assistantCoachBattleTag) || !BATTLE_TAG_PATTERN.test(team.assistantCoachBattleTag)) {
      errors.push('Assistant Coach\'s Battle.net Tag must look like "Name#1234"');
    }
  }

  return errors;
}

function findStaffPlayerCollisions(players: PlayerFormState[], staffDiscordTag: string, staffLabel: string): string[] {
  const tag = staffDiscordTag.trim();
  if (!tag) return [];
  const collisions = players
    .map((p, i) => (p.discordTag.trim() === tag ? i + 1 : null))
    .filter((i): i is number => i !== null);
  if (collisions.length === 0) return [];
  return [`${staffLabel}'s Discord Tag can't also belong to a player (Player ${collisions.join(', ')})`];
}

function findDuplicatePlayerValues(players: PlayerFormState[], key: 'discordTag' | 'battleTag', label: string): string[] {
  const seenAt = new Map<string, number[]>();
  players.forEach((p, i) => {
    const value = p[key].trim();
    if (!value) return; // already flagged as required elsewhere
    seenAt.set(value, [...(seenAt.get(value) ?? []), i + 1]);
  });

  const errors: string[] = [];
  for (const [value, indices] of seenAt) {
    if (indices.length > 1) errors.push(`Players ${indices.join(', ')} share the same ${label} ("${value}")`);
  }
  return errors;
}

export interface StaffTags {
  captainDiscordTag: string;
  headCoachDiscordTag: string;
  assistantCoachDiscordTag: string;
}

export function validatePlayers(players: PlayerFormState[], staff: StaffTags): string[] {
  const errors: string[] = [];

  players.forEach((player, i) => {
    const label = `Player ${i + 1}`;
    if (!isNonEmptyString(player.discordTag)) errors.push(`${label}: Discord Tag is required`);
    if (!isNonEmptyString(player.battleTag) || !BATTLE_TAG_PATTERN.test(player.battleTag)) {
      errors.push(`${label}: Battle.net Tag must look like "Name#1234"`);
    }
    if (!player.roles.tank && !player.roles.damage && !player.roles.support) {
      errors.push(`${label}: select at least one registered role`);
    }

    if (player.screenshots.some((f) => f === null)) {
      errors.push(`${label}: all 3 screenshots are required`);
    } else {
      player.screenshots.forEach((file, slot) => {
        const error = validateImageFile(file, `${label}: Screenshot ${slot + 1}`);
        if (error) errors.push(error);
      });
    }
  });

  const captainTag = staff.captainDiscordTag.trim();
  const hasMatchingCaptain = players.some((p) => p.discordTag.trim() === captainTag);
  if (captainTag && !hasMatchingCaptain) {
    errors.push("Team Captain's Discord Tag must match one of the players' Discord Tags below");
  }

  errors.push(...findStaffPlayerCollisions(players, staff.headCoachDiscordTag, 'Head Coach'));
  errors.push(...findStaffPlayerCollisions(players, staff.assistantCoachDiscordTag, 'Assistant Coach'));
  errors.push(...findDuplicatePlayerValues(players, 'discordTag', 'Discord Tag'));
  errors.push(...findDuplicatePlayerValues(players, 'battleTag', 'Battle.net Tag'));

  return errors;
}
