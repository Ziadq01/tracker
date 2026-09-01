/**
 * Single-password gate. There are no accounts, so a "session" is just proof
 * that the visitor knew ADMIN_PASSWORD at some point.
 *
 * The cookie holds a digest derived from the password rather than a literal
 * flag: a value like "true" is something any visitor can type into devtools,
 * which would leave the gate decorative. The digest cannot be produced without
 * the password, which never leaves the server.
 *
 * Web Crypto is used so this runs unchanged in both the Edge middleware and a
 * regular route handler.
 */

export const AUTH_COOKIE = "auth";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:scaler-session-v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent compare, so timing does not leak how much matched. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
