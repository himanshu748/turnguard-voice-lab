# Verification record — reconstructed build

Date: **2026-10-01**. See [recovery provenance](RECOVERY.md). Earlier results and hashes are not represented as recovery evidence.

## Freshly passed

`node scripts/check.mjs` checks JavaScript syntax, duplicate DOM IDs, presenter ID references, local linked assets, then runs the whole test suite.

**48 tests passed, 0 failed, 0 skipped, 0 cancelled** on reconstructed source:
- Lifecycle, interruption and stale output rejection; warning continuation; fatal cleanup; parser recovery; exact missing-final deadline
- Duplicate chunks, immutable snapshots, monotonic time, prototype-like identifiers and tick subdivision
- 120 seeds / 14,400 generated transitions plus terminal drains
- All 24 orderings of four same-time cancellation events
- Every scenario's expected outcome and deterministic seek
- Presenter interactions, filtering, reset, timer cleanup, replay inspector clearing and pagehide pause recovery
- Real loopback HTTP requests for assets, content types, HEAD, hidden-file denial, unknown files and mutation-method denial

The presenter uses a deliberately small DOM test double. It does not prove browser layout, focus order, assistive technology or actual file downloads.

## Source-inspected

Responsive grids and phone selector; native labeled controls; skip link; visible focus; non-color labels; reduced-motion CSS; no autoplay. Dynamic payloads use textContent. No runtime fetch, WebSocket, microphone, audio engine, remote asset or vendor SDK. CSP denies outgoing app connections.

## Not verified

The original environment blocked cloud-browser localhost navigation with ERR_BLOCKED_BY_CLIENT and local Chromium launch with a socket permission error. No bypass was attempted. Browser rendering has not been verified for this reconstruction. Desktop/mobile screenshots, console health, real keyboard focus, downloads and screen-reader behavior remain unverified.

## Independent review of reconstructed source

A fresh independent source/behavior review completed on **2026-10-01** with no fixes needed. It reran all 48 tests and independently checked:

- All seven critical timelines: cancellation at 1,100 ms, stale-frame rejection, final/input closure versus playback drain, warning continuation, fatal cleanup, malformed-frame handling and the 3,000 ms application deadline
- All 14 scenario/policy combinations through completion/replay, pagehide, visibility changes, resume and reset
- Both previously reported presenter defects remain fixed: replay clears future inspection; pagehide preserves a coherent paused UI
- Malformed URL hashes stay bounded
- No runtime network/audio calls, remote assets or HTML injection sinks

Reviewed source SHA-256:
- app.mjs: `1f435b46a1e7f706ae62867da1e2859951bfb68de43585b16d135dfaf37a98bd`
- core.mjs: `478ac0611c211fc692d14aab84e35764cb9aad39d140a3aaf6bffc4879138d63`

This review applies to the reconstructed source at these hashes. It does not recover or certify the lost original archive and does not include rendered browser, focus, download or assistive-technology QA.

## Remaining release checks

1. Start the local server in an environment with ordinary browser access
2. Run the optional browser-check script using already-installed Playwright/Chromium; it installs nothing
3. Inspect desktop and 390px screenshots; manually check 360px, 200% zoom, keyboard and screen reader
4. Run every scenario under both policies; repeat pause/reset, seek and change scenario while running
5. Confirm the JSON download and local documentation link
6. Rerun the full checker after any fix and update this record with actual evidence

No live provider, latency measurement or audio-device integration test is claimed.
