// Display positions reflect the versions currently kept. Stored IDs and counters
// remain unchanged, so file ownership and download/delete targets stay stable.
export function buildVersionLabels(commits) {
  const projects = new Map()
  for (const commit of commits) {
    if (!projects.has(commit.project_id)) projects.set(commit.project_id, [])
    projects.get(commit.project_id).push(commit)
  }
  const labels = new Map()
  for (const versions of projects.values()) {
    versions.sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '') ||
      (a.version_number ?? 0) - (b.version_number ?? 0) ||
      a.id.localeCompare(b.id))
    versions.forEach((commit, index) => labels.set(commit.id, `Version ${index + 1}`))
  }
  return labels
}
