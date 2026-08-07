# Requirements Document

## Introduction

This feature replaces the current localStorage-based JWT token storage with httpOnly secure cookies, eliminating XSS attack vectors. It integrates Google OAuth as an OIDC provider, adds CSRF protection for state-changing requests, and establishes a cookie-based session management flow compatible with the cross-origin deployment (Next.js on Vercel, NestJS on Railway).

## Glossary

- **Auth_Service**: The NestJS authentication service (`apps/api/src/auth/auth.service.ts`) responsible for login, token issuance, refresh, and logout operations.
- **Auth_Guard**: The NestJS guard (`apps/api/src/auth/auth.guard.ts`) that validates incoming requests for authentication.
- **API_Client**: The frontend HTTP service layer (`apps/web/src/lib/api-client.ts`) that sends requests to the Backend.
- **Cookie_Manager**: The backend module responsible for setting, reading, and clearing httpOnly cookies on HTTP responses.
- **CSRF_Guard**: A NestJS guard that validates CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE).
- **CSRF_Token**: A cryptographically random token used to prevent cross-site request forgery attacks. Issued by the Backend and submitted by the Frontend in a custom header.
- **Access_Token_Cookie**: An httpOnly, secure cookie containing the short-lived JWT access token (15-minute expiry).
- **Refresh_Token_Cookie**: An httpOnly, secure cookie containing the refresh token identifier (7-day expiry).
- **Google_OAuth_Provider**: The Google OIDC identity provider configured as an SSO source in the Backend.
- **Session_Endpoint**: The `GET /auth/me` Backend endpoint that returns the current authenticated user from cookie-based session data.
- **Frontend**: The Next.js application at `apps/web` deployed on Vercel.
- **Backend**: The NestJS application at `apps/api` deployed on Railway.
- **Token_Rotation**: The process of invalidating the current refresh token and issuing a new one on each refresh operation.
- **PKCE**: Proof Key for Code Exchange, an OAuth 2.0 extension that prevents authorization code interception attacks.

## Requirements

### Requirement 1: httpOnly Cookie Token Storage

**User Story:** As a security-conscious user, I want my authentication tokens stored in httpOnly cookies instead of localStorage, so that JavaScript-based XSS attacks cannot steal my session credentials.

#### Acceptance Criteria

1. WHEN the Auth_Service issues tokens after successful authentication, THE Cookie_Manager SHALL set the access token in an Access_Token_Cookie with the `httpOnly`, `secure`, and `sameSite` attributes.
2. WHEN the Auth_Service issues tokens after successful authentication, THE Cookie_Manager SHALL set the refresh token in a Refresh_Token_Cookie with the `httpOnly`, `secure`, and `sameSite` attributes.
3. THE Access_Token_Cookie SHALL have a `maxAge` of 900 seconds (15 minutes).
4. THE Refresh_Token_Cookie SHALL have a `maxAge` of 604800 seconds (7 days).
5. THE Cookie_Manager SHALL set `sameSite` to `none` and `secure` to `true` on both cookies to support cross-origin requests between the Frontend (Vercel) and Backend (Railway).
6. THE Auth_Service SHALL stop returning access tokens and refresh tokens in the JSON response body.
7. WHEN the Auth_Service processes a logout request, THE Cookie_Manager SHALL clear both the Access_Token_Cookie and Refresh_Token_Cookie by setting them with an expired `maxAge`.

### Requirement 2: Cookie-Based Authentication in Auth Guard

**User Story:** As a backend developer, I want the Auth_Guard to read tokens from cookies, so that authenticated requests work without manual Authorization header injection.

#### Acceptance Criteria

1. WHEN a request arrives, THE Auth_Guard SHALL first attempt to extract the access token from the Access_Token_Cookie.
2. IF no Access_Token_Cookie is present, THEN THE Auth_Guard SHALL fall back to extracting the token from the `Authorization: Bearer` header (for API key and programmatic access compatibility).
3. WHEN a valid access token is found in the cookie, THE Auth_Guard SHALL verify the JWT and attach the decoded payload to the request object.
4. IF the Access_Token_Cookie contains an expired or invalid token, THEN THE Auth_Guard SHALL respond with HTTP 401 Unauthorized.

### Requirement 3: Frontend Credential Inclusion

**User Story:** As a frontend developer, I want the API_Client to send cookies automatically with every request, so that authentication works without manually attaching tokens.

#### Acceptance Criteria

1. THE API_Client SHALL include `credentials: 'include'` in all fetch requests to the Backend.
2. THE API_Client SHALL stop reading tokens from localStorage for authentication purposes.
3. THE API_Client SHALL stop setting the `Authorization` header for cookie-authenticated requests.
4. WHEN the API_Client receives a 401 response, THE API_Client SHALL call the `/auth/refresh` endpoint with `credentials: 'include'` and retry the original request.
5. IF the refresh request returns 401, THEN THE API_Client SHALL redirect the user to the login page.
6. THE Frontend auth store SHALL remove all localStorage token read/write operations and derive authentication state from the Session_Endpoint response.

### Requirement 4: CSRF Protection

**User Story:** As a security engineer, I want CSRF protection on all state-changing endpoints, so that malicious third-party sites cannot forge authenticated requests using the user's cookies.

#### Acceptance Criteria

1. WHEN a user authenticates successfully, THE Backend SHALL issue a CSRF_Token as a non-httpOnly cookie (readable by JavaScript) alongside the httpOnly auth cookies.
2. THE CSRF_Guard SHALL require a custom header `X-CSRF-Token` containing a valid CSRF_Token on all POST, PUT, PATCH, and DELETE requests.
3. IF a state-changing request arrives without a valid `X-CSRF-Token` header, THEN THE CSRF_Guard SHALL respond with HTTP 403 Forbidden.
4. THE CSRF_Guard SHALL skip validation for requests that do not carry cookies (API key authenticated requests).
5. THE API_Client SHALL read the CSRF_Token from the cookie and include it in the `X-CSRF-Token` header on all state-changing requests.
6. WHEN the CSRF_Token cookie is refreshed, THE API_Client SHALL use the updated value for subsequent requests.

### Requirement 5: Google OAuth Integration

**User Story:** As a user, I want to sign in with my Google account, so that I can authenticate without managing a separate password for this application.

#### Acceptance Criteria

1. THE Backend SHALL support Google as an OIDC provider with client credentials configured via `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables.
2. WHEN a user initiates Google sign-in, THE Backend SHALL generate a PKCE code verifier and code challenge, store the verifier in the SSO state, and include the code challenge in the authorization URL.
3. WHEN a user initiates Google sign-in, THE Backend SHALL redirect the user to the Google OAuth consent screen with scope `openid email profile`.
4. WHEN Google calls back with an authorization code, THE Backend SHALL exchange the code for tokens using the PKCE code verifier.
5. WHEN Google returns a valid ID token, THE Backend SHALL extract the user's email, name, and Google subject ID from the token claims.
6. WHEN a Google-authenticated user does not have an existing account, THE Backend SHALL auto-provision a User, Person, and Employee record linked to the Google subject ID.
7. WHEN a Google-authenticated user has an existing account matched by email, THE Backend SHALL link the Google subject ID to the existing account.
8. WHEN Google authentication completes successfully, THE Cookie_Manager SHALL set httpOnly auth cookies and redirect the user to the Frontend return URL.
9. THE Backend SHALL validate the Google ID token signature against Google's published JWKS endpoint.

### Requirement 6: Session Endpoint

**User Story:** As a frontend developer, I want a `/auth/me` endpoint that returns the current user from the session cookie, so that the Frontend can check authentication state on page load without storing tokens client-side.

#### Acceptance Criteria

1. THE Backend SHALL expose a `GET /auth/me` endpoint that reads the Access_Token_Cookie and returns the current user's profile (id, email, name, roles).
2. WHEN the Access_Token_Cookie is missing or contains an invalid token, THE Session_Endpoint SHALL respond with HTTP 401 Unauthorized.
3. WHEN the Frontend mounts, THE Frontend SHALL call the Session_Endpoint to determine if the user is authenticated and populate the auth store.
4. WHILE the Session_Endpoint request is in-flight, THE Frontend SHALL display a loading state rather than redirecting to login.
5. IF the Session_Endpoint returns 401, THEN THE Frontend SHALL attempt a silent refresh by calling `/auth/refresh` with `credentials: 'include'` before redirecting to login.

### Requirement 7: Secure Token Refresh via Cookies

**User Story:** As a user, I want my session to refresh seamlessly using secure cookies, so that I stay logged in without exposing refresh tokens to JavaScript.

#### Acceptance Criteria

1. WHEN the `/auth/refresh` endpoint is called, THE Auth_Service SHALL read the refresh token from the Refresh_Token_Cookie instead of the request body.
2. WHEN the refresh token is valid and not expired, THE Auth_Service SHALL perform Token_Rotation: delete the old refresh token from the database and issue a new one.
3. WHEN Token_Rotation completes, THE Cookie_Manager SHALL set a new Access_Token_Cookie and a new Refresh_Token_Cookie with fresh expiry times.
4. IF the Refresh_Token_Cookie is missing or contains an invalid token, THEN THE Auth_Service SHALL respond with HTTP 401 and clear all auth cookies.
5. THE Auth_Service SHALL use a short-lived access token expiry of 900 seconds (15 minutes) for newly issued Access_Token_Cookies.
6. THE Auth_Service SHALL use a refresh token expiry of 604800 seconds (7 days) for newly issued Refresh_Token_Cookies.

### Requirement 8: Dev Login Cookie Compatibility

**User Story:** As a developer, I want the "Login as Dev" button to continue working with the new cookie-based auth system, so that local development remains friction-free.

#### Acceptance Criteria

1. WHEN the dev login endpoint is called, THE Backend SHALL set httpOnly auth cookies for the dev user (user ID `usr_001`) with the same cookie attributes as production logins.
2. THE Backend SHALL expose a `POST /auth/dev-login` endpoint that is available only when `NODE_ENV` is not `production`.
3. WHEN the Frontend dev login button is clicked, THE Frontend SHALL call the `/auth/dev-login` endpoint with `credentials: 'include'` and redirect to the dashboard upon success.
4. THE Auth_Guard SHALL remove the `dev-mock-token` bypass and rely exclusively on cookies for dev login authentication.

### Requirement 9: Cross-Origin Cookie Configuration

**User Story:** As a DevOps engineer, I want cross-origin cookies to work between the Vercel frontend and Railway backend, so that authentication functions correctly in the deployed environment.

#### Acceptance Criteria

1. THE Backend CORS configuration SHALL include the Frontend origin in the `origin` allowlist and set `credentials: true`.
2. THE Cookie_Manager SHALL set `sameSite: 'none'` and `secure: true` on all authentication cookies when the application is not running on `localhost`.
3. WHILE the application is running on localhost, THE Cookie_Manager SHALL set `sameSite: 'lax'` and `secure: false` to support local development without HTTPS.
4. THE Backend SHALL read the allowed Frontend origin from the `CORS_ORIGIN` environment variable.
5. THE Cookie_Manager SHALL set the `domain` attribute appropriately based on the deployment environment, omitting it for cross-origin deployments where Frontend and Backend are on different top-level domains.

### Requirement 10: Logout and Cookie Cleanup

**User Story:** As a user, I want logging out to fully clear my session on both the client and server, so that no residual cookies can be used to access my account.

#### Acceptance Criteria

1. WHEN the user logs out, THE Frontend SHALL call `POST /auth/logout` with `credentials: 'include'`.
2. WHEN the logout endpoint is called, THE Auth_Service SHALL delete the refresh token record from the database.
3. WHEN the logout endpoint is called, THE Cookie_Manager SHALL clear the Access_Token_Cookie, Refresh_Token_Cookie, and CSRF_Token cookie by setting them with expired `maxAge`.
4. WHEN logout completes, THE Frontend SHALL clear the auth store state and redirect the user to the login page.
5. IF the Refresh_Token_Cookie is not present on a logout request, THEN THE Auth_Service SHALL still clear all cookies and respond with HTTP 200.
