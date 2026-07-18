import type { HOFSeason, KeyDate, LeadershipMember } from './types';

export const externalLinks = {
  discord: 'https://discord.gg/lfgs',
  twitch: 'https://www.twitch.tv/lookingforgoldscrims',
  youtube: 'https://www.youtube.com/@lfgs7475',
};

export const keyDates: KeyDate[] = [
  {
    label: 'Registration Opens',
    date: 'Sat, Jul 11, 2026',
    desc: 'Team sign-ups begin for Diamond & Platinum',
    status: 'Open',
  },
  {
    label: 'Registration Closes',
    date: 'Sun, Aug 9, 2026 · 11:59 PM EST',
    desc: 'Last chance to lock in a roster',
    status: 'Deadline',
  },
  {
    label: 'Regular Season Begins',
    date: 'Mon, Aug 17, 2026',
    desc: 'Swiss-format season, 1 official match per week',
    status: 'Upcoming',
  },
  {
    label: 'Playoffs',
    date: 'TBD by team count',
    desc: 'Double-elimination semifinals & grand final',
    status: 'TBD',
  },
];

export const leadership: LeadershipMember[] = [
  { name: 'Owner Name', role: 'Owner' },
  { name: 'Co-Owner Name', role: 'Co-Owner' },
  { name: 'Mod Name 1', role: 'Moderator' },
  { name: 'Mod Name 2', role: 'Moderator' },
  { name: 'Mod Name 3', role: 'Moderator' },
  { name: 'Staff Name 1', role: 'Staff' },
  { name: 'Staff Name 2', role: 'Staff' },
  { name: 'Staff Name 3', role: 'Staff' },
];

export const rulebookHighlights: string[] = [
  'Swiss-format regular season, 1 official Bo3 (first-to-3) match per team per week',
  "Teams capped at 8 players; coaches & managers don't count toward the cap",
  'Team skill-tier average capped at Diamond 3 (Diamond bracket) / Platinum 3 (Platinum bracket)',
  '2 hero bans per map, sequential by role; picks/bans/roster lock each have a 90-second clock',
  'Playoffs are double-elimination: semifinals into a grand final',
  '5 pauses per match, 3 minutes each; one 5-minute bio break after map 2',
  'Match results posted in #S8-results; disputes go to LFGS staff',
];

export const prizePool = [
  { place: '1st Place', amount: '6,000 OW Coins', note: '+ 1,000 to head coach' },
  { place: '2nd Place', amount: '4,000 OW Coins' },
  { place: '3rd Place', amount: '2,000 OW Coins' },
];

export const hofSeasons: HOFSeason[] = [8, 7, 6, 5, 4, 3].map((season) => ({
  season,
  podium: [
    { place: '1st', team: `TBD Champion S${season}`, bracket: 'Diamond' },
    { place: '2nd', team: `TBD Runner-up S${season}`, bracket: 'Diamond' },
    { place: '3rd', team: `TBD 3rd Place S${season}`, bracket: 'Diamond' },
  ],
  allStars:
    season === 7 || season === 8
      ? [
          { category: 'Overall', name: 'TBD Player' },
          { category: 'Tank', name: 'TBD Player' },
          { category: 'DPS', name: 'TBD Player' },
          { category: 'Support', name: 'TBD Player' },
        ]
      : [],
}));
