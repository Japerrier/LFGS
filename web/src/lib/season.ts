// TODO: replace with a DynamoDB-driven value once the season-rollover admin
// tooling exists. Flipping this triggers a rebuild via the same DynamoDB
// Streams -> GitHub Actions pipeline as any other data change once that's wired up.
export const CURRENT_SEASON = 8;
