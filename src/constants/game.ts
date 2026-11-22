import type { ArenaId, CardType, DecisionTimeSec, FairMode, MoveMode, RoomSettings, RuleKey, ThemeColorId, ThemeConfig, TopicId } from '@/types/game';

export const APP_TITLE_AR = 'تحدي الأبطال';
export const APP_TITLE_EN = 'Champions Challenge';

export const COLORS = ['#e0533d', '#2f7fd6', '#d99a00', '#8a4fd1', '#17a589', '#d6336c'] as const;

export const OFF: ReadonlyArray<[number, number]> = [
  [-18, -13],
  [0, -13],
  [18, -13],
  [-18, 14],
  [0, 14],
  [18, 14],
];

export const SIZES = [6, 7, 8, 9, 10] as const;

export const LEVELS: ReadonlyArray<[string, number]> = [
  ['سهل', 12],
  ['متوسط', 18],
  ['صعب', 25],
];

export const MOVE_MODES: ReadonlyArray<[MoveMode, string, string]> = [
  ['dice', '🎲 النرد (كلاسيكي)', 'ارمِ النرد بعد الإجابة الصحيحة لتحديد عدد الخطوات (١–٦)'],
  ['speed', '⚡ سرعة الإجابة', 'كلما أجبت أسرع حصلت على خطوات أكثر (١–٦ خطوات مباشرة)'],
];

export const DECISION_TIMES: ReadonlyArray<[DecisionTimeSec, string]> = [
  [5, '٥ ثوانٍ'],
  [10, '١٠ ثوانٍ'],
  [15, '١٥ ثانية'],
  [0, 'بدون مؤقت'],
];

export const TOPICS: ReadonlyArray<[TopicId, string]> = [
  ['mul', 'الضرب'],
  ['div', 'القسمة'],
  ['add', 'الجمع'],
  ['sub', 'الطرح'],
  ['sqrt', 'الجذور التربيعية'],
  ['geo', 'الأشكال الهندسية'],
];

export const FAIR: ReadonlyArray<[FairMode, string]> = [
  ['each', 'مستوى لكل لاعب'],
  ['adaptive', 'صعوبة متكيفة'],
  ['both', 'الاثنان معًا'],
  ['one', 'مستوى واحد للجميع'],
];

export const RULES: ReadonlyArray<[RuleKey, string]> = [
  ['ladders', '🪜 السلالم'],
  ['snakes', '🐍 الحيات'],
  ['pushback', '↩️ إرجاع خصم'],
  ['allq', '⭐ سؤال الجميع'],
  ['cards', '🃏 بطاقات القدرات'],
  ['steal', '⚡ سرقة الإجابة'],
  ['penalty', '⚽ ضربة جزاء'],
];

export interface ThemePreset {
  id: string;
  label: string;
  hue: number;
  vivid: number;
  mono?: boolean;
}

export const THEME_PRESETS: ReadonlyArray<ThemePreset> = [
  { id: 'green', label: 'الأخضر الزمردي', hue: 162, vivid: 75 },
  { id: 'teal', label: 'التركواز البحري', hue: 195, vivid: 80 },
  { id: 'blue', label: 'الأزرق المحيطي', hue: 245, vivid: 85 },
  { id: 'indigo', label: 'النيلي العميق', hue: 270, vivid: 82 },
  { id: 'purple', label: 'البنفسجي الملكي', hue: 295, vivid: 85 },
  { id: 'pink', label: 'الوردي المشرق', hue: 342, vivid: 88 },
  { id: 'crimson', label: 'الأحمر الياقوتي', hue: 16, vivid: 92 },
  { id: 'orange', label: 'البرتقالي الناري', hue: 46, vivid: 92 },
  { id: 'gold', label: 'الذهبي الفاخر', hue: 82, vivid: 85 },
  { id: 'lime', label: 'الليموني الحيوي', hue: 128, vivid: 82 },
  { id: 'slate', label: 'الرمادي الأنيق', hue: 235, vivid: 14 },
  { id: 'black', label: 'الأسود الفاخر', hue: 0, vivid: 0, mono: true },
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = { hue: 162, vivid: 75, mono: false };

export function normalizeThemeConfig(cfg?: Partial<ThemeConfig> | null, legacyId?: string): ThemeConfig {
  if (cfg && typeof cfg.hue === 'number' && !Number.isNaN(cfg.hue)) {
    return {
      hue: ((Math.round(cfg.hue) % 360) + 360) % 360,
      vivid: Math.max(0, Math.min(100, Math.round(typeof cfg.vivid === 'number' ? cfg.vivid : 75))),
      mono: !!cfg.mono,
    };
  }
  if (legacyId) {
    const preset = THEME_PRESETS.find((p) => p.id === legacyId);
    if (preset) return { hue: preset.hue, vivid: preset.vivid, mono: !!preset.mono };
  }
  return { ...DEFAULT_THEME_CONFIG };
}

export const THEMES: ReadonlyArray<[ThemeColorId, string, string]> = [
  ['green', 'الأخضر الزمردي', '#1f6b52'],
  ['orange', 'البرتقالي الناري', '#d95d1e'],
  ['purple', 'البنفسجي الملكي', '#6f3cc3'],
  ['blue', 'الأزرق المحيطي', '#1d68b8'],
  ['crimson', 'الأحمر الياقوتي', '#b82841'],
  ['gold', 'الذهبي الفاخر', '#b07d12'],
];

export const ARENAS: ReadonlyArray<[ArenaId, string, string, string[]]> = [
  ['classic', '🏟️ ملعب الأبطال', 'كلاسيكي بألوان حيوية وسلالم وحيات', ['#e4572e', '#f0a202', '#2e86de', '#3fae5a']],
  ['horror', '👻 القلعة المسكونة', 'أجواء رعب وأشباح وخفافيش وسلالم متوهجة', ['#1e1333', '#4c1d95', '#991b1b', '#c084fc']],
  ['funny', '🤡 كرتوني مرح', 'ألوان حلوى ووحوش مضحكة وقشور موز', ['#ff595e', '#ffca3a', '#8ac926', '#1982c4']],
  ['space', '🚀 الفضاء والمجرات', 'نيون مجري وصواريخ وثقوب سوداء', ['#0f172a', '#1e1b4b', '#00f5d4', '#a855f7']],
  ['jungle', '🌴 غابة المغامرات', 'أخشاب وسلالم حبال وأفاعي الأدغال', ['#2d6a4f', '#b5835a', '#52b788', '#d4a373']],
];

export const CARD: Record<CardType, [string, string]> = {
  shield: ['🛡️', 'درع'],
  double: ['🎲', 'نرد مضاعف'],
  freeze: ['❄️', 'تجميد'],
  swap: ['🔄', 'تبديل السؤال'],
};

export const REACT = ['👏', '🔥', '😂', '😱', '⚽'] as const;

export const EMO = ['🦁', '🐯', '🦅', '🐬', '🦊', '🐼', '🚀', '⚽', '🌟', '🐎', '🦉', '🐢'] as const;

export const ALLT = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const MAXP = 6;

export const DEF_SETTINGS: RoomSettings = {
  size: 6,
  level: 1,
  topics: ['mul'],
  tables: [...ALLT],
  fair: 'each',
  ladders: true,
  snakes: true,
  pushback: true,
  allq: true,
  cards: true,
  steal: true,
  penalty: true,
  mode: 'multi',
  moveMode: 'dice',
  decisionTime: 10,
  clientAudio: true,
  theme: 'green',
  themeConfig: { ...DEFAULT_THEME_CONFIG },
  arena: 'classic',
};

export const ROOT_ADMIN = {
  email: 'a.alhofufy@gmail.com',
  aliases: ['alhofufy.a@gmail.com'] as string[],
  hash: '57972265854348ce50452cb2560b61c1b802cc116b8f1c0bbb8ba5a860570bcf',
  root: true,
};

export const AUDIO_SLOTS: ReadonlyArray<[string, string, string]> = [
  ['win', 'الفوز', 'بدل عبارة «هدف»'],
  ['correct', 'إجابة صحيحة', ''],
  ['wrong', 'إجابة خاطئة', ''],
  ['ladder', 'السلّم', ''],
  ['snake', 'الحية', ''],
  ['cheer', 'هتاف الجمهور', 'عند الصواب والفوز'],
  ['amb', 'أجواء الملعب', 'يتكرر طوال اللعب'],
];
