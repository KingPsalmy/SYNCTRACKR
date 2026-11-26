// Uploads generate ASCII-safe path segments. Validate before constructing a URL:
// URL parsing normalizes dot segments, so a raw owner prefix alone is not enough.
export function isOwnedObjectKey(key, userId) {
  return typeof key === "string" && typeof userId === "string" && Boolean(userId)
    && key.startsWith(`${userId}/`)
    && key.split("/").every(segment => segment !== "." && segment !== ".."
      && /^[a-zA-Z0-9._-]+$/.test(segment))
}

export function objectPath(key) {
  return key.split("/").map(encodeURIComponent).join("/")
}
