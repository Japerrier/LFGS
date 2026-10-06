export type Bracket = 'Diamond' | 'Emerald';

/** Absent on a team still competing. Set by hand on the Teams row. Display
 *  only: it never changes matchups, results or forfeits (those are recorded
 *  on the Matchups rows). */
export type TeamStatus = 'eliminated' | 'withdrawn' | 'disqualified';

export interface Team {
  teamId: string;
  /** Derived from name at load time — not a stored DynamoDB attribute. */
  slug: string;
  season: number;
  name: string;
  bracket: Bracket;
  logoKey?: string;
  /** Only `true` shows the team on the site — missing/false/null all hide it. */
  approved?: boolean;
  /** Top-5-by-SR roster average, floored to a rank label (e.g. "Emerald 3").
   *  Computed and written by scripts/calculate-team-ranks.mjs — absent until
   *  that's been run for this team, in which case no pillbox is shown. */
  teamRank?: string;
  /** "eliminated" keeps the team in the main standings, below the teams still
   *  in. "withdrawn" and "disqualified" move it to its own standings table
   *  and mark its team page. */
  status?: TeamStatus;
}

export type MemberType = 'Player' | 'Head Coach' | 'Assistant Coach' | 'Manager';

/** Absent (blank) on a member who is neither. Set by hand on the
 *  Team_Members row. */
export type MemberStatus = 'withdrawn' | 'disqualified';

export interface TeamMember {
  memberId: string;
  teamId: string;
  season: number;
  name: string;
  memberType: MemberType;
  status?: MemberStatus;
  /** Only checked for memberType "Player" — only `true` shows a player.
   *  Coaches/managers are exempt from this check and can leave it unset. */
  approved?: boolean;
  captain?: boolean;
  registeredForTank?: boolean;
  registeredForDps?: boolean;
  registeredForSupport?: boolean;
  /** Peak competitive rank per role (e.g. "Platinum 3"), staff-entered.
   *  Blank means "hasn't placed in this role" and is simply left out of the
   *  displayed rank / team-average calculation — see displayRank in
   *  web/src/lib/rank.ts. A malformed value (anything set but not a real
   *  rank string) hides the player's rank entirely instead of guessing. */
  peakRankTank?: string;
  peakRankDPS?: string;
  peakRankSupport?: string;
  profileImageKey?: string;
  smallProfileImageKey?: string;
  seasonScreenshotImageKeys?: string[];
}

export interface Matchup {
  matchId: string;
  season: number;
  week: number;
  bracket: Bracket;
  /** Diamond's regular season is split into two round-robin groups; Emerald has none.
   *  Playoff matchups have no group (all teams are seeded together). */
  group?: 'A' | 'B';
  /** True for a playoff matchup (or a playoff bye). Playoff rows show on both
   *  the matchups tab (as the next week) and the playoffs tab, but never count
   *  toward the regular-season standings. `week` keeps counting on from the
   *  regular season. */
  playoff?: boolean;
  team1: Team;
  /** Absent on a bye week, where team1 simply doesn't play that week. */
  team2?: Team;
  /** True when team1 has a bye week: no opponent, no result, and the row is
   *  ignored by standings and match history. */
  byeWeek?: boolean;
  /** Eastern wall-clock timestamp ('YYYY-MM-DDTHH:mm:ss') this match is scheduled
   *  for — same convention as KeyDate.activeAt. Omit until a time is confirmed. */
  matchTime?: string;
  /** Maps won by each side. Both are added after the match is played and are
   *  omitted until then. */
  team1Score?: number;
  team2Score?: number;
  /** Names of the maps that were played, in order. Omitted until played. */
  maps?: string[];
  /** Whether each side forfeited the match. Either, both or neither can be
   *  true; omitted is treated as false. */
  team1Forfeit?: boolean;
  team2Forfeit?: boolean;
}

export type KeyDateStatus = 'Open' | 'Closed' | 'Upcoming' | 'TBD' | 'In Progress';

export interface KeyDate {
  label: string;
  date: string;
  desc: string;
  /** Build-time fallback, and what's shown if JS never runs. Kept in sync
   *  manually — the client re-derives the real status from activeAt on load. */
  status: KeyDateStatus;
  /** America/New_York wall-clock timestamp ('YYYY-MM-DDTHH:mm:ss') this
   *  entry becomes active at. Omit for entries with no real date (e.g. TBD). */
  activeAt?: string;
  /** Status to show once "now" (in America/New_York) reaches activeAt. */
  statusOnceActive?: KeyDateStatus;
  /** Force the gold "currently active" pill styling regardless of what
   *  `status` says — for rows where gold means "this is the live state of
   *  the thing" rather than literally "Open" (e.g. Registration Closes
   *  should read gold, not the usual gray Closed, while it's the current
   *  reality). Omit for rows that should just use the normal status color. */
  highlight?: boolean;
}

export interface LeadershipMember {
  name: string;
  role: string;
  photo: string;
}

export interface HOFAllStar {
  category: string;
  name: string;
}

export interface HOFPodiumPlayer {
  name: string;
  captain?: boolean;
  roles: string[];
}

export interface HOFPodiumEntry {
  place: '1st' | '2nd' | '3rd';
  team: string;
  bracket: Bracket;
  logoKey?: string;
  players?: HOFPodiumPlayer[];
}

export interface HOFSeason {
  season: number;
  podium: HOFPodiumEntry[];
  allStars: HOFAllStar[];
}
