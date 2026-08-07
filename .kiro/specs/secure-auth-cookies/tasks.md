# Implementation Plan: Secure Auth Cookies

## Overview

This plan migrates authentication from localStorage-based JWT storage to httpOnly secure cookies with CSRF protection and Google OAuth PKCE. Implementation proceeds backend-first (cookie infrastructure → guards → controller updates) then frontend (API client → auth store → login page), ensuring each phase builds on the previous one with no orphaned code.

## Tasks

- [ ] 1. Backend CookieService
  - [x] 1.1 Create `apps/api/src/auth/cookie/cookie.service.ts` with `CookieService` class
    - Implement `setAuthCookies(res, accessToken, refreshToken)` to set `access_token` and `refresh_token` httpOnly cookies
    - Implement `setCsrfCookie(res, csrfToken)` to set `csrf_token` as non-httpOnly cookie readable by JS
    - Implement `clearAuthCookies(res)` to expire all three cookies
    - Implement `getAccessToken(req)` and `getRefreshToken(req)` to read cookies from request
    - Implement `getCookieOptions(cookieType)` with environment-adaptive behavior (localhost → `sameSite: 'lax'`, `secure: false`; production → `sameSite: 'none'`, `secure: true`)
    - Implement `generateCsrfToken()` using `crypto.randomBytes(32).toString('hex')`
    - `refresh_token` cookie path restricted to `/auth`; `access_token` and `csrf_token` path is `/`
    - Domain attribute omitted for cross-origin deployments
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 9.2, 9.3, 9.5_

  - [x] 1.2 Create `apps/api/src/auth/cookie/cookie.module.ts` and register CookieService as a provider
    - Export CookieService for use in AuthModule
    - _Requirements: 1.1_

  - [ ]* 1.3 Write property tests for CookieService in `apps/api/src/auth/__tests__/cookie.service.spec.ts`
    - **Property 1: Cookie attributes correctness** — generate random token strings, verify httpOnly/secure/sameSite attributes
    - **Property 2: Logout clears all auth cookies** — generate random sessions, verify Set-Cookie headers expire all three cookies
    - **Property 11: Environment-adaptive cookie configuration** — generate env configs, verify correct secure/sameSite values
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.7, 9.2, 9.3, 9.5**

- [ ] 2. Backend CSRF Guard
  - [x] 2.1 Create `apps/api/src/auth/csrf/csrf.guard.ts` implementing `CanActivate`
    - Skip validation for GET, HEAD, OPTIONS methods
    - Skip validation when no `access_token` cookie is present (API key auth)
    - Extract `X-CSRF-Token` header and `csrf_token` cookie value
    - Compare using `crypto.timingSafeEqual` — reject with 403 if mismatch or missing
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 2.2 Create `apps/api/src/auth/csrf/csrf.module.ts` and register CsrfGuard
    - _Requirements: 4.2_

  - [ ]* 2.3 Write property tests for CsrfGuard in `apps/api/src/auth/__tests__/csrf.guard.spec.ts`
    - **Property 6: CSRF enforcement on state-changing requests** — generate method × CSRF token presence combinations, verify 403 on mismatch/missing
    - **Property 7: CSRF bypass for non-cookie authentication** — generate API key requests without cookies, verify pass-through
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ] 3. Update AuthGuard for cookie-first token extraction
  - [x] 3.1 Modify `apps/api/src/auth/auth.guard.ts` to inject `CookieService` and extract token cookie-first
    - First call `CookieService.getAccessToken(req)` for cookie token
    - If absent, fall back to `Authorization: Bearer` header extraction
    - If token starts with `strata_` → existing API key validation
    - Otherwise → JWT verification (existing logic)
    - Remove the `dev-mock-token` bypass entirely
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.4_

  - [ ]* 3.2 Write property tests for updated AuthGuard in `apps/api/src/auth/__tests__/auth.guard.cookie.spec.ts`
    - **Property 3: Auth guard token extraction priority** — generate JWT pairs in cookie and header, verify cookie wins
    - **Property 4: Auth guard rejects invalid tokens** — generate expired/malformed/tampered JWTs, verify 401
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 4. Checkpoint - Backend guards verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Update AuthController endpoints for cookie-based auth
  - [x] 5.1 Modify `POST /auth/login` to set cookies instead of returning tokens in body
    - Inject `CookieService` and `@Res({ passthrough: true })` response object
    - After successful auth, call `CookieService.setAuthCookies(res, accessToken, refreshToken)`
    - Generate CSRF token and call `CookieService.setCsrfCookie(res, csrfToken)`
    - Return `{ success: true }` instead of `{ accessToken, refreshToken, expiresIn }`
    - _Requirements: 1.1, 1.2, 1.6, 4.1_

  - [x] 5.2 Modify `POST /auth/refresh` to read refresh token from cookie and set new cookies
    - Read refresh token via `CookieService.getRefreshToken(req)`
    - On success: set new auth cookies and CSRF cookie
    - On failure: call `CookieService.clearAuthCookies(res)` and return 401
    - Return `{ success: true }` (no tokens in body)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.3 Modify `POST /auth/logout` to read refresh token from cookie and clear cookies
    - Read refresh token via `CookieService.getRefreshToken(req)`
    - Delete refresh token from DB (if present)
    - Call `CookieService.clearAuthCookies(res)`
    - Return 200 even if no refresh token cookie present
    - _Requirements: 10.2, 10.3, 10.5_

  - [x] 5.4 Add `GET /auth/me` endpoint
    - Protected route (uses AuthGuard with cookie)
    - Read user from `req.user` (set by AuthGuard)
    - Query user's profile from database by `req.user.sub`
    - Return `{ id, email, name, roles }`
    - _Requirements: 6.1, 6.2_

  - [x] 5.5 Add `POST /auth/dev-login` endpoint
    - Guard with `NODE_ENV !== 'production'` check (return 404 otherwise)
    - Set httpOnly auth cookies for dev user (`usr_001`) using same CookieService
    - Generate and set CSRF token cookie
    - Return `{ success: true }`
    - _Requirements: 8.1, 8.2_

  - [ ]* 5.6 Write property tests for auth controller cookie behavior in `apps/api/src/auth/__tests__/auth.controller.cookie.spec.ts`
    - **Property 5: Session endpoint returns correct user profile** — generate valid JWT payloads, verify /auth/me response matches
    - **Property 9: Token rotation invariant** — verify old token deleted and new token created with different value
    - **Property 10: Refresh with invalid token clears cookies** — generate invalid tokens, verify cookies cleared
    - **Property 12: Logout deletes refresh token from database** — generate tokens, verify DB deletion
    - **Validates: Requirements 2.3, 6.1, 7.2, 7.3, 7.4, 10.2**

- [ ] 6. Google OAuth controller with PKCE
  - [x] 6.1 Create `apps/api/src/auth/oidc/google.controller.ts` with `GET /auth/google/login` endpoint
    - Generate PKCE `code_verifier` (43-128 char random string from unreserved URI chars)
    - Derive `code_challenge` as base64url(SHA-256(code_verifier)) without padding
    - Store `code_verifier` in Redis SSO state alongside `returnUrl` and `nonce`
    - Redirect to Google authorization URL with `code_challenge`, `code_challenge_method=S256`, `scope=openid email profile`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Implement `GET /auth/google/callback` handler
    - Validate state parameter against Redis
    - Exchange authorization code for tokens including `code_verifier` from state
    - Validate Google ID token signature against Google JWKS
    - Extract `email`, `name`, and `sub` claims
    - Upsert user: match by email or create new User/Person/Employee records
    - Set httpOnly auth cookies and CSRF cookie via CookieService
    - Redirect to `returnUrl` from stored state
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 6.3 Register Google OAuth routes in auth module
    - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` to ConfigService
    - Wire GoogleController into AuthModule imports
    - _Requirements: 5.1_

  - [ ]* 6.4 Write property tests for PKCE and unit tests for Google OAuth in `apps/api/src/auth/__tests__/google-oauth.spec.ts`
    - **Property 8: PKCE code challenge derivation** — generate random code verifiers, verify base64url(SHA-256(verifier)) relationship
    - Unit test: state mismatch returns error redirect
    - Unit test: expired state returns error redirect
    - Unit test: user provisioning creates correct records
    - **Validates: Requirements 5.2, 5.4, 5.6, 5.7**

- [x] 7. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend API client changes
  - [x] 8.1 Modify `apps/web/src/lib/api-client.ts` to use `credentials: 'include'` on all fetch calls
    - Add `credentials: 'include'` to `buildFetchOptions` return object
    - Remove `Authorization` header injection for standard requests (keep for explicit API key usage if any)
    - _Requirements: 3.1, 3.3_

  - [x] 8.2 Add CSRF header injection to API client
    - Create helper `getCsrfToken()` that reads `csrf_token` from `document.cookie`
    - For POST, PUT, PATCH, DELETE requests: set `X-CSRF-Token` header from cookie value
    - _Requirements: 4.5, 4.6_

  - [x] 8.3 Update 401 retry logic to use cookie-based refresh
    - On 401: call `POST /auth/refresh` with `credentials: 'include'` (no body needed)
    - On successful refresh: retry original request (cookies refreshed automatically)
    - On refresh 401: clear auth store, redirect to `/login`
    - On 403 (CSRF): re-read CSRF cookie, retry once
    - Remove `refreshAccessToken` function that sends refresh token in body
    - Remove all `localStorage` token reads from api-client
    - _Requirements: 3.4, 3.5_

  - [ ]* 8.4 Write unit tests for API client changes in `apps/web/src/lib/__tests__/api-client.cookie.spec.ts`
    - Test `credentials: 'include'` is present on all requests
    - Test CSRF header set on POST/PUT/PATCH/DELETE
    - Test 401 → refresh → retry flow
    - Test 401 on refresh → redirect to login
    - **Validates: Requirements 3.1, 3.4, 3.5, 4.5**

- [x] 9. Frontend auth store changes
  - [x] 9.1 Rewrite `apps/web/src/lib/auth.ts` to session-based cookie authentication
    - Remove all `localStorage` read/write operations for tokens
    - Remove `accessToken` from store state (no longer stored client-side)
    - `isAuthenticated` starts as `false`, set to `true` on successful `/auth/me` response
    - Add `checkSession()` method that calls `GET /auth/me` with `credentials: 'include'`
    - `login(email, password)` calls `POST /auth/login` with `credentials: 'include'`, sets `isAuthenticated` on 200
    - `logout()` calls `POST /auth/logout` with `credentials: 'include'`, clears state, redirects to `/login`
    - `devLogin()` calls `POST /auth/dev-login` with `credentials: 'include'`
    - Remove `getAccessToken()` and `refreshAccessToken()` methods
    - Remove `handleSSOCallback()` that reads tokens from URL params
    - Add `user` field to store populated from `/auth/me` response
    - _Requirements: 3.2, 3.6, 6.3, 6.4, 8.3, 10.1, 10.4_

  - [x] 9.2 Add session check on app mount
    - Call `checkSession()` in the app's root layout or auth provider on mount
    - While session check is in-flight, show loading state
    - If 401 returned: attempt silent refresh → if still 401, set `isAuthenticated: false`
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 9.3 Write unit tests for auth store in `apps/web/src/lib/__tests__/auth.store.spec.ts`
    - Test: `checkSession` sets `isAuthenticated: true` on 200
    - Test: `checkSession` attempts refresh on 401
    - Test: `login` sets authenticated on success
    - Test: `logout` clears state and redirects
    - Test: no localStorage usage anywhere in store
    - **Validates: Requirements 3.2, 3.6, 6.3, 6.5, 10.4**

- [x] 10. Frontend login page updates
  - [x] 10.1 Update login page to use new auth store methods
    - Remove any direct token handling from login page
    - Dev login button calls `devLogin()` which hits `/auth/dev-login` endpoint
    - On successful login, redirect to dashboard (cookie set automatically by backend)
    - Add Google OAuth button that navigates to `/auth/google/login` with `returnUrl`
    - _Requirements: 8.3, 5.3_

  - [ ]* 10.2 Write unit tests for login page
    - Test: dev login calls `/auth/dev-login` endpoint
    - Test: Google login navigates to correct URL
    - **Validates: Requirements 8.3**

- [ ] 11. Cross-origin CORS configuration verification
  - [x] 11.1 Update `apps/api/src/main.ts` CORS configuration
    - Add `X-CSRF-Token` to `allowedHeaders` list
    - Verify `credentials: true` is set
    - Verify `origin` reads from `CORS_ORIGIN` environment variable
    - _Requirements: 9.1, 9.4_

  - [x] 11.2 Add `.env.example` entries for new environment variables
    - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
    - Add `CORS_ORIGIN` documentation
    - _Requirements: 5.1, 9.4_

- [ ] 12. Register CsrfGuard globally
  - [x] 12.1 Register CsrfGuard as a global guard in the app module or main.ts
    - Apply after AuthGuard so cookie extraction has already occurred
    - Ensure ordering: AuthGuard → CsrfGuard
    - _Requirements: 4.2_

- [x] 13. Final checkpoint - Full integration verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Implementation order is critical: backend cookie infrastructure must exist before guards can use it, and guards must work before controller endpoints are updated
- The `dev-mock-token` bypass is removed in task 3.1 — dev login uses real cookies via task 5.5
- Frontend changes (tasks 8-10) depend on all backend endpoints being functional
