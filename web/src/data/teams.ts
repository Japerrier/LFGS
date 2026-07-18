import type { Team } from './types';

/**
 * Placeholder roster data. Season 8 registration (external Google Form -> staff
 * review -> manual DynamoDB entry) hasn't produced real teams yet, so this stands
 * in for what the read-only Lambda API will eventually return in the same shape.
 */
export const teams: Team[] = [
  {
    id: 'diamond-1',
    slug: 'aurora-vipers',
    name: 'Aurora Vipers',
    bracket: 'Diamond',
    seed: 1,
    initials: 'AV',
    primaryColor: '#7c6cf0',
    secondaryColor: '#3d2f8f',
    record: '0-0',
    coach: 'Coach Nadia',
    manager: 'Manager Reyes',
    players: [
      { id: 'p0', name: 'Player Zero', ign: 'Auro#1000', roles: ['Tank'], captain: true },
      { id: 'p1', name: 'Player One', ign: 'Auro#1137', roles: ['DPS'], captain: false },
      { id: 'p2', name: 'Player Two', ign: 'Auro#1274', roles: ['DPS'], captain: false },
      { id: 'p3', name: 'Player Three', ign: 'Auro#1411', roles: ['Support'], captain: false },
      { id: 'p4', name: 'Player Four', ign: 'Auro#1548', roles: ['Support'], captain: false },
      { id: 'p5', name: 'Player Five', ign: 'Auro#1685', roles: ['Flex'], captain: false },
    ],
    socials: [{ label: 'Twitter / X', url: '#' }],
  },
  {
    id: 'diamond-2',
    slug: 'ironclad',
    name: 'Ironclad',
    bracket: 'Diamond',
    seed: 2,
    initials: 'IRC',
    primaryColor: '#6b8cae',
    secondaryColor: '#2c3e50',
    record: '0-0',
    coach: 'Coach Ferro',
    manager: 'Manager Osei',
    players: [
      { id: 'p0', name: 'Player Zero', ign: 'Iron#1000', roles: ['Tank'], captain: true },
      { id: 'p1', name: 'Player One', ign: 'Iron#1137', roles: ['DPS'], captain: false },
      { id: 'p2', name: 'Player Two', ign: 'Iron#1274', roles: ['DPS'], captain: false },
      { id: 'p3', name: 'Player Three', ign: 'Iron#1411', roles: ['Support'], captain: false },
      { id: 'p4', name: 'Player Four', ign: 'Iron#1548', roles: ['Support'], captain: false },
    ],
    socials: [],
  },
  {
    id: 'diamond-3',
    slug: 'voidwalkers',
    name: 'Voidwalkers',
    bracket: 'Diamond',
    seed: 3,
    initials: 'VW',
    primaryColor: '#9b5de5',
    secondaryColor: '#4a1a6b',
    record: '0-0',
    coach: 'Coach Marlowe',
    manager: 'Manager Priya',
    players: [
      { id: 'p0', name: 'Player Zero', ign: 'Void#1000', roles: ['Tank'], captain: true },
      { id: 'p1', name: 'Player One', ign: 'Void#1137', roles: ['Tank'], captain: false },
      { id: 'p2', name: 'Player Two', ign: 'Void#1274', roles: ['DPS'], captain: false },
      { id: 'p3', name: 'Player Three', ign: 'Void#1411', roles: ['DPS'], captain: false },
      { id: 'p4', name: 'Player Four', ign: 'Void#1548', roles: ['DPS'], captain: false },
      { id: 'p5', name: 'Player Five', ign: 'Void#1685', roles: ['Support'], captain: false },
      { id: 'p6', name: 'Player Six', ign: 'Void#1822', roles: ['Support'], captain: false },
      { id: 'p7', name: 'Player Seven', ign: 'Void#1959', roles: ['Flex'], captain: false },
    ],
    socials: [
      { label: 'Twitter / X', url: '#' },
      { label: 'Twitch', url: '#' },
    ],
  },
  {
    id: 'diamond-4',
    slug: 'nightfall',
    name: 'Nightfall',
    bracket: 'Diamond',
    seed: 4,
    initials: 'NGF',
    primaryColor: '#4361ee',
    secondaryColor: '#1b2a56',
    record: '0-0',
    coach: 'Coach Ilić',
    manager: 'Manager Tran',
    players: [
      { id: 'p0', name: 'Player Zero', ign: 'Nyx#1000', roles: ['Tank'], captain: true },
      { id: 'p1', name: 'Player One', ign: 'Nyx#1137', roles: ['DPS'], captain: false },
      { id: 'p2', name: 'Player Two', ign: 'Nyx#1274', roles: ['DPS'], captain: false },
      { id: 'p3', name: 'Player Three', ign: 'Nyx#1411', roles: ['Support'], captain: false },
      { id: 'p4', name: 'Player Four', ign: 'Nyx#1548', roles: ['Support'], captain: false },
      { id: 'p5', name: 'Player Five', ign: 'Nyx#1685', roles: ['Flex'], captain: false },
    ],
    socials: [],
  },
  {
    id: 'platinum-1',
    slug: 'copperline',
    name: 'Copperline',
    bracket: 'Platinum',
    seed: 1,
    initials: 'CPL',
    primaryColor: '#d9822b',
    secondaryColor: '#7a3e10',
    record: '0-0',
    coach: 'Coach Vance',
    manager: 'Manager Kessler',
    players: [
      { id: 'p0', name: 'Player Zero', ign: 'Cop#1000', roles: ['Tank'], captain: true },
      { id: 'p1', name: 'Player One', ign: 'Cop#1137', roles: ['DPS'], captain: false },
      { id: 'p2', name: 'Player Two', ign: 'Cop#1274', roles: ['DPS'], captain: false },
      { id: 'p3', name: 'Player Three', ign: 'Cop#1411', roles: ['Support'], captain: false },
      { id: 'p4', name: 'Player Four', ign: 'Cop#1548', roles: ['Support'], captain: false },
    ],
    socials: [{ label: 'Twitch', url: '#' }],
  },
  {
    id: 'platinum-2',
    slug: 'duskfire',
    name: 'Duskfire',
    bracket: 'Platinum',
    seed: 2,
    initials: 'DSK',
    primaryColor: '#e0524a',
    secondaryColor: '#6b1f1a',
    record: '0-0',
    coach: 'Coach Amaro',
    manager: 'Manager Wu',
    players: [
      { id: 'p0', name: 'Player Zero', ign: 'Dusk#1000', roles: ['Tank'], captain: true },
      { id: 'p1', name: 'Player One', ign: 'Dusk#1137', roles: ['DPS'], captain: false },
      { id: 'p2', name: 'Player Two', ign: 'Dusk#1274', roles: ['DPS'], captain: false },
      { id: 'p3', name: 'Player Three', ign: 'Dusk#1411', roles: ['Support'], captain: false },
      { id: 'p4', name: 'Player Four', ign: 'Dusk#1548', roles: ['Support'], captain: false },
      { id: 'p5', name: 'Player Five', ign: 'Dusk#1685', roles: ['Flex'], captain: false },
    ],
    socials: [],
  },
];

export function getTeamBySlug(slug: string): Team | undefined {
  return teams.find((t) => t.slug === slug);
}

export function getTeamsByBracket(bracket: Team['bracket']): Team[] {
  return teams.filter((t) => t.bracket === bracket);
}
