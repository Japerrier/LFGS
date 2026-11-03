import { getTeamsBySeason } from './teams';
import { getMembersByTeamId, memberRoles } from './team-members';
import { REGISTRATION_OPEN } from '../lib/season';
import type { Bracket, HOFAllStar, HOFPodiumEntry, HOFSeason, KeyDate, LeadershipMember, TeamMember } from './types';

export const externalLinks = {
  discord: 'https://discord.gg/lfgs',
  twitch: 'https://www.twitch.tv/lookingforgoldscrims',
  youtube: 'https://www.youtube.com/@lfgs7475',
};

// Rows with activeAt get their pill purely from the dates (see lib/key-dates.ts):
// each phase runs until the next dated row starts. Rows without one use
// status/highlight, which here follow the REGISTRATION_OPEN flag.
export const keyDates: KeyDate[] = [
  {
    label: 'Registration Opens',
    date: 'Sat, Jul 11, 2026',
    desc: 'Team sign-ups begin for Emerald & Diamond',
    // Text always reads 'Open' — this row describes the date registration
    // opened, not whether it's still open. Driven off REGISTRATION_OPEN
    // (lib/season.ts) instead of an activeAt date — sign-ups close on a
    // staff decision, not a fixed clock, so no client-side re-derivation here.
    status: 'Open',
    // Gold only while registration is actually open — once closed, this
    // row is history and Registration Closes below becomes the highlighted
    // one. The pill dims to grey (see schedule.astro) without changing its text.
    highlight: REGISTRATION_OPEN,
  },
  {
    label: 'Registration Closes',
    date: 'Sun, Sep 6, 2026 · 11:59 PM EST',
    desc: 'Last chance to lock in a roster',
    status: REGISTRATION_OPEN ? 'Upcoming' : 'Closed',
    highlight: false,
  },
  {
    label: 'Regular Season Begins',
    date: 'Mon, Sep 14, 2026',
    desc: 'Round robin season — 1 official match per week',
    activeAt: '2026-09-14T00:00:00',
  },
  {
    label: 'Playoffs Begin',
    date: 'Mon, Oct 5, 2026',
    desc: 'Diamond: top 4 double-elimination (seeds 2 & 3 play-in first). Emerald: 3-team round robin, then semifinal and grand final',
    activeAt: '2026-10-05T00:00:00',
  },
];

export const leadership: LeadershipMember[] = [
  { name: 'Archer Centauri', role: 'Owner', photo: '/images/lfgs-leadership/archer-centauri.png' },
  { name: 'MightyOwl', role: 'Co-Owner', photo: '/images/lfgs-leadership/mightyowl.png' },
  { name: 'CajunWiseguy', role: 'Moderator', photo: '/images/lfgs-leadership/cajunwiseguy.png' },
  { name: 'Critic', role: 'Moderator', photo: '/images/lfgs-leadership/critic.png' },
  { name: 'PSI', role: 'Moderator', photo: '/images/lfgs-leadership/psi.png' },
  { name: 'Keegsmonswag', role: 'Staff', photo: '/images/lfgs-leadership/keegsmonswag.png' },
  { name: 'LadyQc', role: 'Staff', photo: '/images/lfgs-leadership/ladyqc.png' },
  { name: 'Xelemental', role: 'Staff', photo: '/images/lfgs-leadership/xelemental.png' },
  { name: 'Matt King 1993', role: 'Staff', photo: '/images/lfgs-leadership/matt-king-1993.png' },
  { name: 'Vosik', role: 'Staff', photo: '/images/lfgs-leadership/vosik.png' },
];

interface PrizePoolEntry {
  place: string;
  amount: string;
  note?: string;
}

export const prizePool: PrizePoolEntry[] = [
  { place: '1st Place', amount: '6,000 OW Coins per player', note: '+ 1,000 to head coach' },
  { place: '2nd Place', amount: '4,000 OW Coins per player' },
  { place: '3rd Place', amount: '2,000 OW Coins per player' },
];

function bracketPodium(season: number, bracket: 'Diamond' | 'Emerald'): HOFPodiumEntry[] {
  // Season 8 is the first to run both brackets, so its placeholders name the bracket to
  // tell the two podiums apart; earlier seasons only ever had one bracket, so it's omitted.
  const label = season === 8 ? `${bracket} ` : '';
  return [
    { place: '1st', team: `TBD ${label}Champion S${season}`, bracket },
    { place: '2nd', team: `TBD ${label}Runner-up S${season}`, bracket },
    { place: '3rd', team: `TBD ${label}3rd Place S${season}`, bracket },
  ];
}

type Placement = { place: '1st' | '2nd' | '3rd'; teamName: string; bracket: Bracket };

// Which team placed where isn't stored anywhere in DynamoDB — it's a fact
// about the season's outcome, not a team/roster attribute — so it stays
// here. Logo and roster for each team come from DynamoDB/S3 live (see
// buildPodium below) rather than being duplicated in this file.
const season7Placements: Placement[] = [
  { place: '1st', teamName: 'DAWGS', bracket: 'Diamond' },
  { place: '2nd', teamName: 'Prune Juice Predators', bracket: 'Diamond' },
  { place: '3rd', teamName: 'Imperium', bracket: 'Diamond' },
];

// Season 8 is still in its Grand Finals, so only 3rd place is known so far
// (Diamond: lower bracket final loser; Emerald: semifinal loser). 1st/2nd stay
// as TBD placeholders until they're added here.
const season8Placements: Placement[] = [
  { place: '3rd', teamName: 'Mc Pengu Cowboys', bracket: 'Diamond' },
  { place: '3rd', teamName: 'Trick Room', bracket: 'Emerald' },
];

async function buildPodium(season: number, placements: Placement[]): Promise<HOFPodiumEntry[]> {
  const teams = await getTeamsBySeason(season);
  const entries: HOFPodiumEntry[] = [];

  for (const placement of placements) {
    const team = teams.find((t) => t.name === placement.teamName);
    const entry: HOFPodiumEntry = { place: placement.place, team: placement.teamName, bracket: placement.bracket };
    if (!team) {
      entries.push(entry);
      continue;
    }

    if (team.logoKey) entry.logoKey = team.logoKey;

    const members = await getMembersByTeamId(team.teamId);
    const headCoach = members.find((m) => m.memberType === 'Head Coach');
    const assistantCoach = members.find((m) => m.memberType === 'Assistant Coach');
    const captain = members.find((m) => m.memberType === 'Player' && m.captain);
    const others = members.filter((m) => m.memberType === 'Player' && !m.captain);
    const ordered = [headCoach, assistantCoach, captain, ...others].filter((m): m is TeamMember => Boolean(m));
    if (ordered.length > 0) {
      entry.players = ordered.map((m) => ({
        name: m.name,
        captain: Boolean(m.captain),
        // Coaches don't have tank/dps/support flags — show their coaching
        // title as the pill instead, same treatment as player roles.
        roles: m.memberType === 'Player' ? memberRoles(m) : [m.memberType],
      }));
    }

    entries.push(entry);
  }

  return entries;
}

const season7Podium = await buildPodium(7, season7Placements);

// Known Season 8 results slot into the TBD placeholders by bracket and place.
const season8Results = await buildPodium(8, season8Placements);
const season8Podium = (['Diamond', 'Emerald'] as const).flatMap((bracket) =>
  bracketPodium(8, bracket).map(
    (placeholder) => season8Results.find((r) => r.bracket === bracket && r.place === placeholder.place) ?? placeholder,
  ),
);

// Recorded results for past seasons. Season 3's record only survived for the 1st place
// finisher — 2nd/3rd weren't tracked. Seasons without an entry here fall back to TBD
// placeholders.
const historicalPodiums: Record<number, HOFPodiumEntry[]> = {
  8: season8Podium,
  7: season7Podium,
  6: [
    { place: '1st', team: 'Fireside Fireflies', bracket: 'Diamond' },
    { place: '2nd', team: 'Last Disaster Final Stand', bracket: 'Diamond' },
    { place: '3rd', team: 'Rebranded', bracket: 'Diamond' },
  ],
  5: [
    { place: '1st', team: 'Fusion Academy', bracket: 'Diamond' },
    { place: '2nd', team: 'OMG eSports: Americano', bracket: 'Diamond' },
    { place: '3rd', team: 'Hello Kitties', bracket: 'Diamond' },
  ],
  4: [
    { place: '1st', team: 'Aimless eSports', bracket: 'Diamond' },
    { place: '2nd', team: 'UKN Fantasia', bracket: 'Diamond' },
    { place: '3rd', team: 'Kevin Fan Club', bracket: 'Diamond' },
  ],
  3: [{ place: '1st', team: 'Topaz Titans', bracket: 'Diamond' }],
};

const tbdAllStars = (bracket: Bracket): HOFAllStar[] =>
  ['Overall', 'Tank', 'DPS', 'Support'].map((category) => ({ category, name: 'TBD Player', bracket }));

const historicalAllStars: Record<number, HOFAllStar[]> = {
  7: [
    { category: 'Overall', name: 'Sunline' },
    { category: 'Tank', name: 'Magoo' },
    { category: 'DPS', name: 'Omega Doggo' },
    { category: 'Support', name: 'Seer' },
  ],
};

export const hofSeasons: HOFSeason[] = [8, 7, 6, 5, 4, 3].map((season) => ({
  season,
  podium: historicalPodiums[season] ?? bracketPodium(season, 'Diamond'),
  allStars:
    historicalAllStars[season] ??
    (season === 8 ? (['Emerald', 'Diamond'] as const).flatMap((bracket) => tbdAllStars(bracket)) : []),
}));

export function getHofSeason(season: number): HOFSeason | undefined {
  return hofSeasons.find((s) => s.season === season);
}
