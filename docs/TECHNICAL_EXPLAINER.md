# Your stream ended. Your speaker did not.

A voice client can look correct in every happy-path demo and still talk over its user. The failure often lives between two ownership models: the service owns synthesis; the client owns what reaches the speaker.

TurnGuard makes that gap inspectable. It is a silent offline simulation. Every chunk, phrase and timestamp was authored for the experiment; nothing here measures or calls a speech model.

## One interruption, two responsibilities

A train-booking assistant starts a reply. The user changes the date halfway through. The application asks the service to clear the old turn, then starts a new one.

Chunks may already be sitting in the local queue. Murf's context documentation notes that clear can cancel pending synthesis while an already-started turn may still finish. Local cancellation therefore needs its own client responsibility. [Context ID documentation](https://murf.ai/api/docs/text-to-speech/web-sockets/context-id)

In TurnGuard's broken client, the old queue continues. Its timeline turns red only for the portion played after the turn lost permission. Switch policies at the same timestamp: identical input now ends the old segment, removes its queued chunks and rejects stale frames.

The useful invariant is precise: **every playing chunk in the safe client belongs to the current speaker owner and to a context that has not been revoked.** Checking that a clear message was sent is weaker.

## Identity is not transport

One connection can carry multiple contexts. A global audio FIFO erases that distinction. In Crossed contexts, background audio arrives first and foreground audio later. The broken client speaks the first arrival. The safe client preserves ownership.

Keep three independent facts:

1. Identity: which turn owns a frame
2. Lifecycle: whether that turn accepts more input
3. Playback eligibility: which turn owns the speaker now

A completed input may still have audio left to play. An interrupted input may still receive frames. These are consistent once the three facts are separate.

## Non-audio does not always mean failure

The provider distinguishes warnings, which continue synthesis, from fatal errors, which end the affected context without a later final. Stable machine-readable codes should drive handling rather than prose. [Errors and warnings](https://murf.ai/api/docs/text-to-speech/errors)

The tests must distinguish these signals too. Warning tests assert that later audio plays. Fatal tests assert that cleanup does not wait for final. Parser tests assert that malformed input cannot partly mutate lifecycle state before validation fails.

Missing final is another case. This demo chooses a 3,000 ms absolute context deadline so the failure appears quickly. A real application must choose a policy for its turn length, idle behavior and transport semantics. A timeout should be a deliberate contract, not an accidental component timer.

## Make time testable

The reducer accepts timestamps as data. It does not read the wall clock. Both policies can replay to the exact same instant, and splitting one long tick into short ticks must preserve the result.

Seeded tests generate thousands of starts, interruptions, audio, final, warning, fatal and malformed events. After each transition they assert playback ownership, safe queues, terminal-state closure, unique chunk IDs and zero wrong-turn playback. A permutation test covers same-time orderings. A separate regression ensures prototype-like context names never impersonate a registered context.

These checks are reproducible evidence, not an exhaustive proof or statistical reliability claim. The presenter needs tests too: scenario changes cancel callbacks, replay clears a selected future payload, and pagehide must leave the displayed state coherently paused.

## Measure the real integration separately

First audio arrival and user-heard audio are different milestones. Murf's guide focuses on first audio byte and testing from the deployment environment. TurnGuard reports fixture timings only and makes no vendor-speed claim. [Latency guide](https://murf.ai/api/docs/text-to-speech/latency)

Capabilities are model-specific: pause tags are documented for Gen2 synthesis, not Falcon streaming. A demo pause slider should not imply unsupported provider control. [Speech customization](https://murf.ai/api/docs/text-to-speech/speech-customization)

To adapt this pattern, add a real transport/decoder and test actual speaker cancellation, stale decode callbacks, reconnection, backpressure and device behavior. Keep the deterministic tests: they give the complex integration a small contract to preserve.
