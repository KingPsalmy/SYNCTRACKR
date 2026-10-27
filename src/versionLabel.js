// A version number is assigned by the database, never by its position in a list.
// Older rows may not have one until the numbering migration is verified/applied.
export function versionLabel(commit) {
  return Number.isSafeInteger(commit.version_number) && commit.version_number >= 0
    ? `Version ${commit.version_number}`
    : 'Saved version'
}
