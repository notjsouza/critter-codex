# CritterCodex React Native PRD

## 1. Document Control

- Product: CritterCodex Mobile (React Native)
- Current system: iOS SwiftUI app using AWS Amplify
- Proposed system: React Native app (iOS + Android) with AWS Amplify backend reuse
- PRD version: 1.0
- Date: 2026-04-08
- Status: Draft for implementation kickoff

## 2. Executive Summary

CritterCodex lets users discover and log campus pet sightings with image uploads and location markers. The existing Swift app proves the feature set and backend contract. This PRD defines a React Native rebuild for cross-platform delivery while preserving existing domain logic and backend resources.

Decision rationale:

- Build from scratch in React Native instead of line-by-line migration.
- Reuse business rules and cloud resources (Auth, GraphQL API, Storage).
- Preserve feature parity first, then iterate.

## 3. Goals and Non-Goals

### Goals

1. Deliver feature parity with current app behavior on iOS and Android.
2. Reuse Amplify Auth, GraphQL API, and S3 storage model.
3. Establish clean app architecture and testable modules.
4. Improve reliability of camera, location, and upload flows.

### Non-Goals (Phase 1)

1. No social feed features (likes/comments/follows).
2. No advanced map clustering or geofencing.
3. No offline-first sync engine.
4. No admin moderation panel.

## 4. Current Logic to Preserve

The current app behavior is the source of truth for MVP parity.

1. Auth
- Fetch existing session on launch.
- If signed out, trigger Cognito hosted web sign-in.
- Allow explicit sign-out.

2. Entries data model
- Fields used by app: id, name, description, image, latitude, longitude.
- Fetch entry list from GraphQL.
- Create entry and append to local UI list.
- Delete entry and remove from local UI list.

3. Images
- Upload image bytes to S3 with generated image key.
- Download image on demand for list/map rendering.
- Remove image from S3 on entry delete.

4. Map and location
- Display map centered around campus default and user location when available.
- Render markers for entries with coordinates.
- Allow recenter on user location.

5. Camera flow
- Capture photo.
- Confirm retake/use-photo.
- Submit form with name (required), description (optional), image, and location.

## 5. Target Users

1. Students exploring campus.
2. Staff/community members logging sightings.
3. Campus club organizers monitoring sightings.

## 6. User Stories and Acceptance Criteria

### Epic A: Authentication

User story A1:
As a returning user, I want to stay signed in so that I can use the app immediately.

Acceptance criteria:
1. App checks auth session on startup.
2. If valid session exists, user lands on home map within 2 seconds on warm start.
3. If no session, user is routed to sign-in screen.

User story A2:
As a user, I want secure sign-in and sign-out so that my account is protected.

Acceptance criteria:
1. Sign-in uses Cognito hosted UI flow.
2. Sign-out clears session and returns to sign-in state.
3. Auth errors are surfaced with actionable messages.

### Epic B: Map and Discovery

User story B1:
As a user, I want to view sightings on a map so I can find where pets were seen.

Acceptance criteria:
1. Home displays map immediately with loading state for data.
2. Entries with valid latitude and longitude show map markers.
3. Tapping marker shows name and optional description.

User story B2:
As a user, I want to recenter on my location so I can orient quickly.

Acceptance criteria:
1. Recenter control requests current location.
2. Map camera updates to user position when permission granted.
3. If denied, show non-blocking prompt with settings guidance.

### Epic C: Capture and Create Entry

User story C1:
As a user, I want to capture a photo and create an entry so I can log sightings.

Acceptance criteria:
1. Camera opens from home screen action.
2. User can retake before submission.
3. Name is required; description optional.
4. Submission uploads image then creates GraphQL entry with image key.
5. New entry appears in list and map after success.

User story C2:
As a user, I want clear failure handling so I know what to do when uploads fail.

Acceptance criteria:
1. Upload/API failures show retry option.
2. Partial-failure states are handled (for example upload success + API failure).
3. No silent failures.

### Epic D: List and Delete

User story D1:
As a user, I want to browse all entries in a list.

Acceptance criteria:
1. List shows name and description.
2. Thumbnail appears when image exists.
3. Empty state text appears if no entries.

User story D2:
As a user, I want to delete an entry I created.

Acceptance criteria:
1. Delete removes entry via API.
2. If entry has image key, image is deleted from storage.
3. UI reflects deletion without manual refresh.

## 7. Functional Requirements

1. Authentication
- Amplify Auth integration with Cognito hosted UI.
- Session bootstrap on app launch.

2. Entries API
- GraphQL list/create/delete operations for Entry model.
- Owner-based write authorization, public read (or future authenticated read if policy changes).

3. Storage
- Upload image data to S3 with generated object key.
- Download image bytes for rendering.
- Delete object when associated entry is removed.

4. Map
- Render map and entry markers.
- Recenter action.
- Marker popup with core metadata.

5. Camera and media
- Camera capture with permission gate.
- Optional gallery selection for parity extension (toggle-able).

6. Navigation
- Auth stack and app stack separation.
- Modal or sheet flows for camera/list.

7. Error handling and observability
- Standard error taxonomy (network, auth, permissions, validation, unknown).
- Toast/dialog patterns for user-facing errors.
- Structured logs for debugging.

## 8. Non-Functional Requirements

1. Performance
- Home map visible in less than 2.5 seconds on average device.
- List render for 200 entries without frame drops.

2. Reliability
- Retry strategy for transient failures.
- App remains usable after location permission denial.

3. Security
- No hardcoded secrets in app bundle.
- Use environment-based config for tokens and Amplify values.

4. Accessibility
- Buttons and inputs support screen readers.
- Minimum touch target sizes and contrast requirements.

5. Cross-platform behavior
- Feature parity across iOS and Android.
- Permission flows compliant with both OS policies.

## 9. Proposed Technical Architecture

## 9.1 Stack

1. React Native (TypeScript)
2. Navigation: React Navigation
3. Server state: TanStack Query
4. Auth/API/Storage: AWS Amplify JS
5. Map: @rnmapbox/maps or react-native-maps (choose at kickoff)
6. Camera: Expo Camera or react-native-vision-camera
7. Forms/validation: React Hook Form + Zod

## 9.2 App Module Structure

- src/app
- src/navigation
- src/features/auth
- src/features/map
- src/features/entries
- src/features/capture
- src/services/amplify
- src/services/storage
- src/services/location
- src/components/ui
- src/lib/errors
- src/lib/analytics
- src/types

## 9.3 Data Contracts

Entry:

- id: string
- name: string
- description?: string
- image?: string
- latitude?: number
- longitude?: number

## 9.4 Key Flows

1. App start
- bootstrapAmplify -> fetchAuthSession -> route auth/app stack.

2. Create entry
- capture/select image -> uploadImage(imageKey) -> createEntry(payload) -> invalidate entries query.

3. Delete entry
- deleteEntry(id) -> if imageKey then deleteImage(imageKey) -> invalidate entries query.

## 10. API and Cloud Strategy

1. Reuse existing Amplify backend where possible.
2. Validate GraphQL schema and auth policy for mobile clients.
3. Keep signed URL/object access aligned with current protected access model.
4. Document environment separation (dev/staging/prod) before launch.

## 11. UX Requirements

1. Screen set
- Splash/bootstrap
- Sign-in
- Home map
- Camera capture
- Create entry form
- Entries list

2. UI states for each screen
- Loading
- Empty
- Success
- Error

3. Interaction details
- Prominent camera CTA
- Recenter control
- Marker detail tooltip or bottom sheet

## 12. Analytics Events (MVP)

1. auth_sign_in_started
2. auth_sign_in_succeeded
3. auth_sign_out
4. map_loaded
5. recenter_tapped
6. capture_opened
7. entry_create_started
8. entry_create_succeeded
9. entry_create_failed
10. entry_delete_succeeded

## 13. Testing Strategy

1. Unit tests
- Service wrappers for Auth/API/Storage.
- Form validation and payload mapping.

2. Integration tests
- Create and delete entry flow with mocked backend.
- Permission denial behavior for location/camera.

3. End-to-end tests
- Sign-in -> map -> capture -> create -> list -> delete.

4. Manual QA matrix
- iOS latest + previous major.
- Android latest + one mid-tier device profile.

## 14. Milestones and Timeline

## Week 1: Foundations

1. Initialize RN project and folder architecture.
2. Configure Amplify Auth/API/Storage.
3. Implement auth bootstrap and sign-in/sign-out shell.

Exit criteria:
- User can sign in and out in both iOS and Android dev builds.

## Week 2: Core Data and Map

1. Implement entries queries and mutations.
2. Build map screen with markers and recenter behavior.
3. Add list screen with empty/loading/error states.

Exit criteria:
- User can fetch and view entries on map and list.

## Week 3: Capture and Upload

1. Implement camera capture and retake flow.
2. Implement create entry form and submission sequence.
3. Implement image upload + API create orchestration with retries.

Exit criteria:
- User can create entries with image and location.

## Week 4: Hardening and Release Prep

1. Implement delete orchestration with storage cleanup.
2. Add analytics, logging, and failure UX polish.
3. Complete E2E tests and QA matrix.
4. Prepare rollout checklist and release notes.

Exit criteria:
- MVP parity achieved and signed off.

## 15. Risks and Mitigations

1. Risk: Amplify auth/web UI differences across platforms.
- Mitigation: Build auth spike in Week 1 and lock flow early.

2. Risk: Map SDK complexity/performance.
- Mitigation: Decide map library at kickoff with proof-of-concept benchmark.

3. Risk: Camera permission/device fragmentation on Android.
- Mitigation: Test matrix and fallback states from Week 2 onward.

4. Risk: Data inconsistency between upload and mutation failures.
- Mitigation: Introduce transaction-like orchestration and retry/cleanup rules.

## 16. Open Decisions Before Kickoff

1. Map library final choice: @rnmapbox/maps vs react-native-maps.
2. RN runtime: Expo managed vs bare RN.
3. Error reporting tool: Sentry or equivalent.
4. Environment strategy: single dev backend vs isolated envs.

## 17. Definition of Done (MVP)

1. All epics A-D pass acceptance criteria.
2. iOS and Android builds are installable and smoke-tested.
3. No P0/P1 defects open.
4. Core E2E flow is green in CI.
5. PRD requirements trace to implemented tickets.

## 18. Suggested Jira Epic and Ticket Breakdown

Epic 1: Platform foundation and navigation
- Ticket 1.1 Project scaffold and TypeScript config
- Ticket 1.2 Navigation/auth routing shell
- Ticket 1.3 Amplify environment bootstrap

Epic 2: Auth and session
- Ticket 2.1 Sign-in flow
- Ticket 2.2 Sign-out flow
- Ticket 2.3 Session bootstrap and protected routes

Epic 3: Entries read experience
- Ticket 3.1 Entries query service
- Ticket 3.2 List screen
- Ticket 3.3 Map markers and recenter

Epic 4: Capture and create
- Ticket 4.1 Camera capture module
- Ticket 4.2 Entry form and validation
- Ticket 4.3 Upload and create orchestration

Epic 5: Delete and consistency
- Ticket 5.1 Delete entry mutation
- Ticket 5.2 Storage object cleanup
- Ticket 5.3 Optimistic updates and rollback

Epic 6: Quality and release
- Ticket 6.1 Unit/integration coverage
- Ticket 6.2 E2E flow
- Ticket 6.3 QA hardening and release checklist
