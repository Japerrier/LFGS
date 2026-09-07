export type Bracket = 'Diamond' | 'Emerald';

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
}

export type MemberType = 'Player' | 'Head Coach' | 'Assistant Coach' | 'Manager';

export interface TeamMember {
  memberId: string;
  teamId: string;
  season: number;
  name: string;
  memberType: MemberType;
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

export type KeyDateStatus = 'Open' | 'Closed' | 'Upcoming' | 'TBD';

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
