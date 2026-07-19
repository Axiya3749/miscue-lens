// Word-level alignment between the original passage and the transcript,
// using the same edit-distance technique ASR tools use for word error rate.
// This is deterministic and needs no API call.

export type AlignOp = "match" | "substitution" | "omission" | "insertion";

export interface AlignedPair {
  op: AlignOp;
  target?: string; // word from the passage (absent for insertions)
  spoken?: string; // word from the transcript (absent for omissions)
}

export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

export function alignWords(
  targetWords: string[],
  spokenWords: string[]
): AlignedPair[] {
  const n = targetWords.length;
  const m = spokenWords.length;
  const normTarget = targetWords.map(normalizeWord);
  const normSpoken = spokenWords.map(normalizeWord);

  // dp[i][j] = min edits to turn target[0..i) into spoken[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = normTarget[i - 1] === normSpoken[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // omission: target word not spoken
        dp[i][j - 1] + 1, // insertion: extra spoken word
        dp[i - 1][j - 1] + cost // match or substitution
      );
    }
  }

  // Traceback to recover the actual alignment.
  const result: AlignedPair[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const cost =
      i > 0 && j > 0 && normTarget[i - 1] === normSpoken[j - 1] ? 0 : 1;
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + cost) {
      const isMatch = normTarget[i - 1] === normSpoken[j - 1];
      result.push({
        op: isMatch ? "match" : "substitution",
        target: targetWords[i - 1],
        spoken: spokenWords[j - 1]
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      result.push({ op: "omission", target: targetWords[i - 1] });
      i--;
    } else {
      result.push({ op: "insertion", spoken: spokenWords[j - 1] });
      j--;
    }
  }

  result.reverse();
  return result;
}
