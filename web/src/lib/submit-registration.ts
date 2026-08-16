import type { TeamInfoInput } from './registration-validation';
import type { PlayerFormState } from '../components/PlayerBlock';

// Mirrors the request/response contract of infra/lambda/registration-handler
// (POST /register) — see that file for the authoritative shape. `url` +
// `fields` together form an S3 presigned POST policy (not a plain PUT URL) —
// the only presigning shape that lets the Lambda enforce a max upload size,
// so `fields` must be submitted alongside the file, not discarded.
interface UploadTarget {
  key: string;
  url: string;
  fields: Record<string, string>;
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
  const form = new FormData();
  for (const [name, value] of Object.entries(target.fields)) form.append(name, value);
  // S3 ignores every field appended after `file`, so it has to go last. No
  // content-type header is set here on purpose — the browser needs to set
  // its own multipart boundary, which an explicit header would override.
  form.append('file', file);

  const response = await fetch(target.url, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`Upload failed for ${file.name} (${response.status})`);
}

export async function submitRegistration(
  team: TeamInfoInput,
  players: PlayerFormState[],
  honeypot: string,
  turnstileToken: string | null
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
    turnstileToken,
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
