const MINIMUM_SECRET_LENGTH = 32;

export function getSessionKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}
