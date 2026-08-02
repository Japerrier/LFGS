export type Bracket = 'Diamond' | 'Platinum';

export interface Team {
  teamId: string;
  /** Derived from name at load time — not a stored DynamoDB attribute. */
  slug: string;
  season: number;
  name: string;
  bracket: Bracket;
  logoKey?: string;
}

export type MemberType = 'Player' | 'Head Coach' | 'Assistant Coach';

export interface TeamMember {
  memberId: string;
  teamId: string;
  season: number;
  name: string;
  memberType: MemberType;
  captain?: boolean;
  registeredForTank?: boolean;
  registeredForDps?: boolean;
  registeredForSupport?: boolean;
  profileImageKey?: string;
  smallProfileImageKey?: string;
  seasonScreenshotImageKeys?: string[];
}

export interface KeyDate {
  label: string;
  date: string;
  desc: string;
  status: 'Open' | 'Closed' | 'Upcoming' | 'TBD';
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

export interface HOFPodiumEntry {
  place: '1st' | '2nd' | '3rd';
  team: string;
  bracket: Bracket;
}

export interface HOFSeason {
  season: number;
  podium: HOFPodiumEntry[];
  allStars: HOFAllStar[];
}
