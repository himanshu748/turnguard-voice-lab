# TurnGuard

**A voice-stream reliability lab that costs nothing to run.**

Replay the same synthetic stream through a safe client and a deliberately broken client. See the exact moment local audio should stop, watch old frames get rejected, and inspect the decisions behind every outcome.

An independent portfolio/education project. Not an official Murf product, SDK, commissioned deliverable, or vendor-performance benchmark.

## Run locally

Requires Node.js 20+ and a modern browser. **No dependencies to install.**

```sh
node scripts/serve.mjs
```

Open **http://127.0.0.1:4173**. Another port: `PORT=4180 node scripts/serve.mjs`.

The server binds only to loopback. No account, microphone, sound device, API key, remote assets, telemetry, model call or hosting is used. Content Security Policy blocks outgoing app connections. External documentation opens only when clicked. ES modules require the local HTTP server; double-clicking the HTML file is not supported.

## Try this first

1. Keep **The interruption** selected; choose **Broken client**
2. Run it or jump to the key moment
3. Notice the red wrong-turn playback after the interruption marker
4. Switch to **Safe client** at the same timestamp
5. Open a rejected event to inspect the synthetic payload and decision

Seek, step, change replay speed, filter events or export a JSON trace. The URL hash retains scenario, policy and timestamp. `K` plays/pauses; `R` resets. Native controls support keyboard use. The app is silent: displayed words are authored fixture labels, not generated speech or an audio transcript.

## Seven experiments

| Experiment | Safe contract | Deliberate broken behavior |
|---|---|---|
| The interruption | Stop locally, purge old queue, clear separately, reject stale output | Assume clear stops the local player |
| A clean finish | Final closes input while accepted audio drains | Happy path works, hiding bugs |
| Crossed contexts | Only foreground owns the speaker | One global FIFO mixes contexts |
| A useful warning | Record warning and continue | Treat warning as terminal |
| Fatal means finished | Close affected context without waiting for final | Keep waiting for final |
| The bad frame | Quarantine malformed JSON; process valid frames | Simulate receiver halt |
| The missing final | Bound waiting with an application deadline | Wait beyond the observation window |

## Architecture

- `src/core.mjs`: immutable deterministic reducer; validation, lifecycle, playback eligibility, synthetic timing, outgoing-effect records and ledger
- `src/scenarios.mjs`: seven fixture schedules and pure replay/seek
- `src/app.mjs`: DOM presenter and user-controlled animation clock; no network or audio calls
- `src/styles.css`: responsive paper/ink interface, native controls, focus and reduced-motion styling
- `scripts/serve.mjs`: minimal loopback-only static server
- `tests/`: lifecycle regressions, seeded invariants, scenario outcomes, presenter harness and HTTP checks

`transition(state, event)` takes monotonic `start`, `interrupt`, `frame` and `tick` events and returns a fresh serializable snapshot. A completed input can still have queued audio. An interrupted input can still receive frames that must be rejected.

Interruption atomically revokes a turn, stops simulated local playback, purges its queue and records a separate clear effect. No actual network send occurs. Starting a new foreground context retires the prior speaker owner. Background streams can retain their own audio but cannot play in safe mode; this simplified lab does not expose background-to-foreground switching.

## Verify offline

```sh
node scripts/check.mjs
```

This syntax/asset checker runs `node --test`. The reconstructed build passes **48 actual tests**, including 120 seeded schedules / 14,400 transitions, 24 same-time permutations, prototype-like identifiers, malformed payloads, duplicate chunks, terminal states, exact deadlines, immutable snapshots and tick-subdivision equivalence.

Presenter tests exercise real app handlers against a minimal DOM test double. They verify state and timer ownership, **not browser rendering**. Replay-after-completion clears future-event inspection, and pagehide leaves a coherent paused state.

An optional browser script uses an already-installed Playwright and never installs dependencies:

```sh
# Run the local server separately, then:
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/browser-check.mjs
```

Rendered browser QA remains unverified; see [verification record](docs/VERIFICATION.md).

## Scope and limits

- Every millisecond is chosen fixture data. None measures Falcon, Murf, network latency, decoding or actual speaker cancellation
- Synthetic `audio` and `demo` fields are not a production provider wire schema or decoder
- The 3,000 ms total context deadline is a teaching choice, not a service limit, SLA or production recommendation
- Broken mode models client mistakes, not a vendor implementation
- No VAD, microphone, base64 decoding, resampling, actual speech, reconnect/backpressure/jitter handling or long-session memory bounds
- No production or real-provider end-to-end validation

## Documentation

[Technical explainer](docs/TECHNICAL_EXPLAINER.md) · [90-second demo script](docs/DEMO_SCRIPT.md) · [Primary sources](docs/SOURCES.md) · [Verification](docs/VERIFICATION.md) · [Contributing](CONTRIBUTING.md)

## Recovery provenance

This version was reconstructed from the original implementation conversation after an execution-workspace reset on 1 October 2026. It was rerun and verified on the reconstructed bytes. It is not the recovered original ZIP and does not share its checksum. See [recovery notes](docs/RECOVERY.md).

## License and disclosure

MIT. Original implementation developed with AI assistance. No SDK implementation was copied; no voices were cloned and no speech was generated. Review before adapting these patterns to production.
