# SyncTrackr delivery plan

Updated 28 October 2026. Status is based on the repository and the owner's
reported live checks, not on the appearance of the UI. The original v1.6 vision
is a DAW-aware backup, versioning, and assisted restore system. The current
product is a **manual cloud-backup web alpha**. It is not yet the original MVP.

## Where we are against the original phases

| Original phase | Current implementation | Still needed |
| --- | --- | --- |
| 1. Local backup + folder monitor | Manually attach a file or an already-zipped project folder | Local companion, folder permissions, stable-file detection, background monitoring, offline queue |
| 2. Metadata extraction | Manually entered project BPM, key, DAW/version; per-version plugin notes and chain order | Automatic parser for a first supported DAW, missing-asset detection, metadata snapshots per version, MIDI/automation support where feasible |
| 3. Versioning | Saved version records, visible history, downloads, consecutive display labels, stable internal IDs | Complete folder manifests, per-file hashes, changed-file detection, durable retry state, verification of concurrent writes |
| 4. Basic restore | Download attached file/ZIP and use the plugin restore checklist | Tested complete-folder restore with integrity checks, destination/conflict handling, missing-dependency report |
| 5. Cloud sync | Direct R2 uploads, private downloads, storage-first deletion, authenticated size verification | Resumable large-file uploads, offline recovery, safe orphan cleanup, atomic quotas, operational monitoring |
| 6. Paid tiers | UI shows the free 5 GB allowance; upload link checks reported usage | Subscription integration, server-enforced entitlements, retention policy, billing lifecycle tests |
| 7. Collaboration | Not implemented | Sharing/download permissions first; multi-user commits, branches and merging later |

Work has progressed out of phase order: cloud infrastructure and the web UI were
built before the local monitor and DAW reader. A polished web UI is not evidence
that those earlier phases are finished.

## Gate A: private web beta — finish reliability first

The beta would be explicitly limited to manual file/ZIP backups and downloads.
It would not be advertised as automatic project protection.

- [x] Authenticated upload/download/delete endpoints with ownership checks.
- [x] Check R2 object presence and size before the normal UI creates a version.
- [x] Current-tab retry: reuse a confirmed upload and recover an uncertain insert
      with a stable commit UUID. Covered by mocked tests; live acceptance pending.
- [ ] Test the complete flow against disposable live records: upload, failed
      verification, lost insert response, retry, refresh, download, compare bytes,
      delete, and confirm both metadata and file lifecycle.
- [ ] Verify two-account isolation through normal authenticated sessions,
      including direct Supabase requests. Capture a complete baseline schema.
- [ ] Exercise representative large music projects, slow/offline connections,
      expiration of login/upload links, and mobile/desktop browsers.
- [ ] Finish server-side quota/record integrity and orphan handling; add support
      diagnostics and an operational recovery procedure before broader testing.

No new SQL or production credentials are required for current-tab retries.
The later database-enforced save/quota workflow needs a reviewed schema design;
the current RLS permits direct inserts which bypass the frontend verification.

## Gate B: original MVP — local project backup

Choose one operating system and a first DAW to keep the initial scope testable.
The owner's current Windows/Studio One setup is a candidate, not a confirmed
support commitment.

- [ ] Local companion selects and monitors project folders safely.
- [ ] Snapshot every included file with its relative path and content hash.
- [ ] Upload only changed content and keep an offline queue that survives restart.
- [ ] Store version-specific metadata and dependencies for the first DAW.
- [ ] Restore a full snapshot into a new folder and verify all file hashes.
- [ ] Open representative restored projects in the supported DAW; report missing
      plugins/assets without promising cross-DAW or plugin reconstruction.

This is substantial product work, not UI finishing. Do not describe single-file
uploading, a manual ZIP, or a restore checklist as completion of this gate.

## Gate C: public paid release

- [ ] Meet Gates A and B for the advertised support scope.
- [ ] Implement and test subscription activation, renewal/failure/cancellation,
      limits, and upgrade flows.
- [ ] Resolve retention rules. The v1.6 free tier says "last commit only", while
      the alpha currently retains history. Do not silently delete user versions
      to enforce a newly introduced plan rule.
- [ ] Publish clear supported-format, restore, retention, privacy and support
      information; validate account recovery and data export/deletion.
- [ ] Run a private beta with real music workflows and resolve release blockers.

## How to judge readiness

Use demonstrated recovery and the gates above, not a percentage of screens
finished. A small manual web beta is closer than the original desktop MVP.
Remaining local-monitor, snapshot/restore, and DAW-reader work makes the original
MVP a multi-week effort at minimum. A dependable launch date needs a scoped first
platform/DAW and results from the beta acceptance checks. Paid tiers and
collaboration should not displace backup/restore reliability.
