import { getTeamsBySeason } from './teams';
import { getMembersByTeamId, memberRoles } from './team-members';
import type { Bracket, HOFAllStar, HOFPodiumEntry, HOFSeason, KeyDate, LeadershipMember, TeamMember } from './types';

export const externalLinks = {
  discord: 'https://discord.gg/lfgs',
  twitch: 'https://www.twitch.tv/lookingforgoldscrims',
  youtube: 'https://www.youtube.com/@lfgs7475',
};

// status/date are the build-time fallback; activeAt/statusOnceActive drive the
// real client-side comparison against "now" in America/New_York (see the
// schedule page's script). Keep status roughly in sync with what activeAt
// implies as of whenever this file is edited, so there's no flash of wrong
// content before the client script corrects it on load.
export const keyDates: KeyDate[] = [
  {
    label: 'Registration Opens',
    date: 'Sat, Jul 11, 2026',
    desc: 'Team sign-ups begin for Diamond & Platinum',
    status: 'Open',
    activeAt: '2026-07-11T00:00:00',
    statusOnceActive: 'Open',
  },
  {
    label: 'Registration Closes',
    date: 'Sun, Sep 6, 2026 · 11:59 PM EST',
    desc: 'Last chance to lock in a roster',
    status: 'Closed',
    activeAt: '2026-09-06T23:59:00',
    statusOnceActive: 'Closed',
  },
  {
    label: 'Regular Season Begins',
    date: 'Mon, Sep 14, 2026',
    desc: 'Swiss-format season, 1 official match per week',
    status: 'Upcoming',
    activeAt: '2026-09-14T00:00:00',
    // No great single word for "the season is now underway" in this status
    // set — Closed is standing in for "this date has passed." Easy one-line
    // change if you'd rather it say something else once Sep 14 arrives.
    statusOnceActive: 'Closed',
  },
  {
    label: 'Playoffs',
    date: 'TBD by team count',
    desc: 'Single-elimination Final 8, quarterfinals through grand final',
    status: 'TBD',
    // No real date to compare against — always TBD, no activeAt needed.
    // TODO: Add Playoffs start date once registration closes and we know how many teams are in each bracket.
  },
];

export const leadership: LeadershipMember[] = [
  { name: 'Archer Centauri', role: 'Owner', photo: '/images/lfgs-leadership/archer-centauri.png' },
  { name: 'MightyOwl', role: 'Co-Owner', photo: '/images/lfgs-leadership/mightyowl.png' },
  { name: 'CajunWiseguy', role: 'Moderator', photo: '/images/lfgs-leadership/cajunwiseguy.png' },
  { name: 'Critic', role: 'Moderator', photo: '/images/lfgs-leadership/critic.png' },
  { name: 'PSI', role: 'Staff', photo: '/images/lfgs-leadership/psi.png' },
  { name: 'Keegsmonswag', role: 'Staff', photo: '/images/lfgs-leadership/keegsmonswag.png' },
  { name: 'LadyQc', role: 'Staff', photo: '/images/lfgs-leadership/ladyqc.png' },
  { name: 'Xelemental', role: 'Staff', photo: '/images/lfgs-leadership/xelemental.png' },
  { name: 'Matt King 1993', role: 'Staff', photo: '/images/lfgs-leadership/matt-king-1993.png' },
  { name: 'Vosik', role: 'Staff', photo: '/images/lfgs-leadership/vosik.png' },
];

export const rulebookHighlights: string[] = [
  'Swiss-format regular season, 1 official Bo3 (first-to-3) match per team per week',
  "Teams capped at 8 players; coaches & managers don't count toward the cap",
  'Team skill-tier average capped at Diamond 3 (Diamond bracket) / Platinum 3 (Platinum bracket)',
  '2 hero bans per map, sequential by role; picks/bans/roster lock each have a 90-second clock',
  'Playoffs are single-elimination: 8-team quarterfinals through a grand final',
  '5 pauses per match, 3 minutes each; one 5-minute bio break after map 2',
  'Match results posted in #S8-results; disputes go to LFGS staff',
];

interface PrizePoolEntry {
  place: string;
  amount: string;
  note?: string;
}

export const prizePool: PrizePoolEntry[] = [
  { place: '1st Place', amount: '6,000 OW Coins', note: '+ 1,000 to head coach' },
  { place: '2nd Place', amount: '4,000 OW Coins' },
  { place: '3rd Place', amount: '2,000 OW Coins' },
];

function bracketPodium(season: number, bracket: 'Diamond' | 'Platinum'): HOFPodiumEntry[] {
  // Season 8 is the first to run both brackets, so its placeholders name the bracket to
  // tell the two podiums apart; earlier seasons only ever had one bracket, so it's omitted.
  const label = season === 8 ? `${bracket} ` : '';
  return [
    { place: '1st', team: `TBD ${label}Champion S${season}`, bracket },
    { place: '2nd', team: `TBD ${label}Runner-up S${season}`, bracket },
    { place: '3rd', team: `TBD ${label}3rd Place S${season}`, bracket },
  ];
}

// Which team placed where isn't stored anywhere in DynamoDB — it's a fact
// about the season's outcome, not a team/roster attribute — so it stays
// here. Logo and roster for each team come from DynamoDB/S3 live (see
// buildSeason7Podium below) rather than being duplicated in this file.
const season7Placements: { place: '1st' | '2nd' | '3rd'; teamName: string; bracket: Bracket }[] = [
  { place: '1st', teamName: 'DAWGS', bracket: 'Diamond' },
  { place: '2nd', teamName: 'Prune Juice Predators', bracket: 'Diamond' },
  { place: '3rd', teamName: 'Imperium', bracket: 'Diamond' },
];

async function buildSeason7Podium(): Promise<HOFPodiumEntry[]> {
  const teams = await getTeamsBySeason(7);
  const entries: HOFPodiumEntry[] = [];

  for (const placement of season7Placements) {
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

const season7Podium = await buildSeason7Podium();

// Recorded results for past seasons. Season 3's record only survived for the 1st place
// finisher — 2nd/3rd weren't tracked. Seasons without an entry here (i.e. Season 8, not yet
// played) fall back to TBD placeholders.
const historicalPodiums: Record<number, HOFPodiumEntry[]> = {
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

const tbdAllStars: HOFAllStar[] = [
  { category: 'Overall', name: 'TBD Player' },
  { category: 'Tank', name: 'TBD Player' },
  { category: 'DPS', name: 'TBD Player' },
  { category: 'Support', name: 'TBD Player' },
];

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
  podium:
    historicalPodiums[season] ??
    (season === 8
      ? [...bracketPodium(season, 'Diamond'), ...bracketPodium(season, 'Platinum')]
      : bracketPodium(season, 'Diamond')),
  allStars: historicalAllStars[season] ?? (season === 8 ? tbdAllStars : []),
}));

export function getHofSeason(season: number): HOFSeason | undefined {
  return hofSeasons.find((s) => s.season === season);
}
