/** Staircase 2-up / 1-down — difficulté 1–10, indépendante par sous-point. */

export const DIFF_MIN = 1;
export const DIFF_MAX = 10;
export const STAIRCASE_UP = 2;

export function clampDifficulty(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 3;
  return Math.max(DIFF_MIN, Math.min(DIFF_MAX, Math.round(v)));
}

/**
 * @param {{ difficulty?: number, streakUp?: number }} state
 * @param {boolean} success
 */
export function applyStaircase(state, success) {
  const difficulty = clampDifficulty(state?.difficulty ?? 3);
  let streakUp = Math.max(0, Number(state?.streakUp) || 0);
  if (success) {
    streakUp += 1;
    if (streakUp >= STAIRCASE_UP) {
      return { difficulty: clampDifficulty(difficulty + 1), streakUp: 0 };
    }
    return { difficulty, streakUp };
  }
  return { difficulty: clampDifficulty(difficulty - 1), streakUp: 0 };
}

/** XP liée à la performance mesurée — jamais de loot aléatoire. */
export function xpForTrial(success, difficulty) {
  if (!success) return 0;
  return 8 + clampDifficulty(difficulty) * 2;
}

export function trialSuccessFromAccuracy(accuracy, threshold = 0.7) {
  return Number(accuracy) >= threshold;
}
