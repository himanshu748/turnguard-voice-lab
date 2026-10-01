# TurnGuard

Independent offline learning lab for developers building interruptible voice clients. It exposes cancellation and stream-lifecycle bugs without a speech service.

Every frame, word and millisecond is authored fixture data. No runtime dependencies, microphone, audio, TTS, API key, model call or telemetry. Safe and deliberately broken clients receive identical schedules. Server cancellation and local playback cancellation are distinct responsibilities.

Success: a first-time visitor reproduces wrong-turn playback, changes policy at the same instant, and explains the safe client's local stop and stale-frame gate. The source and tests are inspectable offline.
