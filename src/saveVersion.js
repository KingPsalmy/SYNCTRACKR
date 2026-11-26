export function createSaveAttempt({ userId, projectId, message, file }, id = crypto.randomUUID()) {
  return {
    id, userId, projectId, message: message.trim(), file,
    uploadState: {}, payload: null, insertStarted: false,
  }
}

function checkedRecord(attempt, record) {
  const payload = attempt.payload
  if (!payload || record.id !== attempt.id || record.user_id !== attempt.userId
    || record.project_id !== attempt.projectId || record.message !== payload.message
    || record.file_url !== payload.file_url || record.file_name !== payload.file_name
    || record.file_size !== payload.file_size) {
    throw new Error("The saved version does not match this draft. Refresh your history before trying again.")
  }
  return record
}

export async function findSavedAttempt(attempt, { findCommit, assertAccount }) {
  assertAccount()
  if (!attempt.insertStarted) return null
  const record = await findCommit(attempt.id)
  assertAccount()
  return record ? checkedRecord(attempt, record) : null
}

export async function saveVersion(attempt, services) {
  const { upload, insertCommit, assertAccount, onProgress } = services
  // A previous insert may have succeeded while its response was lost. Check
  // first; the same primary key also protects against a still-running insert.
  const existing = await findSavedAttempt(attempt, services)
  if (existing) return existing
  assertAccount()
  const uploaded = attempt.file ? await upload(attempt, onProgress) : null
  assertAccount()
  onProgress?.(null)
  attempt.payload = {
    id: attempt.id, user_id: attempt.userId, project_id: attempt.projectId,
    message: attempt.message, file_url: uploaded?.key || null,
    file_name: uploaded?.name || null, file_size: uploaded?.size ?? null,
  }
  attempt.insertStarted = true
  try {
    const record = await insertCommit(attempt.payload)
    assertAccount()
    return checkedRecord(attempt, record)
  } catch (error) {
    // Never upsert: a retry must not overwrite a version or its plugin notes.
    const recovered = await findSavedAttempt(attempt, services)
    if (recovered) return recovered
    throw error
  }
}
