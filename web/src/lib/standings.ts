import type { Matchup, Team } from '../data/types';
import { resolveScores } from './matchScore';

export interface StandingsRow {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  mapWins: number;
  mapLosses: number;
  /** Map differential: map wins minus map losses. */
  mapDiff: number;
  /** Competition-style rank (1, 2, 2, 4). */
  rank: number;
  /** True when every automatic tiebreaker still leaves this team level with
   *  another one — the rulebook's last resort is a staff-run best-of-3. */
  tied: boolean;
}

interface Result {
  teamAId: string;
  teamBId: string;
  teamAScore: number;
  teamBScore: number;
}

type Totals = Map<string, { played: number; wins: number; mapWins: number; mapLosses: number }>;

// Ranks one group's teams per the rulebook's Tiebreaker section, in order:
//   1. match wins  2. map wins  3. map differential  4. head-to-head
// A 5th tiebreaker (a best-of-3) is played by staff, so teams still level
// after step 4 share a rank and are flagged `tied`.
//
// A forfeited match counts as a 3-0 win (see resolveScores), and a match with
// no winner (both teams forfeited) counts as a loss for both. Matches without
// a result yet are ignored.
export function computeStandings(matchups: Matchup[]): StandingsRow[] {
  const teams = new Map<string, Team>();
  const results: Result[] = [];
  for (const m of matchups) {
    teams.set(m.team1.teamId, m.team1);
    teams.set(m.team2.teamId, m.team2);
    const { team1Score, team2Score } = resolveScores(m);
    if (team1Score === undefined || team2Score === undefined) continue;
    results.push({ teamAId: m.team1.teamId, teamBId: m.team2.teamId, teamAScore: team1Score, teamBScore: team2Score });
  }

  const totals: Totals = new Map([...teams.keys()].map((id) => [id, { played: 0, wins: 0, mapWins: 0, mapLosses: 0 }]));
  for (const r of results) {
    const a = totals.get(r.teamAId)!;
    const b = totals.get(r.teamBId)!;
    a.played++;
    b.played++;
    a.mapWins += r.teamAScore;
    a.mapLosses += r.teamBScore;
    b.mapWins += r.teamBScore;
    b.mapLosses += r.teamAScore;
    if (r.teamAScore > r.teamBScore) a.wins++;
    else if (r.teamBScore > r.teamAScore) b.wins++;
  }

  // Each criterion scores every team in the tied group; higher is better.
  const criteria: ((group: string[]) => Map<string, number>)[] = [
    (group) => new Map(group.map((id) => [id, totals.get(id)!.wins])),
    (group) => new Map(group.map((id) => [id, totals.get(id)!.mapWins])),
    (group) => new Map(group.map((id) => [id, totals.get(id)!.mapWins - totals.get(id)!.mapLosses])),
    (group) => {
      // Only matches between the tied teams count — recomputed for each
      // (sub)group, since a smaller group may have a clearer head-to-head.
      const wins = new Map(group.map((id) => [id, 0]));
      for (const r of results) {
        if (!wins.has(r.teamAId) || !wins.has(r.teamBId)) continue;
        if (r.teamAScore > r.teamBScore) wins.set(r.teamAId, wins.get(r.teamAId)! + 1);
        else if (r.teamBScore > r.teamAScore) wins.set(r.teamBId, wins.get(r.teamBId)! + 1);
      }
      return wins;
    },
  ];

  // Splits a tied group with the first criterion that separates it, then
  // restarts on each piece. Returns tiers best-first; a tier of 2+ is a tie
  // no criterion could break.
  function resolve(group: string[]): string[][] {
    if (group.length < 2) return [group];
    for (const criterion of criteria) {
      const scores = criterion(group);
      const distinct = [...new Set(scores.values())].sort((x, y) => y - x);
      if (distinct.length > 1) {
        return distinct.flatMap((score) => resolve(group.filter((id) => scores.get(id) === score)));
      }
    }
    return [group];
  }

  const rows: StandingsRow[] = [];
  let placed = 0;
  for (const tier of resolve([...teams.keys()])) {
    // Teams level after every tiebreaker are listed alphabetically.
    const ordered = [...tier].sort((x, y) => teams.get(x)!.name.localeCompare(teams.get(y)!.name));
    for (const id of ordered) {
      const t = totals.get(id)!;
      rows.push({
        team: teams.get(id)!,
        played: t.played,
        wins: t.wins,
        losses: t.played - t.wins,
        mapWins: t.mapWins,
        mapLosses: t.mapLosses,
        mapDiff: t.mapWins - t.mapLosses,
        rank: placed + 1,
        tied: tier.length > 1,
      });
    }
    placed += tier.length;
  }
  return rows;
}
