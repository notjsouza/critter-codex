# CritterCodex Mobile MVP

React Native MVP scaffold for CritterCodex, aligned to the PRD and configured for Expo + TypeScript + Mapbox + Amplify.

## Current implementation status

- App architecture under `src/` with feature modules.
- Auth bootstrap + auth/app navigation split.
- Mapbox home screen with marker rendering from shared entries query.
- Entries list screen wired to shared query data.
- Capture flow implemented: camera capture, retake, form validation, optional location tagging.
- Create-entry orchestration implemented: image upload -> GraphQL create -> cache update.
- Partial-failure handling implemented for upload success + mutation failure (cleanup attempted).
- Amplify Gen 2 backend scaffolded and deployed in sandbox mode (auth, data, storage).
- `amplify_outputs.json` generated for local app runtime configuration.

## Prerequisites

1. Node 18+.
2. Expo tooling (`npx expo` works without global install).
3. Mapbox account and tokens.
4. AWS CLI configured (profile with permissions to deploy Amplify resources).

## Environment setup

1. Copy `.env.example` values into your local environment.
2. Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` for runtime map rendering.
3. Set `MAPBOX_DOWNLOADS_TOKEN` when creating iOS/Android native dev builds.
4. Keep `MAPBOX_DOWNLOADS_TOKEN` out of client bundles and source control.

## Amplify setup

This repo is configured for Amplify Gen 2 local sandbox workflows.

1. Deploy sandbox backend:

```bash
npx ampx sandbox --profile default
```

2. Keep sandbox running while iterating on backend files under `amplify/`.
3. Confirm `amplify_outputs.json` exists in the project root.
4. Stop sandbox with `Ctrl+C` when done.
5. Delete sandbox resources when no longer needed:

```bash
npx ampx sandbox delete --profile default
```

## Run

```bash
npm install
npm run start
```

For iOS Simulator stability, prefer localhost mode:

```bash
npx expo start --localhost --clear
```

For Mapbox native rendering on device/simulator, use a dev build instead of Expo Go:

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

## Runtime notes

- If Amplify is configured (`amplify_outputs.json` present), entries and storage use real backend resources.
- If Amplify is not configured, the app falls back to in-memory/mock behavior for entries.
- Hosted redirect auth may require additional OAuth callback/logout configuration before sign-in redirect is fully functional.

## Next recommended steps

1. Finalize hosted auth callback/logout URLs for mobile redirect flow.
2. Implement delete-entry orchestration with storage object cleanup + UI rollback.
3. Add image download rendering for list/map thumbnails.
4. Add unit/integration coverage for service wrappers and mutation orchestration.
5. Add E2E smoke flow for sign-in -> map -> capture -> create -> list.
