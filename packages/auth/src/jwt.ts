import jwt, { type SignOptions } from "jsonwebtoken";

export interface TokenPayload {
  sub: string;
  [key: string]: unknown;
}

/**
 * Sign an access token with the given payload and secret.
 * Default expiration: 15 minutes.
 */
export function signAccessToken(
  payload: TokenPayload,
  secret: string,
  expiresIn: SignOptions["expiresIn"] = "15m"
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Sign a refresh token with the given payload and secret.
 * Default expiration: 7 days.
 */
export function signRefreshToken(
  payload: TokenPayload,
  secret: string,
  expiresIn: SignOptions["expiresIn"] = "7d"
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify and decode a JWT token.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}
