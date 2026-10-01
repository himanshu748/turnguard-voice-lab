# 90-second demo script

Suggested narration and shot list; **not a recorded video**. Record the local app only after rendered browser QA. Keep the synthetic-data disclosure visible. Use your own narration or captions; paid generated speech is unnecessary.

## 0–10 seconds: premise
Show the page and lab.
“Fast speech helps. Stopping at the right moment matters just as much. TurnGuard is a silent offline lab for voice-stream clients. These frames and timings are synthetic, not a Murf performance test.”

## 10–30 seconds: reproduce
Choose The interruption, Broken client, Run experiment.
“The user interrupts at this marker. Clear is sent, but the local queue keeps going. Red shows audio from a turn that no longer owns the speaker.”
Pause or jump; point to wrong-turn playback.

## 30–50 seconds: compare
Switch to Safe client at the same timestamp. Open a rejected event.
“Same frames, different decisions. Stop locally, clear the old queue, use a fresh context and reject late output. The ledger shows why.”

## 50–70 seconds: non-audio signals
Jump in A useful warning, then Fatal means finished; compare policies.
“Warnings continue synthesis. Fatal errors end a context without final. Mixing them up drops useful audio or leaves the client waiting.”

## 70–90 seconds: evidence and limits
Show JSON export and the actual test command/output.
“The core is deterministic, with seeded invariants and lifecycle regressions. No keys, model calls or dependencies. Actual decoding, network conditions and speaker cancellation still need integration tests.”

Finish on Safe client at the interruption's key moment. Do not imply sponsorship, payment, accepted submission or live API integration.
