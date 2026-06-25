export const PASSWORD_HASH = "f707fdda7c874ff49ebfb2c88a2860c5ff4ce3d94a21efb76566ad0f92c9ad57";

export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
