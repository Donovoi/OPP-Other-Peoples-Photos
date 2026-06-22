# Detractor Loop Log

## Loop 1 — Scope and docs

Concern: The product could drift into a people-finder.

Response: The README and privacy docs define the self-search-only boundary, ban arbitrary face search, and list production blockers before broader release.

## Loop 2 — PWA shell

Concern: A PWA that handles biometrics and location data must avoid third-party runtime dependencies and continue to work offline.

Response: The MVP is static and dependency-light, with service-worker caching and no third-party scripts.

## Loop 3 — Location import

Concern: Imported account exports may contain more history than the selected date range.

Response: Parsers import locally, date filtering is performed before window generation, and the UI exposes delete controls for imported points and derived windows.

## Loop 4 — Face profile

Concern: Persistent biometric storage increases risk.

Response: Face remembering is opt-in, local, encrypted using Web Crypto APIs, and deletable. Raw enrolment frames are not persisted.

## Loop 5 — Candidate matching

Concern: Prototype matching could be over-trusted.

Response: UI labels matching as a local prototype and requires user confirmation before evidence is retained.
