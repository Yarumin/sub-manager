function constantTimeEqual(a, b) {
  const bytesA = new Uint8Array(a);
  const bytesB = new Uint8Array(b);
  if (bytesA.length !== bytesB.length) return false;
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}

export async function verifyAdminPassword(provided, expected) {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided || "")),
    crypto.subtle.digest("SHA-256", encoder.encode(expected || ""))
  ]);
  return constantTimeEqual(providedHash, expectedHash);
}
