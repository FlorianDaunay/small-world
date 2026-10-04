/**
 * Hashes a room password so it never travels in clear text. SHA-256 when the browser allows it
 * (secure contexts: https and localhost), a simple FNV-1a fallback otherwise (e.g. LAN testing).
 */
export async function hashPassword(password: string): Promise<string> {
  const input = `smallworld:${password}`;
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv-${(hash >>> 0).toString(16)}`;
}
