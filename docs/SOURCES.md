# Primary-source notes

Official documentation checked on **2026-09-30** during the original build. Recovery on 1 October uses that verified source record. Recheck current documentation before a production integration.

- [Context ID](https://murf.ai/api/docs/text-to-speech/web-sockets/context-id): per-turn identity, output matching, multiplexing, final and the limits of clear after synthesis starts
- [Errors & Warnings](https://murf.ai/api/docs/text-to-speech/errors): warning/fatal separation, stable codes and trace IDs
- [Latency Optimization](https://murf.ai/api/docs/text-to-speech/latency): first-audio-byte measurement and deployment effects; none of its vendor timings is represented as a TurnGuard measurement
- [Speech Customization](https://murf.ai/api/docs/text-to-speech/speech-customization): custom pause tags are Gen2 synthesis only, not a Falcon streaming control

The local queue policy, revoked-context guard, immutable snapshots, duplicate fixture IDs, 3-second deadline, exact schedule, example words and UI are original TurnGuard design choices, not provider promises. The `demo` envelope intentionally avoids encoded audio. Consult the API reference for production schemas.
