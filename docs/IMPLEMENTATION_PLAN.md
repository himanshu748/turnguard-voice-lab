# Implementation and recovery plan

Original scope: an offline instrument-panel lab using a pure reducer, deterministic fixtures and a small DOM presenter. No production network adapter. New isolated project only, zero spend, no existing-project changes.

Reconstruction order: recover core from conversation; run lifecycle regressions; persist early Library checkpoint; recover scenarios/presenter/UI including prior review fixes; restore invariant/presenter/HTTP checks; restore docs; run aggregate verification; replace the same persistent Library item.

Review focus: playback ownership, terminal closure, malformed-input isolation, deterministic timing, duplicate suppression, reset/replay inspector state, pagehide callback/UI coherence and honest simulated labels. Public publication remains a separate approval gate.
