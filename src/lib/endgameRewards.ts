/**
 * Points for completing an endgame drill for the first time, by difficulty.
 * Shared by the practice page (to show the reward) and the /api/endgames/complete
 * endpoint (which awards it), so the two can never disagree.
 */
export const ENDGAME_POINTS: Record<string, number> = {
    'Piece of Cake': 10,
    'Hard Tart': 20,
    'Cherry Bomb': 30
};

export function pointsForDifficulty(difficulty: string): number {
    return ENDGAME_POINTS[difficulty] ?? ENDGAME_POINTS['Piece of Cake'];
}
