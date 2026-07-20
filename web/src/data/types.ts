export type Bracket = 'Diamond' | 'Platinum';

export interface Player {
  id: string;
  name: string;
  ign: string;
  roles: string[];
  captain: boolean;
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  bracket: Bracket;
  seed: number;
  initials: string;
  primaryColor: string;
  secondaryColor: string;
  /** Live-ish field: expected to be re-fetched/revalidated from the API rather than trusted from the static build. */
  record: string;
  coach: string;
  manager: string;
  players: Player[];
  socials: SocialLink[];
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
