export type Bracket = 'Diamond' | 'Platinum';

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
