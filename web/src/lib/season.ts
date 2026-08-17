// TODO: replace with a DynamoDB-driven value once the season-rollover admin
// tooling exists. Flipping this triggers a rebuild via the same DynamoDB
// Streams -> GitHub Actions pipeline as any other data change once that's wired up.
export const CURRENT_LFGS_SEASON = 8;

// Flip to true once CURRENT_LFGS_SEASON's bracket play has finished and results
// are final (same manual-bump-until-DynamoDB story as CURRENT_LFGS_SEASON above).
// Drives LATEST_COMPLETE_SEASON: while the current season is still in
// progress, "most recently completed" means the one before it.
export const CURRENT_LFGS_SEASON_COMPLETE = false;

export const LATEST_COMPLETE_SEASON = CURRENT_LFGS_SEASON_COMPLETE ? CURRENT_LFGS_SEASON : CURRENT_LFGS_SEASON - 1;

// Overwatch's own competitive season — unrelated to CURRENT_LFGS_SEASON
// above. Blizzard restarted their season numbering under a "YYYY: Season N"
// convention in 2026, so a bare number is ambiguous: this year's Season 4
// is a different season than the old-convention Season 4 from a couple of
// years back. Keeping year and number separate lets CURRENT_OW_SEASON_NUMBER
// stay usable in slot arithmetic (S4, S3, S2, ...) while owSeasonLabel()
// keeps the year attached anywhere the value is shown to a user. Bump both
// together each time a new OW season starts.
export const CURRENT_OW_SEASON_YEAR = 2026;
export const CURRENT_OW_SEASON_NUMBER = 4;

export function owSeasonLabel(seasonNumber: number, year = CURRENT_OW_SEASON_YEAR): string {
  return `${year}: Season ${seasonNumber}`;
}
