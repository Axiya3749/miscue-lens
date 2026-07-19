// Phonetic similarity signal used to ground the GPT-5.6 classification call.
// We convert both words to Metaphone codes (an approximate "how it sounds"
// spelling) and measure edit-distance similarity between the codes.
// High similarity despite a wrong word can be useful context when
// judging whether the substitution reflects a language-transfer pattern.
// Low similarity can be useful context when deciding that a mismatch
// needs a closer teacher look instead.

import natural from "natural";

const metaphone = new natural.Metaphone();

function levenshtein(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[n][m];
}

// Returns a score from 0 (nothing alike) to 1 (identical sound).
export function phoneticSimilarity(wordA: string, wordB: string): number {
  const codeA = metaphone.process(wordA);
  const codeB = metaphone.process(wordB);
  if (!codeA && !codeB) return 1;
  const maxLen = Math.max(codeA.length, codeB.length, 1);
  const distance = levenshtein(codeA, codeB);
  return 1 - distance / maxLen;
}
