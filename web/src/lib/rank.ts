// Ordered lowest to highest SR, each rank exactly 100 SR apart. Mirrors the
// LFGS rank-to-SR reference sheet (Bronze 5 = 500 up to Champion 1 = 4900).
//
// This is the single source of truth for the rank ladder — scripts/calculate-team-ranks.mjs
// imports straight from this file (Node's built-in TypeScript support strips
// the types at import time, no build step needed) rather than keeping its
// own duplicate copy.
import type { Bracket } from '../data/types';

const RANK_LADDER = [
  'Bronze 5', 'Bronze 4', 'Bronze 3', 'Bronze 2', 'Bronze 1',
  'Silver 5', 'Silver 4', 'Silver 3', 'Silver 2', 'Silver 1',
  'Gold 5', 'Gold 4', 'Gold 3', 'Gold 2', 'Gold 1',
  'Platinum 5', 'Platinum 4', 'Platinum 3', 'Platinum 2', 'Platinum 1',
  'Emerald 5', 'Emerald 4', 'Emerald 3', 'Emerald 2', 'Emerald 1',
  'Diamond 5', 'Diamond 4', 'Diamond 3', 'Diamond 2', 'Diamond 1',
  'Master 5', 'Master 4', 'Master 3', 'Master 2', 'Master 1',
  'Grandmaster 5', 'Grandmaster 4', 'Grandmaster 3', 'Grandmaster 2', 'Grandmaster 1',
  'Champion 5', 'Champion 4', 'Champion 3', 'Champion 2', 'Champion 1',
];

const BASE_SR = 500; // Bronze 5
const OFF_ROLE_REDUCTION_STEPS = 3;
const TOP_PLAYERS_FOR_AVERAGE = 5;

// The bracket floor a player's effective SR can never fall below when
// contributing to their team's average, regardless of how low their actual
// peaks are.
const BRACKET_FLOOR: Record<Bracket, string> = {
  Emerald: 'Platinum 1',
  Diamond: 'Emerald 1',
};

// A blank peakRank* field is an expected, legitimate state — plenty of
// players haven't placed in every role this season, and the rulebook only
// requires a rank for the role(s) they're actually registered for. Distinct
// from a *malformed* field (see hasMalformedRank below): that field is
// hand-typed by staff in the console, so a typo (e.g. "Emeral 3") is a real
// data error, not "this role doesn't apply" — the two need different
// handling, not both being lumped in as "missing".
function isValidRank(rank: string | undefined): rank is string {
  return rank !== undefined && rank !== '' && RANK_LADDER.includes(rank);
}

// True if any of the three fields holds something other than a real rank or
// a blank — i.e. a typo. A blank field just means "hasn't placed in this
// role," which is fine and shouldn't hide anything; a typo means the data
// itself can't be trusted, which should hide the player's rank entirely
// (both the profile pill and their team-average contribution) as a visible
// cue that it needs fixing, rather than silently computing around it.
function hasMalformedRank(peaks: RolePeaks): boolean {
  return [peaks.tank, peaks.dps, peaks.support].some(
    (rank) => rank !== undefined && rank !== '' && !RANK_LADDER.includes(rank)
  );
}

function rankIndex(rank: string): number {
  const index = RANK_LADDER.indexOf(rank);
  if (index === -1) throw new Error(`Unknown rank: "${rank}"`);
  return index;
}

export function rankToSR(rank: string): number {
  return BASE_SR + rankIndex(rank) * 100;
}

function stepsBelow(rank: string, steps: number): string {
  return RANK_LADDER[Math.max(0, rankIndex(rank) - steps)];
}

// Rounds down to the nearest rank tier at or below `sr` — team averages
// almost never land exactly on a tier's own SR value.
export function srToRankFloor(sr: number): string {
  const index = Math.min(RANK_LADDER.length - 1, Math.max(0, Math.floor((sr - BASE_SR) / 100)));
  return RANK_LADDER[index];
}

export interface RolePeaks {
  tank?: string;
  dps?: string;
  support?: string;
}

export interface RegisteredRoles {
  tank: boolean;
  dps: boolean;
  support: boolean;
}

// The rank shown on a player's own profile: the highest peak among the
// roles they're actually registered for that have a valid rank recorded. No
// off-role reduction and no bracket floor here — those only ever affect the
// hidden team-average contribution, never what a player sees about
// themselves.
//
// A registered role with a blank peak simply isn't counted (they haven't
// placed there yet) rather than blocking the whole player — only a
// malformed field (a typo, not a blank) hides the rank entirely. Returns
// undefined if none of their registered roles have a valid rank yet, or if
// any field on the player is malformed.
export function displayRank(peaks: RolePeaks, registered: RegisteredRoles): string | undefined {
  if (hasMalformedRank(peaks)) return undefined;

  const registeredPeaks = [
    registered.tank && isValidRank(peaks.tank) && peaks.tank,
    registered.dps && isValidRank(peaks.dps) && peaks.dps,
    registered.support && isValidRank(peaks.support) && peaks.support,
  ].filter((r): r is string => Boolean(r));

  if (registeredPeaks.length === 0) return undefined;

  return registeredPeaks.reduce((highest, r) => (rankToSR(r) > rankToSR(highest) ? r : highest));
}

// The SR a single player contributes to their team's average: the highest
// peak across whichever roles have a valid rank recorded, with non-registered
// roles reduced 3 ladder steps first (an off-role player isn't trusted to
// perform at their true peak in that role), then floored to the bracket's
// minimum. A blank peak for a role they haven't placed in is simply left out
// of the comparison — it's expected, not an error. Returns undefined if no
// role has a valid rank at all, or if any field on the player is malformed
// (a typo, not a blank) — a bad value hides this player's contribution
// entirely rather than risk averaging in a wrong number.
export function effectiveTeamSR(peaks: RolePeaks, registered: RegisteredRoles, bracket: Bracket): number | undefined {
  if (hasMalformedRank(peaks)) return undefined;

  const contributionSRs = [
    isValidRank(peaks.tank)
      ? rankToSR(registered.tank ? peaks.tank : stepsBelow(peaks.tank, OFF_ROLE_REDUCTION_STEPS))
      : undefined,
    isValidRank(peaks.dps)
      ? rankToSR(registered.dps ? peaks.dps : stepsBelow(peaks.dps, OFF_ROLE_REDUCTION_STEPS))
      : undefined,
    isValidRank(peaks.support)
      ? rankToSR(registered.support ? peaks.support : stepsBelow(peaks.support, OFF_ROLE_REDUCTION_STEPS))
      : undefined,
  ].filter((sr): sr is number => sr !== undefined);

  if (contributionSRs.length === 0) return undefined;

  return Math.max(...contributionSRs, rankToSR(BRACKET_FLOOR[bracket]));
}

export interface TeamRankMember {
  memberType: string;
  peakRankTank?: string;
  peakRankDPS?: string;
  peakRankSupport?: string;
  registeredForTank?: boolean;
  registeredForDps?: boolean;
  registeredForSupport?: boolean;
}

export interface TeamRankResult {
  rank: string;
  averageSR: number;
  playerCount: number;
}

// Computes a team's rank from its roster: averages the top 5 (or fewer, if
// the roster doesn't have 5 players with a valid effectiveTeamSR yet) by
// effective SR, then floors that average to a rank label. Returns null if no
// player on the roster has usable data yet.
export function computeTeamRank(members: TeamRankMember[], bracket: Bracket): TeamRankResult | null {
  const contributingSRs = members
    .filter((m) => m.memberType === 'Player')
    .map((m) =>
      effectiveTeamSR(
        { tank: m.peakRankTank, dps: m.peakRankDPS, support: m.peakRankSupport },
        { tank: Boolean(m.registeredForTank), dps: Boolean(m.registeredForDps), support: Boolean(m.registeredForSupport) },
        bracket
      )
    )
    .filter((sr): sr is number => sr !== undefined)
    .sort((a, b) => b - a)
    .slice(0, TOP_PLAYERS_FOR_AVERAGE);

  if (contributingSRs.length === 0) return null;

  const averageSR = contributingSRs.reduce((sum, sr) => sum + sr, 0) / contributingSRs.length;
  return { rank: srToRankFloor(averageSR), averageSR, playerCount: contributingSRs.length };
}
