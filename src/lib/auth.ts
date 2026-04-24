/** Backend authentication – server-only (imported by middleware + API route). */

const USERS: Record<string, string> = {
  william: "namou.ae1",
  jad: "namou.ae1",
};

const DISPLAY_NAMES: Record<string, string> = {
  william: "William",
  jad: "Jad",
};

const SECRET = "namou-bk-s3ss10n-k3y-x9k2m7p4";

export const COOKIE_NAME = "backend_session";
export const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

/** Returns display name on success, null on failure. Case-insensitive username. */
export function validateCredentials(
  username: string,
  password: string,
): string | null {
  const key = username.toLowerCase();
  if (USERS[key] && USERS[key] === password) {
    return DISPLAY_NAMES[key] || username;
  }
  return null;
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(username: string): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = btoa(JSON.stringify({ user: username, exp }));
  const sig = await sha256Hex(payload + SECRET);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const dot = token.indexOf(".");
    if (dot < 0) return false;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expectedSig = await sha256Hex(payload + SECRET);
    if (sig !== expectedSig) return false;
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}
