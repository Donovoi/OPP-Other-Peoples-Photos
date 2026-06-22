import { getRecord, putRecord, STORES } from './db.js';

const KEY_ID = 'local-vault-key';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function getOrCreateVaultKey() {
  const existing = await getRecord(STORES.settings, KEY_ID);
  if (existing?.key) return existing.key;
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  await putRecord(STORES.settings, { id: KEY_ID, key, createdAt: new Date().toISOString() });
  return key;
}

export async function encryptJson(value, key) {
  const cryptoKey = key || await getOrCreateVaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext);
  return {
    alg: 'AES-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptJson(payload, key) {
  const cryptoKey = key || await getOrCreateVaultKey();
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return JSON.parse(decoder.decode(plaintext));
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
