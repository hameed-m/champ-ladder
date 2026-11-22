export const ar = (n: number | string): string =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)] ?? d);

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const rnd = (a: number, b: number): number =>
  a + Math.floor(Math.random() * (b - a + 1));

export const pickOne = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!;

export const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
};

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const genCode = (): string => String(rnd(100000, 999999));

export const canNet = (): boolean => /^https?:/.test(location.protocol);

export const within = <T>(p: Promise<T>, ms: number): Promise<T | void> =>
  Promise.race([p, sleep(ms)]);
