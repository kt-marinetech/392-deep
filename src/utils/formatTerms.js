const TERM_REGEX =
  /(Definition of Ready|Definition of Done|release\/год\.месяц|release\/\*|bugfix\/\{ключ\}|bugfix\/\*|feature\/\{ключ\}|feature\/\*|\bRoadmap\b|\bDoR\b|\bDoD\b|\bDone\b|\bdemo\b|\bdev\b|\bmain\b)/g;

export function tokenizeTerms(text) {
  if (!text) return [];
  const parts = String(text).split(TERM_REGEX);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      TERM_REGEX.lastIndex = 0;
      const isTerm = TERM_REGEX.test(part);
      TERM_REGEX.lastIndex = 0;
      return { text: part, isTerm };
    });
}
