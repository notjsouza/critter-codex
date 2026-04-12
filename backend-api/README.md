# Critter Codex Backend API

Serverless backend for the mobile app using:
- API Gateway HTTP API
- Lambda (Node.js)
- DynamoDB (entries metadata)
- S3 (entry images)

## Endpoints

- GET /entries
- POST /entries
- DELETE /entries/{id}
- POST /uploads/presign
- DELETE /uploads?key=<object-key>
- POST /auth/sign-up
- POST /auth/confirm-sign-up
- POST /auth/resend-confirmation-code
- POST /auth/sign-in
- POST /auth/sign-out
- POST /auth/hosted-sign-in
- GET /auth/oauth/callback

### Sighting query modes

- Default (`GET /entries`): returns only active sightings in the 24-hour display window.
- History (`GET /entries?includeHistory=true` or `GET /entries?window=7d`): returns sightings from the last ~7 days.

## Prerequisites

- AWS CLI configured
- AWS SAM CLI installed
- Node 20+

## Deploy

1. Install backend dependencies:

```bash
cd backend-api
npm install
```

2. Build and deploy with SAM:

```bash
sam build
sam deploy --guided
```

3. Copy the `ApiBaseUrl` stack output.

4. Set app env var in the project root `.env.local`:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api-id.execute-api.region.amazonaws.com
```

5. Restart Expo:

```bash
npm run start:lan
```

## Terraform automation (create/destroy)

Terraform files are in [backend-api/infra/terraform](backend-api/infra/terraform).

1. Copy and edit variables:

```bash
cd backend-api/infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

2. Create infra:

```bash
bash backend-api/scripts/terraform-up.sh
```

This automatically:
- Applies Terraform to create the API, DynamoDB, and S3 resources
- Writes `EXPO_PUBLIC_API_BASE_URL` to the root `.env.local`
- Captures the generated `oauth_callback_url` and fills `google_oauth_redirect_uri` in `terraform.tfvars`
- Prints the exact redirect URI to register in Google Cloud Console

3. Destroy infra:

```bash
bash backend-api/scripts/terraform-down.sh
```

## Google OAuth2 SSO (optional)

Configure these Lambda environment variables in your deployed stack:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `APP_AUTH_REDIRECT_URI` (default: `crittercodex://auth`)

Google Cloud Console setup:

1. Create OAuth 2.0 credentials (Web application).
2. Add authorized redirect URI:
  - `https://<api-id>.execute-api.<region>.amazonaws.com/auth/oauth/callback`
3. Enable OpenID scopes (`openid`, `email`, `profile`).

When app users tap Hosted Sign-In:

1. App calls `POST /auth/hosted-sign-in`.
2. Backend returns Google authorize URL.
3. User signs in with Google.
4. Google redirects to backend callback.
5. Backend redirects to app deep link with `?token=...`.

## DynamoDB item shape

Items are stored with this shape:

```json
{
  "id": "uuid-or-generated-id",
  "name": "string",
  "description": "string?",
  "image": "s3/object/key.jpg?",
  "latitude": 0,
  "longitude": 0,
  "createdAt": "ISO string",
  "updatedAt": "ISO string",
  "createdAtEpoch": 0,
  "displayUntilEpoch": 0,
  "ttlEpoch": 0
}
```

## Notes

- Presigned upload URLs expire after 5 minutes.
- CORS is configured with wildcard origins for development. Tighten this in production.
- Entry visibility window is 24 hours (`displayUntilEpoch`).
- DynamoDB record retention is ~7 days via TTL (`ttlEpoch`).
- S3 objects under `entries/` expire after 1 day via lifecycle policy.
- Terraform scripts are intentionally plain Bash and can be run as `bash backend-api/scripts/terraform-up.sh` and `bash backend-api/scripts/terraform-down.sh` without chmod.
