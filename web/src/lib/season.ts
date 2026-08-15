// TODO: replace with a DynamoDB-driven value once the season-rollover admin
// tooling exists. Flipping this triggers a rebuild via the same DynamoDB
// Streams -> GitHub Actions pipeline as any other data change once that's wired up.
export const CURRENT_SEASON = 8;

// Flip to true once CURRENT_SEASON's bracket play has finished and results
// are final (same manual-bump-until-DynamoDB story as CURRENT_SEASON above).
// Drives LATEST_COMPLETE_SEASON: while the current season is still in
// progress, "most recently completed" means the one before it.
export const CURRENT_SEASON_COMPLETE = false;

export const LATEST_COMPLETE_SEASON = CURRENT_SEASON_COMPLETE ? CURRENT_SEASON : CURRENT_SEASON - 1;
