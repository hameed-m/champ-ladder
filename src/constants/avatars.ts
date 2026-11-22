export interface AvatarDef {
  id: string;
  label: string;
  kind: 'svg' | 'emoji';
  category: 'heroes' | 'animals' | 'fun';
  bg?: string;
  svgInner?: string;
}

export const SVG_AVATARS: ReadonlyArray<AvatarDef> = [
  {
    id: 'svg:knight',
    label: 'الفارس',
    kind: 'svg',
    category: 'heroes',
    bg: '#1d4ed8',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#1d4ed8"/>
      <path d="M24 10 C32 4 40 8 42 16 L24 16 Z" fill="#facc15"/>
      <path d="M16 30 C16 17 23 13 32 13 C41 13 48 17 48 30 L46 47 C46 51 40 54 32 54 C24 54 18 51 18 47 Z" fill="#cbd5e1" stroke="#334155" stroke-width="2.5"/>
      <rect x="20" y="28" width="24" height="10" rx="5" fill="#0f172a"/>
      <circle cx="27" cy="33" r="2.6" fill="#38bdf8"/>
      <circle cx="37" cy="33" r="2.6" fill="#38bdf8"/>
      <path d="M26 44 H38" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M32 13 V27" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
    `,
  },
  {
    id: 'svg:astronaut',
    label: 'رائد الفضاء',
    kind: 'svg',
    category: 'heroes',
    bg: '#0f172a',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#0f172a"/>
      <circle cx="13" cy="15" r="1.8" fill="#fef08a"/>
      <circle cx="51" cy="18" r="1.5" fill="#7dd3fc"/>
      <circle cx="32" cy="35" r="21" fill="#f8fafc" stroke="#94a3b8" stroke-width="2.5"/>
      <rect x="17" y="23" width="30" height="21" rx="10" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
      <path d="M22 28 Q26 25 31 27" stroke="#bae6fd" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="34" r="2.3" fill="#ffffff"/>
      <circle cx="38" cy="34" r="2.3" fill="#ffffff"/>
      <path d="M28 39 Q32 42 36 39" stroke="#7dd3fc" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="9" y="30" width="4" height="10" rx="2" fill="#f97316"/>
      <rect x="51" y="30" width="4" height="10" rx="2" fill="#f97316"/>
    `,
  },
  {
    id: 'svg:wizard',
    label: 'الساحر',
    kind: 'svg',
    category: 'heroes',
    bg: '#4c1d95',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#4c1d95"/>
      <circle cx="32" cy="40" r="15" fill="#fde68a"/>
      <path d="M10 31 Q32 24 54 31 Q32 37 10 31 Z" fill="#7c3aed" stroke="#facc15" stroke-width="2"/>
      <path d="M18 30 L32 6 L46 30 Z" fill="#6d28d9" stroke="#facc15" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="32" cy="18" r="2.8" fill="#fde047"/>
      <circle cx="26" cy="40" r="2.6" fill="#1e1b4b"/>
      <circle cx="38" cy="40" r="2.6" fill="#1e1b4b"/>
      <path d="M21 47 Q32 58 43 47 Q32 51 21 47 Z" fill="#f8fafc"/>
      <path d="M28 45 Q32 48 36 45" stroke="#92400e" stroke-width="2" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    id: 'svg:ninja',
    label: 'النينجا',
    kind: 'svg',
    category: 'heroes',
    bg: '#18181b',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#18181b"/>
      <circle cx="32" cy="34" r="20" fill="#27272a" stroke="#52525b" stroke-width="2"/>
      <rect x="13" y="21" width="38" height="7" rx="3" fill="#ef4444"/>
      <path d="M49 24 L58 19 L55 27 Z" fill="#dc2626"/>
      <rect x="17" y="28" width="30" height="12" rx="6" fill="#fed7aa"/>
      <path d="M22 32 L29 34" stroke="#18181b" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M42 32 L35 34" stroke="#18181b" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="25.5" cy="35.5" r="2.3" fill="#18181b"/>
      <circle cx="38.5" cy="35.5" r="2.3" fill="#18181b"/>
      <circle cx="32" cy="24.5" r="2.5" fill="#e4e4e7"/>
    `,
  },
  {
    id: 'svg:robot',
    label: 'الروبوت',
    kind: 'svg',
    category: 'heroes',
    bg: '#0f766e',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#0f766e"/>
      <line x1="32" y1="9" x2="32" y2="18" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="8" r="4" fill="#fbbf24"/>
      <rect x="14" y="18" width="36" height="32" rx="9" fill="#e2e8f0" stroke="#334155" stroke-width="2.5"/>
      <rect x="19" y="24" width="26" height="13" rx="5" fill="#0f172a"/>
      <circle cx="26" cy="30.5" r="3.5" fill="#2dd4bf"/>
      <circle cx="38" cy="30.5" r="3.5" fill="#2dd4bf"/>
      <rect x="23" y="41" width="18" height="5" rx="2.5" fill="#0d9488"/>
      <line x1="28" y1="41" x2="28" y2="46" stroke="#e2e8f0" stroke-width="1.8"/>
      <line x1="36" y1="41" x2="36" y2="46" stroke="#e2e8f0" stroke-width="1.8"/>
    `,
  },
  {
    id: 'svg:king-lion',
    label: 'الأسد الملك',
    kind: 'svg',
    category: 'animals',
    bg: '#b45309',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#b45309"/>
      <circle cx="32" cy="36" r="20" fill="#92400e"/>
      <circle cx="19" cy="24" r="6" fill="#f59e0b"/>
      <circle cx="45" cy="24" r="6" fill="#f59e0b"/>
      <circle cx="32" cy="36" r="15" fill="#fbbf24"/>
      <path d="M22 19 L25 10 L32 15 L39 10 L42 19 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="26" cy="34" r="2.5" fill="#451a03"/>
      <circle cx="38" cy="34" r="2.5" fill="#451a03"/>
      <polygon points="32,38 28.5,42 35.5,42" fill="#78350f"/>
      <path d="M27 45 Q32 49 37 45" stroke="#78350f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    id: 'svg:falcon',
    label: 'الصقر',
    kind: 'svg',
    category: 'animals',
    bg: '#7c2d12',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#7c2d12"/>
      <path d="M13 38 C13 20 22 13 32 13 C42 13 51 20 51 38 L46 52 H18 Z" fill="#9a3412"/>
      <path d="M19 36 C19 23 25 18 32 18 C39 18 45 23 45 36 L42 49 H22 Z" fill="#fef3c7"/>
      <path d="M20 28 L30 32" stroke="#431407" stroke-width="3" stroke-linecap="round"/>
      <path d="M44 28 L34 32" stroke="#431407" stroke-width="3" stroke-linecap="round"/>
      <circle cx="25" cy="33" r="2.5" fill="#1c1917"/>
      <circle cx="39" cy="33" r="2.5" fill="#1c1917"/>
      <path d="M27 38 L32 48 L37 38 Q32 35 27 38 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
    `,
  },
  {
    id: 'svg:soccer',
    label: 'نجم الملعب',
    kind: 'svg',
    category: 'heroes',
    bg: '#15803d',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#15803d"/>
      <path d="M16 54 C18 44 24 41 32 41 C40 41 46 44 48 54 Z" fill="#facc15"/>
      <circle cx="32" cy="29" r="15" fill="#fed7aa"/>
      <path d="M17 25 C18 14 25 11 32 11 C39 11 46 14 47 25 Q32 19 17 25 Z" fill="#1c1917"/>
      <rect x="17" y="21" width="30" height="5" rx="2.5" fill="#ef4444"/>
      <circle cx="26.5" cy="30" r="2.4" fill="#1c1917"/>
      <circle cx="37.5" cy="30" r="2.4" fill="#1c1917"/>
      <path d="M27 36 Q32 41 37 36" stroke="#9a3412" stroke-width="2.3" fill="none" stroke-linecap="round"/>
      <polygon points="32,44 33.8,48 38,48.3 34.7,50.8 35.8,54.8 32,52.5 28.2,54.8 29.3,50.8 26,48.3 30.2,48" fill="#15803d"/>
    `,
  },
  {
    id: 'svg:scientist',
    label: 'العالم العبقري',
    kind: 'svg',
    category: 'heroes',
    bg: '#0369a1',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#0369a1"/>
      <path d="M15 28 C12 16 20 10 27 14 C31 8 39 9 41 15 C48 13 52 20 49 28 Z" fill="#e2e8f0"/>
      <circle cx="32" cy="35" r="15" fill="#fde68a"/>
      <circle cx="25" cy="34" r="6.5" fill="#e0f2fe" stroke="#1e293b" stroke-width="2.5"/>
      <circle cx="39" cy="34" r="6.5" fill="#e0f2fe" stroke="#1e293b" stroke-width="2.5"/>
      <line x1="31.5" y1="34" x2="32.5" y2="34" stroke="#1e293b" stroke-width="2.5"/>
      <circle cx="25" cy="34" r="2.2" fill="#0f172a"/>
      <circle cx="39" cy="34" r="2.2" fill="#0f172a"/>
      <path d="M27 44 Q32 48 37 44" stroke="#92400e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    id: 'svg:pirate',
    label: 'القبطان',
    kind: 'svg',
    category: 'heroes',
    bg: '#991b1b',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#991b1b"/>
      <circle cx="32" cy="37" r="15" fill="#fed7aa"/>
      <path d="M12 26 C18 11 46 11 52 26 Z" fill="#18181b" stroke="#facc15" stroke-width="2"/>
      <circle cx="32" cy="19" r="3.5" fill="#facc15"/>
      <line x1="18" y1="31" x2="46" y2="36" stroke="#18181b" stroke-width="2.5"/>
      <circle cx="26" cy="34" r="4.5" fill="#18181b"/>
      <circle cx="38" cy="35" r="2.5" fill="#18181b"/>
      <path d="M26 44 Q32 49 38 43" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    id: 'svg:cat-hero',
    label: 'القط البطل',
    kind: 'svg',
    category: 'animals',
    bg: '#be185d',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#be185d"/>
      <polygon points="16,28 19,12 30,21" fill="#fb923c"/>
      <polygon points="48,28 45,12 34,21" fill="#fb923c"/>
      <circle cx="32" cy="36" r="17" fill="#fdba74"/>
      <path d="M16 32 Q24 27 32 32 Q40 27 48 32 Q44 40 32 37 Q20 40 16 32 Z" fill="#1e1b4b"/>
      <circle cx="25" cy="34" r="2.8" fill="#ffffff"/>
      <circle cx="39" cy="34" r="2.8" fill="#ffffff"/>
      <polygon points="32,39 29.5,42 34.5,42" fill="#f43f5e"/>
      <path d="M27 45 Q32 48 37 45" stroke="#7c2d12" stroke-width="2" fill="none" stroke-linecap="round"/>
    `,
  },
  {
    id: 'svg:dragon',
    label: 'التنين',
    kind: 'svg',
    category: 'animals',
    bg: '#065f46',
    svgInner: `
      <circle cx="32" cy="32" r="30" fill="#065f46"/>
      <path d="M20 22 L15 10 L26 17 Z" fill="#fbbf24"/>
      <path d="M44 22 L49 10 L38 17 Z" fill="#fbbf24"/>
      <circle cx="32" cy="36" r="17" fill="#10b981" stroke="#047857" stroke-width="2"/>
      <ellipse cx="32" cy="43" rx="11" ry="7" fill="#6ee7b7"/>
      <circle cx="25" cy="31" r="3.2" fill="#fef08a"/>
      <circle cx="39" cy="31" r="3.2" fill="#fef08a"/>
      <circle cx="25" cy="31" r="1.6" fill="#064e3b"/>
      <circle cx="39" cy="31" r="1.6" fill="#064e3b"/>
      <circle cx="28" cy="42" r="1.5" fill="#065f46"/>
      <circle cx="36" cy="42" r="1.5" fill="#065f46"/>
    `,
  },
];

export const EMOJI_AVATARS: ReadonlyArray<AvatarDef> = [
  { id: '🦁', label: 'أسد', kind: 'emoji', category: 'animals' },
  { id: '🐯', label: 'نمر', kind: 'emoji', category: 'animals' },
  { id: '🦅', label: 'نسر', kind: 'emoji', category: 'animals' },
  { id: '🐬', label: 'دلفين', kind: 'emoji', category: 'animals' },
  { id: '🦊', label: 'ثعلب', kind: 'emoji', category: 'animals' },
  { id: '🐼', label: 'باندا', kind: 'emoji', category: 'animals' },
  { id: '🦉', label: 'بومة', kind: 'emoji', category: 'animals' },
  { id: '🐢', label: 'سلحفاة', kind: 'emoji', category: 'animals' },
  { id: '🐎', label: 'حصان', kind: 'emoji', category: 'animals' },
  { id: '🦄', label: 'يونيكورن', kind: 'emoji', category: 'animals' },
  { id: '🦈', label: 'قرش', kind: 'emoji', category: 'animals' },
  { id: '🐝', label: 'نحلة', kind: 'emoji', category: 'animals' },
  { id: '🚀', label: 'صاروخ', kind: 'emoji', category: 'fun' },
  { id: '⚽', label: 'كرة قدم', kind: 'emoji', category: 'fun' },
  { id: '🌟', label: 'نجمة', kind: 'emoji', category: 'fun' },
  { id: '🏆', label: 'كأس', kind: 'emoji', category: 'fun' },
  { id: '🔥', label: 'نار', kind: 'emoji', category: 'fun' },
  { id: '⚡', label: 'برق', kind: 'emoji', category: 'fun' },
  { id: '👑', label: 'تاج', kind: 'emoji', category: 'fun' },
  { id: '🎯', label: 'هدف', kind: 'emoji', category: 'fun' },
  { id: '🎮', label: 'تحكم', kind: 'emoji', category: 'fun' },
  { id: '💎', label: 'ماسة', kind: 'emoji', category: 'fun' },
  { id: '🤖', label: 'آلي', kind: 'emoji', category: 'fun' },
  { id: '👾', label: 'فضائي', kind: 'emoji', category: 'fun' },
];

export const ALL_AVATARS: ReadonlyArray<AvatarDef> = [...SVG_AVATARS, ...EMOJI_AVATARS];

const AVATAR_MAP = new Map<string, AvatarDef>(ALL_AVATARS.map((a) => [a.id, a]));

export function getAvatarDef(id?: string | null): AvatarDef | undefined {
  if (!id) return undefined;
  return AVATAR_MAP.get(id);
}

export function isSvgAvatar(id?: string | null): boolean {
  return !!id && id.startsWith('svg:') && AVATAR_MAP.has(id);
}

export function avatarDisplayText(id?: string | null): string {
  if (!id) return '🦁';
  const def = AVATAR_MAP.get(id);
  if (def && def.kind === 'svg') return '⭐';
  return id;
}

export function sanitizeAvatarId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, 32);
  if (!trimmed) return null;
  if (AVATAR_MAP.has(trimmed)) return trimmed;
  // Allow standard emojis even if not in default list
  if (!trimmed.startsWith('svg:') && trimmed.length <= 8) return trimmed;
  return null;
}
