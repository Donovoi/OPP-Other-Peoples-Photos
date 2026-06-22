# Privacy and Security Design Notes

## Product boundary

OPP is for user-consented self-search only. It must not identify strangers or search for a third party.

## Face data

The MVP stores a local face template only when the user explicitly chooses **Remember on this device**. Raw enrolment images are not persisted. The remembered template can be deleted at any time.

Current MVP limitations:

- browser-only encryption is weaker than native hardware-backed storage;
- same-origin JavaScript can use stored non-extractable CryptoKeys if the app has an XSS flaw;
- the included perceptual-hash comparator is a prototype, not production biometric recognition.

Production hardening:

- add strong Content Security Policy headers at hosting layer;
- avoid third-party scripts;
- use Trusted Types where supported;
- use platform authenticators or native wrappers for hardware-backed key release;
- perform independent model accuracy/bias testing;
- build anti-spoofing checks before enabling high-confidence automation.

## Location data

Location history is sensitive. The app should import only with explicit date-range consent and then minimise raw data into derived search windows.

Default retention target:

- raw imported location points: delete after search-window generation unless the user opts to keep them;
- derived windows: keep until the user deletes them;
- source-discovery cards: keep only if the user saves a search session;
- evidence: keep only if the user confirms the media may contain them.

## Public media discovery

The app must use lawful sources and provider APIs. It must not bypass logins, rate limits, robots controls, paywalls, privacy settings, or platform terms.

## Abuse controls

Required controls:

- camera-based self-enrolment rather than arbitrary target-photo upload;
- clear self-search-only attestation;
- no API that accepts a face and returns a person/location history;
- no export of "where this person appeared" as a surveillance report;
- no retention of bystander faces or non-match embeddings.

## Detractor checklist

Before accepting a change, ask:

1. Could this let a user search for someone else?
2. Does it retain more biometric or location data than needed?
3. Does it create a central or reusable face index?
4. Does it bypass a platform's official access path?
5. Could it expose a victim, child, witness, protester, or bystander?
6. Does the UI overstate accuracy or legality of removal?
7. Can the user delete the sensitive data easily?
