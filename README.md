# CritterCodex Mobile MVP

React Native MVP scaffold for CritterCodex, aligned to the PRD and configured for Expo + TypeScript + Mapbox.

## Current implementation status

- App architecture under `src/` with feature modules.
- Auth bootstrap + auth/app navigation split.
- Mapbox home screen with marker rendering from shared entries query.
- Entries list screen wired to shared query data.
- Capture flow implemented: camera capture, retake, form validation, optional location tagging.
- Create-entry orchestration implemented: image upload -> entry create -> cache update.
- Partial-failure handling implemented for upload success + mutation failure (cleanup attempted).
- REST data/storage service layer implemented for Lambda + DynamoDB + S3 style backends.

## Prerequisites

1. Node 18+.
2. Expo tooling (`npx expo` works without global install).
3. Mapbox account and tokens.
4. AWS account + API Gateway/Lambda/DynamoDB/S3 resources (or equivalent local mock API).

## Environment setup

1. Copy `.env.example` values into your local environment.
2. Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` for runtime map rendering.
3. Set `MAPBOX_DOWNLOADS_TOKEN` when creating iOS/Android native dev builds.
4. Set `EXPO_PUBLIC_API_BASE_URL` to your API Gateway base URL.
5. Keep `MAPBOX_DOWNLOADS_TOKEN` out of client bundles and source control.

## Backend API contract

Set `EXPO_PUBLIC_API_BASE_URL` and provide these endpoints:

1. `GET /entries` -> returns `Entry[]` or `{ items: Entry[] }`.
2. `POST /entries` -> creates an entry and returns `Entry`.
3. `DELETE /entries/:id` -> deletes an entry.
4. `POST /uploads/presign` -> returns `{ key, uploadUrl }` for direct S3 upload.
5. `DELETE /uploads?key=<object-key>` -> deletes uploaded object for cleanup.

Optional auth endpoints (if you want backend-managed auth instead of local session fallback):

1. `POST /auth/sign-in`
2. `POST /auth/sign-up`
3. `POST /auth/confirm-sign-up`
4. `POST /auth/resend-confirmation-code`
5. `POST /auth/sign-out`
6. `POST /auth/hosted-sign-in`
7. `GET /auth/oauth/callback` (for Google OAuth2 SSO)

## Run

```bash
npm install
npm run start:lan
```

For iOS physical device and Mapbox native rendering, use a dev build (not Expo Go):

```bash
npm run ios:device
```

Then launch Metro with one of these modes:

```bash
npm run start:lan
# or, if LAN discovery is blocked by router/firewall:
npm run start:tunnel
# or, for simulator/local debugging:
npm run start:localhost
```

If tunneling fails intermittently, verify your ngrok-backed package is installed and up to date:

```bash
npx expo install @expo/ngrok
```

If you change native dependencies/plugins, rebuild the dev client before reconnecting:

```bash
npm run ios:device
```

## Runtime notes

- If `EXPO_PUBLIC_API_BASE_URL` is set, entries and image uploads use your REST backend.
- If `EXPO_PUBLIC_API_BASE_URL` is not set, the app falls back to in-memory/mock behavior for entries and local image URIs.
- If backend auth endpoints are not available, email sign-in uses a local device session fallback for development.
- For Google SSO, configure backend `GOOGLE_OAUTH_*` env vars and callback path `/auth/oauth/callback`.

## Next recommended steps

1. Finalize hosted auth callback/logout URLs for mobile redirect flow.
2. Implement delete-entry orchestration with storage object cleanup + UI rollback.
3. Add image download rendering for list/map thumbnails.
4. Add unit/integration coverage for service wrappers and mutation orchestration.
5. Add E2E smoke flow for sign-in -> map -> capture -> create -> list.
