import type { TeamInfoInput } from './registration-validation';
import type { PlayerFormState } from '../components/PlayerBlock';

// Mirrors the request/response contract of infra/lambda/registration-handler
// (POST /register) — see that file for the authoritative shape.
interface UploadTarget {
  key: string;
  url: string;
}

interface RegisterResponse {
  teamId: string;
  uploads: {
    logo: UploadTarget | null;
    players: { memberId: string; screenshots: UploadTarget[] }[];
  };
}

export interface SubmitResult {
  teamId: string;
  /** Non-empty if the team/player rows were created but one or more file
   *  uploads failed after the fact — registration still succeeded. */
  failedUploads: string[];
}

function apiUrl(): string {
  const url = import.meta.env.PUBLIC_REGISTRATION_API_URL;
  if (!url) throw new Error('Registration is not configured (missing PUBLIC_REGISTRATION_API_URL) — contact LFGS staff.');
  return url;
}

async function uploadFile(file: File, target: UploadTarget): Promise<void> {
  const response = await fetch(target.url, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!response.ok) throw new Error(`Upload failed for ${file.name} (${response.status})`);
}

export async function submitRegistration(
  team: TeamInfoInput,
  players: PlayerFormState[],
  honeypot: string
): Promise<SubmitResult> {
  const payload = {
    teamName: team.teamName.trim(),
    bracket: team.bracket,
    captainDiscordTag: team.captainDiscordTag.trim(),
    headCoachDiscordTag: team.headCoachDiscordTag.trim(),
    headCoachBattleTag: team.headCoachBattleTag.trim(),
    assistantCoachDiscordTag: team.hasAssistantCoach ? team.assistantCoachDiscordTag.trim() : '',
    assistantCoachBattleTag: team.hasAssistantCoach ? team.assistantCoachBattleTag.trim() : '',
    // A real visitor never fills this hidden field in — see the Lambda's
    // matching honeypot check.
    website: honeypot,
    logo: team.logo ? { contentType: team.logo.type } : null,
    players: players.map((p) => ({
      discordTag: p.discordTag.trim(),
      battleTag: p.battleTag.trim(),
      roles: p.roles,
      screenshots: p.screenshots.filter((f): f is File => f !== null).map((f) => ({ contentType: f.type })),
    })),
  };

  const response = await fetch(apiUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = Array.isArray(body.details) ? body.details.join('; ') : (body.error ?? `Registration failed (${response.status})`);
    throw new Error(message);
  }

  const result = (await response.json()) as RegisterResponse;

  const uploads: { file: File; target: UploadTarget }[] = [];
  if (team.logo && result.uploads.logo) {
    uploads.push({ file: team.logo, target: result.uploads.logo });
  }
  players.forEach((player, i) => {
    const files = player.screenshots.filter((f): f is File => f !== null);
    const targets = result.uploads.players[i]?.screenshots ?? [];
    files.forEach((file, j) => {
      const target = targets[j];
      if (target) uploads.push({ file, target });
    });
  });

  const outcomes = await Promise.allSettled(uploads.map(({ file, target }) => uploadFile(file, target)));
  const failedUploads = outcomes
    .map((outcome, i) => (outcome.status === 'rejected' ? uploads[i].file.name : null))
    .filter((name): name is string => name !== null);

  return { teamId: result.teamId, failedUploads };
}
