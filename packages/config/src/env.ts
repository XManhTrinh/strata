/**
 * Get an environment variable value, returning a default if not set.
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

/**
 * Get a required environment variable. Throws if not set.
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get an environment variable as an integer, returning a default if not set or not a valid integer.
 */
export function getEnvInt(key: string, defaultValue?: number): number | undefined {
  const raw = process.env[key];
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Get an environment variable as a boolean, returning a default if not set.
 * Truthy values: "true", "1", "yes" (case-insensitive).
 * Falsy values: "false", "0", "no" (case-insensitive).
 */
export function getEnvBool(key: string, defaultValue?: boolean): boolean | undefined {
  const raw = process.env[key];
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  const lower = raw.toLowerCase();
  if (["true", "1", "yes"].includes(lower)) {
    return true;
  }
  if (["false", "0", "no"].includes(lower)) {
    return false;
  }
  return defaultValue;
}
