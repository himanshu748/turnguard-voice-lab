# Contributing

Read this guide before changing code. Keep every change scoped to this project and explain the teaching problem it solves.

## Scope
- Preserve the free, offline, silent default experience
- No credentials, analytics, remote assets, install requirements or metered calls
- No invented vendor affiliation, endorsement, measured latency or reliability guarantee
- Clearly label synthetic fixture timings and non-provider payload fields
- Check licenses and contribution/AI policies before reusing third-party code

## Workflow
1. Discuss substantial scope changes in an issue
2. Add a failing regression test for the specific problem
3. Make the smallest coherent fix
4. Run `node scripts/check.mjs` with Node 20+
5. For UI changes, check desktop and phone rendering, keyboard and reduced motion
6. Report passed, failed and unrun verification honestly

Use a topic branch and draft PR while implementation or verification is incomplete. Keep unrelated formatting/refactors separate. Never commit credentials, private data, `.env` files or misleading test output.

## New experiments

Add deterministic schedules in `src/scenarios.mjs`, a meaningful safe/broken distinction and a terminal-state assertion in `tests/scenarios.test.mjs`. Update scenario counts, relevant lifecycle/invariant tests, UI and docs together.

## Accessibility

Keep labeled native controls, keyboard use, visible focus, non-color state cues and reduced motion. Do not auto-run experiments or play audio. Test repeat-click, reset, seek and scenario changes while running.

## AI assistance

Disclose AI-assisted contributions. Contributors remain responsible for originality, licenses, understandable code, truthful claims and reproducible checks. Generated text is not proof a command ran.
