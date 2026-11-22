import { ROOT_ADMIN } from '@/constants/game';

export function normalizeAdminEmail(email: string | undefined | null): string {
  const em = String(email || '').trim().toLowerCase();
  if (ROOT_ADMIN.aliases.includes(em)) return ROOT_ADMIN.email;
  return em;
}

function sha256Fallback(ascii: string): string {
  const rightRotate = (v: number, a: number) => (v >>> a) | (v << (32 - a));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << (((3 - i) % 4) * 8));
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0;
      const w2 = w[i - 2] || 0;
      const a = hash[0] || 0;
      const e = hash[4] || 0;
      const wi =
        i < 16
          ? w[i] || 0
          : ((w[i - 16] || 0) +
              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
              (w[i - 7] || 0) +
              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
            0;
      w[i] = wi;
      const t1 =
        (hash[7] || 0) +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & (hash[5] || 0)) ^ (~e & (hash[6] || 0))) +
        (k[i] || 0) +
        wi;
      const t2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & (hash[1] || 0)) ^ (a & (hash[2] || 0)) ^ ((hash[1] || 0) & (hash[2] || 0)));
      hash.unshift((t1 + t2) | 0);
      hash[4] = ((hash[4] || 0) + t1) | 0;
      hash.pop();
    }
    for (let i = 0; i < 8; i++) hash[i] = ((hash[i] || 0) + (oldHash[i] || 0)) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = ((hash[i] || 0) >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function hashCreds(email: string, password: string): Promise<string> {
  const raw = `${normalizeAdminEmail(email)}:${String(password || '')}`;
  try {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below
  }
  const utf8 = unescape(encodeURIComponent(raw));
  return sha256Fallback(utf8);
}
