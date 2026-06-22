# OPP MVP Release Plan

## Release objective

Ship a working PWA that demonstrates the full privacy-preserving workflow without scraping platforms or uploading biometric/location data to a backend.

## MVP workflow

1. The user accepts the self-search-only boundary.
2. The user chooses whether to create a session-only face profile or remember it on this device.
3. The app captures a fresh camera frame and converts it into a local template.
4. The user imports location history from a supported file format.
5. The user selects a date range and search radius policy.
6. The app generates place/time search windows from the selected location data.
7. The app creates public-source discovery cards from those windows.
8. The user manually reviews source results and imports candidate media for local comparison.
9. The app stores only user-confirmed matches/evidence.
10. The user can delete the face profile, imported locations, generated windows, evidence, or the entire local vault at any time.

## Commit loop used for this release

Each commit must pass:

- static PWA verification;
- parser/unit tests where relevant;
- detractor review against privacy, abuse, security, and product-scope risks.

## Release blockers before production

- independent privacy impact assessment;
- legal review for every target jurisdiction;
- secure code review focused on local vault design and XSS risk;
- replacement of prototype perceptual-hash face comparison with a vetted on-device face recognition model;
- explicit bystander-face non-retention tests;
- provider-by-provider API compliance review;
- Apple/Google account import implementation using official consent flows only.

## Non-goals

- no general face search;
- no upload-a-face-to-find-someone flow;
- no social-platform scraping;
- no central biometric database;
- no background monitoring without explicit recurring consent.
