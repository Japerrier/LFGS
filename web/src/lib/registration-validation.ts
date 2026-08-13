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

export interface TeamInfoInput {
  teamName: string;
  bracket: Bracket | '';
  headCoachName: string;
  captainDiscordTag: string;
  logo: File | null;
}

export function validateTeamInfo(team: TeamInfoInput): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(team.teamName)) errors.push('Team Name is required');
  if (!team.bracket) errors.push('Bracket is required');
  if (!isNonEmptyString(team.headCoachName)) errors.push('Team Head Coach is required');
  if (!isNonEmptyString(team.captainDiscordTag)) errors.push("Team Captain's Discord Tag is required");

  const logoError = validateImageFile(team.logo, 'Team Logo');
  if (logoError) errors.push(logoError);

  return errors;
}

export function validatePlayers(players: PlayerFormState[], captainDiscordTag: string): string[] {
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
    player.screenshots.forEach((file, slot) => {
      const error = validateImageFile(file, `${label}: Screenshot ${slot + 1}`);
      if (error) errors.push(error);
    });
  });

  const captainTag = captainDiscordTag.trim();
  const hasMatchingCaptain = players.some((p) => p.discordTag.trim() === captainTag);
  if (captainTag && !hasMatchingCaptain) {
    errors.push("Team Captain's Discord Tag must match one of the players' Discord Tags below");
  }

  return errors;
}
