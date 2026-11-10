import { externalLinks } from '../data/site';

// Used if Discord can't be reached at build time, so a flaky API call never
// breaks the build. Bump it occasionally so the fallback isn't badly stale.
const FALLBACK_MEMBER_COUNT = 3100;

// Pulls the server's approximate member count from Discord's public invite
// endpoint (no bot or token needed). Evaluated at build time, so the number
// only refreshes when the site rebuilds.
export async function getDiscordMemberCount(): Promise<number> {
  const inviteCode = new URL(externalLinks.discord).pathname.replace(/^\//, '');
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { approximate_member_count?: number };
    if (typeof data.approximate_member_count !== 'number') throw new Error('no approximate_member_count in response');
    return data.approximate_member_count;
  } catch (err) {
    console.warn(`[discord] Member count fetch failed, using fallback ${FALLBACK_MEMBER_COUNT}:`, err);
    return FALLBACK_MEMBER_COUNT;
  }
}

// 3184 -> "3100+"
export function formatMemberCount(count: number): string {
  return `${Math.floor(count / 100) * 100}+`;
}
