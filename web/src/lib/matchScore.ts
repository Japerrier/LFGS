import type { Matchup } from '../data/types';

// A forfeited match is always shown as a 3-0 win for the team that showed up
// (0 for each forfeiting team), regardless of any score stored on the row.
const FORFEIT_WIN_SCORE = 3;

type ScoreFields = Pick<Matchup, 'team1Score' | 'team2Score' | 'team1Forfeit' | 'team2Forfeit'>;

export function resolveScores({ team1Score, team2Score, team1Forfeit, team2Forfeit }: ScoreFields) {
  if (team1Forfeit || team2Forfeit) {
    return {
      team1Score: team1Forfeit ? 0 : FORFEIT_WIN_SCORE,
      team2Score: team2Forfeit ? 0 : FORFEIT_WIN_SCORE,
    };
  }
  return { team1Score, team2Score };
}
