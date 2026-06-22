# OPP — Other People's Photos

OPP is a privacy-first Progressive Web App that helps a consenting user audit public photos and videos they may appear in.

The release goal is deliberately narrow:

- the user can only search for themselves;
- face enrolment happens on-device;
- a remembered face profile is optional and can be deleted at any time;
- location history is imported or connected only with explicit date-range consent;
- public media discovery is by place and time, not by uploading a face to a server;
- non-matching candidate media and bystander faces are not retained.

## Current MVP

This repository currently ships a static PWA foundation that can run from GitHub Pages or any static file host.

Implemented:

- installable/offline PWA shell with service worker and web app manifest;
- consent-led onboarding for self-search only;
- optional local face profile vault using the Web Crypto API and IndexedDB;
- camera-based face enrolment flow with no raw selfie retention;
- import of location history files including CSV, KML, GPX, GeoJSON, and Google Timeline/Takeout-style JSON;
- date-range filtering and generation of derived place/time search windows;
- source-discovery cards and manual evidence review workflow;
- local candidate image comparison using a lightweight perceptual hash prototype;
- export of search windows and user-confirmed evidence bundles;
- local wipe controls;
- dependency-free tests and PWA verification scripts.

Not implemented yet:

- production-grade facial recognition;
- anti-spoofing/liveness assurance beyond the MVP camera challenge;
- direct Google/Apple account import;
- automated scraping of social platforms;
- cloud processing or central face search.

## Development

No package install is required for the MVP test suite.

```bash
npm test
npm run build
```

The app is static. To run locally:

```bash
npx http-server .
# or any static file server that serves index.html from the repository root
```

## Safety constraints

OPP must never become a general-purpose people finder. The product boundary is:

> Search public media by the consenting user's own time/location history, then compare candidate media locally against that same user's on-device face profile.

See [`docs/PRIVACY_SECURITY.md`](docs/PRIVACY_SECURITY.md) and [`docs/RELEASE_PLAN.md`](docs/RELEASE_PLAN.md).
