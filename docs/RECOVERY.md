# Recovery provenance

The execution workspace was reset on 2026-10-01 at approximately 02:14 UTC, removing the original project and ZIP. No surviving copy was found in the permitted local workspace, shared storage or temporary paths.

This project was reconstructed from the worker's own implementation conversation. No denied session files were accessed. It retains the original architecture, seven schedules and behavior, plus both earlier review fixes: replay invalidates a future inspector; pagehide renders and saves a coherent pause.

It is not byte-identical recovery. Source formatting and some documentation were rewritten, repeated inspector cleanup became one shared helper, and the package patch version changed. A new full test run verifies these reconstructed bytes. The earlier ZIP checksum and review approval must not be presented as evidence for this archive.

A persistent Library checkpoint was created early with the core and 27 passing tests, then updated with the complete reconstructed project. Library version metadata and the current archive checksum identify the saved artifact.
